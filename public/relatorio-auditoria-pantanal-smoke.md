# Relatório de Auditoria: Painel Administrativo e Arquitetura de Segurança
**Projeto:** Pantanal Smoke  
**Data da Auditoria:** 16 de Outubro de 2026  
**Status do Ambiente:** Auditoria de leitura e diagnóstico técnico estrito.  
*(Nenhuma senha ou token confidencial foi exposto neste relatório)*

---

## Sumário Executivo

Esta auditoria técnica analisou a implementação do Painel Administrativo (`/admin`), o fluxo de autenticação, o armazenamento de dados, as políticas de segurança (RLS - Row Level Security) do Supabase, a persistência de configurações e as rotinas de recuperação e contingência da loja virtual **Pantanal Smoke**.

---

## 1. Login Administrativo

### 1.1. Fluxo de Autenticação Atual
* **Arquivo inspecionado:** `src/routes/admin.tsx` (linhas 58 a 148)
* Na rota `/admin`, caso o navegador não possua um registro de sessão ativo, é exibida a tela de login exclusiva da loja.
* A submissão aciona a função `loginAdmin(emailInput, passwordInput)` no arquivo `src/lib/store-settings.ts` (linhas 220 a 245).
* Se os valores digitados conferem com a constante local, uma chave de sessão é gravada no `localStorage` do navegador sob o nome `pantanal_admin_auth_session`.

### 1.2. Credenciais no Código-Fonte
* **Diagnóstico:** As credenciais administrativas foram gravadas diretamente no arquivo `src/lib/store-settings.ts` (linhas 198 a 203) na constante `ADMIN_CONFIG`.
* **Vulnerabilidade:** Por se tratar de uma aplicação Single Page Application (SPA) construída com Vite, todo o código da pasta `src/` é empacotado em arquivos JavaScript estáticos enviados ao navegador do visitante. Qualquer usuário com conhecimentos básicos em ferramentas de desenvolvedor (F12) pode ler essas credenciais no código empacotado.

### 1.3. Local de Validação
* A autenticação ocorre **exclusivamente no navegador (client-side)**. Não há envio para o endpoint oficial de autenticação (`supabase.auth.signInWithPassword`), nem validação por função RPC segura com hash criptográfico no PostgreSQL.

### 1.4. Risco de Falsificação de Sessão (Bypass)
* **Gravidade: Crítica.** Qualquer visitante pode abrir o console do navegador e registrar a chave `pantanal_admin_auth_session` no `localStorage`, desbloqueando visualmente o painel administrativo sem digitar nenhuma credencial.

---

## 2. Recuperação de Senha por E-mail

### 2.1. Funcionalidade "Esqueci minha senha"
* **Diagnóstico:** Não existe atualmente na tela de login administrativo (`/admin`).
* O fluxo de clientes (`/auth`) implementa envio de Magic Link via OTP (`supabase.auth.signInWithOtp`), mas não fluxo de redefinição de senha com senha cadastrada.

### 2.2. Integração com Provedor de E-mail
* O administrador não consegue recuperar a senha pelo e-mail neste momento, pois o sistema de login não está acoplado ao `auth.users` do Supabase.

### 2.3. Pendências para Implementação Futura:
1. Conectar a tela de login a `supabase.auth.signInWithPassword()`.
2. Adicionar o botão "Esqueci minha senha" chamando `supabase.auth.resetPasswordForEmail()`.
3. Configurar um provedor de envio SMTP próprio (ex: Resend, SendGrid ou Amazon SES) no painel do Supabase, pois o disparador nativo gratuito do Supabase é limitado a 3–4 e-mails por hora.
4. Cadastrar a URL de redirecionamento oficial nas configurações de autenticação do Supabase.

---

## 3. Cadastro e Gerenciamento de Administradores

### 3.1. Atribuição de Papéis no Banco de Dados
* **Arquivo inspecionado:** `drizzle/migrations/0000_pantanal_smoke_schema.sql` (linhas 5 a 43)
* A arquitetura do banco possui a estrutura necessária:
  * Tipo enumerado: `public.app_role` (`admin`, `moderator`, `user`).
  * Tabela de papéis: `public.user_roles (user_id, role)`.
  * Função de validação: `public.has_role(_user_id, 'admin')`.
* Atualmente, **não há interface gráfica** para conceder acesso admin a outro usuário. O procedimento é manual via SQL no Supabase:
  ```sql
  insert into public.user_roles (user_id, role) values ('<UUID_DO_USUARIO>', 'admin');
  ```

### 3.2. Separação de Acessos
* No banco de dados, clientes e administradores são separados pelo mecanismo de Row Level Security.
* No frontend, a separação depende de o login administrativo migrar para o Supabase Auth.

---

## 4. Segurança e Permissões (RLS e Servidor)

### 4.1. Análise das Políticas RLS (Row Level Security)
* **Arquivos inspecionados:** `drizzle/migrations/0000_pantanal_smoke_schema.sql` e `0003_store_settings_and_admin.sql`

| Tabela | Leitura (SELECT) | Escrita / Atualização |
| :--- | :--- | :--- |
| **`products`** | Pública para ativos; Admin para todos | Restrita a `has_role(auth.uid(), 'admin')` |
| **`orders`** | Próprio cliente ou Admin | Atualização restrita a Admin |
| **`cashback_entries`** | Próprio cliente ou Admin | Apenas via funções seguras do banco (service_role) |
| **`store_settings`** | Pública para leitura | Restrita a `has_role(auth.uid(), 'admin')` |

### 4.2. Incompatibilidade Atual (Client-side Auth vs RLS)
* Como o login atual em `/admin` não cria uma sessão no Supabase, as chamadas de alteração de produtos e pedidos enviadas ao banco chegam com `auth.uid() = null`.
* O banco de dados rejeita essas operações via RLS.
* As configurações da loja e banners funcionam porque gravam de imediato no `localStorage` do navegador com sincronização reativa, operando como cache local.

### 4.3. Chaves de API
* A chave exposta no frontend (`VITE_SUPABASE_PUBLISHABLE_KEY`) é pública por definição na arquitetura Supabase e não representa falha.
* A chave com permissões totais (`SUPABASE_SERVICE_ROLE_KEY`) está isolada no servidor em `src/integrations/supabase/client.server.ts` e protegida.

---

## 5. Recuperação, Backups e Controle do Site

### 5.1. Formas de Recuperar Acesso
* **Pelo Código (GitHub):** Caso perca a senha, o proprietário pode alterar o arquivo no repositório GitHub e realizar novo deploy.
* **Por E-mail:** Indisponível até a integração do Supabase Auth no `/admin`.

### 5.2. Segurança do Código-Fonte
* O código está versionado na íntegra no GitHub (`gislaynefreitas23-hue/teste1-smoke`), branch `main`.

### 5.3. Dependências do Supabase
* Catálogo de produtos cadastrados via painel.
* Imagens enviadas por upload (armazenadas no Supabase Storage).  
  *(Nota: Os 3 banners originais de lançamento estão salvos no código-fonte em `src/assets/`, não dependendo do Supabase).*
* Histórico de pedidos e saldos de cashback.

### 5.4. Política de Backups
* O plano gratuito padrão do Supabase não inclui backups diários automatizados para download ou restauração pontual (PITR). Recomenda-se exportar periodicamente o banco ou ativar plano com rotina automatizada.

---

## 6. Matriz de Auditoria e Riscos

### Resumo das Funcionalidades:
* **Funcionando:** Interface do painel em 4 abas (Configurações, Banners, Produtos, Pedidos), cálculo de taxas, carrossel dinâmico, WhatsApp e regras RLS no banco.
* **Incompleto:** Autenticação administrativa com hash no servidor, recuperação de senha por e-mail no `/admin` e concessão de novos administradores pela interface.

### Classificação de Riscos:

| Gravidade | Vulnerabilidade | Impacto |
| :---: | :--- | :--- |
| **Crítico** | Senha administrativa em texto claro no código estático (`src/lib/store-settings.ts`). | Leitura pública no pacote JavaScript da aplicação. |
| **Crítico** | Sessão de administrador baseada apenas em chave de `localStorage`. | Possibilidade de bypass do login via console F12. |
| **Médio** | Sessão do `/admin` não vinculada ao JWT do Supabase. | Operações de escrita em produtos e pedidos bloqueadas pelo RLS. |
| **Médio** | Falta de recuperação de senha por e-mail para o administrador. | Necessidade de intervenção no código caso esqueça a senha. |
| **Baixo** | Inexistência de rotina externa automatizada de backup do banco. | Dependência exclusiva da infraestrutura de nuvem do Supabase. |

---

## 7. Recomendações Prioritárias

1. **Prioridade 1:** Migrar o login de `/admin` para `supabase.auth.signInWithPassword()`, eliminando credenciais estáticas do código.
2. **Prioridade 2:** Vincular o usuário administrador na tabela `public.user_roles` com papel `admin`.
3. **Prioridade 3:** Implementar fluxo "Esqueci minha senha" com serviço SMTP configurado no Supabase.
4. **Prioridade 4:** Criar sub-aba no painel para convite de novos administradores.

---
*Relatório gerado automaticamente para suporte à tomada de decisão de segurança e infraestrutura.*

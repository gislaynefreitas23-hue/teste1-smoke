import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, HelpCircle, MessageCircle } from "lucide-react";

import { SITE_NAME, WHATSAPP_NUMBER } from "@/lib/brasa";
import { openWhatsAppExternal } from "@/lib/whatsapp";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/perguntas-frequentes")({
  head: () => ({
    meta: [
      { title: `Perguntas Frequentes — ${SITE_NAME}` },
      {
        name: "description",
        content:
          "Tire suas dúvidas e compre com mais tranquilidade. Entregas, pagamentos na entrega e cashback de 5% na Pantanal Smoke.",
      },
      { property: "og:title", content: `Perguntas Frequentes — ${SITE_NAME}` },
      {
        property: "og:description",
        content: "Tire suas dúvidas e compre com mais tranquilidade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PerguntasFrequentes,
});

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: "loja-fisica",
    question: "A Pantanal Smoke possui loja física?",
    answer: "Não! Somos uma loja 100% online, com atendimento em Cuiabá e São Paulo.",
  },
  {
    id: "como-funciona-entrega",
    question: "Como funciona a entrega?",
    answer:
      "Em Cuiabá, a taxa de entrega é fixa de R$ 10. Em São Paulo, oferecemos entrega grátis em diversos bairros da cidade. Consulte a disponibilidade para sua região.",
  },
  {
    id: "pedido-mesmo-dia",
    question: "Meu pedido chega no mesmo dia?",
    answer:
      "Trabalhamos com entregas no mesmo dia, conforme a disponibilidade, o horário do pedido e a região atendida.",
  },
  {
    id: "pagar-na-entrega",
    question: "Posso pagar na entrega?",
    answer:
      "Sim! Na Pantanal Smoke, você pode pagar somente quando receber seu pedido, garantindo mais segurança, praticidade e tranquilidade na sua compra.",
  },
  {
    id: "cashback-5-porcento",
    question: "Como funciona o cashback de 5%?",
    answer:
      "A cada compra elegível, você acumula 5% do valor em cashback para utilizar nas próximas compras, conforme as regras do cashback.",
  },
];

function PerguntasFrequentes() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12 md:py-16">
      {/* Navegação de retorno */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a loja
        </Link>
      </div>

      {/* Cabeçalho da página */}
      <header className="mb-8 sm:mb-10 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Central de Dúvidas</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
          Perguntas Frequentes
        </h1>
        <p className="mt-3 text-base sm:text-lg text-muted-foreground">
          Tire suas dúvidas e compre com mais tranquilidade.
        </p>
      </header>

      {/* Accordion estilizado com as perguntas */}
      <div className="rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-8 shadow-sm backdrop-blur-sm">
        <Accordion type="single" collapsible className="w-full space-y-3">
          {FAQS.map((faq, index) => (
            <AccordionItem
              key={faq.id}
              value={faq.id}
              className="rounded-xl border border-border/50 bg-background/50 px-4 sm:px-5 data-[state=open]:border-primary/40 data-[state=open]:bg-card/80 transition-colors"
            >
              <AccordionTrigger className="text-left font-medium text-foreground hover:text-primary hover:no-underline py-4 sm:py-5 text-sm sm:text-base">
                <span className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <span>{faq.question}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-5 pt-1 text-sm sm:text-base text-muted-foreground leading-relaxed pl-9">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Card de suporte adicional via WhatsApp */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-border/60 bg-card/40">
        <div>
          <p className="font-semibold text-foreground text-sm sm:text-base">
            Não encontrou o que procurava?
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Nossa equipe está pronta para responder suas dúvidas diretamente pelo WhatsApp.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="border-primary/40 hover:bg-primary/10 text-foreground w-full sm:w-auto"
        >
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => openWhatsAppExternal(`https://wa.me/${WHATSAPP_NUMBER}`, e)}
            className="inline-flex items-center gap-2"
          >
            <MessageCircle className="h-4 w-4 text-primary" />
            Falar pelo WhatsApp
          </a>
        </Button>
      </div>
    </main>
  );
}

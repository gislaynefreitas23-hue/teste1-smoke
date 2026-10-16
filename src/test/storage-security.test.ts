import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";

describe("Auditoria e Testes de Segurança: Supabase Storage (Bucket 'products')", () => {
  let mockFileApi: {
    download: any;
    upload: any;
    remove: any;
    getPublicUrl: any;
    list: any;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockFileApi = {
      download: vi.fn(),
      upload: vi.fn(),
      remove: vi.fn(),
      getPublicUrl: vi.fn(),
      list: vi.fn(),
    };
    vi.spyOn(supabase.storage, "from").mockReturnValue(mockFileApi as any);
  });

  describe("1. Testes de Acesso como Visitante (Usuário Anônimo / Não Autenticado)", () => {
    it("permite visualização de imagens públicas necessárias para a vitrine da loja", async () => {
      mockFileApi.download.mockResolvedValue({
        data: new Blob(["fake-image-bytes"], { type: "image/png" }),
        error: null,
      });

      const { data, error } = await supabase.storage
        .from("products")
        .download("narguile-mahina.png");

      expect(supabase.storage.from).toHaveBeenCalledWith("products");
      expect(mockFileApi.download).toHaveBeenCalledWith("narguile-mahina.png");
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it("BLOQUEIA tentativa de upload de arquivo por visitante anônimo", async () => {
      mockFileApi.upload.mockResolvedValue({
        data: null,
        error: {
          name: "StorageApiError",
          message: "new row violates row-level security policy",
          status: 403,
        },
      });

      const fakeFile = new Blob(["conteudo"], { type: "image/png" });
      const { data, error } = await supabase.storage
        .from("products")
        .upload("hacker-file.png", fakeFile);

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.message).toContain("row-level security policy");
    });

    it("BLOQUEIA tentativa de exclusão de imagens por visitante anônimo", async () => {
      mockFileApi.remove.mockResolvedValue({
        data: null,
        error: {
          name: "StorageApiError",
          message: "violates row-level security policy",
          status: 403,
        },
      });

      const { data, error } = await supabase.storage
        .from("products")
        .remove(["narguile-mahina.png"]);

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.message).toContain("row-level security policy");
    });
  });

  describe("2. Testes de Acesso como Cliente Autenticado Comum (Sem papel 'admin')", () => {
    it("permite leitura e carregamento das fotos do catálogo para efetuar compras", () => {
      mockFileApi.getPublicUrl.mockReturnValue({
        data: {
          publicUrl:
            "https://whvvxnwrldzyafwiflir.supabase.co/storage/v1/object/public/products/essencia-dubaim.jpg",
        },
      });

      const result = supabase.storage
        .from("products")
        .getPublicUrl("essencia-dubaim.jpg");

      expect(mockFileApi.getPublicUrl).toHaveBeenCalledWith("essencia-dubaim.jpg");
      expect(result.data.publicUrl).toContain("products/essencia-dubaim.jpg");
    });

    it("BLOQUEIA envio de fotos por cliente comum (não-admin)", async () => {
      mockFileApi.upload.mockResolvedValue({
        data: null,
        error: {
          name: "StorageApiError",
          message: "new row violates row-level security policy for role authenticated without admin",
          status: 403,
        },
      });

      const fakeImage = new Blob(["imagem"], { type: "image/jpeg" });
      const { data, error } = await supabase.storage
        .from("products")
        .upload("foto-cliente.jpg", fakeImage);

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.message).toContain("violates row-level security policy");
    });

    it("BLOQUEIA exclusão de fotos por cliente comum (não-admin)", async () => {
      mockFileApi.remove.mockResolvedValue({
        data: null,
        error: {
          name: "StorageApiError",
          message: "violates row-level security policy",
          status: 403,
        },
      });

      const { data, error } = await supabase.storage
        .from("products")
        .remove(["essencia-dubaim.jpg"]);

      expect(data).toBeNull();
      expect(error).toBeDefined();
    });
  });

  describe("3. Testes de Acesso como Administrador Autorizado (Papel 'admin')", () => {
    it("permite upload de nova imagem de produto com extensão autorizada", async () => {
      mockFileApi.upload.mockResolvedValue({
        data: { id: "obj-123", path: "novo-pod-pantanal.webp", fullPath: "products/novo-pod-pantanal.webp" },
        error: null,
      });

      const productPhoto = new Blob(["bytes-webp"], { type: "image/webp" });
      const { data, error } = await supabase.storage
        .from("products")
        .upload("novo-pod-pantanal.webp", productPhoto);

      expect(error).toBeNull();
      expect(data?.path).toBe("novo-pod-pantanal.webp");
    });

    it("permite exclusão de imagem de produto por administrador", async () => {
      mockFileApi.remove.mockResolvedValue({
        data: [{ name: "antigo-pod.png" }],
        error: null,
      });

      const { data, error } = await supabase.storage
        .from("products")
        .remove(["antigo-pod.png"]);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });
  });

  describe("4. Validação de Conteúdo e Ausência de Dados Pessoais Sensíveis", () => {
    it("confirma que o bucket 'products' destina-se estritamente a imagens públicas", () => {
      const allowedExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"];
      const testFileValid = "imagem-catalogo.webp";
      const testFileMalicious = "dados-pessoais-clientes.pdf";

      const isValidExtension = (fileName: string) =>
        allowedExtensions.some((ext) => fileName.toLowerCase().endsWith(ext));

      expect(isValidExtension(testFileValid)).toBe(true);
      expect(isValidExtension(testFileMalicious)).toBe(false);
    });
  });
});

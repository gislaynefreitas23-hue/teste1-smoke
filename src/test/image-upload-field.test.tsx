import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImageUploadField } from "@/components/ImageUploadField";
import { supabase } from "@/integrations/supabase/client";

describe("ImageUploadField: Upload Direto de Imagens do Computador", () => {
  let mockFileApi: {
    upload: any;
    getPublicUrl: any;
    createSignedUrl: any;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockFileApi = {
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
      createSignedUrl: vi.fn(),
    };
    vi.spyOn(supabase.storage, "from").mockReturnValue(mockFileApi as any);
  });

  it("renderiza a área de escolha de imagem do computador quando vazio", () => {
    const handleChange = vi.fn();
    render(
      <ImageUploadField
        value=""
        onChange={handleChange}
        label="Foto / Imagem do Produto"
      />
    );

    expect(screen.getByText("Foto / Imagem do Produto")).toBeInTheDocument();
    expect(
      screen.getByText(/Clique para escolher a imagem do computador/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ou arraste e solte o arquivo de imagem diretamente aqui/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId("image-file-input")).toBeInTheDocument();
  });

  it("permite selecionar arquivo de imagem do computador e envia para o bucket 'products'", async () => {
    mockFileApi.upload.mockResolvedValue({
      data: { path: "produto-12345.webp" },
      error: null,
    });
    mockFileApi.createSignedUrl.mockResolvedValue({
      data: {
        signedUrl: "https://mock-supabase.co/storage/v1/object/sign/products/produto-12345.webp?token=test",
      },
      error: null,
    });

    const handleChange = vi.fn();
    render(
      <ImageUploadField
        value=""
        onChange={handleChange}
        label="Foto / Imagem do Produto"
      />
    );

    const fileInput = screen.getByTestId("image-file-input");
    const fakeFile = new File(["fake-image-binary-data"], "foto-essencia.png", {
      type: "image/png",
    });

    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    await waitFor(() => {
      expect(supabase.storage.from).toHaveBeenCalledWith("products");
      expect(mockFileApi.upload).toHaveBeenCalled();
      expect(mockFileApi.createSignedUrl).toHaveBeenCalledWith(
        "produto-12345.webp",
        expect.any(Number)
      );
      expect(handleChange).toHaveBeenCalledWith(
        "https://mock-supabase.co/storage/v1/object/sign/products/produto-12345.webp?token=test"
      );
    });
  });

  it("utiliza fallback base64 DataURL caso o storage falhe, garantindo funcionamento offline", async () => {
    mockFileApi.upload.mockRejectedValue(new Error("Storage offline"));

    const handleChange = vi.fn();
    render(
      <ImageUploadField
        value=""
        onChange={handleChange}
        label="Foto / Imagem do Produto"
      />
    );

    const fileInput = screen.getByTestId("image-file-input");
    const fakeFile = new File(["fake-bytes"], "foto-pod.jpg", {
      type: "image/jpeg",
    });

    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith(
        expect.stringMatching(/^data:image\/jpeg;base64,/)
      );
    });
  });

  it("recusa arquivos que não sejam de imagem com mensagem de validação clara", async () => {
    const handleChange = vi.fn();
    render(
      <ImageUploadField
        value=""
        onChange={handleChange}
        label="Foto / Imagem do Produto"
      />
    );

    const fileInput = screen.getByTestId("image-file-input");
    const invalidFile = new File(["conteudo texto"], "documento.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(
      await screen.findByText(/selecione apenas arquivos de imagem válidos/i)
    ).toBeInTheDocument();
    expect(handleChange).not.toHaveBeenCalled();
  });

  it("exibe a prévia da imagem selecionada com opções de trocar ou remover", () => {
    const handleChange = vi.fn();
    render(
      <ImageUploadField
        value="https://pantanal-smoke.com/images/pod-ignite.webp"
        onChange={handleChange}
        label="Foto / Imagem do Produto"
      />
    );

    expect(screen.getByText("Imagem pronta")).toBeInTheDocument();
    expect(screen.getByAltText("Prévia do produto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Trocar do Computador/i })).toBeInTheDocument();

    const removeBtn = screen.getByTitle("Remover imagem");
    fireEvent.click(removeBtn);
    expect(handleChange).toHaveBeenCalledWith("");
  });

  it("permite alternar para visualização e edição manual de URL", () => {
    const handleChange = vi.fn();
    render(
      <ImageUploadField
        value="https://meulink.com/foto.jpg"
        onChange={handleChange}
        label="Foto / Imagem do Produto"
      />
    );

    const toggleUrlBtn = screen.getByRole("button", { name: /Inserir URL manualmente/i });
    fireEvent.click(toggleUrlBtn);

    const inputManual = screen.getByPlaceholderText(/https:\/\/\.\.\. ou caminho manual/i);
    expect(inputManual).toBeInTheDocument();
    expect(inputManual).toHaveValue("https://meulink.com/foto.jpg");
  });
});

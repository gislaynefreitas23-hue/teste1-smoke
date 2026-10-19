import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  getTransparentPodAsset,
  POD_TRANSPARENT_ASSETS,
} from "@/lib/image-processing";
import { ProductImage } from "@/components/ProductImage";
import { DEFAULT_STORE_SETTINGS } from "@/lib/store-settings";

describe("Correção Definitiva da Exibição de Imagens — Pantanal Smoke", () => {
  it("1. Mapeia com precisão os 6 pods EBCREATE BC Pro 40K para ativos com transparência de alta resolução", () => {
    // Por ID
    expect(
      getTransparentPodAsset("055e851d-e131-41c4-bbb5-6e358c2e719b")
    ).toBeTruthy();
    expect(
      getTransparentPodAsset("be4c4ce8-cd8f-4a71-97ef-b6c0775505ff")
    ).toBeTruthy();
    expect(
      getTransparentPodAsset("e8717cb6-9ceb-4997-9162-09e08fbefb41")
    ).toBeTruthy();
    expect(
      getTransparentPodAsset("9739d60d-33e4-4540-8d0b-2bdeda2cae86")
    ).toBeTruthy();
    expect(
      getTransparentPodAsset("1eeb97e8-5f52-48a4-9847-cd62daf9b37f")
    ).toBeTruthy();
    expect(
      getTransparentPodAsset("566e06a8-2051-40f7-90df-70b0a275a1ad")
    ).toBeTruthy();

    // Por nome de arquivo original do Supabase Storage
    expect(
      getTransparentPodAsset(null, "catalog-1792350992493-3eqo0x.png")
    ).toBeTruthy();
    expect(
      getTransparentPodAsset(null, "produto-1792213432848-3famu6.png")
    ).toBeTruthy();
    expect(
      getTransparentPodAsset(null, "catalog-1792351173512-sx962r.png")
    ).toBeTruthy();
    expect(
      getTransparentPodAsset(null, "produto-1792213247568-mp0v24.png")
    ).toBeTruthy();
    expect(
      getTransparentPodAsset(null, "catalog-1792351555355-y3wcbv.png")
    ).toBeTruthy();
    expect(
      getTransparentPodAsset(null, "catalog-1792351430319-siqbc4.png")
    ).toBeTruthy();

    // Por nome amigável do sabor
    expect(getTransparentPodAsset(null, null, "Aurora Berries")).toBeTruthy();
    expect(getTransparentPodAsset(null, null, "Pink Lemonade")).toBeTruthy();
    expect(getTransparentPodAsset(null, null, "Golden Berry")).toBeTruthy();
    expect(getTransparentPodAsset(null, null, "Pineapple Toasted")).toBeTruthy();
    expect(getTransparentPodAsset(null, null, "Triple Berry")).toBeTruthy();
    expect(getTransparentPodAsset(null, null, "Clear")).toBeTruthy();
  });

  it("2. DEFAULT_STORE_SETTINGS.banners utiliza ativos transparentes sem caixa branca opaca", () => {
    const banners = DEFAULT_STORE_SETTINGS.banners;
    expect(banners.length).toBeGreaterThanOrEqual(3);

    banners.forEach((banner) => {
      expect(banner.imageUrl).toBeTruthy();
      // Não deve apontar para URLs com foto crua contendo fundo branco
      expect(banner.imageUrl).not.toContain("catalog-1792350992493-3eqo0x.png");
    });
  });

  it("3. ProductImage renderiza imagem com brilho neon difuso e sem molduras artificiais", async () => {
    const { container } = render(
      <ProductImage
        src="catalog-1792350992493-3eqo0x.png"
        alt="EBCREATE BC Pro 40K Aurora Berries"
        productName="Aurora Berries"
        glowEffect={true}
        glowColor="rgba(168, 85, 247, 0.45)"
      />
    );

    // Deve renderizar a tag img com alt correto
    const img = await screen.findByAltText("EBCREATE BC Pro 40K Aurora Berries");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("class")).toContain("object-contain");
    expect(img.getAttribute("class")).toContain("drop-shadow");

    // Camada de iluminação neon difusa de fundo
    const glowDiv = container.querySelector('div[aria-hidden="true"]');
    expect(glowDiv).toBeInTheDocument();
    expect(glowDiv?.getAttribute("style")).toContain("rgba(168, 85, 247, 0.45)");
  });

  it("4. ProductImage lida graciosamente com ausência de imagem exibindo placeholder temático", () => {
    render(
      <ProductImage
        src={null}
        alt="Produto Sem Foto"
        productName="Essência Tradicional"
        glowEffect={false}
      />
    );

    expect(screen.getByText("Essência Tradicional")).toBeInTheDocument();
  });

  it("5. Permite troca de fotos no pod Clear sem sobrescrever com asset estático", () => {
    const clearId = "566e06a8-2051-40f7-90df-70b0a275a1ad";
    const clearName = "EBCREATE BC Pro 40K Clear";

    // Quando não há nova foto (usa o seed original), deve retornar o asset transparente oficial
    expect(
      getTransparentPodAsset(clearId, "catalog-1792351430319-siqbc4.png", clearName)
    ).toBeTruthy();

    // Quando o usuário envia uma nova foto (data URL, storage novo ou URL externa),
    // NÃO deve forçar o asset estático; deve retornar null para exibir a foto do usuário
    expect(
      getTransparentPodAsset(clearId, "data:image/jpeg;base64,novaFotoUsuario", clearName)
    ).toBeNull();
    expect(
      getTransparentPodAsset(clearId, "produto-1792999999-clear-novo.png", clearName)
    ).toBeNull();
    expect(
      getTransparentPodAsset(clearId, "https://storage.pantanal.com/novo-clear.webp", clearName)
    ).toBeNull();
  });
});

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  OFFICIAL_IMAGE_SIZE,
  MAX_FILE_SIZE_BYTES,
  INITIAL_QUALITY,
  MIN_QUALITY,
  formatBytes,
  optimizeProductImage,
} from "@/lib/image-optimizer";
import { ImageUploadField } from "@/components/ImageUploadField";
import { ProductCard } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";

// Mocks para TanStack Router e Contextos
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({ component: () => null }),
  useRouter: () => ({
    navigate: vi.fn(),
  }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/" }),
  Link: ({ children, to, onClick, ...props }: any) => (
    <a href={to} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/context/CartContext", () => ({
  useCart: () => ({
    items: [],
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    totalItems: 0,
    subtotal: 0,
  }),
}));

vi.mock("@/lib/city", () => ({
  useCity: () => ({
    city: "cuiaba",
    setCity: vi.fn(),
  }),
}));

describe("Sistema Oficial de Padronização e Otimização de Imagens — Pantanal Smoke", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Parâmetros e Constantes Oficiais", () => {
    it("valida resolução oficial de 1080 × 1080 pixels (1:1)", () => {
      expect(OFFICIAL_IMAGE_SIZE).toBe(1080);
    });

    it("valida limite máximo de 2 MB para arquivos otimizados", () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(2 * 1024 * 1024);
      expect(formatBytes(MAX_FILE_SIZE_BYTES)).toBe("2 MB");
    });

    it("valida qualidade inicial de 90% com ajuste mínimo de 85%", () => {
      expect(INITIAL_QUALITY).toBe(0.9);
      expect(MIN_QUALITY).toBe(0.85);
    });

    it("formata corretamente os tamanhos de arquivo", () => {
      expect(formatBytes(0)).toBe("0 Bytes");
      expect(formatBytes(1024 * 500)).toBe("500 KB");
      expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5 MB");
    });
  });

  describe("2. Motor de Otimização e Padronização Proporcional (image-optimizer)", () => {
    it("processa arquivo de imagem mantendo proporções e padrão 1080x1080", async () => {
      const fakeBlob = new Blob(["fake-image-bytes"], { type: "image/png" });
      const fakeFile = new File([fakeBlob], "essencia-love66.png", { type: "image/png" });

      const result = await optimizeProductImage(fakeFile);

      expect(result.width).toBe(1080);
      expect(result.height).toBe(1080);
      expect(result.file.name).toContain("1080x1080");
      expect(result.exceedsLimit).toBe(false);
    });

    it("detecta quando arquivo excede limite de 2 MB sem permitir compressão excessiva", async () => {
      // Mock de arquivo simulando 2.5 MB
      const oversizedBytes = new Uint8Array(2.5 * 1024 * 1024);
      const oversizedFile = new File([oversizedBytes], "foto-gigante.png", { type: "image/png" });

      const result = await optimizeProductImage(oversizedFile, {
        maxSizeBytes: 2 * 1024 * 1024,
      });

      expect(result.exceedsLimit).toBe(true);
    });
  });

  describe("3. Upload no Painel Administrativo (ImageUploadField)", () => {
    let mockStorage: any;

    beforeEach(() => {
      mockStorage = {
        upload: vi.fn().mockResolvedValue({
          data: { path: "catalog-1080x1080.webp" },
          error: null,
        }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://mock.supabase.co/storage/v1/object/sign/products/catalog-1080x1080.webp" },
          error: null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: "https://mock.supabase.co/storage/v1/object/public/products/catalog-1080x1080.webp" },
        }),
      };
      vi.spyOn(supabase.storage, "from").mockReturnValue(mockStorage);
    });

    it("exibe selos com metadados oficiais (1080 × 1080 px, formato e proporção 1:1)", () => {
      render(
        <ImageUploadField
          value="https://mock.supabase.co/storage/v1/object/public/products/pod-ignite.webp"
          onChange={vi.fn()}
          label="Foto do Produto"
        />
      );

      expect(screen.getByText("Imagem pronta")).toBeInTheDocument();
      expect(screen.getByText(/1080 × 1080 px \(1:1\)/i)).toBeInTheDocument();
      expect(screen.getByText("WEBP", { selector: "span" })).toBeInTheDocument();
      expect(screen.getByAltText("Prévia do produto")).toBeInTheDocument();
    });

    it("bloqueia arquivos que excedem 2 MB informando erro claro", async () => {
      const handleChange = vi.fn();
      render(
        <ImageUploadField
          value=""
          onChange={handleChange}
          label="Foto do Produto"
        />
      );

      // Simula arquivo que excede 2MB
      const hugeBuffer = new Uint8Array(2.6 * 1024 * 1024);
      const hugeFile = new File([hugeBuffer], "pod-pesado.png", { type: "image/png" });

      const fileInput = screen.getByTestId("image-file-input");
      fireEvent.change(fileInput, { target: { files: [hugeFile] } });

      await waitFor(() => {
        expect(screen.getByText(/excede o limite máximo de 2 MB mantendo a qualidade de 85%/i)).toBeInTheDocument();
      });
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe("4. Exibição no Catálogo (ProductCard)", () => {
    const mockProduct = {
      id: "prod-1",
      name: "Pod Descartável Ignite V150 15000 Puffs",
      category: "Pod Descartável",
      brand: "Ignite",
      puffCount: 15000,
      image_url: "https://images.unsplash.com/photo-1527661591475-527312dd65f5",
      cuiaba_price: "160.00",
      vg_price: "160.00",
      cuiaba_stock: 10,
      vg_stock: 5,
      is_active: true,
      is_featured: true,
      has_promotion: false,
    };

    it("renderiza contêiner de imagem 1:1 com gradiente Lavanda Metálico e object-contain", () => {
      const { container } = render(
        <ProductCard
          product={mockProduct as any}
          selectedCity="cuiaba"
          onAddToCart={vi.fn()}
        />
      );

      const imageBox = container.querySelector(".aspect-square");
      expect(imageBox).toBeInTheDocument();
      expect(imageBox).toHaveClass("bg-product-lavanda");
      expect(imageBox).toHaveClass("overflow-hidden");

      const img = screen.getByAltText("Pod Descartável Ignite V150 15000 Puffs");
      expect(img).toBeInTheDocument();
      expect(img).toHaveClass("object-contain");
      expect(img).toHaveClass("object-center");
      expect(img).toHaveClass("max-h-[90%]");
      expect(img).toHaveClass("max-w-[90%]");
    });
  });
});

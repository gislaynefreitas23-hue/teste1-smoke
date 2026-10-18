import auroraBerriesImg from "@/assets/pods/aurora-berries.png";
import pinkLemonadeImg from "@/assets/pods/pink-lemonade.png";
import goldenBerryImg from "@/assets/pods/golden-berry.png";
import pineappleToastedImg from "@/assets/pods/pineapple-toasted.png";
import tripleBerryImg from "@/assets/pods/triple-berry.png";
import clearImg from "@/assets/pods/clear.png";

/**
 * Mapeamento exclusivo dos Pods EBCREATE BC Pro 40K para suas versões derivadas
 * com transparência perfeita (sem fundo branco, sem moldura, preservando 100% dos detalhes originais).
 */
export const POD_TRANSPARENT_ASSETS: Record<string, string> = {
  // Por ID do Supabase
  "055e851d-e131-41c4-bbb5-6e358c2e719b": auroraBerriesImg,
  "be4c4ce8-cd8f-4a71-97ef-b6c0775505ff": pinkLemonadeImg,
  "e8717cb6-9ceb-4997-9162-09e08fbefb41": goldenBerryImg,
  "9739d60d-33e4-4540-8d0b-2bdeda2cae86": pineappleToastedImg,
  "1eeb97e8-5f52-48a4-9847-cd62daf9b37f": tripleBerryImg,
  "566e06a8-2051-40f7-90df-70b0a275a1ad": clearImg,

  // Por nome de arquivo do Supabase Storage
  "catalog-1792350992493-3eqo0x.png": auroraBerriesImg,
  "produto-1792213432848-3famu6.png": pinkLemonadeImg,
  "catalog-1792351173512-sx962r.png": goldenBerryImg,
  "produto-1792213247568-mp0v24.png": pineappleToastedImg,
  "catalog-1792351555355-y3wcbv.png": tripleBerryImg,
  "catalog-1792351430319-siqbc4.png": clearImg,

  // Por chave de sabor simplificada
  "aurora-berries": auroraBerriesImg,
  "pink-lemonade": pinkLemonadeImg,
  "golden-berry": goldenBerryImg,
  "pineapple-toasted": pineappleToastedImg,
  "toasted-pineapple": pineappleToastedImg,
  "triple-berry": tripleBerryImg,
  "clear": clearImg,
};

/**
 * Recupera versão com transparência já otimizada caso seja um dos Pods emblemáticos
 */
export function getTransparentPodAsset(
  productId?: string | null,
  imageUrl?: string | null,
  name?: string | null
): string | null {
  if (productId && POD_TRANSPARENT_ASSETS[productId]) {
    return POD_TRANSPARENT_ASSETS[productId];
  }

  if (imageUrl) {
    // Procura por nome de arquivo na URL
    for (const [key, asset] of Object.entries(POD_TRANSPARENT_ASSETS)) {
      if (imageUrl.includes(key)) {
        return asset;
      }
    }
  }

  if (name) {
    const clean = name.toLowerCase();
    if (clean.includes("aurora")) return auroraBerriesImg;
    if (clean.includes("pink lemonade") || clean.includes("pink")) return pinkLemonadeImg;
    if (clean.includes("golden")) return goldenBerryImg;
    if (clean.includes("pineapple") || clean.includes("abacaxi") || clean.includes("toasted")) return pineappleToastedImg;
    if (clean.includes("triple berry") || clean.includes("triple")) return tripleBerryImg;
    if (clean.includes("clear")) return clearImg;
  }

  return null;
}

// Cache em memória para imagens processadas dinamicamente
const processedImageCache = new Map<string, string>();

/**
 * Remove fundo branco incorporado em imagens de novos produtos enviados via navegador (HTML5 Canvas),
 * preservando integralmente o produto, logos, frutas e cores, sem utilizar mix-blend-mode.
 */
export async function removeWhiteBackgroundClientSide(imageSrc: string): Promise<string> {
  if (typeof window === "undefined" || !imageSrc) return imageSrc;
  if (processedImageCache.has(imageSrc)) {
    return processedImageCache.get(imageSrc)!;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Amostra os 4 cantos para verificar se há fundo branco sólido
        const cornerIndices = [
          0,
          (width - 1) * 4,
          (height - 1) * width * 4,
          ((height - 1) * width + (width - 1)) * 4,
        ];

        let whiteCornerCount = 0;
        for (const idx of cornerIndices) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          const dist = Math.hypot(255 - r, 255 - g, 255 - b);
          if (a > 200 && dist < 42) {
            whiteCornerCount++;
          }
        }

        // Se pelo menos 3 cantos forem brancos opacos, o arquivo possui fundo branco incorporado
        if (whiteCornerCount < 3) {
          // Imagem já é transparente ou tem fundo artístico próprio: preserva original
          processedImageCache.set(imageSrc, imageSrc);
          resolve(imageSrc);
          return;
        }

        // BFS / Flood-fill a partir das bordas externas conectadas
        const visited = new Uint8Array(width * height);
        const queue: number[] = [];

        function isPixelWhite(x: number, y: number): boolean {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const dist = Math.hypot(255 - r, 255 - g, 255 - b);
          return dist < 42;
        }

        for (let x = 0; x < width; x++) {
          if (isPixelWhite(x, 0)) {
            queue.push(0 * width + x);
            visited[0 * width + x] = 1;
          }
          if (isPixelWhite(x, height - 1)) {
            queue.push((height - 1) * width + x);
            visited[(height - 1) * width + x] = 1;
          }
        }

        for (let y = 0; y < height; y++) {
          if (isPixelWhite(0, y)) {
            queue.push(y * width + 0);
            visited[y * width + 0] = 1;
          }
          if (isPixelWhite(width - 1, y)) {
            queue.push(y * width + (width - 1));
            visited[y * width + (width - 1)] = 1;
          }
        }

        let head = 0;
        while (head < queue.length) {
          const pos = queue[head++];
          const cx = pos % width;
          const cy = Math.floor(pos / width);

          const neighbors = [
            [cx - 1, cy],
            [cx + 1, cy],
            [cx, cy - 1],
            [cx, cy + 1],
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const npos = ny * width + nx;
              if (!visited[npos] && isPixelWhite(nx, ny)) {
                visited[npos] = 1;
                queue.push(npos);
              }
            }
          }
        }

        // Aplica transparência suave nas bordas
        for (let i = 0; i < queue.length; i++) {
          const pos = queue[i];
          const idx = pos * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const dist = Math.hypot(255 - r, 255 - g, 255 - b);
          if (dist < 22) {
            data[idx + 3] = 0;
          } else {
            const factor = (dist - 22) / 20;
            data[idx + 3] = Math.round(255 * factor);
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const transparentDataUrl = canvas.toDataURL("image/png");
        processedImageCache.set(imageSrc, transparentDataUrl);
        resolve(transparentDataUrl);
      } catch (err) {
        console.warn("Fallback de processamento de imagem:", err);
        resolve(imageSrc);
      }
    };

    img.onerror = () => {
      resolve(imageSrc);
    };

    img.src = imageSrc;
  });
}

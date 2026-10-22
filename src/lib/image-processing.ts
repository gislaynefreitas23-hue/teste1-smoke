import auroraBerriesImg from "@/assets/pods/aurora-berries.png";
import pinkLemonadeImg from "@/assets/pods/pink-lemonade.png";
import goldenBerryImg from "@/assets/pods/golden-berry.png";
import pineappleToastedImg from "@/assets/pods/pineapple-toasted.png";
import tripleBerryImg from "@/assets/pods/triple-berry.png";
import clearImg from "@/assets/pods/clear.png";
import fckingFabImg from "@/assets/pods/fcking-fab.png";

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
  "9c924bf4-e909-470a-b4f2-3038cab03dd7": fckingFabImg,

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
  "fcking-fab": fckingFabImg,
  "f-cking-fab": fckingFabImg,
  "f*cking-fab": fckingFabImg,
  "f**king-fab": fckingFabImg,
  "fucking-fab": fckingFabImg,
  "fucking fab": fckingFabImg,
  "fab": fckingFabImg,
};

export const ORIGINAL_SEEDED_STORAGE_FILES: Record<string, string> = {
  "catalog-1792350992493-3eqo0x.png": auroraBerriesImg,
  "produto-1792213432848-3famu6.png": pinkLemonadeImg,
  "catalog-1792351173512-sx962r.png": goldenBerryImg,
  "produto-1792213247568-mp0v24.png": pineappleToastedImg,
  "catalog-1792351555355-y3wcbv.png": tripleBerryImg,
  "catalog-1792351430319-siqbc4.png": clearImg,
};

const LOCAL_POD_ASSETS = [
  auroraBerriesImg,
  pinkLemonadeImg,
  goldenBerryImg,
  pineappleToastedImg,
  tripleBerryImg,
  clearImg,
  fckingFabImg,
];

/**
 * Verifica se uma URL de imagem corresponde a um upload ou seleção customizada feita pelo usuário
 * no painel administrativo, a qual não deve ser substituída pelos assets estáticos locais.
 */
export function isCustomUserImage(imageUrl?: string | null): boolean {
  if (!imageUrl || typeof imageUrl !== "string") return false;
  const trimmed = imageUrl.trim();
  if (!trimmed) return false;

  // Se já for data URL base64 ou blob (upload direto do computador)
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return true;
  }

  // Se corresponder a um dos 6 arquivos originais do catálogo inicial
  for (const seededFile of Object.keys(ORIGINAL_SEEDED_STORAGE_FILES)) {
    if (trimmed.includes(seededFile)) {
      return false;
    }
  }

  // Se for um dos assets transparentes locais importados
  for (const localAsset of LOCAL_POD_ASSETS) {
    if (trimmed === localAsset || (typeof localAsset === "string" && trimmed.includes(localAsset))) {
      return false;
    }
  }

  // Se for qualquer outra URL/arquivo (ex: produto-179..., novo arquivo no Supabase ou URL externa)
  return true;
}

/**
 * Recupera versão com transparência já otimizada caso seja um dos Pods emblemáticos,
 * respeitando fotos customizadas enviadas/selecionadas pelo usuário no painel administrativo.
 */
export function getTransparentPodAsset(
  productId?: string | null,
  imageUrl?: string | null,
  name?: string | null
): string | null {
  // 1. Se o usuário definiu uma foto customizada nova, NÃO sobrepõe com asset estático
  if (isCustomUserImage(imageUrl)) {
    return null;
  }

  // 2. Se a imagem apontar para um dos arquivos originais do seed do Supabase
  if (imageUrl) {
    for (const [seededFile, asset] of Object.entries(ORIGINAL_SEEDED_STORAGE_FILES)) {
      if (imageUrl.includes(seededFile)) {
        return asset;
      }
    }

    // Se for o caminho do próprio asset local
    for (const localAsset of LOCAL_POD_ASSETS) {
      if (imageUrl === localAsset || imageUrl.includes(localAsset)) {
        return localAsset;
      }
    }
  }

  // 3. Se não houver imagem customizada, busca pelo ID oficial do Supabase
  if (productId && POD_TRANSPARENT_ASSETS[productId]) {
    return POD_TRANSPARENT_ASSETS[productId];
  }

  // 4. Se não houver imagem customizada nem ID, busca pelo nome do sabor
  if (name) {
    const clean = name.toLowerCase();
    if (clean.includes("aurora")) return auroraBerriesImg;
    if (clean.includes("pink lemonade") || clean.includes("pink")) return pinkLemonadeImg;
    if (clean.includes("golden")) return goldenBerryImg;
    if (clean.includes("pineapple") || clean.includes("abacaxi") || clean.includes("toasted")) return pineappleToastedImg;
    if (clean.includes("triple berry") || clean.includes("triple")) return tripleBerryImg;
    if (clean.includes("clear")) return clearImg;
    if (clean.includes("fab") || clean.includes("fucking") || clean.includes("f*cking") || clean.includes("fcking")) return fckingFabImg;
  }

  return null;
}

// Cache em memória para imagens processadas dinamicamente
const processedImageCache = new Map<string, string>();

/**
 * Obtém instantaneamente a versão recortada transparente do cache (se já tiver sido processada)
 */
export function getCachedCleanImage(imageSrc?: string | null): string | null {
  if (!imageSrc || typeof imageSrc !== "string") return null;
  if (processedImageCache.has(imageSrc)) {
    return processedImageCache.get(imageSrc)!;
  }
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      const cacheKey = "ps_clean_" + (imageSrc.length > 80 ? imageSrc.slice(-60) : imageSrc);
      const saved = sessionStorage.getItem(cacheKey);
      if (saved) {
        processedImageCache.set(imageSrc, saved);
        return saved;
      }
    } catch {
      // Ignora erro de acesso a storage
    }
  }
  return null;
}

/**
 * Remove fundo branco incorporado em imagens de novos produtos enviados via navegador (HTML5 Canvas),
 * preservando integralmente o produto, logos, frutas e cores, sem utilizar mix-blend-mode.
 */
export async function removeWhiteBackgroundClientSide(imageSrc: string): Promise<string> {
  if (typeof window === "undefined" || !imageSrc) return imageSrc;
  const cached = getCachedCleanImage(imageSrc);
  if (cached) {
    return cached;
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

        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;
        const maxDim = 480;
        const scale = Math.min(1, maxDim / Math.max(naturalWidth, naturalHeight));
        const width = Math.max(1, Math.round(naturalWidth * scale));
        const height = Math.max(1, Math.round(naturalHeight * scale));
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Amostra múltiplos pontos nos 4 cantos para verificar se há fundo branco sólido ou off-white
        const cornerPoints = [
          [0, 0],
          [2, 2],
          [width - 1, 0],
          [Math.max(0, width - 3), 2],
          [0, height - 1],
          [2, Math.max(0, height - 3)],
          [width - 1, height - 1],
          [Math.max(0, width - 3), Math.max(0, height - 3)],
        ];

        let whiteCornerCount = 0;
        for (const [cx, cy] of cornerPoints) {
          const idx = (cy * width + cx) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          const dist = Math.hypot(255 - r, 255 - g, 255 - b);
          if (a > 180 && (dist < 50 || (r > 220 && g > 220 && b > 220))) {
            whiteCornerCount++;
          }
        }

        // Se pelo menos metade das amostras dos cantos forem claras/brancas opacas,
        // o arquivo possui fundo incorporado que deve ser removido
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
          const a = data[idx + 3];
          if (a < 50) return true;
          const dist = Math.hypot(255 - r, 255 - g, 255 - b);
          return dist < 48 || (r > 225 && g > 225 && b > 225);
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
        const maxIterations = 150000;
        while (head < queue.length && head < maxIterations) {
          const pos = queue[head++];
          const cx = pos % width;
          const cy = (pos / width) | 0;

          if (cx > 0) {
            const npos = cy * width + (cx - 1);
            if (!visited[npos] && isPixelWhite(cx - 1, cy)) {
              visited[npos] = 1;
              queue.push(npos);
            }
          }
          if (cx < width - 1) {
            const npos = cy * width + (cx + 1);
            if (!visited[npos] && isPixelWhite(cx + 1, cy)) {
              visited[npos] = 1;
              queue.push(npos);
            }
          }
          if (cy > 0) {
            const npos = (cy - 1) * width + cx;
            if (!visited[npos] && isPixelWhite(cx, cy - 1)) {
              visited[npos] = 1;
              queue.push(npos);
            }
          }
          if (cy < height - 1) {
            const npos = (cy + 1) * width + cx;
            if (!visited[npos] && isPixelWhite(cx, cy + 1)) {
              visited[npos] = 1;
              queue.push(npos);
            }
          }
        }

        // Aplica transparência suave nas bordas conectadas
        for (let i = 0; i < queue.length; i++) {
          const pos = queue[i];
          const idx = pos * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const dist = Math.hypot(255 - r, 255 - g, 255 - b);
          if (dist < 28) {
            data[idx + 3] = 0;
          } else {
            const factor = (dist - 28) / 22;
            data[idx + 3] = Math.max(0, Math.min(255, Math.round(255 * factor)));
          }
        }

        // Garante que o perímetro externo de 1-2px seja totalmente transparente para eliminar qualquer linha residual
        for (let x = 0; x < width; x++) {
          if (visited[0 * width + x]) data[(0 * width + x) * 4 + 3] = 0;
          if (visited[(height - 1) * width + x]) data[((height - 1) * width + x) * 4 + 3] = 0;
        }
        for (let y = 0; y < height; y++) {
          if (visited[y * width + 0]) data[(y * width + 0) * 4 + 3] = 0;
          if (visited[y * width + (width - 1)]) data[(y * width + (width - 1)) * 4 + 3] = 0;
        }

        ctx.putImageData(imgData, 0, 0);
        const transparentDataUrl = canvas.toDataURL("image/png");
        processedImageCache.set(imageSrc, transparentDataUrl);
        if (typeof window !== "undefined" && window.sessionStorage) {
          try {
            const cacheKey = "ps_clean_" + (imageSrc.length > 80 ? imageSrc.slice(-60) : imageSrc);
            sessionStorage.setItem(cacheKey, transparentDataUrl);
          } catch {
            // Ignora erro de quota do sessionStorage
          }
        }
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

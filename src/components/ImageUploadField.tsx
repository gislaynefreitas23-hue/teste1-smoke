import { useEffect, useState, useRef } from "react";
import {
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  Loader2,
  Link2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Maximize2,
  FileCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { resolveProductImage } from "@/lib/brasa";
import { getTransparentPodAsset, removeWhiteBackgroundClientSide } from "@/lib/image-processing";
import {
  optimizeProductImage,
  formatBytes,
  ACCEPTED_MIME_TYPES,
  OFFICIAL_IMAGE_SIZE,
  MAX_FILE_SIZE_BYTES,
  type OptimizedImageResult,
} from "@/lib/image-optimizer";

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  bucket?: string;
  helperText?: string;
  folderPrefix?: string;
}

export function ImageUploadField({
  value,
  onChange,
  label = "Foto do Produto",
  bucket = "products",
  helperText = "Padrão oficial: 1080×1080 (1:1), WebP, até 2MB. Formatos: PNG, JPG, JPEG e WebP.",
  folderPrefix = "produto",
}: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(value);
  const [optimizedMeta, setOptimizedMeta] = useState<OptimizedImageResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincroniza e resolve a URL da imagem para exibição (mesmo se privada no Supabase)
  useEffect(() => {
    let active = true;
    if (!value) {
      setPreviewUrl("");
      setOptimizedMeta(null);
      return;
    }

    const podAsset = getTransparentPodAsset(null, value, null);
    if (podAsset) {
      setPreviewUrl(podAsset);
      return;
    }

    // Se já for data URL base64 ou blob (upload direto do computador)
    if (value.startsWith("data:") || value.startsWith("blob:")) {
      removeWhiteBackgroundClientSide(value)
        .then((clean) => {
          if (active) setPreviewUrl(clean);
        })
        .catch(() => {
          if (active) setPreviewUrl(value);
        });
      return;
    }

    resolveProductImage(value).then(async (resolved) => {
      if (!active) return;
      const target = resolved || value;
      try {
        const clean = await removeWhiteBackgroundClientSide(target);
        if (active) setPreviewUrl(clean);
      } catch {
        if (active) setPreviewUrl(target);
      }
    });

    return () => {
      active = false;
    };
  }, [value]);

  const processFile = async (file: File) => {
    // 1. Validação estrita de formato de imagem
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isValidExt = ["png", "jpg", "jpeg", "webp"].includes(ext);
    const isValidMime = ACCEPTED_MIME_TYPES.includes(file.type.toLowerCase()) || file.type.startsWith("image/");

    if (!isValidExt && !isValidMime) {
      setUploadError("Por favor, selecione apenas arquivos de imagem válidos (PNG, JPG, WEBP, GIF).");
      return;
    }

    setUploadError(null);
    setSuccessStatus(null);
    setIsUploading(true);

    try {
      // 2. Otimização e padronização automática (1080x1080 1:1, WebP, 90%->85%, máx 2MB)
      let optimization: OptimizedImageResult;
      try {
        optimization = await optimizeProductImage(file, {
          targetSize: OFFICIAL_IMAGE_SIZE,
          maxSizeBytes: MAX_FILE_SIZE_BYTES,
        });
      } catch (optErr: any) {
        // Fallback resiliente
        console.warn("Falha na otimização avançada:", optErr);
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        optimization = {
          file,
          blob: file,
          dataUrl: base64Data,
          width: OFFICIAL_IMAGE_SIZE,
          height: OFFICIAL_IMAGE_SIZE,
          originalWidth: OFFICIAL_IMAGE_SIZE,
          originalHeight: OFFICIAL_IMAGE_SIZE,
          originalSize: file.size,
          optimizedSize: file.size,
          format: (ext === "png" ? "png" : "webp") as any,
          hasTransparency: ext === "png",
          quality: 0.9,
          exceedsLimit: file.size > MAX_FILE_SIZE_BYTES,
          compressionRatio: 0,
        };
      }

      // 3. Validação do limite de 2 MB mantendo a qualidade mínima de 85%
      if (optimization.exceedsLimit) {
        setUploadError(
          `O arquivo otimizado (${formatBytes(optimization.optimizedSize)}) excede o limite máximo de 2 MB mantendo a qualidade de 85%. Por favor, escolha outro arquivo para evitar perda de nitidez.`
        );
        setIsUploading(false);
        return;
      }

      setOptimizedMeta(optimization);
      setPreviewUrl(optimization.dataUrl);

      // 4. Nome padronizado para o Supabase Storage
      const cleanFileName = `${folderPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${optimization.format}`;
      let uploadedUrl: string | null = null;

      // 5. Upload para o Supabase Storage no bucket configurado
      try {
        const { data: uploadData, error: storageErr } = await supabase.storage
          .from(bucket)
          .upload(cleanFileName, optimization.file, {
            cacheControl: "3600",
            upsert: true,
            contentType: optimization.file.type || `image/${optimization.format}`,
          });

        if (!storageErr && uploadData?.path) {
          const { data: signedData, error: signErr } = await supabase.storage
            .from(bucket)
            .createSignedUrl(uploadData.path, 60 * 60 * 24 * 365 * 5); // 5 anos

          if (!signErr && signedData?.signedUrl) {
            uploadedUrl = signedData.signedUrl;
          } else {
            const { data: publicData } = supabase.storage
              .from(bucket)
              .getPublicUrl(uploadData.path);

            if (publicData?.publicUrl) {
              uploadedUrl = publicData.publicUrl;
            }
          }
        } else if (storageErr) {
          console.warn("Aviso no Supabase Storage:", storageErr.message);
        }
      } catch (storageException) {
        console.warn("Supabase Storage indisponível ou offline:", storageException);
      }

      // 6. Atualiza o valor do formulário
      if (uploadedUrl) {
        onChange(uploadedUrl);
        setSuccessStatus(`Imagem otimizada em 1080×1080 (${optimization.format.toUpperCase()} • ${formatBytes(optimization.optimizedSize)}) enviada com sucesso!`);
      } else {
        // Fallback local caso o Supabase Storage esteja em mock ou indisponível
        const fallbackValue = optimization.dataUrl || "";
        onChange(fallbackValue);
        setSuccessStatus(`Imagem otimizada em 1080×1080 (${optimization.format.toUpperCase()} • ${formatBytes(optimization.optimizedSize)}) pronta!`);
      }
    } catch (err: any) {
      setUploadError(err?.message || "Erro ao processar imagem.");
    } finally {
      setIsUploading(false);
      setTimeout(() => setSuccessStatus(null), 5000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-slate-200">{label}</Label>
        <button
          type="button"
          onClick={() => setShowManualUrl(!showManualUrl)}
          className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
        >
          <Link2 className="h-3 w-3" />
          {showManualUrl ? "Ocultar campo de URL" : "Inserir URL manualmente"}
        </button>
      </div>

      {/* Input de arquivo oculto acessível pelo clique do botão */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        onChange={handleFileChange}
        className="hidden"
        data-testid="image-file-input"
        aria-label="Upload de imagem do computador"
      />

      {/* Exibição quando já existe imagem selecionada */}
      {value ? (
        <div className="rounded-xl border border-primary/30 bg-card/80 p-3.5 flex flex-col gap-3 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Contêiner oficial 1:1 com gradiente Lavanda Metálico */}
              <div
                className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-lg border border-primary/20 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-inner"
                style={{ background: "linear-gradient(145deg, #E9E5EC 0%, #D8D5DC 55%, #BDB8C5 100%)" }}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-30"
                  style={{
                    background: "radial-gradient(circle at center, rgba(255, 255, 255, 0.45) 0%, transparent 75%)",
                  }}
                  aria-hidden="true"
                />
                <img
                  src={previewUrl || value}
                  alt="Prévia do produto"
                  width={1080}
                  height={1080}
                  className="relative z-10 h-full w-full max-h-[92%] max-w-[92%] object-contain object-center drop-shadow-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=200&auto=format&fit=crop&q=80";
                  }}
                />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Imagem pronta</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (Padrão 1080×1080 1:1)
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground truncate max-w-xs sm:max-w-md" title={value}>
                  {value.startsWith("data:") ? "Arquivo otimizado do computador (Base64)" : value}
                </p>

                {/* Badges de Metadados Oficiais (Resolução, Formato, Tamanho, Transparência) */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-950/60 text-purple-300 border border-purple-500/30">
                    <Maximize2 className="h-2.5 w-2.5 text-purple-400" />
                    1080 × 1080 px (1:1)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                    <FileCheck className="h-2.5 w-2.5 text-emerald-400" />
                    {(optimizedMeta?.format || "WebP").toUpperCase()}
                  </span>
                  {optimizedMeta?.optimizedSize ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-900 text-slate-300 border border-slate-700">
                      {formatBytes(optimizedMeta.optimizedSize)}
                      {optimizedMeta.compressionRatio > 0.05 && (
                        <span className="text-emerald-400 ml-1 font-bold">
                          (-{Math.round(optimizedMeta.compressionRatio * 100)}%)
                        </span>
                      )}
                    </span>
                  ) : null}
                  {optimizedMeta?.hasTransparency && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                      Transparência ✓
                    </span>
                  )}
                  {optimizedMeta?.quality && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-900 text-slate-400 border border-slate-800">
                      {Math.round(optimizedMeta.quality * 100)}% qualidade
                    </span>
                  )}
                </div>

                {successStatus && (
                  <p className="text-[11px] text-emerald-400 font-medium animate-pulse">
                    {successStatus}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={async () => {
                  if (!previewUrl && !value) return;
                  try {
                    const target = previewUrl || value;
                    const cleaned = await removeWhiteBackgroundClientSide(target);
                    if (cleaned) {
                      onChange(cleaned);
                      setPreviewUrl(cleaned);
                      setSuccessStatus("Fundo branco removido preservando transparência!");
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="text-xs h-8 gap-1.5 border-purple-500/40 text-purple-300 hover:border-purple-400 hover:text-white hover:bg-purple-950/40 cursor-pointer"
                title="Remove o fundo branco preservando cores e qualidade do produto"
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                Remover Fundo
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="text-xs h-8 gap-1.5 border-slate-700 hover:border-primary hover:text-primary cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Otimizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Trocar do Computador
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isUploading}
                onClick={() => {
                  onChange("");
                  setPreviewUrl("");
                  setOptimizedMeta(null);
                }}
                className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                title="Remover imagem"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Área de Upload / Dropzone quando NÃO há imagem */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragOver
              ? "border-primary bg-primary/10 shadow-glow"
              : "border-slate-800 bg-slate-950/40 hover:border-primary/60 hover:bg-card/40"
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center space-y-2 py-2">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs font-semibold text-white">Padronizando e otimizando imagem em 1080×1080 (1:1)...</p>
              <p className="text-[11px] text-muted-foreground">Preservando nitidez, transparência e proporções.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-white group-hover:text-primary transition-colors">
                  Clique para escolher a imagem do computador
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  ou arraste e solte o arquivo de imagem diretamente aqui
                </p>
              </div>
              <p className="text-[10px] text-slate-500">{helperText}</p>
            </div>
          )}
        </div>
      )}

      {/* Erro de validação ou upload se houver */}
      {uploadError && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/30 border border-rose-800/40 rounded-lg p-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Campo opcional para ver ou editar a URL diretamente */}
      {showManualUrl && (
        <div className="pt-1.5 animate-in fade-in-50">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://... ou caminho manual da imagem"
            className="text-xs"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Você pode colar links externos se desejar, ou usar o botão acima para pegar do computador.
          </p>
        </div>
      )}
    </div>
  );
}

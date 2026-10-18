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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { resolveProductImage } from "@/lib/brasa";
import { getTransparentPodAsset, removeWhiteBackgroundClientSide } from "@/lib/image-processing";

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
  helperText = "Formatos aceitos: PNG, JPG, WEBP, GIF até 10MB.",
  folderPrefix = "produto",
}: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincroniza e resolve a URL da imagem para exibição (mesmo se privada no Supabase)
  useEffect(() => {
    let active = true;
    if (!value) {
      setPreviewUrl("");
      return;
    }

    const podAsset = getTransparentPodAsset(null, value, null);
    if (podAsset) {
      setPreviewUrl(podAsset);
      return;
    }

    // Se já for data URL base64 ou blob
    if (value.startsWith("data:") || value.startsWith("blob:")) {
      setPreviewUrl(value);
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
    if (!file.type.startsWith("image/")) {
      setUploadError("Por favor, selecione apenas arquivos de imagem válidos (PNG, JPG, WEBP, GIF).");
      return;
    }

    setUploadError(null);
    setSuccessStatus(null);
    setIsUploading(true);

    // Mostra prévia instantânea local via FileReader
    const localReader = new FileReader();
    localReader.onload = () => {
      if (typeof localReader.result === "string") {
        setPreviewUrl(localReader.result);
      }
    };
    localReader.readAsDataURL(file);

    try {
      // 1. Gera nome de arquivo padronizado e seguro
      const ext = file.name.split(".").pop()?.toLowerCase() || "webp";
      const cleanFileName = `${folderPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

      let uploadedUrl: string | null = null;

      // 2. Tenta fazer o upload para o Supabase Storage no bucket 'products'
      try {
        const { data: uploadData, error: storageErr } = await supabase.storage
          .from(bucket)
          .upload(cleanFileName, file, {
            cacheControl: "3600",
            upsert: true,
          });

        if (!storageErr && uploadData?.path) {
          // Tenta criar URL assinada (funciona mesmo em buckets privados de alta segurança)
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

      // 3. Se obteve URL do Supabase, define-a
      if (uploadedUrl) {
        onChange(uploadedUrl);
        setSuccessStatus("Imagem enviada com sucesso do computador!");
      } else {
        // Fallback robusto: converte para Data URL Base64 para garantir funcionamento mesmo se o storage estiver offline
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            onChange(reader.result);
            setSuccessStatus("Imagem carregada do computador!");
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      setUploadError(err?.message || "Erro ao processar imagem.");
    } finally {
      setIsUploading(false);
      setTimeout(() => setSuccessStatus(null), 4000);
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
        <div className="rounded-xl border border-primary/30 bg-card/80 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-sm">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-lg border border-primary/20 bg-slate-950 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              <div
                className="pointer-events-none absolute inset-0 -m-2 rounded-full opacity-35 blur-md"
                style={{ background: "rgba(168, 85, 247, 0.3)" }}
                aria-hidden="true"
              />
              <img
                src={previewUrl || value}
                alt="Prévia do produto"
                className="relative z-10 h-full w-full object-contain drop-shadow-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=200&auto=format&fit=crop&q=80";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Imagem pronta</span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate max-w-xs sm:max-w-md mt-0.5" title={value}>
                {value.startsWith("data:") ? "Arquivo carregado do computador (Base64)" : value}
              </p>
              {successStatus && (
                <p className="text-[11px] text-emerald-400 font-medium mt-1 animate-pulse">
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
                    setSuccessStatus("Fundo branco removido com sucesso!");
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
                  Enviando...
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
              }}
              className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              title="Remover imagem"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
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
              <p className="text-xs font-semibold text-white">Carregando imagem do computador...</p>
              <p className="text-[11px] text-muted-foreground">Isso levará apenas alguns instantes.</p>
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
        <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/30 border border-rose-800/40 rounded-lg p-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
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

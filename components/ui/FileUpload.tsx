import React, { useState, useRef } from 'react';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  FileText, 
  Loader2, 
  Camera, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { cn } from '@/components/AppLayout';
import { uploadFile } from '@/services/supabaseService';
import { toast } from 'sonner';

interface FileUploadProps {
  bucket: 'despesas' | 'checklists' | 'diario-bordo';
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
}

export function FileUpload({ bucket, value, onChange, label, className }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // Validação básica
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('O arquivo deve ter no máximo 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use JPG, PNG, WEBP ou PDF.');
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadFile(bucket, file);
      onChange(url);
      toast.success('Arquivo enviado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao fazer upload do arquivo');
    } finally {
      setIsUploading(false);
    }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const isPdf = value?.toLowerCase().endsWith('.pdf');

  return (
    <div className={cn("space-y-2", className)}>
      {label && <label className="text-sm font-medium text-foreground/80">{label}</label>}
      
      <div 
        className={cn(
          "relative group w-full min-h-[160px] border-2 border-dashed rounded-xl transition-all duration-200 flex flex-col items-center justify-center p-4 text-center cursor-pointer overflow-hidden",
          value ? "border-primary/20 bg-primary/5" : "border-border/60 hover:border-primary/40 hover:bg-primary/5",
          dragActive && "border-primary bg-primary/10 scale-[0.99]",
          isUploading && "pointer-events-none opacity-80"
        )}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
        onClick={() => !value && fileInputRef.current?.click()}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*,application/pdf"
          capture="environment"
          className="hidden" 
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Enviando arquivo...</p>
              <p className="text-xs text-muted-foreground italic">Por favor, aguarde</p>
            </div>
          </div>
        ) : value ? (
          <div className="w-full h-full flex flex-col items-center gap-4">
            <div className="relative w-full aspect-video sm:aspect-auto sm:h-32 rounded-lg border border-border/50 overflow-hidden bg-background/50">
              {isPdf ? (
                <div className="w-full h-full flex items-center justify-center bg-muted/30">
                  <FileText className="h-12 w-12 text-primary/60" />
                  <span className="ml-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">Documento PDF</span>
                </div>
              ) : (
                <img src={value} alt="Preview" className="w-full h-full object-contain" />
              )}
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange('');
                  }}
                  className="bg-danger text-white p-2 rounded-full shadow-lg transform hover:scale-110 transition-transform"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Arquivo Anexado</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Anexar Comprovante</p>
              <p className="text-xs text-muted-foreground">
                Arraste ou clique para selecionar<br/>
                <span className="inline-flex items-center gap-1 mt-1 font-medium text-primary/80">
                  <Camera className="h-3 w-3" /> Abrir Câmera
                </span>
              </p>
            </div>
            <div className="mt-2 flex gap-2">
              <span className="px-2 py-0.5 rounded bg-muted text-[10px] text-muted-foreground border border-border">JPG</span>
              <span className="px-2 py-0.5 rounded bg-muted text-[10px] text-muted-foreground border border-border">PNG</span>
              <span className="px-2 py-0.5 rounded bg-muted text-[10px] text-muted-foreground border border-border">PDF</span>
            </div>
          </div>
        )}
      </div>

      {!value && !isUploading && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
          <AlertCircle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 shrink-0" />
          <p className="text-[10px] text-yellow-500/80 leading-tight">
            Certifique-se de que a imagem esteja nítida para evitar recusas no fechamento da viagem.
          </p>
        </div>
      )}
    </div>
  );
}

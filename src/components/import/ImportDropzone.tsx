import type { DragEvent } from 'react';
import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { clsx } from 'clsx';

interface ImportDropzoneProps {
  onArquivoSelecionado: (arquivo: File) => void;
}

const EXTENSOES_ACEITAS = ['.csv', '.xlsx', '.xls'];

export function ImportDropzone({ onArquivoSelecionado }: ImportDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);

  const validarEEnviar = (arquivo: File | undefined) => {
    if (!arquivo) return;
    const extensaoValida = EXTENSOES_ACEITAS.some((ext) => arquivo.name.toLowerCase().endsWith(ext));
    if (!extensaoValida) return;
    onArquivoSelecionado(arquivo);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setArrastando(false);
    validarEEnviar(event.dataTransfer.files[0]);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setArrastando(true);
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      className={clsx(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors',
        arrastando ? 'border-brand-400 bg-brand-50/60' : 'border-graphite-300 bg-graphite-50/50 hover:bg-graphite-50',
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <UploadCloud className="h-7 w-7" />
      </div>
      <div>
        <p className="text-sm font-semibold text-graphite-800">Arraste seu arquivo aqui ou clique para selecionar</p>
        <p className="mt-1 text-xs text-graphite-500">Formatos suportados: CSV, XLSX, XLS</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={EXTENSOES_ACEITAS.join(',')}
        className="hidden"
        onChange={(event) => validarEEnviar(event.target.files?.[0])}
      />
    </div>
  );
}

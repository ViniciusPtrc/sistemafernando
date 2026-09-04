import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
  aberto: boolean;
  onFechar: () => void;
  titulo?: string;
  children: ReactNode;
  tamanho?: 'md' | 'lg' | 'xl';
}

const TAMANHO_CLASSES: Record<NonNullable<ModalProps['tamanho']>, string> = {
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ aberto, onFechar, titulo, children, tamanho = 'lg' }: ModalProps) {
  useEffect(() => {
    if (!aberto) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onFechar();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-graphite-950/50 backdrop-blur-[2px]" onClick={onFechar} />
      <div
        className={`animate-fade-in relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl bg-white shadow-2xl ${TAMANHO_CLASSES[tamanho]}`}
      >
        {titulo && (
          <div className="flex items-center justify-between border-b border-graphite-200 px-6 py-4">
            <h2 className="text-base font-semibold text-graphite-900">{titulo}</h2>
            <button
              type="button"
              onClick={onFechar}
              className="rounded-md p-1 text-graphite-400 hover:bg-graphite-100 hover:text-graphite-600"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

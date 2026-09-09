import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';

type ToastVariante = 'sucesso' | 'erro' | 'info' | 'aviso';

interface ToastItem {
  id: string;
  titulo: string;
  descricao?: string;
  variante: ToastVariante;
}

interface ToastContextValue {
  notificar: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** `crypto.randomUUID` só existe em contexto seguro (localhost/HTTPS); em `http://IP` da rede ele lança. */
let contadorToast = 0;
function gerarId(): string {
  contadorToast += 1;
  return `toast-${Date.now()}-${contadorToast}`;
}

const VARIANTE_ESTILO: Record<ToastVariante, string> = {
  sucesso: 'border-l-4 border-positive-500',
  erro: 'border-l-4 border-negative-500',
  info: 'border-l-4 border-brand-500',
  aviso: 'border-l-4 border-warning-500',
};

const VARIANTE_ICONE: Record<ToastVariante, ReactNode> = {
  sucesso: <CheckCircle2 className="h-5 w-5 text-positive-500" />,
  erro: <XCircle className="h-5 w-5 text-negative-500" />,
  info: <Info className="h-5 w-5 text-brand-500" />,
  aviso: <TriangleAlert className="h-5 w-5 text-warning-500" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remover = useCallback((id: string) => {
    setToasts((atual) => atual.filter((toast) => toast.id !== id));
  }, []);

  const notificar = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = gerarId();
      setToasts((atual) => [...atual, { ...toast, id }]);
      setTimeout(() => remover(id), 5000);
    },
    [remover],
  );

  const value = useMemo(() => ({ notificar }), [notificar]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-fade-in pointer-events-auto flex items-start gap-3 rounded-lg bg-white p-4 shadow-lg ring-1 ring-graphite-200 ${VARIANTE_ESTILO[toast.variante]}`}
          >
            {VARIANTE_ICONE[toast.variante]}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-graphite-900">{toast.titulo}</p>
              {toast.descricao && <p className="mt-0.5 text-sm text-graphite-500">{toast.descricao}</p>}
            </div>
            <button
              type="button"
              onClick={() => remover(toast.id)}
              className="text-graphite-400 hover:text-graphite-600"
              aria-label="Fechar notificação"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
}

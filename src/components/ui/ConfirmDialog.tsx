import { TriangleAlert } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  aberto: boolean;
  titulo: string;
  descricao: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  perigo?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function ConfirmDialog({
  aberto,
  titulo,
  descricao,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  perigo = false,
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  return (
    <Modal aberto={aberto} onFechar={onCancelar} tamanho="md">
      <div className="p-6">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full ${
            perigo ? 'bg-negative-50 text-negative-600' : 'bg-brand-50 text-brand-600'
          }`}
        >
          <TriangleAlert className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-graphite-900">{titulo}</h2>
        <p className="mt-2 text-sm text-graphite-500">{descricao}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variante="secundario" onClick={onCancelar}>
            {textoCancelar}
          </Button>
          <Button variante={perigo ? 'perigo' : 'primario'} onClick={onConfirmar}>
            {textoConfirmar}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

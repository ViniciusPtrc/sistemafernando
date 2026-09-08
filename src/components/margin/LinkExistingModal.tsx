import { useEffect, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataTableColumn } from '@/components/tables/DataTable';
import { useToast } from '@/hooks/useToast';
import { useDebounce } from '@/hooks/useDebounce';
import type { RespostaPaginada } from '@/types';

interface LinkExistingModalProps<T> {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  colunas: DataTableColumn<T>[];
  getId: (item: T) => string;
  buscar: (params: { search?: string; page: number; limit: number }) => Promise<RespostaPaginada<T>>;
  onConfirmar: (ids: string[]) => Promise<void>;
  textoConfirmar?: string;
  /** Slot extra acima da tabela (ex.: seletor de tipo Realizado/Projetado para custos). */
  extra?: ReactNode;
  /** Reabre a busca quando muda (ex.: usuário alterna "realizado"/"projetado" e a lista deve recarregar). */
  chaveRecarga?: string;
}

export function LinkExistingModal<T>({
  aberto,
  onFechar,
  titulo,
  colunas,
  getId,
  buscar,
  onConfirmar,
  textoConfirmar = 'Vincular selecionados',
  extra,
  chaveRecarga,
}: LinkExistingModalProps<T>) {
  const { notificar } = useToast();
  const [busca, setBusca] = useState('');
  const buscaDebounced = useDebounce(busca, 300);
  const [itens, setItens] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setCarregando(true);
    buscar({ search: buscaDebounced || undefined, page: 1, limit: 50 })
      .then((r) => setItens(r.dados))
      .catch(() => setItens([]))
      .finally(() => setCarregando(false));
  }, [aberto, buscaDebounced, chaveRecarga]);

  useEffect(() => {
    if (!aberto) setSelecionados(new Set());
  }, [aberto]);

  const confirmar = async () => {
    if (selecionados.size === 0) {
      notificar({ titulo: 'Selecione ao menos um item', descricao: 'Marque as linhas que deseja vincular.', variante: 'info' });
      return;
    }
    setConfirmando(true);
    try {
      await onConfirmar([...selecionados]);
      notificar({ titulo: 'Vinculado com sucesso', descricao: `${selecionados.size} lançamento(s) vinculado(s) ao contrato.`, variante: 'sucesso' });
      setSelecionados(new Set());
      onFechar();
    } catch (e) {
      notificar({ titulo: 'Não foi possível vincular', descricao: e instanceof Error ? e.message : 'Tente novamente.', variante: 'erro' });
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={titulo} tamanho="xl">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full max-w-xs">
            <Input icone={<Search className="h-4 w-4" />} placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          {extra}
        </div>

        <DataTable colunas={colunas} dados={itens} getId={getId} carregando={carregando} selecionados={selecionados} onSelecaoChange={setSelecionados} />

        <div className="flex items-center justify-between">
          <span className="text-xs text-graphite-500">{selecionados.size} selecionado(s)</span>
          <div className="flex gap-2">
            <Button variante="secundario" onClick={onFechar}>Cancelar</Button>
            <Button onClick={confirmar} disabled={confirmando}>{confirmando ? 'Vinculando…' : textoConfirmar}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

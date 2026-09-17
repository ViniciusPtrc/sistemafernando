import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, Copy, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useCompany } from '@/hooks/useCompany';
import { useToast } from '@/hooks/useToast';
import { getFormacoesPreco, excluirFormacaoPreco, duplicarFormacaoPreco } from '@/services/formacaoPrecoService';
import { formatCurrency, formatPercent } from '@/utils/format';
import type { FormacaoPreco } from '@/types';

export default function FormacaoPrecoPage() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const { notificar } = useToast();

  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [formacoes, setFormacoes] = useState<FormacaoPreco[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [paraExcluir, setParaExcluir] = useState<FormacaoPreco | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setBuscaAplicada(busca.trim()), 350);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    setCarregando(true);
    setErro(false);
    getFormacoesPreco({ companyId: selectedCompany, search: buscaAplicada || undefined, limit: 100 })
      .then((r) => {
        setFormacoes(r.dados);
        setCarregando(false);
      })
      .catch(() => {
        setErro(true);
        setCarregando(false);
      });
  }, [selectedCompany, buscaAplicada, tentativa]);

  const duplicar = async (f: FormacaoPreco) => {
    try {
      const nova = await duplicarFormacaoPreco(f.id);
      notificar({ titulo: 'Simulação duplicada', descricao: nova.nome, variante: 'sucesso' });
      navigate(`/formacao-preco/${nova.id}`);
    } catch (e) {
      notificar({ titulo: 'Não foi possível duplicar', descricao: e instanceof Error ? e.message : 'Tente novamente.', variante: 'erro' });
    }
  };

  const confirmarExclusao = async () => {
    if (!paraExcluir) return;
    try {
      await excluirFormacaoPreco(paraExcluir.id);
      setFormacoes((atual) => atual.filter((f) => f.id !== paraExcluir.id));
      notificar({ titulo: 'Simulação removida', descricao: paraExcluir.nome, variante: 'sucesso' });
    } catch (e) {
      notificar({ titulo: 'Não foi possível remover', descricao: e instanceof Error ? e.message : 'Tente novamente.', variante: 'erro' });
    } finally {
      setParaExcluir(null);
    }
  };

  if (erro) return <ErrorState onTentarNovamente={() => setTentativa((t) => t + 1)} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Formação de Preço"
        subtitulo="Simule custos e formação de preço para saber se um contrato ou proposta vale a pena."
        acoes={
          <Button icone={<Plus className="h-4 w-4" />} onClick={() => navigate('/formacao-preco/nova')}>
            Nova simulação
          </Button>
        }
      />

      <div className="max-w-sm">
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, órgão ou objeto…" />
      </div>

      {!carregando && formacoes.length === 0 ? (
        <EmptyState
          titulo="Nenhuma simulação ainda"
          descricao="Crie uma simulação de formação de preço para começar a comparar custos e margem."
          icone={<Calculator className="h-6 w-6" />}
          acao={
            <Button icone={<Plus className="h-4 w-4" />} onClick={() => navigate('/formacao-preco/nova')}>
              Nova simulação
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {carregando
            ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-44 animate-pulse rounded-xl bg-graphite-100" />)
            : formacoes.map((f) => (
                <Card key={f.id} className="flex flex-col gap-3 p-5">
                  <button type="button" onClick={() => navigate(`/formacao-preco/${f.id}`)} className="flex flex-1 flex-col gap-1 text-left">
                    <h3 className="text-sm font-semibold text-graphite-900">{f.nome || 'Sem nome'}</h3>
                    {(f.orgao || f.numeroPregao) && (
                      <p className="text-xs text-graphite-500">
                        {f.orgao}
                        {f.orgao && f.numeroPregao ? ' · ' : ''}
                        {f.numeroPregao}
                      </p>
                    )}
                    <div className="mt-2 flex flex-col gap-0.5 text-sm">
                      <span className="text-graphite-500">
                        Preço mínimo: <strong className="text-graphite-900">{f.resultado.precoMinimo === null ? 'N/A' : formatCurrency(f.resultado.precoMinimo)}</strong>
                      </span>
                      <span className="text-graphite-500">Margem-alvo: {formatPercent(f.lucroPercent * 100)}</span>
                      {f.resultado.comparacaoReferencia && (
                        <span className={f.resultado.comparacaoReferencia.viavel ? 'font-medium text-positive-600' : 'font-medium text-negative-600'}>
                          {f.resultado.comparacaoReferencia.viavel ? 'Vale a pena no preço de referência' : 'Não vale a pena no preço de referência'}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center justify-end gap-1 border-t border-graphite-100 pt-2">
                    <Button variante="fantasma" tamanho="sm" icone={<Copy className="h-3.5 w-3.5" />} onClick={() => duplicar(f)}>
                      Duplicar
                    </Button>
                    <Button variante="fantasma" tamanho="sm" icone={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setParaExcluir(f)}>
                      Remover
                    </Button>
                  </div>
                </Card>
              ))}
        </div>
      )}

      <ConfirmDialog
        aberto={!!paraExcluir}
        titulo="Remover simulação"
        descricao={`Tem certeza que deseja remover "${paraExcluir?.nome}"? Essa ação não pode ser desfeita.`}
        perigo
        textoConfirmar="Remover"
        onConfirmar={confirmarExclusao}
        onCancelar={() => setParaExcluir(null)}
      />
    </div>
  );
}

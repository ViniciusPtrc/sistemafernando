import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { calcularValidacoes, type StatusValidacao } from '@/utils/formacaoPrecoAnalises';
import type { RascunhoFormacaoPreco, ResultadoFormacaoPreco } from '@/types';

interface PainelValidacoesProps {
  rascunho: RascunhoFormacaoPreco;
  resultado: ResultadoFormacaoPreco;
}

const ICONE: Record<StatusValidacao, ReactNode> = {
  ok: <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-positive-600" />,
  atencao: <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" />,
  erro: <AlertCircle className="h-4 w-4 flex-shrink-0 text-negative-600" />,
};

const TEXTO_CLASSE: Record<StatusValidacao, string> = {
  ok: 'text-graphite-700',
  atencao: 'text-amber-700',
  erro: 'text-negative-700',
};

export function PainelValidacoes({ rascunho, resultado }: PainelValidacoesProps) {
  const itens = calcularValidacoes(rascunho, resultado);
  const erros = itens.filter((i) => i.status === 'erro').length;
  const atencoes = itens.filter((i) => i.status === 'atencao').length;

  return (
    <Card>
      <CardHeader><CardTitle>Validações automáticas</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-graphite-500">
          {erros === 0 && atencoes === 0
            ? 'Nenhum problema identificado nesta simulação.'
            : `${erros} erro(s) e ${atencoes} ponto(s) de atenção — confira abaixo.`}
        </p>
        <ul className="flex flex-col divide-y divide-graphite-100">
          {itens.map((item, i) => (
            <li key={i} className="flex items-center gap-2 py-2 text-sm">
              {ICONE[item.status]}
              <span className={TEXTO_CLASSE[item.status]}>{item.mensagem}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

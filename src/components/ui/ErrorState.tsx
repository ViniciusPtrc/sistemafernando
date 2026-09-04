import { AlertTriangle } from 'lucide-react';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { Button } from './Button';

interface ErrorStateProps {
  titulo?: string;
  descricao?: string;
  onTentarNovamente?: () => void;
}

/** Estado de erro padrão para telas que dependem da API (§22, §38). */
export function ErrorState({
  titulo = 'Não foi possível carregar os dados',
  descricao = 'Verifique se o servidor está no ar e tente novamente.',
  onTentarNovamente,
}: ErrorStateProps) {
  return (
    <Card className="p-2">
      <EmptyState
        titulo={titulo}
        descricao={descricao}
        icone={<AlertTriangle className="h-6 w-6 text-negative-500" />}
        acao={
          onTentarNovamente ? (
            <Button variante="secundario" onClick={onTentarNovamente}>
              Tentar novamente
            </Button>
          ) : undefined
        }
      />
    </Card>
  );
}

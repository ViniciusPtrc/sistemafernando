import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-graphite-100 text-graphite-400">
        <FileQuestion className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-graphite-900">Página não encontrada</h1>
        <p className="mt-1 text-sm text-graphite-500">A página que você procura não existe ou foi movida.</p>
      </div>
      <Link to="/">
        <Button>Voltar ao Dashboard</Button>
      </Link>
    </div>
  );
}

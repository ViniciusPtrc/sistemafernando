import type { ReactNode } from 'react';
import { Bell, Download, Palette, User, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';

export default function ConfiguracoesPage() {
  const { notificar } = useToast();

  const salvar = () => {
    notificar({ titulo: 'Preferências salvas', descricao: 'Suas configurações foram atualizadas.', variante: 'sucesso' });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader titulo="Configurações" subtitulo="Gerencie seu perfil e as preferências do sistema" />

      <SecaoConfig icone={<User className="h-4 w-4" />} titulo="Perfil">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nome completo">
            <Input defaultValue="Vinicius Patricio" />
          </Campo>
          <Campo label="E-mail">
            <Input type="email" defaultValue="viniciuspatricio.adm@gmail.com" />
          </Campo>
          <Campo label="Cargo">
            <Input defaultValue="Administrador Financeiro" />
          </Campo>
          <Campo label="Empresa">
            <Input defaultValue="Minha Empresa Ltda." />
          </Campo>
        </div>
      </SecaoConfig>

      <SecaoConfig icone={<Bell className="h-4 w-4" />} titulo="Preferências">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Idioma">
            <Select opcoes={[{ value: 'pt-BR', label: 'Português (Brasil)' }, { value: 'en-US', label: 'English (US)' }]} defaultValue="pt-BR" />
          </Campo>
          <Campo label="Fuso horário">
            <Select
              opcoes={[
                { value: 'america-sao_paulo', label: 'América/São Paulo (GMT-3)' },
                { value: 'utc', label: 'UTC' },
              ]}
              defaultValue="america-sao_paulo"
            />
          </Campo>
          <ToggleLinha titulo="Notificações por e-mail" descricao="Receber alertas de vencimentos e inadimplência." defaultChecked />
          <ToggleLinha titulo="Resumo semanal" descricao="Receber um resumo financeiro toda segunda-feira." />
        </div>
      </SecaoConfig>

      <SecaoConfig icone={<Wallet className="h-4 w-4" />} titulo="Configurações Financeiras">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Moeda padrão">
            <Select opcoes={[{ value: 'brl', label: 'Real Brasileiro (R$)' }, { value: 'usd', label: 'Dólar Americano (US$)' }]} defaultValue="brl" />
          </Campo>
          <Campo label="Dia de fechamento do mês">
            <Select
              opcoes={Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `Dia ${i + 1}` }))}
              defaultValue="1"
            />
          </Campo>
          <Campo label="Prazo de alerta de vencimento (dias)">
            <Input type="number" defaultValue={7} min={1} max={30} />
          </Campo>
          <Campo label="Percentual de inadimplência aceitável">
            <Input type="number" defaultValue={5} min={0} max={100} />
          </Campo>
        </div>
      </SecaoConfig>

      <SecaoConfig icone={<Palette className="h-4 w-4" />} titulo="Formatação">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Formato de data">
            <Select opcoes={[{ value: 'dd-mm-yyyy', label: 'DD/MM/AAAA' }, { value: 'mm-dd-yyyy', label: 'MM/DD/AAAA' }]} defaultValue="dd-mm-yyyy" />
          </Campo>
          <Campo label="Formato de número">
            <Select opcoes={[{ value: 'pt-br', label: '1.234,56' }, { value: 'en-us', label: '1,234.56' }]} defaultValue="pt-br" />
          </Campo>
        </div>
      </SecaoConfig>

      <SecaoConfig icone={<Download className="h-4 w-4" />} titulo="Exportação">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Formato padrão de exportação">
            <Select opcoes={[{ value: 'pdf', label: 'PDF' }, { value: 'excel', label: 'Excel' }, { value: 'csv', label: 'CSV' }]} defaultValue="pdf" />
          </Campo>
          <ToggleLinha titulo="Incluir logotipo nos relatórios" descricao="Adicionar o logotipo da empresa nos exports em PDF." defaultChecked />
        </div>
      </SecaoConfig>

      <div className="flex justify-end">
        <Button onClick={salvar}>Salvar alterações</Button>
      </div>
    </div>
  );
}

function SecaoConfig({ icone, titulo, children }: { icone: ReactNode; titulo: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-graphite-100 text-graphite-600">{icone}</span>
          <CardTitle>{titulo}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-graphite-500">{label}</span>
      {children}
    </label>
  );
}

function ToggleLinha({ titulo, descricao, defaultChecked }: { titulo: string; descricao: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-graphite-200 p-3.5">
      <div>
        <p className="text-sm font-medium text-graphite-800">{titulo}</p>
        <p className="mt-0.5 text-xs text-graphite-500">{descricao}</p>
      </div>
      <label className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center">
        <input type="checkbox" defaultChecked={defaultChecked} className="peer sr-only" />
        <span className="h-6 w-11 rounded-full bg-graphite-200 transition-colors peer-checked:bg-brand-600" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </label>
    </div>
  );
}

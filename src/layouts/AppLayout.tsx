import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export function AppLayout() {
  const [recolhida, setRecolhida] = useState(false);
  const [abertaMobile, setAbertaMobile] = useState(false);

  return (
    <div className="flex min-h-screen bg-graphite-50">
      <Sidebar
        recolhida={recolhida}
        onAlternarRecolhida={() => setRecolhida((atual) => !atual)}
        abertaMobile={abertaMobile}
        onFecharMobile={() => setAbertaMobile(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onAbrirMenuMobile={() => setAbertaMobile(true)} />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
} 
      
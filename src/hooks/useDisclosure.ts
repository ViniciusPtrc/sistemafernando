import { useCallback, useState } from 'react';

export interface DisclosureState {
  aberto: boolean;
  abrir: () => void;
  fechar: () => void;
  alternar: () => void;
}

export function useDisclosure(inicial = false): DisclosureState {
  const [aberto, setAberto] = useState(inicial);

  const abrir = useCallback(() => setAberto(true), []);
  const fechar = useCallback(() => setAberto(false), []);
  const alternar = useCallback(() => setAberto((atual) => !atual), []);

  return { aberto, abrir, fechar, alternar };
}

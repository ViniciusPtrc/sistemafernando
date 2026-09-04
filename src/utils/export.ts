export function exportarCsv(nomeArquivo: string, colunas: string[], linhas: (string | number)[][]): void {
  const escapar = (valor: string | number) => {
    const texto = String(valor);
    return /[",;\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };

  const conteudo = [colunas, ...linhas].map((linha) => linha.map(escapar).join(';')).join('\n');
  const blob = new Blob([`﻿${conteudo}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${nomeArquivo}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

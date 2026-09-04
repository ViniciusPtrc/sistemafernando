import type { Categoria, Cliente, Fornecedor } from '@/types';
import { apiGet } from './api';

interface PartyDTO {
  id: string;
  nome: string;
  documento: string;
  quantidade?: number;
}

interface CategoriaDTO {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  cor: string;
}

export async function getClientes(): Promise<Cliente[]> {
  const dtos = await apiGet<PartyDTO[]>('/customers');
  return dtos.map((d) => ({ id: d.id, nome: d.nome, documento: d.documento, segmento: 'Cliente' }));
}

export async function getFornecedores(): Promise<Fornecedor[]> {
  const dtos = await apiGet<PartyDTO[]>('/suppliers');
  return dtos.map((d) => ({ id: d.id, nome: d.nome, documento: d.documento, segmento: 'Fornecedor' }));
}

export async function getCategorias(): Promise<Categoria[]> {
  const dtos = await apiGet<CategoriaDTO[]>('/categories');
  return dtos.map((d) => ({ id: d.id, nome: d.nome, tipo: d.tipo, cor: d.cor }));
}

import type { Company } from '@/types';
import { apiGet } from './api';

interface CompanyDTO {
  id: string;
  name: string;
  shortName: string;
  document: string;
  status: 'ativo' | 'inativo';
  color: string;
}

function mapCompany(dto: CompanyDTO): Company {
  return {
    id: dto.id,
    name: dto.name,
    shortName: dto.shortName,
    document: dto.document,
    status: dto.status,
    color: dto.color,
  };
}

export async function getCompanies(): Promise<Company[]> {
  const dtos = await apiGet<CompanyDTO[]>('/companies');
  return dtos.map(mapCompany);
}

export async function getCompany(id: string): Promise<Company> {
  return mapCompany(await apiGet<CompanyDTO>(`/companies/${id}`));
}

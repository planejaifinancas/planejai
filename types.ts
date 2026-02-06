
export enum Categoria {
  // Despesas
  CASA = 'Casa (Essencial)',
  ALIMENTACAO = 'Alimentação (Essencial/Variável)',
  TRANSPORTE = 'Transporte/Carro (Essencial/Variável)',
  SAUDE = 'Saúde e Bem-estar (Essencial/Variável)',
  EDUCACAO = 'Educação (Essencial/Variável)',
  LAZER = 'Lazer e Estilo de Vida (Variável)',
  PESSOAIS = 'Despesas Pessoais/Variáveis',
  INVESTIMENTOS = 'Prioridades Financeiras/Investimentos',
  // Receitas
  SALARIOS = 'Salários',
  ALUGUEIS = 'Aluguéis',
  DIVIDENDOS = 'Dividendos',
  OUTROS_RECEITA = 'Outros (Receita)'
}

export type TipoTransacao = 'despesa' | 'receita';
export type OrigemGasto = 'manual' | 'importacao' | 'open_finance';
export type FonteArquivo = 'pdf' | 'csv' | 'banco' | null;

export interface Gasto {
  id: string;
  tipo: TipoTransacao;
  descricao: string;
  data: string; // ISO date string YYYY-MM-DD
  local: string;
  valor: number;
  categoria: Categoria;
  parcelado: boolean;
  recorrente: boolean;
  numeroParcela: number | null;
  totalParcelas: number | null;
  origem: OrigemGasto;
  fonteArquivo: FonteArquivo;
  confiancaCategoria: 'alta' | 'media' | 'baixa';
  mesReferencia?: number;
  anoReferencia?: number;
  bancoNome?: string;
}

export interface BancoConectado {
  id: string;
  nome: string;
  cor: string;
  logo: string;
  status: 'conectado' | 'erro' | 'sincronizando';
  ultimaSincronizacao: string;
}

export interface ImportSummary {
  totalItems: number;
  totalValue: number;
  lowConfidenceItems: number;
}

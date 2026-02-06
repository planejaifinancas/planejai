
import { Categoria } from '../types';

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export const autoCategorize = (text: string): { categoria: Categoria, confianca: 'alta' | 'media' | 'baixa' } => {
  const upperText = text.toUpperCase();
  
  if (upperText.includes('UBER') || upperText.includes('99APP') || upperText.includes('POSTO') || upperText.includes('SHELL') || upperText.includes('IPVA')) {
    return { categoria: Categoria.TRANSPORTE, confianca: 'alta' };
  }
  
  if (upperText.includes('IFOOD') || upperText.includes('RESTAURANTE') || upperText.includes('MCDONALDS') || upperText.includes('BURGER') || upperText.includes('SUPERMERCADO') || upperText.includes('EXTRA') || upperText.includes('CARREFOUR')) {
    return { categoria: Categoria.ALIMENTACAO, confianca: 'alta' };
  }
  
  if (upperText.includes('DROGA') || upperText.includes('FARM') || upperText.includes('UNIMED') || upperText.includes('ACADEMIA') || upperText.includes('SMARTFIT')) {
    return { categoria: Categoria.SAUDE, confianca: 'alta' };
  }
  
  if (upperText.includes('NETFLIX') || upperText.includes('SPOTIFY') || upperText.includes('STEAM') || upperText.includes('CINEMA') || upperText.includes('DISNEY')) {
    return { categoria: Categoria.LAZER, confianca: 'alta' };
  }

  if (upperText.includes('ALUGUEL') || upperText.includes('CONDOMINIO') || upperText.includes('ENEL') || upperText.includes('SABESP') || upperText.includes('CLARO') || upperText.includes('VIVO')) {
    return { categoria: Categoria.CASA, confianca: 'alta' };
  }

  if (upperText.includes('CDB') || upperText.includes('ACOES') || upperText.includes('XP INVEST') || upperText.includes('NU INVEST') || upperText.includes('TESOURO')) {
    return { categoria: Categoria.INVESTIMENTOS, confianca: 'alta' };
  }

  // Fallback
  return { categoria: Categoria.PESSOAIS, confianca: 'baixa' };
};

export const parseCSV = (content: string): any[] => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  // Heuristic for separator
  const header = lines[0];
  const separator = header.includes(';') ? ';' : ',';
  const columns = header.split(separator).map(c => c.trim().toLowerCase());

  const dateIdx = columns.findIndex(c => c.includes('data') || c.includes('date'));
  const descIdx = columns.findIndex(c => c.includes('desc') || c.includes('hist') || c.includes('item'));
  const valueIdx = columns.findIndex(c => c.includes('valor') || c.includes('amount') || c.includes('preco'));
  const localIdx = columns.findIndex(c => c.includes('local') || c.includes('estabel') || c.includes('place'));

  return lines.slice(1).map(line => {
    const parts = line.split(separator).map(p => p.trim());
    const rawDate = parts[dateIdx] || '';
    const rawValue = parts[valueIdx] || '0';
    
    // Normalize Date (simple DD/MM/YYYY or YYYY-MM-DD to YYYY-MM-DD)
    let normalizedDate = '';
    if (rawDate.includes('/')) {
      const [d, m, y] = rawDate.split('/');
      normalizedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else {
      normalizedDate = rawDate;
    }

    // Normalize Value (handle R$, comma as decimal)
    let normalizedValue = parseFloat(rawValue.replace('R$', '').replace('.', '').replace(',', '.').trim());
    if (isNaN(normalizedValue)) normalizedValue = 0;

    return {
      data: normalizedDate,
      descricao: parts[descIdx] || '',
      local: localIdx !== -1 ? parts[localIdx] : '',
      valor: normalizedValue,
    };
  });
};

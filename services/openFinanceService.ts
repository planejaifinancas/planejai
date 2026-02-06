
import { Categoria, Gasto, BancoConectado, OrigemGasto } from '../types';

/**
 * SERVIÇO DE OPEN FINANCE BRASIL (OFB)
 * Simula a lógica que rodaria no Backend para manter conformidade FAPI.
 */

// Diretório Expandido de Participantes do Open Finance Brasil
export const OFB_DIRECTORY = [
  { id: 'bb_id', nome: 'Banco do Brasil', logo: 'https://logo.clearbit.com/bb.com.br', auth_endpoint: 'https://auth.bb.com.br/oauth' },
  { id: 'nu_id', nome: 'Nubank', logo: 'https://logo.clearbit.com/nubank.com.br', auth_endpoint: 'https://auth.nubank.com.br/oauth' },
  { id: 'itau_id', nome: 'Itaú / Itaú Cartões', logo: 'https://logo.clearbit.com/itau.com.br', auth_endpoint: 'https://auth.itau.com.br/oauth' },
  { id: 'inter_id', nome: 'Inter', logo: 'https://logo.clearbit.com/bancointer.com.br', auth_endpoint: 'https://auth.bancointer.com.br/oauth' },
  { id: 'caixa_id', nome: 'Caixa Econômica Federal', logo: 'https://logo.clearbit.com/caixa.gov.br', auth_endpoint: 'https://login.caixa.gov.br/oauth' },
  { id: 'xp_id', nome: 'XP Investimentos / Cartão XP', logo: 'https://logo.clearbit.com/xpi.com.br', auth_endpoint: 'https://auth.xpi.com.br/oauth' },
  { id: 'btg_id', nome: 'BTG Pactual / BTG Banking', logo: 'https://logo.clearbit.com/btgpactual.com', auth_endpoint: 'https://auth.btgpactual.com/oauth' },
  { id: 'santander_id', nome: 'Santander / Cartões Way', logo: 'https://logo.clearbit.com/santander.com.br', auth_endpoint: 'https://auth.santander.com.br/oauth' },
  { id: 'bradesco_id', nome: 'Bradesco / Bradescard', logo: 'https://logo.clearbit.com/bradesco.com.br', auth_endpoint: 'https://auth.bradesco.com.br/oauth' },
];

export class OpenFinanceService {
  // 1. Geração de PKCE (Segurança FAPI para Web)
  static generatePKCE() {
    const verifier = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const challenge = btoa(verifier); 
    const state = Math.random().toString(36).substring(7);
    return { verifier, challenge, state };
  }

  // 2. Normalização de Transação OFB para Modelo Gasto
  static mapOFBTransactionToGasto(tx: any, connectionId: string, bancoNome: string): Gasto {
    const { categoria, confidence } = this.categorize(tx.description, tx.merchantName);
    
    return {
      id: tx.transactionId || Math.random().toString(36).substring(7),
      tipo: tx.amount < 0 ? 'receita' : 'despesa',
      descricao: tx.description,
      data: tx.bookingDate,
      local: tx.merchantName || '',
      valor: Math.abs(tx.amount),
      categoria: categoria,
      parcelado: tx.isInstallment || false,
      recorrente: false,
      numeroParcela: tx.currentInstallment || null,
      totalParcelas: tx.totalInstallments || null,
      origem: 'open_finance',
      fonteArquivo: 'banco',
      confiancaCategoria: confidence > 0.8 ? 'alta' : (confidence > 0.5 ? 'media' : 'baixa'),
      bancoNome: bancoNome
    };
  }

  // 3. Motor de Categorização (Regras OFB)
  private static categorize(desc: string, merchant?: string): { categoria: Categoria, confidence: number } {
    const text = (desc + ' ' + (merchant || '')).toUpperCase();
    
    if (text.includes('POSTO') || text.includes('UBER') || text.includes('99APP') || text.includes('GASOLINA')) 
      return { categoria: Categoria.TRANSPORTE, confidence: 0.95 };
    
    if (text.includes('IFOOD') || text.includes('MCDONALD') || text.includes('MERCADO') || text.includes('REDE') || text.includes('PADARIA')) 
      return { categoria: Categoria.ALIMENTACAO, confidence: 0.9 };

    if (text.includes('FARMACIA') || text.includes('DRUGS') || text.includes('SAUDE') || text.includes('HOSP') || text.includes('LAB')) 
      return { categoria: Categoria.SAUDE, confidence: 0.9 };

    if (text.includes('ALUGUEL') || text.includes('CONDOMINIO') || text.includes('LUZ') || text.includes('ENEL') || text.includes('SABESP')) 
      return { categoria: Categoria.CASA, confidence: 0.9 };

    if (text.includes('INVEST') || text.includes('CDB') || text.includes('TESOURO') || text.includes('XP ') || text.includes('BTG ') || text.includes('PROVENTOS')) 
      return { categoria: Categoria.INVESTIMENTOS, confidence: 0.9 };

    if (text.includes('NETFLIX') || text.includes('SPOTIFY') || text.includes('CINEMA') || text.includes('PLAYSTATION') || text.includes('STEAM')) 
      return { categoria: Categoria.LAZER, confidence: 0.9 };

    return { categoria: Categoria.PESSOAIS, confidence: 0.2 };
  }

  // 4. Simulação de Fetch de Dados (Resource Server)
  static async fetchTransactions(connectionId: string) {
    await new Promise(r => setTimeout(r, 1500));
    
    // Gerar dados mockados variados para demonstrar a sincronização
    return [
      {
        transactionId: `ofb-tx-${Math.random().toString(36).substr(2, 5)}`,
        bookingDate: new Date().toISOString().split('T')[0],
        amount: (Math.random() * 200 + 50).toFixed(2),
        description: "POSTO DE GASOLINA LTDA",
        merchantName: "Posto Shell",
        isInstallment: false
      },
      {
        transactionId: `ofb-tx-${Math.random().toString(36).substr(2, 5)}`,
        bookingDate: new Date().toISOString().split('T')[0],
        amount: (Math.random() * 100 + 20).toFixed(2),
        description: "IFOOD *RESTAURANTE",
        merchantName: "iFood Delivery",
        isInstallment: false
      }
    ];
  }
}


import { GoogleGenAI, Type } from "@google/genai";

export const extractFromPDF = async (base64Data: string): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64Data,
            },
          },
          {
            text: `Você é um especialista em análise de faturas bancárias e de cartões de crédito.
            Sua tarefa é extrair uma lista rigorosa de transações do PDF fornecido.
            
            Regras de Extração:
            1. CAMPOS OBRIGATÓRIOS: Data da transação (YYYY-MM-DD), descrição e valor numérico.
            2. FILTRO DE TRANSAÇÕES: Extraia apenas compras, serviços, créditos e débitos reais. 
            3. O QUE IGNORAR: Pagamentos de fatura feitos pelo usuário, saldos anteriores, encargos de juros, IOF (se preferir focar em gastos), totais de fatura e avisos informativos.
            4. SINALIZAÇÃO DE VALORES: 
               - Compras e gastos devem ser números POSITIVOS (ex: 150.00).
               - Estornos, créditos ou pagamentos recebidos devem ser números NEGATIVOS (ex: -50.00).
            5. TRATAMENTO DE PARCELAS: Se houver texto como "01/10" ou "1 de 5", extraia o número da parcela atual e o total.
            6. IDIOMA: Os dados estão em Português do Brasil.
            
            Retorne exclusivamente um array JSON de objetos.`
          }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              data: { type: Type.STRING, description: "Data no formato YYYY-MM-DD" },
              descricao: { type: Type.STRING },
              local: { type: Type.STRING },
              valor: { type: Type.NUMBER, description: "Valor numérico (positivo para gastos, negativo para créditos)" },
              numeroParcela: { type: Type.NUMBER, nullable: true },
              totalParcelas: { type: Type.NUMBER, nullable: true },
            },
            required: ["data", "descricao", "valor"],
            propertyOrdering: ["data", "descricao", "local", "valor", "numeroParcela", "totalParcelas"]
          }
        }
      }
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error("A IA retornou uma resposta vazia. Verifique se o PDF contém texto legível.");
    }

    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      return data;
    }
    
    return [];
  } catch (e: any) {
    console.error("Erro na extração PlanejAI (Gemini):", e);
    
    const errorMessage = e.message || "";

    if (errorMessage.includes("SAFETY") || errorMessage.includes("blocked")) {
      throw new Error("O conteúdo do PDF foi bloqueado pelos filtros de segurança. Tente uma fatura sem dados excessivamente sensíveis ou em formato CSV.");
    }

    // Mensagem específica solicitada sobre arquivos protegidos por senha
    throw new Error(
      "Não foi possível ler este PDF. Isso geralmente acontece quando o arquivo está PROTEGIDO POR SENHA.\n\n" +
      "O PlanejAI não consegue abrir arquivos criptografados. Por favor, remova a senha da sua fatura em um site como o 'ilovepdf.com/pt/desbloquear-pdf' e tente enviar o arquivo desbloqueado."
    );
  }
};


import { GoogleGenAI } from "@google/genai";

// Serviço de Inteligência Logística SST - Grupo Newcom
export const getAIAnalysis = async (items: any[], prompt: string) => {
  // Inicializando a IA com a chave de ambiente e parâmetros corretos
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Consolidação dos dados para contexto da IA
  const inventoryContext = items
    .map(item => `[${item.code}] ${item.description}: ${item.entry - item.exit} unidades (Mín: ${item.minStock})`)
    .join("\n");

  const systemInstruction = `Você é o Cérebro Logístico do Grupo Newcom SST. 
  Sua função é auxiliar operadores de Segurança do Trabalho a gerir o inventário de sinalização industrial (NR-26).
  
  CONTEXTO DO INVENTÁRIO ATUAL:
  ${inventoryContext}
  
  SUAS DIRETRIZES:
  1. Identifique itens que estão abaixo do nível crítico imediatamente.
  2. Responda dúvidas técnicas sobre NR-26 (ex: cores de segurança, significados de formas).
  3. Sugira ordens de reposição baseadas nos saldos atuais.
  4. Mantenha um tom profissional, técnico e de autoridade.
  5. Se o usuário perguntar algo fora do contexto SST/Logística Newcom, direcione-o gentilmente de volta ao foco.
  6. Respostas concisas e em português do Brasil.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3, // Baixa temperatura para respostas mais precisas e técnicas
      },
    });

    return response.text || "Não foi possível gerar uma análise no momento.";
  } catch (error) {
    console.error("Newcom AI Integration Error:", error);
    return "Falha na conexão com o sistema central da Newcom IA. Por favor, verifique sua conexão ou tente novamente.";
  }
};

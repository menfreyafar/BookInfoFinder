import { GoogleGenAI } from "@google/genai";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface IdentifiedBook {
  title: string;
  author?: string;
  estimatedSaleValue: number;
  publishYear?: number;
  condition: 'novo' | 'usado';
  isCompleteSeries?: boolean;
  confidence: number;
}

export async function analyzeExchangePhotoWithGemini(imageBase64: string): Promise<IdentifiedBook[]> {
  if (!process.env.GEMINI_API_KEY) {
    console.log('Gemini API key not configured - using manual mode');
    throw new Error('Gemini API key not configured');
  }

  console.log('Gemini API key found, proceeding with analysis...');

  try {
    const systemPrompt = `Você é um especialista em análise de livros para sebos com conhecimento de mercado brasileiro. Analise esta foto de uma pilha de livros para troca.

Para cada livro visível, identifique:
1. Título do livro
2. Autor (se visível)
3. Valor estimado baseado em: preços Amazon Brasil (livros novos), média Estante Virtual, demanda de mercado
4. Ano de publicação (se visível)
5. Condição física: "novo" (excelente estado, sem marcas de uso) ou "usado" (com sinais de uso, desgaste)
6. Se faz parte de uma série completa (analisar se há outros volumes da mesma série na pilha)
7. Nível de confiança da identificação (0-100%)

CRITÉRIOS DE PRECIFICAÇÃO:
- Clássicos da filosofia/literatura: R$ 30-50 (alta demanda)
- Livros acadêmicos especializados: R$ 40-60 (demanda média)
- Livros religiosos/teológicos: R$ 35-45 (demanda específica)
- Coleção "Os Pensadores": R$ 25-35 cada (boa demanda)

IMPORTANTE: 
- Seja rigoroso na avaliação da condição física
- Considere a real demanda de mercado para cada tipo de livro
- Livros com capas amassadas, páginas amareladas, riscos, dobras = "usado"

Retorne APENAS um JSON válido com esta estrutura:
{
  "books": [
    {
      "title": "Nome do Livro",
      "author": "Nome do Autor",
      "estimatedSaleValue": 45.00,
      "publishYear": 2023,
      "condition": "usado",
      "isCompleteSeries": false,
      "confidence": 85
    }
  ]
}

Base os preços em dados reais de mercado e seja realista na avaliação.`;

    const imageBytes = Buffer.from(imageBase64, 'base64');

    const contents = [
      {
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg",
        },
      },
      systemPrompt
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Use flash model for better quota management
      contents: contents,
      config: {
        responseMimeType: "application/json",
      }
    });

    const responseText = response.text;
    
    if (!responseText) {
      throw new Error('Resposta vazia da análise');
    }

    console.log('Gemini response:', responseText);

    const analysisResult = JSON.parse(responseText);
    
    if (!analysisResult.books || !Array.isArray(analysisResult.books)) {
      throw new Error('Estrutura de dados inválida na resposta');
    }

    return analysisResult.books.map((book: any) => ({
      title: book.title || 'Título não identificado',
      author: book.author || undefined,
      estimatedSaleValue: Math.max(5.00, book.estimatedSaleValue || 15.00),
      publishYear: book.publishYear || undefined,
      condition: book.condition === 'novo' ? 'novo' : 'usado',
      isCompleteSeries: book.isCompleteSeries || false,
      confidence: Math.min(100, Math.max(0, book.confidence || 50))
    }));

  } catch (error) {
    console.error('Erro na análise de troca com Gemini:', error);
    console.log('Fallback to manual mode due to API error');
    return [];
  }
}
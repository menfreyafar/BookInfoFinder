import OpenAI from 'openai';
import { calculateTradeValue } from './tradeCalculator';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'placeholder',
});

interface IdentifiedBook {
  title: string;
  author?: string;
  estimatedSaleValue: number;
  publishYear?: number;
  condition: 'novo' | 'usado';
  isCompleteSeries?: boolean;
  confidence: number;
}

export async function analyzeExchangePhoto(imageBase64: string): Promise<IdentifiedBook[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is required for book analysis');
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analise esta foto de uma pilha de livros para troca. Para cada livro visível, identifique:

1. Título do livro
2. Autor (se visível)
3. Valor estimado de venda no mercado brasileiro (em R$)
4. Ano de publicação (se visível)
5. Condição física (novo ou usado)
6. Se faz parte de uma série completa (analisar se há outros volumes da mesma série na pilha)
7. Nível de confiança da identificação (0-100%)

Retorne os dados em formato JSON com esta estrutura:
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

Seja preciso com os valores de mercado brasileiro e considere:
- Livros acadêmicos e técnicos têm valores mais altos
- Livros populares/ficção têm valores moderados
- Condição física afeta diretamente o valor
- Edições especiais ou primeiras edições valem mais`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Não foi possível analisar a imagem');
    }

    try {
      const analysisResult = JSON.parse(content);
      return analysisResult.books || [];
    } catch (parseError) {
      console.error('Erro ao fazer parse do resultado da análise:', parseError);
      throw new Error('Erro ao processar a análise da imagem');
    }

  } catch (error) {
    console.error('Erro na análise de troca:', error);
    throw new Error('Falha ao analisar a foto dos livros');
  }
}

export function calculateBulkTradeValue(books: IdentifiedBook[]) {
  const calculations = books.map(book => {
    const calculation = calculateTradeValue({
      estimatedSaleValue: book.estimatedSaleValue,
      publishYear: book.publishYear,
      isCompleteSeries: book.isCompleteSeries,
      condition: book.condition
    });

    return {
      book,
      calculation
    };
  });

  const totalTradeValue = calculations.reduce((sum, item) => sum + item.calculation.finalTradeValue, 0);

  return {
    books: calculations,
    totalTradeValue,
    bookCount: books.length
  };
}

export function generateTradeExplanation(books: IdentifiedBook[]) {
  let explanation = `Análise de Troca - ${books.length} livros identificados:\n\n`;
  
  books.forEach((book, index) => {
    const calc = calculateTradeValue({
      estimatedSaleValue: book.estimatedSaleValue,
      publishYear: book.publishYear,
      isCompleteSeries: book.isCompleteSeries,
      condition: book.condition
    });

    explanation += `${index + 1}. ${book.title}${book.author ? ` - ${book.author}` : ''}\n`;
    explanation += `   • Valor estimado: R$ ${book.estimatedSaleValue.toFixed(2)}\n`;
    explanation += `   • Condição: ${book.condition}\n`;
    if (book.publishYear) {
      explanation += `   • Ano: ${book.publishYear}\n`;
    }
    if (book.isCompleteSeries) {
      explanation += `   • Série completa detectada\n`;
    }
    explanation += `   • Percentual aplicado: ${calc.finalPercentage}%\n`;
    explanation += `   • Valor de troca: R$ ${calc.finalTradeValue.toFixed(2)}\n`;
    explanation += `   • Confiança: ${book.confidence}%\n\n`;
  });

  const totalValue = books.reduce((sum, book) => {
    const calc = calculateTradeValue({
      estimatedSaleValue: book.estimatedSaleValue,
      publishYear: book.publishYear,
      isCompleteSeries: book.isCompleteSeries,
      condition: book.condition
    });
    return sum + calc.finalTradeValue;
  }, 0);

  explanation += `TOTAL DA TROCA: R$ ${totalValue.toFixed(2)}`;

  return explanation;
}
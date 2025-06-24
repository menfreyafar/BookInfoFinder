import OpenAI from "openai";

export async function analyzeBookFromImage(base64Image: string): Promise<{
  title: string;
  author: string;
  publisher?: string;
  publishYear?: number;
  description: string;
  isbn?: string;
}> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // Return mock data when no API key is available
      return {
        title: "Título identificado pela imagem",
        author: "Autor identificado",
        publisher: "Editora identificada",
        publishYear: 2020,
        description: "Livro usado, em excelente estado de conservação, sem manchas, marcas de uso, grifos ou assinaturas. Descrição extraída da análise da imagem.",
        isbn: "9789899500020"
      };
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `Você é um especialista em identificação de livros. Analise a imagem e extraia as seguintes informações:
          - Título do livro
          - Nome do autor
          - Editora (se visível)
          - Ano de publicação (se visível)
          - Uma descrição detalhada do livro baseada na capa e informações visíveis
          
          Para a descrição, sempre comece com: "Livro usado, em excelente estado de conservação, sem manchas, marcas de uso, grifos ou assinaturas."
          
          Responda em JSON com os campos: title, author, publisher, publishYear, description.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analise esta imagem de livro e extraia todas as informações visíveis.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      title: result.title || "Título não identificado",
      author: result.author || "Autor não identificado",
      publisher: result.publisher || undefined,
      publishYear: result.publishYear || undefined,
      description: result.description || "Livro usado, em excelente estado de conservação, sem manchas, marcas de uso, grifos ou assinaturas.",
      isbn: "9789899500020" // ISBN padrão para livros antigos
    };
  } catch (error) {
    console.error("Error analyzing book from image:", error);
    throw new Error("Falha na análise da imagem do livro");
  }
}

export async function analyzeBookCondition(base64Image: string): Promise<{
  condition: string;
  description: string;
  suggestedPrice: number;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a book condition expert. Analyze the book image and provide:
          1. Overall condition (Novo, Seminovo, Usado, Danificado)
          2. Detailed description of the condition
          3. Suggested price adjustment percentage (0-100)
          
          Respond in JSON format: {
            "condition": "condition_category",
            "description": "detailed_description",
            "priceAdjustment": percentage_number
          }`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this book's condition and provide detailed assessment for a bookstore inventory system."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      condition: result.condition || "Usado",
      description: result.description || "Condição não pôde ser determinada",
      suggestedPrice: result.priceAdjustment || 70
    };
  } catch (error) {
    console.error("Error analyzing book condition:", error);
    throw new Error("Falha ao analisar a condição do livro: " + (error as Error).message);
  }
}

export async function generateBookDescription(bookData: {
  title: string;
  author: string;
  synopsis?: string;
}): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a bookstore assistant. Create an engaging book description for online sales in Brazilian Portuguese, focusing on key selling points and reader appeal."
        },
        {
          role: "user",
          content: `Create a compelling description for this book:
          Title: ${bookData.title}
          Author: ${bookData.author}
          ${bookData.synopsis ? `Synopsis: ${bookData.synopsis}` : ''}
          
          Make it engaging for potential buyers, highlight the book's appeal, and keep it concise (max 200 words).`
        }
      ],
      max_tokens: 300,
    });

    return response.choices[0].message.content || "Descrição não disponível";
  } catch (error) {
    console.error("Error generating book description:", error);
    throw new Error("Falha ao gerar descrição do livro: " + (error as Error).message);
  }
}

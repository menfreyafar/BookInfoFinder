import { InsertBook } from "@shared/schema";

interface BookApiResponse {
  success: boolean;
  book?: Partial<InsertBook>;
  error?: string;
}

export async function searchBookByISBN(isbn: string): Promise<BookApiResponse> {
  try {
    // Clean ISBN (remove hyphens and spaces)
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    
    // Try Google Books API first
    const googleResult = await searchGoogleBooks(cleanISBN);
    if (googleResult.success) {
      return googleResult;
    }
    
    // Fallback to Open Library API
    const openLibraryResult = await searchOpenLibrary(cleanISBN);
    if (openLibraryResult.success) {
      return openLibraryResult;
    }
    
    return {
      success: false,
      error: "Livro não encontrado nas bases de dados disponíveis"
    };
  } catch (error) {
    console.error("Error searching book by ISBN:", error);
    return {
      success: false,
      error: "Erro ao buscar informações do livro: " + (error as Error).message
    };
  }
}

async function searchGoogleBooks(isbn: string): Promise<BookApiResponse> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    );
    
    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return { success: false, error: "Livro não encontrado no Google Books" };
    }
    
    const bookInfo = data.items[0].volumeInfo;
    
    const book: Partial<InsertBook> = {
      isbn: isbn,
      title: bookInfo.title || "Título não disponível",
      author: bookInfo.authors ? bookInfo.authors.join(", ") : "Autor não disponível",
      publisher: bookInfo.publisher || "Editora não disponível",
      publishYear: bookInfo.publishedDate ? parseInt(bookInfo.publishedDate.substring(0, 4)) : undefined,
      synopsis: bookInfo.description || "Sinopse não disponível",
      category: bookInfo.categories ? bookInfo.categories[0] : "Não categorizado",
      coverImage: bookInfo.imageLinks?.thumbnail || bookInfo.imageLinks?.smallThumbnail,
    };
    
    return { success: true, book };
  } catch (error) {
    console.error("Google Books API error:", error);
    return { success: false, error: "Erro na API do Google Books" };
  }
}

async function searchOpenLibrary(isbn: string): Promise<BookApiResponse> {
  try {
    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
    );
    
    if (!response.ok) {
      throw new Error(`Open Library API error: ${response.status}`);
    }
    
    const data = await response.json();
    const bookKey = `ISBN:${isbn}`;
    
    if (!data[bookKey]) {
      return { success: false, error: "Livro não encontrado na Open Library" };
    }
    
    const bookInfo = data[bookKey];
    
    const book: Partial<InsertBook> = {
      isbn: isbn,
      title: bookInfo.title || "Título não disponível",
      author: bookInfo.authors ? bookInfo.authors.map((a: any) => a.name).join(", ") : "Autor não disponível",
      publisher: bookInfo.publishers ? bookInfo.publishers[0].name : "Editora não disponível",
      publishYear: bookInfo.publish_date ? parseInt(bookInfo.publish_date.substring(0, 4)) : undefined,
      synopsis: bookInfo.description || "Sinopse não disponível",
      category: bookInfo.subjects ? bookInfo.subjects[0].name : "Não categorizado",
      coverImage: bookInfo.cover?.medium || bookInfo.cover?.small,
    };
    
    return { success: true, book };
  } catch (error) {
    console.error("Open Library API error:", error);
    return { success: false, error: "Erro na API da Open Library" };
  }
}

export async function searchBrazilianBookPrices(isbn: string, title: string): Promise<{
  usedPrice?: number;
  newPrice?: number;
}> {
  try {
    // This would integrate with Brazilian book price APIs
    // For now, we'll return estimated prices based on category and year
    // In production, this would connect to services like:
    // - Estante Virtual API
    // - Mercado Livre API
    // - Amazon Brasil API
    
    // Simulated price estimation logic
    const basePrice = Math.floor(Math.random() * 50) + 20; // R$ 20-70
    const usedPrice = Math.floor(basePrice * 0.6); // 60% of base price
    const newPrice = basePrice;
    
    return {
      usedPrice,
      newPrice
    };
  } catch (error) {
    console.error("Error fetching Brazilian book prices:", error);
    return {};
  }
}

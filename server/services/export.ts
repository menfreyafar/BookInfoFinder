import * as XLSX from 'xlsx';
import { BookWithInventory } from "@shared/schema";

export interface EstanteVirtualExport {
  ISBN: string;
  Titulo: string;
  Autor: string;
  Editora: string;
  Ano: string;
  Edicao: string;
  Categoria: string;
  Preco: string;
  Quantidade: string;
  Condicao: string;
  Descricao: string;
  Peso: string;
}

export function formatBooksForEstanteVirtual(books: BookWithInventory[]): EstanteVirtualExport[] {
  return books.map(book => ({
    ISBN: book.isbn || "",
    Titulo: book.title,
    Autor: book.author,
    Editora: book.publisher || "",
    Ano: book.publishYear?.toString() || "",
    Edicao: book.edition || "",
    Categoria: book.category || "",
    Preco: book.usedPrice?.toString() || "",
    Quantidade: book.inventory?.quantity?.toString() || "0",
    Condicao: book.condition || "Usado",
    Descricao: book.synopsis || "",
    Peso: book.weight?.toString() || ""
  }));
}

export function generateExcelFile(data: EstanteVirtualExport[]): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  
  XLSX.utils.book_append_sheet(workbook, worksheet, "Livros");
  
  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

export function generateCSVFile(data: EstanteVirtualExport[]): string {
  const headers = Object.keys(data[0] || {});
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header as keyof EstanteVirtualExport];
      // Escape commas and quotes in CSV
      return `"${value.replace(/"/g, '""')}"`;
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
}

export interface SalesReport {
  date: string;
  totalSales: number;
  totalRevenue: number;
  topBooks: {
    title: string;
    author: string;
    quantity: number;
    revenue: number;
  }[];
}

export function generateSalesReport(sales: any[], startDate: Date, endDate: Date): SalesReport {
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount || "0"), 0);
  
  // Aggregate book sales
  const bookSales = new Map<number, {
    title: string;
    author: string;
    quantity: number;
    revenue: number;
  }>();
  
  sales.forEach(sale => {
    sale.items.forEach((item: any) => {
      const existing = bookSales.get(item.bookId) || {
        title: item.book.title,
        author: item.book.author,
        quantity: 0,
        revenue: 0
      };
      
      bookSales.set(item.bookId, {
        ...existing,
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + parseFloat(item.totalPrice || "0")
      });
    });
  });
  
  const topBooks = Array.from(bookSales.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  
  return {
    date: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
    totalSales,
    totalRevenue,
    topBooks
  };
}

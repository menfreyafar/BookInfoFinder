import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchBookByISBN, searchBrazilianBookPrices } from "./services/bookApi";
import { analyzeBookFromImage, analyzeBookCondition, generateBookDescription } from "./services/openai";
import { analyzeExchangePhoto, calculateBulkTradeValue, generateTradeExplanation } from "./services/exchangeAnalysis";
import { calculateTradeValue } from "./services/tradeCalculator";
import { formatBooksForEstanteVirtual, generateExcelFile, generateCSVFile, generateSalesReport } from "./services/export";
import { estanteVirtualService } from "./services/estanteVirtual";
import { uploadTemplate, generateCustomPDF, getTemplateInfo, saveCustomLayout, generateCustomLayoutPDF } from "./routes/templates";
import { orderImporterService } from "./services/orderImporter";
import { dailyExportScheduler } from "./services/scheduler";
import { insertBookSchema, insertInventorySchema, insertSaleSchema, insertSaleItemSchema, insertSettingsSchema, insertExchangeSchema, insertExchangeItemSchema, insertExchangeGivenBookSchema, insertPreCatalogBookSchema, insertCustomerRequestSchema, insertShelfSchema, insertCustomerSchema } from "@shared/schema";
import { db } from "./db";
import { books, inventory, shelves, customerRequests, customers } from "@shared/schema";
import { eq, like, and, or, desc, asc } from "drizzle-orm";
import PDFDocument from 'pdfkit';
import { z } from "zod";
import multer from "multer";
import { generateBookBookmark } from "./routes/bookmarks";
import { generateDemoStoragePDF } from "./routes/demo";
import { createShelf, getAllShelves, updateShelf, deleteShelf } from "./routes/shelves";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Dashboard Stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas do dashboard" });
    }
  });

  // Books
  app.get("/api/books", async (req, res) => {
    try {
      const books = await storage.getAllBooks();
      res.json(books);
    } catch (error) {
      console.error("Error fetching books:", error);
      res.status(500).json({ error: "Erro ao buscar livros" });
    }
  });

  app.get("/api/books/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Parâmetro de busca é obrigatório" });
      }
      
      const books = await storage.searchBooks(q);
      res.json(books);
    } catch (error) {
      console.error("Error searching books:", error);
      res.status(500).json({ error: "Erro ao buscar livros" });
    }
  });

  app.get("/api/books/smart-search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Parâmetro de busca é obrigatório" });
      }
      
      const books = await storage.smartSearchBooks(q);
      res.json(books);
    } catch (error) {
      console.error("Error in smart search:", error);
      res.status(500).json({ error: "Erro na busca inteligente" });
    }
  });

  app.get("/api/books/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const book = await storage.getBook(id);
      
      if (!book) {
        return res.status(404).json({ error: "Livro não encontrado" });
      }
      
      res.json(book);
    } catch (error) {
      console.error("Error fetching book:", error);
      res.status(500).json({ error: "Erro ao buscar livro" });
    }
  });

  app.post("/api/books", async (req, res) => {
    try {
      const validatedData = insertBookSchema.parse(req.body);
      
      // Generate unique code
      const year = new Date().getFullYear();
      const tempId = Date.now();
      const uniqueCode = `LU-${tempId}-${year}`;
      
      const book = await storage.createBook({
        ...validatedData,
        uniqueCode,
        isStored: false
      });
      
      // Update unique code with real ID
      const finalUniqueCode = `LU-${book.id}-${year}`;
      const { sqlite } = await import("../server/db");
      sqlite.prepare('UPDATE books SET unique_code = ? WHERE id = ?').run(finalUniqueCode, book.id);
      
      // Create inventory entry if quantity is provided
      if (req.body.quantity !== undefined) {
        await storage.createInventory({
          bookId: book.id,
          quantity: req.body.quantity,
          location: req.body.location || "",
          status: "available"
        });
      }
      
      res.status(201).json({ ...book, uniqueCode: finalUniqueCode });
    } catch (error) {
      console.error("Error creating book:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Erro ao criar livro" });
    }
  });

  app.put("/api/books/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertBookSchema.partial().parse(req.body);
      
      const book = await storage.updateBook(id, validatedData);
      
      if (!book) {
        return res.status(404).json({ error: "Livro não encontrado" });
      }
      
      res.json(book);
    } catch (error) {
      console.error("Error updating book:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Erro ao atualizar livro" });
    }
  });

  app.delete("/api/books/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteBook(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Livro não encontrado" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting book:", error);
      res.status(500).json({ error: "Erro ao deletar livro" });
    }
  });

  // ISBN Search
  app.get("/api/isbn/:isbn", async (req, res) => {
    try {
      const { isbn } = req.params;
      
      // Check if book already exists
      const existingBook = await storage.getBookByISBN(isbn);
      if (existingBook) {
        return res.json({ 
          success: true, 
          book: existingBook, 
          exists: true 
        });
      }
      
      // Search external APIs
      const apiResult = await searchBookByISBN(isbn);
      
      if (!apiResult.success) {
        return res.status(404).json({ 
          success: false, 
          error: apiResult.error 
        });
      }
      
      // Get Brazilian pricing if available
      const prices = await searchBrazilianBookPrices(isbn, apiResult.book?.title || "");
      
      const bookData = {
        ...apiResult.book,
        usedPrice: prices.usedPrice?.toString(),
        newPrice: prices.newPrice?.toString()
      };
      
      res.json({ 
        success: true, 
        book: bookData, 
        exists: false 
      });
    } catch (error) {
      console.error("Error searching ISBN:", error);
      res.status(500).json({ 
        success: false, 
        error: "Erro ao buscar ISBN" 
      });
    }
  });

  // Image Analysis
  app.post("/api/analyze-image", upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Imagem é obrigatória" });
      }
      
      const base64Image = req.file.buffer.toString('base64');
      const analysis = await analyzeBookCondition(base64Image);
      
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing image:", error);
      res.status(500).json({ error: "Erro ao analisar imagem" });
    }
  });

  // Inventory
  app.get("/api/inventory/low-stock", async (req, res) => {
    try {
      const threshold = parseInt(req.query.threshold as string) || 5;
      const books = await storage.getLowStockBooks(threshold);
      res.json(books);
    } catch (error) {
      console.error("Error fetching low stock books:", error);
      res.status(500).json({ error: "Erro ao buscar livros com estoque baixo" });
    }
  });

  app.put("/api/inventory/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertInventorySchema.partial().parse(req.body);
      
      const inventory = await storage.updateInventory(id, validatedData);
      
      if (!inventory) {
        return res.status(404).json({ error: "Estoque não encontrado" });
      }
      
      res.json(inventory);
    } catch (error) {
      console.error("Error updating inventory:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Erro ao atualizar estoque" });
    }
  });

  // Sales
  app.post("/api/sales", async (req, res) => {
    try {
      const { sale, items } = req.body;
      
      // Validation: Check if total amount is greater than zero
      if (!sale.totalAmount || sale.totalAmount <= 0) {
        return res.status(400).json({ 
          error: "Valor total da venda deve ser maior que zero" 
        });
      }

      // Validation: Check if items exist and have valid quantities
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ 
          error: "Pelo menos um item deve ser incluído na venda" 
        });
      }

      // Calculate subtotal from items
      const subtotal = items.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);
      const discountAmount = sale.discountAmount || 0;
      const finalTotal = subtotal - discountAmount;

      // Validation: Final total must be positive
      if (finalTotal <= 0) {
        return res.status(400).json({ 
          error: "Valor final da venda deve ser maior que zero após aplicar desconto" 
        });
      }

      // Prepare sale data with discount information
      const saleWithDiscount = {
        ...sale,
        subtotalAmount: subtotal,
        discountAmount: discountAmount,
        totalAmount: finalTotal
      };
      
      const validatedSale = insertSaleSchema.parse(saleWithDiscount);
      // Remove saleId validation since it's added automatically in createSale
      const validatedItems = items.map((item: any) => {
        const { saleId, ...itemWithoutSaleId } = item;
        return insertSaleItemSchema.parse(itemWithoutSaleId);
      });
      
      const newSale = await storage.createSale(validatedSale, validatedItems);
      
      // Update inventory quantities and sync with Estante Virtual
      for (const item of validatedItems) {
        const inventory = await storage.getInventory(item.bookId);
        if (inventory) {
          const newQuantity = Math.max(0, inventory.quantity - item.quantity);
          
          await storage.updateInventory(inventory.id, {
            quantity: newQuantity
          });
          
          // Sync with Estante Virtual if book is listed there
          if (inventory.estanteVirtualId && inventory.sentToEstanteVirtual) {
            try {
              if (newQuantity === 0) {
                // Remove book from Estante Virtual if no stock left
                const removeResult = await estanteVirtualService.removeBook(inventory.estanteVirtualId);
                if (removeResult.success) {
                  console.log(`Livro removido da Estante Virtual: ${inventory.estanteVirtualId}`);
                  await storage.updateInventory(inventory.id, {
                    sentToEstanteVirtual: false,
                    estanteVirtualId: null
                  });
                }
              } else {
                // Update quantity in Estante Virtual
                const updateResult = await estanteVirtualService.updateBookQuantity(inventory.estanteVirtualId, newQuantity);
                if (updateResult.success) {
                  console.log(`Quantidade atualizada na Estante Virtual: ${inventory.estanteVirtualId} - ${newQuantity} unidades`);
                }
              }
            } catch (syncError) {
              console.error(`Erro ao sincronizar com Estante Virtual para livro ${item.bookId}:`, syncError);
              // Don't fail the sale if Estante Virtual sync fails
            }
          }
        }
      }
      
      res.status(201).json(newSale);
    } catch (error) {
      console.error("Error creating sale:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Erro ao criar venda" });
    }
  });

  app.get("/api/sales", async (req, res) => {
    try {
      const sales = await storage.getAllSales();
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ error: "Erro ao buscar vendas" });
    }
  });

  app.get("/api/sales/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sale = await storage.getSale(id);
      
      if (!sale) {
        return res.status(404).json({ error: "Venda não encontrada" });
      }
      
      res.json(sale);
    } catch (error) {
      console.error("Error fetching sale:", error);
      res.status(500).json({ error: "Erro ao buscar venda" });
    }
  });

  // Export
  app.get("/api/export/estante-virtual", async (req, res) => {
    try {
      const books = await storage.getBooksNotInEstanteVirtual();
      const exportData = formatBooksForEstanteVirtual(books);
      
      const format = req.query.format as string || 'xlsx';
      
      if (format === 'csv') {
        const csvData = generateCSVFile(exportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=estante-virtual.csv');
        res.send(csvData);
      } else {
        const excelBuffer = generateExcelFile(exportData);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=estante-virtual.xlsx');
        res.send(excelBuffer);
      }
    } catch (error) {
      console.error("Error exporting to Estante Virtual:", error);
      res.status(500).json({ error: "Erro ao exportar para Estante Virtual" });
    }
  });

  app.get("/api/export/sales-report", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Datas de início e fim são obrigatórias" });
      }
      
      const sales = await storage.getSalesByDateRange(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      const report = generateSalesReport(
        sales,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json(report);
    } catch (error) {
      console.error("Error generating sales report:", error);
      res.status(500).json({ error: "Erro ao gerar relatório de vendas" });
    }
  });

  app.get("/api/export/by-type", async (req, res) => {
    try {
      const { productType, format, shelf } = req.query;
      
      if (!productType || !format) {
        return res.status(400).json({ error: "Tipo de produto e formato são obrigatórios" });
      }

      let books = await storage.getAllBooks();
      
      // Filter by product type
      books = books.filter(book => book.productType === productType);
      
      // Filter by shelf if provided (for books only)
      if (shelf && productType === "book") {
        books = books.filter(book => book.shelf === shelf);
      }

      const exportData = formatBooksForEstanteVirtual(books);
      
      if (format === "csv") {
        const csvData = generateCSVFile(exportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${productType === "book" ? "livros" : "vinis"}.csv`);
        res.send(csvData);
      } else {
        const excelBuffer = generateExcelFile(exportData);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${productType === "book" ? "livros" : "vinis"}.xlsx`);
        res.send(excelBuffer);
      }
    } catch (error) {
      console.error("Error exporting by type:", error);
      res.status(500).json({ error: "Erro ao exportar por tipo" });
    }
  });

  app.get("/api/export/catalog-pdf", async (req, res) => {
    try {
      const { productType, shelf, category } = req.query;
      
      let books = await storage.getAllBooks();
      
      // Apply filters
      if (productType && productType !== "all") {
        books = books.filter(book => book.productType === productType);
      }
      if (shelf) {
        books = books.filter(book => book.shelf === shelf);
      }
      if (category) {
        books = books.filter(book => book.category === category);
      }

      // Create PDF
      const doc = new PDFDocument({ 
        margin: 40,
        size: 'A4'
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="catalogo-${productType || 'todos'}-${new Date().toISOString().split('T')[0]}.pdf"`);
      
      doc.pipe(res);

      // Header
      doc.fontSize(20).text('Catálogo de Produtos', { align: 'center' });
      doc.fontSize(12).text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
      doc.moveDown(2);

      // Products grid (1 product per page for detailed catalog)
      const pageWidth = doc.page.width - 80; // 40 margin each side
      
      books.forEach((book, index) => {
        if (index > 0) {
          doc.addPage();
        }
        
        const startY = 80;
        let currentY = startY;

        // Product title
        doc.fontSize(18).font('Helvetica-Bold').fillColor('#000000')
           .text(book.title, 40, currentY, {
             width: pageWidth,
             align: 'center'
           });
        currentY += 40;

        // Author
        doc.fontSize(14).font('Helvetica')
           .text(`Por: ${book.author}`, 40, currentY, {
             width: pageWidth,
             align: 'center'
           });
        currentY += 30;

        // Price - prominent display
        const price = book.usedPrice || book.newPrice || 0;
        doc.fontSize(24).font('Helvetica-Bold').fillColor('#dc2626')
           .text(`R$ ${Number(price).toFixed(2)}`, 40, currentY, {
             width: pageWidth,
             align: 'center'
           });
        currentY += 50;

        // Product details in organized sections
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
           .text('DETALHES DO PRODUTO', 40, currentY);
        currentY += 20;

        doc.fontSize(10).font('Helvetica').fillColor('#333333');
        
        if (book.isbn) {
          doc.text(`ISBN: ${book.isbn}`, 40, currentY);
          currentY += 15;
        }
        
        if (book.category) {
          doc.text(`Categoria: ${book.category}`, 40, currentY);
          currentY += 15;
        }
        
        if (book.condition) {
          doc.text(`Condição: ${book.condition}`, 40, currentY);
          currentY += 15;
        }
        
        if (book.publisher) {
          doc.text(`Editora: ${book.publisher}`, 40, currentY);
          currentY += 15;
        }
        
        if (book.publishYear) {
          doc.text(`Ano de Publicação: ${book.publishYear}`, 40, currentY);
          currentY += 15;
        }
        
        if (book.shelf) {
          doc.text(`Localização: Estante ${book.shelf}`, 40, currentY);
          currentY += 15;
        }
        
        if (book.productType) {
          doc.text(`Tipo: ${book.productType === 'book' ? 'Livro' : book.productType === 'vinyl' ? 'Vinil' : 'DVD'}`, 40, currentY);
          currentY += 15;
        }

        currentY += 20;

        // Synopsis section
        if (book.synopsis && book.synopsis.trim()) {
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
             .text('SINOPSE', 40, currentY);
          currentY += 20;
          
          doc.fontSize(10).font('Helvetica').fillColor('#333333')
             .text(book.synopsis, 40, currentY, {
               width: pageWidth,
               align: 'justify',
               lineGap: 3
             });
        }

        // Footer with product info
        doc.fontSize(8).fillColor('#999999').text(
          `Produto #${book.id} | ${book.productType === 'book' ? 'Livro' : book.productType === 'vinyl' ? 'Vinil' : 'DVD'}`,
          40,
          doc.page.height - 50,
          { align: 'left' }
        );
      });

      // Footer
      doc.fontSize(8).fillColor('#999999').text(
        `Total de produtos: ${books.length} | Luar Sebo - Sistema de Gestão`,
        40,
        doc.page.height - 30,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      console.error("Error generating catalog PDF:", error);
      res.status(500).json({ error: "Erro ao gerar catálogo PDF" });
    }
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Erro ao buscar categorias" });
    }
  });

  // Missing Books API - Mostra livros da lista de clássicos que têm menos de 1 em estoque
  app.get("/api/missing-books", async (req, res) => {
    try {
      // Lista de clássicos essenciais (extraída do arquivo fornecido pelo usuário, sem duplicatas)
      const classicBooks = [
        // Literatura Brasileira
        "Dom Casmurro",
        "Memórias Póstumas de Brás Cubas", 
        "O Guarani",
        "Iracema",
        "Vidas Secas",
        "Grande Sertão: Veredas",
        "Capitães da Areia",
        "Gabriela, Cravo e Canela",
        "O Cortiço",
        "Senhora",
        "Macunaíma",
        "A Hora da Estrela",
        "Laços de Família",
        "Auto da Compadecida",
        "Meu Pé de Laranja Lima",
        "São Bernardo",
        "Várias Histórias",
        "Quincas Borba",
        "Lucíola",
        "O Primo Basílio",
        "Alguma Poesia",
        "Ou Isto ou Aquilo",
        "Apontamentos de História Sobrenatural",
        "Contos Gauchescos",
        "O Tempo e o Vento",
        "Fogo Morto",
        "Morte e Vida Severina",
        
        // Literatura Estrangeira
        "Dom Quixote",
        "Os Miseráveis",
        "O Conde de Monte Cristo",
        "Orgulho e Preconceito",
        "Emma",
        "Jane Eyre",
        "O Morro dos Ventos Uivantes",
        "1984",
        "A Revolução dos Bichos",
        "Admirável Mundo Novo",
        "O Pequeno Príncipe",
        "Crime e Castigo",
        "Os Irmãos Karamázov",
        "Guerra e Paz",
        "O Velho e o Mar",
        "O Grande Gatsby",
        "Moby Dick",
        "Frankenstein",
        "Drácula",
        "O Senhor dos Anéis",
        "O Hobbit",
        "As Crônicas de Nárnia",
        "Harry Potter",
        "Hamlet",
        "Romeu e Julieta",
        
        // Filosofia e Pensamento
        "A República",
        "Ética a Nicômaco",
        "Assim Falou Zaratustra",
        "O Mundo de Sofia",
        "Meditações",
        "O Príncipe",
        
        // Infantis
        "Alice no País das Maravilhas",
        "Peter Pan",
        "As Aventuras de Pinóquio",
        "As Aventuras de Tom Sawyer"
      ];

      // Buscar quais desses livros têm estoque menor que 1
      const missingBooks = [];
      
      for (let i = 0; i < classicBooks.length; i++) {
        const bookTitle = classicBooks[i];
        try {
          const books = await storage.searchBooks(bookTitle);
          const totalStock = books.reduce((sum, book) => {
            return sum + (book.inventory?.quantity || 0);
          }, 0);
          
          if (totalStock < 1) {
            missingBooks.push({
              id: i + 1,
              title: bookTitle,
              author: "Diversos",
              isbn: null,
              category: "Clássico",
              priority: 1,
              notes: "Livro clássico essencial - deve sempre ter em estoque",
              createdAt: Date.now(),
              lastChecked: Date.now(),
              currentStock: totalStock
            });
          }
        } catch (error) {
          console.error(`Erro ao buscar livro ${bookTitle}:`, error);
        }
      }
      
      res.json(missingBooks);
    } catch (error) {
      console.error("Error fetching missing books:", error);
      res.status(500).json({ error: "Erro ao buscar livros em falta" });
    }
  });

  app.post("/api/missing-books", async (req, res) => {
    try {
      const Database = require('better-sqlite3');
      const dbPath = require('path').join(process.cwd(), 'database.sqlite');
      const sqlite = new Database(dbPath);
      
      const { title, author, isbn, category, priority, notes } = req.body;
      const stmt = sqlite.prepare(`
        INSERT INTO missing_books (title, author, isbn, category, priority, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(title, author, isbn, category || 'Clássico', priority || 1, notes, Date.now());
      
      const newBook = sqlite.prepare('SELECT * FROM missing_books WHERE id = ?').get(result.lastInsertRowid);
      sqlite.close();
      
      res.json(newBook);
    } catch (error) {
      console.error("Error creating missing book:", error);
      res.status(500).json({ error: "Erro ao criar livro em falta" });
    }
  });

  app.put("/api/missing-books/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const missingBook = await storage.updateMissingBook(id, req.body);
      res.json(missingBook);
    } catch (error) {
      console.error("Error updating missing book:", error);
      res.status(500).json({ error: "Erro ao atualizar livro em falta" });
    }
  });

  app.delete("/api/missing-books/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMissingBook(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting missing book:", error);
      res.status(500).json({ error: "Erro ao deletar livro em falta" });
    }
  });

  // Shelves routes
  app.get("/api/shelves", async (req, res) => {
    try {
      const { sqlite } = await import("../server/db");
      const shelves = sqlite.prepare('SELECT * FROM shelves WHERE is_active = 1 ORDER BY name').all();
      res.json(shelves);
    } catch (error) {
      console.error("Error fetching shelves:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/shelves", async (req, res) => {
    try {
      const { name, description, location, capacity } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Nome da estante é obrigatório" });
      }

      const { sqlite } = await import("../server/db");
      const stmt = sqlite.prepare(`
        INSERT INTO shelves (name, description, location, capacity, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(name, description, location, capacity, Date.now(), Date.now());
      const shelf = sqlite.prepare('SELECT * FROM shelves WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json(shelf);
    } catch (error) {
      console.error("Error creating shelf:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.put("/api/shelves/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, location, capacity } = req.body;

      const { sqlite } = await import("../server/db");
      const stmt = sqlite.prepare(`
        UPDATE shelves SET name = ?, description = ?, location = ?, capacity = ?, updated_at = ?
        WHERE id = ?
      `);
      
      stmt.run(name, description, location, capacity, Date.now(), id);
      const shelf = sqlite.prepare('SELECT * FROM shelves WHERE id = ?').get(id);

      if (!shelf) {
        return res.status(404).json({ error: "Estante não encontrada" });
      }

      res.json(shelf);
    } catch (error) {
      console.error("Error updating shelf:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.delete("/api/shelves/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const { sqlite } = await import("../server/db");
      
      // Check if shelf has books
      const booksCount = sqlite.prepare('SELECT COUNT(*) as count FROM books WHERE shelf = (SELECT name FROM shelves WHERE id = ?)').get(id);
      
      if (booksCount.count > 0) {
        return res.status(400).json({ error: "Não é possível excluir estante com livros" });
      }

      sqlite.prepare('UPDATE shelves SET is_active = 0, updated_at = ? WHERE id = ?').run(Date.now(), id);

      res.json({ message: "Estante removida com sucesso" });
    } catch (error) {
      console.error("Error deleting shelf:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Storage routes
  app.get("/api/storage/pending", async (req, res) => {
    try {
      const { sqlite } = await import("../server/db");
      const books = sqlite.prepare(`
        SELECT 
          b.id, b.title, b.author, b.edition, b.condition, b.shelf, 
          b.unique_code, b.is_stored, b.stored_at, b.created_at,
          i.quantity
        FROM books b
        LEFT JOIN inventory i ON b.id = i.book_id
        WHERE b.is_stored = 0 OR b.is_stored IS NULL
        ORDER BY b.created_at DESC
      `).all();

      res.json(books.map(book => ({
        ...book,
        inventory: book.quantity ? { quantity: book.quantity } : null
      })));
    } catch (error) {
      console.error("Error fetching books for storage:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.patch("/api/storage/mark-stored/:id", async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);

      const { sqlite } = await import("../server/db");
      sqlite.prepare(`
        UPDATE books SET is_stored = 1, stored_at = ?, updated_at = ?
        WHERE id = ?
      `).run(Date.now(), Date.now(), bookId);

      const book = sqlite.prepare('SELECT * FROM books WHERE id = ?').get(bookId);

      if (!book) {
        return res.status(404).json({ error: "Livro não encontrado" });
      }

      res.json(book);
    } catch (error) {
      console.error("Error marking book as stored:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/storage/generate-pdf", async (req, res) => {
    try {
      const { sqlite } = await import("../server/db");
      const books = sqlite.prepare(`
        SELECT 
          b.title, b.author, b.shelf, b.unique_code, b.condition, b.edition,
          b.used_price, b.new_price, b.synopsis, b.publisher,
          i.sent_to_estante_virtual
        FROM books b
        LEFT JOIN inventory i ON b.id = i.book_id
        WHERE b.is_stored = 0 OR b.is_stored IS NULL
        ORDER BY b.shelf, b.title
      `).all();

      // Get store settings and custom template/layout configurations
      const settings = sqlite.prepare('SELECT * FROM settings').all();
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});

      const storeName = settingsMap.default_store_name || settingsMap.store_name || 'Luar Sebo e Livraria';
      const storeSubtitle = settingsMap.brand_subtitle || '';
      
      // Get custom layout and template settings
      const customLayoutElements = settingsMap.custom_layout_elements ? JSON.parse(settingsMap.custom_layout_elements) : null;
      const customTemplateData = settingsMap.custom_template_data || settingsMap.default_template_data;
      const customTemplateName = settingsMap.custom_template_name || settingsMap.default_template_name;

      // Create PDF
      const doc = new PDFDocument({ 
        margin: 30,
        size: 'A4'
      });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="lista-guarda-com-etiquetas.pdf"');
      
      doc.pipe(res);

      // Header for list
      doc.fontSize(18).text('Lista de Livros para Guarda', { align: 'center' });
      doc.fontSize(12).text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
      doc.moveDown(1);

      // Group by shelf
      const groupedByShelf = books.reduce((acc, book) => {
        const shelf = book.shelf || "Sem Estante";
        if (!acc[shelf]) acc[shelf] = [];
        acc[shelf].push(book);
        return acc;
      }, {});

      // List Content
      for (const [shelfName, shelfBooks] of Object.entries(groupedByShelf)) {
        doc.fontSize(14).fillColor('black').text(`\n${shelfName} (${shelfBooks.length} livros)`, { underline: true });
        doc.moveDown(0.5);

        shelfBooks.forEach((book, index) => {
          doc.fontSize(10);
          doc.text(`${index + 1}. ${book.title}`, { indent: 20 });
          doc.text(`   Autor: ${book.author}`, { indent: 20 });
          if (book.edition) doc.text(`   Edição: ${book.edition}`, { indent: 20 });
          if (book.condition) doc.text(`   Condição: ${book.condition}`, { indent: 20 });
          if (book.unique_code) doc.text(`   Código: ${book.unique_code}`, { indent: 20 });
          doc.text(`   ☐ Guardado`, { indent: 20 });
          doc.moveDown(0.3);
        });
        
        doc.moveDown();
      }

      // New page for bookmarks
      if (books.length > 0) {
        doc.addPage();
        
        // Bookmarks header
        doc.fontSize(16).text('Etiquetas/Marca-páginas dos Livros', { align: 'center' });
        if (customTemplateName) {
          doc.fontSize(10).text(`Modelo: ${customTemplateName}`, { align: 'center' });
        }
        doc.moveDown(1);
        
        // Bookmark dimensions - match the template system (2.5cm x 10cm)
        const bookmarkWidth = 2.5 * 28.35;  // ~71 points (2.5cm)
        const bookmarkHeight = 10 * 28.35; // ~284 points (10cm)
        const margin = 10;
        const cols = 6; // 6 bookmarks per row exactly like model
        const spacing = (595 - 2 * margin - cols * bookmarkWidth) / (cols - 1); // Calculate spacing between labels
        const rows = 4; // 4 rows per page
        
        let currentX = margin;
        let currentY = doc.y;
        let bookmarkCount = 0;
        
        books.forEach((book, index) => {
          // Calculate position
          const col = bookmarkCount % cols;
          const row = Math.floor(bookmarkCount / cols) % rows;
          
          // If we've filled a page, add new page
          if (bookmarkCount > 0 && bookmarkCount % (cols * rows) === 0) {
            doc.addPage();
            currentY = 50;
            row = 0;
          }
          
          const x = margin + col * (bookmarkWidth + spacing);
          const y = currentY + row * (bookmarkHeight + 10); // 10pt spacing between rows
          
          // Apply custom template background image first if available
          if (customLayoutElements && customLayoutElements.length > 0 && customTemplateData) {
            try {
              // Parse base64 image data and apply as background
              const base64Data = customTemplateData.includes(',') ? customTemplateData.split(',')[1] : customTemplateData;
              const imageBuffer = Buffer.from(base64Data, 'base64');
              
              // Apply image with cover fit to fill entire area and avoid white borders
              doc.image(imageBuffer, x, y, {
                width: bookmarkWidth,
                height: bookmarkHeight,
                cover: [bookmarkWidth, bookmarkHeight]
              });
            } catch (error) {
              console.warn('Could not apply background template:', error.message);
              // Fallback: draw border if image fails
              doc.rect(x, y, bookmarkWidth, bookmarkHeight).stroke();
            }
          } else {
            // Draw bookmark border if no custom template
            doc.rect(x, y, bookmarkWidth, bookmarkHeight).stroke();
          }
          
          // Use custom layout if available, otherwise use default layout
          if (customLayoutElements && customLayoutElements.length > 0) {
            // Apply custom layout elements over the background
            
            // Render custom layout elements
            customLayoutElements.forEach((element) => {
              const elementX = x + (element.x / 100) * bookmarkWidth;
              const elementY = y + (element.y / 100) * bookmarkHeight;
              const elementWidth = (element.width / 100) * bookmarkWidth;
              const elementHeight = (element.height / 100) * bookmarkHeight;
              
              // Render element at calculated position
              
              // Add semi-transparent background for text readability
              if (element.backgroundColor && element.backgroundColor !== 'transparent') {
                doc.save();
                doc.fillOpacity(element.opacity || 0.8);
                doc.rect(elementX, elementY, elementWidth, elementHeight)
                   .fill(element.backgroundColor);
                doc.restore();
              }
              
              // Get content based on element type
              let content = '';
              switch (element.type) {
                case 'price':
                  const finalPrice = book.used_price || book.new_price || 0;
                  content = finalPrice > 0 ? `R$ ${finalPrice.toFixed(2)}` : '';
                  break;
                case 'title':
                  content = book.title.toUpperCase();
                  break;
                case 'author':
                  content = book.author;
                  break;
                case 'synopsis':
                  content = book.synopsis || '';
                  // Adjust synopsis length based on element height
                  const maxChars = Math.floor(elementHeight / 3) * 10; // Rough estimate
                  if (content.length > maxChars) content = content.substring(0, maxChars) + '...';
                  break;
                case 'code':
                  content = book.unique_code || '';
                  break;
                case 'condition':
                  content = book.condition || '';
                  break;
              }
              
              // Render text with proper formatting and spacing
              if (content) {
                doc.save();
                doc.fontSize(element.fontSize || 10);
                doc.font(element.fontWeight === 'bold' ? 'Helvetica-Bold' : 'Helvetica');
                doc.fillColor(element.color || '#000000');
                doc.fillOpacity(1);
                
                const padding = 4;
                const textX = elementX + padding;
                const textY = elementY + padding;
                const availableWidth = elementWidth - (padding * 2);
                const availableHeight = elementHeight - (padding * 2);
                
                // Prepare text content based on element type
                let processedContent = content;
                
                if (element.type === 'synopsis') {
                  // Render synopsis with natural line wrapping (no truncation)
                  doc.text(processedContent, textX, textY, {
                    width: availableWidth,
                    height: availableHeight,
                    align: element.textAlign || 'center',
                    lineGap: 1
                  });
                } else if (element.type === 'title') {
                  // Allow title to wrap to multiple lines
                  doc.text(processedContent, textX, textY, {
                    width: availableWidth,
                    height: availableHeight,
                    align: element.textAlign || 'center',
                    lineGap: 0.5
                  });
                } else {
                  // Handle other elements with natural wrapping
                  doc.text(processedContent, textX, textY, {
                    width: availableWidth,
                    height: availableHeight,
                    align: element.textAlign || 'center',
                    lineGap: 0.5
                  });
                }
                
                doc.restore();
              }
            });
          } else {
            // Default layout - only when no custom layout is available
            const finalPrice = book.used_price || book.new_price || 0;
            if (finalPrice > 0) {
              doc.fontSize(10).font('Helvetica-Bold')
                .text(`R$ ${finalPrice.toFixed(2)}`, x + 5, y + 5, { 
                  width: bookmarkWidth - 10, 
                  align: 'center'
                });
            }
            
            doc.fontSize(8).font('Helvetica-Bold')
              .text(book.title.toUpperCase(), x + 5, y + 18, { 
                width: bookmarkWidth - 10, 
                align: 'center'
              });
            
            doc.fontSize(7).font('Helvetica')
              .text(book.author, x + 5, y + 30, { 
                width: bookmarkWidth - 10, 
                align: 'center'
              });
              
            if (book.synopsis) {
              let synopsis = book.synopsis;
              if (synopsis.length > 200) {
                synopsis = synopsis.substring(0, 200) + '...';
              }
              
              doc.fontSize(6).font('Helvetica')
                .text(synopsis, x + 5, y + 45, { 
                  width: bookmarkWidth - 10, 
                  align: 'center',
                  lineGap: 0.5
                });
            }
            
            if (book.unique_code) {
              doc.fontSize(8).font('Helvetica')
                .text(book.unique_code, x + 5, y + bookmarkHeight - 15, { 
                  width: bookmarkWidth - 10, 
                  align: 'center'
                });
            }
          }
          
          bookmarkCount++;
        });
      }

      doc.end();

    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Individual book bookmark generation
  app.get("/api/books/:id/bookmark", generateBookBookmark);
  
  // Demo storage PDF generation
  app.get("/api/storage/demo-pdf", generateDemoStoragePDF);

  // Manual PDF generation
  app.get("/api/manual/download", async (req: Request, res: Response) => {
    try {
      const { generateManualPDF } = await import("./routes/manual");
      await generateManualPDF(req, res);
    } catch (error) {
      console.error("Error generating manual PDF:", error);
      res.status(500).json({ error: "Erro ao gerar manual em PDF" });
    }
  });

  // Shelves routes
  app.get("/api/shelves", getAllShelves);
  app.post("/api/shelves", createShelf);
  app.put("/api/shelves/:id", updateShelf);
  app.delete("/api/shelves/:id", deleteShelf);

  // Book transfer routes
  app.post("/api/books/:id/transfer", async (req: Request, res: Response) => {
    try {
      const bookId = parseInt(req.params.id);
      const { to_shelf_id, reason, transferred_by } = req.body;

      if (!to_shelf_id) {
        return res.status(400).json({ error: "ID da estante de destino é obrigatório" });
      }

      const transfer = await storage.updateBookShelf(bookId, to_shelf_id, reason, transferred_by);
      res.json(transfer);
    } catch (error) {
      console.error("Error transferring book:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/books/:id/transfers", async (req: Request, res: Response) => {
    try {
      const bookId = parseInt(req.params.id);
      const transfers = await storage.getBookTransfers(bookId);
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching book transfers:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/transfers", async (req: Request, res: Response) => {
    try {
      const transfers = await storage.getBookTransfers();
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching transfers:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/shelves/:id/history", async (req: Request, res: Response) => {
    try {
      const shelfId = parseInt(req.params.id);
      const history = await storage.getShelfHistory(shelfId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching shelf history:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/missing-books/import-classics", async (req, res) => {
    try {
      const imported = await storage.importClassicBooks();
      res.json({ imported, message: `${imported} livros clássicos importados` });
    } catch (error) {
      console.error("Error importing classics:", error);
      res.status(500).json({ error: "Erro ao importar clássicos" });
    }
  });

  // Estante Virtual Integration
  app.post("/api/estante-virtual/credentials", async (req, res) => {
    try {
      const { email, password, sellerId } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email e senha são obrigatórios" });
      }

      estanteVirtualService.setCredentials({ email, password, sellerId });
      const loginSuccess = await estanteVirtualService.login();

      if (loginSuccess) {
        res.json({ success: true, message: "Credenciais configuradas e login realizado com sucesso" });
      } else {
        res.status(401).json({ success: false, error: "Falha no login. Verifique suas credenciais." });
      }
    } catch (error) {
      console.error("Error setting Estante Virtual credentials:", error);
      res.status(500).json({ error: "Erro ao configurar credenciais" });
    }
  });

  app.get("/api/estante-virtual/status", async (req, res) => {
    try {
      const status = estanteVirtualService.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting Estante Virtual status:", error);
      res.status(500).json({ error: "Erro ao verificar status" });
    }
  });

  app.post("/api/estante-virtual/upload-book/:bookId", async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const book = await storage.getBook(bookId);
      
      if (!book) {
        return res.status(404).json({ error: "Livro não encontrado" });
      }

      const bookWithInventory = {
        ...book,
        inventory: await storage.getInventory(bookId)
      };

      // Use individual upload method (via API, not spreadsheet)
      const result = await estanteVirtualService.uploadBookIndividually(bookWithInventory);
      
      if (result.success && result.bookId) {
        // Mark book as sent to Estante Virtual
        const inventoryRecord = bookWithInventory.inventory;
        if (inventoryRecord) {
          await storage.updateInventory(inventoryRecord.id, {
            sentToEstanteVirtual: true,
            estanteVirtualId: result.bookId
          });
        }
      }

      res.json(result);
    } catch (error) {
      console.error("Error uploading book to Estante Virtual:", error);
      res.status(500).json({ error: "Erro ao enviar livro para Estante Virtual" });
    }
  });

  app.post("/api/estante-virtual/upload-batch", async (req, res) => {
    try {
      const { bookIds } = req.body;
      
      if (!Array.isArray(bookIds) || bookIds.length === 0) {
        return res.status(400).json({ error: "Lista de IDs de livros é obrigatória" });
      }

      const results = [];
      
      // Upload each book individually via API (not spreadsheet)
      for (const bookId of bookIds) {
        try {
          const book = await storage.getBook(bookId);
          if (book) {
            const inventory = await storage.getInventory(bookId);
            const bookWithInventory = { ...book, inventory };
            
            const result = await estanteVirtualService.uploadBookIndividually(bookWithInventory);
            
            if (result.success && result.bookId) {
              // Update inventory to mark as sent to Estante Virtual
              if (inventory) {
                await storage.updateInventory(inventory.id, {
                  sentToEstanteVirtual: true,
                  estanteVirtualId: result.bookId
                });
              }
            }
            
            results.push({
              bookId,
              book: book.title,
              success: result.success,
              message: result.message,
              estanteBookId: result.bookId
            });
          }
        } catch (error) {
          results.push({
            bookId,
            success: false,
            message: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      
      res.json({
        success: successCount > 0,
        message: `${successCount} de ${bookIds.length} livros enviados com sucesso`,
        results,
        successCount,
        totalCount: bookIds.length
      });
    } catch (error) {
      console.error("Error uploading books to Estante Virtual:", error);
      res.status(500).json({ error: "Erro ao enviar livros para Estante Virtual" });
    }
  });

  // Manual sync with Estante Virtual
  app.post("/api/estante-virtual/sync-inventory", async (req, res) => {
    try {
      const { bookId } = req.body;
      
      if (bookId) {
        // Sync specific book
        const inventory = await storage.getInventory(bookId);
        if (!inventory?.estanteVirtualId || !inventory.sentToEstanteVirtual) {
          return res.status(400).json({ error: "Livro não está na Estante Virtual" });
        }

        const updateResult = await estanteVirtualService.updateBookQuantity(
          inventory.estanteVirtualId, 
          inventory.quantity
        );

        if (updateResult.success) {
          await storage.updateInventory(inventory.id, {
            lastSyncDate: new Date()
          });
        }

        res.json(updateResult);
      } else {
        // Sync all books that are in Estante Virtual
        const allBooks = await storage.getAllBooks();
        const syncResults = [];

        for (const book of allBooks) {
          if (book.inventory?.estanteVirtualId && book.inventory.sentToEstanteVirtual) {
            try {
              const updateResult = await estanteVirtualService.updateBookQuantity(
                book.inventory.estanteVirtualId,
                book.inventory.quantity
              );

              if (updateResult.success) {
                await storage.updateInventory(book.inventory.id, {
                  lastSyncDate: new Date()
                });
              }

              syncResults.push({
                bookId: book.id,
                title: book.title,
                success: updateResult.success,
                message: updateResult.message
              });
            } catch (error) {
              syncResults.push({
                bookId: book.id,
                title: book.title,
                success: false,
                message: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
              });
            }
          }
        }

        const successCount = syncResults.filter(r => r.success).length;
        res.json({
          success: successCount > 0,
          message: `${successCount} de ${syncResults.length} livros sincronizados`,
          results: syncResults
        });
      }
    } catch (error) {
      console.error("Error syncing inventory:", error);
      res.status(500).json({ error: "Erro ao sincronizar estoque" });
    }
  });

  // Remove book from Estante Virtual
  app.delete("/api/estante-virtual/book/:bookId", async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const inventory = await storage.getInventory(bookId);
      
      if (!inventory?.estanteVirtualId || !inventory.sentToEstanteVirtual) {
        return res.status(400).json({ error: "Livro não está na Estante Virtual" });
      }

      const removeResult = await estanteVirtualService.removeBook(inventory.estanteVirtualId);
      
      if (removeResult.success) {
        await storage.updateInventory(inventory.id, {
          sentToEstanteVirtual: false,
          estanteVirtualId: null,
          lastSyncDate: new Date()
        });
      }

      res.json(removeResult);
    } catch (error) {
      console.error("Error removing book from Estante Virtual:", error);
      res.status(500).json({ error: "Erro ao remover livro da Estante Virtual" });
    }
  });

  // Import catalog from Estante Virtual
  app.post("/api/estante-virtual/import-catalog", async (req, res) => {
    try {
      const result = await estanteVirtualService.importCatalog();
      
      if (result.success) {
        res.json({
          success: true,
          message: `${result.imported} livros importados com sucesso`,
          imported: result.imported,
          errors: result.errors
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Falha na importação do catálogo",
          errors: result.errors
        });
      }
    } catch (error) {
      console.error("Error importing catalog:", error);
      res.status(500).json({ error: "Erro ao importar catálogo da Estante Virtual" });
    }
  });

  // Test Estante Virtual login
  app.post("/api/estante-virtual/test-connection", async (req, res) => {
    try {
      // Get credentials from database settings
      const emailSetting = await storage.getSetting("estante_email");
      const passwordSetting = await storage.getSetting("estante_password");

      if (!emailSetting?.value || !passwordSetting?.value) {
        return res.json({ 
          success: false, 
          message: "Credenciais não configuradas. Salve o email e senha primeiro." 
        });
      }

      // Set credentials and test login
      estanteVirtualService.setCredentials({
        email: emailSetting.value,
        password: passwordSetting.value
      });

      console.log("Testando conexão com a Estante Virtual...");
      const loginResult = await estanteVirtualService.login();
      
      if (loginResult) {
        res.json({ 
          success: true, 
          message: `Conexão bem-sucedida! Logado como: ${emailSetting.value}`,
          loggedIn: true 
        });
      } else {
        res.json({ 
          success: false, 
          message: "Falha na conexão - verifique suas credenciais",
          loggedIn: false 
        });
      }
    } catch (error) {
      console.error("Erro ao testar conexão:", error);
      res.status(500).json({ 
        success: false, 
        error: "Erro interno ao testar conexão",
        message: (error as Error).message 
      });
    }
  });

  app.post("/api/estante-virtual/test-login", async (req, res) => {
    try {
      // Set credentials from environment
      estanteVirtualService.setCredentials({
        email: process.env.ESTANTE_VIRTUAL_EMAIL!,
        password: process.env.ESTANTE_VIRTUAL_PASSWORD!
      });

      console.log("Testando login na Estante Virtual...");
      const loginResult = await estanteVirtualService.login();
      
      if (loginResult) {
        res.json({ 
          success: true, 
          message: "Login realizado com sucesso na Estante Virtual",
          loggedIn: true 
        });
      } else {
        res.json({ 
          success: false, 
          message: "Falha no login - credenciais inválidas ou sistema alterado",
          loggedIn: false 
        });
      }
    } catch (error) {
      console.error("Erro ao testar login:", error);
      res.status(500).json({ 
        success: false, 
        error: "Erro interno ao testar login",
        message: (error as Error).message 
      });
    }
  });

  // Estante Virtual Orders Management
  app.get("/api/estante-virtual/orders", async (req, res) => {
    try {
      const orders = await storage.getAllEstanteVirtualOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching Estante Virtual orders:", error);
      res.status(500).json({ error: "Erro ao buscar pedidos da Estante Virtual" });
    }
  });

  app.get("/api/estante-virtual/orders/:id", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getEstanteVirtualOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error fetching Estante Virtual order:", error);
      res.status(500).json({ error: "Erro ao buscar pedido" });
    }
  });

  app.patch("/api/estante-virtual/orders/:id", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const updateData = req.body;
      
      const updatedOrder = await storage.updateEstanteVirtualOrder(orderId, updateData);
      
      if (!updatedOrder) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }
      
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating Estante Virtual order:", error);
      res.status(500).json({ error: "Erro ao atualizar pedido" });
    }
  });

  app.post("/api/estante-virtual/orders", async (req, res) => {
    try {
      const { order, items } = req.body;
      
      if (!order || !items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Dados do pedido e itens são obrigatórios" });
      }

      // Calculate shipping deadline (2 business days from order date)
      const orderDate = new Date(order.orderDate);
      const shippingDeadline = new Date(orderDate);
      
      // Add 2 business days
      let businessDaysAdded = 0;
      while (businessDaysAdded < 2) {
        shippingDeadline.setDate(shippingDeadline.getDate() + 1);
        const dayOfWeek = shippingDeadline.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
          businessDaysAdded++;
        }
      }

      const orderWithDeadline = {
        ...order,
        shippingDeadline: shippingDeadline
      };

      const newOrder = await storage.createEstanteVirtualOrder(orderWithDeadline, items);
      res.json(newOrder);
    } catch (error) {
      console.error("Error creating Estante Virtual order:", error);
      res.status(500).json({ error: "Erro ao criar pedido" });
    }
  });

  // Order Importer routes
  app.post("/api/order-importer/import", async (req, res) => {
    try {
      const result = await orderImporterService.importOrders();
      res.json(result);
    } catch (error) {
      console.error("Error importing orders:", error);
      res.status(500).json({ error: "Erro ao importar pedidos" });
    }
  });

  app.get("/api/order-importer/status", async (req, res) => {
    try {
      const status = orderImporterService.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting importer status:", error);
      res.status(500).json({ error: "Erro ao verificar status do importador" });
    }
  });

  app.post("/api/estante-virtual/orders/:id/tracking", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { trackingCode } = req.body;
      
      if (!trackingCode) {
        return res.status(400).json({ error: "Código de rastreio é obrigatório" });
      }

      const result = await orderImporterService.updateTrackingCode(orderId, trackingCode);
      res.json(result);
    } catch (error) {
      console.error("Error updating tracking code:", error);
      res.status(500).json({ error: "Erro ao atualizar código de rastreio" });
    }
  });

  app.post("/api/estante-virtual/test-connection", async (req, res) => {
    try {
      console.log("Testando configuração da Estante Virtual...");
      
      // Check if credentials are saved in settings
      const emailSetting = await storage.getSetting("estante_email");
      const passwordSetting = await storage.getSetting("estante_password");
      
      if (!emailSetting?.value || !passwordSetting?.value) {
        return res.json({ 
          success: false,
          message: "Credenciais não encontradas. Configure email e senha nas configurações."
        });
      }

      // Load credentials into service
      const credentialsLoaded = await estanteVirtualService.loadCredentialsFromSettings();
      
      if (credentialsLoaded) {
        res.json({ 
          success: true,
          message: `Credenciais configuradas para: ${emailSetting.value}. Pronto para importar pedidos automaticamente.`
        });
      } else {
        res.json({ 
          success: false,
          message: "Erro ao carregar credenciais do banco de dados."
        });
      }
      
    } catch (error) {
      console.error("Erro ao testar configuração da Estante Virtual:", error);
      res.status(500).json({ 
        success: false, 
        error: "Erro interno ao verificar configuração" 
      });
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Erro ao buscar configurações" });
    }
  });

  app.get("/api/settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSetting(key);
      
      if (!setting) {
        return res.status(404).json({ error: "Configuração não encontrada" });
      }
      
      res.json(setting);
    } catch (error) {
      console.error("Error fetching setting:", error);
      res.status(500).json({ error: "Erro ao buscar configuração" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const { key, value } = req.body;
      
      if (!key || value === undefined) {
        return res.status(400).json({ error: "Chave e valor são obrigatórios" });
      }
      
      const setting = await storage.setSetting(key, value);
      res.json(setting);
    } catch (error) {
      console.error("Error setting configuration:", error);
      res.status(500).json({ error: "Erro ao salvar configuração" });
    }
  });

  // Upload logo image
  app.post("/api/settings/upload-logo", upload.single('logo'), async (req, res) => {
    try {
      console.log("Upload endpoint hit, file:", req.file ? "present" : "missing");
      
      if (!req.file) {
        console.log("No file received");
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      const file = req.file;
      console.log("File details:", { name: file.originalname, type: file.mimetype, size: file.size });
      
      // Validate file type
      if (!file.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: "Apenas arquivos de imagem são permitidos" });
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ error: "Arquivo muito grande. Tamanho máximo: 5MB" });
      }

      // Convert image to base64 data URL
      const base64 = file.buffer.toString('base64');
      const dataUrl = `data:${file.mimetype};base64,${base64}`;

      console.log("Saving to database...");
      // Save the data URL as logo_url setting
      const setting = await storage.setSetting('logo_url', dataUrl);
      console.log("Setting saved:", setting.id);
      
      res.json({ 
        success: true, 
        logoUrl: dataUrl,
        setting 
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ error: "Erro ao fazer upload da logo" });
    }
  });

  // Exchanges API
  app.get("/api/exchanges", async (req, res) => {
    try {
      const exchanges = await storage.getAllExchanges();
      res.json(exchanges);
    } catch (error) {
      console.error("Error fetching exchanges:", error);
      res.status(500).json({ error: "Erro ao buscar trocas" });
    }
  });

  app.get("/api/exchanges/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const exchange = await storage.getExchange(id);
      
      if (!exchange) {
        return res.status(404).json({ error: "Troca não encontrada" });
      }
      
      res.json(exchange);
    } catch (error) {
      console.error("Error fetching exchange:", error);
      res.status(500).json({ error: "Erro ao buscar troca" });
    }
  });

  app.post("/api/exchanges/analyze-photo", upload.single('photo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Foto é obrigatória" });
      }

      const imageBase64 = req.file.buffer.toString('base64');
      const identifiedBooks = await analyzeExchangePhoto(imageBase64);
      
      // If no books identified (API issues or manual mode), return empty result for manual entry
      if (identifiedBooks.length === 0) {
        return res.json({
          books: [],
          totalTradeValue: 0,
          bookCount: 0,
          explanation: "Análise automática não identificou livros na foto. Verifique a qualidade da imagem ou use o modo manual."
        });
      }

      const tradeAnalysis = calculateBulkTradeValue(identifiedBooks);
      const explanation = generateTradeExplanation(identifiedBooks);

      res.json({
        books: tradeAnalysis.books,
        totalTradeValue: tradeAnalysis.totalTradeValue,
        bookCount: tradeAnalysis.bookCount,
        explanation
      });
    } catch (error) {
      console.error("Error analyzing exchange photo:", error);
      res.status(500).json({ error: "Erro ao analisar foto da troca" });
    }
  });

  app.post("/api/exchanges", async (req, res) => {
    try {
      const { exchange, items, givenBooks = [] } = req.body;
      
      // Validate exchange data
      const validatedExchange = insertExchangeSchema.parse(exchange);
      
      // Validate items data
      const validatedItems = items.map((item: any) => insertExchangeItemSchema.parse(item));
      
      // Validate given books data
      const validatedGivenBooks = givenBooks.map((book: any) => insertExchangeGivenBookSchema.parse(book));
      
      const newExchange = await storage.createExchange(validatedExchange, validatedItems, validatedGivenBooks);
      res.status(201).json(newExchange);
    } catch (error) {
      console.error("Error creating exchange:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Dados inválidos", details: error.errors });
      } else {
        res.status(500).json({ error: "Erro ao criar troca" });
      }
    }
  });

  app.put("/api/exchanges/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const updatedExchange = await storage.updateExchange(id, updateData);
      
      if (!updatedExchange) {
        return res.status(404).json({ error: "Troca não encontrada" });
      }
      
      res.json(updatedExchange);
    } catch (error) {
      console.error("Error updating exchange:", error);
      res.status(500).json({ error: "Erro ao atualizar troca" });
    }
  });

  app.delete("/api/exchanges/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteExchange(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Troca não encontrada" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting exchange:", error);
      res.status(500).json({ error: "Erro ao deletar troca" });
    }
  });

  app.post("/api/exchanges/calculate", async (req, res) => {
    try {
      const { estimatedSaleValue, publishYear, isCompleteSeries, condition } = req.body;
      
      if (!estimatedSaleValue || !condition) {
        return res.status(400).json({ error: "Valor estimado e condição são obrigatórios" });
      }
      
      const result = calculateTradeValue({
        estimatedSaleValue: parseFloat(estimatedSaleValue),
        publishYear: publishYear ? parseInt(publishYear) : undefined,
        isCompleteSeries: Boolean(isCompleteSeries),
        condition: condition as 'novo' | 'usado'
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error calculating trade value:", error);
      res.status(500).json({ error: "Erro ao calcular valor da troca" });
    }
  });

  // Process exchange inventory
  app.post("/api/exchanges/:id/process-inventory", async (req, res) => {
    try {
      const exchangeId = parseInt(req.params.id);
      const result = await storage.processExchangeInventory(exchangeId);
      res.json(result);
    } catch (error) {
      console.error("Error processing exchange inventory:", error);
      res.status(500).json({ error: "Erro ao processar estoque da troca" });
    }
  });

  // Pre-catalog books API
  app.get("/api/pre-catalog-books", async (req, res) => {
    try {
      const books = await storage.getPreCatalogBooks();
      res.json(books);
    } catch (error) {
      console.error("Error fetching pre-catalog books:", error);
      res.status(500).json({ error: "Erro ao buscar pré-cadastros" });
    }
  });

  app.post("/api/pre-catalog-books/:id/process", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bookData = req.body;
      
      const validatedData = insertBookSchema.parse(bookData);
      const newBook = await storage.processPreCatalogBook(id, validatedData);
      
      res.json(newBook);
    } catch (error) {
      console.error("Error processing pre-catalog book:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Dados inválidos", details: error.errors });
      } else {
        res.status(500).json({ error: "Erro ao processar livro" });
      }
    }
  });

  app.post("/api/pre-catalog-books/:id/reject", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ error: "Motivo da rejeição é obrigatório" });
      }
      
      const result = await storage.rejectPreCatalogBook(id, reason);
      
      if (!result) {
        return res.status(404).json({ error: "Livro não encontrado" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting pre-catalog book:", error);
      res.status(500).json({ error: "Erro ao rejeitar livro" });
    }
  });

  // Pre-catalog books management
  app.get("/api/pre-catalog-books", async (req, res) => {
    try {
      const { exchangeId } = req.query;
      const books = await storage.getPreCatalogBooks(exchangeId ? parseInt(exchangeId as string) : undefined);
      res.json(books);
    } catch (error) {
      console.error("Error fetching pre-catalog books:", error);
      res.status(500).json({ error: "Erro ao buscar livros em pré-cadastro" });
    }
  });

  app.post("/api/pre-catalog-books/:id/process", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bookData = insertBookSchema.parse(req.body);
      
      const newBook = await storage.processPreCatalogBook(id, bookData);
      res.status(201).json(newBook);
    } catch (error) {
      console.error("Error processing pre-catalog book:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Dados inválidos", details: error.errors });
      } else {
        res.status(500).json({ error: "Erro ao processar livro" });
      }
    }
  });

  app.post("/api/pre-catalog-books/:id/reject", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;
      
      const success = await storage.rejectPreCatalogBook(id, reason || "Rejeitado pelo usuário");
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Livro não encontrado" });
      }
    } catch (error) {
      console.error("Error rejecting pre-catalog book:", error);
      res.status(500).json({ error: "Erro ao rejeitar livro" });
    }
  });

  // Start the export scheduler (if available)
  try {
    if (dailyExportScheduler && typeof dailyExportScheduler.start === 'function') {
      dailyExportScheduler.start();
    }
  } catch (error) {
    console.warn('Export scheduler not available:', error);
  }

  // Custom template routes
  app.post('/api/storage/upload-template', upload.single('template'), uploadTemplate);
  app.get('/api/storage/custom-pdf', generateCustomPDF);
  app.get('/api/storage/template-info', getTemplateInfo);
  app.post('/api/storage/save-layout', saveCustomLayout);
  app.get('/api/storage/custom-layout-pdf', generateCustomLayoutPDF);

  // Customer Requests (Radar) routes
  app.get("/api/customer-requests", async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string;
      if (status === 'active') {
        const requests = await storage.getActiveCustomerRequests();
        res.json(requests);
      } else {
        const requests = await storage.getAllCustomerRequests();
        res.json(requests);
      }
    } catch (error) {
      console.error("Error getting customer requests:", error);
      res.status(500).json({ error: "Erro ao buscar solicitações de clientes" });
    }
  });

  app.post("/api/customer-requests", async (req: Request, res: Response) => {
    try {
      const request = await storage.createCustomerRequest(req.body);
      
      // Verificar se já existe um livro correspondente no estoque
      const matches = await storage.checkForMatchingRequests(req.body.title, req.body.author);
      if (matches.length > 0) {
        console.log(`Nova solicitação pode ter correspondência: ${req.body.title} - ${req.body.author}`);
      }
      
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating customer request:", error);
      res.status(500).json({ error: "Erro ao criar solicitação do cliente" });
    }
  });

  app.put("/api/customer-requests/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.updateCustomerRequest(id, req.body);
      if (!request) {
        return res.status(404).json({ error: "Solicitação não encontrada" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error updating customer request:", error);
      res.status(500).json({ error: "Erro ao atualizar solicitação do cliente" });
    }
  });

  app.delete("/api/customer-requests/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCustomerRequest(id);
      if (!success) {
        return res.status(404).json({ error: "Solicitação não encontrada" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting customer request:", error);
      res.status(500).json({ error: "Erro ao deletar solicitação do cliente" });
    }
  });

  app.post("/api/customer-requests/:id/fulfill", async (req: Request, res: Response) => {
    try {
      const requestId = parseInt(req.params.id);
      const { bookId } = req.body;
      
      const request = await storage.fulfillCustomerRequest(requestId, bookId);
      if (!request) {
        return res.status(404).json({ error: "Solicitação não encontrada" });
      }
      
      res.json(request);
    } catch (error) {
      console.error("Error fulfilling customer request:", error);
      res.status(500).json({ error: "Erro ao atender solicitação do cliente" });
    }
  });

  // Endpoint para verificar se um livro recém-cadastrado corresponde a alguma solicitação
  app.post("/api/books/:id/check-requests", async (req: Request, res: Response) => {
    try {
      const bookId = parseInt(req.params.id);
      const book = await storage.getBook(bookId);
      
      if (!book) {
        return res.status(404).json({ error: "Livro não encontrado" });
      }
      
      const matches = await storage.checkForMatchingRequests(book.title, book.author || '');
      
      res.json({
        hasMatches: matches.length > 0,
        matches: matches,
        message: matches.length > 0 
          ? `${matches.length} cliente(s) procurando este livro!` 
          : 'Nenhum cliente procurando este livro'
      });
    } catch (error) {
      console.error("Error checking requests for book:", error);
      res.status(500).json({ error: "Erro ao verificar solicitações para o livro" });
    }
  });

  // Shelves routes
  app.get("/api/shelves", async (req, res) => {
    try {
      const allShelves = await db.select().from(shelves).where(eq(shelves.isActive, true)).orderBy(asc(shelves.name));
      res.json(allShelves);
    } catch (error) {
      console.error("Error fetching shelves:", error);
      res.status(500).json({ error: "Erro ao buscar estantes" });
    }
  });

  app.post("/api/shelves", async (req, res) => {
    try {
      const shelfData = insertShelfSchema.parse(req.body);
      const [newShelf] = await db.insert(shelves).values({
        ...shelfData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      res.status(201).json(newShelf);
    } catch (error) {
      console.error("Error creating shelf:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Erro ao criar estante" });
    }
  });

  app.put("/api/shelves/:id", async (req, res) => {
    try {
      const shelfId = parseInt(req.params.id);
      const shelfData = insertShelfSchema.parse(req.body);
      
      const [updatedShelf] = await db.update(shelves)
        .set({ ...shelfData, updatedAt: new Date() })
        .where(eq(shelves.id, shelfId))
        .returning();
      
      if (!updatedShelf) {
        return res.status(404).json({ error: "Estante não encontrada" });
      }
      
      res.json(updatedShelf);
    } catch (error) {
      console.error("Error updating shelf:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Erro ao atualizar estante" });
    }
  });

  app.delete("/api/shelves/:id", async (req, res) => {
    try {
      const shelfId = parseInt(req.params.id);
      
      // Check if there are books on this shelf
      const booksOnShelf = await db.select().from(books)
        .leftJoin(inventory, eq(books.id, inventory.bookId))
        .where(eq(inventory.shelfId, shelfId));
      
      if (booksOnShelf.length > 0) {
        return res.status(400).json({ 
          error: `Não é possível remover esta estante pois ela contém ${booksOnShelf.length} livro(s). Mova os livros antes de remover a estante.` 
        });
      }
      
      // Soft delete by setting isActive to false
      const [deletedShelf] = await db.update(shelves)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(shelves.id, shelfId))
        .returning();
      
      if (!deletedShelf) {
        return res.status(404).json({ error: "Estante não encontrada" });
      }
      
      res.json({ message: "Estante removida com sucesso" });
    } catch (error) {
      console.error("Error deleting shelf:", error);
      res.status(500).json({ error: "Erro ao remover estante" });
    }
  });

  // Customers routes
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Erro ao buscar clientes" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Erro ao criar cliente" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: "Erro ao buscar cliente" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchBookByISBN, searchBrazilianBookPrices } from "./services/bookApi";
import { analyzeBookCondition, generateBookDescription } from "./services/openai";
import { formatBooksForEstanteVirtual, generateExcelFile, generateCSVFile, generateSalesReport } from "./services/export";
import { estanteVirtualService } from "./services/estanteVirtual";
import { insertBookSchema, insertInventorySchema, insertSaleSchema, insertSaleItemSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";

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
      const book = await storage.createBook(validatedData);
      
      // Create inventory entry if quantity is provided
      if (req.body.quantity !== undefined) {
        await storage.createInventory({
          bookId: book.id,
          quantity: req.body.quantity,
          location: req.body.location || "",
          status: "available"
        });
      }
      
      res.status(201).json(book);
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
      
      const validatedSale = insertSaleSchema.parse(sale);
      const validatedItems = items.map((item: any) => insertSaleItemSchema.parse(item));
      
      const newSale = await storage.createSale(validatedSale, validatedItems);
      
      // Update inventory quantities
      for (const item of validatedItems) {
        const inventory = await storage.getInventory(item.bookId);
        if (inventory) {
          await storage.updateInventory(inventory.id, {
            quantity: Math.max(0, inventory.quantity - item.quantity)
          });
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

      const result = await estanteVirtualService.uploadBook(bookWithInventory);
      
      if (result.success && result.bookId) {
        // Mark book as sent to Estante Virtual
        if (bookWithInventory.inventory) {
          await storage.updateInventory(bookWithInventory.inventory.id, {
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

      const books = [];
      for (const bookId of bookIds) {
        const book = await storage.getBook(bookId);
        if (book) {
          const bookWithInventory = {
            ...book,
            inventory: await storage.getInventory(bookId)
          };
          books.push(bookWithInventory);
        }
      }

      const result = await estanteVirtualService.uploadBooks(books);
      
      // Update inventory for successful uploads
      for (const uploadResult of result.results) {
        if (uploadResult.success && uploadResult.bookId) {
          const book = books.find(b => b.title === uploadResult.book);
          if (book && book.inventory) {
            await storage.updateInventory(book.inventory.id, {
              sentToEstanteVirtual: true,
              estanteVirtualId: uploadResult.bookId
            });
          }
        }
      }

      res.json(result);
    } catch (error) {
      console.error("Error uploading books to Estante Virtual:", error);
      res.status(500).json({ error: "Erro ao enviar livros para Estante Virtual" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

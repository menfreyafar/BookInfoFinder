import { 
  books, 
  inventory, 
  sales, 
  saleItems, 
  categories,
  settings,
  estanteVirtualOrders,
  estanteVirtualOrderItems,
  exchanges,
  exchangeItems,
  exchangeGivenBooks,
  preCatalogBooks,
  type Book, 
  type InsertBook,
  type Inventory,
  type InsertInventory,
  type Sale,
  type InsertSale,
  type SaleItem,
  type InsertSaleItem,
  type Category,
  type InsertCategory,
  type EstanteVirtualOrder,
  type InsertEstanteVirtualOrder,
  type EstanteVirtualOrderItem,
  type InsertEstanteVirtualOrderItem,
  type BookWithInventory,
  type SaleWithItems,
  type EstanteVirtualOrderWithItems,
  type Exchange,
  type InsertExchange,
  type ExchangeItem,
  type InsertExchangeItem,
  type ExchangeGivenBook,
  type InsertExchangeGivenBook,
  type PreCatalogBook,
  type InsertPreCatalogBook,
  type ExchangeWithItems
} from "@shared/schema";
import type { Setting, InsertSetting } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, like, lt, sql } from "drizzle-orm";

export interface IStorage {
  // Books
  getBook(id: number): Promise<Book | undefined>;
  getBookByISBN(isbn: string): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: number, book: Partial<InsertBook>): Promise<Book | undefined>;
  deleteBook(id: number): Promise<boolean>;
  searchBooks(query: string): Promise<BookWithInventory[]>;
  getAllBooks(): Promise<BookWithInventory[]>;
  
  // Inventory
  getInventory(bookId: number): Promise<Inventory | undefined>;
  createInventory(inventory: InsertInventory): Promise<Inventory>;
  updateInventory(id: number, inventory: Partial<InsertInventory>): Promise<Inventory | undefined>;
  getLowStockBooks(threshold?: number): Promise<BookWithInventory[]>;
  getBooksNotInEstanteVirtual(): Promise<BookWithInventory[]>;
  
  // Sales
  createSale(sale: InsertSale, items: InsertSaleItem[]): Promise<SaleWithItems>;
  getSale(id: number): Promise<SaleWithItems | undefined>;
  getAllSales(): Promise<SaleWithItems[]>;
  getSalesByDateRange(startDate: Date, endDate: Date): Promise<SaleWithItems[]>;
  
  // Categories
  getAllCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Estante Virtual Orders
  createEstanteVirtualOrder(order: InsertEstanteVirtualOrder, items: InsertEstanteVirtualOrderItem[]): Promise<EstanteVirtualOrderWithItems>;
  getEstanteVirtualOrder(id: number): Promise<EstanteVirtualOrderWithItems | undefined>;
  getAllEstanteVirtualOrders(): Promise<EstanteVirtualOrderWithItems[]>;
  updateEstanteVirtualOrder(id: number, order: Partial<InsertEstanteVirtualOrder>): Promise<EstanteVirtualOrder | undefined>;
  
  // Settings
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: string): Promise<Setting>;
  getAllSettings(): Promise<Setting[]>;

  // Exchanges
  createExchange(exchange: InsertExchange, items: InsertExchangeItem[], givenBooks: InsertExchangeGivenBook[]): Promise<ExchangeWithItems>;
  getExchange(id: number): Promise<ExchangeWithItems | undefined>;
  getAllExchanges(): Promise<ExchangeWithItems[]>;
  updateExchange(id: number, exchange: Partial<InsertExchange>): Promise<Exchange | undefined>;
  deleteExchange(id: number): Promise<boolean>;
  processExchangeInventory(exchangeId: number): Promise<{ success: boolean; message: string; processedBooks: number; errors: string[] }>;
  
  // Pre-catalog books
  getPreCatalogBooks(exchangeId?: number): Promise<PreCatalogBook[]>;
  processPreCatalogBook(id: number, bookData: InsertBook): Promise<Book>;
  rejectPreCatalogBook(id: number, reason: string): Promise<boolean>;
  
  // Dashboard stats
  getDashboardStats(): Promise<{
    totalBooks: number;
    dailySales: number;
    lowStockCount: number;
    estanteVirtualCount: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getBook(id: number): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.id, id));
    return book || undefined;
  }

  async getBookByISBN(isbn: string): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.isbn, isbn));
    return book || undefined;
  }

  async createBook(book: InsertBook): Promise<Book> {
    const [newBook] = await db.insert(books).values(book).returning();
    return newBook;
  }

  async updateBook(id: number, book: Partial<InsertBook>): Promise<Book | undefined> {
    const [updatedBook] = await db
      .update(books)
      .set({ ...book, updatedAt: new Date() })
      .where(eq(books.id, id))
      .returning();
    return updatedBook || undefined;
  }

  async deleteBook(id: number): Promise<boolean> {
    const result = await db.delete(books).where(eq(books.id, id));
    return (result.rowCount || 0) > 0;
  }

  async searchBooks(query: string): Promise<BookWithInventory[]> {
    const result = await db
      .select()
      .from(books)
      .leftJoin(inventory, eq(books.id, inventory.bookId))
      .where(
        or(
          like(books.title, `%${query}%`),
          like(books.author, `%${query}%`),
          like(books.isbn, `%${query}%`)
        )
      )
      .orderBy(asc(books.title));

    return result.map(row => ({
      ...row.books,
      inventory: row.inventory
    }));
  }

  async getAllBooks(): Promise<BookWithInventory[]> {
    const result = await db
      .select()
      .from(books)
      .leftJoin(inventory, eq(books.id, inventory.bookId))
      .orderBy(desc(books.createdAt));

    return result.map(row => ({
      ...row.books,
      inventory: row.inventory
    }));
  }

  async getInventory(bookId: number): Promise<Inventory | undefined> {
    const [inv] = await db.select().from(inventory).where(eq(inventory.bookId, bookId));
    return inv || undefined;
  }

  async createInventory(inv: InsertInventory): Promise<Inventory> {
    const [newInventory] = await db.insert(inventory).values(inv).returning();
    return newInventory;
  }

  async updateInventory(id: number, inv: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const [updatedInventory] = await db
      .update(inventory)
      .set({ ...inv, updatedAt: new Date() })
      .where(eq(inventory.id, id))
      .returning();
    return updatedInventory || undefined;
  }

  async getLowStockBooks(threshold = 5): Promise<BookWithInventory[]> {
    const result = await db
      .select()
      .from(books)
      .leftJoin(inventory, eq(books.id, inventory.bookId))
      .where(
        and(
          lt(inventory.quantity, threshold),
          eq(inventory.status, "available")
        )
      );

    return result.map(row => ({
      ...row.books,
      inventory: row.inventory
    }));
  }

  async getBooksNotInEstanteVirtual(): Promise<BookWithInventory[]> {
    const result = await db
      .select()
      .from(books)
      .leftJoin(inventory, eq(books.id, inventory.bookId))
      .where(eq(inventory.sentToEstanteVirtual, false));

    return result.map(row => ({
      ...row.books,
      inventory: row.inventory
    }));
  }

  async createSale(sale: InsertSale, items: InsertSaleItem[]): Promise<SaleWithItems> {
    const [newSale] = await db.insert(sales).values(sale).returning();
    
    const newItems = await db
      .insert(saleItems)
      .values(items.map(item => ({ ...item, saleId: newSale.id })))
      .returning();

    const itemsWithBooks = await Promise.all(
      newItems.map(async (item) => {
        const book = await this.getBook(item.bookId);
        return { ...item, book: book! };
      })
    );

    return {
      ...newSale,
      items: itemsWithBooks
    };
  }

  async getSale(id: number): Promise<SaleWithItems | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    if (!sale) return undefined;

    const items = await db
      .select()
      .from(saleItems)
      .leftJoin(books, eq(saleItems.bookId, books.id))
      .where(eq(saleItems.saleId, id));

    return {
      ...sale,
      items: items.map(row => ({
        ...row.sale_items,
        book: row.books!
      }))
    };
  }

  async getAllSales(): Promise<SaleWithItems[]> {
    const allSales = await db.select().from(sales).orderBy(desc(sales.createdAt));
    
    return Promise.all(
      allSales.map(async (sale) => {
        const saleWithItems = await this.getSale(sale.id);
        return saleWithItems!;
      })
    );
  }

  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<SaleWithItems[]> {
    const salesInRange = await db
      .select()
      .from(sales)
      .where(and(
        eq(sales.createdAt, startDate),
        eq(sales.createdAt, endDate)
      ))
      .orderBy(desc(sales.createdAt));

    return Promise.all(
      salesInRange.map(async (sale) => {
        const saleWithItems = await this.getSale(sale.id);
        return saleWithItems!;
      })
    );
  }

  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.name));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async createEstanteVirtualOrder(order: InsertEstanteVirtualOrder, items: InsertEstanteVirtualOrderItem[]): Promise<EstanteVirtualOrderWithItems> {
    const [newOrder] = await db.insert(estanteVirtualOrders).values(order).returning();
    
    const orderItems = await Promise.all(
      items.map(async (item) => {
        const [newItem] = await db.insert(estanteVirtualOrderItems).values({
          ...item,
          orderId: newOrder.id
        }).returning();
        return newItem;
      })
    );

    const itemsWithBooks = await Promise.all(
      orderItems.map(async (item) => {
        const [book] = await db.select().from(books).where(eq(books.id, item.bookId));
        return {
          ...item,
          book: book!
        };
      })
    );

    return {
      ...newOrder,
      items: itemsWithBooks
    };
  }

  async getEstanteVirtualOrder(id: number): Promise<EstanteVirtualOrderWithItems | undefined> {
    const [order] = await db.select().from(estanteVirtualOrders).where(eq(estanteVirtualOrders.id, id));
    if (!order) return undefined;

    const items = await db
      .select()
      .from(estanteVirtualOrderItems)
      .leftJoin(books, eq(estanteVirtualOrderItems.bookId, books.id))
      .where(eq(estanteVirtualOrderItems.orderId, id));

    return {
      ...order,
      items: items.map(row => ({
        ...row.estante_virtual_order_items,
        book: row.books!
      }))
    };
  }

  async getAllEstanteVirtualOrders(): Promise<EstanteVirtualOrderWithItems[]> {
    const allOrders = await db.select().from(estanteVirtualOrders).orderBy(desc(estanteVirtualOrders.createdAt));
    
    return Promise.all(
      allOrders.map(async (order) => {
        const orderWithItems = await this.getEstanteVirtualOrder(order.id);
        return orderWithItems!;
      })
    );
  }

  async updateEstanteVirtualOrder(id: number, order: Partial<InsertEstanteVirtualOrder>): Promise<EstanteVirtualOrder | undefined> {
    const [updatedOrder] = await db
      .update(estanteVirtualOrders)
      .set(order)
      .where(eq(estanteVirtualOrders.id, id))
      .returning();
    return updatedOrder;
  }

  async getDashboardStats(): Promise<{
    totalBooks: number;
    dailySales: number;
    lowStockCount: number;
    estanteVirtualCount: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const totalBooksResult = await db.select().from(books);
    const totalBooks = totalBooksResult.length;

    const dailySalesResult = await db
      .select()
      .from(sales)
      .where(and(
        eq(sales.createdAt, today),
        lt(sales.createdAt, tomorrow)
      ));
    
    const dailySales = dailySalesResult.reduce((sum, sale) => 
      sum + parseFloat(sale.totalAmount || "0"), 0
    );

    const lowStockResult = await db
      .select()
      .from(inventory)
      .where(and(
        lt(inventory.quantity, 5),
        eq(inventory.status, "available")
      ));
    const lowStockCount = lowStockResult.length;

    const estanteVirtualResult = await db
      .select()
      .from(inventory)
      .where(eq(inventory.sentToEstanteVirtual, true));
    const estanteVirtualCount = estanteVirtualResult.length;

    return {
      totalBooks,
      dailySales,
      lowStockCount,
      estanteVirtualCount
    };
  }

  // Settings methods
  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const existing = await this.getSetting(key);
    
    if (existing) {
      const [updated] = await db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(settings)
        .values({ key, value })
        .returning();
      return created;
    }
  }

  async getAllSettings(): Promise<Setting[]> {
    return await db.select().from(settings);
  }

  async getDashboardStats() {
    const [totalBooksResult] = await db.select({ count: sql<number>`count(*)` }).from(books);
    const totalBooks = totalBooksResult.count;

    // Get today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [dailySalesResult] = await db
      .select({ sum: sql<number>`coalesce(sum(${sales.totalAmount}), 0)` })
      .from(sales)
      .where(and(
        sql`${sales.createdAt} >= ${today}`,
        sql`${sales.createdAt} < ${tomorrow}`
      ));
    const dailySales = dailySalesResult.sum;

    // Get low stock count (threshold of 5)
    const lowStockBooks = await db
      .select()
      .from(inventory)
      .where(lt(inventory.quantity, 5));
    const lowStockCount = lowStockBooks.length;

    // Get books sent to Estante Virtual
    const [estanteVirtualResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventory)
      .where(eq(inventory.sentToEstanteVirtual, true));
    const estanteVirtualCount = estanteVirtualResult.count;

    return {
      totalBooks,
      dailySales,
      lowStockCount,
      estanteVirtualCount
    };
  }

  // Exchanges
  async createExchange(exchange: InsertExchange, items: InsertExchangeItem[], givenBooks: InsertExchangeGivenBook[]): Promise<ExchangeWithItems> {
    const [newExchange] = await db.insert(exchanges).values(exchange).returning();
    
    // Criar itens da troca (livros recebidos analisados da foto)
    const exchangeItemsWithId = items.map(item => ({
      ...item,
      exchangeId: newExchange.id
    }));
    
    const newItems = await db.insert(exchangeItems).values(exchangeItemsWithId).returning();
    
    // Criar livros dados na troca
    let newGivenBooks: ExchangeGivenBook[] = [];
    if (givenBooks.length > 0) {
      const givenBooksWithId = givenBooks.map(book => ({
        ...book,
        exchangeId: newExchange.id
      }));
      
      newGivenBooks = await db.insert(exchangeGivenBooks).values(givenBooksWithId).returning();
    }

    // Criar pré-cadastros dos livros analisados na foto
    const preCatalogBooksData = items.map(item => ({
      exchangeId: newExchange.id,
      bookTitle: item.bookTitle,
      bookAuthor: item.bookAuthor,
      estimatedSaleValue: item.estimatedSaleValue,
      publishYear: item.publishYear,
      condition: item.condition,
      isCompleteSeries: item.isCompleteSeries,
      finalTradeValue: item.finalTradeValue,
      status: 'pending' as const,
      confidence: 85, // default confidence
    }));

    const newPreCatalogBooks = await db.insert(preCatalogBooks).values(preCatalogBooksData).returning();
    
    return {
      ...newExchange,
      items: newItems,
      givenBooks: newGivenBooks,
      preCatalogBooks: newPreCatalogBooks
    };
  }

  async getExchange(id: number): Promise<ExchangeWithItems | undefined> {
    const [exchange] = await db.select().from(exchanges).where(eq(exchanges.id, id));
    if (!exchange) return undefined;
    
    const items = await db.select().from(exchangeItems).where(eq(exchangeItems.exchangeId, id));
    const givenBooks = await db.select().from(exchangeGivenBooks).where(eq(exchangeGivenBooks.exchangeId, id));
    const preCatalogBooksResult = await db.select().from(preCatalogBooks).where(eq(preCatalogBooks.exchangeId, id));
    
    return {
      ...exchange,
      items,
      givenBooks,
      preCatalogBooks: preCatalogBooksResult
    };
  }

  async getAllExchanges(): Promise<ExchangeWithItems[]> {
    const allExchanges = await db.select().from(exchanges).orderBy(desc(exchanges.createdAt));
    
    const exchangesWithItems = await Promise.all(
      allExchanges.map(async (exchange) => {
        const items = await db.select().from(exchangeItems).where(eq(exchangeItems.exchangeId, exchange.id));
        const givenBooks = await db.select().from(exchangeGivenBooks).where(eq(exchangeGivenBooks.exchangeId, exchange.id));
        const preCatalogBooksResult = await db.select().from(preCatalogBooks).where(eq(preCatalogBooks.exchangeId, exchange.id));
        return {
          ...exchange,
          items,
          givenBooks,
          preCatalogBooks: preCatalogBooksResult
        };
      })
    );
    
    return exchangesWithItems;
  }

  async updateExchange(id: number, exchange: Partial<InsertExchange>): Promise<Exchange | undefined> {
    const [updatedExchange] = await db
      .update(exchanges)
      .set({ ...exchange, updatedAt: new Date() })
      .where(eq(exchanges.id, id))
      .returning();
    return updatedExchange || undefined;
  }

  async deleteExchange(id: number): Promise<boolean> {
    // Delete items first due to foreign key constraint
    await db.delete(exchangeItems).where(eq(exchangeItems.exchangeId, id));
    await db.delete(exchangeGivenBooks).where(eq(exchangeGivenBooks.exchangeId, id));
    await db.delete(preCatalogBooks).where(eq(preCatalogBooks.exchangeId, id));
    const result = await db.delete(exchanges).where(eq(exchanges.id, id));
    return (result.rowCount || 0) > 0;
  }

  async processExchangeInventory(exchangeId: number): Promise<{ success: boolean; message: string; processedBooks: number; errors: string[] }> {
    const exchange = await this.getExchange(exchangeId);
    if (!exchange) {
      return { success: false, message: "Troca não encontrada", processedBooks: 0, errors: [] };
    }

    if (exchange.inventoryProcessed) {
      return { success: false, message: "Estoque já foi processado para esta troca", processedBooks: 0, errors: [] };
    }

    let processedBooks = 0;
    const errors: string[] = [];

    // Processar livros dados na troca (remover do estoque)
    for (const givenBook of exchange.givenBooks) {
      if (givenBook.inventoryProcessed) continue;

      try {
        if (givenBook.bookId) {
          // Livro existe no acervo, reduzir quantidade
          const bookInventory = await this.getInventory(givenBook.bookId);
          if (bookInventory && bookInventory.quantity >= givenBook.quantity) {
            await this.updateInventory(bookInventory.id, {
              quantity: bookInventory.quantity - givenBook.quantity
            });
            
            // Marcar como processado
            await db.update(exchangeGivenBooks)
              .set({ inventoryProcessed: true })
              .where(eq(exchangeGivenBooks.id, givenBook.id));
            
            processedBooks++;
          } else {
            errors.push(`Estoque insuficiente para o livro: ${givenBook.bookTitle}`);
          }
        } else {
          errors.push(`Livro não encontrado no acervo: ${givenBook.bookTitle}`);
        }
      } catch (error) {
        errors.push(`Erro ao processar ${givenBook.bookTitle}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }

    // Marcar exchange como processado se não houve erros críticos
    if (errors.length === 0) {
      await this.updateExchange(exchangeId, { inventoryProcessed: true });
    }

    return {
      success: errors.length === 0,
      message: errors.length === 0 ? "Estoque processado com sucesso" : `Processado com ${errors.length} erros`,
      processedBooks,
      errors
    };
  }

  // Pre-catalog books
  async getPreCatalogBooks(exchangeId?: number): Promise<PreCatalogBook[]> {
    if (exchangeId) {
      return await db.select().from(preCatalogBooks).where(eq(preCatalogBooks.exchangeId, exchangeId));
    }
    return await db.select().from(preCatalogBooks).where(eq(preCatalogBooks.status, 'pending')).orderBy(desc(preCatalogBooks.createdAt));
  }

  async processPreCatalogBook(id: number, bookData: InsertBook): Promise<Book> {
    const [preCatalogBook] = await db.select().from(preCatalogBooks).where(eq(preCatalogBooks.id, id));
    if (!preCatalogBook) {
      throw new Error("Livro de pré-cadastro não encontrado");
    }

    // Criar o livro no catálogo
    const newBook = await this.createBook(bookData);
    
    // Criar entrada no estoque
    await this.createInventory({
      bookId: newBook.id,
      quantity: 1,
      location: bookData.shelf || 'A definir',
      status: 'available'
    });

    // Marcar pré-cadastro como processado
    await db.update(preCatalogBooks)
      .set({ status: 'processed', updatedAt: new Date() })
      .where(eq(preCatalogBooks.id, id));

    return newBook;
  }

  async rejectPreCatalogBook(id: number, reason: string): Promise<boolean> {
    const result = await db.update(preCatalogBooks)
      .set({ 
        status: 'rejected', 
        notes: reason,
        updatedAt: new Date() 
      })
      .where(eq(preCatalogBooks.id, id));
    
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new DatabaseStorage();

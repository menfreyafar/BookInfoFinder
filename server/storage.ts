import { 
  books, 
  inventory, 
  sales, 
  saleItems, 
  categories,
  estanteVirtualOrders,
  estanteVirtualOrderItems,
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
  type EstanteVirtualOrderWithItems
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, like, lt } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();

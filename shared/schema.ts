import { sqliteTable, text, integer, real, blob } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const books = sqliteTable("books", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  isbn: text("isbn").unique(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  publisher: text("publisher"),
  publishYear: integer("publish_year"),
  edition: text("edition"),
  category: text("category"),
  productType: text("product_type").notNull().default("book"), // book, vinyl
  synopsis: text("synopsis"),
  weight: integer("weight"), // in grams
  usedPrice: real("used_price"),
  newPrice: real("new_price"),
  condition: text("condition"),
  coverImage: text("cover_image"),
  shelf: text("shelf"), // estante para organização
  uniqueCode: text("unique_code").unique(), // código único para identificação (LU-{ID}-{ANO})
  storedAt: integer("stored_at", { mode: 'timestamp' }), // quando foi guardado na estante
  isStored: integer("is_stored", { mode: 'boolean' }).default(false), // se já foi guardado fisicamente
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const inventory = sqliteTable("inventory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookId: integer("book_id").references(() => books.id).notNull(),
  quantity: integer("quantity").notNull().default(0),
  location: text("location"),
  status: text("status").notNull().default("available"), // available, reserved, sold
  sentToEstanteVirtual: integer("sent_to_estante_virtual", { mode: 'boolean' }).default(false),
  estanteVirtualId: text("estante_virtual_id"), // ID do livro na Estante Virtual
  lastSyncDate: integer("last_sync_date", { mode: 'timestamp' }), // Data da última sincronização
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const sales = sqliteTable("sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  totalAmount: real("total_amount").notNull(),
  paymentMethod: text("payment_method").notNull(), // cash, card, pix
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const saleItems = sqliteTable("sale_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  saleId: integer("sale_id").references(() => sales.id).notNull(),
  bookId: integer("book_id").references(() => books.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const estanteVirtualOrders = sqliteTable("estante_virtual_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: text("order_id").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerAddress: text("customer_address").notNull(),
  customerPhone: text("customer_phone"),
  totalAmount: real("total_amount").notNull(),
  shippingDeadline: integer("shipping_deadline", { mode: 'timestamp' }).notNull(), // prazo para postagem
  status: text("status").notNull().default("pending"), // pending, shipped, delivered
  trackingCode: text("tracking_code"),
  orderDate: integer("order_date", { mode: 'timestamp' }).notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const estanteVirtualOrderItems = sqliteTable("estante_virtual_order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").references(() => estanteVirtualOrders.id).notNull(),
  bookId: integer("book_id").references(() => books.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
});

export const exchanges = sqliteTable("exchanges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  totalTradeValue: real("total_trade_value").notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, cancelled
  notes: text("notes"),
  inventoryProcessed: integer("inventory_processed", { mode: 'boolean' }).default(false), // se o estoque já foi processado
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const exchangeItems = sqliteTable("exchange_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  exchangeId: integer("exchange_id").references(() => exchanges.id).notNull(),
  bookTitle: text("book_title").notNull(),
  bookAuthor: text("book_author"),
  estimatedSaleValue: real("estimated_sale_value").notNull(),
  publishYear: integer("publish_year"),
  condition: text("condition").notNull(), // novo, usado
  isCompleteSeries: integer("is_complete_series", { mode: 'boolean' }).default(false),
  basePercentage: integer("base_percentage").notNull(),
  valueBonus: integer("value_bonus").default(0),
  yearBonus: integer("year_bonus").default(0),
  finalPercentage: integer("final_percentage").notNull(),
  calculatedTradeValue: real("calculated_trade_value").notNull(),
  finalTradeValue: real("final_trade_value").notNull(),
  itemType: text("item_type").notNull().default("received"), // received (recebido) or given (dado)
});

export const exchangeGivenBooks = sqliteTable("exchange_given_books", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  exchangeId: integer("exchange_id").references(() => exchanges.id).notNull(),
  bookId: integer("book_id").references(() => books.id),
  bookTitle: text("book_title").notNull(),
  bookAuthor: text("book_author"),
  salePrice: real("sale_price").notNull(),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
  inventoryProcessed: integer("inventory_processed", { mode: 'boolean' }).default(false), // se foi removido do estoque
});

// Tabela para livros em pré-cadastro (vindos da análise de foto)
export const preCatalogBooks = sqliteTable("pre_catalog_books", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  exchangeId: integer("exchange_id").references(() => exchanges.id).notNull(),
  bookTitle: text("book_title").notNull(),
  bookAuthor: text("book_author"),
  estimatedSaleValue: real("estimated_sale_value").notNull(),
  publishYear: integer("publish_year"),
  condition: text("condition").notNull(), // novo, usado
  isCompleteSeries: integer("is_complete_series", { mode: 'boolean' }).default(false),
  finalTradeValue: real("final_trade_value").notNull(),
  status: text("status").notNull().default("pending"), // pending, processed, rejected
  category: text("category"),
  synopsis: text("synopsis"),
  coverImage: text("cover_image"),
  isbn: text("isbn"),
  publisher: text("publisher"),
  edition: text("edition"),
  weight: integer("weight"),
  shelf: text("shelf"),
  confidence: integer("confidence"), // confiança da análise IA (0-100)
  notes: text("notes"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const missingBooks = sqliteTable("missing_books", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  author: text("author").notNull(),
  isbn: text("isbn"),
  category: text("category").default("Clássico"),
  priority: integer("priority").default(1), // 1 = alta, 2 = média, 3 = baixa
  notes: text("notes"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  lastChecked: integer("last_checked", { mode: 'timestamp' }),
});

// Tabela para gerenciar estantes
export const shelves = sqliteTable("shelves", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
  location: text("location"), // localização física (ex: "Parede Norte", "Entrada")
  capacity: integer("capacity"), // capacidade máxima de livros
  currentCount: integer("current_count").default(0), // quantidade atual de livros
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Tabela para pedidos de clientes (Radar)
export const customerRequests = sqliteTable("customer_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title"), // opcional para buscas por temática/autor
  author: text("author"), // opcional para buscas específicas por título
  category: text("category"), // temática/categoria desejada
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  requestType: text("request_type").notNull().default("specific"), // specific, author, category
  notes: text("notes"),
  status: text("status").notNull().default("active"), // active, fulfilled, cancelled
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  fulfilledAt: integer("fulfilled_at", { mode: 'timestamp' }),
  fulfilledByBookId: integer("fulfilled_by_book_id").references(() => books.id),
});

export const bookTransfers = sqliteTable("book_transfers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookId: integer("book_id").notNull().references(() => books.id),
  fromShelfId: integer("from_shelf_id").references(() => shelves.id),
  toShelfId: integer("to_shelf_id").notNull().references(() => shelves.id),
  transferredAt: integer("transferred_at", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  transferredBy: text("transferred_by"),
  reason: text("reason"),
});

// Relations
export const booksRelations = relations(books, ({ one, many }) => ({
  inventory: one(inventory, {
    fields: [books.id],
    references: [inventory.bookId],
  }),
  saleItems: many(saleItems),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  book: one(books, {
    fields: [inventory.bookId],
    references: [books.id],
  }),
}));

export const salesRelations = relations(sales, ({ many }) => ({
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  book: one(books, {
    fields: [saleItems.bookId],
    references: [books.id],
  }),
}));

export const estanteVirtualOrdersRelations = relations(estanteVirtualOrders, ({ many }) => ({
  items: many(estanteVirtualOrderItems),
}));

export const estanteVirtualOrderItemsRelations = relations(estanteVirtualOrderItems, ({ one }) => ({
  order: one(estanteVirtualOrders, {
    fields: [estanteVirtualOrderItems.orderId],
    references: [estanteVirtualOrders.id],
  }),
  book: one(books, {
    fields: [estanteVirtualOrderItems.bookId],
    references: [books.id],
  }),
}));

export const exchangesRelations = relations(exchanges, ({ many }) => ({
  items: many(exchangeItems),
  givenBooks: many(exchangeGivenBooks),
  preCatalogBooks: many(preCatalogBooks),
}));

export const exchangeItemsRelations = relations(exchangeItems, ({ one }) => ({
  exchange: one(exchanges, {
    fields: [exchangeItems.exchangeId],
    references: [exchanges.id],
  }),
}));

export const exchangeGivenBooksRelations = relations(exchangeGivenBooks, ({ one }) => ({
  exchange: one(exchanges, {
    fields: [exchangeGivenBooks.exchangeId],
    references: [exchanges.id],
  }),
  book: one(books, {
    fields: [exchangeGivenBooks.bookId],
    references: [books.id],
  }),
}));

export const preCatalogBooksRelations = relations(preCatalogBooks, ({ one }) => ({
  exchange: one(exchanges, {
    fields: [preCatalogBooks.exchangeId],
    references: [exchanges.id],
  }),
}));

export const customerRequestsRelations = relations(customerRequests, ({ one }) => ({
  fulfilledByBook: one(books, {
    fields: [customerRequests.fulfilledByBookId],
    references: [books.id],
  }),
}));

export const bookTransfersRelations = relations(bookTransfers, ({ one }) => ({
  book: one(books, {
    fields: [bookTransfers.bookId],
    references: [books.id],
  }),
  fromShelf: one(shelves, {
    fields: [bookTransfers.fromShelfId],
    references: [shelves.id],
  }),
  toShelf: one(shelves, {
    fields: [bookTransfers.toShelfId],
    references: [shelves.id],
  }),
}));

// Schemas
export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  usedPrice: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    return typeof val === "string" ? parseFloat(val) : val;
  }),
  newPrice: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    return typeof val === "string" ? parseFloat(val) : val;
  }),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  createdAt: true,
});

export const insertSaleItemSchema = createInsertSchema(saleItems).omit({
  id: true,
  saleId: true,
});

export const insertExchangeSchema = createInsertSchema(exchanges).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExchangeItemSchema = createInsertSchema(exchangeItems).omit({
  id: true,
});

export const insertExchangeGivenBookSchema = createInsertSchema(exchangeGivenBooks).omit({
  id: true,
});

export const insertPreCatalogBookSchema = createInsertSchema(preCatalogBooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertEstanteVirtualOrderSchema = createInsertSchema(estanteVirtualOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEstanteVirtualOrderItemSchema = createInsertSchema(estanteVirtualOrderItems).omit({
  id: true,
});

export const insertMissingBookSchema = createInsertSchema(missingBooks).omit({
  id: true,
  createdAt: true,
  lastChecked: true,
});

export const insertShelfSchema = createInsertSchema(shelves).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentCount: true,
});

export const insertCustomerRequestSchema = createInsertSchema(customerRequests).omit({
  id: true,
  createdAt: true,
  fulfilledAt: true,
});

export const insertBookTransferSchema = createInsertSchema(bookTransfers).omit({
  id: true,
  transferredAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

export type Book = typeof books.$inferSelect;
export type InsertBook = z.infer<typeof insertBookSchema>;
export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type SaleItem = typeof saleItems.$inferSelect;
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

// Extended types for API responses
export type BookWithInventory = Book & {
  inventory: Inventory | null;
};

export type SaleWithItems = Sale & {
  items: (SaleItem & { book: Book })[];
};

export type EstanteVirtualOrder = typeof estanteVirtualOrders.$inferSelect;
export type InsertEstanteVirtualOrder = z.infer<typeof insertEstanteVirtualOrderSchema>;
export type EstanteVirtualOrderItem = typeof estanteVirtualOrderItems.$inferSelect;
export type InsertEstanteVirtualOrderItem = z.infer<typeof insertEstanteVirtualOrderItemSchema>;

export type EstanteVirtualOrderWithItems = EstanteVirtualOrder & {
  items: (EstanteVirtualOrderItem & { book: Book })[];
};

export type Exchange = typeof exchanges.$inferSelect;
export type InsertExchange = z.infer<typeof insertExchangeSchema>;
export type ExchangeItem = typeof exchangeItems.$inferSelect;
export type InsertExchangeItem = z.infer<typeof insertExchangeItemSchema>;
export type ExchangeGivenBook = typeof exchangeGivenBooks.$inferSelect;
export type InsertExchangeGivenBook = z.infer<typeof insertExchangeGivenBookSchema>;
export type PreCatalogBook = typeof preCatalogBooks.$inferSelect;
export type InsertPreCatalogBook = z.infer<typeof insertPreCatalogBookSchema>;

export type MissingBook = typeof missingBooks.$inferSelect;
export type InsertMissingBook = z.infer<typeof insertMissingBookSchema>;

export type Shelf = typeof shelves.$inferSelect;
export type InsertShelf = z.infer<typeof insertShelfSchema>;

export type CustomerRequest = typeof customerRequests.$inferSelect;
export type InsertCustomerRequest = z.infer<typeof insertCustomerRequestSchema>;

export type BookTransfer = typeof bookTransfers.$inferSelect;
export type InsertBookTransfer = z.infer<typeof insertBookTransferSchema>;

export type BookTransferWithDetails = BookTransfer & {
  book: Book;
  fromShelf: Shelf | null;
  toShelf: Shelf;
};

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type CustomerWithSales = Customer & {
  sales: Sale[];
};

export type ExchangeWithItems = Exchange & {
  items: ExchangeItem[];
  givenBooks: ExchangeGivenBook[];
  preCatalogBooks: PreCatalogBook[];
};

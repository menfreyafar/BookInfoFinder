import { pgTable, text, serial, integer, decimal, timestamp, boolean, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  isbn: varchar("isbn", { length: 20 }).unique(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  publisher: text("publisher"),
  publishYear: integer("publish_year"),
  edition: text("edition"),
  category: text("category"),
  productType: varchar("product_type", { length: 20 }).notNull().default("book"), // book, vinyl
  synopsis: text("synopsis"),
  weight: integer("weight"), // in grams
  usedPrice: decimal("used_price", { precision: 10, scale: 2 }),
  newPrice: decimal("new_price", { precision: 10, scale: 2 }),
  condition: text("condition"),
  coverImage: text("cover_image"),
  shelf: text("shelf"), // estante para organização
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").references(() => books.id).notNull(),
  quantity: integer("quantity").notNull().default(0),
  location: text("location"),
  status: varchar("status", { length: 20 }).notNull().default("available"), // available, reserved, sold
  sentToEstanteVirtual: boolean("sent_to_estante_virtual").default(false),
  estanteVirtualId: text("estante_virtual_id"), // ID do livro na Estante Virtual
  lastSyncDate: timestamp("last_sync_date"), // Data da última sincronização
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(), // cash, card, pix
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id).notNull(),
  bookId: integer("book_id").references(() => books.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const estanteVirtualOrders = pgTable("estante_virtual_orders", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerAddress: text("customer_address").notNull(),
  customerPhone: text("customer_phone"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  shippingDeadline: timestamp("shipping_deadline").notNull(), // prazo para postagem
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, shipped, delivered
  trackingCode: text("tracking_code"),
  orderDate: timestamp("order_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const estanteVirtualOrderItems = pgTable("estante_virtual_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => estanteVirtualOrders.id).notNull(),
  bookId: integer("book_id").references(() => books.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

export const exchanges = pgTable("exchanges", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  totalTradeValue: decimal("total_trade_value", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, completed, cancelled
  notes: text("notes"),
  inventoryProcessed: boolean("inventory_processed").default(false), // se o estoque já foi processado
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const exchangeItems = pgTable("exchange_items", {
  id: serial("id").primaryKey(),
  exchangeId: integer("exchange_id").references(() => exchanges.id).notNull(),
  bookTitle: text("book_title").notNull(),
  bookAuthor: text("book_author"),
  estimatedSaleValue: decimal("estimated_sale_value", { precision: 10, scale: 2 }).notNull(),
  publishYear: integer("publish_year"),
  condition: varchar("condition", { length: 20 }).notNull(), // novo, usado
  isCompleteSeries: boolean("is_complete_series").default(false),
  basePercentage: integer("base_percentage").notNull(),
  valueBonus: integer("value_bonus").default(0),
  yearBonus: integer("year_bonus").default(0),
  finalPercentage: integer("final_percentage").notNull(),
  calculatedTradeValue: decimal("calculated_trade_value", { precision: 10, scale: 2 }).notNull(),
  finalTradeValue: decimal("final_trade_value", { precision: 10, scale: 2 }).notNull(),
  itemType: varchar("item_type", { length: 20 }).notNull().default("received"), // received (recebido) or given (dado)
});

export const exchangeGivenBooks = pgTable("exchange_given_books", {
  id: serial("id").primaryKey(),
  exchangeId: integer("exchange_id").references(() => exchanges.id).notNull(),
  bookId: integer("book_id").references(() => books.id),
  bookTitle: text("book_title").notNull(),
  bookAuthor: text("book_author"),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
  inventoryProcessed: boolean("inventory_processed").default(false), // se foi removido do estoque
});

// Tabela para livros em pré-cadastro (vindos da análise de foto)
export const preCatalogBooks = pgTable("pre_catalog_books", {
  id: serial("id").primaryKey(),
  exchangeId: integer("exchange_id").references(() => exchanges.id).notNull(),
  bookTitle: text("book_title").notNull(),
  bookAuthor: text("book_author"),
  estimatedSaleValue: decimal("estimated_sale_value", { precision: 10, scale: 2 }).notNull(),
  publishYear: integer("publish_year"),
  condition: varchar("condition", { length: 20 }).notNull(), // novo, usado
  isCompleteSeries: boolean("is_complete_series").default(false),
  finalTradeValue: decimal("final_trade_value", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processed, rejected
  category: text("category"),
  synopsis: text("synopsis"),
  coverImage: text("cover_image"),
  isbn: varchar("isbn", { length: 20 }),
  publisher: text("publisher"),
  edition: text("edition"),
  weight: integer("weight"),
  shelf: text("shelf"),
  confidence: integer("confidence"), // confiança da análise IA (0-100)
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Schemas
export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export type ExchangeWithItems = Exchange & {
  items: ExchangeItem[];
  givenBooks: ExchangeGivenBook[];
  preCatalogBooks: PreCatalogBook[];
};

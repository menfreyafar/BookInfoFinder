export interface DashboardStats {
  totalBooks: number;
  dailySales: number;
  lowStockCount: number;
  estanteVirtualCount: number;
}

export interface CartItem {
  id: number;
  title: string;
  author: string;
  price: number;
  quantity: number;
}

export interface ISBNSearchResult {
  success: boolean;
  book?: any;
  exists?: boolean;
  error?: string;
}

export interface ImageAnalysisResult {
  condition: string;
  description: string;
  suggestedPrice: number;
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

export interface BookWithInventory {
  id: number;
  isbn: string;
  title: string;
  author: string;
  category: string;
  publisher: string;
  publishedYear: number;
  pages: number;
  price: number;
  condition: string;
  uniqueCode: string;
  isStored: boolean;
  createdAt: Date;
  updatedAt: Date;
  inventory: {
    id: number;
    bookId: number;
    quantity: number;
    location: string | null;
    status: string;
    sentToEstanteVirtual: boolean | null;
    estanteVirtualId: string | null;
    lastSyncDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

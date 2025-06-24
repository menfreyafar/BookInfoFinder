import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Book, 
  DollarSign, 
  AlertTriangle, 
  Globe, 
  Plus, 
  ShoppingCart, 
  Upload, 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Search,
  Camera,
  Image,
  FolderSync
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { DashboardStats, BookWithInventory } from "@/lib/types";

interface MissingBook {
  id: number;
  title: string;
  author: string;
  category: string;
  priority: number;
}

function MissingBooksAlert() {
  const { data: missingBooks = [] } = useQuery<MissingBook[]>({
    queryKey: ['/api/missing-books'],
    queryFn: () => fetch('/api/missing-books').then(res => res.json()),
    select: (data) => data.slice(0, 5), // Show only first 5
  });

  if (missingBooks.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">
        Todos os livros clássicos estão disponíveis
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {missingBooks.map((book) => (
        <div key={book.id} className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="text-yellow-600 w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{book.title}</h4>
            <p className="text-yellow-600 text-sm">{book.author}</p>
            <p className="text-yellow-600 text-xs">{book.category}</p>
          </div>
          <div className="text-yellow-600 text-xs font-medium">
            {book.priority === 1 ? 'Alta' : book.priority === 2 ? 'Média' : 'Baixa'}
          </div>
        </div>
      ))}
      {missingBooks.length > 0 && (
        <div className="text-center pt-2">
          <p className="text-yellow-600 text-sm font-medium">
            {missingBooks.length} livros clássicos precisam ser repostos
          </p>
        </div>
      )}
    </div>
  );
}

interface TopBarProps {
  title: string;
  description: string;
}

function TopBar({ title, description }: TopBarProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600">{description}</p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-gray-600 hover:text-gray-900">
            <AlertTriangle className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">AD</span>
            </div>
            <span className="text-gray-700 font-medium">Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  bgColor: string;
  textColor: string;
  onClick: () => void;
}

function QuickAction({ icon, title, bgColor, textColor, onClick }: QuickActionProps) {
  return (
    <button 
      onClick={onClick}
      className={`p-4 ${bgColor} ${textColor} rounded-lg hover:opacity-90 text-center transition-opacity`}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <p className="font-medium">{title}</p>
    </button>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [isbnSearch, setIsbnSearch] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: () => fetch("/api/dashboard/stats").then(res => res.json()) as Promise<DashboardStats>,
  });

  const { data: recentBooks } = useQuery({
    queryKey: ["/api/books"],
    queryFn: () => fetch("/api/books").then(res => res.json()) as Promise<BookWithInventory[]>,
    select: (data) => data.slice(0, 3), // Get only the 3 most recent
  });

  const { data: lowStockBooks } = useQuery({
    queryKey: ["/api/inventory/low-stock"],
    queryFn: () => fetch("/api/inventory/low-stock").then(res => res.json()) as Promise<BookWithInventory[]>,
    select: (data) => data.slice(0, 3), // Get only the 3 most critical
  });

  const handleISBNSearch = () => {
    if (isbnSearch.trim()) {
      setLocation(`/isbn-search?isbn=${encodeURIComponent(isbnSearch)}`);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-100 text-green-800">Disponível</Badge>;
      case 'reserved':
        return <Badge className="bg-yellow-100 text-yellow-800">Reservado</Badge>;
      case 'sold':
        return <Badge className="bg-gray-100 text-gray-800">Vendido</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <TopBar 
        title="Dashboard" 
        description="Visão geral da sua livraria" 
      />
      
      <main className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total de Livros</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {statsLoading ? "..." : (stats?.totalBooks || 0).toLocaleString()}
                  </p>
                  <p className="text-green-600 text-sm mt-1">
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    +12% este mês
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Book className="text-primary-600 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Vendas Hoje</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {statsLoading ? "..." : formatCurrency(stats?.dailySales || 0)}
                  </p>
                  <p className="text-green-600 text-sm mt-1">
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    +8% ontem
                  </p>
                </div>
                <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-secondary-600 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Estoque Baixo</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {statsLoading ? "..." : (stats?.lowStockCount || 0)}
                  </p>
                  <p className="text-red-600 text-sm mt-1">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Requer atenção
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="text-red-600 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Na Estante Virtual</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {statsLoading ? "..." : (stats?.estanteVirtualCount || 0).toLocaleString()}
                  </p>
                  <p className="text-blue-600 text-sm mt-1">
                    <FolderSync className="w-4 h-4 inline mr-1" />
                    Sincronizado
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Globe className="text-blue-600 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & ISBN Search */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* ISBN Search Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Busca Rápida por ISBN</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-3">
                <Input
                  placeholder="Digite o ISBN (ex: 9788522466191)"
                  value={isbnSearch}
                  onChange={(e) => setIsbnSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleISBNSearch()}
                  className="flex-1"
                />
                <Button onClick={handleISBNSearch} disabled={!isbnSearch.trim()}>
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </Button>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setLocation('/isbn-search?mode=scanner')}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Scanner
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setLocation('/isbn-search?mode=photo')}
                >
                  <Image className="w-4 h-4 mr-2" />
                  Foto do Livro
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <QuickAction
                  icon={<Plus />}
                  title="Novo Livro"
                  bgColor="bg-primary-50"
                  textColor="text-primary-700"
                  onClick={() => setLocation('/isbn-search')}
                />
                <QuickAction
                  icon={<ShoppingCart />}
                  title="Nova Venda"
                  bgColor="bg-secondary-50"
                  textColor="text-secondary-700"
                  onClick={() => setLocation('/pos')}
                />
                <QuickAction
                  icon={<Upload />}
                  title="Exportar"
                  bgColor="bg-orange-50"
                  textColor="text-orange-700"
                  onClick={() => setLocation('/export')}
                />
                <QuickAction
                  icon={<BarChart3 />}
                  title="Relatórios"
                  bgColor="bg-purple-50"
                  textColor="text-purple-700"
                  onClick={() => setLocation('/reports')}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Books & Inventory Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Books Added */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Livros Recentes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation('/catalog')}>
                Ver todos
              </Button>
            </CardHeader>
            <CardContent>
              {recentBooks?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Nenhum livro cadastrado ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {recentBooks?.map((book) => (
                    <div key={book.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                      <div className="w-10 h-12 bg-gray-200 rounded flex items-center justify-center">
                        <Book className="text-gray-500 w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{book.title}</h4>
                        <p className="text-gray-600 text-sm">{book.author}</p>
                        <p className="text-gray-500 text-xs">
                          {book.createdAt ? new Date(book.createdAt).toLocaleDateString() : 'Hoje'}
                        </p>
                      </div>
                      {getStatusBadge(book.inventory?.status || 'available')}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Missing Books Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Livros em Falta</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation('/missing-books')}>
                Ver todos
              </Button>
            </CardHeader>
            <CardContent>
              <MissingBooksAlert />
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alerts */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Alertas de Estoque Baixo</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation('/inventory')}>
                Gerenciar
              </Button>
            </CardHeader>
            <CardContent>
              {lowStockBooks?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Nenhum alerta de estoque
                </p>
              ) : (
                <div className="space-y-3">
                  {lowStockBooks?.map((book) => (
                    <div key={book.id} className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="text-red-600 w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{book.title}</h4>
                        <p className="text-red-600 text-sm">
                          {book.inventory?.quantity === 1 
                            ? "Apenas 1 exemplar restante"
                            : `${book.inventory?.quantity || 0} exemplares restantes`
                          }
                        </p>
                      </div>
                      <Button size="sm" className="bg-red-600 hover:bg-red-700">
                        Repor
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

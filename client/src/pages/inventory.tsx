import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Package, 
  AlertTriangle, 
  Edit, 
  Search,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BookWithInventory } from "@shared/schema";

function TopBar() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Controle de Estoque</h2>
          <p className="text-gray-600">Gerencie quantidades e localizações dos livros</p>
        </div>
      </div>
    </header>
  );
}

interface InventoryUpdateFormProps {
  book: BookWithInventory;
  onClose: () => void;
}

function InventoryUpdateForm({ book, onClose }: InventoryUpdateFormProps) {
  const [quantity, setQuantity] = useState(book.inventory?.quantity || 0);
  const [location, setLocation] = useState(book.inventory?.location || "");
  const [status, setStatus] = useState(book.inventory?.status || "available");
  const [sentToEstanteVirtual, setSentToEstanteVirtual] = useState(book.inventory?.sentToEstanteVirtual || false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!book.inventory?.id) {
        throw new Error("Inventory ID not found");
      }
      await apiRequest("PUT", `/api/inventory/${book.inventory.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Estoque Atualizado",
        description: "Informações do estoque atualizadas com sucesso",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar estoque: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      quantity,
      location,
      status,
      sentToEstanteVirtual
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="quantity">Quantidade</Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Disponível</SelectItem>
              <SelectItem value="reserved">Reservado</SelectItem>
              <SelectItem value="sold">Vendido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="location">Localização</Label>
        <Input
          id="location"
          placeholder="Ex: Estante A, Prateleira 3"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="estanteVirtual"
          checked={sentToEstanteVirtual}
          onChange={(e) => setSentToEstanteVirtual(e.target.checked)}
          className="rounded border-gray-300"
        />
        <Label htmlFor="estanteVirtual">
          Enviado para Estante Virtual
        </Label>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<BookWithInventory | null>(null);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("");

  const { data: books, isLoading } = useQuery({
    queryKey: ["/api/books"],
    queryFn: () => fetch("/api/books").then(res => res.json()) as Promise<BookWithInventory[]>,
  });

  const { data: lowStockBooks } = useQuery({
    queryKey: ["/api/inventory/low-stock"],
    queryFn: () => fetch("/api/inventory/low-stock").then(res => res.json()) as Promise<BookWithInventory[]>,
  });

  const filteredBooks = books?.filter(book => {
    const matchesSearch = !searchQuery || 
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.isbn?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !filterStatus || filterStatus === "all" || book.inventory?.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string, quantity: number) => {
    if (quantity === 0) {
      return <Badge variant="destructive">Esgotado</Badge>;
    }
    
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

  const getStockLevel = (quantity: number) => {
    if (quantity === 0) return "danger";
    if (quantity <= 3) return "warning";
    return "good";
  };

  const getStockIcon = (quantity: number) => {
    const level = getStockLevel(quantity);
    switch (level) {
      case "danger":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "good":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const totalBooks = books?.length || 0;
  const lowStockCount = lowStockBooks?.length || 0;
  const outOfStockCount = books?.filter(book => (book.inventory?.quantity || 0) === 0).length || 0;
  const totalQuantity = books?.reduce((sum, book) => sum + (book.inventory?.quantity || 0), 0) || 0;

  return (
    <>
      <TopBar />
      
      <main className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total de Itens</p>
                  <p className="text-3xl font-bold text-gray-900">{totalQuantity}</p>
                  <p className="text-gray-500 text-sm">{totalBooks} títulos únicos</p>
                </div>
                <Package className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Estoque Baixo</p>
                  <p className="text-3xl font-bold text-yellow-600">{lowStockCount}</p>
                  <p className="text-yellow-600 text-sm">≤ 3 unidades</p>
                </div>
                <AlertTriangle className="w-12 h-12 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Esgotados</p>
                  <p className="text-3xl font-bold text-red-600">{outOfStockCount}</p>
                  <p className="text-red-600 text-sm">0 unidades</p>
                </div>
                <XCircle className="w-12 h-12 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Disponíveis</p>
                  <p className="text-3xl font-bold text-green-600">
                    {books?.filter(book => 
                      book.inventory?.status === 'available' && 
                      (book.inventory?.quantity || 0) > 0
                    ).length || 0}
                  </p>
                  <p className="text-green-600 text-sm">Para venda</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alert */}
        {lowStockCount > 0 && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>{lowStockCount} livros</strong> com estoque baixo precisam de reposição.
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por título, autor ou ISBN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="available">Disponível</SelectItem>
              <SelectItem value="reserved">Reservado</SelectItem>
              <SelectItem value="sold">Vendido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle>Inventário</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex space-x-4">
                    <div className="w-16 h-20 bg-gray-200 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredBooks?.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchQuery ? "Nenhum item encontrado" : "Inventário vazio"}
                </h3>
                <p className="text-gray-600">
                  {searchQuery 
                    ? "Tente ajustar sua busca"
                    : "Adicione livros ao catálogo para gerenciar o estoque"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBooks?.map(book => (
                  <div key={book.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50">
                    <div className="w-16 h-20 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                      {book.coverImage ? (
                        <img 
                          src={book.coverImage} 
                          alt={book.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{book.title}</h3>
                      <p className="text-gray-600 text-sm">{book.author}</p>
                      {book.isbn && (
                        <p className="text-gray-500 text-xs">ISBN: {book.isbn}</p>
                      )}
                    </div>

                    <div className="text-center">
                      <div className="flex items-center space-x-2">
                        {getStockIcon(book.inventory?.quantity || 0)}
                        <span className="font-semibold text-lg">
                          {book.inventory?.quantity || 0}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs">unidades</p>
                    </div>

                    <div className="text-center min-w-0">
                      {getStatusBadge(book.inventory?.status || 'available', book.inventory?.quantity || 0)}
                      {book.inventory?.location && (
                        <p className="text-gray-500 text-xs mt-1 truncate">
                          {book.inventory.location}
                        </p>
                      )}
                    </div>

                    <div className="text-center">
                      {book.inventory?.sentToEstanteVirtual ? (
                        <Badge className="bg-blue-100 text-blue-800">
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Estante Virtual
                        </Badge>
                      ) : (
                        <Badge variant="outline">Não enviado</Badge>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedBook(book);
                        setShowUpdateForm(true);
                      }}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Update Form Dialog */}
        <Dialog open={showUpdateForm} onOpenChange={setShowUpdateForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atualizar Estoque</DialogTitle>
            </DialogHeader>
            {selectedBook && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center">
                    <Package className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="font-medium">{selectedBook.title}</h4>
                    <p className="text-sm text-gray-600">{selectedBook.author}</p>
                  </div>
                </div>
                <InventoryUpdateForm 
                  book={selectedBook}
                  onClose={() => {
                    setShowUpdateForm(false);
                    setSelectedBook(null);
                  }}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}

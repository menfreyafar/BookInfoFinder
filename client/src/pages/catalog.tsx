import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Book, 
  Edit, 
  Trash2, 
  Plus,
  Filter,
  SortAsc,
  SortDesc,
  Library
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import BookForm from "@/components/book-form";
import { BookWithInventory } from "@shared/schema";

function TopBar() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Catálogo</h2>
          <p className="text-gray-600">Gerencie todos os livros do seu acervo</p>
        </div>
        <Button className="bg-primary-500 hover:bg-primary-600">
          <Plus className="w-4 h-4 mr-2" />
          Novo Livro
        </Button>
      </div>
    </header>
  );
}

export default function Catalog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [sortBy, setSortBy] = useState<"title" | "author" | "createdAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedBook, setSelectedBook] = useState<BookWithInventory | null>(null);
  const [showBookForm, setShowBookForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<BookWithInventory | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: books, isLoading } = useQuery({
    queryKey: ["/api/books"],
    queryFn: () => fetch("/api/books").then(res => res.json()) as Promise<BookWithInventory[]>,
  });

  const { data: searchResults } = useQuery({
    queryKey: ["/api/books/search", searchQuery],
    enabled: searchQuery.length > 2,
    queryFn: () => fetch(`/api/books/search?q=${encodeURIComponent(searchQuery)}`)
      .then(res => res.json()) as Promise<BookWithInventory[]>,
  });

  const deleteMutation = useMutation({
    mutationFn: async (bookId: number) => {
      await apiRequest("DELETE", `/api/books/${bookId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Livro Removido",
        description: "Livro removido com sucesso do catálogo",
      });
      setShowDeleteDialog(false);
      setBookToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao remover livro: " + error.message,
        variant: "destructive",
      });
    },
  });

  const displayBooks = searchQuery.length > 2 ? searchResults : books;

  const filteredBooks = displayBooks?.filter(book => {
    if (selectedCategory && selectedCategory !== "all" && book.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  const sortedBooks = filteredBooks?.sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case "title":
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case "author":
        aValue = a.author.toLowerCase();
        bValue = b.author.toLowerCase();
        break;
      case "createdAt":
        aValue = new Date(a.createdAt || 0).getTime();
        bValue = new Date(b.createdAt || 0).getTime();
        break;
      default:
        return 0;
    }

    if (sortOrder === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const categories = Array.from(new Set(books?.map(book => book.category).filter(Boolean)));

  const getStatusBadge = (status: string, quantity: number) => {
    if (quantity === 0) {
      return <Badge variant="destructive">Esgotado</Badge>;
    }
    
    switch (status) {
      case 'available':
        return <Badge className="bg-green-100 text-green-800">Disponível ({quantity})</Badge>;
      case 'reserved':
        return <Badge className="bg-yellow-100 text-yellow-800">Reservado ({quantity})</Badge>;
      case 'sold':
        return <Badge className="bg-gray-100 text-gray-800">Vendido</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatCurrency = (value: string | undefined) => {
    if (!value) return "N/A";
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  const handleDelete = (book: BookWithInventory) => {
    setBookToDelete(book);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (bookToDelete) {
      deleteMutation.mutate(bookToDelete.id);
    }
  };

  return (
    <>
      <TopBar />
      
      <main className="p-6">
        {/* Filters and Search */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
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
            
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar por categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-') as [typeof sortBy, typeof sortOrder];
                setSortBy(field);
                setSortOrder(order);
              }}>
                <SelectTrigger className="w-48">
                  {sortOrder === "asc" ? <SortAsc className="w-4 h-4 mr-2" /> : <SortDesc className="w-4 h-4 mr-2" />}
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt-desc">Mais recentes</SelectItem>
                  <SelectItem value="createdAt-asc">Mais antigos</SelectItem>
                  <SelectItem value="title-asc">Título A-Z</SelectItem>
                  <SelectItem value="title-desc">Título Z-A</SelectItem>
                  <SelectItem value="author-asc">Autor A-Z</SelectItem>
                  <SelectItem value="author-desc">Autor Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              {isLoading ? "Carregando..." : `${sortedBooks?.length || 0} livros encontrados`}
            </p>
          </div>
        </div>

        {/* Books Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="w-full h-48 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedBooks?.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Library className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? "Nenhum livro encontrado" : "Catálogo vazio"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery 
                  ? "Tente ajustar sua busca ou filtros"
                  : "Comece adicionando livros ao seu catálogo"
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowBookForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeiro Livro
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedBooks?.map(book => (
              <Card key={book.id} className="group hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  {/* Book Cover */}
                  <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                    {book.coverImage ? (
                      <img 
                        src={book.coverImage} 
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Book className="w-12 h-12 text-gray-400" />
                    )}
                  </div>

                  {/* Book Info */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 h-12">
                      {book.title}
                    </h3>
                    <p className="text-gray-600 text-sm">{book.author}</p>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-primary-600 font-semibold">
                        {formatCurrency(book.usedPrice || book.newPrice)}
                      </span>
                      {getStatusBadge(
                        book.inventory?.status || 'available', 
                        book.inventory?.quantity || 0
                      )}
                    </div>

                    {book.category && (
                      <Badge variant="outline" className="text-xs">
                        {book.category}
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedBook(book);
                        setShowBookForm(true);
                      }}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDelete(book)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Book Form Dialog */}
        <Dialog open={showBookForm} onOpenChange={setShowBookForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedBook ? "Editar Livro" : "Novo Livro"}
              </DialogTitle>
            </DialogHeader>
            <BookForm 
              book={selectedBook || undefined}
              onClose={() => {
                setShowBookForm(false);
                setSelectedBook(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>
                Tem certeza que deseja remover o livro "{bookToDelete?.title}" do catálogo?
              </p>
              <p className="text-sm text-gray-600">
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteDialog(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Removendo..." : "Remover"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Package, PackageCheck, FileText, QrCode, Archive } from "lucide-react";
import type { Book, Shelf } from "@shared/schema";

interface BookToStore extends Book {
  inventory: { quantity: number } | null;
}

export default function StoragePage() {
  const [selectedShelf, setSelectedShelf] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  // Books waiting to be stored (cadastrados mas não guardados)
  const { data: booksToStore = [], isLoading: loadingBooks } = useQuery<BookToStore[]>({
    queryKey: ['books-to-store'],
    queryFn: async () => {
      const response = await fetch('/api/storage/pending');
      if (!response.ok) throw new Error('Erro ao carregar livros para guarda');
      return response.json();
    }
  });

  // Available shelves
  const { data: shelves = [], isLoading: loadingShelves } = useQuery<Shelf[]>({
    queryKey: ['shelves'],
    queryFn: async () => {
      const response = await fetch('/api/shelves');
      if (!response.ok) throw new Error('Erro ao carregar estantes');
      return response.json();
    }
  });

  // Mark book as stored
  const markStoredMutation = useMutation({
    mutationFn: async (bookId: number) => {
      const response = await fetch(`/api/storage/mark-stored/${bookId}`, {
        method: 'PATCH'
      });
      if (!response.ok) throw new Error('Erro ao marcar livro como guardado');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books-to-store'] });
      toast({
        title: "Sucesso",
        description: "Livro marcado como guardado"
      });
    }
  });

  // Generate storage PDF
  const generatePdfMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/storage/generate-pdf', {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Erro ao gerar PDF');
      const blob = await response.blob();
      
      // Download PDF
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lista-guarda-e-etiquetas-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "PDF Gerado",
        description: "Lista de guarda e etiquetas dos livros baixada com sucesso"
      });
    }
  });

  const filteredBooks = booksToStore.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.uniqueCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesShelf = selectedShelf === "all" || !selectedShelf || book.shelf === selectedShelf;
    return matchesSearch && matchesShelf;
  });

  const groupedByShelf = filteredBooks.reduce((acc, book) => {
    const shelf = book.shelf || "Sem Estante";
    if (!acc[shelf]) acc[shelf] = [];
    acc[shelf].push(book);
    return acc;
  }, {} as Record<string, BookToStore[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Guarda de Livros</h1>
          <p className="text-muted-foreground">
            Livros cadastrados aguardando para serem guardados nas estantes. O PDF inclui lista de verificação e etiquetas/marca-páginas para cada livro.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => generatePdfMutation.mutate()}
            disabled={generatePdfMutation.isPending || filteredBooks.length === 0}
            variant="outline"
          >
            <FileText className="h-4 w-4 mr-2" />
            Lista + Etiquetas PDF
          </Button>
          <Button
            onClick={() => {
              window.open('/api/storage/demo-pdf', '_blank');
            }}
            variant="secondary"
          >
            <FileText className="h-4 w-4 mr-2" />
            Ver Modelo
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                placeholder="Buscar por título, autor ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Select value={selectedShelf} onValueChange={setSelectedShelf}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por estante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as estantes</SelectItem>
                  {shelves.filter(shelf => shelf.name && shelf.name.trim() !== '').map((shelf) => (
                    <SelectItem key={shelf.id} value={shelf.name}>
                      {shelf.name} ({shelf.location || 'Sem localização'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Package className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{filteredBooks.length}</p>
              <p className="text-sm text-muted-foreground">Para Guardar</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Archive className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">{Object.keys(groupedByShelf).length}</p>
              <p className="text-sm text-muted-foreground">Estantes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <PackageCheck className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-2xl font-bold">
                {booksToStore.filter(b => b.isStored).length}
              </p>
              <p className="text-sm text-muted-foreground">Já Guardados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Books by Shelf */}
      <div className="space-y-6">
        {Object.entries(groupedByShelf).map(([shelfName, books]) => (
          <Card key={shelfName}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                {shelfName}
                <Badge variant="secondary">{books.length} livros</Badge>
              </CardTitle>
              <CardDescription>
                {shelves.find(s => s.name === shelfName)?.location || "Localização não definida"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {books.map((book) => (
                  <div
                    key={book.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={book.isStored}
                        onCheckedChange={() => {
                          if (!book.isStored) {
                            markStoredMutation.mutate(book.id);
                          }
                        }}
                        disabled={markStoredMutation.isPending}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{book.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {book.author}
                          {book.edition && ` • ${book.edition}`}
                          {book.condition && ` • ${book.condition}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {book.uniqueCode && (
                        <Badge variant="outline" className="font-mono text-xs">
                          <QrCode className="h-3 w-3 mr-1" />
                          {book.uniqueCode}
                        </Badge>
                      )}
                      {book.inventory?.quantity && (
                        <Badge variant="secondary">
                          Qtd: {book.inventory.quantity}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredBooks.length === 0 && !loadingBooks && (
        <Card>
          <CardContent className="text-center py-8">
            <PackageCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-muted-foreground">Nenhum livro aguardando para ser guardado</p>
            <p className="text-sm text-muted-foreground mt-2">
              Todos os livros foram organizados nas estantes
            </p>
          </CardContent>
        </Card>
      )}

      {loadingBooks && (
        <div className="text-center py-8">
          <p>Carregando livros para guarda...</p>
        </div>
      )}
    </div>
  );
}
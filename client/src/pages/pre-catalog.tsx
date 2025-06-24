import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Check, X, Edit, BookOpen, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PreCatalogBook {
  id: number;
  exchangeId: number;
  bookTitle: string;
  bookAuthor?: string;
  estimatedSaleValue: number;
  publishYear?: number;
  condition: 'novo' | 'usado';
  isCompleteSeries: boolean;
  finalTradeValue: number;
  status: 'pending' | 'processed' | 'rejected';
  category?: string;
  synopsis?: string;
  coverImage?: string;
  isbn?: string;
  publisher?: string;
  edition?: string;
  weight?: number;
  shelf?: string;
  confidence: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function PreCatalog() {
  const [selectedBook, setSelectedBook] = useState<PreCatalogBook | null>(null);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [bookFormData, setBookFormData] = useState({
    title: '',
    author: '',
    publisher: '',
    publishYear: '',
    edition: '',
    category: '',
    synopsis: '',
    usedPrice: '',
    newPrice: '',
    condition: 'usado',
    weight: '',
    shelf: '',
    isbn: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: preCatalogBooks = [], isLoading } = useQuery<PreCatalogBook[]>({
    queryKey: ['pre-catalog-books'],
    queryFn: async () => {
      const response = await fetch('/api/pre-catalog-books');
      if (!response.ok) throw new Error('Erro ao carregar livros em pré-cadastro');
      return response.json();
    }
  });

  const processBookMutation = useMutation({
    mutationFn: async ({ id, bookData }: { id: number; bookData: any }) => {
      const response = await fetch(`/api/pre-catalog-books/${id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao processar livro');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-catalog-books'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setShowProcessDialog(false);
      setSelectedBook(null);
      toast({
        title: "Sucesso",
        description: "Livro processado e adicionado ao catálogo"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const rejectBookMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await fetch(`/api/pre-catalog-books/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      
      if (!response.ok) throw new Error('Erro ao rejeitar livro');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-catalog-books'] });
      toast({
        title: "Sucesso",
        description: "Livro rejeitado"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleProcessBook = (book: PreCatalogBook) => {
    setSelectedBook(book);
    setBookFormData({
      title: book.bookTitle,
      author: book.bookAuthor || '',
      publisher: book.publisher || '',
      publishYear: book.publishYear?.toString() || '',
      edition: book.edition || '',
      category: book.category || '',
      synopsis: book.synopsis || '',
      usedPrice: book.estimatedSaleValue.toString(),
      newPrice: (book.estimatedSaleValue * 1.2).toFixed(2),
      condition: book.condition,
      weight: book.weight?.toString() || '',
      shelf: book.shelf || '',
      isbn: book.isbn || ''
    });
    setShowProcessDialog(true);
  };

  const handleSubmitProcess = () => {
    if (!selectedBook) return;

    const bookData = {
      title: bookFormData.title,
      author: bookFormData.author,
      publisher: bookFormData.publisher || null,
      publishYear: bookFormData.publishYear ? parseInt(bookFormData.publishYear) : null,
      edition: bookFormData.edition || null,
      category: bookFormData.category || null,
      synopsis: bookFormData.synopsis || null,
      usedPrice: parseFloat(bookFormData.usedPrice),
      newPrice: parseFloat(bookFormData.newPrice),
      condition: bookFormData.condition,
      weight: bookFormData.weight ? parseInt(bookFormData.weight) : null,
      shelf: bookFormData.shelf || null,
      isbn: bookFormData.isbn || null,
      productType: 'book'
    };

    processBookMutation.mutate({ id: selectedBook.id, bookData });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'processed': return 'Processado';
      case 'rejected': return 'Rejeitado';
      default: return status;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pré-Cadastros</h1>
          <p className="text-muted-foreground">
            Livros identificados em trocas aguardando processamento
          </p>
        </div>
      </div>

      {/* Books List */}
      <div className="space-y-4">
        {isLoading ? (
          <div>Carregando livros...</div>
        ) : preCatalogBooks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-muted-foreground">Nenhum livro em pré-cadastro</p>
            </CardContent>
          </Card>
        ) : (
          preCatalogBooks.filter(book => book.status === 'pending').map((book) => (
            <Card key={book.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {book.bookTitle}
                      <Badge className={getStatusColor(book.status)}>
                        {getStatusText(book.status)}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {book.bookAuthor && <span>{book.bookAuthor} • </span>}
                      Valor estimado: R$ {book.estimatedSaleValue.toFixed(2)} • 
                      Condição: {book.condition} • 
                      <span className={getConfidenceColor(book.confidence)}>
                        Confiança: {book.confidence}%
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleProcessBook(book)}
                      disabled={processBookMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Processar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={rejectBookMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rejeitar livro</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja rejeitar "{book.bookTitle}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => rejectBookMutation.mutate({ 
                              id: book.id, 
                              reason: "Rejeitado pelo usuário" 
                            })}
                          >
                            Rejeitar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <strong>Ano:</strong> {book.publishYear || 'Não informado'}
                  </div>
                  <div>
                    <strong>Série completa:</strong> {book.isCompleteSeries ? 'Sim' : 'Não'}
                  </div>
                  <div>
                    <strong>Valor de troca:</strong> R$ {book.finalTradeValue.toFixed(2)}
                  </div>
                </div>
                {book.notes && (
                  <div className="mt-2 text-sm text-gray-600">
                    <strong>Observações:</strong> {book.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Process Book Dialog */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Processar Livro</DialogTitle>
            <DialogDescription>
              Complete as informações do livro para adicioná-lo ao catálogo
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={bookFormData.title}
                  onChange={(e) => setBookFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="author">Autor</Label>
                <Input
                  id="author"
                  value={bookFormData.author}
                  onChange={(e) => setBookFormData(prev => ({ ...prev, author: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="isbn">ISBN</Label>
                <Input
                  id="isbn"
                  value={bookFormData.isbn}
                  onChange={(e) => setBookFormData(prev => ({ ...prev, isbn: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="publisher">Editora</Label>
                <Input
                  id="publisher"
                  value={bookFormData.publisher}
                  onChange={(e) => setBookFormData(prev => ({ ...prev, publisher: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="publishYear">Ano</Label>
                <Input
                  id="publishYear"
                  type="number"
                  value={bookFormData.publishYear}
                  onChange={(e) => setBookFormData(prev => ({ ...prev, publishYear: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={bookFormData.category}
                  onChange={(e) => setBookFormData(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edition">Edição</Label>
                <Input
                  id="edition"
                  value={bookFormData.edition}
                  onChange={(e) => setBookFormData(prev => ({ ...prev, edition: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="usedPrice">Preço Usado *</Label>
                <Input
                  id="usedPrice"
                  type="number"
                  step="0.01"
                  value={bookFormData.usedPrice}
                  onChange={(e) => setBookFormData(prev => ({ ...prev, usedPrice: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="newPrice">Preço Novo</Label>
                <Input
                  id="newPrice"
                  type="number"
                  step="0.01"
                  value={bookFormData.newPrice}
                  onChange={(e) => setBookFormData(prev => ({ ...prev, newPrice: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="condition">Condição</Label>
                <Select 
                  value={bookFormData.condition} 
                  onValueChange={(value) => setBookFormData(prev => ({ ...prev, condition: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="usado">Usado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weight">Peso (gramas)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={bookFormData.weight}
                  onChange={(e) => setBookFormData(prev => ({ ...prev, weight: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="shelf">Estante</Label>
                <Input
                  id="shelf"
                  value={bookFormData.shelf}
                  onChange={(e) => setBookFormData(prev => ({ ...prev, shelf: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="synopsis">Sinopse</Label>
              <Textarea
                id="synopsis"
                value={bookFormData.synopsis}
                onChange={(e) => setBookFormData(prev => ({ ...prev, synopsis: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProcessDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmitProcess}
              disabled={processBookMutation.isPending || !bookFormData.title.trim() || !bookFormData.usedPrice}
            >
              {processBookMutation.isPending ? 'Processando...' : 'Processar e Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check, X, Plus, BookOpen, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PreCatalogBook {
  id: number;
  exchangeId: number;
  bookTitle: string;
  bookAuthor?: string;
  estimatedSaleValue: number;
  publishYear?: number;
  condition: 'novo' | 'usado';
  finalTradeValue: number;
  status: 'pending' | 'processed' | 'rejected';
  confidence?: number;
  category?: string;
  isbn?: string;
  publisher?: string;
  createdAt: string;
}

export default function PreCatalog() {
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [selectedBook, setSelectedBook] = useState<PreCatalogBook | null>(null);
  const [bookData, setBookData] = useState({
    title: '',
    author: '',
    publisher: '',
    isbn: '',
    category: '',
    synopsis: '',
    usedPrice: 0,
    newPrice: 0,
    weight: 0,
    shelf: ''
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: preCatalogBooks = [], isLoading } = useQuery<PreCatalogBook[]>({
    queryKey: ['pre-catalog-books'],
    queryFn: async () => {
      const response = await fetch('/api/pre-catalog-books');
      if (!response.ok) throw new Error('Erro ao carregar pré-cadastros');
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
      setShowProcessDialog(false);
      setSelectedBook(null);
      toast({
        title: "Sucesso",
        description: "Livro adicionado ao catálogo principal",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
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
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao rejeitar livro');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-catalog-books'] });
      toast({
        title: "Livro Rejeitado",
        description: "Livro removido do pré-cadastro",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleProcessBook = (book: PreCatalogBook) => {
    setSelectedBook(book);
    setBookData({
      title: book.bookTitle,
      author: book.bookAuthor || '',
      publisher: book.publisher || '',
      isbn: book.isbn || '',
      category: book.category || '',
      synopsis: '',
      usedPrice: book.estimatedSaleValue,
      newPrice: book.estimatedSaleValue * 1.2,
      weight: 0,
      shelf: ''
    });
    setShowProcessDialog(true);
  };

  const handleRejectBook = (book: PreCatalogBook) => {
    const reason = prompt('Motivo da rejeição:');
    if (reason) {
      rejectBookMutation.mutate({ id: book.id, reason });
    }
  };

  const handleSubmitProcess = () => {
    if (!selectedBook || !bookData.title.trim()) {
      toast({
        title: "Erro",
        description: "Título é obrigatório",
        variant: "destructive",
      });
      return;
    }

    processBookMutation.mutate({
      id: selectedBook.id,
      bookData: {
        ...bookData,
        publishYear: selectedBook.publishYear,
        condition: selectedBook.condition
      }
    });
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

  const pendingBooks = preCatalogBooks.filter(book => book.status === 'pending');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pré-Cadastros</h1>
          <p className="text-muted-foreground">
            Livros identificados em trocas aguardando processamento
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <span className="text-sm font-medium">
            {pendingBooks.length} livros pendentes
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="text-center p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {pendingBooks.length}
            </div>
            <div className="text-sm text-yellow-600">Pendentes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center p-4">
            <div className="text-2xl font-bold text-green-600">
              {preCatalogBooks.filter(book => book.status === 'processed').length}
            </div>
            <div className="text-sm text-green-600">Processados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center p-4">
            <div className="text-2xl font-bold text-red-600">
              {preCatalogBooks.filter(book => book.status === 'rejected').length}
            </div>
            <div className="text-sm text-red-600">Rejeitados</div>
          </CardContent>
        </Card>
      </div>

      {/* Books List */}
      <div className="space-y-4">
        {isLoading ? (
          <div>Carregando pré-cadastros...</div>
        ) : preCatalogBooks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-muted-foreground">Nenhum livro em pré-cadastro</p>
              <p className="text-sm text-muted-foreground mt-2">
                Livros identificados em trocas aparecerão aqui
              </p>
            </CardContent>
          </Card>
        ) : (
          preCatalogBooks.map((book) => (
            <Card key={book.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {book.bookTitle}
                      <Badge className={getStatusColor(book.status)}>
                        {getStatusText(book.status)}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {book.bookAuthor && `${book.bookAuthor} • `}
                      Troca #{book.exchangeId} • R$ {book.estimatedSaleValue.toFixed(2)}
                      {book.confidence && ` • Confiança: ${book.confidence}%`}
                    </CardDescription>
                  </div>
                  {book.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleProcessBook(book)}
                        disabled={processBookMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Processar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectBook(book)}
                        disabled={rejectBookMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  <p><strong>Condição:</strong> {book.condition}</p>
                  {book.publishYear && <p><strong>Ano:</strong> {book.publishYear}</p>}
                  <p><strong>Valor da Troca:</strong> R$ {book.finalTradeValue.toFixed(2)}</p>
                  <p><strong>Data:</strong> {new Date(book.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Process Book Dialog */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Processar Livro</DialogTitle>
            <DialogDescription>
              Complete os dados do livro para adicioná-lo ao catálogo principal
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={bookData.title}
                onChange={(e) => setBookData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="author">Autor</Label>
              <Input
                id="author"
                value={bookData.author}
                onChange={(e) => setBookData(prev => ({ ...prev, author: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="publisher">Editora</Label>
              <Input
                id="publisher"
                value={bookData.publisher}
                onChange={(e) => setBookData(prev => ({ ...prev, publisher: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="isbn">ISBN</Label>
              <Input
                id="isbn"
                value={bookData.isbn}
                onChange={(e) => setBookData(prev => ({ ...prev, isbn: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={bookData.category} onValueChange={(value) => setBookData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Literatura">Literatura</SelectItem>
                  <SelectItem value="Ficção">Ficção</SelectItem>
                  <SelectItem value="Romance">Romance</SelectItem>
                  <SelectItem value="Suspense">Suspense</SelectItem>
                  <SelectItem value="Biografia">Biografia</SelectItem>
                  <SelectItem value="História">História</SelectItem>
                  <SelectItem value="Filosofia">Filosofia</SelectItem>
                  <SelectItem value="Autoajuda">Autoajuda</SelectItem>
                  <SelectItem value="Técnico">Técnico</SelectItem>
                  <SelectItem value="Infantil">Infantil</SelectItem>
                  <SelectItem value="Quadrinhos">Quadrinhos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="shelf">Prateleira</Label>
              <Input
                id="shelf"
                value={bookData.shelf}
                onChange={(e) => setBookData(prev => ({ ...prev, shelf: e.target.value }))}
                placeholder="Ex: A1, B2, etc."
              />
            </div>
            <div>
              <Label htmlFor="usedPrice">Preço Usado</Label>
              <Input
                id="usedPrice"
                type="number"
                step="0.01"
                value={bookData.usedPrice}
                onChange={(e) => setBookData(prev => ({ ...prev, usedPrice: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="newPrice">Preço Novo</Label>
              <Input
                id="newPrice"
                type="number"
                step="0.01"
                value={bookData.newPrice}
                onChange={(e) => setBookData(prev => ({ ...prev, newPrice: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="synopsis">Sinopse</Label>
              <Textarea
                id="synopsis"
                value={bookData.synopsis}
                onChange={(e) => setBookData(prev => ({ ...prev, synopsis: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProcessDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitProcess} disabled={processBookMutation.isPending}>
              {processBookMutation.isPending ? 'Processando...' : 'Adicionar ao Catálogo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
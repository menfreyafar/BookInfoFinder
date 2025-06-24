import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, Calculator, Check, X, Eye, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExchangeItem {
  id?: number;
  bookTitle: string;
  bookAuthor?: string;
  estimatedSaleValue: number;
  publishYear?: number;
  condition: 'novo' | 'usado';
  isCompleteSeries: boolean;
  basePercentage: number;
  valueBonus: number;
  yearBonus: number;
  finalPercentage: number;
  calculatedTradeValue: number;
  finalTradeValue: number;
  itemType: 'received' | 'given';
}

interface ExchangeGivenBook {
  id?: number;
  bookId?: number;
  bookTitle: string;
  bookAuthor?: string;
  salePrice: number;
  quantity: number;
  notes?: string;
}

interface Exchange {
  id: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  totalTradeValue: number;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: ExchangeItem[];
  givenBooks: ExchangeGivenBook[];
}

interface PhotoAnalysisResult {
  books: Array<{
    book: {
      title: string;
      author?: string;
      estimatedSaleValue: number;
      publishYear?: number;
      condition: 'novo' | 'usado';
      isCompleteSeries?: boolean;
      confidence: number;
    };
    calculation: {
      basePercentage: number;
      valueBonus: number;
      yearBonus: number;
      finalPercentage: number;
      calculatedTradeValue: number;
      finalTradeValue: number;
    };
  }>;
  totalTradeValue: number;
  bookCount: number;
  explanation: string;
}

export default function Exchanges() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysisResult | null>(null);
  const [showNewExchangeDialog, setShowNewExchangeDialog] = useState(false);
  const [newExchangeData, setNewExchangeData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: ''
  });
  const [givenBooks, setGivenBooks] = useState<ExchangeGivenBook[]>([]);
  const [showAddBookDialog, setShowAddBookDialog] = useState(false);
  const [newGivenBook, setNewGivenBook] = useState<ExchangeGivenBook>({
    bookTitle: '',
    bookAuthor: '',
    salePrice: 0,
    quantity: 1,
    notes: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: exchanges = [], isLoading } = useQuery<Exchange[]>({
    queryKey: ['exchanges'],
    queryFn: async () => {
      const response = await fetch('/api/exchanges');
      if (!response.ok) throw new Error('Erro ao carregar trocas');
      return response.json();
    }
  });

  const analyzePhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      
      const response = await fetch('/api/exchanges/analyze-photo', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao analisar foto');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setPhotoAnalysis(data);
      toast({
        title: "Análise concluída",
        description: `${data.bookCount} livros identificados na foto`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na análise",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const createExchangeMutation = useMutation({
    mutationFn: async (data: { exchange: any; items: ExchangeItem[]; givenBooks: ExchangeGivenBook[] }) => {
      const response = await fetch('/api/exchanges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar troca');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchanges'] });
      setShowNewExchangeDialog(false);
      setPhotoAnalysis(null);
      setSelectedFile(null);
      setGivenBooks([]);
      setNewExchangeData({ customerName: '', customerEmail: '', customerPhone: '', notes: '' });
      toast({
        title: "Sucesso",
        description: "Troca criada com sucesso. Livros da foto foram adicionados ao pré-cadastro.",
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

  const updateExchangeStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/exchanges/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) throw new Error('Erro ao atualizar status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchanges'] });
      toast({
        title: "Sucesso",
        description: "Status atualizado",
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      analyzePhotoMutation.mutate(file);
    }
  };

  const handleCreateExchange = () => {
    if (!photoAnalysis || !newExchangeData.customerName.trim()) {
      toast({
        title: "Erro",
        description: "Nome do cliente é obrigatório",
        variant: "destructive",
      });
      return;
    }

    const items: ExchangeItem[] = photoAnalysis.books.map(({ book, calculation }) => ({
      bookTitle: book.title,
      bookAuthor: book.author,
      estimatedSaleValue: book.estimatedSaleValue,
      publishYear: book.publishYear,
      condition: book.condition,
      isCompleteSeries: book.isCompleteSeries || false,
      basePercentage: calculation.basePercentage,
      valueBonus: calculation.valueBonus,
      yearBonus: calculation.yearBonus,
      finalPercentage: calculation.finalPercentage,
      calculatedTradeValue: calculation.calculatedTradeValue,
      finalTradeValue: calculation.finalTradeValue,
      itemType: 'received' // Books from photo analysis go to pre-catalog
    }));

    const exchange = {
      customerName: newExchangeData.customerName,
      customerEmail: newExchangeData.customerEmail || null,
      customerPhone: newExchangeData.customerPhone || null,
      totalTradeValue: photoAnalysis.totalTradeValue,
      status: 'pending',
      notes: newExchangeData.notes || null
    };

    createExchangeMutation.mutate({ exchange, items, givenBooks });
  };

  const addGivenBook = () => {
    if (!newGivenBook.bookTitle.trim() || newGivenBook.salePrice <= 0 || newGivenBook.quantity <= 0) {
      toast({
        title: "Erro",
        description: "Título, preço e quantidade são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setGivenBooks([...givenBooks, { ...newGivenBook }]);
    setNewGivenBook({
      bookTitle: '',
      bookAuthor: '',
      salePrice: 0,
      quantity: 1,
      notes: ''
    });
    setShowAddBookDialog(false);
  };

  const removeGivenBook = (index: number) => {
    setGivenBooks(givenBooks.filter((_, i) => i !== index));
  };

  const processInventoryMutation = useMutation({
    mutationFn: async (exchangeId: number) => {
      const response = await fetch(`/api/exchanges/${exchangeId}/process-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao processar estoque');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exchanges'] });
      toast({
        title: "Estoque Processado",
        description: `${data.processedBooks} livros removidos do estoque`,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'completed': return 'Concluída';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Trocas de Livros</h1>
          <p className="text-muted-foreground">
            Sistema de avaliação e gestão de trocas baseado na política Luar Sebo
          </p>
        </div>
        
        <Dialog open={showNewExchangeDialog} onOpenChange={setShowNewExchangeDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Troca
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Troca de Livros</DialogTitle>
              <DialogDescription>
                Faça upload de uma foto da pilha de livros para análise automática
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Photo Upload */}
              <div className="space-y-4">
                <Label>Foto dos Livros</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={analyzePhotoMutation.isPending}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {analyzePhotoMutation.isPending ? 'Analisando...' : 'Selecionar Foto'}
                  </Button>
                  {selectedFile && (
                    <p className="mt-2 text-sm text-gray-600">
                      Arquivo selecionado: {selectedFile.name}
                    </p>
                  )}
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      <strong>Temporariamente:</strong> A análise automática de fotos está limitada por cota da API. 
                      Você pode criar trocas manualmente adicionando os livros dados pelo cliente.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-2"
                      onClick={() => setPhotoAnalysis({
                        books: [],
                        totalTradeValue: 0,
                        bookCount: 0,
                        explanation: "Troca manual - adicione os livros dados pelo cliente abaixo"
                      })}
                    >
                      Criar Troca Manual
                    </Button>
                  </div>
                </div>
              </div>

              {/* Analysis Results */}
              {photoAnalysis && (
                <Card>
                  <CardHeader>
                    <CardTitle>Análise da Foto</CardTitle>
                    <CardDescription>
                      {photoAnalysis.bookCount} livros identificados
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {photoAnalysis.bookCount}
                        </div>
                        <div className="text-sm text-blue-600">Livros</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          R$ {photoAnalysis.totalTradeValue.toFixed(2)}
                        </div>
                        <div className="text-sm text-green-600">Valor Total</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {photoAnalysis.books.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{item.book.title}</div>
                            {item.book.author && (
                              <div className="text-sm text-gray-600">{item.book.author}</div>
                            )}
                            <div className="text-sm text-gray-500">
                              {item.book.condition} • {item.calculation.finalPercentage}% • 
                              Confiança: {item.book.confidence}%
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">
                              R$ {item.calculation.finalTradeValue.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500">
                              de R$ {item.book.estimatedSaleValue.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Books Given by Customer */}
              {photoAnalysis && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Livros Dados pelo Cliente</Label>
                    <Dialog open={showAddBookDialog} onOpenChange={setShowAddBookDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Livro
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Livro Dado</DialogTitle>
                          <DialogDescription>
                            Adicione um livro que o cliente está dando na troca
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="bookTitle">Título *</Label>
                            <Input
                              id="bookTitle"
                              value={newGivenBook.bookTitle}
                              onChange={(e) => setNewGivenBook(prev => ({ ...prev, bookTitle: e.target.value }))}
                              placeholder="Título do livro"
                            />
                          </div>
                          <div>
                            <Label htmlFor="bookAuthor">Autor</Label>
                            <Input
                              id="bookAuthor"
                              value={newGivenBook.bookAuthor}
                              onChange={(e) => setNewGivenBook(prev => ({ ...prev, bookAuthor: e.target.value }))}
                              placeholder="Nome do autor"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="salePrice">Preço de Venda *</Label>
                              <Input
                                id="salePrice"
                                type="number"
                                step="0.01"
                                min="0"
                                value={newGivenBook.salePrice}
                                onChange={(e) => setNewGivenBook(prev => ({ ...prev, salePrice: parseFloat(e.target.value) || 0 }))}
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <Label htmlFor="quantity">Quantidade *</Label>
                              <Input
                                id="quantity"
                                type="number"
                                min="1"
                                value={newGivenBook.quantity}
                                onChange={(e) => setNewGivenBook(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                placeholder="1"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="bookNotes">Observações</Label>
                            <Textarea
                              id="bookNotes"
                              value={newGivenBook.notes}
                              onChange={(e) => setNewGivenBook(prev => ({ ...prev, notes: e.target.value }))}
                              placeholder="Observações sobre o livro..."
                              rows={2}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowAddBookDialog(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={addGivenBook}>
                            Adicionar Livro
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {givenBooks.length > 0 && (
                    <div className="space-y-2">
                      {givenBooks.map((book, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex-1">
                            <div className="font-medium">{book.bookTitle}</div>
                            {book.bookAuthor && (
                              <div className="text-sm text-gray-600">{book.bookAuthor}</div>
                            )}
                            <div className="text-sm text-gray-500">
                              Qtd: {book.quantity} • Preço: R$ {book.salePrice.toFixed(2)}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm" 
                            onClick={() => removeGivenBook(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                    📋 <strong>Importante:</strong> Os livros dados pelo cliente serão automaticamente removidos do estoque quando a troca for processada.
                  </div>
                </div>
              )}

              {/* Customer Information */}
              {photoAnalysis && (
                <div className="space-y-4">
                  <Label>Dados do Cliente</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerName">Nome *</Label>
                      <Input
                        id="customerName"
                        value={newExchangeData.customerName}
                        onChange={(e) => setNewExchangeData(prev => ({ ...prev, customerName: e.target.value }))}
                        placeholder="Nome completo do cliente"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerPhone">Telefone</Label>
                      <Input
                        id="customerPhone"
                        value={newExchangeData.customerPhone}
                        onChange={(e) => setNewExchangeData(prev => ({ ...prev, customerPhone: e.target.value }))}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={newExchangeData.customerEmail}
                      onChange={(e) => setNewExchangeData(prev => ({ ...prev, customerEmail: e.target.value }))}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      value={newExchangeData.notes}
                      onChange={(e) => setNewExchangeData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Observações sobre a troca..."
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewExchangeDialog(false);
                  setPhotoAnalysis(null);
                  setSelectedFile(null);
                }}
              >
                Cancelar
              </Button>
              {photoAnalysis && (
                <Button
                  onClick={handleCreateExchange}
                  disabled={createExchangeMutation.isPending || !newExchangeData.customerName.trim()}
                >
                  {createExchangeMutation.isPending ? 'Criando...' : 'Criar Troca'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Exchanges List */}
      <div className="space-y-4">
        {isLoading ? (
          <div>Carregando trocas...</div>
        ) : exchanges.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma troca registrada ainda</p>
              <p className="text-sm text-muted-foreground mt-2">
                Clique em "Nova Troca" para começar
              </p>
            </CardContent>
          </Card>
        ) : (
          exchanges.map((exchange) => (
            <Card key={exchange.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {exchange.customerName}
                      <Badge className={getStatusColor(exchange.status)}>
                        {getStatusText(exchange.status)}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Troca #{exchange.id} • {exchange.items.length} livros • 
                      R$ {exchange.totalTradeValue.toFixed(2)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {exchange.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateExchangeStatusMutation.mutate({ id: exchange.id, status: 'completed' })}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Concluir
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateExchangeStatusMutation.mutate({ id: exchange.id, status: 'cancelled' })}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {exchange.customerPhone && (
                    <p className="text-sm"><strong>Telefone:</strong> {exchange.customerPhone}</p>
                  )}
                  {exchange.customerEmail && (
                    <p className="text-sm"><strong>Email:</strong> {exchange.customerEmail}</p>
                  )}
                  {exchange.notes && (
                    <p className="text-sm"><strong>Observações:</strong> {exchange.notes}</p>
                  )}
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Books Received (from photo) */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-blue-700">Livros Recebidos (Foto):</h4>
                      {exchange.items.filter(item => item.itemType === 'received').map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-blue-50 rounded border border-blue-200">
                          <div>
                            <div className="font-medium text-sm">{item.bookTitle}</div>
                            {item.bookAuthor && (
                              <div className="text-xs text-gray-600">{item.bookAuthor}</div>
                            )}
                            <div className="text-xs text-gray-500">
                              {item.condition} • {item.finalPercentage}%
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-sm text-green-600">
                              R$ {item.finalTradeValue.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              de R$ {item.estimatedSaleValue.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                      {exchange.items.filter(item => item.itemType === 'received').length === 0 && (
                        <p className="text-sm text-gray-500 italic">Nenhum livro analisado por foto</p>
                      )}
                    </div>

                    {/* Books Given by Customer */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-orange-700">Livros Dados pelo Cliente:</h4>
                      {exchange.givenBooks && exchange.givenBooks.map((book, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-orange-50 rounded border border-orange-200">
                          <div>
                            <div className="font-medium text-sm">{book.bookTitle}</div>
                            {book.bookAuthor && (
                              <div className="text-xs text-gray-600">{book.bookAuthor}</div>
                            )}
                            <div className="text-xs text-gray-500">
                              Qtd: {book.quantity} • Preço: R$ {book.salePrice.toFixed(2)}
                              {book.inventoryProcessed && <span className="text-green-600"> ✓ Processado</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!exchange.givenBooks || exchange.givenBooks.length === 0) && (
                        <p className="text-sm text-gray-500 italic">Nenhum livro dado pelo cliente</p>
                      )}
                    </div>
                  </div>

                  {/* Process Inventory Button */}
                  {exchange.status === 'completed' && !exchange.inventoryProcessed && exchange.givenBooks && exchange.givenBooks.length > 0 && (
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => processInventoryMutation.mutate(exchange.id)}
                        disabled={processInventoryMutation.isPending}
                      >
                        <Calculator className="h-4 w-4 mr-2" />
                        {processInventoryMutation.isPending ? 'Processando...' : 'Processar Estoque'}
                      </Button>
                      <p className="text-xs text-gray-500 mt-1">
                        Remove os livros dados pelo cliente do estoque
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
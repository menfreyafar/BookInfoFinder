import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, Plus, Trash2, Edit2, Upload, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface MissingBook {
  id: number;
  title: string;
  author: string;
  isbn?: string;
  category: string;
  priority: number;
  notes?: string;
  createdAt: string;
  lastChecked?: string;
}

function TopBar() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Livros em Falta</h2>
          <p className="text-gray-600">Gerencie os livros que devem sempre estar em estoque</p>
        </div>
      </div>
    </header>
  );
}

export default function MissingBooks() {
  const [newBook, setNewBook] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "Literatura Brasileira",
    priority: 1,
    notes: ""
  });
  const [editingBook, setEditingBook] = useState<MissingBook | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch missing books
  const { data: missingBooks = [], isLoading } = useQuery<MissingBook[]>({
    queryKey: ['/api/missing-books'],
    queryFn: async () => {
      const res = await fetch('/api/missing-books');
      if (!res.ok) {
        throw new Error('Failed to fetch missing books');
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Create missing book mutation
  const createMutation = useMutation({
    mutationFn: async (bookData: typeof newBook) => {
      const response = await apiRequest('/api/missing-books', {
        method: 'POST',
        data: bookData
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Livro adicionado à lista de faltantes"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/missing-books'] });
      setNewBook({
        title: "",
        author: "",
        isbn: "",
        category: "Literatura Brasileira",
        priority: 1,
        notes: ""
      });
      setShowAddDialog(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar livro",
        variant: "destructive"
      });
    }
  });

  // Update missing book mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MissingBook> }) => {
      const response = await apiRequest(`/api/missing-books/${id}`, {
        method: 'PUT',
        data
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Livro atualizado"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/missing-books'] });
      setShowEditDialog(false);
      setEditingBook(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar livro",
        variant: "destructive"
      });
    }
  });

  // Delete missing book mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/missing-books/${id}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Livro removido da lista"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/missing-books'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover livro",
        variant: "destructive"
      });
    }
  });

  // Import classics mutation
  const importClassicsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/missing-books/import-classics', {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sucesso",
        description: `${data.imported} livros clássicos importados`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/missing-books'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao importar clássicos",
        variant: "destructive"
      });
    }
  });

  const handleAddBook = () => {
    createMutation.mutate(newBook);
  };

  const handleEditBook = (book: MissingBook) => {
    setEditingBook(book);
    setShowEditDialog(true);
  };

  const handleUpdateBook = () => {
    if (editingBook) {
      updateMutation.mutate({
        id: editingBook.id,
        data: editingBook
      });
    }
  };

  const handleDeleteBook = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleImportClassics = () => {
    importClassicsMutation.mutate();
  };

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 1:
        return <Badge variant="destructive">Alta</Badge>;
      case 2:
        return <Badge variant="secondary">Média</Badge>;
      case 3:
        return <Badge variant="outline">Baixa</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      "Literatura Brasileira": "bg-green-100 text-green-800",
      "Literatura Estrangeira": "bg-blue-100 text-blue-800",
      "Filosofia": "bg-purple-100 text-purple-800",
      "Poesia Brasileira": "bg-pink-100 text-pink-800",
      "Teatro": "bg-yellow-100 text-yellow-800",
      "Fantasia": "bg-indigo-100 text-indigo-800",
      "Literatura Infantil": "bg-orange-100 text-orange-800",
      "Literatura Portuguesa": "bg-teal-100 text-teal-800"
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopBar />
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Carregando livros em falta...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold">Livros Essenciais</h3>
              <p className="text-gray-600">Total: {missingBooks.length} livros</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={handleImportClassics}
              variant="outline"
              disabled={importClassicsMutation.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              {importClassicsMutation.isPending ? "Importando..." : "Importar Clássicos"}
            </Button>
            
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Livro
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Adicionar Livro em Falta</DialogTitle>
                  <DialogDescription>
                    Adicione um livro que deve sempre estar em estoque
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="title" className="text-right">
                      Título
                    </Label>
                    <Input
                      id="title"
                      value={newBook.title}
                      onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="author" className="text-right">
                      Autor
                    </Label>
                    <Input
                      id="author"
                      value={newBook.author}
                      onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category" className="text-right">
                      Categoria
                    </Label>
                    <Select value={newBook.category} onValueChange={(value) => setNewBook({ ...newBook, category: value })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Literatura Brasileira">Literatura Brasileira</SelectItem>
                        <SelectItem value="Literatura Estrangeira">Literatura Estrangeira</SelectItem>
                        <SelectItem value="Filosofia">Filosofia</SelectItem>
                        <SelectItem value="Poesia Brasileira">Poesia Brasileira</SelectItem>
                        <SelectItem value="Teatro">Teatro</SelectItem>
                        <SelectItem value="Fantasia">Fantasia</SelectItem>
                        <SelectItem value="Literatura Infantil">Literatura Infantil</SelectItem>
                        <SelectItem value="Literatura Portuguesa">Literatura Portuguesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="priority" className="text-right">
                      Prioridade
                    </Label>
                    <Select value={newBook.priority.toString()} onValueChange={(value) => setNewBook({ ...newBook, priority: parseInt(value) })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Alta</SelectItem>
                        <SelectItem value="2">Média</SelectItem>
                        <SelectItem value="3">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="notes" className="text-right">
                      Observações
                    </Label>
                    <Textarea
                      id="notes"
                      value={newBook.notes}
                      onChange={(e) => setNewBook({ ...newBook, notes: e.target.value })}
                      className="col-span-3"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleAddBook} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Adicionando..." : "Adicionar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!isLoading && missingBooks && missingBooks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {missingBooks.map((book) => (
            <Card key={book.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight">{book.title}</CardTitle>
                    <CardDescription className="mt-1">{book.author}</CardDescription>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditBook(book)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover livro</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover "{book.title}" da lista de livros em falta?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteBook(book.id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(book.category)}`}>
                    {book.category}
                  </span>
                  {getPriorityBadge(book.priority)}
                </div>
                {book.notes && (
                  <p className="text-sm text-gray-600 mb-3">{book.notes}</p>
                )}
                <div className="text-xs text-gray-500">
                  Adicionado em {new Date(book.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Carregando...</h3>
            <p className="text-gray-600">Buscando livros em falta...</p>
          </div>
        )}

        {!isLoading && (!missingBooks || missingBooks.length === 0) && (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum livro em falta</h3>
            <p className="text-gray-600">Adicione livros que devem sempre estar em estoque.</p>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Editar Livro</DialogTitle>
              <DialogDescription>
                Edite as informações do livro em falta
              </DialogDescription>
            </DialogHeader>
            {editingBook && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-title" className="text-right">
                    Título
                  </Label>
                  <Input
                    id="edit-title"
                    value={editingBook.title}
                    onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-author" className="text-right">
                    Autor
                  </Label>
                  <Input
                    id="edit-author"
                    value={editingBook.author}
                    onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-category" className="text-right">
                    Categoria
                  </Label>
                  <Select value={editingBook.category} onValueChange={(value) => setEditingBook({ ...editingBook, category: value })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Literatura Brasileira">Literatura Brasileira</SelectItem>
                      <SelectItem value="Literatura Estrangeira">Literatura Estrangeira</SelectItem>
                      <SelectItem value="Filosofia">Filosofia</SelectItem>
                      <SelectItem value="Poesia Brasileira">Poesia Brasileira</SelectItem>
                      <SelectItem value="Teatro">Teatro</SelectItem>
                      <SelectItem value="Fantasia">Fantasia</SelectItem>
                      <SelectItem value="Literatura Infantil">Literatura Infantil</SelectItem>
                      <SelectItem value="Literatura Portuguesa">Literatura Portuguesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-priority" className="text-right">
                    Prioridade
                  </Label>
                  <Select value={editingBook.priority.toString()} onValueChange={(value) => setEditingBook({ ...editingBook, priority: parseInt(value) })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Alta</SelectItem>
                      <SelectItem value="2">Média</SelectItem>
                      <SelectItem value="3">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-notes" className="text-right">
                    Observações
                  </Label>
                  <Textarea
                    id="edit-notes"
                    value={editingBook.notes || ""}
                    onChange={(e) => setEditingBook({ ...editingBook, notes: e.target.value })}
                    className="col-span-3"
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" onClick={handleUpdateBook} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
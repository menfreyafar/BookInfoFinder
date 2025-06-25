import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Archive } from "lucide-react";
import type { Shelf, InsertShelf } from "@shared/schema";

export default function ShelvesManagement() {
  const [newShelf, setNewShelf] = useState<InsertShelf>({
    name: "",
    description: "",
    location: "",
    capacity: undefined
  });
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);
  const [isShelfDialogOpen, setIsShelfDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: shelves = [], isLoading: loadingShelves } = useQuery<Shelf[]>({
    queryKey: ['shelves'],
    queryFn: async () => {
      const response = await fetch('/api/shelves');
      if (!response.ok) throw new Error('Erro ao carregar estantes');
      return response.json();
    }
  });

  const createShelfMutation = useMutation({
    mutationFn: async (data: InsertShelf) => {
      const response = await fetch('/api/shelves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Erro ao criar estante');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelves'] });
      setNewShelf({ name: "", description: "", location: "", capacity: undefined });
      setIsShelfDialogOpen(false);
      toast({
        title: "Sucesso",
        description: "Estante criada com sucesso"
      });
    }
  });

  const updateShelfMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: InsertShelf }) => {
      const response = await fetch(`/api/shelves/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Erro ao atualizar estante');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelves'] });
      setEditingShelf(null);
      setIsShelfDialogOpen(false);
      toast({
        title: "Sucesso",
        description: "Estante atualizada com sucesso"
      });
    }
  });

  const deleteShelfMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/shelves/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao remover estante');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelves'] });
      toast({
        title: "Sucesso",
        description: "Estante removida com sucesso"
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

  const handleCreateShelf = () => {
    if (!newShelf.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome da estante é obrigatório",
        variant: "destructive"
      });
      return;
    }
    createShelfMutation.mutate(newShelf);
  };

  const handleUpdateShelf = () => {
    if (!editingShelf || !editingShelf.name.trim()) return;
    updateShelfMutation.mutate({
      id: editingShelf.id,
      data: {
        name: editingShelf.name,
        description: editingShelf.description,
        location: editingShelf.location,
        capacity: editingShelf.capacity
      }
    });
  };

  const openEditDialog = (shelf: Shelf) => {
    setEditingShelf(shelf);
    setIsShelfDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingShelf(null);
    setNewShelf({ name: "", description: "", location: "", capacity: undefined });
    setIsShelfDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Gerenciar Estantes
            </CardTitle>
            <CardDescription>
              Configure as estantes para organização dos livros
            </CardDescription>
          </div>
          <Dialog open={isShelfDialogOpen} onOpenChange={setIsShelfDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Estante
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingShelf ? 'Editar Estante' : 'Nova Estante'}
                </DialogTitle>
                <DialogDescription>
                  Configure as informações da estante
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="shelf-name">Nome *</Label>
                  <Input
                    id="shelf-name"
                    value={editingShelf ? editingShelf.name : newShelf.name}
                    onChange={(e) => {
                      if (editingShelf) {
                        setEditingShelf({ ...editingShelf, name: e.target.value });
                      } else {
                        setNewShelf({ ...newShelf, name: e.target.value });
                      }
                    }}
                    placeholder="Ex: A1, B2, Filosofia..."
                  />
                </div>
                <div>
                  <Label htmlFor="shelf-location">Localização</Label>
                  <Input
                    id="shelf-location"
                    value={editingShelf ? (editingShelf.location || "") : (newShelf.location || "")}
                    onChange={(e) => {
                      if (editingShelf) {
                        setEditingShelf({ ...editingShelf, location: e.target.value });
                      } else {
                        setNewShelf({ ...newShelf, location: e.target.value });
                      }
                    }}
                    placeholder="Ex: Parede Norte, Entrada..."
                  />
                </div>
                <div>
                  <Label htmlFor="shelf-description">Descrição</Label>
                  <Textarea
                    id="shelf-description"
                    value={editingShelf ? (editingShelf.description || "") : (newShelf.description || "")}
                    onChange={(e) => {
                      if (editingShelf) {
                        setEditingShelf({ ...editingShelf, description: e.target.value });
                      } else {
                        setNewShelf({ ...newShelf, description: e.target.value });
                      }
                    }}
                    placeholder="Descrição opcional da estante..."
                  />
                </div>
                <div>
                  <Label htmlFor="shelf-capacity">Capacidade</Label>
                  <Input
                    id="shelf-capacity"
                    type="number"
                    value={editingShelf ? (editingShelf.capacity || "") : (newShelf.capacity || "")}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : undefined;
                      if (editingShelf) {
                        setEditingShelf({ ...editingShelf, capacity: value });
                      } else {
                        setNewShelf({ ...newShelf, capacity: value });
                      }
                    }}
                    placeholder="Número máximo de livros"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsShelfDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={editingShelf ? handleUpdateShelf : handleCreateShelf}
                    disabled={createShelfMutation.isPending || updateShelfMutation.isPending}
                  >
                    {editingShelf ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loadingShelves ? (
          <div>Carregando estantes...</div>
        ) : (
          <div className="space-y-3">
            {shelves.map((shelf) => (
              <div
                key={shelf.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{shelf.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {shelf.location && `${shelf.location} • `}
                    {shelf.capacity ? `Capacidade: ${shelf.capacity} livros` : 'Sem limite de capacidade'}
                  </div>
                  {shelf.description && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {shelf.description}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(shelf)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteShelfMutation.mutate(shelf.id)}
                    disabled={deleteShelfMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {shelves.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma estante configurada
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
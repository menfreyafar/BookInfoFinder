import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowRightLeft, Package } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { BookWithInventory, Shelf } from "@shared/schema";

interface BookTransferDialogProps {
  book: BookWithInventory;
  children: React.ReactNode;
}

export default function BookTransferDialog({ book, children }: BookTransferDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedShelfId, setSelectedShelfId] = useState("");
  const [reason, setReason] = useState("");
  const [transferredBy, setTransferredBy] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch shelves
  const { data: shelves = [] } = useQuery<Shelf[]>({
    queryKey: ["/api/shelves"],
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (data: { to_shelf_id: number; reason?: string; transferred_by?: string }) => {
      return apiRequest(`/api/books/${book.id}/transfer`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Transferência realizada",
        description: `${book.title} foi transferido com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: [`/api/books/${book.id}/transfers`] });
      setOpen(false);
      setSelectedShelfId("");
      setReason("");
      setTransferredBy("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro na transferência",
        description: error.message || "Erro ao transferir livro",
        variant: "destructive",
      });
    },
  });

  const handleTransfer = () => {
    if (!selectedShelfId) {
      toast({
        title: "Estante obrigatória",
        description: "Selecione a estante de destino",
        variant: "destructive",
      });
      return;
    }

    transferMutation.mutate({
      to_shelf_id: parseInt(selectedShelfId),
      reason: reason || "Transferência manual",
      transferred_by: transferredBy || "Usuário",
    });
  };

  const currentShelf = shelves.find(s => s.id === book.inventory?.shelf_id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transferir Livro
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm">{book.title}</h4>
            <p className="text-sm text-gray-600">{book.author}</p>
            {currentShelf && (
              <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                <Package className="h-3 w-3" />
                Atual: {currentShelf.name}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="shelf">Estante de Destino</Label>
            <Select value={selectedShelfId} onValueChange={setSelectedShelfId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a estante" />
              </SelectTrigger>
              <SelectContent>
                {shelves
                  .filter(shelf => shelf.id !== book.inventory?.shelf_id)
                  .map((shelf) => (
                    <SelectItem key={shelf.id} value={shelf.id.toString()}>
                      {shelf.name} - {shelf.description}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transferredBy">Responsável pela Transferência</Label>
            <Input
              id="transferredBy"
              value={transferredBy}
              onChange={(e) => setTransferredBy(e.target.value)}
              placeholder="Nome do responsável"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da Transferência</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reorganização, demanda, etc."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleTransfer} 
              disabled={transferMutation.isPending || !selectedShelfId}
              className="flex-1"
            >
              {transferMutation.isPending ? "Transferindo..." : "Transferir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
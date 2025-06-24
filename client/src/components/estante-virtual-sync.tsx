import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, 
  Upload, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Settings
} from 'lucide-react';

interface SyncResult {
  bookId: number;
  title: string;
  success: boolean;
  message: string;
}

interface EstanteVirtualSyncProps {
  bookId?: number;
  bookTitle?: string;
  isInEstanteVirtual?: boolean;
  onSyncComplete?: () => void;
}

export default function EstanteVirtualSync({ 
  bookId, 
  bookTitle, 
  isInEstanteVirtual = false,
  onSyncComplete 
}: EstanteVirtualSyncProps) {
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Upload individual book
  const uploadBookMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/estante-virtual/upload-book/${id}`, {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Livro enviado para Estante Virtual com sucesso"
        });
      } else {
        toast({
          title: "Erro",
          description: data.message || "Erro ao enviar livro",
          variant: "destructive"
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      onSyncComplete?.();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao enviar livro para Estante Virtual",
        variant: "destructive"
      });
    }
  });

  // Sync inventory
  const syncInventoryMutation = useMutation({
    mutationFn: async (data: { bookId?: number }) => {
      const response = await apiRequest('/api/estante-virtual/sync-inventory', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.results) {
        setSyncResults(data.results);
      }
      
      toast({
        title: data.success ? "Sucesso" : "Aviso",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      onSyncComplete?.();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao sincronizar estoque",
        variant: "destructive"
      });
    }
  });

  // Remove from Estante Virtual
  const removeBookMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/estante-virtual/book/${id}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Sucesso" : "Erro",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      onSyncComplete?.();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover livro da Estante Virtual",
        variant: "destructive"
      });
    }
  });

  const isLoading = uploadBookMutation.isPending || 
                   syncInventoryMutation.isPending || 
                   removeBookMutation.isPending;

  if (bookId) {
    // Individual book controls
    return (
      <div className="flex gap-2">
        {!isInEstanteVirtual ? (
          <Button
            size="sm"
            onClick={() => uploadBookMutation.mutate(bookId)}
            disabled={isLoading}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Enviar para Estante Virtual
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => syncInventoryMutation.mutate({ bookId })}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Sincronizar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => removeBookMutation.mutate(bookId)}
              disabled={isLoading}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Remover
            </Button>
          </>
        )}
      </div>
    );
  }

  // Bulk sync controls
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Sincronização com Estante Virtual
        </CardTitle>
        <CardDescription>
          Sincronize o estoque local com a Estante Virtual para manter os dados atualizados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={() => syncInventoryMutation.mutate({})}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Sincronizar Todos os Livros
          </Button>
        </div>

        {syncResults.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-semibold">Resultados da Sincronização:</h4>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {syncResults.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="font-medium">{result.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "Sucesso" : "Erro"}
                      </Badge>
                      {result.message && (
                        <span className="text-sm text-gray-600">
                          {result.message}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4 animate-spin" />
            <span>Sincronizando...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
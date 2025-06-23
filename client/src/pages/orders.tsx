import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addBusinessDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { EstanteVirtualOrderWithItems } from "@shared/schema";
import { Package, Printer, Clock, Truck } from "lucide-react";

function TopBar() {
  return (
    <div className="bg-gradient-to-r from-orange-500 to-yellow-400 text-black p-6 rounded-lg mb-6">
      <div className="flex items-center space-x-3">
        <Package className="w-8 h-8" />
        <div>
          <h1 className="text-2xl font-bold">Pedidos Estante Virtual</h1>
          <p className="text-black-700">Gerencie pedidos, etiquetas e prazos de envio</p>
        </div>
      </div>
    </div>
  );
}

interface PrintLabelModalProps {
  order: EstanteVirtualOrderWithItems;
  onClose: () => void;
}

function PrintLabelModal({ order, onClose }: PrintLabelModalProps) {
  const [trackingCode, setTrackingCode] = useState("");
  const { toast } = useToast();

  const generateShippingLabel = () => {
    const labelContent = `
      ETIQUETA DE ENVIO
      ==================
      
      Pedido: ${order.orderId}
      Cliente: ${order.customerName}
      Endereço: ${order.customerAddress}
      Telefone: ${order.customerPhone || "Não informado"}
      
      ITENS:
      ${order.items.map(item => `- ${item.book.title} (${item.quantity}x)`).join('\n')}
      
      Valor Total: R$ ${Number(order.totalAmount).toFixed(2)}
      Prazo de Postagem: ${format(new Date(order.shippingDeadline), "dd/MM/yyyy", { locale: ptBR })}
      
      ==================
      
      DECLARAÇÃO DE CONTEÚDO
      ==================
      
      Remetente: LibraryPro
      Destinatário: ${order.customerName}
      
      Conteúdo:
      ${order.items.map(item => 
        `- ${item.book.title}
          Valor: R$ ${Number(item.unitPrice).toFixed(2)}
          Peso: ${item.book.weight || 300}g`
      ).join('\n')}
      
      Peso Total: ${order.items.reduce((total, item) => total + (item.book.weight || 300) * item.quantity, 0)}g
      Valor Total: R$ ${Number(order.totalAmount).toFixed(2)}
      
      Natureza: Livros/Discos
      ==================
    `;

    // Create a printable window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Etiqueta - Pedido ${order.orderId}</title>
            <style>
              body { font-family: monospace; margin: 20px; }
              pre { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <pre>${labelContent}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }

    toast({
      title: "Etiqueta gerada",
      description: "A etiqueta foi aberta para impressão",
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4">
        <CardHeader>
          <CardTitle>Imprimir Etiqueta - Pedido {order.orderId}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cliente</Label>
              <p className="text-sm bg-muted p-2 rounded">{order.customerName}</p>
            </div>
            <div>
              <Label>Prazo de Postagem</Label>
              <p className="text-sm bg-muted p-2 rounded">
                {format(new Date(order.shippingDeadline), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div>
            <Label>Endereço</Label>
            <p className="text-sm bg-muted p-2 rounded">{order.customerAddress}</p>
          </div>

          <div>
            <Label>Itens</Label>
            <div className="bg-muted p-2 rounded text-sm space-y-1">
              {order.items.map((item, index) => (
                <div key={index}>
                  {item.book.title} - Qtd: {item.quantity}
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="trackingCode">Código de Rastreamento (opcional)</Label>
            <Input
              id="trackingCode"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              placeholder="BR123456789BR"
            />
          </div>

          <div className="flex space-x-2">
            <Button onClick={generateShippingLabel} className="flex items-center space-x-2">
              <Printer className="w-4 h-4" />
              <span>Imprimir Etiqueta</span>
            </Button>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Orders() {
  const [selectedOrder, setSelectedOrder] = useState<EstanteVirtualOrderWithItems | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["/api/estante-virtual/orders"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/estante-virtual/orders");
      return response.json();
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status, trackingCode }: { orderId: number; status: string; trackingCode?: string }) => {
      const response = await apiRequest("PATCH", `/api/estante-virtual/orders/${orderId}`, {
        status,
        trackingCode,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estante-virtual/orders"] });
      toast({
        title: "Status atualizado",
        description: "O status do pedido foi atualizado com sucesso",
      });
    },
  });

  const handlePrintLabel = (order: EstanteVirtualOrderWithItems) => {
    setSelectedOrder(order);
    setShowPrintModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "shipped": return "bg-blue-500";
      case "delivered": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return "Pendente";
      case "shipped": return "Enviado";
      case "delivered": return "Entregue";
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <TopBar />
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TopBar />

      <div className="grid gap-6">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum pedido encontrado</h3>
              <p className="text-muted-foreground">
                Os pedidos da Estante Virtual aparecerão aqui quando importados
              </p>
            </CardContent>
          </Card>
        ) : (
          orders.map((order: EstanteVirtualOrderWithItems) => (
            <Card key={order.id} className="border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>Pedido {order.orderId}</span>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusText(order.status)}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {order.customerName} • {format(new Date(order.orderDate), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">R$ {Number(order.totalAmount).toFixed(2)}</p>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Clock className="w-4 h-4 mr-1" />
                      Prazo: {format(new Date(order.shippingDeadline), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Endereço de Entrega:</h4>
                    <p className="text-sm text-muted-foreground">{order.customerAddress}</p>
                    {order.customerPhone && (
                      <p className="text-sm text-muted-foreground">Tel: {order.customerPhone}</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Itens do Pedido:</h4>
                    <div className="space-y-1">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.book.title} (x{item.quantity})</span>
                          <span>R$ {Number(item.totalPrice).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.trackingCode && (
                    <div>
                      <h4 className="font-medium mb-1">Código de Rastreamento:</h4>
                      <p className="text-sm font-mono bg-muted p-2 rounded">{order.trackingCode}</p>
                    </div>
                  )}

                  <div className="flex space-x-2 pt-4 border-t">
                    <Button 
                      onClick={() => handlePrintLabel(order)}
                      variant="outline"
                      className="flex items-center space-x-2"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Imprimir Etiqueta</span>
                    </Button>
                    
                    {order.status === "pending" && (
                      <Button 
                        onClick={() => updateOrderStatus.mutate({ 
                          orderId: order.id, 
                          status: "shipped" 
                        })}
                        className="flex items-center space-x-2"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Marcar como Enviado</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {showPrintModal && selectedOrder && (
        <PrintLabelModal 
          order={selectedOrder} 
          onClose={() => setShowPrintModal(false)} 
        />
      )}
    </div>
  );
}
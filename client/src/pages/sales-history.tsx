import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  ShoppingCart,
  User,
  Phone,
  Eye
} from "lucide-react";
import { SaleWithItems } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
import TopBar from "@/components/topbar";

export default function SalesHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState<SaleWithItems | null>(null);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["/api/sales"],
  });

  const filteredSales = sales.filter((sale: SaleWithItems) =>
    sale.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.id.toString().includes(searchTerm)
  );

  const getPaymentMethodBadge = (method: string) => {
    const variants = {
      cash: "bg-green-100 text-green-800",
      card: "bg-blue-100 text-blue-800", 
      pix: "bg-purple-100 text-purple-800"
    };
    
    const labels = {
      cash: "Dinheiro",
      card: "Cartão",
      pix: "PIX"
    };

    return (
      <Badge className={variants[method as keyof typeof variants] || "bg-gray-100 text-gray-800"}>
        {labels[method as keyof typeof labels] || method}
      </Badge>
    );
  };

  return (
    <>
      <TopBar />
      
      <main className="p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Histórico de Vendas</h1>
            <p className="text-gray-600 mt-2">Visualize todas as vendas realizadas</p>
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nome do cliente, telefone ou número da venda..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button variant="outline" className="flex items-center space-x-2">
                <Filter className="w-4 h-4" />
                <span>Filtros</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Vendas */}
        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Carregando vendas...</p>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600">Nenhuma venda encontrada</p>
            </div>
          ) : (
            filteredSales.map((sale: SaleWithItems) => (
              <Card key={sale.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <ShoppingCart className="w-6 h-6 text-primary-600" />
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            Venda #{sale.id}
                          </h3>
                          {getPaymentMethodBadge(sale.paymentMethod)}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(sale.createdAt)}</span>
                          </div>
                          
                          {sale.customerName && (
                            <div className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>{sale.customerName}</span>
                            </div>
                          )}
                          
                          {sale.customerPhone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="w-4 h-4" />
                              <span>{sale.customerPhone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(sale.totalAmount)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {sale.items?.length || 0} {(sale.items?.length || 0) === 1 ? 'item' : 'itens'}
                          </p>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSale(sale)}
                          className="flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Ver</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Modal de Detalhes da Venda */}
        {selectedSale && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Detalhes da Venda #{selectedSale.id}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSale(null)}
                  >
                    Fechar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Informações do Cliente */}
                <div>
                  <h4 className="font-semibold mb-2">Informações do Cliente</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><strong>Nome:</strong> {selectedSale.customerName || "Não informado"}</p>
                    <p><strong>Telefone:</strong> {selectedSale.customerPhone || "Não informado"}</p>
                    <p><strong>E-mail:</strong> {selectedSale.customerEmail || "Não informado"}</p>
                  </div>
                </div>

                {/* Informações da Venda */}
                <div>
                  <h4 className="font-semibold mb-2">Informações da Venda</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><strong>Data:</strong> {formatDate(selectedSale.createdAt)}</p>
                    <p><strong>Forma de Pagamento:</strong> {selectedSale.paymentMethod}</p>
                    <p><strong>Total:</strong> {formatCurrency(selectedSale.totalAmount)}</p>
                  </div>
                </div>

                {/* Itens da Venda */}
                <div>
                  <h4 className="font-semibold mb-2">Itens da Venda</h4>
                  <div className="space-y-2">
                    {selectedSale.items?.map((item) => (
                      <div key={item.id} className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-medium">{item.book?.title}</p>
                          <p className="text-sm text-gray-600">{item.book?.author}</p>
                          <p className="text-sm text-gray-600">Qtd: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(item.totalPrice)}</p>
                          <p className="text-sm text-gray-600">
                            Unit: {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </>
  );
}
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import POSModal from "@/components/pos-modal";
import { useQuery } from "@tanstack/react-query";
import { 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  Clock,
  Plus
} from "lucide-react";
import { SaleWithItems } from "@shared/schema";

function TopBar() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ponto de Venda</h2>
          <p className="text-gray-600">Processe vendas e gerencie transações</p>
        </div>
        <Button className="bg-secondary-500 hover:bg-secondary-600">
          <Plus className="w-4 h-4 mr-2" />
          Nova Venda
        </Button>
      </div>
    </header>
  );
}

export default function POS() {
  const [showPOSModal, setShowPOSModal] = useState(false);

  const { data: sales, isLoading } = useQuery({
    queryKey: ["/api/sales"],
    queryFn: () => fetch("/api/sales").then(res => res.json()) as Promise<SaleWithItems[]>,
  });

  const todaySales = sales?.filter(sale => {
    const saleDate = new Date(sale.createdAt || "");
    const today = new Date();
    return saleDate.toDateString() === today.toDateString();
  });

  const todayRevenue = todaySales?.reduce((sum, sale) => 
    sum + parseFloat(sale.totalAmount || "0"), 0
  ) || 0;

  const recentSales = sales?.slice(0, 10) || [];

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('pt-BR');
  };

  const getPaymentMethodBadge = (method: string) => {
    const methods = {
      cash: { label: "Dinheiro", color: "bg-green-100 text-green-800" },
      card: { label: "Cartão", color: "bg-blue-100 text-blue-800" },
      pix: { label: "PIX", color: "bg-purple-100 text-purple-800" }
    };
    
    const methodInfo = methods[method as keyof typeof methods] || { label: method, color: "bg-gray-100 text-gray-800" };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${methodInfo.color}`}>
        {methodInfo.label}
      </span>
    );
  };

  return (
    <>
      <TopBar />
      
      <main className="p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Vendas Hoje</p>
                  <p className="text-3xl font-bold text-gray-900">{todaySales?.length || 0}</p>
                  <p className="text-green-600 text-sm mt-1">
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    Transações
                  </p>
                </div>
                <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="text-secondary-600 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Receita Hoje</p>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrency(todayRevenue)}</p>
                  <p className="text-green-600 text-sm mt-1">
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    Faturamento
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-green-600 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Ticket Médio</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {todaySales?.length ? formatCurrency(todayRevenue / todaySales.length) : formatCurrency(0)}
                  </p>
                  <p className="text-blue-600 text-sm mt-1">
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    Por venda
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="text-blue-600 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full h-16 text-lg bg-secondary-500 hover:bg-secondary-600"
                onClick={() => setShowPOSModal(true)}
              >
                <ShoppingCart className="w-6 h-6 mr-3" />
                Iniciar Nova Venda
              </Button>
              
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-12">
                  <Clock className="w-4 h-4 mr-2" />
                  Vendas do Dia
                </Button>
                <Button variant="outline" className="h-12">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Relatório
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Sales */}
          <Card>
            <CardHeader>
              <CardTitle>Vendas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentSales.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhuma venda realizada
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Comece processando sua primeira venda
                  </p>
                  <Button onClick={() => setShowPOSModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Venda
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-secondary-100 rounded-full flex items-center justify-center">
                          <ShoppingCart className="w-5 h-5 text-secondary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            Venda #{sale.id}
                          </p>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm text-gray-600">
                              {sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}
                            </p>
                            {getPaymentMethodBadge(sale.paymentMethod)}
                          </div>
                          <p className="text-xs text-gray-500">
                            {sale.createdAt ? formatDate(sale.createdAt) : ""}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(sale.totalAmount || "0")}
                        </p>
                        {sale.customerName && (
                          <p className="text-sm text-gray-600">{sale.customerName}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Methods Summary */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Resumo por Forma de Pagamento (Hoje)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {["cash", "card", "pix"].map((method) => {
                const methodSales = todaySales?.filter(sale => sale.paymentMethod === method) || [];
                const methodRevenue = methodSales.reduce((sum, sale) => 
                  sum + parseFloat(sale.totalAmount || "0"), 0
                );
                
                const methodLabels = {
                  cash: { label: "Dinheiro", icon: DollarSign, color: "text-green-600" },
                  card: { label: "Cartão", icon: ShoppingCart, color: "text-blue-600" },
                  pix: { label: "PIX", icon: Clock, color: "text-purple-600" }
                };
                
                const methodInfo = methodLabels[method as keyof typeof methodLabels];
                const Icon = methodInfo.icon;
                
                return (
                  <div key={method} className="text-center">
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${methodInfo.color}`} />
                    </div>
                    <h3 className="font-semibold text-gray-900">{methodInfo.label}</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(methodRevenue)}</p>
                    <p className="text-gray-600 text-sm">{methodSales.length} transações</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* POS Modal */}
        <POSModal 
          open={showPOSModal}
          onClose={() => setShowPOSModal(false)}
        />
      </main>
    </>
  );
}

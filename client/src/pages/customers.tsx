import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Plus, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  ShoppingCart,
  Edit,
  Trash2
} from "lucide-react";
import { Customer, CustomerWithSales } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TopBar from "@/components/topbar";

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithSales | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["/api/customers"],
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      const response = await apiRequest("POST", "/api/customers", customerData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsAddDialogOpen(false);
      setNewCustomer({ name: "", email: "", phone: "", address: "", notes: "" });
      toast({
        title: "Cliente Cadastrado",
        description: "Cliente cadastrado com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar cliente: " + error.message,
        variant: "destructive",
      });
    },
  });

  const filteredCustomers = customers.filter((customer: CustomerWithSales) =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone) {
      toast({
        title: "Erro",
        description: "Nome e telefone são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    createCustomerMutation.mutate(newCustomer);
  };

  const getTotalSpent = (customer: CustomerWithSales) => {
    return customer.sales?.reduce((total, sale) => total + (sale.totalAmount || 0), 0) || 0;
  };

  const getLastPurchase = (customer: CustomerWithSales) => {
    if (!customer.sales || customer.sales.length === 0) return null;
    return customer.sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  };

  return (
    <>
      <TopBar />
      
      <main className="p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-600 mt-2">Gerencie sua base de clientes e histórico de compras</p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Novo Cliente</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                    placeholder="Nome completo do cliente"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                    placeholder="cliente@email.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                    placeholder="Endereço completo"
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={newCustomer.notes}
                    onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                    placeholder="Observações sobre o cliente"
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateCustomer} disabled={createCustomerMutation.isPending}>
                    {createCustomerMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nome, telefone ou e-mail..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Clientes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-600">Carregando clientes...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <User className="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600">Nenhum cliente encontrado</p>
            </div>
          ) : (
            filteredCustomers.map((customer: CustomerWithSales) => {
              const totalSpent = getTotalSpent(customer);
              const lastPurchase = getLastPurchase(customer);
              
              return (
                <Card key={customer.id} className="hover:shadow-md transition-shadow cursor-pointer" 
                      onClick={() => setSelectedCustomer(customer)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                          <p className="text-sm text-gray-600">Cliente #{customer.id}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {customer.phone && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      
                      {customer.email && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                      
                      {customer.address && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{customer.address}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="text-gray-600">Total Gasto</p>
                          <p className="font-semibold text-primary-600">
                            {formatCurrency(totalSpent)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-600">Compras</p>
                          <p className="font-semibold">
                            {customer.sales?.length || 0}
                          </p>
                        </div>
                      </div>
                      
                      {lastPurchase && (
                        <p className="text-xs text-gray-500 mt-2">
                          Última compra: {formatDate(lastPurchase.createdAt)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Modal de Detalhes do Cliente */}
        {selectedCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Detalhes do Cliente - {selectedCustomer.name}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    Fechar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Informações do Cliente */}
                <div>
                  <h4 className="font-semibold mb-4">Informações Pessoais</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Nome</p>
                      <p className="font-medium">{selectedCustomer.name}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Telefone</p>
                      <p className="font-medium">{selectedCustomer.phone || "Não informado"}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">E-mail</p>
                      <p className="font-medium">{selectedCustomer.email || "Não informado"}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Cliente desde</p>
                      <p className="font-medium">{formatDate(selectedCustomer.createdAt)}</p>
                    </div>
                  </div>
                  
                  {selectedCustomer.address && (
                    <div className="bg-gray-50 p-4 rounded-lg mt-4">
                      <p className="text-sm text-gray-600">Endereço</p>
                      <p className="font-medium">{selectedCustomer.address}</p>
                    </div>
                  )}
                  
                  {selectedCustomer.notes && (
                    <div className="bg-gray-50 p-4 rounded-lg mt-4">
                      <p className="text-sm text-gray-600">Observações</p>
                      <p className="font-medium">{selectedCustomer.notes}</p>
                    </div>
                  )}
                </div>

                {/* Estatísticas */}
                <div>
                  <h4 className="font-semibold mb-4">Estatísticas de Compras</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-600">{selectedCustomer.sales?.length || 0}</p>
                      <p className="text-sm text-blue-600">Total de Compras</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(getTotalSpent(selectedCustomer))}</p>
                      <p className="text-sm text-green-600">Total Gasto</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {selectedCustomer.sales?.length ? formatCurrency(getTotalSpent(selectedCustomer) / selectedCustomer.sales.length) : "R$ 0,00"}
                      </p>
                      <p className="text-sm text-purple-600">Ticket Médio</p>
                    </div>
                  </div>
                </div>

                {/* Histórico de Compras */}
                <div>
                  <h4 className="font-semibold mb-4">Histórico de Compras</h4>
                  {!selectedCustomer.sales || selectedCustomer.sales.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="mx-auto w-12 h-12 text-gray-400 mb-4" />
                      <p className="text-gray-600">Nenhuma compra registrada</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedCustomer.sales
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((sale) => (
                        <div key={sale.id} className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                          <div>
                            <p className="font-medium">Venda #{sale.id}</p>
                            <p className="text-sm text-gray-600">{formatDate(sale.createdAt)}</p>
                            <p className="text-sm text-gray-600">
                              {sale.items?.length || 0} {(sale.items?.length || 0) === 1 ? 'item' : 'itens'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-lg">{formatCurrency(sale.totalAmount)}</p>
                            <Badge variant="outline">{sale.paymentMethod}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </>
  );
}
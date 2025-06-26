import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, 
  Plus, 
  Phone, 
  Mail, 
  MapPin,
  ShoppingBag,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Customer, Sale } from "@shared/schema";

function TopBar() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
          <p className="text-gray-600">Gerencie o cadastro e histórico de clientes</p>
        </div>
      </div>
    </header>
  );
}

interface CustomerWithSales extends Customer {
  sales: Sale[];
}

export default function CustomersPage() {
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithSales | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: () => fetch("/api/customers").then(res => res.json()) as Promise<CustomerWithSales[]>,
  });

  const addCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      const response = await apiRequest("POST", "/api/customers", customerData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsAddingCustomer(false);
      setFormData({ name: "", phone: "", email: "", address: "", notes: "" });
      toast({
        title: "Cliente Adicionado",
        description: "Cliente cadastrado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar cliente",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório",
        variant: "destructive",
      });
      return;
    }
    addCustomerMutation.mutate(formData);
  };

  const filteredCustomers = customers?.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Actions Bar */}
          <div className="flex justify-between items-center">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Buscar clientes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Dialog open={isAddingCustomer} onOpenChange={setIsAddingCustomer}>
              <DialogTrigger asChild>
                <Button className="bg-secondary-500 hover:bg-secondary-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Cliente</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Nome completo"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      placeholder="Endereço completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Observações</Label>
                    <Input
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Observações sobre o cliente"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddingCustomer(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={addCustomerMutation.isPending}>
                      {addCustomerMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Customers List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Lista de Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Carregando clientes...</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum cliente encontrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Compras</TableHead>
                      <TableHead>Total Gasto</TableHead>
                      <TableHead>Última Compra</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => {
                      const totalSales = customer.sales?.length || 0;
                      const totalAmount = customer.sales?.reduce((sum, sale) => sum + sale.totalAmount, 0) || 0;
                      const lastSale = customer.sales?.sort((a, b) => 
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      )[0];

                      return (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{customer.name}</div>
                              {customer.notes && (
                                <div className="text-sm text-gray-500">{customer.notes}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {customer.phone && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone className="w-3 h-3" />
                                  {customer.phone}
                                </div>
                              )}
                              {customer.email && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="w-3 h-3" />
                                  {customer.email}
                                </div>
                              )}
                              {customer.address && (
                                <div className="flex items-center gap-1 text-sm">
                                  <MapPin className="w-3 h-3" />
                                  {customer.address}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              <ShoppingBag className="w-3 h-3 mr-1" />
                              {totalSales}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-green-600">
                              {formatCurrency(totalAmount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {lastSale ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="w-3 h-3" />
                                {formatDate(lastSale.createdAt)}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedCustomer(customer)}
                            >
                              Ver Histórico
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customer Details Modal */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico do Cliente - {selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nome</Label>
                      <p className="font-medium">{selectedCustomer.name}</p>
                    </div>
                    {selectedCustomer.phone && (
                      <div>
                        <Label>Telefone</Label>
                        <p>{selectedCustomer.phone}</p>
                      </div>
                    )}
                    {selectedCustomer.email && (
                      <div>
                        <Label>Email</Label>
                        <p>{selectedCustomer.email}</p>
                      </div>
                    )}
                    {selectedCustomer.address && (
                      <div>
                        <Label>Endereço</Label>
                        <p>{selectedCustomer.address}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sales History */}
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Compras</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedCustomer.sales?.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nenhuma compra realizada</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Pagamento</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCustomer.sales?.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell>{formatDate(sale.createdAt)}</TableCell>
                            <TableCell className="font-medium text-green-600">
                              {formatCurrency(sale.totalAmount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {sale.paymentMethod === 'pix' ? 'PIX' : 
                                 sale.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800">
                                Concluída
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
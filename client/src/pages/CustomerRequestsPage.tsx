import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Phone, User, Calendar, CheckCircle, X, BookOpen, UserCheck, Tag } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const customerRequestSchema = z.object({
  requestType: z.enum(["specific", "author", "category"], {
    required_error: "Tipo de busca é obrigatório"
  }),
  title: z.string().optional(),
  author: z.string().optional(),
  category: z.string().optional(),
  customerName: z.string().min(1, "Nome do cliente é obrigatório"),
  customerPhone: z.string().min(1, "Telefone é obrigatório"),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.requestType === "specific" && (!data.title || !data.author)) {
    return false;
  }
  if (data.requestType === "author" && !data.author) {
    return false;
  }
  if (data.requestType === "category" && !data.category) {
    return false;
  }
  return true;
}, {
  message: "Preencha os campos obrigatórios para o tipo de busca selecionado",
  path: ["requestType"]
});

type CustomerRequestForm = z.infer<typeof customerRequestSchema>;

interface CustomerRequest {
  id: number;
  title?: string;
  author?: string;
  category?: string;
  requestType: "specific" | "author" | "category";
  customerName: string;
  customerPhone: string;
  notes?: string;
  status: 'active' | 'fulfilled' | 'cancelled';
  createdAt: string;
  fulfilledAt?: string;
  fulfilledByBookId?: number;
}

export default function CustomerRequestsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active'>('active');

  const form = useForm<CustomerRequestForm>({
    resolver: zodResolver(customerRequestSchema),
    defaultValues: {
      requestType: "specific",
      title: "",
      author: "",
      category: "",
      customerName: "",
      customerPhone: "",
      notes: "",
    },
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['/api/customer-requests', { status: filter === 'active' ? 'active' : undefined }],
    queryFn: async () => {
      const url = filter === 'active' ? '/api/customer-requests?status=active' : '/api/customer-requests';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch requests');
      return response.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: CustomerRequestForm) => apiRequest('/api/customer-requests', {
      method: 'POST',
      data: data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-requests'] });
      toast({
        title: "Sucesso",
        description: "Solicitação do cliente criada com sucesso",
      });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar solicitação",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/customer-requests/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-requests'] });
      toast({
        title: "Sucesso",
        description: "Solicitação removida com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover solicitação",
        variant: "destructive",
      });
    },
  });

  const fulfillMutation = useMutation({
    mutationFn: ({ id, bookId }: { id: number; bookId: number }) => 
      apiRequest(`/api/customer-requests/${id}/fulfill`, {
        method: 'POST',
        data: { bookId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer-requests'] });
      toast({
        title: "Sucesso",
        description: "Solicitação marcada como atendida",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao marcar como atendida",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CustomerRequestForm) => {
    createMutation.mutate(data);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover esta solicitação?")) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Ativo</Badge>;
      case 'fulfilled':
        return <Badge variant="secondary">Atendido</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const activeCount = requests.filter((r: CustomerRequest) => r.status === 'active').length;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Radar - Pedidos de Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie solicitações de livros dos seus clientes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Solicitação
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Nova Solicitação de Cliente</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="requestType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Tipo de Busca</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="specific" id="specific" />
                            <label htmlFor="specific" className="flex items-center cursor-pointer">
                              <BookOpen className="mr-2 h-4 w-4" />
                              Livro específico (título + autor)
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="author" id="author" />
                            <label htmlFor="author" className="flex items-center cursor-pointer">
                              <UserCheck className="mr-2 h-4 w-4" />
                              Qualquer livro do autor
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="category" id="category" />
                            <label htmlFor="category" className="flex items-center cursor-pointer">
                              <Tag className="mr-2 h-4 w-4" />
                              Categoria/Temática
                            </label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("requestType") === "specific" && (
                  <>
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título do Livro</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Dom Casmurro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="author"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Autor</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Machado de Assis" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {form.watch("requestType") === "author" && (
                  <FormField
                    control={form.control}
                    name="author"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Autor</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Machado de Assis" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch("requestType") === "category" && (
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria/Temática</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Literatura Brasileira, Ficção Científica" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Cliente</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: João Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: (11) 99999-9999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Informações adicionais..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="flex space-x-2">
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            onClick={() => setFilter('active')}
          >
            Ativas ({activeCount})
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Todas
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Carregando solicitações...</div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {filter === 'active' 
                ? 'Não há solicitações ativas no momento'
                : 'Nenhuma solicitação foi criada ainda'
              }
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar primeira solicitação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request: CustomerRequest) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    {request.requestType === "specific" && (
                      <>
                        <CardTitle className="text-lg flex items-center">
                          <BookOpen className="mr-2 h-4 w-4" />
                          {request.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">por {request.author}</p>
                      </>
                    )}
                    {request.requestType === "author" && (
                      <>
                        <CardTitle className="text-lg flex items-center">
                          <UserCheck className="mr-2 h-4 w-4" />
                          Qualquer livro de {request.author}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">Busca por autor</p>
                      </>
                    )}
                    {request.requestType === "category" && (
                      <>
                        <CardTitle className="text-lg flex items-center">
                          <Tag className="mr-2 h-4 w-4" />
                          {request.category}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">Busca por categoria/temática</p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(request.status)}
                    {request.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(request.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{request.customerName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{request.customerPhone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Criado em {formatDate(request.createdAt)}</span>
                  </div>
                  {request.fulfilledAt && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Atendido em {formatDate(request.fulfilledAt)}</span>
                    </div>
                  )}
                </div>
                {request.notes && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm">{request.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
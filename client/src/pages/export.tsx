import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Globe, 
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Settings,
  Upload,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BookWithInventory, SaleWithItems } from "@shared/schema";
import { SalesReport } from "@/lib/types";

function TopBar() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Exportação</h2>
          <p className="text-gray-600">Exporte dados para Estante Virtual e relatórios</p>
        </div>
      </div>
    </header>
  );
}

export default function Export() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "success" | "error">("idle");
  const [selectedBooks, setSelectedBooks] = useState<number[]>([]);
  const [estanteCredentials, setEstanteCredentials] = useState({
    email: "",
    password: "",
    sellerId: ""
  });
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: booksNotInEstante, isLoading: loadingBooks } = useQuery({
    queryKey: ["/api/books"],
    queryFn: () => fetch("/api/books").then(res => res.json()) as Promise<BookWithInventory[]>,
    select: (data) => data.filter(book => !book.inventory?.sentToEstanteVirtual),
  });

  const { data: sales } = useQuery({
    queryKey: ["/api/sales"],
    queryFn: () => fetch("/api/sales").then(res => res.json()) as Promise<SaleWithItems[]>,
  });

  const { data: estanteStatus } = useQuery({
    queryKey: ["/api/estante-virtual/status"],
    queryFn: () => fetch("/api/estante-virtual/status").then(res => res.json()),
  });

  const credentialsMutation = useMutation({
    mutationFn: async (credentials: typeof estanteCredentials) => {
      return await apiRequest("POST", "/api/estante-virtual/credentials", credentials);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estante-virtual/status"] });
      toast({
        title: "Credenciais Configuradas",
        description: "Login realizado com sucesso na Estante Virtual",
      });
      setShowCredentialsDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Erro no Login",
        description: "Verifique suas credenciais: " + error.message,
        variant: "destructive",
      });
    },
  });

  const uploadSingleMutation = useMutation({
    mutationFn: async (bookId: number) => {
      return await apiRequest("POST", `/api/estante-virtual/upload-book/${bookId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      toast({
        title: "Livro Enviado",
        description: "Livro enviado com sucesso para Estante Virtual",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro no Envio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadBatchMutation = useMutation({
    mutationFn: async (bookIds: number[]) => {
      return await apiRequest("POST", "/api/estante-virtual/upload-batch", { bookIds });
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      const successCount = result.results.filter((r: any) => r.success).length;
      toast({
        title: "Envio Concluído",
        description: `${successCount} de ${result.results.length} livros enviados com sucesso`,
      });
      setSelectedBooks([]);
    },
    onError: (error) => {
      toast({
        title: "Erro no Envio em Lote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExportEstanteVirtual = async (format: "xlsx" | "csv") => {
    if (!booksNotInEstante || booksNotInEstante.length === 0) {
      toast({
        title: "Nenhum livro para exportar",
        description: "Todos os livros já foram enviados para a Estante Virtual",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    setExportStatus("idle");

    try {
      const response = await fetch(`/api/export/estante-virtual?format=${format}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error("Erro na exportação");
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `estante-virtual.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      setExportStatus("success");
      toast({
        title: "Exportação Concluída",
        description: `Arquivo ${format.toUpperCase()} baixado com sucesso!`,
      });
    } catch (error) {
      setExportStatus("error");
      toast({
        title: "Erro na Exportação",
        description: "Erro ao exportar dados: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateSalesReport = async () => {
    if (!sales || sales.length === 0) {
      toast({
        title: "Nenhuma venda encontrada",
        description: "Não há vendas para gerar relatório",
        variant: "destructive",
      });
      return;
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      const response = await fetch(
        `/api/export/sales-report?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error("Erro ao gerar relatório");
      }

      const report: SalesReport = await response.json();
      
      // Create and download JSON report
      const dataStr = JSON.stringify(report, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `relatorio-vendas-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      toast({
        title: "Relatório Gerado",
        description: "Relatório de vendas baixado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro no Relatório",
        description: "Erro ao gerar relatório: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR');
  };

  const todaySales = sales?.filter(sale => {
    const saleDate = new Date(sale.createdAt || "");
    const today = new Date();
    return saleDate.toDateString() === today.toDateString();
  }).length || 0;

  const monthSales = sales?.filter(sale => {
    const saleDate = new Date(sale.createdAt || "");
    const now = new Date();
    return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
  }).length || 0;

  return (
    <>
      <TopBar />
      
      <main className="p-6 max-w-6xl mx-auto">
        {/* Export Status */}
        {exportStatus === "success" && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Exportação realizada com sucesso!
            </AlertDescription>
          </Alert>
        )}

        {exportStatus === "error" && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Erro durante a exportação. Tente novamente.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Estante Virtual Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <span>Exportar para Estante Virtual</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {loadingBooks ? "Carregando..." : `${booksNotInEstante?.length || 0} livros`}
                </h3>
                <p className="text-gray-600 text-sm">
                  Prontos para exportação
                </p>
              </div>

              {/* Estante Virtual Integration Section */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Integração Automática
                </h4>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Status da Conexão:</span>
                    <Badge className={estanteStatus?.loggedIn ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {estanteStatus?.loggedIn ? "Conectado" : "Desconectado"}
                    </Badge>
                  </div>

                  {!estanteStatus?.hasCredentials && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Configure suas credenciais da Estante Virtual para envio automático
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-2" />
                          Configurar Login
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Credenciais da Estante Virtual</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={estanteCredentials.email}
                              onChange={(e) => setEstanteCredentials({...estanteCredentials, email: e.target.value})}
                              placeholder="seu@email.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor="password">Senha</Label>
                            <Input
                              id="password"
                              type="password"
                              value={estanteCredentials.password}
                              onChange={(e) => setEstanteCredentials({...estanteCredentials, password: e.target.value})}
                              placeholder="sua senha"
                            />
                          </div>
                          <div>
                            <Label htmlFor="sellerId">ID do Vendedor (opcional)</Label>
                            <Input
                              id="sellerId"
                              value={estanteCredentials.sellerId}
                              onChange={(e) => setEstanteCredentials({...estanteCredentials, sellerId: e.target.value})}
                              placeholder="ID opcional"
                            />
                          </div>
                          <Button 
                            onClick={() => credentialsMutation.mutate(estanteCredentials)}
                            disabled={!estanteCredentials.email || !estanteCredentials.password || credentialsMutation.isPending}
                            className="w-full"
                          >
                            {credentialsMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Configurando...
                              </>
                            ) : (
                              "Salvar e Conectar"
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>

              {/* Auto Upload Section */}
              {estanteStatus?.loggedIn && booksNotInEstante && booksNotInEstante.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3 flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    Envio Automático
                  </h4>
                  
                  <div className="space-y-3">
                    {/* Book Selection */}
                    <div className="max-h-40 overflow-y-auto border rounded p-2">
                      {booksNotInEstante.map((book) => (
                        <div key={book.id} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            checked={selectedBooks.includes(book.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedBooks([...selectedBooks, book.id]);
                              } else {
                                setSelectedBooks(selectedBooks.filter(id => id !== book.id));
                              }
                            }}
                          />
                          <span className="text-sm truncate">
                            {book.title} - {book.author}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBooks(booksNotInEstante.map(b => b.id))}
                      >
                        Selecionar Todos
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBooks([])}
                      >
                        Limpar Seleção
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {selectedBooks.map((bookId) => {
                        const book = booksNotInEstante.find(b => b.id === bookId);
                        if (!book) return null;
                        
                        return (
                          <div key={bookId} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm font-medium truncate">
                              {book.title}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => uploadSingleMutation.mutate(bookId)}
                              disabled={uploadSingleMutation.isPending}
                            >
                              {uploadSingleMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        );
                      })}
                      
                      {selectedBooks.length === 0 && (
                        <p className="text-gray-500 text-sm text-center py-4">
                          Selecione livros para enviar individualmente
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Exportação Manual:</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    <Clock className="w-3 h-3 mr-1" />
                    Pendente
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Última Exportação:</span>
                  <span className="text-gray-600 text-sm">Nunca</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Formato Compatível:</span>
                  <Badge variant="outline">Excel/CSV</Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Formatos Disponíveis</h4>
                
                <Button 
                  className="w-full justify-start h-12"
                  variant="outline"
                  onClick={() => handleExportEstanteVirtual("xlsx")}
                  disabled={isExporting || loadingBooks || (booksNotInEstante?.length || 0) === 0}
                >
                  <FileSpreadsheet className="w-5 h-5 mr-3 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium">Excel (.xlsx)</div>
                    <div className="text-sm text-gray-500">Recomendado para upload</div>
                  </div>
                </Button>

                <Button 
                  className="w-full justify-start h-12"
                  variant="outline"
                  onClick={() => handleExportEstanteVirtual("csv")}
                  disabled={isExporting || loadingBooks || (booksNotInEstante?.length || 0) === 0}
                >
                  <FileText className="w-5 h-5 mr-3 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium">CSV (.csv)</div>
                    <div className="text-sm text-gray-500">Formato universal</div>
                  </div>
                </Button>
              </div>

              {(booksNotInEstante?.length || 0) === 0 && !loadingBooks && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Todos os livros já foram marcados como enviados para a Estante Virtual.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Sales Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <span>Relatórios de Vendas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">{todaySales}</div>
                  <div className="text-sm text-purple-600">Vendas Hoje</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">{monthSales}</div>
                  <div className="text-sm text-purple-600">Vendas do Mês</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Período de Análise:</span>
                  <span className="text-gray-600 text-sm">Últimos 30 dias</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Total de Vendas:</span>
                  <Badge className="bg-purple-100 text-purple-800">
                    {sales?.length || 0} transações
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Relatórios Disponíveis</h4>
                
                <Button 
                  className="w-full justify-start h-12"
                  variant="outline"
                  onClick={handleGenerateSalesReport}
                >
                  <Download className="w-5 h-5 mr-3 text-purple-600" />
                  <div className="text-left">
                    <div className="font-medium">Relatório Mensal</div>
                    <div className="text-sm text-gray-500">Vendas dos últimos 30 dias</div>
                  </div>
                </Button>

                <Button 
                  className="w-full justify-start h-12"
                  variant="outline"
                  disabled
                >
                  <Download className="w-5 h-5 mr-3 text-gray-400" />
                  <div className="text-left">
                    <div className="font-medium text-gray-400">Relatório Anual</div>
                    <div className="text-sm text-gray-400">Em desenvolvimento</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Instruções de Uso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Globe className="w-4 h-4 mr-2 text-blue-600" />
                  Estante Virtual
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Exporte seus livros no formato Excel (.xlsx)</li>
                  <li>Acesse sua conta na Estante Virtual</li>
                  <li>Vá para "Meus Livros" → "Importar Livros"</li>
                  <li>Faça upload do arquivo exportado</li>
                  <li>Revise e publique seus livros</li>
                </ol>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                  Relatórios
                </h4>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                  <li>Relatórios incluem vendas por período</li>
                  <li>Dados de produtos mais vendidos</li>
                  <li>Informações de receita total</li>
                  <li>Formato JSON para análise</li>
                  <li>Compatível com Excel e planilhas</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

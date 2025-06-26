import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Download, Filter, BookOpen, Disc, Film } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TopBar from "@/components/topbar";

export default function CatalogPage() {
  const [productType, setProductType] = useState("all");
  const [category, setCategory] = useState("");
  const [shelf, setShelf] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { toast } = useToast();

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: shelves = [] } = useQuery({
    queryKey: ["/api/shelves"],
  });

  const { data: books = [] } = useQuery({
    queryKey: ["/api/books"],
  });

  const productTypes = [
    { value: "all", label: "Todos os produtos", icon: BookOpen },
    { value: "book", label: "Livros", icon: BookOpen },
    { value: "vinyl", label: "Vinis", icon: Disc },
    { value: "dvd", label: "DVDs", icon: Film },
  ];

  // Count products by type
  const getProductCount = (type: string) => {
    if (type === "all") return books.length;
    return books.filter((book: any) => book.productType === type).length;
  };

  const generateCatalog = async () => {
    setIsGenerating(true);
    
    try {
      const params = new URLSearchParams();
      if (productType !== "all") params.append("productType", productType);
      if (category) params.append("category", category);
      if (shelf) params.append("shelf", shelf);

      const response = await fetch(`/api/export/catalog-pdf?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Erro ao gerar catálogo");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `catalogo-${productType}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Catálogo Gerado",
        description: "O catálogo PDF foi gerado e baixado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao gerar catálogo PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <TopBar />
      
      <main className="p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Catálogo de Produtos
            </h1>
            <p className="text-gray-600">
              Gere catálogos PDF detalhados com informações completas dos produtos
            </p>
          </div>

          {/* Product Type Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {productTypes.map((type) => {
              const Icon = type.icon;
              const count = getProductCount(type.value);
              
              return (
                <Card 
                  key={type.value}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    productType === type.value ? 'ring-2 ring-primary-500 bg-primary-50' : ''
                  }`}
                  onClick={() => setProductType(type.value)}
                >
                  <CardContent className="p-4 text-center">
                    <Icon className="w-8 h-8 mx-auto mb-2 text-primary-600" />
                    <h3 className="font-semibold text-gray-900">{type.label}</h3>
                    <p className="text-sm text-gray-600">{count} produtos</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="w-5 h-5" />
                <span>Filtros Avançados</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category Filter */}
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas as categorias</SelectItem>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Shelf Filter - Only for books */}
                {(productType === "all" || productType === "book") && (
                  <div className="space-y-2">
                    <Label>Estante</Label>
                    <Select value={shelf} onValueChange={setShelf}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as estantes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas as estantes</SelectItem>
                        {shelves.map((shelfItem: any) => (
                          <SelectItem key={shelfItem.id} value={shelfItem.name}>
                            {shelfItem.name} - {shelfItem.description || 'Sem descrição'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview Info */}
          <Card>
            <CardHeader>
              <CardTitle>Pré-visualização do Catálogo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">O catálogo incluirá:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Título completo e autor</li>
                  <li>• Foto da capa (quando disponível)</li>
                  <li>• Sinopse detalhada</li>
                  <li>• Preço atualizado</li>
                  <li>• Categoria e condição</li>
                  <li>• Localização na estante</li>
                  <li>• ISBN e editora</li>
                  <li>• Ano de publicação</li>
                </ul>
                
                <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                  <p className="text-sm text-blue-800">
                    <strong>Formato:</strong> Cada produto ocupará uma página completa para máximo detalhamento
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <div className="text-center">
            <Button
              onClick={generateCatalog}
              disabled={isGenerating}
              size="lg"
              className="bg-primary-600 hover:bg-primary-700 px-8"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Gerando Catálogo...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  Gerar Catálogo PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
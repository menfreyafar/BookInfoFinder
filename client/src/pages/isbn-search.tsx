import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search, 
  Camera, 
  Image as ImageIcon, 
  Book, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BookForm from "@/components/book-form";
import ImageAnalyzer from "@/components/image-analyzer";
import { ISBNSearchResult, ImageAnalysisResult } from "@/lib/types";

function TopBar() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Busca por ISBN</h2>
          <p className="text-gray-600">Cadastre livros automaticamente usando ISBN</p>
        </div>
      </div>
    </header>
  );
}

export default function ISBNSearch() {
  const [isbn, setIsbn] = useState("");
  const [searchMode, setSearchMode] = useState<"manual" | "scanner" | "photo">("manual");
  const [searchResult, setSearchResult] = useState<ISBNSearchResult | null>(null);
  const [showBookForm, setShowBookForm] = useState(false);
  const [showImageAnalyzer, setShowImageAnalyzer] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const urlIsbn = searchParams.get('isbn');
  const urlMode = searchParams.get('mode') as "scanner" | "photo" | null;

  const searchMutation = useMutation({
    mutationFn: async (searchIsbn: string) => {
      const response = await fetch(`/api/isbn/${encodeURIComponent(searchIsbn)}`, {
        credentials: 'include'
      });
      return response.json() as Promise<ISBNSearchResult>;
    },
    onSuccess: (result) => {
      setSearchResult(result);
      if (result.success) {
        toast({
          title: result.exists ? "Livro Encontrado" : "Dados Obtidos",
          description: result.exists 
            ? "Este livro já está cadastrado no sistema" 
            : "Informações obtidas com sucesso das bases de dados",
        });
      } else {
        toast({
          title: "Livro Não Encontrado",
          description: result.error || "Não foi possível encontrar informações para este ISBN",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro na Busca",
        description: "Erro ao buscar ISBN: " + error.message,
        variant: "destructive",
      });
      setSearchResult(null);
    },
  });

  const handleSearch = (searchIsbn?: string) => {
    const isbnToSearch = searchIsbn || isbn;
    if (!isbnToSearch.trim()) {
      toast({
        title: "ISBN Obrigatório",
        description: "Por favor, digite um ISBN para buscar",
        variant: "destructive",
      });
      return;
    }

    // Clean ISBN (remove hyphens and spaces)
    const cleanedIsbn = isbnToSearch.replace(/[-\s]/g, '');
    
    // Basic ISBN validation
    if (cleanedIsbn.length !== 10 && cleanedIsbn.length !== 13) {
      toast({
        title: "ISBN Inválido",
        description: "ISBN deve ter 10 ou 13 dígitos",
        variant: "destructive",
      });
      return;
    }

    setSearchResult(null);
    searchMutation.mutate(cleanedIsbn);
  };

  // Handle URL parameters after handleSearch is defined
  useEffect(() => {
    if (urlIsbn) {
      setIsbn(urlIsbn);
      // Clear previous results before searching
      setSearchResult(null);
      handleSearch(urlIsbn);
    }
    if (urlMode) {
      setSearchMode(urlMode);
      if (urlMode === "photo") {
        setShowImageAnalyzer(true);
      }
    }
  }, []);

  const handleImageAnalysis = (result: ImageAnalysisResult) => {
    setAnalysisResult(result);
    setShowImageAnalyzer(false);
    
    // If we have search results, enhance them with image analysis
    if (searchResult?.book) {
      setSearchResult({
        ...searchResult,
        book: {
          ...searchResult.book,
          condition: result.condition,
          synopsis: result.description
        }
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setUploadedImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraScanner = () => {
    // In a real implementation, this would integrate with a barcode scanner library
    toast({
      title: "Scanner em Desenvolvimento",
      description: "Funcionalidade de scanner será implementada em breve. Use busca manual por enquanto.",
    });
  };

  const formatCurrency = (value: string | undefined) => {
    if (!value) return "N/A";
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  return (
    <>
      <TopBar />
      
      <main className="p-6 max-w-6xl mx-auto">
        {/* Search Mode Selector */}
        <div className="mb-6">
          <div className="flex space-x-2">
            <Button
              variant={searchMode === "manual" ? "default" : "outline"}
              onClick={() => setSearchMode("manual")}
            >
              <Search className="w-4 h-4 mr-2" />
              Busca Manual
            </Button>
            <Button
              variant={searchMode === "scanner" ? "default" : "outline"}
              onClick={() => {
                setSearchMode("scanner");
                handleCameraScanner();
              }}
            >
              <Camera className="w-4 h-4 mr-2" />
              Scanner
            </Button>
            <Button
              variant={searchMode === "photo" ? "default" : "outline"}
              onClick={() => {
                setSearchMode("photo");
                setShowImageAnalyzer(true);
              }}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Análise de Foto
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Search Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Buscar por ISBN</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="isbn">ISBN</Label>
                  <div className="flex space-x-3 mt-2">
                    <Input
                      id="isbn"
                      placeholder="Digite o ISBN (ex: 9788522466191)"
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => handleSearch()}
                      disabled={searchMutation.isPending}
                    >
                      {searchMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Search Result Preview */}
                {searchResult && (
                  <div className="mt-6">
                    {searchResult.success ? (
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          {searchResult.exists 
                            ? "Livro encontrado no sistema!" 
                            : "Dados obtidos com sucesso!"
                          }
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          {searchResult.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Image Analysis Panel */}
            {showImageAnalyzer && (
              <ImageAnalyzer
                onAnalysisComplete={handleImageAnalysis}
              />
            )}

            {analysisResult && !showImageAnalyzer && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultado da Análise</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Condição:</span>
                      <Badge>{analysisResult.condition}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Ajuste de Preço:</span>
                      <span>{analysisResult.suggestedPrice}%</span>
                    </div>
                    <div>
                      <span className="font-medium">Descrição:</span>
                      <p className="text-sm text-gray-600 mt-1">
                        {analysisResult.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Book Details Panel */}
          <div>
            {searchResult?.success && searchResult.book && (
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes do Livro</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Book Cover Placeholder */}
                    <div className="w-32 h-40 bg-gray-200 rounded-lg flex items-center justify-center mx-auto">
                      {searchResult.book.coverImage ? (
                        <img 
                          src={searchResult.book.coverImage} 
                          alt="Capa do livro"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Book className="w-12 h-12 text-gray-400" />
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label className="font-semibold">Título</Label>
                        <p className="text-gray-900">{searchResult.book.title}</p>
                      </div>

                      <div>
                        <Label className="font-semibold">Autor</Label>
                        <p className="text-gray-700">{searchResult.book.author}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="font-semibold">Editora</Label>
                          <p className="text-gray-700">{searchResult.book.publisher || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="font-semibold">Ano</Label>
                          <p className="text-gray-700">{searchResult.book.publishYear || "N/A"}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="font-semibold">Preço Usado</Label>
                          <p className="text-gray-700">{formatCurrency(searchResult.book.usedPrice)}</p>
                        </div>
                        <div>
                          <Label className="font-semibold">Preço Novo</Label>
                          <p className="text-gray-700">{formatCurrency(searchResult.book.newPrice)}</p>
                        </div>
                      </div>

                      <div>
                        <Label className="font-semibold">Categoria</Label>
                        <p className="text-gray-700">{searchResult.book.category || "N/A"}</p>
                      </div>

                      {searchResult.book.synopsis && (
                        <div>
                          <Label className="font-semibold">Sinopse</Label>
                          <p className="text-gray-700 text-sm mt-1">
                            {searchResult.book.synopsis.length > 200 
                              ? `${searchResult.book.synopsis.substring(0, 200)}...`
                              : searchResult.book.synopsis
                            }
                          </p>
                        </div>
                      )}

                      {analysisResult && (
                        <>
                          <Separator />
                          <div>
                            <Label className="font-semibold">Condição (IA)</Label>
                            <p className="text-gray-700">{analysisResult.condition}</p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex space-x-3 pt-4">
                      {searchResult.exists ? (
                        <Button className="flex-1" variant="outline">
                          Ver no Catálogo
                        </Button>
                      ) : (
                        <Button 
                          className="flex-1"
                          onClick={() => setShowBookForm(true)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar ao Catálogo
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Book Form Modal */}
        {showBookForm && searchResult?.book && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <BookForm 
                book={{
                  ...searchResult.book,
                  id: 0,
                  createdAt: null,
                  updatedAt: null,
                  inventory: null
                } as any}
                onClose={() => setShowBookForm(false)}
              />
            </div>
          </div>
        )}
      </main>
    </>
  );
}

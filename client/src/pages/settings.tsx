import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Upload, Image } from "lucide-react";

interface Setting {
  id: number;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const [logoUrl, setLogoUrl] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandSubtitle, setBrandSubtitle] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all settings
  const { data: settings = [] } = useQuery<Setting[]>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Erro ao carregar configurações");
      return response.json();
    },
  });

  // Update settings values when data loads
  useEffect(() => {
    const logoSetting = settings.find(s => s.key === "logo_url");
    const brandSetting = settings.find(s => s.key === "brand_name");
    const subtitleSetting = settings.find(s => s.key === "brand_subtitle");
    
    if (logoSetting) setLogoUrl(logoSetting.value);
    if (brandSetting) setBrandName(brandSetting.value);
    if (subtitleSetting) setBrandSubtitle(subtitleSetting.value);
  }, [settings]);

  // Mutation to save settings
  const saveSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key, value }),
      });
      if (!response.ok) throw new Error("Erro ao salvar configuração");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({
        title: "Configuração salva",
        description: "As alterações foram aplicadas com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a configuração.",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = async () => {
    try {
      await Promise.all([
        saveSetting.mutateAsync({ key: "logo_url", value: logoUrl }),
        saveSetting.mutateAsync({ key: "brand_name", value: brandName }),
        saveSetting.mutateAsync({ key: "brand_subtitle", value: brandSubtitle }),
      ]);
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  // Mutation to upload logo image
  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      try {
        const formData = new FormData();
        formData.append('logo', file);
        
        console.log("Sending request to upload logo...");
        const response = await fetch("/api/settings/upload-logo", {
          method: "POST",
          body: formData,
          headers: {
            // Don't set Content-Type, let browser set it with boundary for multipart
          },
        });
        console.log("Response status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = "Erro ao fazer upload da imagem";
          
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          
          throw new Error(errorMessage);
        }
        
        return response.json();
      } catch (error) {
        console.error("Upload error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setLogoUrl(data.logoUrl);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({
        title: "Logo atualizada",
        description: "A imagem foi enviada e salva com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name, file.type, file.size);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione apenas arquivos de imagem.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      uploadLogo.mutate(file);
      
      // Clear the input after upload attempt
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Configurações</h1>
      </div>

      <div className="grid gap-6">
        {/* Brand Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Image className="w-5 h-5" />
              <span>Identidade Visual</span>
            </CardTitle>
            <CardDescription>
              Configure a logo e textos exibidos na barra lateral
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logo-url">URL da Logo</Label>
                  <Input
                    id="logo-url"
                    placeholder="https://exemplo.com/logo.svg"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Cole a URL de uma imagem SVG ou PNG
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo-upload">Ou faça upload de uma imagem</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadLogo.isPending}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 disabled:opacity-50"
                    />
                    {uploadLogo.isPending ? (
                      <div className="text-sm text-muted-foreground">Enviando...</div>
                    ) : (
                      <Upload className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Formatos aceitos: PNG, JPG, SVG. Tamanho máximo: 5MB
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand-name">Nome da Marca</Label>
                  <Input
                    id="brand-name"
                    placeholder="Nome da sua empresa"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand-subtitle">Subtítulo</Label>
                  <Input
                    id="brand-subtitle"
                    placeholder="Descrição da empresa"
                    value={brandSubtitle}
                    onChange={(e) => setBrandSubtitle(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Pré-visualização</Label>
                <div className="border rounded-lg p-3 bg-yellow-50 dark:bg-black-800">
                  <div className="flex items-center space-x-1">
                    {logoUrl && logoUrl.trim() ? (
                      <img 
                        src={logoUrl} 
                        alt="Logo preview" 
                        className="w-24 h-24 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-24 h-24 bg-orange-200 rounded-lg flex items-center justify-center">
                        <Image className="w-12 h-12 text-orange-600" />
                        <span className="sr-only">Espaço para logo</span>
                      </div>
                    )}
                    <div>
                      <h1 className="text-xl font-bold text-black dark:text-yellow-300">
                        {brandName || "Nome da Marca"}
                      </h1>
                      <p className="text-sm text-black-700 dark:text-yellow-500">
                        {brandSubtitle || "Subtítulo"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setLogoUrl("");
                  setBrandName("");
                  setBrandSubtitle("");
                }}
                disabled={saveSetting.isPending || uploadLogo.isPending}
              >
                Limpar
              </Button>
              <Button 
                onClick={handleSaveSettings} 
                disabled={saveSetting.isPending || uploadLogo.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {saveSetting.isPending ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Settings Display */}
        {settings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Configurações Atuais</CardTitle>
              <CardDescription>
                Todas as configurações salvas no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {settings.map((setting) => (
                  <div key={setting.id} className="grid grid-cols-3 gap-4 p-2 border rounded">
                    <div className="font-medium">{setting.key}</div>
                    <div className="text-muted-foreground truncate">{setting.value}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(setting.updatedAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings as SettingsIcon, 
  Upload, 
  Image, 
  Globe, 
  CheckCircle, 
  XCircle,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";

function TopBar() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
          <p className="text-gray-600">Personalize sua loja e configurações da Estante Virtual</p>
        </div>
      </div>
    </header>
  );
}

export default function Settings() {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [brandName, setBrandName] = useState("");
  const [brandSubtitle, setBrandSubtitle] = useState("");
  const [estanteEmail, setEstanteEmail] = useState("");
  const [estantePassword, setEstantePassword] = useState("");
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current settings
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: getQueryFn({ on401: "throw" }),
    select: (data) => {
      const settingsMap = data.reduce((acc: any, setting: any) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});
      
      // Set form values from settings
      if (settingsMap.brand_name && brandName === "") setBrandName(settingsMap.brand_name);
      if (settingsMap.brand_subtitle && brandSubtitle === "") setBrandSubtitle(settingsMap.brand_subtitle);
      if (settingsMap.estante_email && estanteEmail === "") setEstanteEmail(settingsMap.estante_email);
      
      return settingsMap;
    }
  });

  // Upload logo mutation
  const logoUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await fetch('/api/settings/upload-logo', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Logo atualizada com sucesso"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao fazer upload da logo",
        variant: "destructive"
      });
    }
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: { key: string; value: string }[]) => {
      const promises = settings.map(setting =>
        apiRequest('/api/settings', {
          method: 'POST',
          body: JSON.stringify(setting),
          headers: { 'Content-Type': 'application/json' }
        })
      );
      
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações",
        variant: "destructive"
      });
    }
  });

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      logoUploadMutation.mutate(file);
    }
  };

  const handleSaveBrand = () => {
    updateSettingsMutation.mutate([
      { key: "brand_name", value: brandName },
      { key: "brand_subtitle", value: brandSubtitle }
    ]);
  };

  const handleSaveEstanteCredentials = () => {
    updateSettingsMutation.mutate([
      { key: "estante_email", value: estanteEmail },
      { key: "estante_password", value: estantePassword }
    ]);
  };

  const testEstanteConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    
    try {
      const response = await apiRequest('/api/estante-virtual/test-connection', {
        method: 'POST'
      });
      const result = await response.json();
      setConnectionResult(result);
    } catch (error) {
      setConnectionResult({ 
        success: false, 
        message: "Erro ao testar conexão" 
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      
      <div className="p-6">
        <Tabs defaultValue="brand" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="brand">Marca e Logo</TabsTrigger>
            <TabsTrigger value="estante">Estante Virtual</TabsTrigger>
          </TabsList>
          
          <TabsContent value="brand" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Logo da Loja
                </CardTitle>
                <CardDescription>
                  Faça upload da logo da sua loja. Formatos suportados: PNG, JPG, SVG (máx. 5MB)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings?.logo_url && (
                  <div className="flex items-center gap-4">
                    <img 
                      src={settings.logo_url} 
                      alt="Logo atual" 
                      className="w-24 h-24 object-contain rounded border"
                    />
                    <div className="text-sm text-gray-600">
                      Logo atual
                    </div>
                  </div>
                )}
                
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={logoUploadMutation.isPending}
                  />
                  {logoUploadMutation.isPending && (
                    <div className="text-sm text-gray-600 mt-2">
                      Fazendo upload...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5" />
                  Informações da Marca
                </CardTitle>
                <CardDescription>
                  Configure o nome e subtítulo da sua loja
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="brandName">Nome da Loja</Label>
                  <Input
                    id="brandName"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Ex: Luar Sebo e Livraria"
                  />
                </div>
                
                <div>
                  <Label htmlFor="brandSubtitle">Subtítulo</Label>
                  <Input
                    id="brandSubtitle"
                    value={brandSubtitle}
                    onChange={(e) => setBrandSubtitle(e.target.value)}
                    placeholder="Ex: Sebo e Livraria"
                  />
                </div>
                
                <Button 
                  onClick={handleSaveBrand}
                  disabled={updateSettingsMutation.isPending}
                >
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="estante" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Credenciais da Estante Virtual
                </CardTitle>
                <CardDescription>
                  Configure sua conta da Estante Virtual para sincronização automática
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="estanteEmail">Email</Label>
                  <Input
                    id="estanteEmail"
                    type="email"
                    value={estanteEmail}
                    onChange={(e) => setEstanteEmail(e.target.value)}
                    placeholder="seu@email.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="estantePassword">Senha</Label>
                  <Input
                    id="estantePassword"
                    type="password"
                    value={estantePassword}
                    onChange={(e) => setEstantePassword(e.target.value)}
                    placeholder="Sua senha"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveEstanteCredentials}
                    disabled={updateSettingsMutation.isPending}
                  >
                    Salvar Credenciais
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={testEstanteConnection}
                    disabled={testingConnection || !estanteEmail || !estantePassword}
                  >
                    Testar Conexão
                  </Button>
                </div>
                
                {connectionResult && (
                  <Alert>
                    {connectionResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      {connectionResult.message}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
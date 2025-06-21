import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageAnalysisResult } from "@/lib/types";

interface ImageAnalyzerProps {
  onAnalysisComplete: (result: ImageAnalysisResult) => void;
}

export default function ImageAnalyzer({ onAnalysisComplete }: ImageAnalyzerProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const analyzeMutation = useMutation({
    mutationFn: async (imageFile: File) => {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao analisar imagem');
      }

      return response.json() as Promise<ImageAnalysisResult>;
    },
    onSuccess: (result) => {
      setAnalysisResult(result);
      onAnalysisComplete(result);
      toast({
        title: "Análise Concluída",
        description: "Imagem analisada com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao analisar imagem: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      // This would typically open a camera interface
      // For now, we'll just trigger the file input
      fileInputRef.current?.click();
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Camera access denied:', error);
      // Fallback to file input
      fileInputRef.current?.click();
    }
  };

  const analyzeImage = () => {
    if (selectedImage) {
      analyzeMutation.mutate(selectedImage);
    }
  };

  const reset = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setAnalysisResult(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Camera className="w-5 h-5" />
          <span>Análise de Estado do Livro</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        {!imagePreview ? (
          <div className="space-y-3">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">
                Tire uma foto do livro para análise automática do estado
              </p>
              <div className="flex justify-center space-x-3">
                <Button onClick={handleCameraCapture} variant="outline">
                  <Camera className="w-4 h-4 mr-2" />
                  Câmera
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-64 object-cover rounded-lg border"
              />
              <Button
                onClick={reset}
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
              >
                Remover
              </Button>
            </div>

            {!analysisResult ? (
              <Button
                onClick={analyzeImage}
                disabled={analyzeMutation.isPending}
                className="w-full"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  "Analisar Estado"
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Condição Detectada
                    </label>
                    <div className="px-3 py-2 bg-gray-100 rounded-lg">
                      {analysisResult.condition}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ajuste de Preço
                    </label>
                    <div className="px-3 py-2 bg-gray-100 rounded-lg">
                      {analysisResult.suggestedPrice}%
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição da Condição
                  </label>
                  <Textarea
                    value={analysisResult.description}
                    readOnly
                    rows={4}
                    className="bg-gray-50"
                  />
                </div>

                <Button onClick={reset} variant="outline" className="w-full">
                  Analisar Nova Imagem
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

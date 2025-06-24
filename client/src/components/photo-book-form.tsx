import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Camera, Upload, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface PhotoBookFormProps {
  onClose: () => void;
  onSuccess?: (book: any) => void;
}

interface BookData {
  title: string;
  author: string;
  publisher?: string;
  publishYear?: number;
  description: string;
  isbn?: string;
}

export default function PhotoBookForm({ onClose, onSuccess }: PhotoBookFormProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [bookData, setBookData] = useState<BookData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Register book by photo mutation
  const registerMutation = useMutation({
    mutationFn: async (imageFile: File) => {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const response = await apiRequest('/api/books/register-by-photo', {
        method: 'POST',
        body: formData
      });
      
      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Sucesso",
          description: "Livro cadastrado com sucesso via foto"
        });
        queryClient.invalidateQueries({ queryKey: ['/api/books'] });
        onSuccess?.(result.book);
        onClose();
      } else {
        toast({
          title: "Erro",
          description: result.error || "Erro ao cadastrar livro",
          variant: "destructive"
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao processar imagem do livro",
        variant: "destructive"
      });
    }
  });

  // Analyze image mutation
  const analyzeMutation = useMutation({
    mutationFn: async (imageFile: File) => {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const response = await apiRequest('/api/analyze-image', {
        method: 'POST',
        body: formData
      });
      
      return response.json();
    },
    onSuccess: (result) => {
      setBookData(result);
      setIsEditing(true);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao analisar imagem",
        variant: "destructive"
      });
    }
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Analyze the image
      analyzeMutation.mutate(file);
    }
  };

  const handleRegister = () => {
    if (imageFile) {
      registerMutation.mutate(imageFile);
    }
  };

  const handleFieldChange = (field: keyof BookData, value: string | number) => {
    if (bookData) {
      setBookData({
        ...bookData,
        [field]: value
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Cadastro via Foto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!imageFile ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
                id="photo-upload"
              />
              
              <div className="text-center">
                <Camera className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <div className="flex gap-2 justify-center mb-4">
                  <Button 
                    onClick={() => {
                      const input = document.getElementById('photo-upload') as HTMLInputElement;
                      input.removeAttribute('capture');
                      input.click();
                    }}
                    variant="outline"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Galeria
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      const input = document.getElementById('photo-upload') as HTMLInputElement;
                      input.setAttribute('capture', 'environment');
                      input.click();
                    }}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Câmera
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Tire uma foto ou selecione da galeria para identificar o livro
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="flex justify-center">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-w-xs max-h-64 object-contain rounded border"
                />
              </div>

              {/* Analysis Status */}
              {analyzeMutation.isPending && (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analisando imagem...</span>
                </div>
              )}

              {/* Book Data Form */}
              {bookData && isEditing && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 mb-4">
                    <CheckCircle className="w-4 h-4" />
                    <span>Livro identificado! Verifique e edite os dados se necessário:</span>
                  </div>

                  <div>
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={bookData.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="author">Autor</Label>
                    <Input
                      id="author"
                      value={bookData.author}
                      onChange={(e) => handleFieldChange('author', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="publisher">Editora</Label>
                    <Input
                      id="publisher"
                      value={bookData.publisher || ''}
                      onChange={(e) => handleFieldChange('publisher', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="publishYear">Ano de Publicação</Label>
                    <Input
                      id="publishYear"
                      type="number"
                      value={bookData.publishYear || ''}
                      onChange={(e) => handleFieldChange('publishYear', parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={bookData.description}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      rows={4}
                      placeholder="Livro usado, em excelente estado de conservação..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Esta descrição será usada na Estante Virtual
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleRegister}
                      disabled={registerMutation.isPending}
                      className="flex-1"
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cadastrando...
                        </>
                      ) : (
                        "Cadastrar Livro"
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview("");
                        setBookData(null);
                        setIsEditing(false);
                      }}
                    >
                      Nova Foto
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
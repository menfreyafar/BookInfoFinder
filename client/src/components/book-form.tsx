import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BookWithInventory } from "@shared/schema";

const bookFormSchema = z.object({
  isbn: z.string().optional(),
  title: z.string().min(1, "Título é obrigatório"),
  author: z.string().min(1, "Autor é obrigatório"),
  publisher: z.string().optional(),
  publishYear: z.number().optional(),
  edition: z.string().optional(),
  category: z.string().optional(),
  synopsis: z.string().optional(),
  weight: z.number().optional(),
  usedPrice: z.string().optional(),
  newPrice: z.string().optional(),
  condition: z.string().optional(),
  quantity: z.number().min(0, "Quantidade deve ser maior ou igual a 0"),
  location: z.string().optional(),
  sentToEstanteVirtual: z.boolean().default(false),
});

type BookFormData = z.infer<typeof bookFormSchema>;

interface BookFormProps {
  book?: BookWithInventory;
  onClose: () => void;
}

export default function BookForm({ book, onClose }: BookFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<BookFormData>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      isbn: book?.isbn || "",
      title: book?.title || "",
      author: book?.author || "",
      publisher: book?.publisher || "",
      publishYear: book?.publishYear || undefined,
      edition: book?.edition || "",
      category: book?.category || "",
      synopsis: book?.synopsis || "",
      weight: book?.weight || undefined,
      usedPrice: book?.usedPrice || "",
      newPrice: book?.newPrice || "",
      condition: book?.condition || "Usado",
      quantity: book?.inventory?.quantity || 0,
      location: book?.inventory?.location || "",
      sentToEstanteVirtual: book?.inventory?.sentToEstanteVirtual || false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: BookFormData) => {
      const response = await apiRequest("POST", "/api/books", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Sucesso",
        description: "Livro criado com sucesso!",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao criar livro: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: BookFormData) => {
      const response = await apiRequest("PUT", `/api/books/${book!.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      toast({
        title: "Sucesso",
        description: "Livro atualizado com sucesso!",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar livro: " + error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: BookFormData) => {
    setIsSubmitting(true);
    try {
      if (book) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{book ? "Editar Livro" : "Novo Livro"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="isbn">ISBN</Label>
              <Input
                id="isbn"
                {...form.register("isbn")}
                placeholder="9788522466191"
              />
            </div>
            <div>
              <Label htmlFor="publishYear">Ano de Publicação</Label>
              <Input
                id="publishYear"
                type="number"
                {...form.register("publishYear", { valueAsNumber: true })}
                placeholder="2023"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              {...form.register("title")}
              placeholder="Título do livro"
            />
            {form.formState.errors.title && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="author">Autor *</Label>
              <Input
                id="author"
                {...form.register("author")}
                placeholder="Nome do autor"
              />
              {form.formState.errors.author && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.author.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="publisher">Editora</Label>
              <Input
                id="publisher"
                {...form.register("publisher")}
                placeholder="Nome da editora"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={form.watch("category") || ""} onValueChange={(value) => form.setValue("category", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Literatura Brasileira">Literatura Brasileira</SelectItem>
                  <SelectItem value="Literatura Estrangeira">Literatura Estrangeira</SelectItem>
                  <SelectItem value="Romance">Romance</SelectItem>
                  <SelectItem value="Ficção Científica">Ficção Científica</SelectItem>
                  <SelectItem value="Biografia">Biografia</SelectItem>
                  <SelectItem value="História">História</SelectItem>
                  <SelectItem value="Filosofia">Filosofia</SelectItem>
                  <SelectItem value="Autoajuda">Autoajuda</SelectItem>
                  <SelectItem value="Técnico">Técnico</SelectItem>
                  <SelectItem value="Infantil">Infantil</SelectItem>
                  <SelectItem value="Juvenil">Juvenil</SelectItem>
                  <SelectItem value="Didático">Didático</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edition">Edição</Label>
              <Input
                id="edition"
                {...form.register("edition")}
                placeholder="1ª edição"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="usedPrice">Preço Usado (R$)</Label>
              <Input
                id="usedPrice"
                {...form.register("usedPrice")}
                placeholder="25,90"
              />
            </div>
            <div>
              <Label htmlFor="newPrice">Preço Novo (R$)</Label>
              <Input
                id="newPrice"
                {...form.register("newPrice")}
                placeholder="45,90"
              />
            </div>
            <div>
              <Label htmlFor="weight">Peso (g)</Label>
              <Input
                id="weight"
                type="number"
                {...form.register("weight", { valueAsNumber: true })}
                placeholder="300"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="synopsis">Sinopse</Label>
            <Textarea
              id="synopsis"
              {...form.register("synopsis")}
              placeholder="Sinopse do livro..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="condition">Condição</Label>
              <Select value={form.watch("condition") || ""} onValueChange={(value) => form.setValue("condition", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a condição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Novo">Novo</SelectItem>
                  <SelectItem value="Seminovo">Seminovo</SelectItem>
                  <SelectItem value="Usado">Usado</SelectItem>
                  <SelectItem value="Danificado">Danificado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quantity">Quantidade em Estoque *</Label>
              <Input
                id="quantity"
                type="number"
                {...form.register("quantity", { valueAsNumber: true })}
                placeholder="1"
                min="0"
              />
              {form.formState.errors.quantity && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.quantity.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="location">Localização</Label>
              <Input
                id="location"
                {...form.register("location")}
                placeholder="Estante A, Prateleira 3"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sentToEstanteVirtual"
              checked={form.watch("sentToEstanteVirtual")}
              onCheckedChange={(checked) => form.setValue("sentToEstanteVirtual", checked as boolean)}
            />
            <Label htmlFor="sentToEstanteVirtual">
              Enviar para Estante Virtual
            </Label>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : book ? "Atualizar" : "Criar Livro"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

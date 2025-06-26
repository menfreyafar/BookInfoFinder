import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Search, Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BookWithInventory } from "@shared/schema";
import { CartItem } from "@/lib/types";

interface POSModalProps {
  open: boolean;
  onClose: () => void;
}

export default function POSModal({ open, onClose }: POSModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "pix">("pix");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["/api/books/search", searchQuery],
    enabled: searchQuery.length > 2,
    queryFn: () => fetch(`/api/books/search?q=${encodeURIComponent(searchQuery)}`)
      .then(res => res.json()) as Promise<BookWithInventory[]>,
  });

  const processSaleMutation = useMutation({
    mutationFn: async (saleData: any) => {
      const response = await apiRequest("POST", "/api/sales", saleData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      toast({
        title: "Venda Concluída",
        description: "Venda processada com sucesso!",
      });
      setCart([]);
      setCustomerName("");
      setCustomerEmail("");
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao processar venda: " + error.message,
        variant: "destructive",
      });
    },
  });

  const addToCart = (book: BookWithInventory) => {
    const existingItem = cart.find(item => item.id === book.id);
    const price = parseFloat(String(book.usedPrice || book.newPrice || "0"));
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === book.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        id: book.id,
        title: book.title,
        author: book.author,
        price: price,
        quantity: 1
      }]);
    }
    
    // Clear search after adding
    setSearchQuery("");
  };

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.id !== id));
    } else {
      setCart(cart.map(item => 
        item.id === id ? { ...item, quantity } : item
      ));
    }
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return Math.max(0, subtotal - discountAmount);
  };

  const processSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um item ao carrinho",
        variant: "destructive",
      });
      return;
    }

    const finalTotal = calculateTotal();
    if (finalTotal <= 0) {
      toast({
        title: "Erro",
        description: "O valor final da venda deve ser maior que zero",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const sale = {
        customerName: customerName || undefined,
        customerEmail: customerEmail || undefined,
        customerPhone: customerPhone || undefined,
        subtotalAmount: parseFloat(calculateSubtotal().toFixed(2)),
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        totalAmount: parseFloat(finalTotal.toFixed(2)),
        paymentMethod,
      };

      const items = cart.map(item => ({
        bookId: item.id,
        quantity: item.quantity,
        unitPrice: parseFloat(item.price.toFixed(2)),
        totalPrice: parseFloat((item.price * item.quantity).toFixed(2)),
      }));

      await processSaleMutation.mutateAsync({ sale, items });
      
      // Reset discount after successful sale
      setDiscountAmount(0);
      setCustomerPhone("");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5" />
            <span>Ponto de Venda</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Product Search & Cart */}
          <div className="space-y-6">
            <div>
              <Label htmlFor="search">Buscar Produto</Label>
              <div className="flex space-x-2 mt-2">
                <Input
                  id="search"
                  placeholder="ISBN, título ou autor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button size="icon" disabled={isSearching}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Search Results */}
              {searchResults && searchResults.length > 0 && (
                <div className="mt-4 border rounded-lg max-h-40 overflow-y-auto">
                  {searchResults.map((book) => (
                    <div 
                      key={book.id} 
                      className="p-3 border-b last:border-b-0 flex justify-between items-center hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{book.title}</h4>
                        <p className="text-sm text-gray-600">{book.author}</p>
                        <p className="text-sm text-primary-600 font-medium">
                          R$ {book.usedPrice || book.newPrice || "0,00"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addToCart(book)}
                        disabled={!book.inventory || book.inventory.quantity === 0}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Items */}
            <Card>
              <CardHeader>
                <CardTitle>Carrinho de Compras</CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Carrinho vazio. Adicione produtos para continuar.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.title}</h4>
                          <p className="text-sm text-gray-600">{item.author}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <span className="font-semibold w-16 text-right">
                            R$ {(item.price * item.quantity).toFixed(2)}
                          </span>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Payment & Summary */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({cart.length} itens)</span>
                    <span>R$ {calculateSubtotal().toFixed(2)}</span>
                  </div>
                  
                  {/* Discount Input */}
                  <div className="space-y-2">
                    <Label htmlFor="discount">Desconto (R$)</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      max={calculateSubtotal()}
                      step="0.01"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                    />
                  </div>
                  
                  <div className="flex justify-between text-gray-600">
                    <span>Desconto aplicado</span>
                    <span className="text-red-600">- R$ {discountAmount.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span className={calculateTotal() <= 0 ? "text-red-600" : "text-green-600"}>
                      R$ {calculateTotal().toFixed(2)}
                    </span>
                  </div>
                  {calculateTotal() <= 0 && (
                    <p className="text-sm text-red-600">
                      Valor final deve ser maior que zero
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as any)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash">Dinheiro</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card">Cartão</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pix" id="pix" />
                    <Label htmlFor="pix">PIX</Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle>Cliente (Opcional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="customerName">Nome</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nome do cliente..."
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Telefone</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={processSale}
            disabled={isProcessing || cart.length === 0}
            className="bg-secondary-500 hover:bg-secondary-600"
          >
            {isProcessing ? "Processando..." : "Finalizar Venda"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

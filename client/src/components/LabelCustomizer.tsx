import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Trash2, Move, Type, DollarSign, User, Hash } from 'lucide-react';

interface LabelElement {
  id: string;
  type: 'price' | 'title' | 'author' | 'synopsis' | 'code' | 'condition';
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor: string;
  opacity: number;
}

interface BrandInfo {
  storeName?: string;
  logoData?: string;
  address?: string;
  phone?: string;
}

interface LabelCustomizerProps {
  templateImage?: string;
  onSaveLayout: (elements: LabelElement[], brandInfo?: BrandInfo) => void;
  initialElements?: LabelElement[];
  initialBrandInfo?: BrandInfo;
}

const DEFAULT_ELEMENTS: LabelElement[] = [
  {
    id: 'price',
    type: 'price',
    x: 10,
    y: 5,
    width: 80,
    height: 15,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000000',
    backgroundColor: '#ffffff',
    opacity: 0.9
  },
  {
    id: 'title',
    type: 'title',
    x: 10,
    y: 25,
    width: 80,
    height: 20,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000000',
    backgroundColor: '#ffffff',
    opacity: 0.9
  },
  {
    id: 'author',
    type: 'author',
    x: 10,
    y: 50,
    width: 80,
    height: 15,
    fontSize: 10,
    fontWeight: 'normal',
    textAlign: 'center',
    color: '#000000',
    backgroundColor: '#ffffff',
    opacity: 0.8
  }
];

const ELEMENT_ICONS = {
  price: DollarSign,
  title: Type,
  author: User,
  synopsis: Type,
  code: Hash,
  condition: Type
};

const ELEMENT_LABELS = {
  price: 'Preço',
  title: 'Título',
  author: 'Autor',
  synopsis: 'Sinopse',
  code: 'Código',
  condition: 'Condição'
};

export default function LabelCustomizer({ templateImage, onSaveLayout, initialElements, initialBrandInfo }: LabelCustomizerProps) {
  const [elements, setElements] = useState<LabelElement[]>(initialElements || DEFAULT_ELEMENTS);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [brandInfo, setBrandInfo] = useState<BrandInfo>(initialBrandInfo || {});
  const canvasRef = useRef<HTMLDivElement>(null);

  const labelWidth = 71; // 2.5cm in points
  const labelHeight = 284; // 10cm in points
  const scale = 300 / labelHeight; // Scale for display

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.preventDefault();
    setSelectedElement(elementId);
    setIsDragging(true);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const element = elements.find(el => el.id === elementId);
      if (element) {
        const elementX = (element.x / 100) * (rect.width);
        const elementY = (element.y / 100) * (rect.height);
        setDragOffset({
          x: e.clientX - rect.left - elementX,
          y: e.clientY - rect.top - elementY
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElement || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
    const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;
    
    setElements(prev => prev.map(el => 
      el.id === selectedElement 
        ? { ...el, x: Math.max(0, Math.min(90, x)), y: Math.max(0, Math.min(90, y)) }
        : el
    ));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };

  const updateElement = (id: string, updates: Partial<LabelElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const addElement = (type: LabelElement['type']) => {
    const newElement: LabelElement = {
      id: `${type}_${Date.now()}`,
      type,
      x: 20,
      y: 20,
      width: 60,
      height: 15,
      fontSize: 10,
      fontWeight: 'normal',
      textAlign: 'center',
      color: '#000000',
      backgroundColor: '#ffffff',
      opacity: 0.8
    };
    setElements(prev => [...prev, newElement]);
  };

  const removeElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    if (selectedElement === id) {
      setSelectedElement(null);
    }
  };

  const selectedElementData = elements.find(el => el.id === selectedElement);

  return (
    <div className="flex gap-6 min-h-[600px] max-h-[70vh]">
      {/* Canvas */}
      <div className="flex-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Editor de Layout da Etiqueta</CardTitle>
          </CardHeader>
          <CardContent className="min-h-[500px] max-h-[60vh] p-4 overflow-hidden">
            <div
              ref={canvasRef}
              className="relative border-2 border-dashed border-gray-300 mx-auto bg-white overflow-hidden cursor-crosshair"
              style={{
                width: labelWidth * scale,
                height: labelHeight * scale,
                backgroundImage: templateImage ? `url(${templateImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {elements.map((element) => {
                const Icon = ELEMENT_ICONS[element.type];
                return (
                  <div
                    key={element.id}
                    className={`absolute border-2 cursor-move ${
                      selectedElement === element.id ? 'border-blue-500 bg-blue-100' : 'border-gray-400 bg-gray-100'
                    }`}
                    style={{
                      left: `${element.x}%`,
                      top: `${element.y}%`,
                      width: `${element.width}%`,
                      height: `${element.height}%`,
                      backgroundColor: element.backgroundColor,
                      opacity: element.opacity,
                      fontSize: `${element.fontSize * scale / 2}px`,
                      fontWeight: element.fontWeight,
                      textAlign: element.textAlign,
                      color: element.color,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, element.id)}
                    onClick={() => setSelectedElement(element.id)}
                  >
                    <div className="flex items-center justify-center h-full text-xs">
                      <Icon className="w-3 h-3 mr-1" />
                      {ELEMENT_LABELS[element.type]}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="w-80 space-y-4 overflow-y-auto max-h-[70vh] pr-2">
        {/* Add Elements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Adicionar Elementos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ELEMENT_LABELS).map(([type, label]) => (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  onClick={() => addElement(type as LabelElement['type'])}
                  className="text-xs"
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Element Properties */}
        {selectedElementData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                Propriedades: {ELEMENT_LABELS[selectedElementData.type]}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeElement(selectedElementData.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Position */}
              <div className="space-y-2">
                <Label className="text-xs">Posição</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">X (%)</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedElementData.x)}
                      onChange={(e) => updateElement(selectedElementData.id, { x: Number(e.target.value) })}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Y (%)</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedElementData.y)}
                      onChange={(e) => updateElement(selectedElementData.id, { y: Number(e.target.value) })}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Size */}
              <div className="space-y-2">
                <Label className="text-xs">Tamanho</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Largura (%)</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedElementData.width)}
                      onChange={(e) => updateElement(selectedElementData.id, { width: Number(e.target.value) })}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Altura (%)</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedElementData.height)}
                      onChange={(e) => updateElement(selectedElementData.id, { height: Number(e.target.value) })}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Typography */}
              <div className="space-y-2">
                <Label className="text-xs">Tipografia</Label>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Tamanho da Fonte</Label>
                    <Slider
                      value={[selectedElementData.fontSize]}
                      onValueChange={([value]) => updateElement(selectedElementData.id, { fontSize: value })}
                      min={6}
                      max={20}
                      step={1}
                    />
                    <span className="text-xs text-gray-500">{selectedElementData.fontSize}px</span>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Peso da Fonte</Label>
                    <Select
                      value={selectedElementData.fontWeight}
                      onValueChange={(value) => updateElement(selectedElementData.id, { fontWeight: value as 'normal' | 'bold' })}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="bold">Negrito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Alinhamento</Label>
                    <Select
                      value={selectedElementData.textAlign}
                      onValueChange={(value) => updateElement(selectedElementData.id, { textAlign: value as 'left' | 'center' | 'right' })}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Esquerda</SelectItem>
                        <SelectItem value="center">Centro</SelectItem>
                        <SelectItem value="right">Direita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Style */}
              <div className="space-y-2">
                <Label className="text-xs">Estilo</Label>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Cor do Texto</Label>
                    <Input
                      type="color"
                      value={selectedElementData.color}
                      onChange={(e) => updateElement(selectedElementData.id, { color: e.target.value })}
                      className="h-8"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Cor de Fundo</Label>
                    <Input
                      type="color"
                      value={selectedElementData.backgroundColor}
                      onChange={(e) => updateElement(selectedElementData.id, { backgroundColor: e.target.value })}
                      className="h-8"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Opacidade</Label>
                    <Slider
                      value={[selectedElementData.opacity * 100]}
                      onValueChange={([value]) => updateElement(selectedElementData.id, { opacity: value / 100 })}
                      min={0}
                      max={100}
                      step={5}
                    />
                    <span className="text-xs text-gray-500">{Math.round(selectedElementData.opacity * 100)}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Brand Information */}
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-sm font-semibold">Informações da Marca</Label>
          
          <div>
            <Label className="text-xs">Nome da Loja</Label>
            <Input
              type="text"
              placeholder="Ex: Luar Sebo"
              value={brandInfo.storeName || ''}
              onChange={(e) => setBrandInfo({...brandInfo, storeName: e.target.value})}
              className="text-xs"
            />
          </div>

          <div>
            <Label className="text-xs">Endereço</Label>
            <Input
              type="text"
              placeholder="Endereço da loja"
              value={brandInfo.address || ''}
              onChange={(e) => setBrandInfo({...brandInfo, address: e.target.value})}
              className="text-xs"
            />
          </div>

          <div>
            <Label className="text-xs">Telefone</Label>
            <Input
              type="text"
              placeholder="(11) 99999-9999"
              value={brandInfo.phone || ''}
              onChange={(e) => setBrandInfo({...brandInfo, phone: e.target.value})}
              className="text-xs"
            />
          </div>

          <div>
            <Label className="text-xs">Logo (opcional)</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    setBrandInfo({...brandInfo, logoData: event.target?.result as string});
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="text-xs"
            />
            {brandInfo.logoData && (
              <img src={brandInfo.logoData} alt="Logo preview" className="mt-2 max-w-full h-12 object-contain" />
            )}
          </div>
        </div>

        {/* Save Layout */}
        <Button 
          onClick={() => onSaveLayout(elements, brandInfo)}
          className="w-full"
        >
          Salvar Layout e Configurações
        </Button>
      </div>
    </div>
  );
}
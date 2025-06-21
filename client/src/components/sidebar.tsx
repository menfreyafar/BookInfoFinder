import { Link, useLocation } from "wouter";
import { 
  Book, 
  Barcode, 
  Package, 
  ShoppingCart, 
  Download, 
  Settings, 
  BarChart3,
  Library
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Busca por ISBN", href: "/isbn-search", icon: Barcode },
  { name: "Catálogo", href: "/catalog", icon: Library },
  { name: "Estoque", href: "/inventory", icon: Package },
  { name: "Ponto de Venda", href: "/pos", icon: ShoppingCart },
  { name: "Exportar", href: "/export", icon: Download },
  { name: "Configurações", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 fixed h-full z-20">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
            <Book className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">LibraryPro</h1>
            <p className="text-sm text-gray-500">Gestão de Livraria</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive
                  ? "text-primary-600 bg-primary-50"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

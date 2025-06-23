import { Link, useLocation } from "wouter";
import { 
  Barcode, 
  Package, 
  ShoppingCart, 
  Download, 
  Settings, 
  BarChart3,
  Library,
  Truck
} from "lucide-react";
import Logo from "./logo";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Busca por ISBN", href: "/isbn-search", icon: Barcode },
  { name: "Catálogo", href: "/catalog", icon: Library },
  { name: "Estoque", href: "/inventory", icon: Package },
  { name: "Ponto de Venda", href: "/pos", icon: ShoppingCart },
  { name: "Pedidos", href: "/orders", icon: Truck },
  { name: "Exportar", href: "/export", icon: Download },
  { name: "Configurações", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-yellow-50 dark:bg-black-800 shadow-lg border-r border-orange-300 dark:border-orange-600 fixed h-full z-20">
      <div className="p-6 border-b border-orange-300 dark:border-orange-600">
        <div className="flex items-center space-x-3">
          <Logo className="w-12 h-12" />
          <div>
            <h1 className="text-xl font-bold text-black dark:text-yellow-300">LibraryPro</h1>
            <p className="text-sm text-black-700 dark:text-yellow-500">Gestão de Livraria</p>
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
                  ? "text-black bg-orange-200 dark:text-yellow-300 dark:bg-orange-700"
                  : "text-black-700 hover:bg-yellow-200 dark:text-yellow-400 dark:hover:bg-black-600"
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

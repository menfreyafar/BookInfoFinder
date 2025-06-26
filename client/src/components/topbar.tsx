import { AlertTriangle } from "lucide-react";

interface TopBarProps {
  title?: string;
  description?: string;
}

export default function TopBar({ title, description }: TopBarProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          {title && <h2 className="text-2xl font-bold text-gray-900">{title}</h2>}
          {description && <p className="text-gray-600">{description}</p>}
        </div>
        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-gray-600 hover:text-gray-900">
            <AlertTriangle className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">AD</span>
            </div>
            <span className="text-gray-700 font-medium">Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
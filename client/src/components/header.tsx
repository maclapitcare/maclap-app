import { useState } from "react";
import { Search, Wifi, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  onSearch?: (query: string) => void;
  onMenuClick?: () => void;
}

export function Header({ title, onSearch, onMenuClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-3 sm:px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="lg:hidden p-2"
          >
            <Menu size={20} />
          </Button>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">{title}</h1>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="relative hidden sm:block">
            <Input
              type="text"
              placeholder="Search transactions, notes..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2 w-48 lg:w-64"
            />
            <Search className="absolute left-3 top-3 text-gray-400" size={16} />
          </div>
          
          <div className="flex items-center space-x-1 text-xs sm:text-sm">
            <div className="flex items-center space-x-1 text-green-600">
              <Wifi className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Synced</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile search bar */}
      <div className="mt-3 sm:hidden">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2 w-full"
          />
          <Search className="absolute left-3 top-3 text-gray-400" size={16} />
        </div>
      </div>
    </header>
  );
}

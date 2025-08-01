import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Wallet, Home, Ticket, Clock, Gauge, StickyNote, Trash2, LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Dashboard" },
    { path: "/transactions", icon: Ticket, label: "Transactions" },
    { path: "/pending", icon: Clock, label: "Pending Payments" },
    { path: "/meter", icon: Gauge, label: "Meter Readings" },
    { path: "/notes", icon: StickyNote, label: "Notes" },
    { path: "/delete", icon: Trash2, label: "Delete Records", danger: true },
  ];

  const handleNavClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 h-full">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Wallet className="text-2xl text-primary" />
            <div>
              <h2 className="font-bold text-gray-800 text-sm sm:text-base">Maclap Tracker</h2>
              <p className="text-xs sm:text-sm text-gray-600">Welcome, {user?.name}</p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="lg:hidden p-2"
            >
              <X size={18} />
            </Button>
          )}
        </div>
      </div>
      
      <nav className="p-3 sm:p-4">
        <ul className="space-y-1 sm:space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || (item.path === "/" && location === "/");
            
            return (
              <li key={item.path}>
                <Link 
                  href={item.path} 
                  onClick={handleNavClick}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm sm:text-base ${
                    isActive 
                      ? "bg-primary/10 text-primary font-medium" 
                      : item.danger
                        ? "text-red-700 hover:bg-red-50"
                        : "text-gray-700 hover:bg-gray-100"
                  }`}>
                  <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        
        <div className="mt-6 sm:mt-8 pt-4 border-t border-gray-200">
          <button 
            onClick={() => {
              logout();
              handleNavClick();
            }}
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors w-full text-sm sm:text-base"
          >
            <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

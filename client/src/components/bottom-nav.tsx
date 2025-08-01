import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Home, CreditCard, FileText, Settings, Menu, X, Gauge, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function BottomNav() {
  const [location] = useLocation();

  const mainNavItems = [
    { path: "/", icon: CreditCard, label: "Transaction" },
    { path: "/dashboard", icon: Home, label: "Dashboard" },
    { path: "/meter-readings", icon: Gauge, label: "Meter" },
    { path: "/notes", icon: FileText, label: "Notes" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-pb">
      <div className="flex justify-between items-center px-2 py-2 max-w-screen-xl mx-auto">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || (item.path === "/" && location === "/");
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center py-2 px-1 min-w-0 flex-1 rounded-lg transition-colors ${
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="text-xs mt-1 font-medium truncate w-full text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
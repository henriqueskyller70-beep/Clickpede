"use client";

import React from 'react';
import { ShoppingCart } from 'lucide-react';

interface AppLogoProps {
  isCollapsed?: boolean; // Para ajustar a visibilidade em sidebar colapsada
  textColor?: string; // Cor do texto 'Click'
  highlightColor?: string; // Cor do texto 'Pede' e do ícone
}

export const AppLogo: React.FC<AppLogoProps> = ({ 
  isCollapsed = false, 
  textColor = 'text-gray-900', 
  highlightColor = 'text-yellow-500' 
}) => {
  return (
    <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
      <ShoppingCart className="w-6 h-6" style={{ color: highlightColor }} />
      {!isCollapsed && (
        <h1 className={`text-xl font-bold ${textColor} tracking-tighter`}>
          Click<span style={{ color: highlightColor }}>Pede</span>
        </h1>
      )}
    </div>
  );
};
"use client";

import React from 'react';
import { Order, StoreProfile } from '../../types';
import { ShoppingBag, ChevronRight } from 'lucide-react';

interface RecentOrdersProps {
  orders: Order[];
  storePrimaryColor: string;
  onViewAllOrders: () => void;
}

export const RecentOrders: React.FC<RecentOrdersProps> = ({ orders, storePrimaryColor, onViewAllOrders }) => {
  const displayOrders = orders.slice(0, 5); // Mostrar apenas os 5 pedidos mais recentes

  return (
    <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-100 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-800">Pedidos Recentes</h3>
        <button 
          onClick={onViewAllOrders} 
          className="text-sm font-medium flex items-center gap-1 hover:underline transition-colors"
          style={{ color: storePrimaryColor }}
        >
          Ver Todos <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      {displayOrders.length === 0 ? (
        <div className="text-center text-gray-500 py-4">Nenhum pedido recente.</div>
      ) : (
        <div className="space-y-3">
          {displayOrders.map(order => (
            <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ backgroundColor: `${storePrimaryColor}20`, color: storePrimaryColor }}>
                  {order.customerName[0]}
                </div>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{order.customerName}</p>
                  <p className="text-xs text-gray-500">{new Date(order.date).toLocaleTimeString()} - {new Date(order.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 text-sm">R$ {order.total.toFixed(2)}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {order.status === 'delivered' ? 'Entregue' : 'Pendente'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
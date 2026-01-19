"use client";

import React, { useEffect, useState } from 'react';
import { Bell, X, ArrowRight } from 'lucide-react';
import 'animate.css';

interface NewOrderNotificationProps {
  order: {
    orderId: string;
    customerName: string;
    date: string;
  };
  onDismiss: (orderId: string) => void;
  onViewOrder: (orderId: string) => void;
}

export const NewOrderNotification: React.FC<NewOrderNotificationProps> = ({
  order,
  onDismiss,
  onViewOrder,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 10000); // Notificação desaparece após 10 segundos se não for interagida

    return () => clearTimeout(timer);
  }, [order.orderId]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(order.orderId), 500); // Espera a animação de saída
  };

  const handleView = () => {
    setIsVisible(false);
    setTimeout(() => onViewOrder(order.orderId), 500); // Espera a animação de saída
  };

  return (
    <div
      className={`order-overlay flex items-center gap-4 animate__animated ${
        isVisible ? 'animate__fadeInUp animate__tada' : 'animate__fadeOutDown'
      }`}
      style={{ minWidth: '280px' }}
    >
      <Bell className="w-8 h-8 text-yellow-500 animate__animated animate__swing animate__infinite animate__slow" />
      <div className="flex-1">
        <p className="font-bold text-gray-900 text-sm">Novo Pedido!</p>
        <p className="text-xs text-gray-600">De: {order.customerName}</p>
        <p className="text-xs text-gray-500">{new Date(order.date).toLocaleTimeString()}</p>
      </div>
      <div className="flex flex-col gap-2">
        <button
          onClick={handleView}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1"
        >
          Ver Pedido <ArrowRight className="w-3 h-3" />
        </button>
        <button
          onClick={handleDismiss}
          className="text-gray-500 hover:text-gray-700 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Dispensar
        </button>
      </div>
    </div>
  );
};
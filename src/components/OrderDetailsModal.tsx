"use client";

import React from 'react';
import { X, ShoppingBag, User, Calendar, Tag, Package, CheckCircle, Truck, Clock, Bike } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Order, StoreProfile, Product, Option, SubProduct } from '../../types';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  storePrimaryColor: string;
  allProducts: Product[]; // Needed to resolve sub-product details
  onUpdateOrderStatus: (orderId: string, newStatus: Order['status']) => void;
  shouldShake?: boolean; // NOVO: Prop para controlar a animação de tremor
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
  storePrimaryColor,
  allProducts,
  onUpdateOrderStatus,
  shouldShake = false, // Valor padrão
}) => {
  // Adicionando logs para depuração
  console.log("OrderDetailsModal rendering. Order:", order);
  console.log("OrderDetailsModal rendering. All Products:", allProducts);

  if (!order) return null;

  // Helper to calculate item total including options
  const calculateItemDisplayPrice = (item: Order['items'][0]) => {
    let total = item.price;
    if (item.selectedOptions) {
      item.selectedOptions.forEach(selOpt => {
        const originalProduct = allProducts.find(p => p.id === item.id);
        if (originalProduct) { // Adicionando verificação para originalProduct
          const option = originalProduct.options.find(opt => opt.id === selOpt.optionId);
          const subProduct = option?.subProducts.find(sp => sp.id === selOpt.subProductId);
          if (subProduct) {
            total += subProduct.price * selOpt.quantity;
          }
        } else {
          console.warn(`[OrderDetailsModal] Produto original não encontrado para o item do pedido: ${item.name} (ID: ${item.id})`);
        }
      });
    }
    return total;
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'preparing': return 'bg-blue-100 text-blue-700';
      case 'in_transit': return 'bg-purple-100 text-purple-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'trashed': return 'bg-gray-200 text-gray-600'; // Cor para 'trashed'
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Modal 
      open={isOpen} 
      onClose={onClose} 
      title={`Detalhes do Pedido #${order.id?.substring(0, 8)}`}
      contentClassName={shouldShake ? 'animate-shake' : ''} // Aplica a classe de tremor condicionalmente
    >
      {/* O conteúdo do modal foi movido para dentro do children do Modal */}
      <div className="space-y-6">
        {/* Order Summary */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-600" />
            <p className="font-semibold text-gray-800">Cliente: {order.customerName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <p className="text-sm text-gray-600">Data: {new Date(order.date).toLocaleString('pt-BR')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-600" />
            <p className="text-sm text-gray-600">Status: <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>{order.status}</span></p>
          </div>
        </div>

        {/* Order Items */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3">Itens do Pedido</h3>
          <div className="space-y-3">
            {order.items.map(item => (
              <div key={item.cartItemId} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-gray-900">{item.quantity}x {item.name}</p>
                  <p className="font-bold text-gray-900">R$ {(calculateItemDisplayPrice(item) * item.quantity).toFixed(2)}</p>
                </div>
                {item.selectedOptions && item.selectedOptions.length > 0 && (
                  <div className="ml-4 text-xs text-gray-600 space-y-0.5">
                    {item.selectedOptions.map(selOpt => {
                      const originalProduct = allProducts.find(p => p.id === item.id);
                      const option = originalProduct?.options.find(opt => opt.id === selOpt.optionId);
                      const subProduct = option?.subProducts.find(sp => sp.id === selOpt.subProductId);
                      return subProduct ? (
                        <p key={selOpt.optionId + selOpt.subProductId}>
                          - {selOpt.quantity}x {subProduct.name} {subProduct.price > 0 ? ` (+R$ ${subProduct.price.toFixed(2)})` : ''}
                        </p>
                      ) : null;
                    })}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">Preço unitário: R$ {calculateItemDisplayPrice(item).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <span className="text-lg font-bold text-gray-800">Total:</span>
          <span className="text-2xl font-extrabold text-green-600">R$ {order.total.toFixed(2)}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          {order.status === 'pending' && (
            <button
              onClick={() => onUpdateOrderStatus(order.id, 'preparing')}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-bold shadow-lg transition-all transform active:scale-95 flex items-center gap-2"
            >
              <Clock className="w-4 h-4" /> Marcar como Preparando
            </button>
          )}
          {order.status === 'preparing' && (
            <button
              onClick={() => onUpdateOrderStatus(order.id, 'in_transit')} 
              className="bg-purple-600 text-white px-5 py-2.5 rounded-lg hover:bg-purple-700 font-bold shadow-lg transition-all transform active:scale-95 flex items-center gap-2"
            >
              <Bike className="w-4 h-4" /> Marcar como Em Rota
            </button>
          )}
          {order.status === 'in_transit' && ( 
            <button
              onClick={() => onUpdateOrderStatus(order.id, 'delivered')}
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 font-bold shadow-lg transition-all transform active:scale-95 flex items-center gap-2"
            >
              <Truck className="w-4 h-4" /> Marcar como Entregue
            </button>
          )}
          {order.status === 'trashed' && (
            <button
              onClick={() => onUpdateOrderStatus(order.id, 'pending')} // Opção de restaurar da lixeira
              className="bg-gray-600 text-white px-5 py-2.5 rounded-lg hover:bg-gray-700 font-bold shadow-lg transition-all transform active:scale-95 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Restaurar Pedido
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-all transform active:scale-95"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
};
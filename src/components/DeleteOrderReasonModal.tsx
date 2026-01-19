"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Trash2, X, AlertTriangle } from 'lucide-react';
import { showError } from '../utils/toast';

interface DeleteOrderReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orderId: string, reason: string) => void;
  orderId: string;
  orderCustomerName: string;
}

export const DeleteOrderReasonModal: React.FC<DeleteOrderReasonModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orderId,
  orderCustomerName,
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setReason(''); // Reset reason when modal closes
      setLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showError("Por favor, insira um motivo para a exclusão do pedido.");
      return;
    }
    setLoading(true);
    await onConfirm(orderId, reason.trim());
    setLoading(false);
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-600" /> Excluir Pedido
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-50"><X className="w-5 h-5"/></button>
      </div>

      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Atenção!</p>
          <p className="text-sm">Você está prestes a mover o pedido de <span className="font-bold">{orderCustomerName}</span> para a lixeira.</p>
          <p className="text-sm mt-1">Por favor, forneça um motivo para esta ação.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="deletionReason" className="block text-sm font-medium text-gray-700 mb-1">
            Motivo da Exclusão <span className="text-red-500">*</span>
          </label>
          <textarea
            id="deletionReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 shadow-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 transition-all resize-none"
            placeholder="Ex: Cliente desistiu, Erro no pedido, Item em falta..."
            required
            disabled={loading}
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-all transform active:scale-95"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-red-600 text-white px-6 py-2.5 rounded-lg hover:bg-red-700 font-bold shadow-lg transition-all transform active:scale-95 flex items-center gap-2"
            disabled={loading}
          >
            <Trash2 className="w-4 h-4" /> {loading ? 'Excluindo...' : 'Mover para Lixeira'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
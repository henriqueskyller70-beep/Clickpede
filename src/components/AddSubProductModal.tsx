"use client";

import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Modal } from './ui/Modal';
import { StoreProfile, SubProduct } from '../../types';

interface AddSubProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subProduct: Omit<SubProduct, 'id' | 'isActive'>) => void;
  storeProfile: StoreProfile;
}

export const AddSubProductModal: React.FC<AddSubProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  storeProfile,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setName('');
      setDescription('');
      setPrice(0);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('O nome do item é obrigatório.');
      return;
    }
    onSave({ name: name.trim(), description: description.trim(), price });
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4 text-gray-900">Adicionar Novo Sabor/Item</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="subProductName" className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Item <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="subProductName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 focus:border-[#9f1239] transition-all"
            style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
            placeholder="Ex: Calabresa, Borda Recheada"
            required
          />
        </div>
        <div>
          <label htmlFor="subProductDescription" className="block text-sm font-medium text-gray-700 mb-1">
            Descrição (Opcional)
          </label>
          <textarea
            id="subProductDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 focus:border-[#9f1239] transition-all resize-none"
            style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
            placeholder="Uma breve descrição do sabor ou item..."
          />
        </div>
        <div>
          <label htmlFor="subProductPrice" className="block text-sm font-medium text-gray-700 mb-1">
            Valor Adicional (R$)
          </label>
          <input
            type="number"
            id="subProductPrice"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value))}
            className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 focus:border-[#9f1239] transition-all"
            style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
            placeholder="0.00"
            min="0"
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-all transform active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 font-bold shadow-lg transition-all transform active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
      </form>
    </Modal>
  );
};
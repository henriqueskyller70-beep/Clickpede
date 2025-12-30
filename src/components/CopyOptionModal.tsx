"use client";

import React, { useState, useEffect } from 'react';
import { X, Search, Check, Copy } from 'lucide-react'; // Adicionado Copy aqui
import { Modal } from './ui/Modal';
import { Product, StoreProfile } from '../../types';

interface CopyOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopy: (sourceProductId: string, sourceOptionId: string, targetProductIds: string[]) => void;
  allProducts: Product[];
  sourceProductId: string;
  sourceOptionId: string;
  sourceOptionTitle: string;
  storeProfile: StoreProfile;
}

export const CopyOptionModal: React.FC<CopyOptionModalProps> = ({
  isOpen,
  onClose,
  onCopy,
  allProducts,
  sourceProductId,
  sourceOptionId,
  sourceOptionTitle,
  storeProfile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTargetProductIds, setSelectedTargetProductIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedTargetProductIds([]);
    }
  }, [isOpen]);

  const filteredProducts = allProducts.filter(product =>
    product.id !== sourceProductId && // Excluir o produto de origem
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleProductSelection = (productId: string) => {
    setSelectedTargetProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTargetProductIds.length === 0) {
      alert('Por favor, selecione pelo menos um produto para copiar a opção.');
      return;
    }
    onCopy(sourceProductId, sourceOptionId, selectedTargetProductIds);
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4 text-gray-900">
        Copiar Opção: "{sourceOptionTitle}"
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Selecione para quais produtos você deseja copiar esta opção.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar produtos..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9f1239]/20 focus:border-[#9f1239] shadow-sm transition-all"
            style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
          {filteredProducts.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-4">Nenhum produto encontrado.</p>
          ) : (
            filteredProducts.map(product => (
              <div
                key={product.id}
                className="flex items-center justify-between p-2 rounded-md bg-white border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleToggleProductSelection(product.id!)}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedTargetProductIds.includes(product.id!)}
                    onChange={() => handleToggleProductSelection(product.id!)}
                    className="form-checkbox h-4 w-4 rounded focus:ring-[#9f1239] shadow-sm"
                    style={{ color: storeProfile.primaryColor }}
                  />
                  <span className="text-sm font-medium text-gray-800">{product.name}</span>
                </div>
                {selectedTargetProductIds.includes(product.id!) && (
                  <Check className="w-4 h-4 text-green-600" />
                )}
              </div>
            ))
          )}
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
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-bold shadow-lg transition-all transform active:scale-95 flex items-center gap-2"
            disabled={selectedTargetProductIds.length === 0}
          >
            <Copy className="w-4 h-4" /> Copiar Opção
          </button>
        </div>
      </form>
    </Modal>
  );
};
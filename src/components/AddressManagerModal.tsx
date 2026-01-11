"use client";

import React, { useState, useEffect } from 'react';
import { X, Plus, MapPin, Edit, Trash2, CheckCircle } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Address } from '../../types';
import { storageService } from '../../services/storageService';
import { showError } from '../utils/toast';

interface AddressManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressSelected: (addressId: string) => void;
  currentSelectedAddressId: string | null;
}

export const AddressManagerModal: React.FC<AddressManagerModalProps> = ({
  isOpen,
  onClose,
  onAddressSelected,
  currentSelectedAddressId,
}) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isAddEditFormOpen, setIsAddEditFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState<Omit<Address, 'id' | 'isDefault'>>({
    street: '', number: '', neighborhood: '', city: '', complement: '', reference: ''
  });

  useEffect(() => {
    if (isOpen) {
      setAddresses(storageService.getAddresses());
    }
  }, [isOpen]);

  const handleOpenAddForm = () => {
    setEditingAddress(null);
    setAddressForm({ street: '', number: '', neighborhood: '', city: '', complement: '', reference: '' });
    setIsAddEditFormOpen(true);
  };

  const handleOpenEditForm = (address: Address) => {
    setEditingAddress(address);
    setAddressForm({
      street: address.street,
      number: address.number,
      neighborhood: address.neighborhood,
      city: address.city,
      complement: address.complement || '',
      reference: address.reference || '',
    });
    setIsAddEditFormOpen(true);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.street || !addressForm.number || !addressForm.neighborhood || !addressForm.city) {
      showError("Por favor, preencha todos os campos obrigatórios (Rua, Número, Bairro, Cidade).");
      return;
    }

    let updatedAddresses: Address[];
    if (editingAddress) {
      // Update existing address
      updatedAddresses = storageService.updateAddress({ ...editingAddress, ...addressForm });
    } else {
      // Add new address
      updatedAddresses = storageService.addAddress(addressForm);
      // If it's the first address, automatically select it
      if (updatedAddresses.length === 1) {
        onAddressSelected(updatedAddresses[0].id);
      }
    }
    setAddresses(updatedAddresses);
    setIsAddEditFormOpen(false);
    setEditingAddress(null);
    setAddressForm({ street: '', number: '', neighborhood: '', city: '', complement: '', reference: '' });
  };

  const handleDeleteAddress = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este endereço?")) {
      const updatedAddresses = storageService.deleteAddress(id);
      setAddresses(updatedAddresses);
      // If the deleted address was the currently selected one, clear selection or select default
      if (currentSelectedAddressId === id) {
        const defaultAddress = updatedAddresses.find(addr => addr.isDefault);
        onAddressSelected(defaultAddress ? defaultAddress.id : (updatedAddresses.length > 0 ? updatedAddresses[0].id : ''));
      }
    }
  };

  const handleSetDefault = (id: string) => {
    const updatedAddresses = storageService.setPrimaryAddress(id);
    setAddresses(updatedAddresses);
  };

  const handleSelectAddress = (id: string) => {
    onAddressSelected(id);
    onClose(); // Close the manager modal after selection
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
        <h2 className="text-xl font-bold text-gray-900">Gerenciar Endereços</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-50"><X className="w-5 h-5"/></button>
      </div>

      {!isAddEditFormOpen ? (
        <>
          <div className="max-h-80 overflow-y-auto space-y-3 mb-4 pr-2 -mr-2">
            {addresses.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum endereço cadastrado.</p>
            ) : (
              addresses.map(address => (
                <div key={address.id} className={`bg-gray-50 p-4 rounded-lg border ${currentSelectedAddressId === address.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'} shadow-sm flex flex-col gap-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-600" />
                      <p className="font-semibold text-gray-800">
                        {address.street}, {address.number} - {address.neighborhood}
                      </p>
                    </div>
                    {address.isDefault && (
                      <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Padrão</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 ml-6">
                    {address.city}
                    {address.complement && `, ${address.complement}`}
                    {address.reference && ` (Ref: ${address.reference})`}
                  </p>
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => handleOpenEditForm(address)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:underline px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      <Edit className="w-4 h-4" /> Editar
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(address.id)}
                      className="flex items-center gap-1 text-sm text-red-600 hover:underline px-3 py-1 rounded-md hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Excluir
                    </button>
                    {!address.isDefault && (
                      <button
                        onClick={() => handleSetDefault(address.id)}
                        className="flex items-center gap-1 text-sm text-gray-600 hover:underline px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" /> Definir Padrão
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleSelectAddress(address.id)}
                    className={`w-full py-2 rounded-lg font-bold text-sm mt-2 transition-colors ${currentSelectedAddressId === address.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                  >
                    {currentSelectedAddressId === address.id ? 'Endereço Selecionado' : 'Selecionar Endereço'}
                  </button>
                </div>
              ))
            )}
          </div>
          <button
            onClick={handleOpenAddForm}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-green-700 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Adicionar Novo Endereço
          </button>
        </>
      ) : (
        <form onSubmit={handleSaveAddress} className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{editingAddress ? 'Editar Endereço' : 'Adicionar Novo Endereço'}</h3>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 uppercase ml-1">Rua / Avenida</label>
            <input required placeholder="Ex: Rua das Flores" value={addressForm.street} onChange={e => setAddressForm({...addressForm, street: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase ml-1">Número</label>
              <input required placeholder="123" value={addressForm.number} onChange={e => setAddressForm({...addressForm, number: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"/>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase ml-1">Bairro</label>
              <input required placeholder="Centro" value={addressForm.neighborhood} onChange={e => setAddressForm({...addressForm, neighborhood: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"/>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 uppercase ml-1">Cidade</label>
            <input required placeholder="Sua Cidade" value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"/>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 uppercase ml-1">Complemento (Opcional)</label>
            <input placeholder="Apto 101, Bloco B" value={addressForm.complement} onChange={e => setAddressForm({...addressForm, complement: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"/>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 uppercase ml-1">Ponto de Referência (Opcional)</label>
            <input placeholder="Próximo à padaria" value={addressForm.reference} onChange={e => setAddressForm({...addressForm, reference: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"/>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsAddEditFormOpen(false)}
              className="px-5 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-all transform active:scale-95"
            >
              Cancelar
            </button>
            <button type="submit" 
                className="relative overflow-hidden group text-white py-2.5 px-6 rounded-lg font-bold text-sm shadow-lg hover:shadow-xl transition-colors active:scale-[0.98]"
                style={{ backgroundColor: '#9f1239' }}
            >
                {editingAddress ? 'Salvar Alterações' : 'Adicionar Endereço'}
                <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
"use client";

import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Lock, AlertTriangle, X } from 'lucide-react'; // Adicionado X aqui

interface AdminPasswordConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  title?: string;
  description?: string;
}

export const AdminPasswordConfirmModal: React.FC<AdminPasswordConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmação de Administrador",
  description = "Por favor, insira sua senha de administrador para confirmar esta ação.",
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("A senha não pode ser vazia.");
      return;
    }
    // ATENÇÃO: Esta validação é APENAS para fins de demonstração da UI.
    // Em um ambiente de produção, a verificação da senha DEVE ser feita no backend
    // (ex: Supabase Edge Function) para garantir a segurança.
    // Não armazene senhas em texto simples no frontend.
    onConfirm(password);
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Lock className="w-5 h-5 text-gray-600" /> {title}
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-50"><X className="w-5 h-5"/></button>
      </div>

      <p className="text-gray-600 mb-4">{description}</p>
      
      <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-red-700 text-sm flex items-start gap-2 mb-6">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Aviso de Segurança:</p>
          <p>A verificação de senha no frontend é **insegura**. Para uma proteção real, esta validação deve ser implementada em um **backend** (ex: Supabase Edge Function).</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Senha de Administrador
          </label>
          <input
            type="password"
            id="adminPassword"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50 shadow-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 transition-all"
            placeholder="Insira sua senha"
            required
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
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
            className="bg-red-600 text-white px-6 py-2.5 rounded-lg hover:bg-red-700 font-bold shadow-lg transition-all transform active:scale-95 flex items-center gap-2"
          >
            Confirmar Exclusão
          </button>
        </div>
      </form>
    </Modal>
  );
};
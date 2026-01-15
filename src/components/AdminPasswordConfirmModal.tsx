"use client";

import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Lock, AlertTriangle, X } from 'lucide-react';
import { useSession } from './SessionContextProvider'; // Importar useSession
import { storageService } from '../../services/storageService'; // Importar storageService
import { showError, showLoading, dismissToast } from '../utils/toast'; // Importar toasts

interface AdminPasswordConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void; // onConfirm agora espera a senha para passar para o backend
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
  const { supabase, session } = useSession(); // Obter supabase e session
  const userId = session?.user?.id;

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Estado de carregamento

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!password.trim()) {
      setError("A senha não pode ser vazia.");
      setLoading(false);
      return;
    }

    if (!userId) {
      showError("Usuário não autenticado. Não é possível verificar a senha.");
      setLoading(false);
      return;
    }

    const toastId = showLoading("Verificando senha...");
    try {
      const result = await storageService.verifyAdminPassword(supabase, userId, password);

      if (result.success) {
        dismissToast(toastId);
        onConfirm(password); // Se a senha for verificada com sucesso, chame onConfirm
        setPassword('');
        onClose();
      } else {
        setError(result.message || "Senha incorreta. Tente novamente.");
        showError(result.message || "Senha incorreta. Tente novamente.");
      }
    } catch (err: any) {
      console.error("Erro ao verificar senha:", err);
      setError(err.message || "Erro inesperado ao verificar senha.");
      showError(err.message || "Erro inesperado ao verificar senha.");
    } finally {
      dismissToast(toastId);
      setLoading(false);
    }
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
      
      {/* Removido o aviso de segurança, pois agora estamos usando uma Edge Function */}

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
            disabled={loading}
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
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
            {loading ? 'Verificando...' : 'Confirmar Exclusão'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
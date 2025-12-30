"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from './SessionContextProvider';
import { Eye, EyeOff } from 'lucide-react';
import { showSuccess, showError } from '../utils/toast';

export const ResetPasswordPage: React.FC = () => {
  const { supabase } = useSession();
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (newPassword !== confirmNewPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }
    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setError(error.message);
      } else {
        setMessage('Sua senha foi redefinida com sucesso! Você pode fazer login agora.');
        // Optionally redirect to login page
        window.location.hash = '#/';
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#9f1239] flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-6 mt-4">Redefinir Senha</h2>

        <form onSubmit={handlePasswordReset} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nova Senha:</label>
            <div className="relative">
              <input 
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-[#9f1239] focus:outline-none transition-shadow pr-10"
                placeholder="******"
                required
                minLength={6}
              />
              <button 
                type="button" 
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmar Nova Senha:</label>
            <div className="relative">
              <input 
                type={showConfirmNewPassword ? "text" : "password"}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-[#9f1239] focus:outline-none transition-shadow pr-10"
                placeholder="******"
                required
                minLength={6}
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmNewPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-green-50 text-green-600 text-sm p-3 rounded-md border border-green-200">
              {message}
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-[#2d1a1a] text-white font-bold py-3 rounded-lg hover:bg-black transition-all transform active:scale-95 shadow-lg"
            disabled={loading}
          >
            {loading ? 'Redefinindo...' : 'Redefinir Senha'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <a href="#/" className="text-sm text-[#9f1239] hover:underline font-medium">
            Voltar para o Login
          </a>
        </div>
      </div>
    </div>
  );
};
"use client";

import React, { useState } from 'react';
import { useSession } from './SessionContextProvider';
import { showSuccess, showError } from '../utils/toast';

interface ForgotPasswordPageProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onClose, onSwitchToLogin }) => {
  const { supabase } = useSession();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });
      setMessage('Verifique seu e-mail para o link de redefinição de senha.');
      showSuccess('E-mail de redefinição enviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      setError(err.message);
      showError(err.message || 'Erro ao enviar e-mail de redefinição.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full"> {/* Removido bg, shadow, p-8, rounded-2xl, z-10 */}
      {/* <h2 className="text-3xl font-bold text-gray-900 text-center mb-6 mt-4">Esqueceu sua Senha?</h2> */} {/* Removido título */}
      <p className="text-gray-600 text-center mb-6">
        Insira seu e-mail para receber um link de redefinição de senha.
      </p>
      <form onSubmit={handleForgotPassword} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-[#9f1239] focus:outline-none transition-shadow"
            placeholder="seuemail@exemplo.com"
            required
          />
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
          {loading ? 'Enviando...' : 'Redefinir Senha'}
        </button>
      </form>
      <div className="mt-6 text-center">
        <button onClick={onSwitchToLogin} className="text-sm text-[#9f1239] hover:underline font-medium">
          Voltar para o Login
        </button>
      </div>
    </div>
  );
};
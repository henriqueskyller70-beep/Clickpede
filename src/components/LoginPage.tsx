"use client";

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useSession } from './SessionContextProvider'; // Importar o hook de sessão

export const LoginPage: React.FC = () => {
  const { supabase } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false); // Novo estado para lembrar e-mail

  // Efeito para carregar o e-mail salvo do localStorage ao montar o componente
  useEffect(() => {
    const storedEmail = localStorage.getItem('rememberedEmail');
    if (storedEmail) {
      setEmail(storedEmail);
      setRememberEmail(true); // Marcar a caixa se o e-mail foi lembrado
    }
  }, []);

  // Efeito para salvar/remover o e-mail do localStorage quando o e-mail ou a opção de lembrar mudar
  useEffect(() => {
    if (rememberEmail && email) {
      localStorage.setItem('rememberedEmail', email);
    } else if (!rememberEmail) {
      localStorage.removeItem('rememberedEmail');
    }
  }, [rememberEmail, email]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let errorMessage = 'Ocorreu um erro inesperado. Tente novamente.';
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Login e/ou senha inválidos.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Seu e-mail ainda não foi confirmado. Por favor, verifique sua caixa de entrada.';
        }
        setError(errorMessage);
      } else {
        // Redirecionamento será tratado pelo useEffect no App.tsx
      }
    } catch (err: any) {
      setError('Ocorreu um erro inesperado. Tente novamente.');
      console.error('Erro de login:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    const redirectTo = `${window.location.origin}/`; // Corrigido para usar window.location.origin

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.error(error);
      setError('Erro ao autenticar com Google');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full relative z-10">
      <h2 className="text-3xl font-bold text-gray-900 text-center mb-6 mt-4">Acesse sua Conta</h2>

      <form onSubmit={handleLogin} className="space-y-5">
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
        {/* Nova caixa de seleção para lembrar e-mail */}
        <div className="flex items-center mt-2">
          <input
            type="checkbox"
            id="rememberEmail"
            checked={rememberEmail}
            onChange={(e) => setRememberEmail(e.target.checked)}
            className="form-checkbox h-4 w-4 text-[#9f1239] rounded focus:ring-[#9f1239]"
          />
          <label htmlFor="rememberEmail" className="ml-2 text-sm text-gray-700">
            Lembrar meu e-mail
          </label>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Senha:</label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-[#9f1239] focus:outline-none transition-shadow pr-10"
              placeholder="******"
              required
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-200">
            {error}
          </div>
        )}

        <button 
          type="submit"
          className="w-full bg-[#2d1a1a] text-white font-bold py-3 rounded-lg hover:bg-black transition-all transform active:scale-95 shadow-lg"
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="relative flex items-center justify-center my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-300"></span>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">Ou</span>
        </div>
      </div>

      <button 
        onClick={handleGoogleSignIn}
        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
        disabled={loading}
      >
        <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google logo" className="w-5 h-5" />
        {loading ? 'Conectando...' : 'Continuar com Google'}
      </button>

      <div className="mt-6 text-center space-y-2">
        <a href="#/register" className="text-sm text-[#9f1239] hover:underline font-medium block">
          Não tem uma conta? Cadastre-se
        </a>
        <a href="#/forgot-password" className="text-sm text-gray-500 hover:underline font-medium block">
          Esqueceu sua senha?
        </a>
      </div>
    </div>
  );
};
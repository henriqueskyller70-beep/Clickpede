"use client";

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useSession } from './SessionContextProvider'; // Importar o hook de sessão

export const RegisterPage: React.FC = () => {
  const { supabase } = useSession(); // Usar o cliente Supabase do contexto
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
          },
        },
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        setMessage('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar sua conta.');
        // Redireciona para a página de login após o cadastro
        window.location.hash = '#/'; 
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true);
        try {
            const redirectTo = window.location.origin;

            console.log('[Google Sign-In] Redirecting to:', redirectTo);

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });

            if (error) {
                console.error(error);
                setError(error.message);
            }
            // Se não houver erro, o Supabase redirecionará o usuário para o Google e depois de volta.
            // O useEffect no App.tsx cuidará do redirecionamento para o dashboard se a sessão for estabelecida.
        } catch (err: any) {
            setError('Erro ao tentar autenticar com Google.');
            console.error('Erro Google Sign-In:', err);
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full relative z-10">
      <h2 className="text-3xl font-bold text-gray-900 text-center mb-6 mt-4">Crie sua Conta</h2>

      <form onSubmit={handleRegister} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nome:</label>
                <input 
                    type="text" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-[#9f1239] focus:outline-none transition-shadow"
                    placeholder="Seu nome"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Sobrenome:</label>
                <input 
                    type="text" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-[#9f1239] focus:outline-none transition-shadow"
                    placeholder="Seu sobrenome"
                    required
                />
            </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Telefone:</label>
          <input 
            type="tel" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-[#9f1239] focus:outline-none transition-shadow"
            placeholder="(XX) XXXXX-XXXX"
            required
          />
        </div>
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
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmar Senha:</label>
          <div className="relative">
            <input 
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-[#9f1239] focus:outline-none transition-shadow pr-10"
              placeholder="******"
              required
            />
            <button 
              type="button" 
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
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
          {loading ? 'Cadastrando...' : 'Cadastrar'}
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

      <div className="mt-6 text-center">
        <a href="#/" className="text-sm text-[#9f1239] hover:underline font-medium">
          Já tem uma conta? Faça login
        </a>
      </div>
    </div>
  );
};
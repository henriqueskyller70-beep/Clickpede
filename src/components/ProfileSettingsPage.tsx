"use client";

import React, { useState, useEffect } from 'react';
import { UploadCloud, User, Eye, EyeOff } from 'lucide-react'; // Import Eye icons
import { useSession } from './SessionContextProvider';
import { storageService } from '../../services/storageService';
import { showSuccess, showError } from '../utils/toast';

interface ProfileSettingsPageProps {
  onProfileUpdate: () => void; // Callback para atualizar o avatar no header do Dashboard
}

export const ProfileSettingsPage: React.FC<ProfileSettingsPageProps> = ({ onProfileUpdate }) => {
  const { supabase, session } = useSession();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email; // Get current user email

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState(''); // New state for phone
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // States for email and password changes
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState(''); // Not strictly needed for Supabase updateUser, but good UX
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (userId) {
        setLoading(true);
        const profile = await storageService.getProfile(supabase, userId);
        if (profile) {
          setFirstName(profile.first_name || '');
          setLastName(profile.last_name || '');
          setPhone(profile.phone || ''); // Set phone from profile
          setAvatarUrl(profile.avatar_url || null);
          setLocalAvatarPreview(profile.avatar_url || null);
        }
        setNewEmail(userEmail || ''); // Initialize newEmail with current email
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId, supabase, userEmail]);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setAvatarFile(file || null);
    if (file) {
      setLocalAvatarPreview(URL.createObjectURL(file));
    } else {
      setLocalAvatarPreview(avatarUrl); // Reverte para a URL existente se nenhum arquivo for selecionado
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      showError("Usuário não autenticado.");
      return;
    }
    setLoading(true);
    try {
      const newAvatarUrl = await storageService.updateProfile(supabase, userId, firstName, lastName, phone, avatarFile); // Pass phone
      if (newAvatarUrl) {
        setAvatarUrl(newAvatarUrl);
        setLocalAvatarPreview(newAvatarUrl);
      }
      setAvatarFile(null); // Limpa o arquivo selecionado após o upload
      onProfileUpdate(); // Chama o callback para atualizar o Dashboard
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      showError("Erro ao salvar perfil.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail === userEmail) {
      showError("Por favor, insira um novo e-mail válido e diferente do atual.");
      return;
    }
    setLoading(true);
    try {
      await storageService.updateUserEmail(supabase, newEmail);
      // Supabase sends a confirmation email, so the session email won't update immediately
      // The user will need to confirm the new email.
    } catch (error) {
      console.error("Erro ao alterar e-mail:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showError("A nova senha e a confirmação não coincidem.");
      return;
    }
    setLoading(true);
    try {
      await storageService.updateUserPassword(supabase, newPassword);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!userEmail) {
      showError("Não foi possível encontrar seu e-mail para redefinir a senha.");
      return;
    }
    setLoading(true);
    try {
      await storageService.resetUserPassword(supabase, userEmail);
    } catch (error) {
      console.error("Erro ao solicitar redefinição de senha:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">Configurações de Perfil</h2>
      
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Avatar Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Avatar</label>
          <div className="mt-1 flex items-center space-x-4">
            <div className="w-24 h-24 bg-gray-100 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200 shadow-lg">
              {localAvatarPreview ? (
                <img 
                  src={localAvatarPreview} 
                  alt="Avatar Preview" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <User className="w-10 h-10 text-gray-400" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarFileChange} 
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Faça upload de uma imagem para o seu avatar.</p>
        </div>

        {/* First Name */}
        <div>
          <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">Nome</label>
          <input 
            type="text" 
            id="firstName"
            className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 shadow-sm focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 transition-all"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">Sobrenome</label>
          <input 
            type="text" 
            id="lastName"
            className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 shadow-sm focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 transition-all"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Phone Number */}
        <div>
          <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">Telefone</label>
          <input 
            type="tel" 
            id="phone"
            className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 shadow-sm focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 transition-all"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
            placeholder="(XX) XXXXX-XXXX"
          />
        </div>

        <div className="pt-6 flex justify-end">
          <button 
            type="submit"
            className="bg-gray-900 text-white px-8 py-3 rounded-lg hover:bg-black font-bold shadow-xl transform active:scale-95 relative overflow-hidden"
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar Perfil'}
            <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
          </button>
        </div>
      </form>

      {/* Email Change Section */}
      <div className="mt-10 pt-6 border-t border-gray-100 space-y-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Alterar E-mail</h3>
        <form onSubmit={handleChangeEmail} className="space-y-4">
          <div>
            <label htmlFor="currentEmail" className="block text-sm font-semibold text-gray-700 mb-2">E-mail Atual</label>
            <input 
              type="email" 
              id="currentEmail"
              className="w-full border border-gray-300 rounded-lg p-3 bg-gray-100 shadow-sm cursor-not-allowed"
              value={userEmail || ''}
              disabled
            />
          </div>
          <div>
            <label htmlFor="newEmail" className="block text-sm font-semibold text-gray-700 mb-2">Novo E-mail</label>
            <input 
              type="email" 
              id="newEmail"
              className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 shadow-sm focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 transition-all"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={loading}
              placeholder="novo.email@exemplo.com"
            />
          </div>
          <div className="flex justify-end">
            <button 
              type="submit"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-bold shadow-xl transform active:scale-95 relative overflow-hidden"
              disabled={loading}
            >
              {loading ? 'Atualizando...' : 'Alterar E-mail'}
              <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
            </button>
          </div>
        </form>
      </div>

      {/* Password Change Section */}
      <div className="mt-10 pt-6 border-t border-gray-100 space-y-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Alterar Senha</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Current Password (optional, Supabase handles auth state) */}
          {/* <div>
            <label htmlFor="currentPassword" className="block text-sm font-semibold text-gray-700 mb-2">Senha Atual</label>
            <div className="relative">
              <input 
                type={showCurrentPassword ? "text" : "password"} 
                id="currentPassword"
                className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 shadow-sm focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 transition-all pr-10"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                placeholder="******"
              />
              <button 
                type="button" 
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
          </div> */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-2">Nova Senha</label>
            <div className="relative">
              <input 
                type={showNewPassword ? "text" : "password"} 
                id="newPassword"
                className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 shadow-sm focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 transition-all pr-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                placeholder="******"
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
            <label htmlFor="confirmNewPassword" className="block text-sm font-semibold text-gray-700 mb-2">Confirmar Nova Senha</label>
            <div className="relative">
              <input 
                type={showConfirmNewPassword ? "text" : "password"} 
                id="confirmNewPassword"
                className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 shadow-sm focus:ring-2 focus:ring-yellow-200 focus:border-yellow-500 transition-all pr-10"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                disabled={loading}
                placeholder="******"
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
          <div className="flex justify-between items-center">
            <button 
              type="button"
              onClick={handleResetPassword}
              className="text-sm text-blue-600 hover:underline font-medium"
              disabled={loading}
            >
              Esqueceu a senha? Redefinir
            </button>
            <button 
              type="submit"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-bold shadow-xl transform active:scale-95 relative overflow-hidden"
              disabled={loading}
            >
              {loading ? 'Atualizando...' : 'Alterar Senha'}
              <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
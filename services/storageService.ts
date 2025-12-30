import { Product, Category, StoreProfile, Order, Address, StoreSchedule, Group, Option, SubProduct } from '../types';
import { SupabaseClient } from '@supabase/supabase-js';
import { showSuccess, showError, showLoading, dismissToast } from '../src/utils/toast'; // Importar utilitários de toast

// O endereço do usuário ainda será armazenado no localStorage, pois é específico do cliente (vitrine)
const USER_ADDRESS_KEY = 'omnidelivery_user_address';

// Dados iniciais padrão para um novo perfil de loja
const DEFAULT_STORE_PROFILE: StoreProfile = {
  name: 'Minha Nova Loja',
  description: 'Bem-vindo à minha loja!',
  primaryColor: '#9f1239', 
  secondaryColor: '#2d1a1a', // Adicionado valor padrão para a cor secundária
  logoUrl: '',
  coverUrl: '',
  address: '',
  phone: ''
};

// Dados iniciais padrão para um novo horário de funcionamento
const DEFAULT_STORE_SCHEDULE: StoreSchedule = {
  isAlwaysOpen: false,
  dailySchedules: [
    { day: 'Domingo', isOpen: false, openTime: '00:00', closeTime: '00:00' },
    { day: 'Segunda-feira', isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { day: 'Terça-feira', isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { day: 'Quarta-feira', isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { day: 'Quinta-feira', isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { day: 'Sexta-feira', isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { day: 'Sábado', isOpen: false, openTime: '00:00', closeTime: '00:00' },
  ],
  reopenAt: null, // Adicionado valor padrão
  isTemporariamenteClosedIndefinidamente: false, // Adicionado valor padrão
};

// Função auxiliar para verificar se um ID é um ID temporário gerado pelo cliente (timestamp-like)
const isClientGeneratedTemporaryId = (id: string) => /^\d+$/.test(id) || id.startsWith('temp-');

export const storageService = {
  // --- Funções de Upload de Imagem da Loja ---
  uploadStoreImage: async (supabase: SupabaseClient, userId: string, file: File, type: 'logo' | 'cover'): Promise<string | null> => {
    if (!file) return null;

    const fileExtension = file.name.split('.').pop();
    const filePath = `${userId}/${type}.${fileExtension}`; // Ex: userId/logo.png ou userId/cover.jpg
    console.log(`[StorageService] Tentando upload de ${type} para o caminho: ${filePath}`);

    const { data, error } = await supabase.storage
      .from('store-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Sobrescreve se o arquivo já existir
      });

    if (error) {
      console.error(`[StorageService] Erro ao fazer upload da imagem ${type}:`, error);
      showError(`Erro ao fazer upload da imagem ${type}: ${error.message}`);
      return null;
    }
    console.log(`[StorageService] Upload de ${type} bem-sucedido. Data:`, data);

    // Retorna a URL pública da imagem
    const { data: publicUrlData } = supabase.storage
      .from('store-images')
      .getPublicUrl(filePath);
    
    console.log(`[StorageService] URL pública gerada para ${type}:`, publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  },

  // --- Funções de Upload de Avatar do Usuário ---
  uploadAvatar: async (supabase: SupabaseClient, userId: string, file: File): Promise<string | null> => {
    if (!file) return null;

    const fileExtension = file.name.split('.').pop();
    const filePath = `${userId}/avatar.${fileExtension}`; // Ex: userId/avatar.png
    console.log(`[StorageService] Tentando upload de avatar para o caminho: ${filePath}`);

    const { data, error } = await supabase.storage
      .from('avatars') // Usar o bucket 'avatars'
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('[StorageService] Erro ao fazer upload do avatar:', error);
      showError(`Erro ao fazer upload do avatar: ${error.message}`);
      return null;
    }
    console.log('[StorageService] Upload de avatar bem-sucedido. Data:', data);

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    console.log('[StorageService] URL pública gerada para avatar:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  },

  // --- Grupos ---
  getGroups: async (supabase: SupabaseClient, userId: string): Promise<Group[]> => {
    const { data, error } = await supabase.from('groups').select('*').eq('user_id', userId).order('order_index', { ascending: true }); // Order by order_index
    if (error) {
      console.error('Erro ao buscar grupos:', error);
      showError(`Erro ao buscar grupos: ${error.message}`);
      return [];
    }
    console.log('[StorageService] Grupos carregados do Supabase:', data); // NOVO LOG
    return data || [];
  },

  saveGroups: async (supabase: SupabaseClient, userId: string, groups: Group[]) => {
    const toastId = showLoading("Salvando grupos...");
    try {
      // 1. Obter IDs de grupos existentes no banco de dados para este usuário
      const { data: existingGroupsData, error: fetchError } = await supabase
        .from('groups')
        .select('id')
        .eq('user_id', userId);

      if (fetchError) throw new Error(`Erro ao buscar grupos existentes: ${fetchError.message}`);
      const existingGroupIds = new Set(existingGroupsData.map(g => g.id));

      // 2. Identificar grupos a serem deletados (estão no DB, mas não na lista atual do cliente)
      const groupsToDelete = Array.from(existingGroupIds).filter(dbId => 
        !groups.some(clientGroup => clientGroup.id === dbId)
      );

      if (groupsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('groups')
          .delete()
          .in('id', groupsToDelete);
        if (deleteError) throw new Error(`Erro ao deletar grupos: ${deleteError.message}`);
      }

      // 3. Separar grupos para inserção e atualização
      const groupsToInsert = groups.filter(group => !group.id || isClientGeneratedTemporaryId(group.id));
      const groupsToUpdate = groups.filter(group => group.id && !isClientGeneratedTemporaryId(group.id));

      if (groupsToInsert.length > 0) {
        const payloadToInsert = groupsToInsert.map((group, index) => ({
          name: group.name,
          user_id: userId,
          order_index: group.order_index !== undefined ? group.order_index : index, // Use provided order_index or default
        }));
        const { error: insertError } = await supabase
          .from('groups')
          .insert(payloadToInsert);
        if (insertError) throw new Error(`Erro ao inserir novos grupos: ${insertError.message}`);
      }

      if (groupsToUpdate.length > 0) {
        const payloadToUpdate = groupsToUpdate.map(group => ({
          id: group.id, // ID must be present for update
          name: group.name,
          user_id: userId,
          order_index: group.order_index, // Include order_index for updates
        }));
        const { error: upsertError } = await supabase
          .from('groups')
          .upsert(payloadToUpdate, { onConflict: 'id' }); // Use onConflict for updates
        if (upsertError) throw new Error(`Erro ao atualizar grupos existentes: ${upsertError.message}`);
      }

      showSuccess("Grupos salvos com sucesso!");
      // NOVO: Re-fetch all groups to ensure full synchronization
      return await storageService.getGroups(supabase, userId); // Return the fresh list
    } catch (err: any) {
      console.error('Erro ao salvar grupos:', err);
      showError(err.message || "Erro desconhecido ao salvar grupos.");
      return null;
    } finally {
      dismissToast(toastId);
    }
  },

  // --- Produtos ---
  getProducts: async (supabase: SupabaseClient, userId: string): Promise<Product[]> => {
    const { data, error } = await supabase.from('products').select('*').eq('user_id', userId).order('order_index', { ascending: true }); // Order by order_index
    if (error) {
      console.error('Erro ao buscar produtos:', error);
      showError(`Erro ao buscar produtos: ${error.message}`);
      return [];
    }
    console.log('[StorageService] Produtos carregados do Supabase:', data); // NOVO LOG
    // Mapeia os nomes das colunas do DB (snake_case) para a interface (agora também snake_case)
    return data.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      category: p.category,
      image_url: p.image_url, // Mapeamento direto
      stock: p.stock,
      group_id: p.group_id,   // Mapeamento direto
      options: (p.options as Option[] || []),
      order_index: p.order_index, // Ensure order_index is mapped
    })) || [];
  },

  saveProducts: async (supabase: SupabaseClient, userId: string, products: Product[]) => {
    const toastId = showLoading("Salvando produtos...");
    try {
      // 1. Obter IDs de produtos existentes no banco de dados para este usuário
      const { data: existingProductsData, error: fetchError } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', userId);

      if (fetchError) throw new Error(`Erro ao buscar produtos existentes: ${fetchError.message}`);
      const existingProductIds = new Set(existingProductsData.map(p => p.id));

      // 2. Identificar produtos a serem deletados (estão no DB, mas não na lista atual do cliente)
      const productsToDelete = Array.from(existingProductIds).filter(dbId =>
        !products.some(clientProduct => clientProduct.id === dbId)
      );

      if (productsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('products')
          .delete()
          .in('id', productsToDelete);
        if (deleteError) throw new Error(`Erro ao deletar produtos: ${deleteError.message}`);
      }

      // 3. Separar produtos para inserção e atualização
      const productsToInsert = products.filter(product => !product.id); // New products won't have an ID
      const productsToUpdate = products.filter(product => product.id); // Existing products will have an ID

      if (productsToInsert.length > 0) {
        const payloadToInsert = productsToInsert.map((product, index) => ({
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          image_url: product.image_url,
          stock: product.stock,
          group_id: product.group_id,
          options: product.options || [],
          user_id: userId,
          order_index: product.order_index !== undefined ? product.order_index : index, // Use provided order_index or default
          // id is omitted here, Supabase will generate it
        }));
        const { error: insertError } = await supabase
          .from('products')
          .insert(payloadToInsert);
        if (insertError) throw new Error(`Erro ao inserir novos produtos: ${insertError.message}`);
      }

      if (productsToUpdate.length > 0) {
        const payloadToUpdate = productsToUpdate.map(product => ({
          id: product.id, // ID must be present for update
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          image_url: product.image_url,
          stock: product.stock,
          group_id: product.group_id,
          options: product.options || [],
          user_id: userId,
          order_index: product.order_index, // Include order_index for updates
        }));
        const { error: upsertError } = await supabase
          .from('products')
          .upsert(payloadToUpdate, { onConflict: 'id' }); // Use onConflict for updates
        if (upsertError) throw new Error(`Erro ao atualizar produtos existentes: ${upsertError.message}`);
      }

      showSuccess("Produtos salvos com sucesso!");
      // NOVO: Re-fetch all products to ensure full synchronization
      return await storageService.getProducts(supabase, userId); // Return the fresh list
    } catch (err: any) {
      console.error('Erro ao salvar produtos:', err);
      showError(err.message || "Erro desconhecido ao salvar produtos.");
      return null;
    } finally {
      dismissToast(toastId);
    }
  },

  // --- Perfil da Loja ---
  getStoreProfile: async (supabase: SupabaseClient, userId: string): Promise<StoreProfile> => {
    console.log(`[StorageService] Buscando perfil da loja para userId: ${userId}`);
    const { data, error } = await supabase.from('store_profiles').select('*').eq('user_id', userId).single();
    if (error && error.code !== 'PGRST116') { // PGRST116 significa "nenhuma linha encontrada"
      console.error('[StorageService] Erro ao buscar perfil da loja:', error);
      showError(`Erro ao buscar perfil da loja: ${error.message}`);
      return DEFAULT_STORE_PROFILE; // Retorna perfil padrão em caso de erro
    }
    console.log('[StorageService] Perfil da loja carregado RAW DATA:', data);
    
    if (data) {
      return {
        name: data.name,
        description: data.description,
        primaryColor: data.primary_color,
        secondaryColor: data.secondary_color || DEFAULT_STORE_PROFILE.secondaryColor, // Buscar a nova propriedade
        logoUrl: data.logo_url,
        coverUrl: data.cover_url,
        address: data.address,
        phone: data.phone,
      };
    }
    return DEFAULT_STORE_PROFILE;
  },

  saveStoreProfile: async (supabase: SupabaseClient, userId: string, profile: StoreProfile, logoFile: File | null, coverFile: File | null) => {
    let updatedLogoUrl = profile.logoUrl;
    let updatedCoverUrl = profile.coverUrl;

    const toastId = showLoading("Salvando configurações da loja...");

    try {
      if (logoFile) {
        const url = await storageService.uploadStoreImage(supabase, userId, logoFile, 'logo');
        if (url) updatedLogoUrl = url;
        else throw new Error("Falha ao fazer upload do logo.");
      }
      if (coverFile) {
        const url = await storageService.uploadStoreImage(supabase, userId, coverFile, 'cover');
        if (url) updatedCoverUrl = url;
        else throw new Error("Falha ao fazer upload da capa.");
      }

      console.log('[StorageService] Valores para upsert:', {
        user_id: userId,
        name: profile.name,
        description: profile.description,
        primary_color: profile.primaryColor,
        secondary_color: profile.secondaryColor, // Salvar a nova propriedade
        address: profile.address,
        phone: profile.phone,
        logo_url: updatedLogoUrl,
        cover_url: updatedCoverUrl,
      });

      const { error } = await supabase.from('store_profiles').upsert(
        { 
          user_id: userId,
          name: profile.name,
          description: profile.description,
          primary_color: profile.primaryColor, 
          secondary_color: profile.secondaryColor, // Salvar a nova propriedade
          address: profile.address,
          phone: profile.phone,
          logo_url: updatedLogoUrl, 
          cover_url: updatedCoverUrl, 
        }, 
        { onConflict: 'user_id' }
      );

      if (error) {
        console.error('[StorageService] Erro ao salvar perfil da loja no banco de dados:', error);
        throw new Error(`Erro ao salvar perfil da loja: ${error.message}`);
      }
      showSuccess("Configurações da loja salvas com sucesso!");
      console.log('[StorageService] Perfil da loja salvo com sucesso no DB. Logo URL:', updatedLogoUrl, 'Cover URL:', updatedCoverUrl);
    } catch (err: any) {
      console.error("[StorageService] Erro geral ao salvar perfil da loja:", err);
      showError(err.message || "Erro desconhecido ao salvar configurações da loja.");
    } finally {
      dismissToast(toastId);
    }
  },

  // --- Perfil do Usuário (Admin) ---
  getProfile: async (supabase: SupabaseClient, userId: string) => {
    const { data, error } = await supabase.from('profiles').select('first_name, last_name, avatar_url, phone').eq('id', userId).single(); // Fetch phone
    if (error && error.code !== 'PGRST116') {
      console.error('[StorageService] Erro ao buscar perfil do usuário:', error);
      showError(`Erro ao buscar perfil do usuário: ${error.message}`);
      return null;
    }
    return data;
  },

  updateProfile: async (supabase: SupabaseClient, userId: string, firstName: string, lastName: string, phone: string, avatarFile: File | null) => { // Add phone parameter
    const toastId = showLoading("Salvando perfil...");
    let avatarUrl = null;

    try {
      if (avatarFile) {
        avatarUrl = await storageService.uploadAvatar(supabase, userId, avatarFile);
        if (!avatarUrl) throw new Error("Falha ao fazer upload do avatar.");
      }

      const updateData: { first_name: string; last_name: string; phone: string; avatar_url?: string; updated_at: string } = { // Include phone
        first_name: firstName,
        last_name: lastName,
        phone: phone, // Save phone
        updated_at: new Date().toISOString(),
      };

      if (avatarUrl) {
        updateData.avatar_url = avatarUrl;
      }

      const { error } = await supabase.from('profiles').upsert(
        { id: userId, ...updateData },
        { onConflict: 'id' }
      );

      if (error) {
        console.error('[StorageService] Erro ao atualizar perfil do usuário:', error);
        throw new Error(`Erro ao atualizar perfil: ${error.message}`);
      }
      showSuccess("Perfil atualizado com sucesso!");
      return avatarUrl;
    } catch (err: any) {
      console.error("[StorageService] Erro geral ao salvar perfil:", err);
      showError(err.message || "Erro desconhecido ao salvar perfil.");
      return null;
    } finally {
      dismissToast(toastId);
    }
  },

  updateUserEmail: async (supabase: SupabaseClient, newEmail: string) => {
    const toastId = showLoading("Atualizando e-mail...");
    try {
      const { data, error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) {
        throw new Error(error.message);
      }
      showSuccess("E-mail atualizado! Verifique sua nova caixa de entrada para confirmar.");
      return data;
    } catch (err: any) {
      console.error("[StorageService] Erro ao atualizar e-mail:", err);
      showError(err.message || "Erro desconhecido ao atualizar e-mail.");
      return null;
    } finally {
      dismissToast(toastId);
    }
  },

  updateUserPassword: async (supabase: SupabaseClient, newPassword: string) => {
    const toastId = showLoading("Atualizando senha...");
    try {
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        throw new Error(error.message);
      }
      showSuccess("Senha atualizada com sucesso!");
      return data;
    } catch (err: any) {
      console.error("[StorageService] Erro ao atualizar senha:", err);
      showError(err.message || "Erro desconhecido ao atualizar senha.");
      return null;
    } finally {
      dismissToast(toastId);
    }
  },

  resetUserPassword: async (supabase: SupabaseClient, email: string) => {
    const toastId = showLoading("Enviando e-mail de redefinição de senha...");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`, // Assuming a reset password page
      });
      if (error) {
        throw new Error(error.message);
      }
      showSuccess("E-mail de redefinição de senha enviado! Verifique sua caixa de entrada.");
      return true;
    } catch (err: any) {
      console.error("[StorageService] Erro ao enviar e-mail de redefinição de senha:", err);
      showError(err.message || "Erro desconhecido ao enviar e-mail de redefinição de senha.");
      return false;
    } finally {
      dismissToast(toastId);
    }
  },

  // --- Pedidos ---
  getOrders: async (supabase: SupabaseClient, userId: string): Promise<Order[]> => {
    const { data, error } = await supabase.from('orders').select('*').eq('user_id', userId).order('order_date', { ascending: false });
    if (error) {
      console.error('Erro ao buscar pedidos:', error);
      showError(`Erro ao buscar pedidos: ${error.message}`);
      return [];
    }
    return data.map(o => ({ ...o, items: (o.items as any[] || []), date: o.order_date })) || [];
  },

  // Esta função é para o admin visualizar pedidos, não para salvar em massa.
  // A criação de pedidos virá da vitrine, e atualizações de status seriam mais granulares.
  // Por enquanto, um upsert simples para a lista inteira.
  saveOrders: async (supabase: SupabaseClient, userId: string, orders: Order[]) => {
    const { error: deleteError } = await supabase.from('orders').delete().eq('user_id', userId);
    if (deleteError) {
      console.error('Erro ao deletar pedidos existentes:', deleteError);
      showError(`Erro ao deletar pedidos existentes: ${deleteError.message}`);
      return;
    }

    if (orders.length > 0) {
      const ordersToInsert = orders.map(order => ({
        ...order,
        user_id: userId,
        items: order.items || [],
        order_date: order.date,
      }));
      const { error: insertError } = await supabase.from('orders').insert(ordersToInsert);
      if (insertError) {
        console.error('Erro ao inserir pedidos:', insertError);
        showError(`Erro ao inserir pedidos: ${insertError.message}`);
      }
    }
  },

  // --- Horário de Funcionamento da Loja ---
  getStoreSchedule: async (supabase: SupabaseClient, userId: string): Promise<StoreSchedule> => {
    const { data, error } = await supabase.from('store_schedules').select('*').eq('user_id', userId).single();
    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar horário da loja:', error);
      showError(`Erro ao buscar horário da loja: ${error.message}`);
      return DEFAULT_STORE_SCHEDULE;
    }
    if (data) {
      return {
        isAlwaysOpen: data.is_always_open,
        dailySchedules: data.daily_schedules || [],
        reopenAt: data.reopen_at, // Buscar a nova propriedade
        isTemporariamenteClosedIndefinidamente: data.is_temporariamente_closed_indefinidamente, // Buscar a nova propriedade
      };
    }
    return DEFAULT_STORE_SCHEDULE;
  },

  saveStoreSchedule: async (supabase: SupabaseClient, userId: string, schedule: StoreSchedule) => {
    const toastId = showLoading("Salvando horário de funcionamento...");
    try {
      const { error } = await supabase.from('store_schedules').upsert({
        user_id: userId,
        is_always_open: schedule.isAlwaysOpen,
        daily_schedules: schedule.dailySchedules,
        reopen_at: schedule.reopenAt, // Salvar a nova propriedade
        is_temporariamente_closed_indefinidamente: schedule.isTemporariamenteClosedIndefinidamente, // Salvar a nova propriedade
      }, { onConflict: 'user_id' });
      if (error) {
        console.error('Erro ao salvar horário da loja:', error);
        throw new Error(`Erro ao salvar horário da loja: ${error.message}`);
      }
      showSuccess("Horários salvos com sucesso!");
    } catch (err: any) {
      showError(err.message || "Erro desconhecido ao salvar horário da loja.");
    } finally {
      dismissToast(toastId);
    }
  },

  // --- Endereço do Usuário (ainda no localStorage) ---
  getUserAddress: (): Address | null => {
    const data = localStorage.getItem(USER_ADDRESS_KEY);
    return data ? JSON.parse(data) : null;
  },

  saveUserAddress: (address: Address) => {
    localStorage.setItem(USER_ADDRESS_KEY, JSON.stringify(address));
  },
};
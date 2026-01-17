import { Product, Category, StoreProfile, Order, Address, StoreSchedule, DailySchedule, Group, Option, SubProduct, Table, TableStatus, Counter, CounterStatus } from '../types';
import { SupabaseClient } from '@supabase/supabase-js';
import { showSuccess, showError, showLoading, dismissToast } from '../src/utils/toast'; // Importar utilitários de toast

// O endereço do usuário ainda será armazenado no localStorage, pois é específico do cliente (vitrine)
const USER_ADDRESSES_KEY = 'omnidelivery_user_addresses'; // Alterado para armazenar múltiplos endereços

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
    { 'day': 'Quinta-feira', isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { day: 'Sexta-feira', isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { day: 'Sábado', isOpen: false, openTime: '00:00', closeTime: '00:00' },
  ],
  reopenAt: null,
  isTemporariamenteClosedIndefinidamente: false,
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

      setTimeout(() => showSuccess("Grupos salvos com sucesso!"), 0); // Usar setTimeout
      // NOVO: Re-fetch all groups to ensure full synchronization
      return await storageService.getGroups(supabase, userId); // Return the fresh list
    } catch (err: any) {
      console.error('Erro ao salvar grupos:', err);
      setTimeout(() => showError(err.message || "Erro desconhecido ao salvar grupos."), 0); // Usar setTimeout
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
      isFeatured: p.is_featured || false, // NOVO: Mapear is_featured
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
          is_featured: product.isFeatured || false, // NOVO: Incluir is_featured
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
          is_featured: product.isFeatured || false, // NOVO: Incluir is_featured
        }));
        const { error: upsertError } = await supabase
          .from('products')
          .upsert(payloadToUpdate, { onConflict: 'id' }); // Use onConflict for updates
        if (upsertError) throw new Error(`Erro ao atualizar produtos existentes: ${upsertError.message}`);
      }

      setTimeout(() => showSuccess("Produtos salvos com sucesso!"), 0); // Usar setTimeout
      // NOVO: Re-fetch all products to ensure full synchronization
      return await storageService.getProducts(supabase, userId); // Return the fresh list
    } catch (err: any) {
      console.error('Erro ao salvar produtos:', err);
      setTimeout(() => showError(err.message || "Erro desconhecido ao salvar produtos."), 0); // Usar setTimeout
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
      setTimeout(() => showSuccess("Configurações da loja salvas com sucesso!"), 0); // Usar setTimeout
      console.log('[StorageService] Perfil da loja salvo com sucesso no DB. Logo URL:', updatedLogoUrl, 'Cover URL:', updatedCoverUrl);
    } catch (err: any) {
      console.error("[StorageService] Erro geral ao salvar perfil da loja:", err);
      setTimeout(() => showError(err.message || "Erro desconhecido ao salvar configurações da loja."), 0); // Usar setTimeout
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
      setTimeout(() => showSuccess("Perfil atualizado com sucesso!"), 0); // Usar setTimeout
      return avatarUrl;
    } catch (err: any) {
      console.error("[StorageService] Erro geral ao salvar perfil:", err);
      setTimeout(() => showError(err.message || "Erro desconhecido ao salvar perfil."), 0); // Usar setTimeout
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
      setTimeout(() => showSuccess("E-mail atualizado! Verifique sua nova caixa de entrada para confirmar."), 0); // Usar setTimeout
      return data;
    } catch (err: any) {
      console.error("[StorageService] Erro ao atualizar e-mail:", err);
      setTimeout(() => showError(err.message || "Erro desconhecido ao atualizar e-mail."), 0); // Usar setTimeout
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
      setTimeout(() => showSuccess("Senha atualizada com sucesso!"), 0); // Usar setTimeout
      return data;
    } catch (err: any) {
      console.error("[StorageService] Erro ao atualizar senha:", err);
      setTimeout(() => showError(err.message || "Erro desconhecido ao atualizar senha."), 0); // Usar setTimeout
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
      setTimeout(() => showSuccess("E-mail de redefinição de senha enviado! Verifique sua caixa de entrada."), 0); // Usar setTimeout
      return true;
    } catch (err: any) {
      console.error("[StorageService] Erro ao enviar e-mail de redefinição de senha:", err);
      setTimeout(() => showError(err.message || "Erro desconhecido ao enviar e-mail de redefinição de senha."), 0); // Usar setTimeout
      return false;
    } finally {
      dismissToast(toastId);
    }
  },

  // --- Pedidos ---
  getOrders: async (supabase: SupabaseClient, userId: string, fetchType: 'all' | 'only-trashed' | 'non-trashed' = 'non-trashed'): Promise<Order[]> => {
    let query = supabase.from('orders').select('*').eq('user_id', userId);

    if (fetchType === 'only-trashed') {
      query = query.eq('status', 'trashed');
    } else if (fetchType === 'non-trashed') {
      query = query.neq('status', 'trashed');
    }
    // If fetchType is 'all', no status filter is applied to the query

    const { data, error } = await query.order('order_date', { ascending: false });
    if (error) {
      console.error('Erro ao buscar pedidos:', error);
      showError(`Erro ao buscar pedidos: ${error.message}`);
      return [];
    }
    return data.map(o => ({ 
      id: o.id, // ID agora é obrigatório
      customerName: o.customer_name, // Mapear customer_name do DB para customerName na interface
      items: (o.items as any[] || []), 
      total: o.total,
      status: o.status,
      date: o.order_date 
    })) || [];
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

  // NOVO: Função para criar um único pedido
  createOrder: async (supabase: SupabaseClient, userId: string, order: Omit<Order, 'id'>): Promise<Order | null> => {
    const toastId = showLoading("Finalizando pedido...");
    try {
      const { data, error } = await supabase.from('orders').insert({
        customer_name: order.customerName, // Mapear customerName para customer_name no DB
        items: order.items,
        total: order.total,
        status: order.status,
        user_id: userId,
        order_date: order.date, // Mapear 'date' para 'order_date' no DB
      }).select().single(); // Retorna o pedido inserido

      if (error) {
        throw new Error(error.message);
      }
      // A mensagem de sucesso será disparada pelo listener do Realtime no Dashboard
      return data as Order;
    } catch (err: any) {
      console.error("[StorageService] Erro ao criar pedido:", err);
      setTimeout(() => showError(err.message || "Erro desconhecido ao finalizar pedido."), 0); // Usar setTimeout
      return null;
    } finally {
      dismissToast(toastId);
    }
  },

  // NOVO: Função para atualizar o status de um pedido
  updateOrderStatus: async (supabase: SupabaseClient, userId: string, orderId: string, newStatus: Order['status']): Promise<Order | null> => {
    const toastId = showLoading(`Atualizando status do pedido...`);
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      // O toast de sucesso será disparado pelo listener do Realtime no Dashboard
      return { 
        ...data, 
        customerName: data.customer_name, // Mapear customer_name do DB para customerName na interface
        items: (data.items as any[] || []), 
        date: data.order_date 
      } as Order;
    } catch (err: any) {
      console.error("[StorageService] Erro ao atualizar status do pedido:", err);
      setTimeout(() => showError(err.message || "Erro desconhecido ao atualizar status do pedido."), 0); // Usar setTimeout
      return null;
    } finally {
      dismissToast(toastId);
    }
  },

  // MODIFICADO: deleteOrder agora move para a lixeira (status 'trashed')
  deleteOrder: async (supabase: SupabaseClient, userId: string, orderId: string): Promise<boolean> => {
    const toastId = showLoading(`Movendo pedido para a lixeira...`);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'trashed' }) // Altera o status para 'trashed'
        .eq('id', orderId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(error.message);
      }
      // O toast de sucesso será disparado pelo listener do Realtime no Dashboard
      return true;
    } catch (err: any) {
      console.error("[StorageService] Erro ao mover pedido para a lixeira:", err);
      setTimeout(() => showError(err.message || "Erro desconhecido ao mover pedido para a lixeira."), 0); // Usar setTimeout
      return false;
    } finally {
      dismissToast(toastId);
    }
  },

  // NOVO: Função para excluir um pedido permanentemente do banco de dados
  permanentlyDeleteOrder: async (supabase: SupabaseClient, userId: string, orderId: string): Promise<boolean> => {
    const toastId = showLoading(`Excluindo pedido permanentemente...`);
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(error.message);
      }
      // O toast de sucesso será disparado pelo listener do Realtime no Dashboard
      return true;
    } catch (err: any) {
      console.error("[StorageService] Erro ao excluir pedido permanentemente:", err);
      setTimeout(() => showError(err.message || "Erro desconhecido ao excluir pedido permanentemente."), 0); // Usar setTimeout
      return false;
    } finally {
      dismissToast(toastId);
    }
  },

  // NOVO: Função para limpar todo o histórico de pedidos (agora move para a lixeira)
  clearAllOrders: async (supabase: SupabaseClient, userId: string): Promise<boolean> => {
    const toastId = showLoading("Movendo todos os pedidos para a lixeira...");
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'trashed' }) // Altera o status de todos para 'trashed'
        .eq('user_id', userId);

      if (error) {
        throw new Error(error.message);
      }
      // O toast de sucesso será disparado pelo listener do Realtime no Dashboard
      return true;
    } catch (err: any) {
      console.error("[StorageService] Erro ao mover pedidos para a lixeira:", err);
      setTimeout(() => showError(err.message || "Erro desconhecido ao mover pedidos para a lixeira."), 0); // Usar setTimeout
      return false;
    } finally {
      dismissToast(toastId);
    }
  },

  // NOVO: Função para verificar a senha do administrador usando a Edge Function
  verifyAdminPassword: async (supabase: SupabaseClient, userId: string, password: string): Promise<{ success: boolean; message?: string }> => {
    console.log('[StorageService] verifyAdminPassword chamado com userId:', userId);
    try {
      // Log the invocation details before making the call
      console.log('[StorageService] Invocando Edge Function "verify-admin-password" com body:', { userId, password: '***' }); // Mascara a senha por segurança
      const { data, error } = await supabase.functions.invoke('verify-admin-password', {
        body: JSON.stringify({ userId, password }),
        method: 'POST',
      });

      if (error) {
        console.error('[StorageService] Erro ao invocar Edge Function:', error);
        return { success: false, message: error.message || 'Erro ao verificar senha.' };
      }

      console.log('[StorageService] Resposta da Edge Function:', data);
      // A resposta da Edge Function já deve ser um JSON com { success: boolean, message?: string }
      return data as { success: boolean; message?: string };

    } catch (err: any) {
      console.error('[StorageService] Erro inesperado ao chamar Edge Function:', err);
      return { success: false, message: err.message || 'Erro inesperado ao verificar senha.' };
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
      setTimeout(() => showSuccess("Horários salvos com sucesso!"), 0); // Usar setTimeout
    } catch (err: any) {
      setTimeout(() => showError(err.message || "Erro desconhecido ao salvar horário da loja."), 0); // Usar setTimeout
    } finally {
      dismissToast(toastId);
    }
  },

  // --- Endereços do Usuário (agora múltiplos no localStorage) ---
  getAddresses: (): Address[] => {
    const data = localStorage.getItem(USER_ADDRESSES_KEY);
    if (data) {
      try {
        const addresses: Address[] = JSON.parse(data);
        // Migration logic for old single address format
        if (!Array.isArray(addresses) && typeof addresses === 'object' && addresses !== null && addresses.id) {
          console.log('[StorageService] Migrating old single address to array format.');
          const migratedAddress: Address = { ...addresses, isDefault: true };
          localStorage.setItem(USER_ADDRESSES_KEY, JSON.stringify([migratedAddress]));
          return [migratedAddress];
        }
        return addresses;
      } catch (e) {
        console.error('[StorageService] Error parsing addresses from localStorage, returning empty array.', e);
        return [];
      }
    }

    // Check for old single address key and migrate if found
    const oldSingleAddressKey = 'omnidelivery_user_address';
    const oldData = localStorage.getItem(oldSingleAddressKey);
    if (oldData) {
      try {
        const oldAddress: Address = JSON.parse(oldData);
        if (oldAddress && oldAddress.street) { // Basic validation
          console.log('[StorageService] Migrating old single address key to new array format.');
          const newAddress: Address = { ...oldAddress, id: Date.now().toString(), isDefault: true };
          localStorage.setItem(USER_ADDRESSES_KEY, JSON.stringify([newAddress]));
          localStorage.removeItem(oldSingleAddressKey); // Clean up old key
          return [newAddress];
        }
      } catch (e) {
        console.error('[StorageService] Error parsing old single address from localStorage.', e);
      }
    }
    return [];
  },

  saveAddresses: (addresses: Address[]) => {
    localStorage.setItem(USER_ADDRESSES_KEY, JSON.stringify(addresses));
  },

  addAddress: (newAddress: Omit<Address, 'id'>): Address[] => {
    const addresses = storageService.getAddresses();
    const id = Date.now().toString(); // Simple unique ID
    const addressToAdd: Address = { ...newAddress, id, isDefault: addresses.length === 0 }; // First address is default
    const updatedAddresses = [...addresses, addressToAdd];
    storageService.saveAddresses(updatedAddresses);
    setTimeout(() => showSuccess("Endereço adicionado com sucesso!"), 0); // Usar setTimeout
    return updatedAddresses;
  },

  updateAddress: (updatedAddress: Address): Address[] => {
    let addresses = storageService.getAddresses();
    const index = addresses.findIndex(addr => addr.id === updatedAddress.id);
    if (index > -1) {
      addresses[index] = updatedAddress;
      storageService.saveAddresses(addresses);
      setTimeout(() => showSuccess("Endereço atualizado com sucesso!"), 0); // Usar setTimeout
      return addresses;
    }
    setTimeout(() => showError("Endereço não encontrado para atualização."), 0); // Usar setTimeout
    return addresses;
  },

  deleteAddress: (id: string): Address[] => {
    let addresses = storageService.getAddresses();
    const updatedAddresses = addresses.filter(addr => addr.id !== id);
    // If the deleted address was default, set the first remaining address as default
    if (addresses.find(addr => addr.id === id)?.isDefault && updatedAddresses.length > 0) {
      updatedAddresses[0].isDefault = true;
    }
    storageService.saveAddresses(updatedAddresses);
    setTimeout(() => showSuccess("Endereço excluído com sucesso!"), 0); // Usar setTimeout
    return updatedAddresses;
  },

  setPrimaryAddress: (id: string): Address[] => {
    let addresses = storageService.getAddresses();
    const updatedAddresses = addresses.map(addr => ({
      ...addr,
      isDefault: addr.id === id,
    }));
    storageService.saveAddresses(updatedAddresses);
    setTimeout(() => showSuccess("Endereço padrão atualizado!"), 0); // Usar setTimeout
    return updatedAddresses;
  },

  // --- Mesas ---
  getTables: async (supabase: SupabaseClient, userId: string): Promise<Table[]> => {
    const { data, error } = await supabase.from('tables').select('*').eq('user_id', userId).order('order_index', { ascending: true });
    if (error) {
      console.error('Erro ao buscar mesas:', error);
      showError(`Erro ao buscar mesas: ${error.message}`);
      return [];
    }
    return data || [];
  },

  saveTables: async (supabase: SupabaseClient, userId: string, tables: Table[]) => {
    const toastId = showLoading("Salvando mesas...");
    try {
      const { data: existingTablesData, error: fetchError } = await supabase
        .from('tables')
        .select('id')
        .eq('user_id', userId);

      if (fetchError) throw new Error(`Erro ao buscar mesas existentes: ${fetchError.message}`);
      const existingTableIds = new Set(existingTablesData.map(t => t.id));

      const tablesToDelete = Array.from(existingTableIds).filter(dbId =>
        !tables.some(clientTable => clientTable.id === dbId)
      );

      if (tablesToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('tables')
          .delete()
          .in('id', tablesToDelete);
        if (deleteError) throw new Error(`Erro ao deletar mesas: ${deleteError.message}`);
      }

      const tablesToInsert = tables.filter(table => !table.id || isClientGeneratedTemporaryId(table.id));
      const tablesToUpdate = tables.filter(table => table.id && !isClientGeneratedTemporaryId(table.id));

      if (tablesToInsert.length > 0) {
        const payloadToInsert = tablesToInsert.map((table, index) => ({
          name: table.name,
          capacity: table.capacity,
          status: table.status,
          orderId: table.orderId,
          notes: table.notes,
          user_id: userId,
          order_index: table.order_index !== undefined ? table.order_index : index,
        }));
        const { error: insertError } = await supabase
          .from('tables')
          .insert(payloadToInsert);
        if (insertError) throw new Error(`Erro ao inserir novas mesas: ${insertError.message}`);
      }

      if (tablesToUpdate.length > 0) {
        const payloadToUpdate = tablesToUpdate.map(table => ({
          id: table.id,
          name: table.name,
          capacity: table.capacity,
          status: table.status,
          orderId: table.orderId,
          notes: table.notes,
          user_id: userId,
          order_index: table.order_index,
        }));
        const { error: upsertError } = await supabase
          .from('tables')
          .upsert(payloadToUpdate, { onConflict: 'id' });
        if (upsertError) throw new Error(`Erro ao atualizar mesas existentes: ${upsertError.message}`);
      }

      setTimeout(() => showSuccess("Mesas salvas com sucesso!"), 0); // Usar setTimeout
      return await storageService.getTables(supabase, userId);
    } catch (err: any) {
      console.error('Erro ao salvar mesas:', err);
      setTimeout(() => showError(err.message || "Erro desconhecido ao salvar mesas."), 0); // Usar setTimeout
      return null;
    } finally {
      dismissToast(toastId);
    }
  },

  // --- Balcões (Counters) ---
  getCounters: async (supabase: SupabaseClient, userId: string): Promise<Counter[]> => {
    const { data, error } = await supabase.from('counters').select('*').eq('user_id', userId).order('order_index', { ascending: true });
    if (error) {
      console.error('Erro ao buscar balcões:', error);
      showError(`Erro ao buscar balcões: ${error.message}`);
      return [];
    }
    return data || [];
  },

  saveCounters: async (supabase: SupabaseClient, userId: string, counters: Counter[]) => {
    const toastId = showLoading("Salvando balcões...");
    try {
      const { data: existingCountersData, error: fetchError } = await supabase
        .from('counters')
        .select('id')
        .eq('user_id', userId);

      if (fetchError) throw new Error(`Erro ao buscar balcões existentes: ${fetchError.message}`);
      const existingCounterIds = new Set(existingCountersData.map(c => c.id));

      const countersToDelete = Array.from(existingCounterIds).filter(dbId =>
        !counters.some(clientCounter => clientCounter.id === dbId)
      );

      if (countersToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('counters')
          .delete()
          .in('id', countersToDelete);
        if (deleteError) throw new Error(`Erro ao deletar balcões: ${deleteError.message}`);
      }

      const countersToInsert = counters.filter(counter => !counter.id || isClientGeneratedTemporaryId(counter.id));
      const countersToUpdate = counters.filter(counter => counter.id && !isClientGeneratedTemporaryId(counter.id));

      if (countersToInsert.length > 0) {
        const payloadToInsert = countersToInsert.map((counter, index) => ({
          name: counter.name,
          status: counter.status,
          orderId: counter.orderId,
          notes: counter.notes,
          user_id: userId,
          order_index: counter.order_index !== undefined ? counter.order_index : index,
        }));
        const { error: insertError } = await supabase
          .from('counters')
          .insert(payloadToInsert);
        if (insertError) throw new Error(`Erro ao inserir novos balcões: ${insertError.message}`);
      }

      if (countersToUpdate.length > 0) {
        const payloadToUpdate = countersToUpdate.map(counter => ({
          id: counter.id,
          name: counter.name,
          status: counter.status,
          orderId: counter.orderId,
          notes: counter.notes,
          user_id: userId,
          order_index: counter.order_index,
        }));
        const { error: upsertError } = await supabase
          .from('counters')
          .upsert(payloadToUpdate, { onConflict: 'id' });
        if (upsertError) throw new Error(`Erro ao atualizar balcões existentes: ${upsertError.message}`);
      }

      setTimeout(() => showSuccess("Balcões salvos com sucesso!"), 0); // Usar setTimeout
      return await storageService.getCounters(supabase, userId);
    } catch (err: any) {
      console.error('Erro ao salvar balcões:', err);
      setTimeout(() => showError(err.message || "Erro desconhecido ao salvar balcões."), 0); // Usar setTimeout
      return null;
    } finally {
      dismissToast(toastId);
    }
  },
};
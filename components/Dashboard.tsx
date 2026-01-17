import React, { useState, useEffect, useRef } from 'react'; // Importar useRef
import { 
  LayoutDashboard, Package, ShoppingBag, Settings, Plus, 
  Trash2, Edit, LogOut, Store, Users, FileText, ChevronDown, Menu, Clock,
  GripVertical, Search, X, Copy, Star, Infinity, User as UserIcon, TrendingUp, Table as TableIcon, Monitor, Bike, CheckCircle, ArrowRight 
} from 'lucide-react';
import { Product, Category, StoreProfile, Order, StoreSchedule, DailySchedule, Group, Option, SubProduct } from '../types';
import { storageService } from '../services/storageService';
import { useSession } from '../src/components/SessionContextProvider';
import { showSuccess, showError, showLoading, dismissToast } from '../src/utils/toast';
import { ProfileSettingsPage } from '../src/components/ProfileSettingsPage';
import { debounce }
 from '../src/utils/debounce';
import { Modal } from '../src/components/ui/Modal';
import { AddSubProductModal } from '../src/components/AddSubProductModal';
import { CopyOptionModal } from '../src/components/CopyOptionModal';
import { SalesCharts } from '../src/components/SalesCharts';
import { RecentOrders } from '../src/components/RecentOrders';
import { AppLogo } from '../src/components/AppLogo';
import { TableManagerPage } from '../src/components/TableManagerPage';
import { CounterManagerPage } from '../src/components/CounterManagerPage';
import { OrderDetailsModal } from '../src/components/OrderDetailsModal';
import { AdminPasswordConfirmModal } from '../src/components/AdminPasswordConfirmModal'; // Importar o novo modal

// DND Kit Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { SortableGroupItem } from '../src/components/SortableGroupItem';
import { SortableProductItem } from '../src/components/SortableProductItem';

interface DashboardProps {
    onLogout: () => void;
    onNavigate: (path: string) => void;
    // REMOVIDO: refreshTrigger não é mais necessário com o Realtime do Supabase.
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout, onNavigate }) => { // Removido refreshTrigger das props
  const { supabase, session } = useSession();
  const userId = session?.user?.id;

  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders-parent' | 'order-manager' | 'table-manager' | 'counter-manager' | 'store-settings' | 'schedule' | 'clients' | 'staff' | 'reports' | 'profile-settings'>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [storeProfile, setStoreProfile] = useState<StoreProfile>({ name: '', description: '', primaryColor: '#9f1239', secondaryColor: '#2d1a1a', logoUrl: '', coverUrl: '', address: '', phone: '' });
  const [isStoreTemporariamenteClosed, setIsStoreTemporariamenteClosed] = useState(false);
  const [reopenCountdown, setReopenCountdown] = useState<string | null>(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isStoreSubmenuOpen, setIsStoreSubmenuOpen] = useState(false);
  const [isOrdersSubmenuOpen, setIsOrdersSubmenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ first_name: string; last_name: string; avatar_url: string | null } | null>(null);
  
  const [storeSchedule, setStoreSchedule] = useState<StoreSchedule>({
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
  });
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | 'all'>('all');
  const [groupSearchTerm, setSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showOptionsForProduct, setShowOptionsForProduct] = useState<string | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setNewGroupNameEditing] = useState('');
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(null);

  const [isAddSubProductModalOpen, setIsAddSubProductModalOpen] = useState(false);
  const [currentProductAndOptionForSubProduct, setCurrentProductAndOptionForSubProduct] = useState<{ productId: string; optionId: string } | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const [isToggleConfirmationModalOpen, setIsToggleConfirmationModalOpen] = useState(false);
  const [pendingToggleAction, setPendingToggleAction] = useState<{ productId: string; optionId: string; searchTerm: string; targetActiveState: boolean } | null>(null);

  const [optionToScrollToId, setOptionToScrollToId] = useState<string | null>(null);

  const [isCopyOptionModalOpen, setIsCopyOptionModalOpen] = useState(false);
  const [optionToCopy, setOptionToCopy] = useState<{ productId: string; optionId: string; optionTitle: string } | null>(null);

  const [activeGroup, setActiveGroup] = useState<Group | null>(null);

  const [weeklySalesData, setWeeklySalesData] = useState<{ name: string; sales: number }[]>([]);
  const [monthlySalesData, setMonthlySalesData] = useState<{ name: string; sales: number }[]>([]);
  const [topSellingProducts, setTopSellingProducts] = useState<
    { name: string; totalQuantity: number; totalRevenue: number }[]
  >([]);

  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'pending' | 'preparing' | 'in_transit' | 'delivered' | 'rejected' | 'trashed'>('all'); // NOVO: Adicionado 'trashed'

  // NOVO: Estados para o modal de confirmação de senha
  const [isAdminPasswordConfirmModalOpen, setIsAdminPasswordConfirmModalOpen] = useState(false);
  const [orderToDeletePermanently, setOrderToDeletePermanently] = useState<string | null>(null);

  // NOVO: Ref para o elemento de áudio
  const newOrderSoundRef = useRef<HTMLAudioElement>(null);


  // DND Kit Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Memoize the debounced saveProducts function
  const debouncedSaveProducts = React.useCallback(
    debounce(async (productsToSave: Product[], currentUserId: string) => {
      if (currentUserId) {
        const savedProducts = await storageService.saveProducts(supabase, currentUserId, productsToSave);
        if (savedProducts) {
          setProducts(savedProducts);
        }
      }
    }, 1000),
    [supabase]
  );

  // Memoize the debounced saveGroups function
  const debouncedSaveGroups = React.useCallback(
    debounce(async (groupsToSave: Group[], currentUserId: string) => {
      if (currentUserId) {
        const savedGroups = await storageService.saveGroups(supabase, currentUserId, groupsToSave);
        if (savedGroups) {
          setGroups(savedGroups as Group[]);
        }
      }
    }, 1000),
    [supabase]
  );

  const calculateItemTotalPrice = (item: Order['items'][0], allProducts: Product[]) => {
    let total = item.price;
    if (item.selectedOptions) {
      item.selectedOptions.forEach(selOpt => {
        const originalProduct = allProducts.find(p => p.id === item.id);
        if (originalProduct) {
          const option = originalProduct.options.find(opt => opt.id === selOpt.optionId);
          const subProduct = option?.subProducts.find(sp => sp.id === selOpt.subProductId);
          if (subProduct) {
            total += subProduct.price * selOpt.quantity;
          }
        } // Adicionado o fechamento do if (originalProduct)
      });
    }
    return total;
  };

  const generateWeeklySalesData = () => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' });
      data.push({
        name: dayName,
        sales: Math.floor(Math.random() * 500) + 100,
      });
    }
    return data;
  };

  const generateMonthlySalesData = () => {
    const data = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today);
      d.setMonth(today.getMonth() - i);
      const monthName = d.toLocaleDateString('pt-BR', { month: 'short' });
      data.push({
        name: monthName,
        sales: Math.floor(Math.random() * 5000) + 1000,
      });
    }
    return data;
  };

  const getTopSellingProducts = (orders: Order[], allProducts: Product[]) => {
    const productSales: { [productId: string]: { name: string; totalQuantity: number; totalRevenue: number } } = {};

    orders.forEach(order => {
      // Apenas considere pedidos que não estão na lixeira para os relatórios de vendas
      if (order.status !== 'trashed') { 
        order.items.forEach(item => {
          const productId = item.id!;
          if (!productSales[productId]) {
            productSales[productId] = {
              name: item.name,
              totalQuantity: 0,
              totalRevenue: 0,
            };
          }
          productSales[productId].totalQuantity += item.quantity;
          productSales[productId].totalRevenue += calculateItemTotalPrice(item, allProducts) * item.quantity;
        });
      }
    });

    return Object.values(productSales)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 5);
  };


  // Carregar dados do Supabase ao montar o componente ou quando o userId mudar
  useEffect(() => {
    const loadData = async () => {
      if (userId) {
        console.log('[Dashboard] Carregando dados iniciais...');
        // MODIFICADO: Chamar getOrders com 'all' para buscar todos os pedidos
        const fetchedOrders = await storageService.getOrders(supabase, userId, 'all');
        const fetchedProducts = await storageService.getProducts(supabase, userId);
        const fetchedSchedule = await storageService.getStoreSchedule(supabase, userId);
        
        setProducts(fetchedProducts);
        setOrders(fetchedOrders);
        setStoreSchedule(fetchedSchedule);
        
        const isClosedByTimer = !!fetchedSchedule.reopenAt && new Date(fetchedSchedule.reopenAt) > new Date();
        setIsStoreTemporariamenteClosed(isClosedByTimer || !!fetchedSchedule.isTemporariamenteClosedIndefinidamente);

        const profile = await storageService.getStoreProfile(supabase, userId);
        setStoreProfile(profile);
        setLogoPreview(profile.logoUrl);
        setCoverPreview(profile.coverUrl);
        setGroups(await storageService.getGroups(supabase, userId));
        
        const userProf = await storageService.getProfile(supabase, userId);
        setUserProfile(userProf);

        // Initial load of sales data
        setWeeklySalesData(generateWeeklySalesData());
        setMonthlySalesData(generateMonthlySalesData());
        setTopSellingProducts(getTopSellingProducts(fetchedOrders, fetchedProducts));

        console.log('[Dashboard] Perfil da loja carregado. Logo URL:', profile.logoUrl, 'Cover URL:', profile.coverUrl);
      } else {
        console.log('[Dashboard] Usuário deslogado, limpando estados.');
        setProducts([]);
        setOrders([]);
        setStoreSchedule({
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
        });
        setIsStoreTemporariamenteClosed(false);
        setStoreProfile({ name: '', description: '', primaryColor: '#9f1239', secondaryColor: '#2d1a1a', logoUrl: '', coverUrl: '', address: '', phone: '' });
        setLogoPreview(null);
        setCoverPreview(null);
        setGroups([]);
        setUserProfile(null);
        setWeeklySalesData([]);
        setMonthlySalesData([]);
      }
    };
    loadData();
  }, [userId, supabase]); // Removido refreshTrigger das dependências

  // NOVO: useEffect para Realtime do Supabase para Pedidos
  useEffect(() => {
    if (!userId) {
      console.log('[Realtime] userId não disponível, pulando configuração do Realtime.');
      return;
    }

    console.log('[Realtime] Configurando Realtime para pedidos com userId:', userId, 'Supabase client:', supabase);

    const ordersChannel = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escutar INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`, // Filtrar apenas pelos pedidos deste usuário
        },
        (payload) => {
          console.log('[Realtime] Mudança no pedido recebida:', payload);
          
          // Para INSERT e UPDATE, usamos payload.new
          // Para DELETE, payload.new é null, então precisamos usar payload.old para obter o ID
          const orderData = payload.eventType === 'DELETE' ? payload.old : payload.new;

          if (!orderData) {
            console.warn('[Realtime] Dados do pedido ausentes no payload:', payload);
            return;
          }

          let changedOrder: Order;
          if (payload.eventType === 'DELETE') {
            // For DELETE, we primarily need the ID from payload.old
            // We construct a minimal changedOrder for logging and filtering
            changedOrder = {
              id: payload.old.id as string, // Explicitly cast to string
              customerName: payload.old.customer_name || '', 
              date: payload.old.order_date || new Date().toISOString(),
              items: payload.old.items || [],
              total: payload.old.total || 0,
              status: payload.old.status || 'rejected', 
            } as Order;
          } else {
            // Ensure all properties are correctly mapped and default to empty/zero if missing
            changedOrder = {
              id: orderData.id as string,
              customerName: orderData.customer_name || '',
              items: (orderData.items as any[] || []),
              total: orderData.total || 0,
              status: orderData.status || 'pending', // Default status
              date: orderData.order_date || new Date().toISOString(),
            } as Order;
          }

          // Update the state first
          setOrders(prevOrders => {
            if (payload.eventType === 'INSERT') {
              console.log('[Realtime] Evento INSERT. Novo pedido ID:', changedOrder.id);
              if (!prevOrders.some(order => order.id === changedOrder.id)) {
                // Reproduzir som para novo pedido
                if (newOrderSoundRef.current) {
                  newOrderSoundRef.current.play().catch(e => console.error("Erro ao reproduzir som:", e));
                }
                return [changedOrder, ...prevOrders];
              } else {
                console.log('[Realtime] Pedido já existe no estado, ignorando INSERT duplicado:', changedOrder.id);
                return prevOrders;
              }
            } else if (payload.eventType === 'UPDATE') {
              console.log('[Realtime] Evento UPDATE. Pedido ID:', changedOrder.id, 'Novo Status:', changedOrder.status);
              return prevOrders.map(order =>
                order.id === changedOrder.id ? changedOrder : order
              );
            } else if (payload.eventType === 'DELETE') {
              console.log('[Realtime] Evento DELETE recebido. Pedido ID:', changedOrder.id);
              const updatedOrders = prevOrders.filter(order => order.id !== changedOrder.id);
              if (selectedOrder?.id === changedOrder.id) {
                setSelectedOrder(null);
                setIsOrderDetailsModalOpen(false);
              }
              return updatedOrders;
            }
            return prevOrders;
          });

          // Then, show the toast based on the event type and new status
          let message: string = '';
          let toastIdValue: string = `order-status-${changedOrder.id}`; // Unique ID for each order status toast

          if (payload.eventType === 'INSERT') {
            message = `Novo pedido recebido!`;
          } else if (payload.eventType === 'UPDATE') {
            if (changedOrder.status === 'trashed') {
              message = `Pedido movido para a lixeira.`;
            } else if (changedOrder.status === 'preparing') {
              message = `Pedido aceito com sucesso!`;
            } else if (changedOrder.status === 'in_transit') {
              message = `Pedido em rota!`;
            } else if (changedOrder.status === 'delivered') {
              message = `Pedido entregue com sucesso!`;
            } else if (changedOrder.status === 'rejected') {
              message = `Pedido rejeitado.`;
            } else {
              message = `Pedido atualizado.`;
            }
          } else if (payload.eventType === 'DELETE') {
            message = `Pedido removido permanentemente.`;
          }

          if (message) {
            showSuccess(message, { toastId: toastIdValue });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[Realtime] Desinscrevendo do Realtime de pedidos.');
      supabase.removeChannel(ordersChannel);
    };
  }, [userId, supabase, selectedOrder]); 

  // NOVO: useEffect para recalcular dados de vendas e produtos mais vendidos quando 'orders' ou 'products' mudarem
  useEffect(() => {
    if (orders.length > 0 || products.length > 0) {
      setWeeklySalesData(generateWeeklySalesData());
      setMonthlySalesData(generateMonthlySalesData());
      setTopSellingProducts(getTopSellingProducts(orders, products));
    } else {
      setWeeklySalesData([]);
      setMonthlySalesData([]);
      setTopSellingProducts([]);
    }
  }, [orders, products]);


  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isStoreTemporariamenteClosed && storeSchedule.reopenAt) {
      timer = setInterval(() => {
        const now = new Date();
        const reopenTime = new Date(storeSchedule.reopenAt!);
        const diff = reopenTime.getTime() - now.getTime();

        if (diff <= 0) {
          setIsStoreTemporariamenteClosed(false);
          setReopenCountdown(null);
          if (userId) {
            storageService.saveStoreSchedule(supabase, userId, { ...storeSchedule, reopenAt: null, isTemporariamenteClosedIndefinidamente: false });
          }
          setTimeout(() => showSuccess("A loja foi reaberta automaticamente!"), 0); // Usar setTimeout
          clearInterval(timer);
        } else {
          const minutes = Math.floor(diff / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setReopenCountdown(`${minutes}m ${seconds}s`);
        }
      }, 1000);
    } else if (isStoreTemporariamenteClosed && storeSchedule.isTemporariamenteClosedIndefinidamente) {
        setReopenCountdown("Indefinidamente");
    } else {
      setReopenCountdown(null);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isStoreTemporariamenteClosed, storeSchedule, userId, supabase]);


  useEffect(() => {
    if (isAddingProduct) {
      setLocalImagePreview(currentProduct.image_url || null);
    } else {
      setLocalImagePreview(null);
    }
  }, [isAddingProduct, currentProduct.image_url]);

  useEffect(() => {
    if (optionToScrollToId) {
      const element = document.getElementById(`option-${optionToScrollToId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'end' });
        setOptionToScrollToId(null);
      }
    }
  }, [optionToScrollToId]);

  const handleAddGroup = async () => {
    if (newGroupName.trim() && userId) {
      const newGroup: Group = { name: newGroupName.trim(), order_index: groups.length }; 
      const updatedGroups = [...groups, newGroup];

      const savedGroups = await storageService.saveGroups(supabase, userId, updatedGroups);
      if (savedGroups) {
        setGroups(savedGroups as Group[]);
      }
      setNewGroupName('');
      setIsAddingGroup(false);
    }
  };

  const handleEditGroup = (groupId: string) => {
    const groupToEdit = groups.find(g => g.id === groupId);
    if (groupToEdit) {
      setEditingGroupId(groupId);
      setNewGroupNameEditing(groupToEdit.name);
    }
  };

  const handleSaveEditedGroup = async () => {
    if (editingGroupId && editingGroupName.trim() && userId) {
      const updatedGroups = groups.map(g => 
        g.id === editingGroupId ? { ...g, name: editingGroupName.trim() } : g
      );
      setGroups(updatedGroups);
      
      const savedGroups = await storageService.saveGroups(supabase, userId, updatedGroups);
      if (savedGroups) {
        setGroups(savedGroups as Group[]);
      }
      setEditingGroupId(null);
      setNewGroupNameEditing('');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este grupo? Todos os produtos associados a ele ficarão sem grupo.") && userId) {
      const updatedGroups = groups.filter(g => g.id !== groupId);
      const reindexedGroups = updatedGroups.map((g, index) => ({ ...g, order_index: index }));
      setGroups(reindexedGroups);
      
      const savedGroups = await storageService.saveGroups(supabase, userId, reindexedGroups);
      if (savedGroups) {
        setGroups(savedGroups as Group[]);
      }
      const updatedProducts = products.map(p => p.group_id === groupId ? { ...p, group_id: '' } : p);
      setProducts(updatedProducts);
      await storageService.saveProducts(supabase, userId, updatedProducts);
      if (selectedGroupId === groupId) {
        setSelectedGroupId('all');
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && userId) {
      const oldIndex = groups.findIndex((item) => item.id === active.id);
      const newIndex = groups.findIndex((item) => item.id === over?.id);
      
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrderedGroups = arrayMove(groups, oldIndex, newIndex);
      
      const reindexedGroups = newOrderedGroups.map((group, index) => ({
        ...group,
        order_index: index,
      }));

      setGroups(reindexedGroups);

      await storageService.saveGroups(supabase, userId, reindexedGroups);
    }
    setActiveGroup(null);
  };

  const handleDragStart = (event: any) => {
    const group = groups.find(g => g.id === event.active.id);
    if (group) {
      setActiveGroup(group);
    }
  };

  const handleDragCancel = () => {
    setActiveGroup(null);
  };

  const handleProductDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && userId) {
      const oldIndex = filteredProducts.findIndex((item) => item.id === active.id);
      const newIndex = filteredProducts.findIndex((item) => item.id === over?.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newOrderedFilteredProducts = arrayMove(filteredProducts, oldIndex, newIndex);

      const reindexedFilteredProductsMap = new Map<string, number>();
      newOrderedFilteredProducts.forEach((product, index) => {
        reindexedFilteredProductsMap.set(product.id!, index);
      });

      const updatedAllProducts = products
        .map(p => {
          if (reindexedFilteredProductsMap.has(p.id!)) {
            return { ...p, order_index: reindexedFilteredProductsMap.get(p.id!)! };
          }
          return p;
        })
        .sort((a, b) => a.order_index - b.order_index);

      setProducts(updatedAllProducts);

      await storageService.saveProducts(supabase, userId, updatedAllProducts);
    }
  };

  const handleOptionDragEnd = async (productId: string, event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && userId) {
      setProducts(prevProducts => {
        const updatedProducts = prevProducts.map(product => {
          if (product.id === productId) {
            const oldIndex = product.options.findIndex(option => option.id === active.id);
            const newIndex = product.options.findIndex(option => option.id === over?.id);

            if (oldIndex === -1 || newIndex === -1) return product;

            const newOrderedOptions = arrayMove(product.options, oldIndex, newIndex);
            return { ...product, options: newOrderedOptions };
          }
          return product;
        });
        debouncedSaveProducts(updatedProducts, userId);
        return updatedProducts;
      });
    }
  };

  const handleSubProductDragEnd = async (productId: string, optionId: string, event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && userId) {
      setProducts(prevProducts => {
        const updatedProducts = prevProducts.map(product => {
          if (product.id === productId) {
            return {
              ...product, // Corrigido de 'p' para 'product'
              options: product.options.map(option => {
                if (option.id === optionId) {
                  const oldIndex = option.subProducts.findIndex(subProduct => subProduct.id === active.id);
                  const newIndex = option.subProducts.findIndex(subProduct => subProduct.id === over?.id);

                  if (oldIndex === -1 || newIndex === -1) return option;

                  const newOrderedSubProducts = arrayMove(option.subProducts, oldIndex, newIndex);
                  return { ...option, subProducts: newOrderedSubProducts };
                }
                return option;
              }),
            };
          }
          return product;
        });
        debouncedSaveProducts(updatedProducts, userId);
        return updatedProducts;
      });
    }
  };

  const handleSaveProduct = async () => {
    if (!currentProduct.name || !currentProduct.price || !currentProduct.group_id) {
        alert("Por favor, preencha o nome, preço e selecione um grupo para o produto.");
        return;
    }
    if (!userId) return;

    let productsToUpdateState: Product[];
    const imageUrlToSave = localImagePreview || currentProduct.image_url || '';

    if (currentProduct.id) {
      productsToUpdateState = products.map(p => p.id === currentProduct.id ? { ...p, ...currentProduct, image_url: imageUrlToSave } as Product : p);
    } else {
      const productToCreate: Product = {
        name: currentProduct.name,
        description: currentProduct.description || '',
        price: currentProduct.price,
        category: currentProduct.category || Category.OTHER,
        image_url: imageUrlToSave,
        stock: currentProduct.stock || 0,
        group_id: currentProduct.group_id,
        options: currentProduct.options || [],
        order_index: products.length,
        id: undefined,
        isFeatured: currentProduct.isFeatured || false,
      };
      productsToUpdateState = [...products, productToCreate];
    }
    
    const savedProducts = await storageService.saveProducts(supabase, userId, productsToUpdateState);
    if (savedProducts) {
      setProducts(savedProducts as Product[]);
    }
    setIsAddingProduct(false);
    setCurrentProduct({});
    setLocalImagePreview(null);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!userId) return;
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    await storageService.saveProducts(supabase, userId, updated);
  };

  const handleProductImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setLocalImagePreview(currentProduct.image_url || null);
    }
  };

  const handleToggleProductFeatured = async (productId: string, isFeatured: boolean) => {
    if (!userId) return;

    const updatedProducts = products.map(p => 
      p.id === productId ? { ...p, isFeatured: isFeatured } : p
    );
    setProducts(updatedProducts);
    await storageService.saveProducts(supabase, userId, updatedProducts);
    setTimeout(() => showSuccess(`Produto ${isFeatured ? 'adicionado aos destaques' : 'removido dos destaques'}!`), 0); // Usar setTimeout
  };

  const handleOptionChange = async (productId: string, optionId: string, field: keyof Option, value: any) => {
    if (!userId) return;
    const updatedProducts = products.map(p => 
        p.id === productId 
            ? { 
                ...p, 
                options: p.options.map(opt => 
                    opt.id === optionId ? { ...opt, [field]: value } : opt
                )
              } 
            : p
    );
    setProducts(updatedProducts);
    debouncedSaveProducts(updatedProducts, userId);
  };

  const handleSubProductChange = async (productId: string, optionId: string, subProductId: string, field: keyof SubProduct, value: any) => {
    if (!userId) return;
    const updatedProducts = products.map(p => 
        p.id === productId 
            ? { 
                ...p, 
                options: p.options.map(opt => 
                    opt.id === optionId 
                        ? { 
                            ...opt, 
                            subProducts: opt.subProducts.map(sp => 
                                sp.id === subProductId ? { ...sp, [field]: value } : sp
                            )
                          } 
                        : opt
                )
              } 
            : p
    );
    setProducts(updatedProducts);
    debouncedSaveProducts(updatedProducts, userId);
  };

  const handleAddOption = async (productId: string) => {
    if (!userId) return;
    const newOption: Option = {
      id: Date.now().toString(),
      title: 'Escolha seus Sabores',
      minSelection: 1,
      maxSelection: 1,
      allowRepeat: false,
      subProducts: [],
      isActive: true,
    };
    const updatedProducts = products.map(p => 
      p.id === productId ? { ...p, options: [...p.options, newOption] } : p
    );
    setProducts(updatedProducts);
    await storageService.saveProducts(supabase, userId, updatedProducts);
    setOptionToScrollToId(newOption.id);
  };

  const handleAddSubProductClick = (productId: string, optionId: string) => {
    setCurrentProductAndOptionForSubProduct({ productId, optionId });
    setIsAddSubProductModalOpen(true);
  };

  const handleAddSubProductConfirm = React.useCallback(async (newSubProductData: Omit<SubProduct, 'id' | 'isActive'>) => {
    if (currentProductAndOptionForSubProduct && userId) {
        const { productId, optionId } = currentProductAndOptionForSubProduct;
        const newSubProduct: SubProduct = {
            id: Date.now().toString(),
            name: newSubProductData.name,
            description: newSubProductData.description,
            price: newSubProductData.price,
            isActive: true,
        };
        const updatedProducts = products.map(p => 
            p.id === productId 
                ? { ...p, options: p.options.map(opt => 
                    opt.id === optionId ? { ...opt, subProducts: [...opt.subProducts, newSubProduct] } : opt
                  )} 
                : p
        );
        setProducts(updatedProducts);
        await storageService.saveProducts(supabase, userId, updatedProducts);
        setCurrentProductAndOptionForSubProduct(null);
        setIsAddSubProductModalOpen(false);
    }
  }, [currentProductAndOptionForSubProduct, userId, products, supabase]);

  const updateProductOptionsAndSave = (
    productId: string,
    optionId: string,
    targetActiveState: boolean,
    searchTerm: string,
    applyToFilteredOnly: boolean
  ) => {
    setProducts(prevProducts => {
      const updatedProducts = prevProducts.map(p => {
        if (p.id === productId) {
          return {
            ...p,
            options: p.options.map(opt => {
              if (opt.id === optionId) {
                const newOptionState = { ...opt };
                if (applyToFilteredOnly && searchTerm) {
                  newOptionState.subProducts = opt.subProducts.map(sp => {
                    if (sp.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                      return { ...sp, isActive: targetActiveState };
                    }
                    return sp;
                  });
                } else {
                  newOptionState.isActive = targetActiveState;
                  newOptionState.subProducts = opt.subProducts.map(sp => ({
                    ...sp,
                    isActive: targetActiveState,
                  }));
                }
                return newOptionState;
              }
              return opt;
            }),
          };
        }
        return p;
      });
      if (userId) {
        debouncedSaveProducts(updatedProducts, userId);
      }
      return updatedProducts;
    });
  };

  const handleToggleOptionOrFilteredSubProductsActive = (
    productId: string, 
    optionId: string, 
    searchTerm: string = '', 
    currentOption: Option, 
    filteredSubProducts: SubProduct[]
  ) => {
    if (!userId) return;

    let targetActiveState: boolean;
    if (searchTerm) {
      targetActiveState = !filteredSubProducts.every(sp => sp.isActive);
    } else {
      targetActiveState = !currentOption.isActive;
    }

    if (searchTerm) {
      setPendingToggleAction({ productId, optionId, searchTerm, targetActiveState });
      setIsToggleConfirmationModalOpen(true);
    } else {
      updateProductOptionsAndSave(productId, optionId, targetActiveState, '', false);
      setTimeout(() => showSuccess(`Todos os sabores foram ${targetActiveState ? 'ativados' : 'desativados'}!`), 0); // Usar setTimeout
    }
  };

  const confirmToggleAllSubProducts = async () => {
    if (!pendingToggleAction || !userId) return;
    const { productId, optionId, searchTerm, targetActiveState } = pendingToggleAction;

    updateProductOptionsAndSave(productId, optionId, targetActiveState, '', false);
    setIsToggleConfirmationModalOpen(false);
    setPendingToggleAction(null);
    setTimeout(() => showSuccess(`Todos os itens da opção foram ${targetActiveState ? 'ativados' : 'desativados'}!`), 0); // Usar setTimeout
  };

  const confirmToggleFilteredSubProducts = async () => {
    if (!pendingToggleAction || !userId) return;
    const { productId, optionId, searchTerm, targetActiveState } = pendingToggleAction;

    updateProductOptionsAndSave(productId, optionId, targetActiveState, searchTerm, true);
    setIsToggleConfirmationModalOpen(false);
    setPendingToggleAction(null);
    setTimeout(() => showSuccess(`Somente os nomes filtrados foram ${targetActiveState ? 'ativados' : 'desativados'}!`), 0); // Usar setTimeout
  };


  const handleToggleSubProductActive = async (productId: string, optionId: string, subProductId: string) => {
    if (!userId) return;
    const updatedProducts = products.map(p => 
      p.id === productId 
        ? { ...p, options: p.options.map(opt => 
            opt.id === optionId 
              ? { ...opt, subProducts: opt.subProducts.map(sp => 
                  sp.id === subProductId ? { ...sp, isActive: !sp.isActive } : sp
                )} 
              : opt
          )} 
        : p
    );
    setProducts(updatedProducts);
    await storageService.saveProducts(supabase, userId, updatedProducts);
    setTimeout(() => showSuccess(`Sabor ${updatedProducts.find(p => p.id === productId)?.options.find(opt => opt.id === optionId)?.subProducts.find(sp => sp.id === subProductId)?.name} foi ${updatedProducts.find(p => p.id === productId)?.options.find(opt => opt.id === optionId)?.subProducts.find(sp => sp.id === subProductId)?.isActive ? 'ativado' : 'desativado'}!`), 0); // Usar setTimeout
  };

  const handleDeleteOption = async (productId: string, optionId: string) => {
    if (!userId) return;
    const updatedProducts = products.map(p => 
      p.id === productId 
        ? { ...p, options: p.options.filter(opt => opt.id !== optionId) } 
        : p
    );
    setProducts(updatedProducts);
    await storageService.saveProducts(supabase, userId, updatedProducts);
  };

  const handleDeleteSubProduct = async (productId: string, optionId: string, subProductId: string) => {
    if (!userId) return;
    const updatedProducts = products.map(p => 
      p.id === productId 
        ? { ...p, options: p.options.map(opt => 
            opt.id === optionId 
              ? { ...opt, subProducts: opt.subProducts.filter(sp => sp.id !== subProductId) } 
              : opt
          )} 
        : p
    );
    setProducts(updatedProducts);
    await storageService.saveProducts(supabase, userId, updatedProducts);
  };

  const handleScheduleChange = (index: number, field: keyof DailySchedule, value: any) => {
    console.log(`[Dashboard] Alterando agendamento para o dia ${storeSchedule.dailySchedules[index].day}: ${field} = ${value}`);
    const updatedSchedules = [...storeSchedule.dailySchedules];
    updatedSchedules[index] = { ...updatedSchedules[index], [field]: value };
    setStoreSchedule(prev => ({ ...prev, dailySchedules: updatedSchedules }));
  };

  const handleSaveSchedule = async () => {
    if (!userId) return;
    console.log('[Dashboard] Salvando agendamento da loja:', storeSchedule);
    await storageService.saveStoreSchedule(supabase, userId, storeSchedule);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setLogoFile(file || null);
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
      console.log('[Dashboard] Nova logo selecionada para pré-visualização local.');
    } else {
      setLogoPreview(storeProfile.logoUrl);
      console.log('[Dashboard] Nenhuma logo selecionada, revertendo para URL existente:', storeProfile.logoUrl);
    }
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setCoverFile(file || null);
    if (file) {
      setCoverPreview(URL.createObjectURL(file));
      console.log('[Dashboard] Nova capa selecionada para pré-visualização local.');
    } else {
      setCoverPreview(storeProfile.coverUrl);
      console.log('[Dashboard] Nenhuma capa selecionada, revertendo para URL existente:', storeProfile.coverUrl);
    }
  };

  const handleSaveStoreProfile = async () => {
    if (!userId) {
      showError("Usuário não autenticado. Não é possível salvar o perfil da loja.");
      return;
    }
    setIsUploadingImages(true);
    try {
      await storageService.saveStoreProfile(supabase, userId, storeProfile, logoFile, coverFile);
      const updatedProfile = await storageService.getStoreProfile(supabase, userId);
      setStoreProfile(updatedProfile);
      setLogoPreview(updatedProfile.logoUrl);
      setCoverPreview(updatedProfile.coverUrl);
      setLogoFile(null);
      setCoverFile(null);
      console.log('[Dashboard] Perfil da loja salvo e recarregado. Logo URL:', updatedProfile.logoUrl, 'Cover URL:', updatedProfile.coverUrl);
    } catch (error) {
      console.error("Erro ao salvar perfil da loja no Dashboard:", error);
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (userId) {
      const updatedProfile = await storageService.getProfile(supabase, userId);
      setUserProfile(updatedProfile);
    }
  };

  const handleToggleTemporaryClose = () => {
    if (!userId) return;

    if (isStoreTemporariamenteClosed) {
      setIsStoreTemporariamenteClosed(false);
      setStoreSchedule(prev => ({ ...prev, reopenAt: null, isTemporariamenteClosedIndefinidamente: false }));
      storageService.saveStoreSchedule(supabase, userId, { ...storeSchedule, reopenAt: null, isTemporariamenteClosedIndefinidamente: false });
      setTimeout(() => showSuccess("A loja foi reaberta automaticamente!"), 0); // Usar setTimeout
      setIsCloseModalOpen(false);
    } else {
      setIsCloseModalOpen(true);
    }
  };

  const handleSetTemporaryCloseDuration = async (durationMinutes: number) => {
    if (!userId) return;

    let reopenAtISO: string | null = null;
    let isIndefinite = false;
    let successMessage = "";

    if (durationMinutes === -1) {
      isIndefinite = true;
      successMessage = "Loja fechada por tempo indeterminado!";
    } else {
      const now = new Date();
      const reopenTime = new Date(now.getTime() + durationMinutes * 60 * 1000);
      reopenAtISO = reopenTime.toISOString();
      successMessage = `Loja fechada temporariamente. Reabre em ${durationMinutes} minutos.`;
    }

    setStoreSchedule(prev => ({ 
        ...prev, 
        reopenAt: reopenAtISO, 
        isTemporariamenteClosedIndefinidamente: isIndefinite 
    }));
    setIsStoreTemporariamenteClosed(true);
    setIsCloseModalOpen(false);

    await storageService.saveStoreSchedule(supabase, userId, { 
        ...storeSchedule, 
        reopenAt: reopenAtISO, 
        isTemporariamenteClosedIndefinidamente: isIndefinite 
    });
    setTimeout(() => showSuccess(successMessage), 0); // Usar setTimeout
  };

  const handleOpenCopyOptionModal = (productId: string, optionId: string) => {
    const product = products.find(p => p.id === productId);
    const option = product?.options.find(o => o.id === optionId);
    if (product && option) {
      setOptionToCopy({ productId, optionId, optionTitle: option.title });
      setIsCopyOptionModalOpen(true);
    }
  };

  const handleCloseCopyOptionModal = () => {
    setIsCopyOptionModalOpen(false);
    setOptionToCopy(null);
  };

  const handleCopyOption = async (sourceProductId: string, sourceOptionId: string, targetProductIds: string[]) => {
    if (!userId) return;

    const sourceProduct = products.find(p => p.id === sourceProductId);
    const sourceOption = sourceProduct?.options.find(o => o.id === sourceOptionId);

    if (!sourceOption) {
      showError("Opção de origem não encontrada.");
      return;
    }

    const updatedProducts = products.map(p => {
      if (targetProductIds.includes(p.id!)) {
        const copiedOption: Option = JSON.parse(JSON.stringify(sourceOption));
        copiedOption.id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        copiedOption.subProducts = copiedOption.subProducts.map(sp => ({
          ...sp,
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        }));
        return { ...p, options: [...p.options, copiedOption] };
      }
      return p;
    });

    setProducts(updatedProducts);
    await storageService.saveProducts(supabase, userId, updatedProducts);
    setTimeout(() => showSuccess(`Opção '${sourceOption.title}' copiada com sucesso!`), 0); // Usar setTimeout
    handleCloseCopyOptionModal();
  };

  const handleOpenOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderDetailsModalOpen(true);
  };

  const handleCloseOrderDetails = () => {
    setSelectedOrder(null);
    setIsOrderDetailsModalOpen(false);
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    if (!userId) return;
    // Apenas chama o serviço para atualizar o DB. O toast será disparado pelo listener do Realtime.
    await storageService.updateOrderStatus(supabase, userId, orderId, newStatus);
  };

  // MODIFICADO: handleDeleteOrder agora move para a lixeira
  const handleDeleteOrder = async (orderId: string) => {
    if (!userId) return;
    if (window.confirm(`Tem certeza que deseja mover o pedido #${orderId.substring(0, 8)} para a lixeira?`)) {
      // Apenas chama o serviço para atualizar o DB. O toast será disparado pelo listener do Realtime.
      await storageService.deleteOrder(supabase, userId, orderId);
    }
  };

  // NOVO: Função para abrir o modal de confirmação de senha antes de excluir permanentemente
  const handleConfirmPermanentDeleteOrder = (orderId: string) => {
    setOrderToDeletePermanently(orderId);
    setIsAdminPasswordConfirmModalOpen(true);
  };

  // NOVO: Função para excluir permanentemente um pedido da lixeira APÓS a confirmação da senha
  const handlePermanentlyDeleteOrderWithPassword = async (password: string) => {
    if (!userId || !orderToDeletePermanently) {
      showError("Erro interno: ID do pedido ou usuário ausente.");
      return;
    }

    try {
      // Apenas chama o serviço para atualizar o DB. O toast será disparado pelo listener do Realtime.
      const success = await storageService.permanentlyDeleteOrder(supabase, userId, orderToDeletePermanently);
      if (!success) {
        showError("Falha ao excluir pedido permanentemente.");
      }
    } catch (error: any) {
      console.error("Erro ao excluir pedido permanentemente com senha:", error);
      showError(error.message || "Erro desconhecido ao excluir pedido permanentemente.");
    } finally {
      setOrderToDeletePermanently(null);
      setIsAdminPasswordConfirmModalOpen(false);
    }
  };

  const getNextStatus = (currentStatus: Order['status']): Order['status'] | null => {
    switch (currentStatus) {
      case 'pending': return 'preparing';
      case 'preparing': return 'in_transit';
      case 'in_transit': return 'delivered';
      default: return null; // Não há próximo status para 'delivered', 'rejected' ou 'trashed'
    }
  };


  const menuItems = [
      { id: 'overview', label: 'Início', icon: LayoutDashboard },
      { id: 'products', label: 'Produtos / Cardápios', icon: Package },
      { 
          id: 'store', 
          label: 'Loja', 
          icon: Store, 
          hasSubmenu: true,
          children: [
              { id: 'store-settings', label: 'Configurações da Loja', icon: Settings },
              { id: 'schedule', label: 'Horário de Funcionamento', icon: Clock }
          ]
      },
      { 
          id: 'orders-parent',
          label: 'Pedidos', 
          icon: ShoppingBag, 
          hasSubmenu: true,
          children: [
              { id: 'order-manager', label: 'Gerenciador de Pedidos', icon: ShoppingBag },
              { id: 'table-manager', label: 'Gerenciador de Mesas', icon: TableIcon },
              { id: 'counter-manager', label: 'Gerenciador de Balcões', icon: Monitor },
          ]
      },
      { id: 'clients', label: 'Clientes', icon: Users },
      { id: 'staff', label: 'Funcionários', icon: Users },
      { id: 'reports', label: 'Relatórios', icon: FileText, hasSubmenu: false },
  ];

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(groupSearchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(product => {
    const matchesSearchTerm = product.name.toLowerCase().includes(productSearchTerm.toLowerCase());

    if (groups.length === 0 && selectedGroupId !== 'all') {
        return false; 
    }

    if (selectedGroupId === 'all') {
      return matchesSearchTerm && (groups.some(group => group.id === product.group_id) || product.group_id === '');
    } else {
      return matchesSearchTerm && product.group_id === selectedGroupId;
    }
  });

  // Usando useMemo para otimizar a filtragem de pedidos
  const filteredOrders = React.useMemo(() => {
    console.log('[Dashboard] Recalculando filteredOrders. orders state (IDs):', orders.map(o => o.id), 'filter:', orderStatusFilter); // MODIFIED LOG
    const result = orders.filter(order => {
      if (orderStatusFilter === 'all') return order.status !== 'trashed'; // 'all' não mostra lixeira por padrão
      if (orderStatusFilter === 'trashed') return order.status === 'trashed';
      return order.status === orderStatusFilter;
    });
    console.log('[Dashboard] filteredOrders result (IDs):', result.map(o => o.id)); // NOVO LOG
    return result;
  }, [orders, orderStatusFilter]);

  console.log('ORDERS RENDER (final state before JSX):', orders.map(o => ({ id: o.id, status: o.status })));

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-200 font-sans">
      {/* Elemento de áudio para notificação de novo pedido */}
      <audio ref={newOrderSoundRef} src="/sounds/clock-alarm-8761.mp3" preload="auto" />

      <aside 
        className={`text-gray-300 flex flex-col shadow-2xl z-20 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} border-r border-gray-800`}
        style={{ background: `linear-gradient(to bottom, ${storeProfile.secondaryColor}e0, ${storeProfile.secondaryColor})` }}
      >
        <div className="p-5 border-b border-gray-700 flex items-center justify-between">
           <div className={`flex items-center gap-2 ${isSidebarCollapsed ? 'hidden' : 'flex'}`}>
               <AppLogo 
                   isCollapsed={isSidebarCollapsed} 
                   textColor="text-white" 
                   highlightColor={storeProfile.primaryColor} 
               />
           </div>
           <button 
               onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
               className={`p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors transform active:scale-90 ${isSidebarCollapsed ? 'mx-auto' : ''}`}
           >
               <Menu className="w-5 h-5" />
           </button>
        </div>

        <nav className="flex-1 py-6 space-y-1">
            {menuItems.map(item => (
                <React.Fragment key={item.id}>
                    <button
                        onClick={() => {
                            if (item.id === 'store') {
                                setIsStoreSubmenuOpen(prev => !prev);
                                setIsOrdersSubmenuOpen(false);
                                if (!isStoreSubmenuOpen) {
                                    setActiveTab('store-settings');
                                }
                            } else if (item.id === 'orders-parent') {
                                setIsOrdersSubmenuOpen(prev => !prev);
                                setIsStoreSubmenuOpen(false);
                                // A navegação para os itens do submenu agora é feita apenas ao clicar nos itens filhos
                            } else {
                                setActiveTab(item.id as any);
                                setIsStoreSubmenuOpen(false);
                                setIsOrdersSubmenuOpen(false);
                            }
                        }}
                        className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-6'} py-3.5 transition-all duration-200 group relative overflow-hidden
                            ${activeTab === item.id || (item.hasSubmenu && item.children?.some(child => child.id === activeTab))
                                ? 'text-white border-l-4 shadow-lg'
                                : 'border-l-4 border-transparent hover:bg-gray-700/50 hover:text-white hover:shadow-md'
                            }`}
                        style={activeTab === item.id || (item.hasSubmenu && item.children?.some(child => child.id === activeTab))
                            ? { backgroundColor: `${storeProfile.primaryColor}20`, borderColor: storeProfile.primaryColor }
                            : {}
                        }
                    >
                        <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                            <item.icon className={`w-5 h-5 ${activeTab === item.id || (item.hasSubmenu && item.children?.some(child => child.id === activeTab)) ? 'text-white' : 'text-gray-400'} group-hover:text-white transition-colors`} 
                                style={activeTab === item.id || (item.hasSubmenu && item.children?.some(child => child.id === activeTab)) ? { color: storeProfile.primaryColor } : {}}
                            />
                            <span className={`text-sm font-medium ${isSidebarCollapsed ? 'hidden' : ''}`}>{item.label}</span>
                        </div>
                        {item.hasSubmenu && !isSidebarCollapsed && (
                            <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform 
                                ${ (item.id === 'store' && isStoreSubmenuOpen) || (item.id === 'orders-parent' && isOrdersSubmenuOpen) ? 'rotate-180' : ''}`} />
                        )}
                        <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
                    </button>

                    {item.hasSubmenu && item.id === 'store' && isStoreSubmenuOpen && !isSidebarCollapsed && (
                        <div className="ml-8 space-y-1 border-l border-gray-700">
                            {item.children?.map(child => (
                                <button
                                    key={child.id}
                                    onClick={() => setActiveTab(child.id as any)}
                                    className={`w-full flex items-center gap-3 px-6 py-2 transition-all duration-200 relative overflow-hidden
                                        ${activeTab === child.id
                                            ? 'text-white border-l-4 shadow-md'
                                            : 'border-l-4 border-transparent hover:bg-gray-700/30 hover:text-white hover:shadow-sm'
                                        }`}
                                    style={activeTab === child.id
                                        ? { backgroundColor: `${storeProfile.primaryColor}10`, borderColor: storeProfile.primaryColor }
                                        : {}
                                    }
                                >
                                    <child.icon className={`w-4 h-4 ${activeTab === child.id ? 'text-white' : 'text-gray-400'} transition-colors`} 
                                        style={activeTab === child.id ? { color: storeProfile.primaryColor } : {}}
                                    />
                                    <span className="text-sm font-medium">{child.label}</span>
                                    <span className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
                                </button>
                            ))}
                        </div>
                    )}

                    {item.hasSubmenu && item.id === 'orders-parent' && isOrdersSubmenuOpen && !isSidebarCollapsed && (
                        <div className="ml-8 space-y-1 border-l border-gray-700">
                            {item.children?.map(child => (
                                <button
                                    key={child.id}
                                    onClick={() => setActiveTab(child.id as any)}
                                    className={`w-full flex items-center gap-3 px-6 py-2 transition-all duration-200 relative overflow-hidden
                                        ${activeTab === child.id
                                            ? 'text-white border-l-4 shadow-md'
                                            : 'border-l-4 border-transparent hover:bg-gray-700/30 hover:text-white hover:shadow-sm'
                                        }`}
                                    style={activeTab === child.id
                                        ? { backgroundColor: `${storeProfile.primaryColor}10`, borderColor: storeProfile.primaryColor }
                                        : {}
                                    }
                                >
                                    <child.icon className={`w-4 h-4 ${activeTab === child.id ? 'text-white' : 'text-gray-400'} transition-colors`} 
                                        style={activeTab === child.id ? { color: storeProfile.primaryColor } : {}}
                                    />
                                    <span className="text-sm font-medium">{child.label}</span>
                                    <span className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
                                </button>
                            ))}
                        </div>
                    )}
                </React.Fragment>
            ))}
        </nav>

        <div className="p-4 border-t border-gray-700 shadow-inner" style={{ backgroundColor: storeProfile.secondaryColor }}>
            <button onClick={onLogout} className={`flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full px-2 py-2 rounded hover:bg-gray-800 transform active:scale-95 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                <LogOut className="w-4 h-4"/> 
                <span className={`${isSidebarCollapsed ? 'hidden' : ''}`}>Sair do Painel</span>
            </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        
        <header className="h-16 bg-white shadow-xl flex items-center justify-between px-8 z-10 border-b border-gray-200">
            <div className="flex items-center gap-2">
                <div className="h-8 w-1 bg-black rounded-full shadow-md"></div>
                <h2 className="text-xl font-bold text-gray-800">{storeProfile.name || 'Carregando...'}</h2>
            </div>

            <div className="flex items-center gap-6">
                <div className="relative flex items-center gap-3 bg-gray-100 px-4 py-1.5 rounded-full shadow-inner border border-gray-200">
                    <span className="text-xs font-semibold text-gray-600">Fechar Loja Temporariamente</span>
                    <button 
                        onClick={handleToggleTemporaryClose}
                        className={`w-10 h-5 rounded-full flex items-center transition-all duration-300 p-1 shadow-md 
                            ${isStoreTemporariamenteClosed ? 'bg-red-500 justify-end' : 'bg-gray-300 justify-start'} 
                            transform active:scale-90`}
                    >
                         <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                    </button>
                    {isStoreTemporariamenteClosed && reopenCountdown && (
                        <span className="ml-2 text-xs font-semibold text-red-600">
                            {storeSchedule.isTemporariamenteClosedIndefinidamente ? 'Fechado Indefinidamente' : `Reabre em: ${reopenCountdown}`}
                        </span>
                    )}
                </div>

                <a 
                    href="#/store" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-5 py-2 rounded-lg text-sm font-bold shadow-xl transition-all transform active:scale-95 flex items-center gap-2"
                >
                    Acesse seu Cardápio
                    <Store className="w-4 h-4" />
                </a>

                <div className="relative">
                    <button 
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                        className="flex items-center gap-3 pl-4 border-l border-gray-200 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Olá, Administrador</p>
                            <p className="text-sm font-bold text-gray-800">
                                {userProfile?.first_name || 'Carregando...'}
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden border-2 border-white shadow-md flex items-center justify-center">
                            {userProfile?.avatar_url ? (
                                <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon className="w-6 h-6 text-gray-500" />
                            )}
                        </div>
                    </button>

                    {isProfileDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 z-[9999] border border-gray-100 animate-in fade-in-0 zoom-in-95">
                            <button 
                                onClick={() => { 
                                    setActiveTab('profile-settings'); 
                                    onNavigate('#/dashboard/profile-settings');
                                    setIsProfileDropdownOpen(false); 
                                }} 
                                className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <UserIcon className="w-4 h-4" /> Configurações de Perfil
                            </button>
                            <button 
                                onClick={() => { 
                                    setTimeout(() => showSuccess("Funcionalidade de Suporte em breve!"), 0); // Usar setTimeout
                                    setIsProfileDropdownOpen(false); 
                                }} 
                                className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <FileText className="w-4 h-4" /> Suporte
                            </button>
                            <button 
                                onClick={() => { 
                                    setTimeout(() => showSuccess("Funcionalidade de Meu Plano em breve!"), 0); // Usar setTimeout
                                    setIsProfileDropdownOpen(false); 
                                }} 
                                className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <Star className="w-4 h-4" /> Meu Plano
                            </button>
                            <div className="border-t border-gray-100 my-1"></div>
                            <button 
                                onClick={() => { onLogout(); setIsProfileDropdownOpen(false); }} 
                                className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                <LogOut className="w-4 h-4" /> Sair
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-gray-100 to-gray-200">
            
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                        <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-100 transform hover:scale-[1.02] hover:shadow-2xl transition-all duration-200 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-gray-500 font-medium text-sm">Vendas Totais</h4>
                                <span className="bg-green-100 text-green-600 p-2 rounded-lg shadow-md"><ShoppingBag size={20} /></span>
                            </div>
                            <p className="text-3xl font-bold text-gray-800">R$ {orders.filter(o => o.status !== 'trashed').reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-100 transform hover:scale-[1.02] hover:shadow-2xl transition-all duration-200 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-gray-500 font-medium text-sm">Pedidos Pendentes</h4>
                                <span className="bg-yellow-100 text-yellow-600 p-2 rounded-lg shadow-md"><Package size={20} /></span>
                            </div>
                            <p className="text-3xl font-bold text-gray-800">{orders.filter(o => o.status === 'pending').length}</p>
                        </div>
                         <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-100 transform hover:scale-[1.02] hover:shadow-2xl transition-all duration-200 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-gray-500 font-medium text-sm">Produtos Ativos</h4>
                                <span className="bg-yellow-100 text-yellow-600 p-2 rounded-lg shadow-md"><Store size={20} /></span>
                            </div>
                            <p className="text-3xl font-bold text-gray-800">{products.length}</p>
                        </div>
                    </div>

                    <div className="mt-8">
                        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <TrendingUp className="drop-shadow-sm" style={{ color: storeProfile.primaryColor }} />
                            Visão Geral de Vendas
                        </h3>
                        <SalesCharts 
                            storePrimaryColor={storeProfile.primaryColor} 
                            weeklySalesData={weeklySalesData} 
                            monthlySalesData={monthlySalesData} 
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                        <RecentOrders 
                            orders={orders.filter(o => o.status !== 'trashed')} // Não mostra pedidos da lixeira
                            storePrimaryColor={storeProfile.primaryColor} 
                            onViewAllOrders={() => setActiveTab('order-manager')}
                        />

                        <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-100 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
                            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Produtos Mais Vendidos</h3>
                            {topSellingProducts.length === 0 ? (
                                <div className="text-center text-gray-500 py-4">Nenhum produto vendido ainda.</div>
                            ) : (
                                <div className="space-y-3">
                                    {topSellingProducts.map((product, index) => (
                                        <div key={product.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-gray-600">{index + 1}.</span>
                                                <div>
                                                    <p className="font-medium text-gray-800 text-sm">{product.name}</p>
                                                    <p className="text-xs text-gray-500">{product.totalQuantity} unidades vendidas</p>
                                                </div>
                                            </div>
                                            <p className="font-bold text-gray-900 text-sm">R$ {product.totalRevenue.toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'products' && (
                <div className="flex gap-6 h-full">
                    <div className="w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 flex flex-col flex-shrink-0 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="text" 
                                placeholder="Buscar grupos..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#9f1239] focus:ring-2 focus:ring-[#9f1239]/20 shadow-sm transition-all"
                                value={groupSearchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <button 
                            onClick={() => setIsAddingGroup(true)}
                            className="text-white px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-95 font-medium text-sm mb-4 relative overflow-hidden"
                        >
                            <Plus className="w-4 h-4" /> NOVO GRUPO
                            <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
                        </button>

                        {isAddingGroup && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-inner">
                                <input 
                                    type="text" 
                                    placeholder="Nome do novo grupo"
                                    className="w-full border-gray-300 rounded-md p-2 text-sm mb-2 focus:ring-1 focus:ring-[#9f1239]/20 focus:border-[#9f1239] shadow-sm"
                                    value={newGroupName}
                                    onChange={e => setNewGroupName(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleAddGroup} className="flex-1 text-white text-xs py-1.5 rounded-md hover:bg-green-700 shadow-md transform active:scale-95" style={{ backgroundColor: storeProfile.secondaryColor }}>Salvar</button>
                                    <button onClick={() => { setIsAddingGroup(false); setNewGroupName(''); }} className="flex-1 bg-gray-300 text-gray-800 text-xs py-1.5 rounded-md hover:bg-gray-400 shadow-md transform active:scale-95">Cancelar</button>
                                </div>
                            </div>
                        )}
                        
                        <div className="space-y-2 flex-1 overflow-y-auto">
                            {groups.length > 0 && (
                                <button 
                                    onClick={() => setSelectedGroupId('all')}
                                    className={`w-full text-center px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 relative overflow-hidden
                                        ${selectedGroupId === 'all' 
                                            ? 'text-gray-900 shadow-lg transform scale-[1.01]' 
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-md hover:shadow-lg hover:translate-x-0.5'}`}
                                    style={selectedGroupId === 'all' 
                                        ? { backgroundColor: storeProfile.primaryColor } 
                                        : {}
                                    }
                                >
                                    Todos
                                    <span className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
                                </button>
                            )}
                            <DndContext 
                                sensors={sensors} 
                                collisionDetection={closestCenter} 
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onDragCancel={handleDragCancel}
                            >
                                <SortableContext 
                                    items={filteredGroups.map(g => g.id!)} 
                                    strategy={verticalListSortingStrategy}
                                >
                                    {filteredGroups.map((group) => (
                                        <SortableGroupItem
                                            key={group.id}
                                            group={group}
                                            isSelected={selectedGroupId === group.id}
                                            storePrimaryColor={storeProfile.primaryColor}
                                            onSelect={setSelectedGroupId}
                                            onEdit={handleEditGroup}
                                            onDelete={handleDeleteGroup}
                                            isEditing={editingGroupId === group.id}
                                            editingGroupName={editingGroupName}
                                            onGroupNameChange={(e) => setNewGroupNameEditing(e.target.value)}
                                            onSaveEditedGroup={handleSaveEditedGroup}
                                        />
                                    ))}
                                </SortableContext>
                                <DragOverlay>
                                  {activeGroup ? (
                                    <div className="bg-white shadow-xl rounded-lg p-4 w-64 opacity-90 flex items-center gap-2 border border-gray-200">
                                      <GripVertical className="w-4 h-4 text-gray-400" />
                                      <span className="font-semibold text-gray-800">{activeGroup.name}</span>
                                    </div>
                                  ) : null}
                                </DragOverlay>
                            </DndContext>
                        </div>
                    </div>

                    <div className="flex-1 space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <Package className="drop-shadow-sm" style={{ color: storeProfile.primaryColor }} />
                                Gerenciar Produtos, Grupos e Sub-produtos
                            </h2>
                            {groups.length > 0 && (
                                <button 
                                    onClick={() => { setIsAddingProduct(true); setCurrentProduct({}); }}
                                    className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-xl transition-all transform active:scale-95 font-medium relative overflow-hidden"
                                >
                                    <Plus className="w-4 h-4" /> NOVO PRODUTO
                                    <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
                                </button>
                            )}
                        </div>

                        {isAddingProduct && (
                            <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 mb-8 animate-in slide-in-from-top-4 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
                                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                    <h3 className="text-lg font-bold text-gray-800">
                                        {currentProduct.id ? 'Editar Produto' : 'Cadastrar Novo Item'}
                                    </h3>
                                    <button onClick={() => setIsAddingProduct(false)} className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-gray-50 transform active:scale-90">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700">Nome do Item</label>
                                            <input 
                                                type="text" 
                                                className="w-full mt-1 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 p-3 bg-gray-50 transition-all"
                                                style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
                                                value={currentProduct.name || ''}
                                                onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-semibold text-gray-700">Preço (R$)</label>
                                                <input 
                                                    type="number" step="0.01"
                                                    className="w-full mt-1 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 p-3 bg-gray-50 transition-all"
                                                style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
                                                    value={currentProduct.price || ''}
                                                    onChange={e => setCurrentProduct({...currentProduct, price: parseFloat(e.target.value)})}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-semibold text-gray-700">Estoque</label>
                                                <input 
                                                    type="number"
                                                    className="w-full mt-1 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 p-3 bg-gray-50 transition-all"
                                                style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
                                                    value={currentProduct.stock || ''}
                                                    onChange={e => setCurrentProduct({...currentProduct, stock: parseInt(e.target.value)})}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">Grupo</label>
                                            <select 
                                                className="w-full mt-1 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 p-3 bg-gray-50 transition-all"
                                                style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
                                                value={currentProduct.group_id || ''}
                                                onChange={e => setCurrentProduct({...currentProduct, group_id: e.target.value})}
                                            >
                                                <option value="">Selecione um grupo...</option>
                                                {groups.map(group => (
                                                    <option key={group.id} value={group.id}>{group.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700">Imagem do Produto</label>
                                            <div className="mt-1 flex items-center space-x-4">
                                                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200 shadow-lg">
                                                    {localImagePreview || currentProduct.image_url ? (
                                                        <img 
                                                            src={localImagePreview || currentProduct.image_url} 
                                                            alt="Preview" 
                                                            className="w-full h-full object-cover" 
                                                        />
                                                    ) : (
                                                        <span className="text-gray-400 text-xs text-center p-2">Sem Imagem</span>
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        onChange={handleProductImageFileChange} 
                                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">O arquivo local é apenas para pré-visualização e não persistirá após recarregar a página. Para salvar a imagem permanentemente, você precisa fornecer uma URL pública.</p>
                                        </div>
                                        <div className="relative">
                                            <label className="text-sm font-semibold text-gray-700">Descrição</label>
                                            <textarea 
                                                className="w-full mt-1 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 p-3 bg-gray-50 h-32 resize-none transition-all"
                                                style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
                                                value={currentProduct.description || ''}
                                                onChange={e => setCurrentProduct({...currentProduct, description: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end gap-3">
                                    <button onClick={() => { setIsAddingProduct(false); setCurrentProduct({}); setLocalImagePreview(null); }} className="px-6 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transform active:scale-95 transition-all">Cancelar</button>
                                    <button onClick={handleSaveProduct} className="text-white px-8 py-2.5 rounded-lg font-bold hover:bg-blue-700 shadow-xl transition-all transform active:scale-95 relative overflow-hidden"
                                        style={{ backgroundColor: storeProfile.secondaryColor }}
                                    >
                                        Salvar Alterações
                                        <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
                                    </button>
                                </div>
                            </div>
                        )}

                        <h3 className="text-xl font-bold text-gray-800 mb-4">
                            Produtos - ({
                                selectedGroupId === 'all' 
                                    ? 'Todos' 
                                    : groups.find(g => g.id === selectedGroupId)?.name || 'Grupo Desconhecido'
                            })
                        </h3>
                        
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="text" 
                                placeholder="Buscar produtos..."
                                className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#9f1239]/20 shadow-md transition-all"
                                style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
                                value={productSearchTerm}
                                onChange={e => setProductSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="space-y-6">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleProductDragEnd}
                            >
                                <SortableContext
                                    items={filteredProducts.map(p => p.id!)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {filteredProducts.map((product) => (
                                        <SortableProductItem
                                            key={product.id}
                                            product={product}
                                            groups={groups}
                                            storeProfile={storeProfile}
                                            showOptionsForProduct={showOptionsForProduct}
                                            setShowOptionsForProduct={setShowOptionsForProduct}
                                            onEditProduct={(p) => { setIsAddingProduct(true); setCurrentProduct(p); }}
                                            onDeleteProduct={handleDeleteProduct}
                                            onAddOption={handleAddOption}
                                            onOptionChange={handleOptionChange}
                                            onSubProductChange={handleSubProductChange}
                                            onAddSubProductClick={handleAddSubProductClick}
                                            onToggleOptionActive={handleToggleOptionOrFilteredSubProductsActive}
                                            onToggleSubProductActive={handleToggleSubProductActive}
                                            onDeleteOption={handleDeleteOption}
                                            onDeleteSubProduct={handleDeleteSubProduct}
                                            addingSubProductForOption={currentProductAndOptionForSubProduct}
                                            onAddSubProductConfirm={handleAddSubProductConfirm}
                                            onOptionDragEnd={handleOptionDragEnd}
                                            onSubProductDragEnd={handleSubProductDragEnd}
                                            onOpenCopyOptionModal={handleOpenCopyOptionModal}
                                            onToggleProductFeatured={handleToggleProductFeatured}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'order-manager' && (
                <div className="space-y-6">
                    <h2 className="2xl font-bold text-gray-800 flex items-center gap-2">
                         <ShoppingBag className="drop-shadow-sm" style={{ color: storeProfile.primaryColor }} />
                         Gerenciador de Pedidos
                    </h2>

                    <div className="flex flex-wrap gap-3 mb-6">
                        <button
                            onClick={() => setOrderStatusFilter('all')}
                            className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors transform active:scale-95 shadow-md
                                ${orderStatusFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            Todos os Pedidos
                        </button>
                        <button
                            onClick={() => setOrderStatusFilter('pending')}
                            className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors transform active:scale-95 shadow-md
                                ${orderStatusFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
                        >
                            Pendentes
                        </button>
                        <button
                            onClick={() => setOrderStatusFilter('preparing')}
                            className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors transform active:scale-95 shadow-md
                                ${orderStatusFilter === 'preparing' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                        >
                            Aceitos / Preparando
                        </button>
                        <button
                            onClick={() => setOrderStatusFilter('in_transit')}
                            className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors transform active:scale-95 shadow-md
                                ${orderStatusFilter === 'in_transit' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                        >
                            Em Rota
                        </button>
                        <button
                            onClick={() => setOrderStatusFilter('delivered')}
                            className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors transform active:scale-95 shadow-md
                                ${orderStatusFilter === 'delivered' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                        >
                            Finalizados
                        </button>
                        <button
                            onClick={() => setOrderStatusFilter('rejected')}
                            className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors transform active:scale-95 shadow-md
                                ${orderStatusFilter === 'rejected' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                        >
                            Rejeitados
                        </button>
                        <button
                            onClick={() => setOrderStatusFilter('trashed')}
                            className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors transform active:scale-95 shadow-md
                                ${orderStatusFilter === 'trashed' ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-800 hover:bg-gray-400'}`}
                        >
                            <Trash2 className="w-4 h-4 inline-block mr-2" /> Lixeira
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {filteredOrders.length === 0 ? (
                            <div className="text-center text-gray-500 p-8 bg-white rounded-xl shadow-xl border border-gray-100">
                                Nenhum pedido encontrado para esta categoria.
                            </div>
                        ) : (
                            filteredOrders.map(order => {
                                const nextStatus = getNextStatus(order.status);
                                return (
                                    <div 
                                        key={order.id} 
                                        className="bg-white p-6 rounded-xl border border-gray-100 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 transform hover:scale-[1.01] hover:shadow-2xl transition-all duration-200 relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
                                        <div className="flex items-center gap-4 cursor-pointer" onClick={() => handleOpenOrderDetails(order)}>
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shadow-lg 
                                                ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 
                                                  order.status === 'preparing' ? 'bg-blue-100 text-blue-600' :
                                                  order.status === 'in_transit' ? 'bg-purple-100 text-purple-600' :
                                                  order.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                                  order.status === 'trashed' ? 'bg-gray-200 text-gray-600' : // Cor para lixeira
                                                  'bg-green-100 text-green-600'}`}>
                                                {order.customerName[0]}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">{order.customerName}</h4>
                                                <p className="text-sm text-gray-500">#{order.id?.substring(0, 8)} • {new Date(order.date).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-3">
                                            <span className="font-bold text-lg text-gray-800">R$ {order.total.toFixed(2)}</span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase shadow-md 
                                                ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                                                 order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                                                 order.status === 'in_transit' ? 'bg-purple-100 text-purple-700' :
                                                 order.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                 order.status === 'trashed' ? 'bg-gray-200 text-gray-600' : // Texto para lixeira
                                                 'bg-green-100 text-green-700'}`}>
                                                {order.status === 'pending' ? 'Pendente' : 
                                                 order.status === 'preparing' ? 'Preparando' :
                                                 order.status === 'in_transit' ? 'Em Rota' :
                                                 order.status === 'rejected' ? 'Rejeitado' :
                                                 order.status === 'trashed' ? 'Lixeira' : // Texto para lixeira
                                                 'Entregue'}
                                            </span>
                                            {order.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUpdateOrderStatus(order.id, 'rejected');
                                                        }}
                                                        className="p-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors transform active:scale-95"
                                                        title="Recusar Pedido"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUpdateOrderStatus(order.id, 'preparing');
                                                        }}
                                                        className="p-2 bg-green-500 text-white rounded-full shadow-md hover:bg-green-600 transition-colors transform active:scale-95"
                                                        title="Aceitar Pedido"
                                                    >
                                                        <CheckCircle className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                            {nextStatus && order.status !== 'pending' && order.status !== 'trashed' && order.status !== 'rejected' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUpdateOrderStatus(order.id, nextStatus);
                                                    }}
                                                    className="p-2 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition-colors transform active:scale-95"
                                                    title={`Avançar para ${nextStatus}`}
                                                >
                                                    <ArrowRight className="w-5 h-5" />
                                                </button>
                                            )}
                                            {order.status !== 'trashed' ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteOrder(order.id); // Move para a lixeira
                                                    }}
                                                    className="p-2 bg-gray-300 text-gray-700 rounded-full shadow-md hover:bg-gray-400 transition-colors transform active:scale-95"
                                                    title="Mover para a Lixeira"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleConfirmPermanentDeleteOrder(order.id); // Abre o modal de confirmação de senha
                                                    }}
                                                    className="p-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors transform active:scale-95"
                                                    title="Excluir Permanentemente"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'table-manager' && (
                <TableManagerPage storeProfile={storeProfile} />
            )}

            {activeTab === 'counter-manager' && (
                <CounterManagerPage storeProfile={storeProfile} />
            )}
            
            {activeTab === 'store-settings' && (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">Configurações da Loja</h2>
                     <div className="space-y-6">
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Nome da Loja</label>
                          <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 focus:border-[#9f1239] transition-all"
                            style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
                            value={storeProfile.name}
                            onChange={(e) => setStoreProfile({...storeProfile, name: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Descrição</label>
                          <textarea 
                            className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 h-20 resize-none shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 focus:border-[#9f1239] transition-all"
                            style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
                            value={storeProfile.description}
                            onChange={(e) => setStoreProfile({...storeProfile, description: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Endereço (Vitrine)</label>
                            <input 
                                type="text" 
                                className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 focus:border-[#9f1239] transition-all"
                                style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
                                value={storeProfile.address || ''}
                                onChange={(e) => setStoreProfile({...storeProfile, address: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Telefone</label>
                            <input 
                                type="text" 
                                className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 focus:border-[#9f1239] transition-all"
                                style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
                                value={storeProfile.phone || ''}
                                onChange={(e) => setStoreProfile({...storeProfile, phone: e.target.value})}
                            />
                          </div>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Logo da Loja</label>
                          <div className="mt-1 flex items-center space-x-4">
                              <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200 shadow-lg">
                                  {logoPreview ? (
                                      <img 
                                          src={logoPreview} 
                                          alt="Logo Preview" 
                                          className="w-full h-full object-contain" 
                                      />
                                  ) : (
                                      <UploadCloud className="w-8 h-8 text-gray-400" />
                                  )}
                              </div>
                              <div className="flex-1 space-y-2">
                                  <input 
                                      type="file" 
                                      accept="image/*" 
                                      onChange={handleLogoFileChange} 
                                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                                  />
                              </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Faça upload da imagem do logo da sua loja. Será exibido na vitrine e no painel.</p>
                      </div>

                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Capa da Loja (Banner)</label>
                          <div className="mt-1 flex items-center space-x-4">
                              <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200 shadow-lg">
                                  {coverPreview ? (
                                      <img 
                                          src={coverPreview} 
                                          alt="Cover Preview" 
                                          className="w-full h-full object-cover" 
                                      />
                                  ) : (
                                      <UploadCloud className="w-8 h-8 text-gray-400" />
                                  )}
                              </div>
                              <div className="flex-1 space-y-2 hidden"></div>
                          </div>
                          <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleCoverFileChange} 
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors mt-2"
                          />
                          <p className="text-xs text-gray-500 mt-2">Faça upload de uma imagem para o banner da sua loja. Será exibido no topo da vitrine.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Cor da Marca (Principal)</label>
                              <div className="flex items-center gap-4">
                                <input 
                                    type="color" 
                                    className="h-10 w-20 rounded cursor-pointer border-0 p-0 shadow-md"
                                    value={storeProfile.primaryColor}
                                    onChange={(e) => setStoreProfile({...storeProfile, primaryColor: e.target.value})}
                                />
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Cor do Menu / Botões (Secundária)</label>
                              <div className="flex items-center gap-4">
                                <input 
                                    type="color" 
                                    className="h-10 w-20 rounded cursor-pointer border-0 p-0 shadow-md"
                                    value={storeProfile.secondaryColor || '#2d1a1a'}
                                    onChange={(e) => setStoreProfile({...storeProfile, secondaryColor: e.target.value})}
                                />
                              </div>
                          </div>
                      </div>
                      <div className="pt-6 flex justify-end">
                        <button 
                            onClick={handleSaveStoreProfile}
                            className="text-white px-8 py-3 rounded-lg hover:bg-[#881337] font-bold shadow-xl transform active:scale-95 relative overflow-hidden"
                            style={{ backgroundColor: storeProfile.secondaryColor }}
                            disabled={isUploadingImages}
                        >
                            {isUploadingImages ? 'Salvando...' : 'Salvar Configurações'}
                            <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
                        </button>
                      </div>
                  </div>
                </div>
            )}

            {activeTab === 'schedule' && (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">Horário de Funcionamento</h2>
                    <p className="text-gray-600 mb-6">Defina os horários de abertura e fechamento da sua loja para cada dia da semana.</p>
                    
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-3 shadow-inner">
                        <input 
                            type="checkbox" 
                            id="alwaysOpen" 
                            className="form-checkbox h-5 w-5 rounded focus:ring-[#9f1239] shadow-sm"
                            style={{ color: storeProfile.primaryColor }}
                            checked={storeSchedule.isAlwaysOpen}
                            onChange={(e) => setStoreSchedule(prev => ({ ...prev, isAlwaysOpen: e.target.checked }))}
                        />
                        <label htmlFor="alwaysOpen" className="text-base font-semibold text-gray-800">
                            Sempre Aberto
                        </label>
                    </div>

                    <div className="space-y-4">
                        {storeSchedule.dailySchedules.map((daySchedule, index) => (
                            <div key={daySchedule.day} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100 shadow-md transform hover:translate-y-[-2px] hover:shadow-lg transition-all duration-200">
                                <span className="font-medium text-gray-700 w-32">{daySchedule.day}</span>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="time" 
                                        className="border border-gray-300 rounded-lg p-2 text-sm bg-white shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 focus:border-[#9f1239] transition-all"
                                        style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
                                        value={daySchedule.openTime}
                                        onChange={(e) => handleScheduleChange(index, 'openTime', e.target.value)}
                                        disabled={storeSchedule.isAlwaysOpen || !daySchedule.isOpen}
                                    />
                                    <span className="text-gray-500">-</span>
                                    <input 
                                        type="time" 
                                        className="border border-gray-300 rounded-lg p-2 text-sm bg-white shadow-sm focus:ring-2 focus:ring-[#9f1239]/20 focus:border-[#9f1239] transition-all"
                                        style={{ borderColor: storeProfile.primaryColor, '--tw-ring-color': `${storeProfile.primaryColor}20` } as React.CSSProperties}
                                        value={daySchedule.closeTime}
                                        onChange={(e) => handleScheduleChange(index, 'closeTime', e.target.value)}
                                        disabled={storeSchedule.isAlwaysOpen || !daySchedule.isOpen}
                                    />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="form-checkbox h-4 w-4 rounded shadow-sm" 
                                        style={{ color: storeProfile.primaryColor }}
                                        checked={!daySchedule.isOpen}
                                        onChange={(e) => handleScheduleChange(index, 'isOpen', !e.target.checked)}
                                        disabled={storeSchedule.isAlwaysOpen}
                                    />
                                    Fechado
                                </label>
                            </div>
                        ))}
                    </div>
                    <div className="pt-6 flex justify-end">
                        <button 
                            onClick={handleSaveSchedule}
                            className="text-white px-8 py-3 rounded-lg hover:bg-[#881337] font-bold shadow-xl transform active:scale-95 relative overflow-hidden"
                            style={{ backgroundColor: storeProfile.secondaryColor }}
                        >
                            Salvar Horários
                            <span className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'profile-settings' && (
                <ProfileSettingsPage onProfileUpdate={handleProfileUpdate} />
            )}

            {activeTab === 'reports' && (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">Relatórios</h2>
                    <p className="text-gray-600 mb-4">Esta é a página de relatórios. Aqui você poderá visualizar dados importantes sobre suas vendas, produtos e clientes.</p>
                    <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg text-yellow-700 text-sm">
                        <p>Funcionalidade de relatórios em desenvolvimento. Em breve, gráficos e análises detalhadas!</p>
                    </div>
                </div>
            )}

            {activeTab === 'clients' && (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">Gerenciar Clientes</h2>
                    <p className="text-gray-600 mb-4">Aqui você poderá visualizar e gerenciar seus clientes.</p>
                    <div className="bg-green-50 border border-green-100 p-4 rounded-lg text-green-700 text-sm">
                        <p>Funcionalidade de clientes em desenvolvimento.</p>
                    </div>
                </div>
            )}

            {activeTab === 'staff' && (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">Gerenciar Funcionários</h2>
                    <p className="text-gray-600 mb-4">Aqui você poderá adicionar e gerenciar os funcionários da sua loja.</p>
                    <div className="bg-purple-50 border border-purple-100 p-4 rounded-lg text-purple-700 text-sm">
                        <p>Funcionalidade de funcionários em desenvolvimento.</p>
                    </div>
                </div>
            )}
        </main>
      </div>

      <Modal
        open={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
      >
        <h2 className="text-lg font-semibold mb-4 text-gray-900">
          Fechar loja por quanto tempo?
        </h2>

        <div className="space-y-2">
          <button 
            onClick={() => handleSetTemporaryCloseDuration(10)} 
            className="flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors font-medium group text-gray-700"
          >
            <Clock className="w-4 h-4 text-gray-400 group-hover:text-[#9f1239]" /> 10 minutos
          </button>
          <button 
            onClick={() => handleSetTemporaryCloseDuration(20)} 
            className="flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors font-medium group text-gray-700"
          >
            <Clock className="w-4 h-4 text-gray-400 group-hover:text-[#9f1239]" /> 20 minutos
          </button>
          <button 
            onClick={() => handleSetTemporaryCloseDuration(30)} 
            className="flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors font-medium group text-gray-700"
          >
            <Clock className="w-4 h-4 text-gray-400 group-hover:text-[#9f1239]" /> 30 minutos
          </button>
          <button 
            onClick={() => handleSetTemporaryCloseDuration(60)} 
            className="flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors font-medium group text-gray-700"
          >
            <Clock className="w-4 h-4 text-gray-400 group-hover:text-[#9f1239]" /> 1 hora
          </button>
          <div className="border-t border-gray-100 my-1"></div>
          <button 
            onClick={() => handleSetTemporaryCloseDuration(-1)} 
            className="flex items-center gap-3 w-full text-left px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors font-medium group text-gray-700"
          >
            <Infinity className="w-4 h-4 text-gray-400 group-hover:text-[#9f1239]" /> Indefinido
          </button>
        </div>
      </Modal>

      <Modal
        open={isToggleConfirmationModalOpen}
        onClose={() => {
          setIsToggleConfirmationModalOpen(false);
          setPendingToggleAction(null);
        }}
      >
        <h2 className="text-lg font-semibold mb-4 text-gray-900">
          {pendingToggleAction?.targetActiveState ? 'Ativar Sabores' : 'Desativar Sabores'}
        </h2>
        <p className="text-gray-600 mb-6">
          Você está {pendingToggleAction?.targetActiveState ? 'ativando' : 'desativando'} sabores com o termo "{pendingToggleAction?.searchTerm}".
          Deseja aplicar esta ação a:
        </p>

        <div className="space-y-3">
          <button
            onClick={confirmToggleAllSubProducts}
            className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium group"
          >
            Todos os itens da opção
          </button>
          <button
            onClick={confirmToggleFilteredSubProducts}
            className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-medium group"
          >
            <Search className="w-5 h-5 text-white group-hover:text-gray-900" />
            Somente os nomes filtrados
          </button>
        </div>
      </Modal>

      {currentProductAndOptionForSubProduct && (
        <AddSubProductModal
          isOpen={isAddSubProductModalOpen}
          onClose={() => setIsAddSubProductModalOpen(false)}
          onSave={handleAddSubProductConfirm}
          storeProfile={storeProfile}
        />
      )}

      {optionToCopy && (
        <CopyOptionModal
          isOpen={isCopyOptionModalOpen}
          onClose={handleCloseCopyOptionModal}
          onCopy={handleCopyOption}
          allProducts={products.filter(p => p.id !== undefined)} 
          sourceProductId={optionToCopy.productId}
          sourceOptionId={optionToCopy.optionId}
          sourceOptionTitle={optionToCopy.optionTitle}
          storeProfile={storeProfile}
        />
      )}

      {selectedOrder && (
        <OrderDetailsModal
          isOpen={isOrderDetailsModalOpen}
          onClose={handleCloseOrderDetails}
          order={selectedOrder}
          storePrimaryColor={storeProfile.primaryColor}
          allProducts={products}
          onUpdateOrderStatus={handleUpdateOrderStatus}
        />
      )}

      {isAdminPasswordConfirmModalOpen && (
        <AdminPasswordConfirmModal
          isOpen={isAdminPasswordConfirmModalOpen} 
          onClose={() => {
            setIsAdminPasswordConfirmModalOpen(false);
            setOrderToDeletePermanently(null);
          }}
          onConfirm={handlePermanentlyDeleteOrderWithPassword}
          title="Confirmar Exclusão Permanente"
          description={`Você está prestes a excluir permanentemente o pedido #${orderToDeletePermanently?.substring(0, 8)}. Esta ação é irreversível.`}
        />
      )}
    </div>
  );
};
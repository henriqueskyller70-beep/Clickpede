import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, ShoppingBag, Settings, Plus, 
  Trash2, Edit, LogOut, Store, Users, FileText, ChevronDown, Menu, Clock,
  GripVertical, Search, X, Copy, Star, Infinity, User as UserIcon // Renomear User para evitar conflito, adicionar Infinity
} from 'lucide-react';
import { Product, Category, StoreProfile, Order, StoreSchedule, DailySchedule, Group, Option, SubProduct } from '../types';
import { storageService } from '../services/storageService';
import { useSession } from '../src/components/SessionContextProvider'; // Importar o hook de sessão
import { showSuccess, showError } from '../src/utils/toast'; // Importar utilitários de toast
import { ProfileSettingsPage } from '../src/components/ProfileSettingsPage'; // Importar ProfileSettingsPage
import { debounce } from '../src/utils/debounce'; // Import the debounce utility
import { Modal } from '../src/components/ui/Modal'; // Importar o novo componente Modal
import { AddSubProductModal } from '../src/components/AddSubProductModal'; // Importar o novo modal de sub-produto
import { CopyOptionModal } from '../src/components/CopyOptionModal'; // Importar o novo modal de cópia

// DND Kit Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay, // Importar DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { SortableGroupItem } from '../src/components/SortableGroupItem'; // Import the new SortableGroupItem
import { SortableProductItem } from '../src/components/SortableProductItem'; // Import the new SortableProductItem

interface DashboardProps {
    onLogout: () => void;
    onNavigate: (path: string) => void; // Adicionar prop para navegação
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout, onNavigate }) => {
  const { supabase, session } = useSession(); // Obter supabase e session do contexto
  const userId = session?.user?.id;

  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'store-settings' | 'schedule' | 'clients' | 'staff' | 'reports' | 'profile-settings'>('overview'); // Default to overview tab
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [storeProfile, setStoreProfile] = useState<StoreProfile>({ name: '', description: '', primaryColor: '#9f1239', secondaryColor: '#2d1a1a', logoUrl: '', coverUrl: '', address: '', phone: '' }); // Estado inicial vazio
  const [isStoreTemporariamenteClosed, setIsStoreTemporariamenteClosed] = useState(false); // Novo estado para fechamento temporário (seja por tempo ou indefinido)
  const [reopenCountdown, setReopenCountdown] = useState<string | null>(null); // Estado para o contador de reabertura
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false); // Renomeado de showTemporaryCloseOptions
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isStoreSubmenuOpen, setIsStoreSubmenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false); // Novo estado para o dropdown do perfil
  const [userProfile, setUserProfile] = useState<{ first_name: string; last_name: string; avatar_url: string | null } | null>(null); // Estado para o perfil do usuário
  
  // Estado para o horário de funcionamento
  const [storeSchedule, setStoreSchedule] = useState<StoreSchedule>({
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
  }); // Estado inicial padrão
  
  // Product/Group Management States
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | 'all'>('all'); // 'all' para todos os produtos
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showOptionsForProduct, setShowOptionsForProduct] = useState<string | null>(null); // ID do produto para mostrar opções
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setNewGroupNameEditing] = useState(''); // Renomeado para evitar conflito
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(null); // Para pré-visualização de imagem local

  // Estados para o novo modal de adicionar sub-produto
  const [isAddSubProductModalOpen, setIsAddSubProductModalOpen] = useState(false);
  const [currentProductAndOptionForSubProduct, setCurrentProductAndOptionForSubProduct] = useState<{ productId: string; optionId: string } | null>(null);

  // Estados para upload de imagens da loja
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  // Estados para o modal de confirmação de toggle de sub-produtos
  const [isToggleConfirmationModalOpen, setIsToggleConfirmationModalOpen] = useState(false);
  const [pendingToggleAction, setPendingToggleAction] = useState<{ productId: string; optionId: string; searchTerm: string; targetActiveState: boolean } | null>(null);

  // NOVO: Estado para a opção a ser rolada
  const [optionToScrollToId, setOptionToScrollToId] = useState<string | null>(null);

  // NOVO: Estados para o modal de cópia de opção
  const [isCopyOptionModalOpen, setIsCopyOptionModalOpen] = useState(false);
  const [optionToCopy, setOptionToCopy] = useState<{ productId: string; optionId: string; optionTitle: string } | null>(null);

  // NOVO: Estado para o grupo ativo sendo arrastado (para DragOverlay)
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);


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
          setProducts(savedProducts); // Update state with the fresh list from DB
        }
      }
    }, 1000), // 1 second debounce delay
    [supabase] // Dependency array for useCallback
  );

  // Memoize the debounced saveGroups function
  const debouncedSaveGroups = React.useCallback(
    debounce(async (groupsToSave: Group[], currentUserId: string) => {
      if (currentUserId) {
        const savedGroups = await storageService.saveGroups(supabase, currentUserId, groupsToSave);
        if (savedGroups) {
          setGroups(savedGroups as Group[]); // Update state with the fresh list from DB
        }
      }
    }, 1000), // 1 second debounce delay
    [supabase] // Dependency array for useCallback
  );

  // Carregar dados do Supabase ao montar o componente ou quando o userId mudar
  useEffect(() => {
    const loadData = async () => {
      if (userId) {
        setProducts(await storageService.getProducts(supabase, userId));
        setOrders(await storageService.getOrders(supabase, userId));
        const fetchedSchedule = await storageService.getStoreSchedule(supabase, userId);
        setStoreSchedule(fetchedSchedule);
        
        // Define o estado de fechamento temporário com base em reopenAt ou isTemporariamenteClosedIndefinidamente
        const isClosedByTimer = !!fetchedSchedule.reopenAt && new Date(fetchedSchedule.reopenAt) > new Date();
        setIsStoreTemporariamenteClosed(isClosedByTimer || !!fetchedSchedule.isTemporariamenteClosedIndefinidamente);

        const profile = await storageService.getStoreProfile(supabase, userId);
        setStoreProfile(profile);
        setLogoPreview(profile.logoUrl); // Define a pré-visualização inicial com a URL existente
        setCoverPreview(profile.coverUrl); // Define a pré-visualização inicial com a URL existente
        setGroups(await storageService.getGroups(supabase, userId));
        
        // Carregar perfil do usuário
        const userProf = await storageService.getProfile(supabase, userId);
        setUserProfile(userProf);

        console.log('[Dashboard] Perfil da loja carregado. Logo URL:', profile.logoUrl, 'Cover URL:', profile.coverUrl);
      } else {
        // Limpar estados se não houver userId (ex: logout)
        setProducts([]);
        setOrders([]);
        setStoreSchedule({
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
          reopenAt: null,
          isTemporariamenteClosedIndefinidamente: false,
        });
        setIsStoreTemporariamenteClosed(false);
        setStoreProfile({ name: '', description: '', primaryColor: '#9f1239', secondaryColor: '#2d1a1a', logoUrl: '', coverUrl: '', address: '', phone: '' });
        setLogoPreview(null);
        setCoverPreview(null);
        setGroups([]);
        setUserProfile(null);
        console.log('[Dashboard] Usuário deslogado, estados limpos.');
      }
    };
    loadData();
  }, [userId, supabase]);

  // Efeito para gerenciar o contador de reabertura
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined; // Removida a anotação de tipo NodeJS.Timeout
    if (isStoreTemporariamenteClosed && storeSchedule.reopenAt) {
      timer = setInterval(() => {
        const now = new Date();
        const reopenTime = new Date(storeSchedule.reopenAt!);
        const diff = reopenTime.getTime() - now.getTime();

        if (diff <= 0) {
          setIsStoreTemporariamenteClosed(false);
          setReopenCountdown(null);
          // Limpa o reopenAt e isTemporariamenteClosedIndefinidamente no banco de dados quando o tempo expira
          if (userId) {
            storageService.saveStoreSchedule(supabase, userId, { ...storeSchedule, reopenAt: null, isTemporariamenteClosedIndefinidamente: false });
          }
          showSuccess("A loja foi reaberta automaticamente!");
          clearInterval(timer);
        } else {
          const minutes = Math.floor(diff / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setReopenCountdown(`${minutes}m ${seconds}s`);
        }
      }, 1000);
    } else if (isStoreTemporariamenteClosed && storeSchedule.isTemporariamenteClosedIndefinidamente) {
        setReopenCountdown("Indefinidamente"); // Exibe "Indefinidamente" se fechado sem tempo
    } else {
      setReopenCountdown(null);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isStoreTemporariamenteClosed, storeSchedule, userId, supabase]); // Array de dependências simplificado


  // Reset local image preview when opening/closing product form
  useEffect(() => {
    if (isAddingProduct) {
      setLocalImagePreview(currentProduct.image_url || null);
    } else {
      setLocalImagePreview(null);
    }
  }, [isAddingProduct, currentProduct.image_url]);

  // NOVO: Efeito para rolar até a nova opção criada
  useEffect(() => {
    if (optionToScrollToId) {
      const element = document.getElementById(`option-${optionToScrollToId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'end' });
        setOptionToScrollToId(null); // Limpa o estado após rolar
      }
    }
  }, [optionToScrollToId]);

  // Group Management
  const handleAddGroup = async () => {
    if (newGroupName.trim() && userId) {
      // Assign a temporary order_index for local state, it will be updated on save
      const newGroup: Group = { name: newGroupName.trim(), order_index: groups.length }; 
      const updatedGroups = [...groups, newGroup]; // Adiciona o grupo sem ID para a lista local temporariamente

      // Chama saveGroups, que fará o upsert e retornará os IDs reais do DB
      const savedGroups = await storageService.saveGroups(supabase, userId, updatedGroups);
      if (savedGroups) {
        setGroups(savedGroups as Group[]); // Atualiza o estado com os IDs gerados pelo DB
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
      setGroups(updatedGroups); // Atualiza a UI imediatamente
      
      // Chama saveGroups, que fará o upsert
      const savedGroups = await storageService.saveGroups(supabase, userId, updatedGroups);
      if (savedGroups) {
        setGroups(savedGroups as Group[]); // Atualiza o estado com os IDs do DB
      }
      setEditingGroupId(null);
      setNewGroupNameEditing('');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este grupo? Todos os produtos associados a ele ficarão sem grupo.") && userId) {
      const updatedGroups = groups.filter(g => g.id !== groupId);
      // Re-index the remaining groups
      const reindexedGroups = updatedGroups.map((g, index) => ({ ...g, order_index: index }));
      setGroups(reindexedGroups); // Atualiza a UI imediatamente
      
      // Chama saveGroups, que fará a exclusão e atualização dos order_index
      const savedGroups = await storageService.saveGroups(supabase, userId, reindexedGroups);
      if (savedGroups) {
        setGroups(savedGroups as Group[]); // Atualiza o estado
      }
      // Optionally, update products that were in this group
      const updatedProducts = products.map(p => p.group_id === groupId ? { ...p, group_id: '' } : p);
      setProducts(updatedProducts);
      await storageService.saveProducts(supabase, userId, updatedProducts);
      if (selectedGroupId === groupId) {
        setSelectedGroupId('all');
      }
    }
  };

  // DND Kit - handleDragEnd function for Groups
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && userId) {
      const oldIndex = groups.findIndex((item) => item.id === active.id);
      const newIndex = groups.findIndex((item) => item.id === over?.id);
      
      if (oldIndex === -1 || newIndex === -1) return; // Should not happen, but for safety

      const newOrderedGroups = arrayMove(groups, oldIndex, newIndex);
      
      // Update order_index for all groups in the new order
      const reindexedGroups = newOrderedGroups.map((group, index) => ({
        ...group,
        order_index: index,
      }));

      setGroups(reindexedGroups); // Update UI immediately

      // Save the new order to the database, awaiting the promise
      await storageService.saveGroups(supabase, userId, reindexedGroups);
    }
    setActiveGroup(null); // Limpar o grupo ativo após o arrasto
  };

  // DND Kit - handleDragStart function for Groups
  const handleDragStart = (event: any) => {
    const group = groups.find(g => g.id === event.active.id);
    if (group) {
      setActiveGroup(group);
    }
  };

  // DND Kit - handleDragCancel function for Groups
  const handleDragCancel = () => {
    setActiveGroup(null);
  };

  // DND Kit - handleDragEnd function for Products
  const handleProductDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && userId) {
      const oldIndex = filteredProducts.findIndex((item) => item.id === active.id);
      const newIndex = filteredProducts.findIndex((item) => item.id === over?.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newOrderedFilteredProducts = arrayMove(filteredProducts, oldIndex, newIndex);

      // Create a map of the new order_index for the filtered products
      const reindexedFilteredProductsMap = new Map<string, number>();
      newOrderedFilteredProducts.forEach((product, index) => {
        reindexedFilteredProductsMap.set(product.id!, index);
      });

      // Update the main products state based on the reordered filtered products
      const updatedAllProducts = products
        .map(p => {
          if (reindexedFilteredProductsMap.has(p.id!)) {
            // If this product was part of the filtered and reordered list, update its order_index
            return { ...p, order_index: reindexedFilteredProductsMap.get(p.id!)! };
          }
          return p; // Otherwise, keep its existing order_index
        })
        .sort((a, b) => a.order_index - b.order_index); // Sort the entire list by the new order_index

      setProducts(updatedAllProducts); // Update UI immediately with the correctly reindexed full list

      // Now, save the entire updated list to the database.
      // The storageService.saveProducts function already handles upserting and deleting.
      // It will correctly update the order_index for all products.
      await storageService.saveProducts(supabase, userId, updatedAllProducts);
    }
  };

  // DND Kit - handleDragEnd function for Options (nested within a product)
  const handleOptionDragEnd = async (productId: string, event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && userId) {
      setProducts(prevProducts => {
        const updatedProducts = prevProducts.map(product => {
          if (product.id === productId) {
            const oldIndex = product.options.findIndex(option => option.id === active.id);
            const newIndex = product.options.findIndex(option => option.id === over?.id);

            if (oldIndex === -1 || newIndex === -1) return product; // Safety check

            const newOrderedOptions = arrayMove(product.options, oldIndex, newIndex);
            return { ...product, options: newOrderedOptions };
          }
          return product;
        });
        // Debounced save to DB
        debouncedSaveProducts(updatedProducts, userId);
        return updatedProducts;
      });
    }
  };

  // DND Kit - handleDragEnd function for SubProducts (nested within an option)
  const handleSubProductDragEnd = async (productId: string, optionId: string, event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && userId) {
      setProducts(prevProducts => {
        const updatedProducts = prevProducts.map(product => {
          if (product.id === productId) {
            return {
              ...product,
              options: product.options.map(option => {
                if (option.id === optionId) {
                  const oldIndex = option.subProducts.findIndex(subProduct => subProduct.id === active.id);
                  const newIndex = option.subProducts.findIndex(subProduct => subProduct.id === over?.id);

                  if (oldIndex === -1 || newIndex === -1) return option; // Safety check

                  const newOrderedSubProducts = arrayMove(option.subProducts, oldIndex, newIndex);
                  return { ...option, subProducts: newOrderedSubProducts };
                }
                return option;
              }),
            };
          }
          return product;
        });
        // Debounced save to DB
        debouncedSaveProducts(updatedProducts, userId);
        return updatedProducts;
      });
    }
  };

  // Product Management
  const handleSaveProduct = async () => {
    if (!currentProduct.name || !currentProduct.price || !currentProduct.group_id) {
        alert("Por favor, preencha o nome, preço e selecione um grupo para o produto.");
        return;
    }
    if (!userId) return;

    let productsToUpdateState: Product[];
    const imageUrlToSave = localImagePreview || currentProduct.image_url || ''; // Priorize local preview

    if (currentProduct.id) {
      // Edit existing product
      productsToUpdateState = products.map(p => p.id === currentProduct.id ? { ...p, ...currentProduct, image_url: imageUrlToSave } as Product : p);
    } else {
      // Create new product - id will be undefined, Supabase will generate it
      const productToCreate: Product = {
        name: currentProduct.name,
        description: currentProduct.description || '', // Ensure description is a string
        price: currentProduct.price,
        category: currentProduct.category || Category.OTHER,
        image_url: imageUrlToSave,
        stock: currentProduct.stock || 0,
        group_id: currentProduct.group_id,
        options: currentProduct.options || [],
        order_index: products.length, // Assign a default order_index for new products
        id: undefined, // Explicitamente definido como undefined para que o Supabase gere o UUID
      };
      productsToUpdateState = [...products, productToCreate];
    }
    
    // Chama saveProducts e atualiza o estado com os dados retornados (que incluem IDs gerados pelo DB)
    const savedProducts = await storageService.saveProducts(supabase, userId, productsToUpdateState);
    if (savedProducts) {
      setProducts(savedProducts as Product[]); // Atualiza o estado com os produtos incluindo IDs gerados pelo DB
    }
    setIsAddingProduct(false);
    setCurrentProduct({});
    setLocalImagePreview(null); // Limpa a pré-visualização local
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
        // Note: This does not save the image to storage, only previews it.
        // For persistence, a public URL is needed.
      };
      reader.readAsDataURL(file);
    } else {
      setLocalImagePreview(currentProduct.image_url || null);
    }
  };

  // Option/SubProduct Management
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
    setProducts(updatedProducts); // Update UI immediately
    debouncedSaveProducts(updatedProducts, userId); // Debounced save to DB
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
    setProducts(updatedProducts); // Update UI immediately
    debouncedSaveProducts(updatedProducts, userId); // Debounced save to DB
  };

  const handleAddOption = async (productId: string) => {
    if (!userId) return;
    const newOption: Option = {
      id: Date.now().toString(), // IDs para opções e sub-produtos são internos ao JSONB, não UUIDs do DB
      title: 'Escolha seus Sabores', // Default title for flavors
      minSelection: 1, // Default to 1 selection
      maxSelection: 1, // Default to 1 selection
      allowRepeat: false,
      subProducts: [],
      isActive: true,
    };
    const updatedProducts = products.map(p => 
      p.id === productId ? { ...p, options: [...p.options, newOption] } : p
    );
    setProducts(updatedProducts);
    await storageService.saveProducts(supabase, userId, updatedProducts);
    setOptionToScrollToId(newOption.id); // Define o ID da nova opção para rolagem
  };

  const handleAddSubProductClick = (productId: string, optionId: string) => {
    setCurrentProductAndOptionForSubProduct({ productId, optionId });
    setIsAddSubProductModalOpen(true);
  };

  const handleAddSubProductConfirm = React.useCallback(async (newSubProductData: Omit<SubProduct, 'id' | 'isActive'>) => {
    if (currentProductAndOptionForSubProduct && userId) {
        const { productId, optionId } = currentProductAndOptionForSubProduct;
        const newSubProduct: SubProduct = {
            id: Date.now().toString(), // IDs para opções e sub-produtos são internos ao JSONB, não UUIDs do DB
            name: newSubProductData.name,
            description: newSubProductData.description, // Incluir descrição
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

  // NOVO: Função auxiliar para aplicar o toggle e salvar
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
                } else { // Aplicar a todos os sub-produtos e à própria opção
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
      // Chamar debouncedSaveProducts com o array de produtos totalmente atualizado
      if (userId) {
        debouncedSaveProducts(updatedProducts, userId);
      }
      return updatedProducts;
    });
  };

  // Função atualizada para toggle de opção ou sub-produtos filtrados
  const handleToggleOptionOrFilteredSubProductsActive = async (
    productId: string, 
    optionId: string, 
    searchTerm: string = '', 
    currentOption: Option, 
    filteredSubProducts: SubProduct[]
  ) => {
    if (!userId) return;

    // Determine the target active state based on context
    let targetActiveState: boolean;
    if (searchTerm) {
      // Se estiver buscando, o toggle deve ativar se algum item filtrado estiver inativo, caso contrário, desativar.
      targetActiveState = !filteredSubProducts.every(sp => sp.isActive);
    } else {
      // Se não estiver buscando, o toggle deve simplesmente inverter o estado ativo atual da opção.
      targetActiveState = !currentOption.isActive;
    }

    if (searchTerm) {
      // Se há um termo de busca, abrir o modal de confirmação
      setPendingToggleAction({ productId, optionId, searchTerm, targetActiveState });
      setIsToggleConfirmationModalOpen(true);
    } else {
      // Se não há termo de busca, aplicar diretamente a todos os sub-produtos e à opção
      updateProductOptionsAndSave(productId, optionId, targetActiveState, '', false); // Sem termo de busca, aplicar a todos
      showSuccess(`Todos os sabores foram ${targetActiveState ? 'ativados' : 'desativados'}!`);
    }
  };

  const confirmToggleAllSubProducts = async () => {
    if (!pendingToggleAction || !userId) return;
    const { productId, optionId, searchTerm, targetActiveState } = pendingToggleAction;

    updateProductOptionsAndSave(productId, optionId, targetActiveState, searchTerm, false); // Aplicar a todos
    setIsToggleConfirmationModalOpen(false);
    setPendingToggleAction(null);
    showSuccess(`Todos os itens da opção foram ${targetActiveState ? 'ativados' : 'desativados'}!`);
  };

  const confirmToggleFilteredSubProducts = async () => {
    if (!pendingToggleAction || !userId) return;
    const { productId, optionId, searchTerm, targetActiveState } = pendingToggleAction;

    updateProductOptionsAndSave(productId, optionId, targetActiveState, searchTerm, true); // Aplicar apenas aos filtrados
    setIsToggleConfirmationModalOpen(false);
    setPendingToggleAction(null);
    showSuccess(`Somente os nomes filtrados foram ${targetActiveState ? 'ativados' : 'desativados'}!`);
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
    showSuccess(`Sabor ${updatedProducts.find(p => p.id === productId)?.options.find(opt => opt.id === optionId)?.subProducts.find(sp => sp.id === subProductId)?.name} foi ${updatedProducts.find(p => p.id === productId)?.options.find(opt => opt.id === optionId)?.subProducts.find(sp => sp.id === subProductId)?.isActive ? 'ativado' : 'desativado'}!`);
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
    // Feedback agora é tratado dentro de storageService.saveStoreSchedule
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setLogoFile(file || null);
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
      console.log('[Dashboard] Nova logo selecionada para pré-visualização local.');
    } else {
      setLogoPreview(storeProfile.logoUrl); // Reverte para a URL existente se nenhum arquivo for selecionado
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
      setCoverPreview(storeProfile.coverUrl); // Reverte para a URL existente se nenhum arquivo for selecionado
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
      // Recarrega o perfil para garantir que as URLs atualizadas sejam refletidas
      const updatedProfile = await storageService.getStoreProfile(supabase, userId);
      setStoreProfile(updatedProfile);
      setLogoPreview(updatedProfile.logoUrl); // Atualiza a pré-visualização com a URL salva
      setCoverPreview(updatedProfile.coverUrl); // Atualiza a pré-visualização com a URL salva
      setLogoFile(null); // Limpa o arquivo selecionado após o upload
      setCoverFile(null); // Limpa o arquivo selecionado após o upload
      console.log('[Dashboard] Perfil da loja salvo e recarregado. Logo URL:', updatedProfile.logoUrl, 'Cover URL:', updatedProfile.coverUrl);
    } catch (error) {
      // Erros já são tratados e exibidos via toast em storageService.saveStoreProfile
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
      // Se a loja já está fechada temporariamente (seja por tempo ou indefinidamente), reabrir
      setIsStoreTemporariamenteClosed(false);
      setStoreSchedule(prev => ({ ...prev, reopenAt: null, isTemporariamenteClosedIndefinidamente: false }));
      storageService.saveStoreSchedule(supabase, userId, { ...storeSchedule, reopenAt: null, isTemporariamenteClosedIndefinidamente: false });
      showSuccess("A loja foi reaberta!");
      setIsCloseModalOpen(false); // Fechar o modal ao reabrir
    } else {
      // Se a loja está aberta, mostrar opções para fechar temporariamente
      setIsCloseModalOpen(true); // Abrir o modal
    }
  };

  const handleSetTemporaryCloseDuration = async (durationMinutes: number) => {
    if (!userId) return;

    let reopenAtISO: string | null = null;
    let isIndefinite = false;
    let successMessage = "";

    if (durationMinutes === -1) { // Tempo indeterminado
      isIndefinite = true;
      successMessage = "Loja fechada por tempo indeterminado!";
    } else { // Tempo determinado
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
    setIsCloseModalOpen(false); // Fechar o modal após a seleção

    await storageService.saveStoreSchedule(supabase, userId, { 
        ...storeSchedule, 
        reopenAt: reopenAtISO, 
        isTemporariamenteClosedIndefinidamente: isIndefinite 
    });
    showSuccess(successMessage);
  };

  // NOVO: Funções para o modal de cópia de opção
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
        // Create a deep copy of the source option and assign new unique IDs
        const copiedOption: Option = JSON.parse(JSON.stringify(sourceOption));
        copiedOption.id = Date.now().toString() + Math.random().toString(36).substring(2, 9); // New unique ID for option
        copiedOption.subProducts = copiedOption.subProducts.map(sp => ({
          ...sp,
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9), // New unique ID for sub-product
        }));
        return { ...p, options: [...p.options, copiedOption] };
      }
      return p;
    });

    setProducts(updatedProducts);
    await storageService.saveProducts(supabase, userId, updatedProducts);
    showSuccess(`Opção '${sourceOption.title}' copiada com sucesso!`);
    handleCloseCopyOptionModal();
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
      { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
      { id: 'clients', label: 'Clientes', icon: Users },
      { id: 'staff', label: 'Funcionários', icon: Users },
      { id: 'reports', label: 'Relatórios', icon: FileText, hasSubmenu: false }, // Alterado para hasSubmenu: false
  ];

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(groupSearchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(product => {
    const matchesSearchTerm = product.name.toLowerCase().includes(productSearchTerm.toLowerCase());

    // If no groups exist, no products should be displayed
    if (groups.length === 0 && selectedGroupId !== 'all') { // Only if a specific group is selected and no groups exist
        return false; 
    }

    if (selectedGroupId === 'all') {
      // When 'Todos' is selected, show products that belong to *any* existing group
      return matchesSearchTerm && (groups.some(group => group.id === product.group_id) || product.group_id === ''); // Also show products without a group
    } else {
      // When a specific group is selected, show products belonging to that group
      return matchesSearchTerm && product.group_id === selectedGroupId;
    }
  });

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-200 font-sans">
      {/* Sidebar - Dark Theme with 3D effect */}
      <aside 
        className={`text-gray-300 flex flex-col shadow-2xl z-20 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} border-r border-gray-800`}
        style={{ background: `linear-gradient(to bottom, ${storeProfile.secondaryColor}e0, ${storeProfile.secondaryColor})` }}
      >
        <div className="p-5 border-b border-gray-700 flex items-center justify-between">
           <div className={`flex items-center gap-2 ${isSidebarCollapsed ? 'hidden' : 'flex'}`}>
               <div className="w-1 h-6 rounded-full shadow-md" style={{ backgroundColor: storeProfile.primaryColor }}></div>
               <h1 className="text-xl font-bold text-white tracking-wide drop-shadow-sm">
                 Click <span style={{ color: storeProfile.primaryColor }}>PEDE</span>
               </h1>
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
                            if (item.id === 'store') { // Lógica específica para o item 'Loja'
                                setIsStoreSubmenuOpen(prev => !prev); // Alterna o submenu da loja
                                if (!isStoreSubmenuOpen) { // Se estiver abrindo o submenu da loja
                                    setActiveTab('store-settings'); // Define a aba padrão para 'Configurações da Loja'
                                }
                            } else { // Para todos os outros itens (incluindo 'Relatórios')
                                setActiveTab(item.id as any);
                                setIsStoreSubmenuOpen(false); // Garante que o submenu da loja esteja fechado
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
                            <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${isStoreSubmenuOpen && item.id === 'store' ? 'rotate-180' : ''}`} />
                        )}
                        {/* 3D effect on hover */}
                        <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
                    </button>

                    {item.hasSubmenu && item.id === 'store' && isStoreSubmenuOpen && !isSidebarCollapsed && (
                        <div className="ml-8 space-y-1 border-l border-gray-700">
                            {item.children?.map(child => (
                                <button
                                    key={child.id}
                                    onClick={() => setActiveTab(child.id as any)} // Sub-items ainda navegam diretamente
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header */}
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

                {/* Profile Dropdown */}
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
                                    onNavigate('#/dashboard/profile-settings'); // Navegar via prop
                                    setIsProfileDropdownOpen(false); 
                                }} 
                                className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <UserIcon className="w-4 h-4" /> Configurações de Perfil
                            </button>
                            <button 
                                onClick={() => { 
                                    showSuccess("Funcionalidade de Suporte em breve!"); 
                                    setIsProfileDropdownOpen(false); 
                                }} 
                                className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <FileText className="w-4 h-4" /> Suporte
                            </button>
                            <button 
                                onClick={() => { 
                                    showSuccess("Funcionalidade de Meu Plano em breve!"); 
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

        {/* Content Scrollable */}
        <main className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-gray-100 to-gray-200">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl min-h-[300px] flex border border-gray-200 bg-gradient-to-br from-white to-gray-50">
                        <div className="absolute inset-0 bg-[linear-gradient(115deg,#fbbf24_55%,#2d1a1a_55%)] opacity-90"></div>
                        <div className="relative z-10 w-full flex items-center">
                            <div className="w-[55%] p-12 pr-20 flex flex-col justify-center h-full">
                                <h1 className="text-4xl font-extrabold text-white drop-shadow-lg mb-4">
                                    Bem-vindo ao Painel!
                                </h1>
                                <h2 className="text-2xl font-bold text-white mb-4 drop-shadow-md">
                                    Gerencie seu delivery com facilidade
                                </h2>
                                <p className="text-white/90 font-medium mb-8 leading-relaxed max-w-lg drop-shadow-sm">
                                    Aqui você controla pedidos, cardápio, clientes e muito mais, tudo de forma rápida e moderna.
                                </p>
                                <div className="flex gap-4">
                                    <button onClick={() => setActiveTab('orders')} className="bg-[#dc2626] text-white px-8 py-3 rounded-full font-bold hover:bg-red-700 transition-colors shadow-xl transform active:scale-95">
                                        Ver Pedidos
                                    </button>
                                    <button className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-full font-bold hover:bg-white/10 transition-colors transform active:scale-95">
                                        Saiba Mais
                                    </button>
                                </div>
                            </div>
                            <div className="w-[45%] h-full relative">
                                <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
                                <div className="absolute bottom-10 left-10 w-48 h-48 bg-yellow-500/15 rounded-full blur-3xl animate-pulse delay-100"></div>
                            </div>
                        </div>
                    </div>
                    {/* Stats grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                        <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-100 transform hover:scale-[1.02] hover:shadow-2xl transition-all duration-200 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-gray-500 font-medium text-sm">Vendas Totais</h4>
                                <span className="bg-green-100 text-green-600 p-2 rounded-lg shadow-md"><ShoppingBag size={20} /></span>
                            </div>
                            <p className="text-3xl font-bold text-gray-800">R$ {orders.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}</p>
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
                </div>
            )}

            {/* PRODUCTS TAB */}
            {activeTab === 'products' && (
                <div className="flex gap-6 h-full">
                    {/* Left Sidebar - Groups */}
                    <div className="w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 flex flex-col flex-shrink-0 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input 
                                type="text" 
                                placeholder="Buscar grupos..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#9f1239] focus:ring-2 focus:ring-[#9f1239]/20 shadow-sm transition-all"
                                value={groupSearchTerm}
                                onChange={e => setGroupSearchTerm(e.target.value)}
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
                                    className={`w-full text-left px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 relative overflow-hidden
                                        ${selectedGroupId === 'all' 
                                            ? 'text-white shadow-lg transform scale-[1.01]' 
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
                                onDragStart={handleDragStart} // Adicionado onDragStart
                                onDragEnd={handleDragEnd}
                                onDragCancel={handleDragCancel} // Adicionado onDragCancel
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

                    {/* Right Main Content - Products, Options, Sub-products */}
                    <div className="flex-1 space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <Package className="drop-shadow-sm" style={{ color: storeProfile.primaryColor }} />
                                Gerenciar Produtos, Grupos e Sub-produtos
                            </h2>
                            {/* Botão NOVO PRODUTO aparece apenas se houver grupos cadastrados */}
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
                                            <label className="text-sm font-semibold text-gray-700">Nome do Item</label>
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
                                            onOpenCopyOptionModal={handleOpenCopyOptionModal} // Passar a nova função
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </div>
                    </div>
                </div>
            )}

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
                <div className="space-y-6">
                    <h2 className="2xl font-bold text-gray-800 flex items-center gap-2">
                         <ShoppingBag className="drop-shadow-sm" style={{ color: storeProfile.primaryColor }} />
                         Pedidos Recentes
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                        {orders.length === 0 ? (
                            <div className="text-center text-gray-500 p-8 bg-white rounded-xl shadow-xl border border-gray-100">
                                Nenhum pedido encontrado.
                            </div>
                        ) : (
                            orders.map(order => (
                                <div key={order.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 transform hover:scale-[1.01] hover:shadow-2xl transition-all duration-200 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shadow-lg ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
                                            {order.customerName[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{order.customerName}</h4>
                                            <p className="text-sm text-gray-500">#{order.id} • {new Date(order.date).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-6">
                                        <span className="font-bold text-lg text-gray-800">R$ {order.total.toFixed(2)}</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase shadow-md ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {order.status === 'delivered' ? 'Entregue' : 'Pendente'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
            
            {/* STORE SETTINGS TAB */}
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
                      
                      {/* Upload de Logo */}
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

                      {/* Upload de Capa (Banner) */}
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
                              <div className="flex-1 space-y-2 hidden"> {/* Hidden as it's a full-width preview */}</div>
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

            {/* SCHEDULE TAB */}
            {activeTab === 'schedule' && (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50 -z-10"></div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">Horário de Funcionamento</h2>
                    <p className="text-gray-600 mb-6">Defina os horários de abertura e fechamento da sua loja para cada dia da semana.</p>
                    
                    {/* Sempre Aberto Option */}
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

            {/* PROFILE SETTINGS TAB */}
            {activeTab === 'profile-settings' && (
                <ProfileSettingsPage onProfileUpdate={handleProfileUpdate} />
            )}

            {/* REPORTS TAB - Conteúdo de exemplo */}
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

            {/* CLIENTS TAB - Conteúdo de exemplo */}
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

            {/* STAFF TAB - Conteúdo de exemplo */}
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

      {/* Modal para Fechar Loja Temporariamente */}
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

      {/* Novo Modal para Confirmação de Ativação/Desativação de Sabores */}
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

      {/* Modal para Adicionar Sub-produto */}
      {currentProductAndOptionForSubProduct && (
        <AddSubProductModal
          isOpen={isAddSubProductModalOpen}
          onClose={() => setIsAddSubProductModalOpen(false)}
          onSave={handleAddSubProductConfirm}
          storeProfile={storeProfile}
        />
      )}

      {/* NOVO: Modal para Copiar Opção */}
      {optionToCopy && (
        <CopyOptionModal
          isOpen={isCopyOptionModalOpen}
          onClose={handleCloseCopyOptionModal}
          onCopy={handleCopyOption}
          // Filtrando produtos sem ID
          allProducts={products.filter(p => p.id !== undefined)} 
          sourceProductId={optionToCopy.productId}
          sourceOptionId={optionToCopy.optionId}
          sourceOptionTitle={optionToCopy.optionTitle}
          storeProfile={storeProfile}
        />
      )}
    </div>
  );
};
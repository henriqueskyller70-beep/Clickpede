import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, X, Search, MapPin, Clock, CreditCard, ShoppingBag, Home, FileText, ChevronRight, Bike } from 'lucide-react';
import { Product, Category, StoreProfile, CartItem, Address, StoreSchedule, DailySchedule, Group, Option, SubProduct } from '../types';
import { storageService } from '../services/storageService';
import { useSession } from '../src/components/SessionContextProvider'; // Importar o hook de sessão

export const StoreFront: React.FC = () => {
  const { supabase, session } = useSession(); // Obter supabase e session do contexto
  const userId = session?.user?.id;

  const [products, setProducts] = useState<Product[]>([]);
  const [store, setStore] = useState<StoreProfile>({ name: '', description: '', primaryColor: '#9f1239', secondaryColor: '#2d1a1a', logoUrl: '', coverUrl: '', address: '', phone: '' });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Address State
  const [userAddress, setUserAddress] = useState<Address | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressForm, setAddressForm] = useState<Address>({
    street: '', number: '', neighborhood: '', city: '', complement: '', reference: ''
  });

  // Horário de funcionamento
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
  });
  const [isStoreCurrentlyOpen, setIsStoreCurrentlyOpen] = useState(false);
  const [reopenCountdown, setReopenCountdown] = useState<string | null>(null); // Contador para a vitrine

  // Estado para grupos
  const [groups, setGroups] = useState<Group[]>([]);

  // Estados para o modal de detalhes do produto
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [tempSelectedOptions, setTempSelectedOptions] = useState<Record<string, Record<string, number>>>({}); // { optionId: { subProductId: quantity } }

  useEffect(() => {
    const loadStoreData = async () => {
      if (userId) {
        console.log('[StoreFront] Carregando dados da loja para userId:', userId);
        const fetchedProducts = await storageService.getProducts(supabase, userId);
        const fetchedStoreProfile = await storageService.getStoreProfile(supabase, userId);
        const fetchedStoreSchedule = await storageService.getStoreSchedule(supabase, userId);
        const fetchedGroups = await storageService.getGroups(supabase, userId);

        console.log('[StoreFront] Perfil da loja carregado do serviço:', fetchedStoreProfile); // NOVO LOG
        setProducts(fetchedProducts);
        setStore(fetchedStoreProfile);
        setStoreSchedule(fetchedStoreSchedule);
        setGroups(fetchedGroups);
      } else {
        console.log('[StoreFront] Nenhum userId, limpando dados da loja.');
        // Limpar estados se não houver userId (ex: não logado)
        setProducts([]);
        setStore({ name: '', description: '', primaryColor: '#9f1239', secondaryColor: '#2d1a1a', logoUrl: '', coverUrl: '', address: '', phone: '' });
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
        setGroups([]);
      }
    };
    loadStoreData();

    const savedAddress = storageService.getUserAddress();
    if (savedAddress) {
      setUserAddress(savedAddress);
      setAddressForm(savedAddress);
    }
  }, [userId, supabase]);

  // NOVO useEffect para logar o estado 'store' após ser atualizado
  useEffect(() => {
    console.log('[StoreFront] Estado da loja atualizado:', store);
  }, [store]);

  useEffect(() => {
    checkStoreStatus();
    const interval = setInterval(checkStoreStatus, 1000); // Verifica a cada segundo para o contador
    return () => clearInterval(interval);
  }, [storeSchedule]);

  const checkStoreStatus = () => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 for Sunday, 1 for Monday, etc.
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes from midnight

    console.log(`[StoreStatus] Verificando status da loja em: ${now.toLocaleTimeString()} (${now.toLocaleDateString('pt-BR', { weekday: 'long' })})`);
    console.log(`[StoreStatus] isAlwaysOpen: ${storeSchedule.isAlwaysOpen}`);
    console.log(`[StoreStatus] reopenAt: ${storeSchedule.reopenAt}`);
    console.log(`[StoreStatus] isTemporariamenteClosedIndefinidamente: ${storeSchedule.isTemporariamenteClosedIndefinidamente}`);

    // 1. Verificar fechamento temporário (indefinido)
    if (storeSchedule.isTemporariamenteClosedIndefinidamente) {
      setIsStoreCurrentlyOpen(false);
      setReopenCountdown(null); // Não mostra contador na vitrine para fechamento indefinido
      console.log('[StoreStatus] Loja fechada por tempo indeterminado. Status: Fechado');
      return;
    }

    // 2. Verificar fechamento temporário (com tempo definido)
    if (storeSchedule.reopenAt) {
      const reopenTime = new Date(storeSchedule.reopenAt);
      if (now < reopenTime) {
        // Loja fechada temporariamente, ainda não reabriu
        // O contador não será exibido na vitrine, apenas o status "Fechado"
        setIsStoreCurrentlyOpen(false);
        setReopenCountdown(null); // Não mostra contador na vitrine
        console.log('[StoreStatus] Loja fechada temporariamente (com tempo). Status: Fechado');
        return;
      } else {
        // Tempo de fechamento temporário expirou, limpar reopenAt
        if (userId) {
          storageService.saveStoreSchedule(supabase, userId, { ...storeSchedule, reopenAt: null, isTemporariamenteClosedIndefinidamente: false });
        }
        setReopenCountdown(null);
        console.log('[StoreStatus] Tempo de fechamento temporário expirou. Reabrindo...');
      }
    } else {
      setReopenCountdown(null); // Garante que o contador esteja limpo se não houver fechamento temporário
    }

    // 3. Verificar "Sempre Aberto"
    if (storeSchedule.isAlwaysOpen) {
      setIsStoreCurrentlyOpen(true);
      console.log('[StoreStatus] Loja sempre aberta. Status: Aberto');
      return;
    }

    // 4. Verificar horário de funcionamento diário
    const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const todaySchedule = storeSchedule.dailySchedules.find(s => s.day === daysOfWeek[currentDay]);

    if (todaySchedule) {
      console.log(`[StoreStatus] Agendamento para hoje (${todaySchedule.day}):`, todaySchedule);
    } else {
      console.log(`[StoreStatus] Nenhum agendamento encontrado para o dia atual.`);
    }

    if (todaySchedule && todaySchedule.isOpen) {
      const [openHour, openMinute] = todaySchedule.openTime.split(':').map(Number);
      const [closeHour, closeMinute] = todaySchedule.closeTime.split(':').map(Number);

      const openTimeInMinutes = openHour * 60 + openMinute;
      const closeTimeInMinutes = closeHour * 60 + closeMinute;

      console.log(`[StoreStatus] Horário de abertura (minutos): ${openTimeInMinutes}`);
      console.log(`[StoreStatus] Horário de fechamento (minutos): ${closeTimeInMinutes}`);
      console.log(`[StoreStatus] Hora atual (minutos): ${currentTime}`);

      let isOpenNow = false;
      if (closeTimeInMinutes < openTimeInMinutes) {
        // Horário que vira a noite (ex: 22:00 - 02:00)
        isOpenNow = currentTime >= openTimeInMinutes || currentTime <= closeTimeInMinutes;
        console.log(`[StoreStatus] Horário noturno. Aberto se (atual >= abertura) OU (atual <= fechamento): ${isOpenNow}`);
      } else {
        // Horário dentro do mesmo dia (ex: 09:00 - 18:00)
        isOpenNow = currentTime >= openTimeInMinutes && currentTime <= closeTimeInMinutes;
        console.log(`[StoreStatus] Horário diurno. Aberto se (atual >= abertura) E (atual <= fechamento): ${isOpenNow}`);
      }
      setIsStoreCurrentlyOpen(isOpenNow);
      console.log(`[StoreStatus] Status final para hoje: ${isOpenNow ? 'Aberto' : 'Fechado'}`);
    } else {
      setIsStoreCurrentlyOpen(false);
      console.log('[StoreStatus] Agendamento de hoje não está aberto. Status: Fechado');
    }
  };

  // Função para calcular o preço total de um item no carrinho, incluindo opções
  const calculateItemTotalPrice = (item: CartItem) => {
    let total = item.price; // Base price of the product
    if (item.selectedOptions) {
      item.selectedOptions.forEach(selOpt => {
        const originalProduct = products.find(p => p.id === item.id);
        const option = originalProduct?.options.find(opt => opt.id === selOpt.optionId);
        const subProduct = option?.subProducts.find(sp => sp.id === selOpt.subProductId);
        if (subProduct) {
          total += subProduct.price * selOpt.quantity;
        }
      });
    }
    return total * item.quantity;
  };

  const addToCart = (product: Product) => {
    // This function is now replaced by openProductDetails
    // It will only be called if a product has no options
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && !item.selectedOptions); // Only merge if no options
      if (existing) {
        return prev.map(item => item.id === product.id && !item.selectedOptions ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (itemToUpdate: CartItem, delta: number) => {
    setCart(prev => prev.map(item => {
      // Compare by ID and selectedOptions to ensure uniqueness
      const isSameItem = item.id === itemToUpdate.id && 
                         JSON.stringify(item.selectedOptions) === JSON.stringify(itemToUpdate.selectedOptions);
      if (isSameItem) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.street || !addressForm.number || !addressForm.neighborhood) {
        alert("Preencha Rua, Número e Bairro.");
        return;
    }
    setUserAddress(addressForm);
    storageService.saveUserAddress(addressForm);
    setIsAddressModalOpen(false);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    let addressText = "Retirada no Local";
    if (userAddress) {
        addressText = `*Entrega em:*\n${userAddress.street}, ${userAddress.number} - ${userAddress.neighborhood}, ${userAddress.city}`;
        if (userAddress.complement) addressText += `\nCompl: ${userAddress.complement}`;
    }

    const cartSummary = cart.map(item => {
        const baseName = `${item.quantity}x ${item.name}`;
        if (item.selectedOptions && item.selectedOptions.length > 0) {
            const optionsText = item.selectedOptions.map(selOpt => {
                const originalProduct = products.find(p => p.id === item.id);
                const option = originalProduct?.options.find(opt => opt.id === selOpt.optionId);
                const subProduct = option?.subProducts.find(sp => sp.id === selOpt.subProductId);
                if (subProduct) {
                    let subProductLine = `${selOpt.quantity}x ${subProduct.name}`;
                    if (subProduct.description) {
                        subProductLine += ` (${subProduct.description})`;
                    }
                    if (subProduct.price > 0) {
                        subProductLine += ` (+R$ ${subProduct.price.toFixed(2)})`;
                    }
                    return subProductLine;
                }
                return '';
            }).filter(Boolean).join(', ');
            return `${baseName} (${optionsText})`;
        }
        return baseName;
    }).join('\n');

    const totalCartPrice = cart.reduce((acc, item) => acc + calculateItemTotalPrice(item), 0).toFixed(2);

    const text = `Olá! Pedido na *${store.name}*:\n\n${cartSummary}\n\n*Total: R$ ${totalCartPrice}*\n\n----------------\n${addressText}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Agrupar produtos pelo group_id, usando os nomes dos grupos para exibição
  const productsByGroup = groups.map(group => ({
      group: group,
      items: products.filter(p => p.group_id === group.id && p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  })).filter(group => group.items.length > 0);

  // Modal de detalhes do produto
  const openProductDetails = (product: Product) => {
    setSelectedProductForDetails(product);
    const initialSelections: Record<string, Record<string, number>> = {};
    product.options.forEach(option => {
        initialSelections[option.id] = {};
    });
    setTempSelectedOptions(initialSelections);
  };

  const closeProductDetails = () => {
    setSelectedProductForDetails(null);
    setTempSelectedOptions({});
  };

  const handleTempSubProductChange = (optionId: string, subProductId: string, quantityChange: number) => {
    if (!selectedProductForDetails) return;

    setTempSelectedOptions(prev => {
        const newSelections = { ...prev };
        const option = selectedProductForDetails.options.find(opt => opt.id === optionId);
        if (!option) return prev;

        let currentOptionSelections = { ...newSelections[optionId] };
        let currentQuantity = currentOptionSelections[subProductId] || 0;

        if (option.allowRepeat) {
            currentQuantity += quantityChange;
            if (currentQuantity < 0) currentQuantity = 0;
            if (currentQuantity > option.maxSelection) currentQuantity = option.maxSelection;
            if (currentQuantity === 0) {
                delete currentOptionSelections[subProductId];
            } else {
                currentOptionSelections[subProductId] = currentQuantity;
            }
        } else {
            const totalSelected = Object.values(currentOptionSelections).reduce((sum, qty) => sum + qty, 0);
            if (quantityChange > 0) { // Selecting
                if (option.maxSelection === 1) { // Radio-like behavior
                    currentOptionSelections = { [subProductId]: 1 };
                } else { // Checkbox-like behavior
                    if (totalSelected < option.maxSelection) {
                        currentOptionSelections[subProductId] = 1;
                    }
                }
            } else { // Deselecting
                delete currentOptionSelections[subProductId];
            }
        }
        newSelections[option.id] = currentOptionSelections;
        return newSelections;
    });
  };

  const addProductWithOptionsToCart = () => {
    if (!selectedProductForDetails) return;

    // Validate min/max selections for each option
    for (const option of selectedProductForDetails.options) {
        const selectedCount = Object.values(tempSelectedOptions[option.id] || {}).reduce((sum, qty) => sum + qty, 0);
        if (selectedCount < option.minSelection) {
            alert(`Por favor, selecione pelo menos ${option.minSelection} item(s) para a opção "${option.title}".`);
            return;
        }
        if (selectedCount > option.maxSelection) {
            alert(`Você pode selecionar no máximo ${option.maxSelection} item(s) para a opção "${option.title}".`);
            return;
        }
    }

    const selectedOptionsArray: CartItem['selectedOptions'] = [];
    Object.entries(tempSelectedOptions).forEach(([optionId, subProductsMap]) => {
        Object.entries(subProductsMap).forEach(([subProductId, quantity]) => {
            if (quantity > 0) {
                selectedOptionsArray.push({ optionId, subProductId, quantity });
            }
        });
    });

    const itemToAdd: CartItem = {
        ...selectedProductForDetails,
        quantity: 1,
        selectedOptions: selectedOptionsArray,
    };

    setCart(prev => {
        // Check if an identical item (same product + same options) already exists
        const existingItemIndex = prev.findIndex(item => 
            item.id === itemToAdd.id && 
            JSON.stringify(item.selectedOptions) === JSON.stringify(itemToAdd.selectedOptions)
        );

        if (existingItemIndex > -1) {
            const updatedCart = [...prev];
            updatedCart[existingItemIndex] = {
                ...updatedCart[existingItemIndex],
                quantity: updatedCart[existingItemIndex].quantity + 1
            };
            return updatedCart;
        }
        return [...prev, itemToAdd];
    });

    closeProductDetails();
  };

  // Calcula o preço atual do produto no modal, incluindo as opções temporariamente selecionadas
  const calculateCurrentModalProductPrice = () => {
    if (!selectedProductForDetails) return 0;
    let currentPrice = selectedProductForDetails.price;
    Object.entries(tempSelectedOptions).forEach(([optionId, subProductsMap]) => {
        Object.entries(subProductsMap).forEach(([subProductId, quantity]) => {
            const option = selectedProductForDetails.options.find(opt => opt.id === optionId);
            const subProduct = option?.subProducts.find(sp => sp.id === subProductId);
            if (subProduct) {
                currentPrice += subProduct.price * quantity;
            }
        });
    });
    return currentPrice;
  };


  return (
    <div className="min-h-screen bg-white font-sans pb-24">
      
      {/* 1. Top Banner (Image) */}
      <div className="w-full h-40 bg-gray-200 relative overflow-hidden">
         {store.coverUrl ? (
             <img src={store.coverUrl} alt="Capa" className="w-full h-full object-cover" />
         ) : (
             <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white">
                 Capa da Loja
             </div>
         )}
      </div>

      {/* 2. Header Info (Logo, Name, Status) */}
      <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-start md:items-center -mt-10 relative z-10 mb-6 gap-4">
              
              {/* Logo Box */}
              <div className="w-24 h-24 bg-white rounded-xl shadow-md p-1 border border-gray-100 flex-shrink-0">
                  <div className="w-full h-full rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                    {store.logoUrl ? (
                        <img src={store.logoUrl} className="w-full h-full object-contain" />
                    ) : (
                        <span className="text-2xl font-bold text-gray-400">{store.name ? store.name[0] : ''}</span>
                    )}
                  </div>
              </div>

              {/* Text Info */}
              <div className="flex-1 pt-10 md:pt-0 w-full">
                  <div className="flex justify-between items-start w-full">
                      <div>
                          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{store.name || 'Nome da Loja'}</h1>
                          <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[250px] md:max-w-md">{store.address || 'Endereço não informado'}</span>
                          </div>
                      </div>
                      
                      <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border shadow-sm 
                          ${isStoreCurrentlyOpen ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                          <div className={`w-2 h-2 rounded-full animate-pulse ${isStoreCurrentlyOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          {isStoreCurrentlyOpen ? 'Aberto' : 'Fechado'}
                          {/* O contador não será exibido na vitrine */}
                      </div>
                  </div>
              </div>
          </div>

          {/* 3. Service Icons Grid (4 Blocks like Skyller) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-slate-50 hover:bg-slate-100 transition-colors rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer border border-slate-100">
                  <Bike className="w-6 h-6 text-gray-700" />
                  <span className="text-[10px] font-semibold text-gray-600">Entrega</span>
              </div>
              <div className="bg-slate-50 hover:bg-slate-100 transition-colors rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer border border-slate-100">
                  <ShoppingBag className="w-6 h-6 text-gray-700" />
                  <span className="text-[10px] font-semibold text-gray-600">Retirada</span>
              </div>
              <div className="bg-slate-50 hover:bg-slate-100 transition-colors rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer border border-slate-100">
                  <Clock className="w-6 h-6 text-gray-700" />
                  <span className="text-[10px] font-semibold text-gray-600">Funcionamento</span>
              </div>
              <div className="bg-slate-50 hover:bg-slate-100 transition-colors rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer border border-slate-100">
                  <CreditCard className="w-6 h-6 text-gray-700" />
                  <span className="text-[10px] font-semibold text-gray-600">Pagamentos</span>
              </div>
          </div>

          {/* 4. Categories Tabs */}
          <div className="mb-6">
             <h3 className="text-sm font-bold text-gray-900 mb-3 ml-1">Categorias</h3>
             <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <button className="px-5 py-2 rounded-full bg-gray-900 text-white text-xs font-bold whitespace-nowrap shadow-sm">
                    Tudo
                </button>
                {/* Usar grupos para as abas */}
                {groups.map(group => (
                    <a key={group.id} href={`#cat-${group.id}`} className="px-5 py-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-bold whitespace-nowrap transition-colors">
                        {group.name} {/* Exibir nome do grupo */}
                    </a>
                ))}
             </div>
          </div>

          {/* 5. Search Bar */}
          <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                  type="text" 
                  placeholder="Buscar produtos... (ex: calabresa)"
                  className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
              />
          </div>

          {/* 6. Product List */}
          <div className="space-y-8">
              {productsByGroup.length === 0 ? (
                  <div className="text-center text-gray-500 p-8 bg-white rounded-xl shadow-xl border border-gray-100">
                      Nenhum produto encontrado. Configure sua loja no painel administrativo.
                  </div>
              ) : (
                  productsByGroup.map((groupData) => (
                      <div key={groupData.group.id} id={`cat-${groupData.group.id}`} className="scroll-mt-32">
                          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                              {groupData.group.name}
                          </h2>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                              {groupData.items.map(product => (
                                  <div key={product.id} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4 shadow-sm hover:shadow-md transition-all group">
                                      {/* Product Image */}
                                      <div className="w-28 h-28 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative flex items-center justify-center">
                                          {product.image_url ? (
                                              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                          ) : (
                                              <span className="text-gray-400 text-xs text-center p-2">Sem Imagem</span>
                                          )}
                                      </div>

                                      {/* Content */}
                                      <div className="flex-1 flex flex-col justify-between py-1">
                                          <div>
                                              <h3 className="text-base font-bold text-gray-900 line-clamp-1 leading-tight">{product.name}</h3>
                                              <p className="text-xs text-gray-500 line-clamp-2 mt-1.5">{product.description}</p>
                                          </div>
                                          
                                          <div className="flex items-center justify-between mt-3">
                                              <span className="text-base font-bold text-gray-900">
                                                  R$ {product.price.toFixed(2)}
                                              </span>
                                              <button 
                                                  onClick={() => product.options && product.options.length > 0 ? openProductDetails(product) : addToCart(product)}
                                                  className="bg-white border border-gray-200 text-green-700 text-xs font-bold px-4 py-2 rounded-lg hover:bg-green-50 hover:border-green-200 transition-all shadow-sm active:scale-95"
                                                  style={{ color: store.primaryColor, borderColor: store.primaryColor, '--hover-bg-color': `${store.primaryColor}10` } as React.CSSProperties}
                                                  disabled={!isStoreCurrentlyOpen} // Desabilita se a loja estiver fechada
                                              >
                                                  {product.options && product.options.length > 0 ? 'Ver Opções' : 'Adicionar'}
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))
              )}
          </div>
          
          {/* Footer Spacer */}
          <div className="h-10"></div>
      </div>

      {/* 7. Bottom Navigation (Fixed) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-5px_20px_rgba(0,0,0,0.03)] z-40">
          <div className="max-w-5xl mx-auto flex justify-between items-center h-16 px-6">
              <button 
                onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} 
                className="flex flex-col items-center justify-center text-gray-800 gap-1 w-16"
              >
                  <Home className="w-5 h-5" />
                  <span className="text-[10px] font-bold">Início</span>
              </button>
              
              <button 
                  onClick={() => setIsCartOpen(true)}
                  className="flex flex-col items-center justify-center text-gray-400 hover:text-gray-800 gap-1 w-16 relative"
              >
                  <div className="relative">
                      <ShoppingCart className="w-5 h-5" />
                      {cart.length > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full ring-2 ring-white">
                              {cart.reduce((a, b) => a + b.quantity, 0)}
                          </span>
                      )}
                  </div>
                  <span className="text-[10px] font-bold">Carrinho</span>
              </button>
              
              <button className="flex flex-col items-center justify-center text-gray-400 hover:text-gray-800 gap-1 w-16">
                  <FileText className="w-5 h-5" />
                  <span className="text-[10px] font-bold">Pedidos</span>
              </button>
          </div>
      </div>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[60] overflow-hidden">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)} />
            <div className="absolute inset-y-0 right-0 max-w-full flex">
                <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col transform transition-transform">
                    <div className="flex items-center justify-between p-5 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900">Seu Pedido</h2>
                        <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 p-2 rounded-full"><X className="w-5 h-5"/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                                    <ShoppingBag className="w-8 h-8 text-gray-300" />
                                </div>
                                <p className="text-gray-500 font-medium">Sua sacola está vazia.</p>
                                <button onClick={() => setIsCartOpen(false)} className="font-bold text-sm" style={{ color: store.primaryColor }}>Ver Cardápio</button>
                            </div>
                        ) : (
                            cart.map((item, index) => (
                                <div key={item.id + JSON.stringify(item.selectedOptions) + index} className="flex gap-4">
                                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                                        {item.image_url ? (
                                            <img src={item.image_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-gray-400 text-xs text-center p-2">Sem Imagem</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-sm text-gray-900 line-clamp-1">{item.name}</h4>
                                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                                            <div className="ml-0 text-xs text-gray-600 space-y-0.5 mt-1">
                                                {item.selectedOptions.map(selOpt => {
                                                    const originalProduct = products.find(p => p.id === item.id);
                                                    const option = originalProduct?.options.find(opt => opt.id === selOpt.optionId);
                                                    const subProduct = option?.subProducts.find(sp => sp.id === selOpt.subProductId);
                                                    return subProduct ? (
                                                        <p key={selOpt.optionId + selOpt.subProductId}>
                                                            {selOpt.quantity}x {subProduct.name} 
                                                            {subProduct.description && ` (${subProduct.description})`} 
                                                            {subProduct.price > 0 ? ` (+R$ ${subProduct.price.toFixed(2)})` : ''}
                                                        </p>
                                                    ) : null;
                                                })}
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-500 mb-2 mt-1">Preço base: R$ {item.price.toFixed(2)}</p>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center border border-gray-200 rounded-lg">
                                                <button onClick={() => updateQuantity(item, -1)} className="px-2 py-1 text-gray-500 hover:bg-gray-50 rounded-l-lg"><Minus className="w-3 h-3"/></button>
                                                <span className="px-2 text-xs font-bold text-gray-900">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item, 1)} className="px-2 py-1 rounded-r-lg" style={{ color: store.primaryColor, '--hover-bg-color': `${store.primaryColor}10` } as React.CSSProperties}><Plus className="w-3 h-3"/></button>
                                            </div>
                                            <span className="font-bold text-sm text-gray-900 ml-auto">
                                                R$ {calculateItemTotalPrice(item).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    {cart.length > 0 && (
                        <div className="p-5 border-t border-gray-100 bg-gray-50">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-medium text-gray-500">Total do Pedido</span>
                                <span className="text-xl font-extrabold text-gray-900">R$ {cart.reduce((acc, item) => acc + calculateItemTotalPrice(item), 0).toFixed(2)}</span>
                            </div>
                            <button 
                                onClick={() => userAddress ? handleCheckout() : setIsAddressModalOpen(true)}
                                className="w-full text-white py-4 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                style={{ backgroundColor: store.primaryColor }}
                                disabled={!isStoreCurrentlyOpen} // Desabilita se a loja estiver fechada
                            >
                                {userAddress ? 'Finalizar no WhatsApp' : 'Informar Endereço'}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
      
      {/* Product Details Modal */}
      {selectedProductForDetails && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeProductDetails}></div>
            <div className="bg-white rounded-2xl w-full max-w-md relative z-10 p-6 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4 flex-shrink-0">
                    <h3 className="font-bold text-xl text-gray-900">{selectedProductForDetails.name}</h3>
                    <button onClick={closeProductDetails} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-50"><X className="w-5 h-5"/></button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 -mr-2"> {/* Added pr-2 -mr-2 for custom scrollbar */}
                    <div className="w-full h-40 bg-gray-100 rounded-lg overflow-hidden mb-4 flex items-center justify-center">
                        {selectedProductForDetails.image_url ? (
                            <img src={selectedProductForDetails.image_url} alt={selectedProductForDetails.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-gray-400 text-sm text-center p-2">Sem Imagem</span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{selectedProductForDetails.description}</p>
                    <p className="text-lg font-bold text-gray-900 mb-6">Preço Base: R$ {selectedProductForDetails.price.toFixed(2)}</p>

                    {selectedProductForDetails.options.map(option => (
                        <div key={option.id} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-2">{option.title}</h4>
                            <p className="text-xs text-gray-500 mb-3">
                                Selecione {option.minSelection} a {option.maxSelection} item(s). {option.allowRepeat ? 'Pode repetir.' : 'Não pode repetir.'}
                            </p>
                            <div className="space-y-2">
                                {option.subProducts.filter(sp => sp.isActive).map(subProduct => {
                                    const currentQuantity = tempSelectedOptions[option.id]?.[subProduct.id] || 0;
                                    const totalSelectedInOption = Object.values(tempSelectedOptions[option.id] || {}).reduce((sum, qty) => sum + qty, 0);

                                    return (
                                        <div key={subProduct.id} className="flex items-center justify-between bg-white p-3 rounded-md border border-gray-100">
                                            <div className="flex items-center flex-1 cursor-pointer" onClick={() => {
                                                // Only toggle selection for non-repeatable options when clicking the name/checkbox area
                                                if (!option.allowRepeat) {
                                                    handleTempSubProductChange(option.id, subProduct.id, currentQuantity > 0 ? -1 : 1);
                                                }
                                            }}>
                                                {!option.allowRepeat && option.maxSelection === 1 && (
                                                    <input 
                                                        type="radio" 
                                                        name={`option-${option.id}`} 
                                                        checked={currentQuantity > 0}
                                                        onChange={() => handleTempSubProductChange(option.id, subProduct.id, 1)}
                                                        className="form-radio h-4 w-4 rounded focus:ring-yellow-500 shadow-sm"
                                                        style={{ color: store.primaryColor }}
                                                    />
                                                )}
                                                {!option.allowRepeat && option.maxSelection > 1 && (
                                                    <input 
                                                        type="checkbox" 
                                                        checked={currentQuantity > 0}
                                                        onChange={() => handleTempSubProductChange(option.id, subProduct.id, currentQuantity > 0 ? -1 : 1)}
                                                        className="form-checkbox h-4 w-4 rounded focus:ring-yellow-500 shadow-sm"
                                                        style={{ color: store.primaryColor }}
                                                        disabled={currentQuantity === 0 && totalSelectedInOption >= option.maxSelection}
                                                    />
                                                )}
                                                <div>
                                                    <span className="text-sm font-medium text-gray-800">{subProduct.name}</span>
                                                    {subProduct.description && (
                                                        <p className="text-xs text-gray-500 line-clamp-1">{subProduct.description}</p> 
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                {subProduct.price > 0 && (
                                                    <span className="text-sm font-bold text-gray-700">
                                                        +R$ {subProduct.price.toFixed(2)}
                                                    </span>
                                                )}
                                                {option.allowRepeat && (
                                                    <div className="flex items-center border border-gray-200 rounded-lg">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleTempSubProductChange(option.id, subProduct.id, -1)} 
                                                            className="px-2 py-1 text-gray-500 hover:bg-gray-50 rounded-l-lg"
                                                            disabled={currentQuantity === 0}
                                                        ><Minus className="w-3 h-3"/></button>
                                                        <span className="px-2 text-xs font-bold text-gray-900">{currentQuantity}</span>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleTempSubProductChange(option.id, subProduct.id, 1)} 
                                                            className="px-2 py-1 rounded-r-lg"
                                                            style={{ color: store.primaryColor, '--hover-bg-color': `${store.primaryColor}10` } as React.CSSProperties}
                                                            disabled={currentQuantity >= option.maxSelection}
                                                        ><Plus className="w-3 h-3"/></button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pt-4 border-t border-gray-100 mt-4 flex-shrink-0">
                    <button 
                        onClick={addProductWithOptionsToCart}
                        className="w-full text-white py-3 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-colors active:scale-[0.98]"
                        style={{ backgroundColor: store.primaryColor }}
                        disabled={!isStoreCurrentlyOpen} // Desabilita se a loja estiver fechada
                    >
                        Adicionar ao Carrinho - R$ {calculateCurrentModalProductPrice().toFixed(2)}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Address Modal */}
      {isAddressModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddressModalOpen(false)}></div>
              <div className="bg-white rounded-2xl w-full max-w-sm relative z-10 p-6 shadow-2xl animate-in zoom-in-95">
                  <h3 className="font-bold text-xl mb-1 text-gray-900">Onde entregar?</h3>
                  <p className="text-gray-500 text-sm mb-6">Precisamos do seu endereço para calcular a entrega.</p>
                  
                  <form onSubmit={handleSaveAddress} className="space-y-4">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-700 uppercase ml-1">Rua / Avenida</label>
                          <input required placeholder="Ex: Rua das Flores" value={addressForm.street} onChange={e => setAddressForm({...addressForm, street: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"/>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-700 uppercase ml-1">Número</label>
                               <input required placeholder="123" value={addressForm.number} onChange={e => setAddressForm({...addressForm, number: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"/>
                          </div>
                          <div className="space-y-1">
                               <label className="text-xs font-bold text-gray-700 uppercase ml-1">Bairro</label>
                               <input required placeholder="Centro" value={addressForm.neighborhood} onChange={e => setAddressForm({...addressForm, neighborhood: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"/>
                          </div>
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-700 uppercase ml-1">Complemento</label>
                          <input placeholder="Apto 101, Bloco B" value={addressForm.complement} onChange={e => setAddressForm({...addressForm, complement: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"/>
                      </div>
                      
                      <button type="submit" 
                          className="w-full text-white py-3.5 rounded-xl font-bold text-sm mt-4 shadow-lg hover:shadow-xl transition-colors"
                          style={{ backgroundColor: store.primaryColor }}
                      >
                          Confirmar e Continuar
                      </button>
                  </form>
                  <button onClick={() => setIsAddressModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2"><X className="w-5 h-5"/></button>
              </div>
          </div>
      )}

    </div>
  );
};
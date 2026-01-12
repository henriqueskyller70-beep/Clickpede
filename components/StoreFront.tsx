import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, X, Search, MapPin, Clock, CreditCard, ShoppingBag, Home, FileText, ChevronRight, Bike, Info, History, Tag, User, Star, Edit } from 'lucide-react';
import { Product, Category, StoreProfile, CartItem, Address, StoreSchedule, DailySchedule, Group, Option, SubProduct } from '../types';
import { storageService } from '../services/storageService';
import { useSession } from '../src/components/SessionContextProvider';
import { showError } from '../src/utils/toast';
import { AddressManagerModal } from '../src/components/AddressManagerModal'; // Importar o novo modal

export const StoreFront: React.FC = () => {
  const { supabase, session } = useSession();
  const userId = session?.user?.id;

  const [products, setProducts] = useState<Product[]>([]);
  const [store, setStore] = useState<StoreProfile>({ name: '', description: '', primaryColor: '#9f1239', secondaryColor: '#2d1a1a', logoUrl: '', coverUrl: '', address: '', phone: '' });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Address States
  const [userAddresses, setUserAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressManagerModalOpen, setIsAddressManagerModalOpen] = useState(false); // Novo estado para o modal de gerenciamento

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
    reopenAt: null,
    isTemporariamenteClosedIndefinidamente: false,
  });
  const [isStoreCurrentlyOpen, setIsStoreCurrentlyOpen] = useState(false);
  const [reopenCountdown, setReopenCountdown] = useState<string | null>(null);

  // Estado para grupos
  const [groups, setGroups] = useState<Group[]>([]);

  // Estados para o modal de detalhes do produto
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [tempSelectedOptions, setTempSelectedOptions] = useState<Record<string, Record<string, number>>>({});
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null); // NOVO: Para saber qual item do carrinho está sendo editado

  useEffect(() => {
    const loadStoreData = async () => {
      if (userId) {
        console.log('[StoreFront] Carregando dados da loja para userId:', userId);
        const fetchedProducts = await storageService.getProducts(supabase, userId);
        const fetchedStoreProfile = await storageService.getStoreProfile(supabase, userId);
        const fetchedStoreSchedule = await storageService.getStoreSchedule(supabase, userId);
        const fetchedGroups = await storageService.getGroups(supabase, userId);

        setProducts(fetchedProducts);
        setStore(fetchedStoreProfile);
        setStoreSchedule(fetchedStoreSchedule);
        setGroups(fetchedGroups);
      } else {
        console.log('[StoreFront] Nenhum userId, limpando dados da loja.');
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

    // Load user addresses
    const savedAddresses = storageService.getAddresses();
    setUserAddresses(savedAddresses);
    const defaultAddress = savedAddresses.find(addr => addr.isDefault);
    if (defaultAddress) {
      setSelectedAddressId(defaultAddress.id);
    } else if (savedAddresses.length > 0) {
      setSelectedAddressId(savedAddresses[0].id); // Select the first if no default
    }
  }, [userId, supabase]);

  useEffect(() => {
    console.log('[StoreFront] Estado da loja atualizado:', store);
  }, [store]);

  useEffect(() => {
    checkStoreStatus();
    const interval = setInterval(checkStoreStatus, 1000);
    return () => clearInterval(interval);
  }, [storeSchedule]);

  const checkStoreStatus = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    if (storeSchedule.isTemporariamenteClosedIndefinidamente) {
      setIsStoreCurrentlyOpen(false);
      setReopenCountdown(null);
      return;
    }

    if (storeSchedule.reopenAt) {
      const reopenTime = new Date(storeSchedule.reopenAt);
      if (now < reopenTime) {
        setIsStoreCurrentlyOpen(false);
        setReopenCountdown(null);
        return;
      } else {
        if (userId) {
          storageService.saveStoreSchedule(supabase, userId, { ...storeSchedule, reopenAt: null, isTemporariamenteClosedIndefinidamente: false });
        }
        setReopenCountdown(null);
      }
    } else {
      setReopenCountdown(null);
    }

    if (storeSchedule.isAlwaysOpen) {
      setIsStoreCurrentlyOpen(true);
      return;
    }

    const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const todaySchedule = storeSchedule.dailySchedules.find(s => s.day === daysOfWeek[currentDay]);

    if (todaySchedule && todaySchedule.isOpen) {
      const [openHour, openMinute] = todaySchedule.openTime.split(':').map(Number);
      const [closeHour, closeMinute] = todaySchedule.closeTime.split(':').map(Number);

      const openTimeInMinutes = openHour * 60 + openMinute;
      const closeTimeInMinutes = closeHour * 60 + closeMinute;

      let isOpenNow = false;
      if (closeTimeInMinutes < openTimeInMinutes) {
        isOpenNow = currentTime >= openTimeInMinutes || currentTime <= closeTimeInMinutes;
      } else {
        isOpenNow = currentTime >= openTimeInMinutes && currentTime <= closeTimeInMinutes;
      }
      setIsStoreCurrentlyOpen(isOpenNow);
    } else {
      setIsStoreCurrentlyOpen(false);
    }
  };

  const calculateItemTotalPrice = (item: CartItem) => {
    let total = item.price;
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
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && !item.selectedOptions);
      if (existing) {
        return prev.map(item => item.id === product.id && !item.selectedOptions ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, cartItemId: Date.now().toString() + Math.random().toString(36).substring(2, 9) }]; // Assign unique cartItemId
    });
  };

  const updateQuantity = (itemToUpdate: CartItem, delta: number) => {
    setCart(prev => prev.map(item => {
      // Compare by cartItemId to ensure uniqueness
      const isSameItem = item.cartItemId === itemToUpdate.cartItemId;
      if (isSameItem) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleAddressSelected = (addressId: string) => {
    setSelectedAddressId(addressId);
    // Optionally, you might want to update the default address in storage here
    // storageService.setPrimaryAddress(addressId); // If selecting also makes it default
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    const selectedAddress = userAddresses.find(addr => addr.id === selectedAddressId);

    let addressText = "Retirada no Local";
    if (selectedAddress) {
        addressText = `*Entrega em:*\n${selectedAddress.street}, ${selectedAddress.number} - ${selectedAddress.neighborhood}, ${selectedAddress.city}`;
        if (selectedAddress.complement) addressText += `\nCompl: ${selectedAddress.complement}`;
        if (selectedAddress.reference) addressText += `\nRef: ${selectedAddress.reference}`;
    } else {
        showError("Por favor, selecione um endereço para entrega.");
        return;
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

  const productsByGroup = groups.map(group => ({
      group: group,
      items: products.filter(p => 
        p.group_id === group.id && 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
  })).filter(group => group.items.length > 0);

  const featuredProducts = products.filter(p => p.isFeatured && p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const openProductDetails = (product: Product, cartItemToEdit?: CartItem) => {
    setSelectedProductForDetails(product);
    setEditingCartItemId(cartItemToEdit?.cartItemId || null); // Set the cartItemId if editing

    const initialSelections: Record<string, Record<string, number>> = {};
    if (cartItemToEdit && cartItemToEdit.selectedOptions) {
        // Pre-fill options from the cart item being edited
        product.options.forEach(option => {
            initialSelections[option.id] = {};
            cartItemToEdit.selectedOptions?.forEach(selOpt => {
                if (selOpt.optionId === option.id) {
                    initialSelections[option.id][selOpt.subProductId] = selOpt.quantity;
                }
            });
        });
    } else {
        // Default empty selections for new product
        product.options.forEach(option => {
            initialSelections[option.id] = {};
        });
    }
    setTempSelectedOptions(initialSelections);
  };

  const closeProductDetails = () => {
    setSelectedProductForDetails(null);
    setTempSelectedOptions({});
    setEditingCartItemId(null); // Clear editing state
  };

  const handleTempSubProductChange = (optionId: string, subProductId: string, quantityChange: number) => {
    if (!selectedProductForDetails) return;

    setTempSelectedOptions(prev => {
        const newSelections = { ...prev };
        const option = selectedProductForDetails.options.find(opt => opt.id === optionId);
        if (!option) return prev;

        let currentOptionSelections = { ...newSelections[optionId] };
        let currentQuantity = currentOptionSelections[subProductId] || 0;
        
        const totalSelectedInOption = Object.values(currentOptionSelections).reduce((sum, qty) => sum + qty, 0);

        if (option.allowRepeat) {
            if (quantityChange > 0) {
                if (totalSelectedInOption + 1 > option.maxSelection) {
                    showError(`Você pode selecionar no máximo ${option.maxSelection} item(s) para a opção "${option.title}".`);
                    return prev;
                }
                currentQuantity++;
            } else {
                currentQuantity--;
            }
            
            if (currentQuantity < 0) currentQuantity = 0;

            if (currentQuantity === 0) {
                delete currentOptionSelections[subProductId];
            } else {
                currentOptionSelections[subProductId] = currentQuantity;
            }
        } else {
            if (quantityChange > 0) {
                if (option.maxSelection === 1) {
                    currentOptionSelections = { [subProductId]: 1 };
                } else {
                    if (totalSelectedInOption < option.maxSelection) {
                        currentOptionSelections[subProductId] = 1;
                    } else {
                        showError(`Você pode selecionar no máximo ${option.maxSelection} item(s) para a opção "${option.title}".`);
                        return prev;
                    }
                }
            } else {
                delete currentOptionSelections[subProductId];
            }
        }
        newSelections[option.id] = currentOptionSelections;
        return newSelections;
    });
  };

  const addProductWithOptionsToCart = () => {
    if (!selectedProductForDetails) return;

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

    const newItem: CartItem = {
        ...selectedProductForDetails,
        quantity: 1, // Always add/update with quantity 1 initially, then user can adjust in cart
        selectedOptions: selectedOptionsArray,
        cartItemId: editingCartItemId || Date.now().toString() + Math.random().toString(36).substring(2, 9), // Use existing ID if editing, otherwise generate new
    };

    setCart(prev => {
        if (editingCartItemId) {
            // If editing an existing item
            return prev.map(item => item.cartItemId === editingCartItemId ? { ...newItem, quantity: item.quantity } : item); // Keep original quantity
        } else {
            // If adding a new item, check for identical items to merge quantity
            const existingItemIndex = prev.findIndex(item => 
                item.id === newItem.id && 
                JSON.stringify(item.selectedOptions) === JSON.stringify(newItem.selectedOptions)
            );

            if (existingItemIndex > -1) {
                const updatedCart = [...prev];
                updatedCart[existingItemIndex] = {
                    ...updatedCart[existingItemIndex],
                    quantity: updatedCart[existingItemIndex].quantity + 1
                };
                return updatedCart;
            }
            return [...prev, newItem];
        }
    });

    closeProductDetails();
  };

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

  const currentSelectedAddress = userAddresses.find(addr => addr.id === selectedAddressId);

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-24">
      <div className="max-w-md mx-auto relative bg-white shadow-lg">
        
        <div className="w-full h-40 bg-gray-200 relative overflow-hidden">
           {store.coverUrl ? (
               <img src={store.coverUrl} alt="Capa" className="w-full h-full object-cover" />
           ) : (
               <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white">
                   Capa da Loja
               </div>
           )}
           <button className="absolute top-4 right-4 bg-gray-800/50 backdrop-blur-sm text-white p-2 rounded-full shadow-md hover:bg-gray-700/70 transition-colors">
                <X className="w-5 h-5" />
           </button>
        </div>

        <div className="absolute top-28 left-1/2 -translate-x-1/2 w-28 h-28 bg-white rounded-full shadow-xl p-1 border border-gray-100 flex items-center justify-center z-20">
            <div className="w-full h-full rounded-full overflow-hidden bg-gray-50 flex items-center justify-center">
                {store.logoUrl ? (
                    <img src={store.logoUrl} className="w-full h-full object-cover" /> 
                ) : (
                    <span className="text-2xl font-bold text-gray-400">{store.name ? store.name[0] : ''}</span>
                )}
            </div>
        </div>

        <div className="px-4 pt-16 pb-4">
            
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mb-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${isStoreCurrentlyOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={`text-sm font-semibold ${isStoreCurrentlyOpen ? 'text-green-700' : 'text-red-700'}`}>
                        {isStoreCurrentlyOpen ? 'Loja aberta' : 'Loja fechada'}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    <span className="leading-none">45 a 55 min</span>
                </div>
                <button className="flex items-center gap-1 text-gray-600 text-sm font-medium hover:text-gray-800 transition-colors">
                    <Info className="w-4 h-4" />
                    <span>Info</span>
                </button>
            </div>

            <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{store.name || 'Nome da Loja'}</h1>
                <div className="flex items-center justify-center gap-1 text-gray-500 text-sm mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[250px] md:max-w-md">{store.address || 'Endereço não informado'}</span>
                </div>
            </div>

            <div className="flex flex-col gap-4 mb-8">
                <div className="flex overflow-x-auto pb-2 scrollbar-hide gap-2">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                            ${false ? 'bg-yellow-400 text-gray-900 shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        Todas as Categorias
                    </button>
                    {groups.map(group => (
                        <button
                            key={group.id}
                            onClick={() => setSelectedCategory(group.id!)}
                            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                                ${false ? 'bg-yellow-400 text-gray-900 shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            {group.name}
                        </button>
                    ))}
                </div>
                <div className="relative w-full">
                    <input 
                        type="text" 
                        placeholder="Buscar..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-100 focus:border-gray-400 shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
            </div>

            {featuredProducts.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /> Produtos em Destaque
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                        {featuredProducts.map(product => (
                            <div key={product.id} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4 shadow-sm hover:shadow-md transition-all group">
                                <div className="w-28 h-28 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative flex items-center justify-center">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    ) : (
                                        <span className="text-gray-400 text-xs text-center p-2">Sem Imagem</span>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between py-1">
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 line-clamp-1 leading-tight">{product.name}</h3>
                                        {product.description && (
                                            <p className="text-xs font-bold text-gray-500 mt-1.5">{product.description}</p> 
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="text-base font-bold text-green-600">
                                            R$ {product.price.toFixed(2)}
                                        </span>
                                        <button 
                                            onClick={() => product.options && product.options.length > 0 ? openProductDetails(product) : addToCart(product)}
                                            className="bg-yellow-400 text-gray-900 text-xs font-bold px-4 py-2 rounded-lg shadow-lg hover:bg-yellow-500 transition-all active:scale-[0.98]"
                                            disabled={!isStoreCurrentlyOpen}
                                        >
                                            {product.options && product.options.length > 0 ? 'Ver Opções' : 'Adicionar'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-8">
                {productsByGroup.length === 0 && featuredProducts.length === 0 ? (
                    <div className="text-center text-gray-500 p-8 bg-white rounded-xl shadow-xl border border-gray-100">
                        Nenhum produto encontrado. Configure sua loja no painel administrativo.
                    </div>
                ) : (
                    productsByGroup.map((groupData) => (
                        <div key={groupData.group.id} id={`cat-${groupData.group.id}`} className="scroll-mt-32">
                            <h2 className="text-base font-bold text-gray-900 mb-4">
                                {groupData.group.name}
                            </h2>
                            
                            <div className="grid grid-cols-1 gap-4">
                                {groupData.items.map(product => (
                                    <div key={product.id} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4 shadow-sm hover:shadow-md transition-all group">
                                        <div className="w-28 h-28 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative flex items-center justify-center">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            ) : (
                                                <span className="text-gray-400 text-xs text-center p-2">Sem Imagem</span>
                                            )}
                                        </div>

                                        <div className="flex-1 flex flex-col justify-between py-1">
                                            <div>
                                                <h3 className="text-base font-bold text-gray-900 line-clamp-1 leading-tight">{product.name}</h3>
                                                {product.description && (
                                                    <p className="text-xs font-bold text-gray-500 mt-1.5">{product.description}</p> 
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center justify-between mt-3">
                                                <span className="text-base font-bold text-green-600">
                                                    R$ {product.price.toFixed(2)}
                                                </span>
                                                <button 
                                                    onClick={() => product.options && product.options.length > 0 ? openProductDetails(product) : addToCart(product)}
                                                    className="bg-yellow-400 text-gray-900 text-xs font-bold px-4 py-2 rounded-lg shadow-lg hover:bg-yellow-500 transition-all active:scale-[0.98]"
                                                    disabled={!isStoreCurrentlyOpen}
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
            
            <div className="h-10"></div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-5px_20px_rgba(0,0,0,0.03)] z-40">
          <div className="max-w-md mx-auto flex justify-around items-center h-16 px-6">
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
                  <History className="w-5 h-5" />
                  <span className="text-[10px] font-bold">Histórico</span>
              </button>

              <button className="flex flex-col items-center justify-center text-gray-400 hover:text-gray-800 gap-1 w-16">
                  <Tag className="w-5 h-5" />
                  <span className="text-[10px] font-bold">Descontos</span>
              </button>

              <button className="flex flex-col items-center justify-center text-gray-400 hover:text-gray-800 gap-1 w-16">
                  <User className="w-5 h-5" />
                  <span className="text-[10px] font-bold">Perfil</span>
              </button>
          </div>
      </div>

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
                                <div key={item.cartItemId} className="flex gap-4"> {/* Usar cartItemId como key */}
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
                                            <span className="font-bold text-sm text-green-600 ml-auto">
                                                R$ {calculateItemTotalPrice(item).toFixed(2)}
                                            </span>
                                            {/* NOVO: Botão de Editar Item */}
                                            <button 
                                                onClick={() => {
                                                    const originalProduct = products.find(p => p.id === item.id);
                                                    if (originalProduct) {
                                                        openProductDetails(originalProduct, item);
                                                        setIsCartOpen(false); // Fecha o carrinho para abrir o modal de detalhes
                                                    } else {
                                                        showError("Produto original não encontrado para edição.");
                                                    }
                                                }}
                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transform active:scale-95 shadow-sm"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    {cart.length > 0 && (
                        <div className="p-5 border-t border-gray-100 bg-gray-50">
                            {/* Seção de Endereço */}
                            <div className="mb-4 p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold text-gray-800">Endereço de Entrega</h3>
                                    <button 
                                        onClick={() => setIsAddressManagerModalOpen(true)} // Abre o novo modal de gerenciamento
                                        className="text-xs font-medium flex items-center gap-1 text-blue-600 hover:underline"
                                    >
                                        <Edit className="w-3 h-3" /> {currentSelectedAddress ? 'Editar/Mudar' : 'Adicionar'}
                                    </button>
                                </div>
                                {currentSelectedAddress ? (
                                    <p className="text-sm text-gray-600">
                                        {currentSelectedAddress.street}, {currentSelectedAddress.number} - {currentSelectedAddress.neighborhood}, {currentSelectedAddress.city}
                                        {currentSelectedAddress.complement && `, ${currentSelectedAddress.complement}`}
                                        {currentSelectedAddress.reference && ` (Ref: ${currentSelectedAddress.reference})`}
                                    </p>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">Nenhum endereço selecionado. Clique em "Adicionar" para informar.</p>
                                )}
                            </div>

                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-medium text-gray-500">Total do Pedido</span>
                                <span className="text-xl font-extrabold text-green-600">R$ {cart.reduce((acc, item) => acc + calculateItemTotalPrice(item), 0).toFixed(2)}</span>
                            </div>
                            <button 
                                onClick={handleCheckout}
                                className="w-full text-white py-4 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                style={{ backgroundColor: store.primaryColor }}
                                disabled={!isStoreCurrentlyOpen || !currentSelectedAddress}
                            >
                                Finalizar Pedido
                                <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
      
      {selectedProductForDetails && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeProductDetails}></div>
            <div className="bg-white rounded-2xl w-full max-w-md relative z-10 p-6 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4 flex-shrink-0">
                    <h3 className="font-bold text-xl text-gray-900">{selectedProductForDetails.name}</h3>
                    <button onClick={closeProductDetails} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-50"><X className="w-5 h-5"/></button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                    <div className="w-full h-40 bg-gray-100 rounded-lg overflow-hidden mb-4 flex items-center justify-center">
                        {selectedProductForDetails.image_url ? (
                            <img src={selectedProductForDetails.image_url} alt={selectedProductForDetails.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-gray-400 text-sm text-center p-2">Sem Imagem</span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{selectedProductForDetails.description}</p>
                    <p className="text-lg font-bold text-green-600 mb-6">Preço Base: R$ {selectedProductForDetails.price.toFixed(2)}</p>

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

                                    const isAddDisabled = totalSelectedInOption >= option.maxSelection;
                                    const isCheckboxRadioDisabled = !option.allowRepeat && currentQuantity === 0 && totalSelectedInOption >= option.maxSelection;

                                    return (
                                        <div 
                                            key={subProduct.id} 
                                            className={`flex items-center justify-between bg-white p-3 rounded-md border border-gray-100 transition-opacity duration-200 
                                                ${(isAddDisabled && currentQuantity === 0) || (isCheckboxRadioDisabled && currentQuantity === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <div className={`flex items-center flex-1 ${((isAddDisabled && currentQuantity === 0) || (isCheckboxRadioDisabled && currentQuantity === 0)) ? '' : 'cursor-pointer'}`} onClick={() => {
                                                if (!option.allowRepeat && !isCheckboxRadioDisabled) {
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
                                                        disabled={isCheckboxRadioDisabled}
                                                    />
                                                )}
                                                {!option.allowRepeat && option.maxSelection > 1 && (
                                                    <input 
                                                        type="checkbox" 
                                                        checked={currentQuantity > 0}
                                                        onChange={() => handleTempSubProductChange(option.id, subProduct.id, currentQuantity > 0 ? -1 : 1)}
                                                        className="form-checkbox h-4 w-4 rounded focus:ring-yellow-500 shadow-sm"
                                                        style={{ color: store.primaryColor }}
                                                        disabled={isCheckboxRadioDisabled}
                                                    />
                                                )}
                                                <div className={`${((isAddDisabled && currentQuantity === 0) || (isCheckboxRadioDisabled && currentQuantity === 0)) ? 'text-gray-400' : ''}`}>
                                                    <span className="text-sm font-medium">{subProduct.name}</span>
                                                    {subProduct.description && (
                                                        <p className="text-xs line-clamp-1">{subProduct.description}</p> 
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                {subProduct.price > 0 && (
                                                    <span className="text-sm font-bold text-green-600">
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
                                                            disabled={isAddDisabled}
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
                        className="relative overflow-hidden group w-full text-white py-3 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-colors active:scale-[0.98]"
                        style={{ backgroundColor: store.primaryColor }}
                        disabled={!isStoreCurrentlyOpen}
                    >
                        {editingCartItemId ? 'Atualizar Item' : 'Adicionar ao Carrinho'} - R$ {calculateCurrentModalProductPrice().toFixed(2)}
                        <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Address Manager Modal */}
      <AddressManagerModal
        isOpen={isAddressManagerModalOpen}
        onClose={() => {
          setIsAddressManagerModalOpen(false);
          // Re-load addresses to ensure UI is updated after changes in modal
          const updatedAddresses = storageService.getAddresses();
          setUserAddresses(updatedAddresses);
          // If no address is selected, try to select the default or first one
          if (!selectedAddressId && updatedAddresses.length > 0) {
            const defaultAddr = updatedAddresses.find(addr => addr.isDefault);
            setSelectedAddressId(defaultAddr ? defaultAddr.id : updatedAddresses[0].id);
          } else if (selectedAddressId && !updatedAddresses.some(addr => addr.id === selectedAddressId)) {
            // If previously selected address was deleted, select default or first
            const defaultAddr = updatedAddresses.find(addr => addr.isDefault);
            setSelectedAddressId(defaultAddr ? defaultAddr.id : (updatedAddresses.length > 0 ? updatedAddresses[0].id : null));
          }
        }}
        onAddressSelected={(id) => {
          setSelectedAddressId(id);
          setIsAddressManagerModalOpen(false); // Close after selection
        }}
        currentSelectedAddressId={selectedAddressId}
      />

    </div>
  );
};
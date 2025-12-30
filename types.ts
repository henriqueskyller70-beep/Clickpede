export enum Category {
  FOOD = 'Alimentos',
  CLOTHING = 'Roupas',
  PHARMACY = 'Farmácia',
  ELECTRONICS = 'Eletrônicos',
  OTHER = 'Outros'
}

export interface SubProduct {
  id: string;
  name: string;
  description?: string; // NOVO: Descrição para o sub-produto
  price: number; // Preço adicional para o sub-produto
  imageUrl?: string;
  isActive: boolean;
}

export interface Option {
  id: string;
  title: string;
  minSelection: number;
  maxSelection: number;
  allowRepeat: boolean;
  subProducts: SubProduct[];
  isActive: boolean; // Para ativar/desativar todos os sub-produtos de uma opção
}

export interface Product {
  id?: string; // Alterado para opcional
  name: string;
  description: string;
  price: number;
  category: Category; // Mantido, mas o group_id será o principal para organização no painel
  image_url: string; // Alterado de imageUrl para image_url
  stock: number;
  group_id: string; // Alterado de groupId para group_id
  options: Option[]; // Novo: Opções de personalização do produto
}

export interface Group {
  id?: string; // Changed to optional
  name: string;
  order_index: number; // New: Order index for sorting
}

export interface StoreProfile {
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor?: string; // Nova propriedade para a cor secundária
  logoUrl?: string; // Tornando logoUrl opcional para corresponder ao esquema do DB
  coverUrl?: string; // Nova capa
  address?: string; // Endereço da loja
  phone?: string;   // Contato
}

export interface CartItem extends Product {
  quantity: number;
  selectedOptions?: { optionId: string; subProductId: string; quantity: number }[]; // Para itens do carrinho com opções
}

export interface Address {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  complement?: string;
  reference?: string;
}

export interface Order {
  id: string;
  customerName: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'preparing' | 'delivered';
  date: string;
}

// Novas interfaces para o horário de funcionamento
export interface DailySchedule {
  day: string; // Ex: 'Segunda-feira'
  isOpen: boolean;
  openTime: string; // Ex: '09:00'
  closeTime: string; // Ex: '18:00'
}

export interface StoreSchedule {
  isAlwaysOpen: boolean;
  dailySchedules: DailySchedule[];
  reopenAt?: string | null; // Nova propriedade para o horário de reabertura automática
  isTemporarilyClosedIndefinidamente?: boolean; // Nova propriedade para fechamento temporário indefinido
}
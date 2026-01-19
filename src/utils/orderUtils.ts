import { Order } from '../../types';

export const translateOrderStatus = (status: Order['status']): string => {
  switch (status) {
    case 'pending':
      return 'Pendente';
    case 'preparing':
      return 'Preparando';
    case 'in_transit':
      return 'Em Rota';
    case 'delivered':
      return 'Entregue';
    case 'rejected':
      return 'Rejeitado';
    case 'trashed':
      return 'Lixeira';
    default:
      return status; // Retorna o status original se não houver tradução
  }
};
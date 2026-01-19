"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Order, StoreProfile, NewOrderNotificationType, NotificationContextType } from '../../types';
import { storageService } from '../../services/storageService';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingNewOrders, setPendingNewOrders] = useState<NewOrderNotificationType[]>([]);
  const [storeProfile, setStoreProfile] = useState<StoreProfile | null>(null);
  const newOrderSoundRef = useRef<HTMLAudioElement>(null);
  const soundRepeatIntervalId = useRef<NodeJS.Timeout | null>(null);

  const session = supabase.auth.getSession(); // Get session to determine userId

  const userId = session?.data?.session?.user?.id;

  // Load store profile for sound settings
  useEffect(() => {
    const loadStoreProfile = async () => {
      if (userId) {
        const profile = await storageService.getStoreProfile(supabase, userId);
        setStoreProfile(profile);
      } else {
        setStoreProfile(null);
      }
    };
    loadStoreProfile();
  }, [userId]);

  // Realtime subscription for new orders
  useEffect(() => {
    if (!userId) {
      console.log('[NotificationContext] userId não disponível, pulando configuração do Realtime.');
      return;
    }

    console.log('[NotificationContext] Configurando Realtime para pedidos com userId:', userId);

    const ordersChannel = supabase
      .channel('new_orders_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[NotificationContext] Novo pedido recebido via Realtime:', payload);
          const newOrderData = payload.new as Order;
          const newNotification: NewOrderNotificationType = {
            orderId: newOrderData.id,
            customerName: newOrderData.customer_name,
            date: newOrderData.order_date,
          };

          setPendingNewOrders(prev => {
            if (!prev.some(n => n.orderId === newNotification.orderId)) {
              return [...prev, newNotification];
            }
            return prev;
          });
        }
      )
      .subscribe();

    // Also subscribe to UPDATE events to remove notifications if order status changes
    const updateChannel = supabase
      .channel('order_updates_channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updatedOrder = payload.new as Order;
          if (updatedOrder.status !== 'pending') {
            setPendingNewOrders(prev => prev.filter(n => n.orderId !== updatedOrder.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const deletedOrderId = payload.old.id as string;
          setPendingNewOrders(prev => prev.filter(n => n.orderId !== deletedOrderId));
        }
      )
      .subscribe();

    return () => {
      console.log('[NotificationContext] Desinscrevendo do Realtime de pedidos.');
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(updateChannel);
    };
  }, [userId]);

  // Sound management for new orders
  useEffect(() => {
    if (!storeProfile || !newOrderSoundRef.current) return;

    const hasPending = pendingNewOrders.length > 0;

    if (hasPending && !soundRepeatIntervalId.current) {
      // Start playing sound
      newOrderSoundRef.current.src = `/sounds/${storeProfile.notificationSound}`;
      newOrderSoundRef.current.volume = storeProfile.notificationVolume;
      newOrderSoundRef.current.loop = storeProfile.repeatNotificationSound;
      newOrderSoundRef.current.play().catch(e => console.error("Erro ao iniciar som de notificação:", e));

      if (storeProfile.repeatNotificationSound) {
        // If repeating, set an interval to re-check and ensure it's playing
        soundRepeatIntervalId.current = setInterval(() => {
          if (pendingNewOrders.length === 0) {
            clearInterval(soundRepeatIntervalId.current!);
            soundRepeatIntervalId.current = null;
            newOrderSoundRef.current?.pause();
            newOrderSoundRef.current?.load();
          } else if (newOrderSoundRef.current?.paused) {
            newOrderSoundRef.current?.play().catch(e => console.error("Erro ao reiniciar som de notificação:", e));
          }
        }, 5000); // Check every 5 seconds
      }
    } else if (!hasPending && soundRepeatIntervalId.current) {
      // Stop playing sound
      clearInterval(soundRepeatIntervalId.current);
      soundRepeatIntervalId.current = null;
      newOrderSoundRef.current?.pause();
      newOrderSoundRef.current?.load();
    }

    return () => {
      if (soundRepeatIntervalId.current) {
        clearInterval(soundRepeatIntervalId.current);
        soundRepeatIntervalId.current = null;
      }
      newOrderSoundRef.current?.pause();
      newOrderSoundRef.current?.load();
    };
  }, [pendingNewOrders, storeProfile]);

  const dismissNotification = (orderId: string) => {
    setPendingNewOrders(prev => prev.filter(n => n.orderId !== orderId));
  };

  const contextValue: NotificationContextType = {
    pendingNewOrders,
    dismissNotification,
    storeProfile,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      <audio ref={newOrderSoundRef} preload="auto" type="audio/mpeg" />
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
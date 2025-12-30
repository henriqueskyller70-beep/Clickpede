"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client'; // Importar o cliente Supabase

interface SessionContextType {
  session: Session | null;
  supabase: SupabaseClient;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      console.log('🔑 Processando callback OAuth...');
      console.log('Supabase client instance:', supabase);
      console.log('Supabase auth object:', supabase.auth);

      // Check if getSessionFromUrl exists before calling it
      if (typeof supabase.auth.getSessionFromUrl !== 'function') {
        console.error('ERRO: supabase.auth.getSessionFromUrl NÃO é uma função. Isso pode indicar uma versão desatualizada do @supabase/supabase-js ou um problema na inicialização do cliente.');
        console.error('Métodos disponíveis em supabase.auth:', Object.keys(supabase.auth));
        // Attempt to get session using getSession as a fallback, though it won't handle URL parameters
        const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();
        if (getSessionError) {
          console.error('Fallback getSession error:', getSessionError);
        } else {
          setSession(currentSession);
        }
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.getSessionFromUrl({
        storeSession: true,
      });

      if (error) {
        console.error('Erro ao processar OAuth com getSessionFromUrl:', error);
      } else {
        console.log('Sessão OAuth:', data.session);
        setSession(data.session);
      }

      setLoading(false);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    console.log('SessionContextProvider: Rendering loading spinner');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-500"></div>
      </div>
    );
  }

  console.log('SessionContextProvider: Rendering children with session:', session);
  return (
    <SessionContext.Provider value={{ session, supabase }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};
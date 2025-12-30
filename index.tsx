import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SessionContextProvider } from './src/components/SessionContextProvider'; // Importar o provedor de contexto
import { supabase } from './src/integrations/supabase/client'; // Importar o cliente Supabase
import ToastProvider from './src/components/ToastProvider'; // Importar o ToastProvider

// --- START: Lógica de limpeza de hash precoce (com logs detalhados) ---
// A lógica de limpeza de hash foi removida conforme solicitado para permitir que o Supabase processe os tokens OAuth.
// --- END: Lógica de limpeza de hash precoce ---

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ToastProvider /> {/* Adicionado o ToastProvider aqui */}
    <SessionContextProvider>
      <App />
    </SessionContextProvider>
  </React.StrictMode>
);
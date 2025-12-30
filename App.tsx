import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { StoreFront } from './components/StoreFront';
import { RegisterPage } from './src/components/RegisterPage';
import { LoginPage } from './src/components/LoginPage';
import { ProfileSettingsPage } from './src/components/ProfileSettingsPage'; // Importar ProfileSettingsPage
import { ResetPasswordPage } from './src/components/ResetPasswordPage'; // Import ResetPasswordPage
import { Bike, Sandwich, PackageCheck, ChevronRight } from 'lucide-react';
import { useSession } from './src/components/SessionContextProvider';

const App: React.FC = () => {
  console.log('App.tsx: Component rendering'); // Log no início da renderização do componente
  const { session, supabase } = useSession();
  const [route, setRoute] = useState(window.location.hash || '#/');

  // O efeito para lidar com a limpeza inicial do hash foi movido para index.tsx

  useEffect(() => {
    const handleHashChange = () => {
      console.log('App.tsx: Hash changed to:', window.location.hash);
      setRoute(window.location.hash || '#/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.hash = '#/';
  };

  const handleNavigate = (path: string) => {
    window.location.hash = path;
  };

  // Lógica principal de redirecionamento baseada na sessão
  useEffect(() => {
    console.log('App.tsx - Session/Route useEffect triggered');
    console.log('App.tsx - Current session:', session);
    console.log('App.tsx - Current route state:', route);
    console.log('App.tsx - Current window.location.hash (after potential initial clean):', window.location.hash);

    if (session) {
      // Usuário autenticado
      if (route === '#/' || route === '#/register') {
        console.log('App.tsx - Usuário autenticado em rota pública, redirecionando para dashboard.');
        window.location.hash = '#/dashboard';
      }
      // Se estiver em #/dashboard ou #/store, permite.
    } else {
      // Usuário não autenticado
      if (route.startsWith('#/dashboard')) {
        console.log('App.tsx - Usuário não autenticado em rota de dashboard, redirecionando para raiz.');
        window.location.hash = '#/';
      }
      // Se estiver em #/, #/register, ou #/store, permite.
    }
  }, [session, route]);

  // Lógica de Roteamento Simples
  if (route.startsWith('#/store')) {
    return <StoreFront />;
  }

  if (route.startsWith('#/dashboard')) {
    if (!session) {
        return null; // Redirecionado pelo useEffect
    }
    // O Dashboard agora gerencia suas próprias sub-rotas internas
    return <Dashboard onLogout={handleLogout} onNavigate={handleNavigate} />;
  }

  if (route === '#/register') {
    if (session) {
      return null; // Redirecionado pelo useEffect
    }
    return (
      <div className="min-h-screen bg-[#9f1239] flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <RegisterPage />
        </div>
      </div>
    );
  }

  if (route === '#/reset-password') { // New route for password reset
    return <ResetPasswordPage />;
  }

  // Tela de Boas-vindas / Login
  if (!session) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] font-sans overflow-x-hidden">
        {/* Header */}
        <header className="w-full bg-[#1a1a1a] py-4 px-6 md:px-12 flex justify-between items-center fixed top-0 z-50 shadow-md border-b border-gray-800">
          <div className="flex items-center gap-1">
              <h1 className="text-2xl font-bold text-white tracking-tighter">Click <span className="text-yellow-400">PEDE</span></h1>
          </div>
          <div className="flex items-center gap-4">
              <a href="#/" className="text-white bg-transparent border border-gray-600 px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium">
                  Acesse sua conta
              </a>
              <a href="#/register" className="bg-[#2d1a1a] border border-[#4a2b2b] text-white px-4 py-2 rounded-lg hover:bg-[#3d2424] transition-colors text-sm font-medium">
                  Cadastre-se
              </a>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-col md:flex-row min-h-screen pt-20">
          
          {/* Left Side - Hero Content */}
          <div className="flex-1 bg-[#9f1239] text-white p-8 md:p-16 flex flex-col justify-center relative overflow-hidden">
              {/* Background Shape Overlay */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#be123c] rounded-bl-full opacity-50 translate-x-1/2 -translate-y-1/2"></div>
              
              <div className="max-w-xl z-10 mx-auto md:mx-0">
                  <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
                      Entrega Rápida e Segura
                  </h2>
                  <h3 className="text-2xl md:text-3xl font-semibold mb-6 opacity-95">
                      Sua comida favorita na sua porta em minutos
                  </h3>
                  <p className="text-gray-100 text-lg mb-10 leading-relaxed max-w-lg">
                      Peça agora e aproveite as melhores promoções e descontos exclusivos! 
                      Comida quentinha, entregas rápidas e atendimento de qualidade.
                  </p>

                  <div className="flex flex-wrap gap-4 mb-16">
                      <button className="bg-[#1a1a1a] text-white px-6 py-3 rounded-lg font-bold hover:bg-black transition-colors shadow-lg">
                          Planos
                      </button>
                      <button className="bg-[#1a1a1a] text-white px-6 py-3 rounded-lg font-bold hover:bg-black transition-colors shadow-lg">
                          Por que escolher a gente?
                      </button>
                      <a href="#/store" className="bg-white text-[#9f1239] px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors shadow-lg flex items-center gap-2">
                          <Sandwich className="w-5 h-5" /> Peça Agora
                      </a>
                  </div>

                  <div className="flex justify-center md:justify-start gap-8">
                      <div className="bg-[#881337] p-4 rounded-2xl shadow-xl transform hover:scale-110 transition-transform">
                          <Bike className="w-10 h-10 text-yellow-400" />
                      </div>
                      <div className="bg-[#881337] p-4 rounded-2xl shadow-xl transform hover:scale-110 transition-transform">
                          <Sandwich className="w-10 h-10 text-yellow-400" />
                      </div>
                      <div className="bg-[#881337] p-4 rounded-2xl shadow-xl transform hover:scale-110 transition-transform">
                          <PackageCheck className="w-10 h-10 text-yellow-400" />
                      </div>
                  </div>
              </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="md:w-[500px] bg-[#9f1239] md:bg-[#881337] flex items-center justify-center p-8 relative">
               {/* White Card */}
               <LoginPage />
          </div>
        </div>
        
        {/* Footer Strip */}
        <div className="bg-white py-8 px-6 text-center md:flex md:justify-around md:text-left">
           <div className="mb-6 md:mb-0">
               <h4 className="font-bold text-xl text-gray-900 mb-2">Entrega em Minutos</h4>
               <p className="text-gray-600 text-sm max-w-xs mx-auto md:mx-0">Sua qualidade e rapidez garantida para qualquer tipo de pedido.</p>
           </div>
           <div>
               <h4 className="font-bold text-xl text-gray-900 mb-2">Qualidade Garantida</h4>
               <p className="text-gray-600 text-sm max-w-xs mx-auto md:mx-0">Produtos frescos e selecionados para sua melhor experiência.</p>
           </div>
        </div>
      </div>
    );
  }

  // Fallback para usuários autenticados se nenhuma rota específica corresponder
  return null;
};

export default App;
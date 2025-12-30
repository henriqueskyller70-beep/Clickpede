import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { StoreFront } from './components/StoreFront';
import { RegisterPage } from './src/components/RegisterPage';
import { LoginPage } from './src/components/LoginPage';
import { ProfileSettingsPage } from './src/components/ProfileSettingsPage';
import { ResetPasswordPage } from './src/components/ResetPasswordPage';
import { ForgotPasswordPage } from './src/components/ForgotPasswordPage'; // Importar o novo ForgotPasswordPage
import { ShoppingCart, Package, Smartphone, LineChart, Settings } from 'lucide-react';
import { useSession } from './src/components/SessionContextProvider';
import { Modal } from './src/components/ui/Modal'; // Importar o componente Modal

const App: React.FC = () => {
  console.log('App.tsx: Component rendering');
  const { session, supabase } = useSession();
  const [route, setRoute] = useState(window.location.hash || '#/');

  // Estados para controlar a visibilidade dos modais de autenticação
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash || ''; // Use string vazia para 'sem hash'
      setRoute(currentHash);

      // Fechar todos os modais antes de abrir o correto
      setIsRegisterModalOpen(false);
      setIsLoginModalOpen(false);
      setIsForgotPasswordModalOpen(false);

      // Abrir modal específico baseado no hash
      if (currentHash === '#/register') {
        setIsRegisterModalOpen(true);
      } else if (currentHash === '#/forgot-password') {
        setIsForgotPasswordModalOpen(true);
      }
      // REMOVIDO: Abertura automática do modal de login para '#/'
      // O modal de login agora será aberto APENAS pelo clique no botão 'Login'
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Chamar uma vez na montagem para definir o estado inicial do modal
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
      if (route === '#/' || route === '#/register' || route === '#/forgot-password' || route === '#/reset-password') {
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
      // Se estiver em #/store ou #/reset-password, permite.
      // As rotas #/, #/register, #/forgot-password agora abrem modais sobre a landing page.
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
    return <Dashboard onLogout={handleLogout} onNavigate={handleNavigate} />;
  }

  // A página de redefinição de senha é uma página completa, não um modal sobre a landing page
  if (route === '#/reset-password') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <ResetPasswordPage />
        </div>
      </div>
    );
  }

  // Tela de Boas-vindas / Landing Page
  return (
    <div className="min-h-screen bg-gray-50 font-sans overflow-x-hidden">
      {/* Header */}
      <header className="w-full bg-white py-4 px-6 md:px-12 flex justify-between items-center fixed top-0 z-50 shadow-md border-b border-gray-200">
        <div className="flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-yellow-500" />
            <h1 className="text-xl font-bold text-gray-900 tracking-tighter">Click<span className="text-yellow-500">Pede</span></h1>
        </div>
        <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium group relative overflow-hidden transform hover:scale-[1.02] hover:shadow-lg">
                Home
                <span className="absolute inset-0 bg-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
            </a>
            <a href="#" className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium group relative overflow-hidden transform hover:scale-[1.02] hover:shadow-lg">
                Funcionalidades
                <span className="absolute inset-0 bg-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
            </a>
            <a href="#" className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium group relative overflow-hidden transform hover:scale-[1.02] hover:shadow-lg">
                Planos
                <span className="absolute inset-0 bg-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
            </a>
            <a href="#" className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium group relative overflow-hidden transform hover:scale-[1.02] hover:shadow-lg">
                Sobre nós
                <span className="absolute inset-0 bg-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></span>
            </a>
            <a href="#/register" className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-lg hover:bg-yellow-500 transition-colors text-sm font-medium shadow-md transform active:scale-95">
                Cadastre-se
            </a>
            {/* Botão Login agora abre o modal diretamente */}
            <button 
                onClick={() => setIsLoginModalOpen(true)} 
                className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-black transition-colors text-sm font-medium shadow-md transform active:scale-95"
            >
                Login
            </button>
        </nav>
      </header>

      {/* Main Content - Hero Section */}
      <main className="flex flex-col items-center justify-center text-center pt-32 pb-16 px-4 md:px-8">
        <h2 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight max-w-4xl">
          Seu negócio online em minutos com <span className="text-yellow-500">ClickPede!</span>
        </h2>
        <p className="text-lg md:text-xl text-gray-700 mb-10 max-w-3xl">
          Crie seu cardápio digital, receba pedidos pelo WhatsApp e gerencie suas vendas de forma simples e eficiente.
        </p>
        <p className="text-gray-600 text-sm mb-8">
          Assista ao nosso vídeo demonstrativo para ver como funciona!
        </p>
        {/* Video Demonstrativo */}
        <div className="w-full max-w-4xl rounded-xl shadow-xl overflow-hidden aspect-video mb-12">
          <iframe
            width="100%"
            height="100%"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?si=y_y_y_y_y_y_y_y_y" // Exemplo de vídeo do YouTube
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          ></iframe>
        </div>

        {/* Botão Falar com Especialista */}
        <button className="bg-yellow-400 text-gray-900 font-bold px-8 py-3 rounded-full shadow-lg hover:bg-yellow-500 transition-colors transform active:scale-95 mb-20">
          Falar com Especialista
        </button>

        {/* Seção "Por que escolher o ClickPede?" */}
        <section className="w-full max-w-5xl mx-auto py-16">
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            Por que escolher o <span className="text-yellow-500">ClickPede?</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Cardápio Digital Personalizado */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 flex flex-col items-center text-center transform hover:scale-[1.02] hover:shadow-xl transition-all duration-200">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4 shadow-md">
                <Package className="w-8 h-8 text-yellow-600" />
              </div>
              <h4 className="font-bold text-lg text-gray-900 mb-2">Cardápio Digital Personalizado</h4>
              <p className="text-sm text-gray-600">
                Crie um cardápio online com fotos, descrições e preços, fácil de atualizar a qualquer momento.
              </p>
            </div>

            {/* Card 2: Pedidos via WhatsApp */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 flex flex-col items-center text-center transform hover:scale-[1.02] hover:shadow-xl transition-all duration-200">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4 shadow-md">
                <Smartphone className="w-8 h-8 text-yellow-600" />
              </div>
              <h4 className="font-bold text-lg text-gray-900 mb-2">Pedidos via WhatsApp</h4>
              <p className="text-sm text-gray-600">
                Receba pedidos diretamente no seu WhatsApp, simplificando a comunicação com seus clientes.
              </p>
            </div>

            {/* Card 3: Aumente suas Vendas */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 flex flex-col items-center text-center transform hover:scale-[1.02] hover:shadow-xl transition-all duration-200">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4 shadow-md">
                <LineChart className="w-8 h-8 text-yellow-600" />
              </div>
              <h4 className="font-bold text-lg text-gray-900 mb-2">Aumente suas Vendas</h4>
              <p className="text-sm text-gray-600">
                Alcance mais clientes e impulsione suas vendas com uma presença online profissional e eficiente.
              </p>
            </div>

            {/* Card 4: Gestão Simplificada */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 flex flex-col items-center text-center transform hover:scale-[1.02] hover:shadow-xl transition-all duration-200">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4 shadow-md">
                <Settings className="w-8 h-8 text-yellow-600" />
              </div>
              <h4 className="font-bold text-lg text-gray-900 mb-2">Gestão Simplificada</h4>
              <p className="text-sm text-gray-600">
                Gerencie seus pedidos, clientes e produtos de forma intuitiva e organizada, sem complicação.
              </p>
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer de Copyright */}
      <footer className="w-full bg-white py-6 text-center text-gray-500 text-sm border-t border-gray-100 shadow-inner">
        © 2025 ClickPede. Todos os direitos reservados.
      </footer>

      {/* Modais de Autenticação */}
      {isRegisterModalOpen && (
        <Modal open={isRegisterModalOpen} onClose={() => { setIsRegisterModalOpen(false); window.history.replaceState(null, '', window.location.pathname + window.location.search); }} title="Crie sua Conta">
          <RegisterPage 
            onClose={() => { setIsRegisterModalOpen(false); window.history.replaceState(null, '', window.location.pathname + window.location.search); }}
            onSwitchToLogin={() => { setIsRegisterModalOpen(false); setIsLoginModalOpen(true); window.location.hash = '#/'; }}
          />
        </Modal>
      )}
      {isLoginModalOpen && (
        <Modal open={isLoginModalOpen} onClose={() => { setIsLoginModalOpen(false); window.history.replaceState(null, '', window.location.pathname + window.location.search); }} title="Acesse sua Conta">
          <LoginPage 
            onClose={() => { setIsLoginModalOpen(false); window.history.replaceState(null, '', window.location.pathname + window.location.search); }}
            onSwitchToRegister={() => { setIsLoginModalOpen(false); setIsRegisterModalOpen(true); window.location.hash = '#/register'; }}
            onSwitchToForgotPassword={() => { setIsLoginModalOpen(false); setIsForgotPasswordModalOpen(true); window.location.hash = '#/forgot-password'; }}
          />
        </Modal>
      )}
      {isForgotPasswordModalOpen && (
        <Modal open={isForgotPasswordModalOpen} onClose={() => { setIsForgotPasswordModalOpen(false); window.history.replaceState(null, '', window.location.pathname + window.location.search); }} title="Esqueceu sua Senha?">
          <ForgotPasswordPage 
            onClose={() => { setIsForgotPasswordModalOpen(false); window.history.replaceState(null, '', window.location.pathname + window.location.search); }}
            onSwitchToLogin={() => { setIsForgotPasswordModalOpen(false); setIsLoginModalOpen(true); window.location.hash = '#/'; }}
          />
        </Modal>
      )}
    </div>
  );
};

export default App;
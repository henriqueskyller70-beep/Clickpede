import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { StoreFront } from './components/StoreFront';
import { RegisterPage } from './src/components/RegisterPage';
import { LoginPage } from './src/components/LoginPage';
import { ProfileSettingsPage } from './src/components/ProfileSettingsPage'; // Importar ProfileSettingsPage
import { ResetPasswordPage } from './src/components/ResetPasswordPage'; // Import ResetPasswordPage
import { Bike, Sandwich, PackageCheck, ChevronRight, ShoppingCart } from 'lucide-react'; // Added ShoppingCart for logo
import { useSession } from './src/components/SessionContextProvider';

const App: React.FC = () => {
  console.log('App.tsx: Component rendering'); // Log no início da renderização do componente
  const { session, supabase } = useSession();
  const [route, setRoute] = useState(window.location.hash || '#/');

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
      if (route === '#/' || route === '#/register' || route === '#/forgot-password' || route === '#/reset-password') { // Include forgot-password and reset-password
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
      // Se estiver em #/, #/register, #/store, #/forgot-password, #/reset-password, permite.
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

  // Renderiza LoginPage, RegisterPage, ResetPasswordPage com um layout mais genérico
  const renderAuthPage = (AuthComponent: React.FC) => {
    if (session) {
      return null; // Redirecionado pelo useEffect
    }
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8"> {/* Changed background to light gray */}
        <div className="w-full max-w-md">
          <AuthComponent />
        </div>
      </div>
    );
  };

  if (route === '#/register') {
    return renderAuthPage(RegisterPage);
  }

  if (route === '#/reset-password') {
    return renderAuthPage(ResetPasswordPage);
  }

  if (route === '#/forgot-password') { // Add a route for forgot password
    // Need to create a ForgotPasswordPage component
    // For now, I'll just redirect to login or handle it within LoginPage
    // Let's add a simple ForgotPasswordPage for now.
    return renderAuthPage(() => {
      const [email, setEmail] = useState('');
      const [loading, setLoading] = useState(false);
      const [message, setMessage] = useState('');
      const [error, setError] = useState('');

      const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
          await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/#/reset-password`,
          });
          setMessage('Verifique seu e-mail para o link de redefinição de senha.');
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      return (
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full relative z-10">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-6 mt-4">Esqueceu sua Senha?</h2>
          <p className="text-gray-600 text-center mb-6">
            Insira seu e-mail para receber um link de redefinição de senha.
          </p>
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-[#9f1239] focus:outline-none transition-shadow"
                placeholder="seuemail@exemplo.com"
                required
              />
            </div>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-200">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-green-50 text-green-600 text-sm p-3 rounded-md border border-green-200">
                {message}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-[#2d1a1a] text-white font-bold py-3 rounded-lg hover:bg-black transition-all transform active:scale-95 shadow-lg"
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Redefinir Senha'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <a href="#/" className="text-sm text-[#9f1239] hover:underline font-medium">
              Voltar para o Login
            </a>
          </div>
        </div>
      );
    });
  }

  // Tela de Boas-vindas / Login (Landing Page)
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans overflow-x-hidden">
        {/* Header */}
        <header className="w-full bg-white py-4 px-6 md:px-12 flex justify-between items-center fixed top-0 z-50 shadow-md border-b border-gray-200">
          <div className="flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-yellow-500" /> {/* Cart icon for logo */}
              <h1 className="text-xl font-bold text-gray-900 tracking-tighter">Click<span className="text-yellow-500">Pede</span></h1>
          </div>
          <nav className="hidden md:flex items-center gap-8">
              <a href="#" className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium">Home</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium">Funcionalidades</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium">Planos</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium">Sobre nós</a>
              <a href="#/" className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-black transition-colors text-sm font-medium shadow-md">
                  Login
              </a>
          </nav>
          {/* Mobile menu button could go here */}
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
          <div className="w-full max-w-4xl rounded-xl shadow-xl overflow-hidden aspect-video">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ?si=y_y_y_y_y_y_y_y_y" {/* Exemplo de vídeo do YouTube */}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          </div>
        </main>
        
        {/* Footer Strip - Removed as it's not in the image and the new design is simpler */}
      </div>
    );
  }

  // Fallback para usuários autenticados se nenhuma rota específica corresponder
  return null;
};

export default App;
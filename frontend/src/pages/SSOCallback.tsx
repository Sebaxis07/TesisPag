import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/AuthStore';
import { Loader2 } from 'lucide-react';

export const SSOCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { initializeSSO } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const userJson = searchParams.get('user');

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        initializeSSO(token, user);
        navigate('/');
      } catch (err) {
        console.error('Error parsing SSO user:', err);
        navigate('/login?error=Payload%20SSO%20inválido');
      }
    } else {
      console.error('SSO parameters missing');
      navigate('/login?error=Autenticación%20SSO%20fallida');
    }
  }, [searchParams, initializeSSO, navigate]);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-xs">
        <Loader2 className="w-10 h-10 text-red-650 animate-spin mx-auto" />
        <h2 className="text-sm font-bold text-zinc-950">Iniciando sesión...</h2>
        <p className="text-xs text-zinc-500 font-medium leading-relaxed">
          Procesando credenciales institucionales y tokens del servidor de identidad centralizado.
        </p>
      </div>
    </div>
  );
};

export default SSOCallback;

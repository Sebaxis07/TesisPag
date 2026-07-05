import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/AuthStore';
import { validateRut, normalizeRut } from '../utils/rutHelper';
import { Shield } from 'lucide-react';

export const Login: React.FC = () => {
  type ViewState = 'login' | 'register' | 'activate';
  const [view, setView] = useState<ViewState>('login');
  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const [searchParams] = useSearchParams();
  const { login, register, activate, isAuthenticated, error, isLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // If there is an error in URL from real Microsoft callback redirect
    const urlError = searchParams.get('error');
    if (urlError) {
      setValidationError(decodeURIComponent(urlError));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!validateRut(rut)) {
      setValidationError('El RUT ingresado no es válido. Formato esperado: 12.345.678-K');
      return;
    }

    const normalizedRut = normalizeRut(rut);

    if (view === 'register') {
      if (!name || !normalizedRut || !password) return;
      const success = await register(name, normalizedRut, password);
      if (success) navigate('/');
    } else if (view === 'activate') {
      if (!normalizedRut || !password || !passwordConfirm) return;
      if (password !== passwordConfirm) {
        setValidationError('Las contraseñas nuevas no coinciden.');
        return;
      }
      const success = await activate(normalizedRut, password);
      if (success) navigate('/');
    } else {
      if (!normalizedRut || !password) return;
      const success = await login(normalizedRut, password);
      if (success) navigate('/');
    }
  };

  const handleSSORedirect = () => {
    // Real Microsoft OAuth 2.0 / Entra ID SSO redirect through backend
    window.location.href = 'http://localhost:5000/api/auth/microsoft';
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Visual top border */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-650 via-zinc-900 to-red-800" />
      
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-lg p-8 shadow-sm relative z-10">
        {/* Branding header */}
        <div className="text-center mb-8">
          <img src="/icon/icon.png" className="w-12 h-12 object-contain mx-auto mb-3" alt="ThesisFlow Logo" />
          <h2 className="text-2xl font-extrabold text-black tracking-tight">
            {view === 'register' && 'Crear una cuenta'}
            {view === 'activate' && 'Activar tu cuenta'}
            {view === 'login' && 'Ingresar a ThesisFlow'}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            {view === 'register' && 'Regístrate para comenzar a gestionar tu proyecto de título'}
            {view === 'activate' && 'Establece tu contraseña para activar tu cuenta pre-registrada'}
            {view === 'login' && 'Introduce tus credenciales para acceder a tu proyecto'}
          </p>
        </div>

        {/* Error notification */}
        {(error || validationError) && (
          <div className="bg-red-50 text-red-600 text-xs p-3 rounded border border-red-150 mb-6 font-medium">
            {error || validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {view === 'register' && (
            <div>
              <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">Nombre Completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">RUT</label>
            <input
              type="text"
              required
              value={rut}
              onChange={e => setRut(normalizeRut(e.target.value))}
              placeholder="12.345.678-K"
              className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">
              {view === 'activate' ? 'Nueva Contraseña' : 'Contraseña'}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
            />
          </div>

          {view === 'activate' && (
            <div>
              <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                required
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white hover:bg-zinc-800 text-sm font-semibold py-2.5 rounded transition-colors disabled:opacity-50 mt-2"
          >
            {isLoading ? 'Cargando...' : view === 'register' ? 'Registrarse' : view === 'activate' ? 'Activar Cuenta' : 'Iniciar Sesión'}
          </button>
        </form>

        {view === 'login' && (
          <div className="mt-4 space-y-3">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-zinc-200"></div>
              <span className="flex-shrink mx-4 text-zinc-400 text-[10px] font-mono uppercase">O ingresar con</span>
              <div className="flex-grow border-t border-zinc-200"></div>
            </div>
            
            <button
              type="button"
              onClick={handleSSORedirect}
              className="w-full bg-red-700 hover:bg-red-800 text-white text-xs font-bold py-2.5 rounded transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Shield className="w-4 h-4 text-white" />
              <span className="font-sans tracking-wide">Acceso Institucional INACAP (SSO)</span>
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-col gap-3 items-center">
          {view === 'login' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setView('activate');
                  setValidationError(null);
                }}
                className="text-xs font-semibold text-black hover:underline transition-colors"
              >
                ¿Primer ingreso? Activa tu cuenta aquí
              </button>
              <button
                type="button"
                onClick={() => {
                  setView('register');
                  setValidationError(null);
                }}
                className="text-xs font-medium text-zinc-500 hover:text-black transition-colors"
              >
                ¿No tienes cuenta? Regístrate aquí
              </button>
            </>
          )}

          {view === 'register' && (
            <button
              type="button"
              onClick={() => {
                setView('login');
                setValidationError(null);
              }}
              className="text-xs font-medium text-zinc-500 hover:text-black transition-colors"
            >
              ¿Ya tienes una cuenta? Inicia sesión
            </button>
          )}

          {view === 'activate' && (
            <button
              type="button"
              onClick={() => {
                setView('login');
                setValidationError(null);
              }}
              className="text-xs font-medium text-zinc-500 hover:text-black transition-colors"
            >
              Volver al inicio de sesión
            </button>
          )}
        </div>
      </div>
      
      {/* Footer Branding credits */}
      <span className="text-[10px] text-zinc-400 font-mono mt-8">
        Sebastian Vasquez · Paolo Grassi · Benjamin Flores · 2026
      </span>
    </div>
  );
};

export default Login;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/AuthStore';
import { validateRut, normalizeRut } from '../utils/rutHelper';

export const Login: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const { login, register, isAuthenticated, error, isLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!validateRut(rut)) {
      setValidationError('El RUT ingresado no es válido. Formato esperado: 12.345.678-K');
      return;
    }

    const normalizedRut = normalizeRut(rut);

    if (isRegister) {
      if (!name || !normalizedRut || !password) return;
      const success = await register(name, normalizedRut, password);
      if (success) navigate('/');
    } else {
      if (!normalizedRut || !password) return;
      const success = await login(normalizedRut, password);
      if (success) navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-lg p-8 shadow-sm">
        {/* Branding header */}
        <div className="text-center mb-8">
          <img src="/icon/icon.png" className="w-12 h-12 object-contain mx-auto mb-3" alt="ThesisFlow Logo" />
          <h2 className="text-2xl font-extrabold text-black tracking-tight">
            {isRegister ? 'Crear una cuenta' : 'Ingresar a ThesisFlow'}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            {isRegister 
              ? 'Regístrate para comenzar a gestionar tu proyecto de título' 
              : 'Introduce tus credenciales para acceder a tu proyecto'}
          </p>
        </div>

        {/* Error notification */}
        {(error || validationError) && (
          <div className="bg-red-50 text-red-600 text-xs p-3 rounded border border-red-150 mb-6 font-medium">
            {error || validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
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
            <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white hover:bg-zinc-800 text-sm font-semibold py-2.5 rounded transition-colors disabled:opacity-50 mt-2"
          >
            {isLoading ? 'Cargando...' : isRegister ? 'Registrarse' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-100 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
            }}
            className="text-xs font-medium text-zinc-500 hover:text-black transition-colors"
          >
            {isRegister 
              ? '¿Ya tienes una cuenta? Inicia sesión' 
              : '¿No tienes cuenta? Registrate aquí'}
          </button>
        </div>
      </div>
      
      {/* Footer Branding credits */}
      <span className="text-[10px] text-zinc-400 font-mono mt-8">
        Sebastian Vasquez · Paolo Grassi · Benjamin Flores · 2026
      </span>
    </div>
  );
};

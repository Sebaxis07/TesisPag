import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/AuthStore';
import { useProjectStore } from '../store/ProjectStore';
import { AlertTriangle, ShieldCheck, ArrowRight, UserPlus, LogIn } from 'lucide-react';

interface InviteData {
  _id: string;
  project: {
    _id: string;
    name: string;
  };
  email: string;
  role: string;
  canComment: boolean;
  expiresAt: string;
}

export const AcceptInvite: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [isJoiningGuest, setIsJoiningGuest] = useState(false);

  const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

  const handleAcceptGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !guestName.trim()) return;
    setIsJoiningGuest(true);
    try {
      const response = await fetch(`${API_URL}/invites/accept-guest/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: guestName.trim() }),
        credentials: 'include'
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('tf_user', JSON.stringify(data.user));
        useAuthStore.setState({
          token: data.accessToken,
          user: data.user,
          isAuthenticated: true,
          isLoading: false
        });
        useProjectStore.getState().selectProject(data.projectId);
        navigate('/');
      } else {
        setErrorMsg(data.message || 'Error al unirse como invitado.');
        setIsJoiningGuest(false);
      }
    } catch (err) {
      setErrorMsg('Error de red al unirse como invitado.');
      setIsJoiningGuest(false);
    }
  };

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${API_URL}/invites/check/${token}`);
        const data = await response.json();
        
        if (response.ok && data.valid) {
          setIsValid(true);
          setInvite(data.invite);
        } else {
          setIsValid(false);
          setErrorMsg(data.message || 'El enlace de invitación no es válido.');
        }
      } catch (err) {
        setIsValid(false);
        setErrorMsg('Error al conectar con el servidor.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setIsAccepting(true);
    try {
      const response = await fetch(`${API_URL}/invites/accept/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...useAuthStore.getState().getAuthHeaders()
        },
        credentials: 'include'
      });
      const data = await response.json();

      if (response.ok) {
        // Redirect to the newly joined project
        navigate('/');
      } else {
        setErrorMsg(data.message || 'Error al aceptar la invitación.');
        setIsAccepting(false);
      }
    } catch (err) {
      setErrorMsg('Error de red al aceptar la invitación.');
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-zinc-100 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-zinc-400">Verificando invitación...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-zinc-100 px-4">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {!isValid ? (
          <div className="text-center">
            <div className="inline-flex p-3 rounded-full bg-red-950/40 border border-red-800/40 text-red-400 mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white mb-2">Invitación Inválida</h2>
            <p className="text-sm text-zinc-400 mb-6">{errorMsg}</p>
            <Link
              to="/"
              className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-all"
            >
              Ir al Inicio
            </Link>
          </div>
        ) : (
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-full bg-indigo-950/40 border border-indigo-800/40 text-indigo-400 mb-4 animate-pulse">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">Invitación Recibida</h2>
              <p className="text-xs text-zinc-400 mt-1">ThesisFlow Collaboration Pipeline</p>
            </div>

            <div className="bg-zinc-950/60 rounded-lg p-4 border border-zinc-800/80 mb-6">
              <div className="text-xs text-zinc-500 font-mono">PROYECTO</div>
              <div className="text-base font-semibold text-white mt-0.5">{invite?.project.name}</div>
              <div className="text-xs text-indigo-400 mt-2 font-medium">
                Rol asignado: {invite?.role} (Observador)
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Permisos: {invite?.canComment ? 'Lectura y Comentarios' : 'Solo Lectura'}
              </div>
            </div>

            {isAuthenticated ? (
              <div className="text-center">
                <p className="text-xs text-zinc-400 mb-4">
                  Has iniciado sesión como <span className="text-zinc-200 font-semibold">{user?.rut}</span>. ¿Quieres unirte a este proyecto ahora?
                </p>
                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold bg-white hover:bg-zinc-200 text-zinc-950 rounded-lg disabled:opacity-50 transition-all font-mono"
                >
                  {isAccepting ? 'Procesando...' : 'Aceptar e Ingresar'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <form onSubmit={handleAcceptGuest} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Nombre para Acceso Directo</label>
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Ej: Prof. Andrés Silva, Evaluador"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-650 focus:outline-none focus:border-zinc-500 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isJoiningGuest}
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg disabled:opacity-50 transition-all font-mono"
                  >
                    {isJoiningGuest ? 'Entrando...' : 'Entrar como Invitado'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-zinc-800"></div>
                  <span className="flex-shrink mx-3 text-[9px] font-mono text-zinc-500 uppercase">o si ya tienes cuenta</span>
                  <div className="flex-grow border-t border-zinc-800"></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/login?mode=register"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-zinc-850 hover:bg-zinc-800 text-white border border-zinc-700 rounded-lg transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    Crear Cuenta
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-white hover:bg-zinc-200 text-zinc-950 rounded-lg transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    Iniciar Sesión
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

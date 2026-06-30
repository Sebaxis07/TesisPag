import React, { useEffect, useState } from 'react';
import { useProjectStore } from '../../store/ProjectStore';
import { useAuthStore } from '../../store/AuthStore';
import { Users, ChevronUp, ChevronDown, Activity, MessageSquare, Clock } from 'lucide-react';

interface PresenceUser {
  _id: string;
  name: string;
  rut: string;
  role: string;
}

interface PresenceSession {
  _id: string;
  user: PresenceUser;
  status: 'Online' | 'Away' | 'Offline';
  currentView?: string;
  lastSeenAt: string;
  lastHeartbeatAt: string;
}

export const PresenceWidget: React.FC<{ onOpenComments: () => void }> = ({ onOpenComments }) => {
  const { activeProject } = useProjectStore();
  const { token, isAuthenticated } = useAuthStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<PresenceSession[]>([]);
  const [unresolvedCount, setUnresolvedCount] = useState(0);

  const API_URL = 'http://localhost:5000/api';

  const getCurrentViewName = (pathname: string) => {
    if (pathname.includes('/arquitectura')) return 'Arquitectura (ADRs)';
    if (pathname.includes('/requerimientos')) return 'Requerimientos';
    if (pathname.includes('/diagramas')) return 'Diagramas de Diseño';
    if (pathname.includes('/reuniones')) return 'Reuniones de Minutas';
    if (pathname.includes('/informes')) return 'Informes Académicos';
    if (pathname.includes('/knowledge-base')) return 'Knowledge Base';
    if (pathname.includes('/stack-comparer')) return 'Comparador de Stacks';
    if (pathname.includes('/audit-logs')) return 'Logs de Auditoría';
    if (pathname === '/') return 'Dashboard Principal';
    return 'Navegando';
  };

  const timeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'ahora';
    if (diffMins < 60) return `hace ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `hace ${diffHours} hr`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `hace ${diffDays} días`;
  };

  useEffect(() => {
    if (!activeProject || !token || !isAuthenticated) return;

    const performSync = async () => {
      try {
        const headers = {
          'Content-Type': 'application/json',
          ...useAuthStore.getState().getAuthHeaders()
        };

        // 1. Send Heartbeat
        const currentView = getCurrentViewName(window.location.pathname);
        await fetch(`${API_URL}/presence/heartbeat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ projectId: activeProject._id, currentView }),
          credentials: 'include'
        });

        // 2. Fetch presence list
        const presRes = await fetch(`${API_URL}/presence/project/${activeProject._id}`, {
          headers,
          credentials: 'include'
        });
        if (presRes.ok) {
          const presData = await presRes.json();
          setSessions(presData);
        }

        // 3. Fetch comments unresolved count
        const commRes = await fetch(`${API_URL}/comments/project/${activeProject._id}`, {
          headers,
          credentials: 'include'
        });
        if (commRes.ok) {
          const commData = await commRes.json();
          const unresolved = commData.filter((c: any) => !c.isResolved).length;
          setUnresolvedCount(unresolved);
        }
      } catch (err) {
        console.error('Error syncing collaboration presence:', err);
      }
    };

    // Run immediately and then every 20 seconds
    performSync();
    const interval = setInterval(performSync, 20000);

    return () => clearInterval(interval);
  }, [activeProject, token, isAuthenticated, window.location.pathname]);

  if (!activeProject || !isAuthenticated) return null;

  const onlineSessions = sessions.filter(s => s.status === 'Online');

  return (
    <div className="fixed bottom-6 right-6 z-40 select-none">
      {isOpen ? (
        <div className="w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col max-h-[400px]">
          {/* Header */}
          <div 
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-between p-4 bg-zinc-950/80 border-b border-zinc-800/80 cursor-pointer hover:bg-zinc-950 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider">Actividad y Presencia</span>
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </div>

          {/* Sessions List */}
          <div className="p-4 overflow-y-auto flex-1 space-y-3.5 max-h-[250px]">
            {sessions.length === 0 ? (
              <div className="text-center text-xs text-zinc-500 py-6">
                Sin actividad reciente registrada.
              </div>
            ) : (
              sessions.map((sess) => {
                const userObj = sess.user || { name: 'Desconocido', rut: '', role: 'Viewer' };
                const isOnline = sess.status === 'Online';
                const isAway = sess.status === 'Away';

                return (
                  <div key={sess._id} className="flex items-start gap-3 text-xs">
                    <div className="relative mt-0.5">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold font-mono text-zinc-300">
                        {userObj.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-zinc-900 ${
                        isOnline ? 'bg-emerald-500' : isAway ? 'bg-amber-500' : 'bg-zinc-600'
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-white truncate">{userObj.name}</span>
                        <span className="text-[10px] text-zinc-500 shrink-0">{userObj.role}</span>
                      </div>
                      
                      {isOnline && sess.currentView && (
                        <p className="text-[10px] text-emerald-400 font-mono mt-0.5 truncate">
                          Viendo: {sess.currentView}
                        </p>
                      )}

                      {!isOnline && (
                        <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 shrink-0" />
                          Último latido: {timeAgo(sess.lastHeartbeatAt)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Actions Footer */}
          <div className="p-3 bg-zinc-950/60 border-t border-zinc-800 flex justify-between gap-2">
            <button
              onClick={onOpenComments}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 rounded-lg border border-zinc-800 transition-all font-mono"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Ver Comentarios
              {unresolvedCount > 0 && (
                <span className="px-1.5 py-0.5 bg-indigo-650 text-white rounded text-[9px] font-bold">
                  {unresolvedCount}
                </span>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-3 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-full shadow-2xl cursor-pointer hover:bg-zinc-850 hover:border-zinc-700 transition-all text-white"
        >
          <div className="relative">
            <Users className="w-4.5 h-4.5 text-zinc-350" />
            {onlineSessions.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-zinc-900 animate-ping" />
            )}
          </div>
          
          <div className="flex items-center gap-1.5 text-xs font-semibold font-mono">
            <span>{onlineSessions.length} en línea</span>
            {unresolvedCount > 0 && (
              <span className="w-4.5 h-4.5 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unresolvedCount}
              </span>
            )}
          </div>
          <ChevronUp className="w-4 h-4 text-zinc-400" />
        </div>
      )}
    </div>
  );
};

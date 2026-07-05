import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/AuthStore';
import { useProjectStore } from '../../store/ProjectStore';
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Settings,
  MessageSquare,
  ClipboardList,
  Cpu,
  Share2,
  FileText,
  LogOut,
  ChevronDown,
  Library,
  Layers,
  History,
  Bell,
  Check,
  Calendar,
  Menu,
  X,
  CheckCircle,
  TrendingUp,
  Archive,
  Sparkles,
  ChevronRight,
  Clock
} from 'lucide-react';
import { PresenceWidget } from '../collaboration/PresenceWidget';
import { CommentsSidebar } from '../collaboration/CommentsSidebar';

interface NotificationItem {
  _id: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export const Layout: React.FC = () => {
  const { user, logout, getAuthHeaders } = useAuthStore();
  const { projects, activeProject, fetchProjects, selectProject } = useProjectStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isTechAuditOpen, setIsTechAuditOpen] = useState(false);
  const [badgeData, setBadgeData] = useState({
    pendingProposals: 0,
    pendingReviews: 0,
    activeProjectRisk: 'Low' as 'Low' | 'Medium' | 'High',
    activeProjectProgress: 0
  });

  const showSupervision = user?.role === 'Docente' || user?.role === 'Evaluador' || user?.role === 'Coordinador';

  const fetchBadgeData = useCallback(async () => {
    if (!showSupervision) return;
    try {
      const headers = getAuthHeaders();
      const res = await fetch('http://localhost:5000/api/projects/advisor/dashboard-summary', { headers });
      if (res.ok) {
        const data = await res.json();
        // Count proposals
        const pendingProposals = data.pendingReviews.filter((r: any) => r.itemType === 'Proposal').length;
        const pendingReviews = data.pendingReviews.filter((r: any) => r.itemType !== 'Proposal').length;

        // Active project health
        let activeProjectRisk = 'Low';
        let activeProjectProgress = 0;
        if (activeProject) {
          const match = data.projects.find((p: any) => p._id.toString() === activeProject._id.toString());
          if (match) {
            activeProjectRisk = match.risk;
            activeProjectProgress = match.progress;
          }
        }

        setBadgeData({
          pendingProposals,
          pendingReviews,
          activeProjectRisk: activeProjectRisk as any,
          activeProjectProgress
        });
      }
    } catch (err) {
      console.error('Error fetching layout badge data:', err);
    }
  }, [showSupervision, activeProject, getAuthHeaders]);

  useEffect(() => {
    fetchBadgeData();
    // Poll every 15 seconds to keep counts fresh
    const interval = setInterval(fetchBadgeData, 15000);
    return () => clearInterval(interval);
  }, [fetchBadgeData]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch('http://localhost:5000/api/notifications', { headers });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Close mobile sidebar on route transition
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Periodic polling for real-time feel (every 10 seconds)
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowBellDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
        method: 'PUT',
        headers
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error('Error reading notification:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch('http://localhost:5000/api/notifications/read-all', {
        method: 'PUT',
        headers
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.isRead) {
      try {
        const headers = getAuthHeaders();
        await fetch(`http://localhost:5000/api/notifications/${n._id}/read`, {
          method: 'PUT',
          headers
        });
        setNotifications(prev => prev.map(item => item._id === n._id ? { ...item, isRead: true } : item));
      } catch (err) {
        console.error(err);
      }
    }
    setShowBellDropdown(false);
    if (n.link) {
      navigate(n.link);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const supervisionItems = [
    { name: 'Propuestas de Tesis', path: '/propuestas', icon: FolderOpen, badge: badgeData.pendingProposals },
    { name: 'Revisiones y Firmas', path: '/aprobaciones', icon: CheckCircle, badge: badgeData.pendingReviews },
    { name: 'Rúbricas y Evaluaciones', path: '/evaluaciones', icon: ClipboardList, badge: 0 }
  ];

  const projectItems = [
    { name: 'Resumen Proyecto', path: '/proyecto', icon: FolderOpen },
    { name: 'Equipo de Trabajo', path: '/equipo', icon: Users },
    ...(user?.role === 'Creador'
      ? [{ name: 'Gestión de Usuarios', path: '/usuarios', icon: Users }]
      : []),
    { name: 'Metodología', path: '/metodologia', icon: Settings },
    { name: 'Reuniones Inteligentes', path: '/reuniones', icon: MessageSquare },
    { name: 'Requerimientos', path: '/requerimientos', icon: ClipboardList },
    { name: 'Arquitectura y ADRs', path: '/arquitectura', icon: Cpu },
    { name: 'Modelador Visual', path: '/diagramas', icon: Share2 },
    { name: 'Informes con IA', path: '/informes', icon: FileText },
    { name: 'Comparador de Stacks', path: '/stack-comparer', icon: Layers },
    { name: 'Observaciones', path: '/observaciones', icon: MessageSquare },
    { name: 'Roadmap y Progreso', path: '/roadmap', icon: TrendingUp },
    { name: 'Gestión Entregables', path: '/entregables', icon: Archive },
    { name: 'Asistente de Defensa', path: '/defensa', icon: Sparkles },
    { name: 'Auditoría', path: '/audit-logs', icon: History }
  ];

  return (
    <div className="flex h-screen bg-white overflow-hidden relative">
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 border-r border-zinc-200 bg-white z-50 flex flex-col justify-between transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:flex'
        }`}>
        <div>
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-zinc-200 justify-between">
            <span className="font-extrabold text-lg tracking-tight flex items-center gap-2.5">
              <img src="/icon/icon.png" className="w-6 h-6 object-contain" alt="ThesisFlow Logo" />
              ThesisFlow
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded font-mono">
                v1.0
              </span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden p-1 text-zinc-400 hover:text-zinc-950 transition-colors"
                title="Cerrar menú"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-8rem)]">
            <div>
              <Link
                to="/"
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${location.pathname === '/'
                    ? 'bg-zinc-950 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                  }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            </div>

            {showSupervision && (
              <div className="space-y-1">
                <span className="px-3 text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Supervisión Académica
                </span>
                <div className="space-y-0.5">
                  {supervisionItems.map(item => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        className={`flex items-center justify-between px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${isActive
                            ? 'bg-zinc-950 text-white'
                            : 'text-zinc-500 hover:bg-zinc-150 hover:text-zinc-950'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-3.5 h-3.5" />
                          <span>{item.name}</span>
                        </div>
                        {item.badge > 0 && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono ${isActive ? 'bg-white text-zinc-950' : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {!showSupervision && (
              <div className="space-y-1">
                <span className="px-3 text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Proceso de Tesis
                </span>
                <div className="space-y-0.5">
                  <Link
                    to="/propuestas"
                    className={`flex items-center gap-3 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${location.pathname === '/propuestas'
                        ? 'bg-zinc-950 text-white'
                        : 'text-zinc-500 hover:bg-zinc-150 hover:text-zinc-950'
                      }`}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Propuesta de Tesis
                  </Link>
                  {activeProject && (
                    <Link
                      to="/evaluaciones"
                      className={`flex items-center gap-3 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${location.pathname === '/evaluaciones'
                          ? 'bg-zinc-950 text-white'
                          : 'text-zinc-500 hover:bg-zinc-150 hover:text-zinc-950'
                        }`}
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      Evaluaciones y Rúbricas
                    </Link>
                  )}
                </div>
              </div>
            )}

            {activeProject && (
              <div className="space-y-3 pt-2">
                {/* Health indicator for active project (Teacher only) */}
                {showSupervision && (
                  <div className="mx-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block">Tesis Activa</span>
                      <span className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badgeData.activeProjectRisk === 'High'
                          ? 'bg-red-50 text-red-750 border border-red-250'
                          : badgeData.activeProjectRisk === 'Medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-250'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-250'
                        }`}>
                        <span className={`w-1 h-1 rounded-full ${badgeData.activeProjectRisk === 'High' ? 'bg-red-500 animate-pulse' : badgeData.activeProjectRisk === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}></span>
                        {badgeData.activeProjectRisk === 'High' ? 'Alto' : badgeData.activeProjectRisk === 'Medium' ? 'Medio' : 'Bajo'}
                      </span>
                    </div>
                    <div>
                      <span className="font-extrabold text-xs text-zinc-950 block truncate" title={activeProject.name}>
                        {activeProject.name}
                      </span>
                      <span className="text-[10px] text-zinc-400 block truncate">{activeProject.companyName || 'Sin Empresa'}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                        <span>Avance</span>
                        <span className="font-bold text-zinc-950">{badgeData.activeProjectProgress}%</span>
                      </div>
                      <div className="w-full bg-zinc-250 h-1 rounded-full overflow-hidden">
                        <div className="bg-zinc-950 h-full transition-all duration-300" style={{ width: `${badgeData.activeProjectProgress}%` }}></div>
                      </div>
                    </div>
                  </div>
                )}

                {!showSupervision ? (
                  <div className="space-y-1">
                    <span className="px-3 text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Workspace Proyecto
                    </span>
                    <div className="space-y-0.5">
                      {projectItems.map(item => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${isActive
                                ? 'bg-zinc-950 text-white'
                                : 'text-zinc-500 hover:bg-zinc-150 hover:text-zinc-950'
                              }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Pedagogical Control section */}
                    <div className="space-y-1">
                      <span className="px-3 text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                        Control Pedagógico
                      </span>
                      <div className="space-y-0.5">
                        {[
                          { name: 'Observaciones de Avance', path: '/observaciones', icon: MessageSquare },
                          { name: 'Asistencia y Minutas', path: '/reuniones', icon: Clock },
                          { name: 'Gestión Entregables', path: '/entregables', icon: Archive }
                        ].map(item => {
                          const isActive = location.pathname === item.path;
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.name}
                              to={item.path}
                              className={`flex items-center gap-3 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${isActive
                                  ? 'bg-zinc-950 text-white'
                                  : 'text-zinc-500 hover:bg-zinc-150 hover:text-zinc-950'
                                }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {item.name}
                            </Link>
                          );
                        })}
                      </div>
                    </div>

                    {/* Technical Audit (Collapsible) */}
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setIsTechAuditOpen(!isTechAuditOpen)}
                        className="w-full px-3 py-1.5 flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase tracking-wider hover:text-zinc-950 transition-colors"
                      >
                        <span>Auditoría Técnica</span>
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isTechAuditOpen ? 'rotate-90 text-zinc-950' : 'text-zinc-400'}`} />
                      </button>

                      {isTechAuditOpen && (
                        <div className="space-y-0.5 pl-2 border-l border-zinc-100 ml-3.5">
                          {projectItems
                            .filter(item => !['Observaciones', 'Reuniones Inteligentes', 'Gestión Entregables'].includes(item.name))
                            .map(item => {
                              const isActive = location.pathname === item.path;
                              const Icon = item.icon;
                              return (
                                <Link
                                  key={item.name}
                                  to={item.path}
                                  className={`flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${isActive
                                      ? 'bg-zinc-950 text-white'
                                      : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950'
                                    }`}
                                >
                                  <Icon className="w-3 h-3" />
                                  {item.name}
                                </Link>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        {/* User Footer Panel */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50">
          <div className="flex items-center justify-between">
            <Link to="/perfil" className="flex items-center gap-2 group min-w-0 flex-1 hover:opacity-85 transition-opacity" title="Ver mi Perfil">
              <div className="w-7 h-7 rounded-full bg-zinc-950 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-zinc-950 truncate group-hover:underline">{user?.name}</span>
                <span className="text-[9px] text-zinc-500 font-mono capitalize">{user?.role}</span>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="p-1.5 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-200 rounded transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-zinc-200 flex items-center justify-between px-4 sm:px-6 md:px-8 bg-white shrink-0 shadow-sm/5 z-30">
          {/* Project Switcher */}
          {projects.length > 0 ? (
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 -ml-1 text-zinc-500 hover:text-zinc-950 md:hidden rounded hover:bg-zinc-50 transition-colors shrink-0"
                title="Abrir menú"
              >
                <Menu className="w-5 h-5" />
              </button>
              <label className="text-[10px] md:text-xs font-mono text-zinc-400 uppercase hidden sm:inline shrink-0">Proyecto:</label>
              <div className="relative min-w-0">
                <select
                  value={activeProject?._id || ''}
                  onChange={e => selectProject(e.target.value)}
                  className="appearance-none bg-zinc-50 border border-zinc-200 rounded-md py-1.5 pl-3 pr-8 text-xs md:text-sm font-medium text-zinc-950 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 w-full max-w-[130px] xs:max-w-[160px] sm:max-w-[220px] md:max-w-xs truncate cursor-pointer"
                >
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-1 text-zinc-500 hover:text-zinc-950 md:hidden rounded hover:bg-zinc-50 transition-colors shrink-0"
              title="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Quick Actions / Status / Profile / Bell Notification */}
          <div className="flex items-center gap-3 sm:gap-4 md:gap-6 shrink-0">
            {/* Status dot */}
            <div className="hidden sm:flex items-center gap-2 bg-zinc-50 border border-zinc-150 py-1 px-2.5 rounded-full select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-mono text-zinc-550 font-bold uppercase">Módulos IA Listos</span>
            </div>

            {/* Notification Bell */}
            {activeProject && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowBellDropdown(!showBellDropdown)}
                  className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors text-zinc-600 hover:text-zinc-900 relative"
                  title="Notificaciones de Equipo"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold font-mono">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Menu */}
                {showBellDropdown && (
                  <div className="absolute -right-10 sm:right-0 mt-2 w-[280px] sm:w-80 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 py-2 max-h-80 overflow-y-auto divide-y divide-zinc-100">
                    <div className="px-4 py-2 flex flex-col gap-1 text-xs font-semibold text-zinc-950 bg-zinc-50/50">
                      <div className="flex items-center justify-between">
                        <span>Bandeja de Notificaciones</span>
                        <span className="text-[10px] bg-zinc-200 text-zinc-700 px-1.5 py-0.5 rounded font-mono">
                          {unreadCount} pendientes
                        </span>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllAsRead}
                          className="text-[10px] text-zinc-500 hover:text-zinc-900 text-left font-mono font-bold hover:underline"
                        >
                          ✓ Marcar todas como leídas
                        </button>
                      )}
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-zinc-400 italic">
                          No tienes notificaciones
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n._id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-3 text-xs leading-normal hover:bg-zinc-50 cursor-pointer transition-colors flex gap-2.5 justify-between items-start ${!n.isRead ? 'bg-zinc-50/70 font-medium' : ''
                              }`}
                          >
                            <div className="space-y-1 pr-2">
                              <p className="text-zinc-800">{n.message}</p>
                              <span className="text-[9px] text-zinc-400 flex items-center gap-1 font-mono">
                                <Calendar className="w-3 h-3" />
                                {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {!n.isRead && (
                              <button
                                onClick={(e) => handleMarkAsRead(n._id, e)}
                                className="text-zinc-400 hover:text-emerald-600 p-1 border border-zinc-200 rounded hover:border-emerald-200 bg-white transition-colors"
                                title="Marcar como leída"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile Avatar / Shortcut */}
            <Link
              to="/perfil"
              className="flex items-center gap-2 p-1.5 hover:bg-zinc-50 rounded-lg transition-all border border-zinc-200/50 bg-zinc-50/20 shrink-0"
              title="Mi Perfil"
            >
              <div className="w-7.5 h-7.5 rounded-full bg-zinc-950 flex items-center justify-center text-white text-[11px] font-black font-mono shadow-sm shrink-0">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-zinc-900 leading-tight truncate max-w-[100px]">{user?.name}</span>
                <span className="text-[9px] text-zinc-400 font-mono capitalize leading-none">{user?.role}</span>
              </div>
            </Link>
          </div>
        </header>

        {/* Content Router Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-zinc-50">
          <Outlet />
        </main>
      </div>

      <PresenceWidget onOpenComments={() => setIsCommentsOpen(true)} />
      <CommentsSidebar isOpen={isCommentsOpen} onClose={() => setIsCommentsOpen(false)} />
    </div>
  );
};

export default Layout;

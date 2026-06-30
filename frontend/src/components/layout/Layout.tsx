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
  Sparkles
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

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!activeProject) return;
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:5000/api/notifications/project/${activeProject._id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [activeProject, getAuthHeaders]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Periodic polling for real-time feel (every 10 seconds)
  useEffect(() => {
    if (activeProject) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [activeProject, fetchNotifications]);

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

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Proyecto y Empresa', path: '/proyecto', icon: FolderOpen },
    { name: 'Equipo', path: '/equipo', icon: Users },
    { name: 'Metodología', path: '/metodologia', icon: Settings },
    { name: 'Reuniones Inteligentes', path: '/reuniones', icon: MessageSquare },
    { name: 'Requerimientos', path: '/requerimientos', icon: ClipboardList },
    { name: 'Arquitectura y ADRs', path: '/arquitectura', icon: Cpu },
    { name: 'Modelador Visual', path: '/diagramas', icon: Share2 },
    { name: 'Informes con IA', path: '/informes', icon: FileText },
    { name: 'Base Documental (RAG)', path: '/knowledge-base', icon: Library },
    { name: 'Comparador de Stacks', path: '/stack-comparer', icon: Layers },
    { name: 'Observaciones', path: '/observaciones', icon: MessageSquare },
    { name: 'Workflow Aprobaciones', path: '/aprobaciones', icon: CheckCircle },
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
      <aside className={`fixed inset-y-0 left-0 w-64 border-r border-zinc-200 bg-white z-50 flex flex-col justify-between transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:flex'
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
          <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
            {menuItems.map(item => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-zinc-950 text-white'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer Panel */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50">
          <div className="flex items-center justify-between">
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-zinc-950 truncate">{user?.name}</span>
              <span className="text-[10px] text-zinc-500 font-mono capitalize">{user?.role}</span>
            </div>
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
        <header className="h-16 border-b border-zinc-200 flex items-center justify-between px-4 md:px-8 bg-white shrink-0">
          {/* Project Switcher */}
          <div className="flex items-center gap-2.5 md:gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-1 text-zinc-500 hover:text-zinc-950 md:hidden rounded hover:bg-zinc-50 transition-colors"
              title="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <label className="text-[10px] md:text-xs font-mono text-zinc-400 uppercase">Proyecto:</label>
            <div className="relative">
              {projects.length > 0 ? (
                <select
                  value={activeProject?._id || ''}
                  onChange={e => selectProject(e.target.value)}
                  className="appearance-none bg-zinc-50 border border-zinc-200 rounded-md py-1.5 pl-3 pr-8 text-xs md:text-sm font-medium text-zinc-950 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                >
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-zinc-500">Sin proyectos creados</span>
              )}
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Quick Actions / Status / Bell Notification */}
          <div className="flex items-center gap-6">
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
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 py-2 max-h-80 overflow-y-auto divide-y divide-zinc-100">
                    <div className="px-4 py-2 flex items-center justify-between text-xs font-semibold text-zinc-950 bg-zinc-50/50">
                      <span>Notificaciones del Proyecto</span>
                      <span className="text-[10px] bg-zinc-200 text-zinc-700 px-1.5 py-0.5 rounded font-mono">
                        {unreadCount} pendientes
                      </span>
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
                            className={`p-3 text-xs leading-normal hover:bg-zinc-50 cursor-pointer transition-colors flex gap-2.5 justify-between items-start ${
                              !n.isRead ? 'bg-zinc-50/70 font-medium' : ''
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

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs text-zinc-500">Módulos IA listos</span>
            </div>
          </div>
        </header>

        {/* Content Router Outlet */}
        <main className="flex-1 overflow-y-auto p-8 bg-zinc-50">
          <Outlet />
        </main>
      </div>

      <PresenceWidget onOpenComments={() => setIsCommentsOpen(true)} />
      <CommentsSidebar isOpen={isCommentsOpen} onClose={() => setIsCommentsOpen(false)} />
    </div>
  );
};

export default Layout;

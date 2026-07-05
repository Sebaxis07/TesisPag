import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/AuthStore';
import { 
  User, Mail, Shield, BookOpen, Clock, Activity, Settings, 
  Bell, Lock, Eye, EyeOff, Save, Globe, Laptop, Check, 
  RefreshCw, Award, Code, CheckSquare, MessageSquare, AlertCircle
} from 'lucide-react';

interface ProjectInfo {
  _id: string;
  name: string;
  role: string;
  workload: number;
  status: string;
  advisorName?: string;
}

export const Profile: React.FC = () => {
  const { user, token, getAuthHeaders, fetchProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'summary' | 'personal' | 'projects' | 'activity' | 'notifications' | 'security' | 'preferences'>('summary');
  
  // Personal Data State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [career, setCareer] = useState(user?.career || '');
  const [biography, setBiography] = useState(user?.biography || '');
  const [interestsInput, setInterestsInput] = useState(user?.interests?.join(', ') || '');
  const [skillsInput, setSkillsInput] = useState(user?.skills?.join(', ') || '');
  const [availability, setAvailability] = useState(user?.availability || '');
  
  // Notifications State
  const [notifComments, setNotifComments] = useState<'immediate' | 'daily' | 'weekly' | 'app' | 'disabled'>(user?.notificationSettings?.comments || 'app');
  const [notifEvaluations, setNotifEvaluations] = useState<'immediate' | 'daily' | 'weekly' | 'app'>(user?.notificationSettings?.evaluations || 'immediate');
  const [notifMilestones, setNotifMilestones] = useState<'immediate' | 'daily' | 'weekly' | 'app'>(user?.notificationSettings?.milestones || 'immediate');
  const [notifMeetings, setNotifMeetings] = useState<'immediate' | 'daily' | 'weekly' | 'app' | 'disabled'>(user?.notificationSettings?.meetings || 'daily');
  const [notifSecurity, setNotifSecurity] = useState<'immediate' | 'daily' | 'weekly' | 'app'>(user?.notificationSettings?.security || 'immediate');
  const [sentEmails, setSentEmails] = useState<any[]>([]);
  const [triggeringDigest, setTriggeringDigest] = useState(false);
  
  // Security State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  
  // Preferences State
  const [theme, setTheme] = useState(user?.preferences?.theme || 'light');
  const [language, setLanguage] = useState(user?.preferences?.language || 'es');
  const [density, setDensity] = useState(user?.preferences?.density || 'normal');
  
  // Operation Statuses
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Projects list state
  const [projects, setProjects] = useState<ProjectInfo[]>([]);

  useEffect(() => {
    fetchProfile();
    fetchUserProjects();
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setCareer(user.career || '');
      setBiography(user.biography || '');
      setInterestsInput(user.interests?.join(', ') || '');
      setSkillsInput(user.skills?.join(', ') || '');
      setAvailability(user.availability || '');
      setNotifComments(user.notificationSettings?.comments || 'app');
      setNotifEvaluations(user.notificationSettings?.evaluations || 'immediate');
      setNotifMilestones(user.notificationSettings?.milestones || 'immediate');
      setNotifMeetings(user.notificationSettings?.meetings || 'daily');
      setNotifSecurity(user.notificationSettings?.security || 'immediate');
      setTheme(user.preferences?.theme || 'light');
      setLanguage(user.preferences?.language || 'es');
      setDensity(user.preferences?.density || 'normal');
    }
  }, [user]);

  const fetchUserProjects = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/projects', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        // Map projects to include current user's role/workload details if available
        const mapped: ProjectInfo[] = data.map((p: any) => {
          const currentMember = p.members?.find((m: any) => m.user?._id === user?._id || m.user === user?._id);
          const advisor = p.members?.find((m: any) => m.user?.role === 'Docente' || m.user?.role === 'Evaluador');
          return {
            _id: p._id,
            name: p.name,
            role: currentMember?.role || (user?.role === 'Docente' ? 'Evaluador/Supervisor' : 'Integrante'),
            workload: currentMember?.workload || 0,
            status: p.status || 'Active',
            advisorName: advisor?.user?.name || 'Por asignar'
          };
        });
        setProjects(mapped);
      }
    } catch (err) {
      console.error('Error fetching user projects:', err);
    }
  };

  const showNotificationMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          name,
          email,
          career,
          biography,
          interests: interestsInput.split(',').map(s => s.trim()).filter(Boolean),
          skills: skillsInput.split(',').map(s => s.trim()).filter(Boolean),
          availability,
          preferences: { theme, language, density },
          notificationSettings: {
            comments: notifComments,
            evaluations: notifEvaluations,
            milestones: notifMilestones,
            meetings: notifMeetings,
            security: notifSecurity
          }
        })
      });
      if (res.ok) {
        await fetchProfile();
        showNotificationMessage('success', 'Perfil actualizado correctamente.');
      } else {
        const data = await res.json();
        showNotificationMessage('error', data.message || 'Error al actualizar el perfil.');
      }
    } catch (err) {
      showNotificationMessage('error', 'Error al comunicar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showNotificationMessage('error', 'La nueva contraseña y la confirmación no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      if (res.ok) {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showNotificationMessage('success', 'Contraseña cambiada exitosamente.');
      } else {
        const data = await res.json();
        showNotificationMessage('error', data.message || 'Error al cambiar la contraseña.');
      }
    } catch (err) {
      showNotificationMessage('error', 'Error al comunicar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSentEmails = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/notifications/sent-emails', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setSentEmails(data);
      }
    } catch (err) {
      console.error('Error fetching sent emails:', err);
    }
  };

  const handleSimulateDigest = async (frequency: 'daily' | 'weekly') => {
    setTriggeringDigest(true);
    try {
      const res = await fetch('http://localhost:5000/api/notifications/trigger-digest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ frequency })
      });
      const data = await res.json();
      if (res.ok) {
        showNotificationMessage('success', data.message || `Resumen ${frequency} procesado.`);
        fetchSentEmails();
      } else {
        showNotificationMessage('error', data.message || 'Error al procesar el resumen.');
      }
    } catch (err) {
      showNotificationMessage('error', 'Error de conexión.');
    } finally {
      setTriggeringDigest(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchSentEmails();
    }
  }, [activeTab]);
  const mockActivities = [
    { id: 1, action: 'Inicio de sesión exitoso', details: 'Navegador Chrome en Windows 11', time: 'Hace 5 minutos' },
    { id: 2, action: 'Actualizó estado de entregable', details: 'Hito 1 - Propuesta Metodológica', time: 'Ayer a las 18:24' },
    { id: 3, action: 'Comentario en Minuta de Acuerdos', details: 'Comisión de Avance Semanal', time: '03/07/2026' },
    { id: 4, action: 'Aprobación de arquitectura', details: 'Validación del patrón Clean Architecture', time: '01/07/2026' }
  ];

  const mockSessions = [
    { id: 1, device: 'Chrome · Windows (Esta sesión)', ip: '192.168.1.45', status: 'Activa ahora' },
    { id: 2, device: 'Safari · iPhone 14 Pro', ip: '190.160.45.12', status: 'Última conexión: hace 2 horas' }
  ];

  const tabClass = (tabName: typeof activeTab) => {
    const base = 'flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-mono border-b-2 transition-all select-none cursor-pointer';
    if (activeTab === tabName) {
      return `${base} border-zinc-950 text-zinc-950 bg-zinc-50`;
    }
    return `${base} border-transparent text-zinc-400 hover:text-zinc-600 hover:border-zinc-200`;
  };

  // Role Badge Helper
  const getRoleColor = (role: string) => {
    if (role === 'Admin') return 'bg-zinc-900 text-white';
    if (role === 'Docente') return 'bg-zinc-800 text-white';
    if (role === 'Evaluador') return 'bg-zinc-700 text-white';
    return 'bg-zinc-100 text-zinc-800 border border-zinc-200';
  };

  return (
    <div className="space-y-6">
      {/* Header and Toast Message */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight">Mi Perfil</h1>
          <p className="text-sm text-zinc-500 mt-1">Administra tu información personal, seguridad, notificaciones y preferencias en ThesisFlow.</p>
        </div>
        
        {message && (
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono font-bold shadow-lg animate-bounce ${
            message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{message.text}</span>
          </div>
        )}
      </div>

      {/* Profile Overview Banner card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-zinc-950 flex items-center justify-center text-white text-3xl font-extrabold shadow-inner shrink-0">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="space-y-1 text-center md:text-left flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <h2 className="text-xl font-extrabold text-zinc-950 truncate">{user?.name || 'Usuario de ThesisFlow'}</h2>
            <span className={`self-center md:self-auto text-[9px] px-2 py-0.5 rounded font-mono uppercase font-bold ${getRoleColor(user?.role || 'Viewer')}`}>
              {user?.role}
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono">RUT: {user?.rut} · {email || 'Sin correo configurado'}</p>
          {career && <p className="text-xs text-zinc-650 font-medium">{career}</p>}
        </div>
        <div className="grid grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-zinc-150 pt-4 md:pt-0 md:pl-6 text-center shrink-0">
          <div>
            <span className="block text-lg font-black font-mono text-zinc-950">{projects.length}</span>
            <span className="text-[9px] text-zinc-400 font-mono uppercase">Proyectos</span>
          </div>
          <div>
            <span className="block text-lg font-black font-mono text-zinc-950">
              {projects.reduce((sum, p) => sum + p.workload, 0)}%
            </span>
            <span className="text-[9px] text-zinc-400 font-mono uppercase">Carga Horaria</span>
          </div>
          <div>
            <span className="block text-lg font-black font-mono text-zinc-950">
              {user?.skills?.length || 0}
            </span>
            <span className="text-[9px] text-zinc-400 font-mono uppercase">Skills</span>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="border-b border-zinc-200 flex flex-wrap gap-1">
        <button onClick={() => setActiveTab('summary')} className={tabClass('summary')}>
          <Activity className="w-3.5 h-3.5" /> Resumen
        </button>
        <button onClick={() => setActiveTab('personal')} className={tabClass('personal')}>
          <User className="w-3.5 h-3.5" /> Datos Personales
        </button>
        <button onClick={() => setActiveTab('projects')} className={tabClass('projects')}>
          <BookOpen className="w-3.5 h-3.5" /> Proyectos
        </button>
        <button onClick={() => setActiveTab('activity')} className={tabClass('activity')}>
          <Activity className="w-3.5 h-3.5" /> Actividad
        </button>
        <button onClick={() => setActiveTab('notifications')} className={tabClass('notifications')}>
          <Bell className="w-3.5 h-3.5" /> Notificaciones
        </button>
        <button onClick={() => setActiveTab('security')} className={tabClass('security')}>
          <Lock className="w-3.5 h-3.5" /> Seguridad
        </button>
        <button onClick={() => setActiveTab('preferences')} className={tabClass('preferences')}>
          <Settings className="w-3.5 h-3.5" /> Preferencias
        </button>
      </div>

      {/* Content Panels */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 min-h-[300px]">
        
        {/* Tab 1: Summary */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-zinc-950 font-mono uppercase border-b border-zinc-100 pb-2">Acerca de mí</h3>
                <p className="text-xs text-zinc-650 leading-relaxed bg-zinc-50 border border-zinc-150 p-4 rounded-xl italic">
                  {biography || '"No has ingresado una biografía en tu perfil. Puedes agregar una descripción corta sobre ti en la pestaña Datos Personales."'}
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-xl">
                    <span className="text-[10px] text-zinc-400 font-mono uppercase block">Carrera / Área</span>
                    <span className="text-xs font-bold text-zinc-800">{career || 'No especificada'}</span>
                  </div>
                  <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-xl">
                    <span className="text-[10px] text-zinc-400 font-mono uppercase block">Disponibilidad</span>
                    <span className="text-xs font-bold text-zinc-800">{availability || 'No especificada'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-zinc-950 font-mono uppercase border-b border-zinc-100 pb-2">Habilidades y Áreas</h3>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-mono uppercase block mb-1.5">Áreas de interés académico</span>
                    <div className="flex flex-wrap gap-1.5">
                      {user?.interests && user.interests.length > 0 ? (
                        user.interests.map((tag, idx) => (
                          <span key={idx} className="bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded text-[10px] font-mono border border-zinc-200">{tag}</span>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-400 italic">Sin áreas especificadas.</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400 font-mono uppercase block mb-1.5">Especialidades técnicas</span>
                    <div className="flex flex-wrap gap-1.5">
                      {user?.skills && user.skills.length > 0 ? (
                        user.skills.map((tag, idx) => (
                          <span key={idx} className="bg-zinc-950 text-white px-2 py-0.5 rounded text-[10px] font-mono">{tag}</span>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-400 italic">Sin especialidades especificadas.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active projects summary panel */}
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-extrabold text-zinc-950 font-mono uppercase border-b border-zinc-100 pb-2">Proyectos Activos</h3>
              {projects.length === 0 ? (
                <p className="text-xs text-zinc-400 italic py-4">No estás asignado a ningún proyecto actualmente.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map(p => (
                    <div key={p._id} className="border border-zinc-200 hover:border-zinc-400 p-4 rounded-xl flex items-center justify-between gap-4 transition-all">
                      <div>
                        <span className="text-xs font-extrabold text-zinc-900 block truncate">{p.name}</span>
                        <span className="text-[10px] text-zinc-400 font-mono uppercase">{p.role} · Carga: {p.workload}%</span>
                      </div>
                      <span className="px-2 py-0.5 text-[9px] font-mono bg-zinc-100 text-zinc-650 rounded border border-zinc-200">
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Personal Data Form */}
        {activeTab === 'personal' && (
          <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">
            <h3 className="text-sm font-extrabold text-zinc-950 font-mono uppercase border-b border-zinc-100 pb-2">Datos de Cuenta</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Nombre Completo</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-zinc-500 font-medium" 
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">RUT (Identificador de Cuenta)</label>
                <input 
                  type="text" 
                  value={user?.rut || ''} 
                  disabled
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-zinc-50 text-zinc-400 font-mono cursor-not-allowed" 
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Correo Institucional</label>
                <input 
                  type="email" 
                  placeholder="ejemplo@universidad.cl"
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-zinc-500" 
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Carrera / Unidad Académica</label>
                <input 
                  type="text" 
                  placeholder="Ej: Ingeniería Civil en Informática"
                  value={career} 
                  onChange={e => setCareer(e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-zinc-500" 
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Biografía Corta / Perfil del Investigador</label>
                <textarea 
                  rows={3}
                  placeholder="Describe tus principales focos de estudio, tecnologías preferidas o líneas de investigación..."
                  value={biography} 
                  onChange={e => setBiography(e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Áreas de Interés (Separadas por comas)</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Inteligencia Artificial, Backend, Blockchain"
                    value={interestsInput} 
                    onChange={e => setInterestsInput(e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-zinc-500 font-mono" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Especialidades / Tecnologías (Separadas por comas)</label>
                  <input 
                    type="text" 
                    placeholder="Ej: React, Node.js, Python, MongoDB"
                    value={skillsInput} 
                    onChange={e => setSkillsInput(e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-zinc-500 font-mono" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Disponibilidad Horaria</label>
                <input 
                  type="text" 
                  placeholder="Ej: 10 hrs semanales - Lunes y Miércoles por la tarde"
                  value={availability} 
                  onChange={e => setAvailability(e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-zinc-500" 
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="flex items-center gap-2 bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors font-mono uppercase"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Guardar Datos de Perfil
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Projects list */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="border-b border-zinc-150 pb-2">
              <h3 className="text-sm font-extrabold text-zinc-950 font-mono uppercase">Participación en Proyectos</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Listado de proyectos activos en los que participas o supervisas directamente.</p>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-12 border border-zinc-200 rounded-2xl bg-zinc-50">
                <BookOpen className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">No tienes proyectos asignados.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map(p => (
                  <div key={p._id} className="bg-white border border-zinc-200 rounded-2xl p-5 hover:shadow-sm transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold text-zinc-950">{p.name}</h4>
                      <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                        <span className="font-mono">Rol: {p.role}</span>
                        <span>·</span>
                        <span className="font-mono">Carga Horaria: {p.workload}%</span>
                      </div>
                      <p className="text-xs text-zinc-400">Profesor Responsable: {p.advisorName}</p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="px-2.5 py-1 text-[10px] font-mono font-bold bg-zinc-100 text-zinc-800 border border-zinc-200 uppercase rounded">
                        {p.status}
                      </span>
                      
                      <a 
                        href={`/proyecto?id=${p._id}`}
                        className="bg-zinc-950 text-white hover:bg-zinc-800 text-[10px] font-bold font-mono uppercase px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Ver Workspace
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Activity Log */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div className="border-b border-zinc-150 pb-2">
              <h3 className="text-sm font-extrabold text-zinc-950 font-mono uppercase">Historial de Actividad</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Trazabilidad de tus acciones y eventos recientes dentro del sistema.</p>
            </div>

            <div className="space-y-4">
              {mockActivities.map(act => (
                <div key={act.id} className="flex gap-4 items-start p-3 hover:bg-zinc-50 rounded-xl transition-colors">
                  <div className="p-2 bg-zinc-100 rounded-lg shrink-0">
                    <Activity className="w-3.5 h-3.5 text-zinc-650" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-xs font-bold text-zinc-900">{act.action}</p>
                    <p className="text-xs text-zinc-400">{act.details}</p>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono whitespace-nowrap shrink-0">{act.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-8">
            <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-3xl">
              <div className="border-b border-zinc-150 pb-2">
                <h3 className="text-sm font-extrabold text-zinc-950 font-mono uppercase">Configuración de Canales y Alertas</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Controla cómo y cuándo quieres recibir actualizaciones de ThesisFlow.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Comments */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-50 border border-zinc-200 rounded-xl gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-zinc-900 block">Nuevos comentarios y observaciones</span>
                    <span className="text-[11px] text-zinc-400 block">Notificarme cuando alguien responda o publique observaciones en entregables o requerimientos.</span>
                  </div>
                  <select 
                    value={notifComments} 
                    onChange={e => setNotifComments(e.target.value as any)}
                    className="border border-zinc-250 bg-white px-3 py-1.5 text-xs font-mono font-bold rounded-lg focus:outline-none focus:border-zinc-500 w-full sm:w-56 shrink-0"
                  >
                    <option value="immediate">Inmediato (Email + App)</option>
                    <option value="daily">Resumen Diario (Email)</option>
                    <option value="weekly">Resumen Semanal (Email)</option>
                    <option value="app">Solo App</option>
                    <option value="disabled">Desactivado</option>
                  </select>
                </div>

                {/* Evaluations */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-50 border border-zinc-200 rounded-xl gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-zinc-900 block flex items-center gap-1.5">
                      Evaluaciones y Rúbricas
                      <span className="text-[8px] bg-zinc-200 text-zinc-700 px-1 rounded uppercase font-mono font-black">Obligatorio</span>
                    </span>
                    <span className="text-[11px] text-zinc-400 block">Calificaciones publicadas y pautas de rúbricas por hitos.</span>
                  </div>
                  <select 
                    value={notifEvaluations} 
                    onChange={e => setNotifEvaluations(e.target.value as any)}
                    className="border border-zinc-250 bg-white px-3 py-1.5 text-xs font-mono font-bold rounded-lg focus:outline-none focus:border-zinc-500 w-full sm:w-56 shrink-0"
                  >
                    <option value="immediate">Inmediato (Email + App)</option>
                    <option value="daily">Resumen Diario (Email)</option>
                    <option value="weekly">Resumen Semanal (Email)</option>
                    <option value="app">Solo App</option>
                  </select>
                </div>

                {/* Milestones / Deliverables */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-50 border border-zinc-200 rounded-xl gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-zinc-900 block flex items-center gap-1.5">
                      Hitos y Entregables
                      <span className="text-[8px] bg-zinc-200 text-zinc-700 px-1 rounded uppercase font-mono font-black">Obligatorio</span>
                    </span>
                    <span className="text-[11px] text-zinc-400 block">Subida de nuevas versiones, aprobación de entregables o solicitudes de cambios.</span>
                  </div>
                  <select 
                    value={notifMilestones} 
                    onChange={e => setNotifMilestones(e.target.value as any)}
                    className="border border-zinc-250 bg-white px-3 py-1.5 text-xs font-mono font-bold rounded-lg focus:outline-none focus:border-zinc-500 w-full sm:w-56 shrink-0"
                  >
                    <option value="immediate">Inmediato (Email + App)</option>
                    <option value="daily">Resumen Diario (Email)</option>
                    <option value="weekly">Resumen Semanal (Email)</option>
                    <option value="app">Solo App</option>
                  </select>
                </div>

                {/* Meetings */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-50 border border-zinc-200 rounded-xl gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-zinc-900 block">Reuniones y Actas</span>
                    <span className="text-[11px] text-zinc-400 block">Alertas de reuniones agendadas, próximas a vencer o aprobación de minutas.</span>
                  </div>
                  <select 
                    value={notifMeetings} 
                    onChange={e => setNotifMeetings(e.target.value as any)}
                    className="border border-zinc-250 bg-white px-3 py-1.5 text-xs font-mono font-bold rounded-lg focus:outline-none focus:border-zinc-500 w-full sm:w-56 shrink-0"
                  >
                    <option value="immediate">Inmediato (Email + App)</option>
                    <option value="daily">Resumen Diario (Email)</option>
                    <option value="weekly">Resumen Semanal (Email)</option>
                    <option value="app">Solo App</option>
                    <option value="disabled">Desactivado</option>
                  </select>
                </div>

                {/* Security */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-50 border border-zinc-200 rounded-xl gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-zinc-900 block flex items-center gap-1.5">
                      Seguridad y Cuenta
                      <span className="text-[8px] bg-zinc-200 text-zinc-700 px-1 rounded uppercase font-mono font-black">Obligatorio</span>
                    </span>
                    <span className="text-[11px] text-zinc-400 block">Cambios de contraseña, inicio de sesión inusual o modificaciones de rol.</span>
                  </div>
                  <select 
                    value={notifSecurity} 
                    onChange={e => setNotifSecurity(e.target.value as any)}
                    className="border border-zinc-250 bg-white px-3 py-1.5 text-xs font-mono font-bold rounded-lg focus:outline-none focus:border-zinc-500 w-full sm:w-56 shrink-0"
                  >
                    <option value="immediate">Inmediato (Email + App)</option>
                    <option value="daily">Resumen Diario (Email)</option>
                    <option value="weekly">Resumen Semanal (Email)</option>
                    <option value="app">Solo App</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex items-center gap-2 bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors font-mono uppercase"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Guardar Preferencias
                </button>
              </div>
            </form>

            {/* Simulated Email Console and Digest Triggers */}
            <div className="border-t border-zinc-250 pt-8 space-y-6">
              <div>
                <h3 className="text-sm font-extrabold text-zinc-950 font-mono uppercase flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-zinc-500" />
                  Consola de Simulación de Correos (Entorno de Desarrollo)
                </h3>
                <p className="text-xs text-zinc-500 mt-1">Dispara manualmente los procesos del servidor (Simulación de Cron Jobs) y audita la salida de correos en tiempo real.</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={triggeringDigest}
                  onClick={() => handleSimulateDigest('daily')}
                  className="bg-white border border-zinc-250 text-zinc-950 hover:bg-zinc-50 text-xs font-bold font-mono uppercase px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${triggeringDigest ? 'animate-spin' : ''}`} />
                  Disparar Resumen Diario
                </button>
                <button
                  type="button"
                  disabled={triggeringDigest}
                  onClick={() => handleSimulateDigest('weekly')}
                  className="bg-white border border-zinc-250 text-zinc-950 hover:bg-zinc-50 text-xs font-bold font-mono uppercase px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${triggeringDigest ? 'animate-spin' : ''}`} />
                  Disparar Resumen Semanal
                </button>
                <button
                  type="button"
                  onClick={fetchSentEmails}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold font-mono uppercase px-4 py-2.5 rounded-lg transition-colors"
                >
                  Actualizar Registro
                </button>
              </div>

              {/* Emails Log */}
              <div className="space-y-3">
                <span className="text-[10px] text-zinc-400 font-mono uppercase block font-bold">Correos Registrados en backend/logs/sent_emails.json ({sentEmails.length})</span>
                
                {sentEmails.length === 0 ? (
                  <div className="bg-zinc-50 border border-dashed border-zinc-200 text-zinc-400 font-mono text-xs text-center py-8 rounded-xl">
                    No se han generado correos simulados en esta sesión.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {sentEmails.map((email, idx) => (
                      <div key={idx} className="bg-zinc-950 text-zinc-100 font-mono text-xs p-4 rounded-xl border border-zinc-800 space-y-2">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2 text-[10px] text-zinc-400">
                          <span>Para: {email.toName} &lt;{email.to}&gt;</span>
                          <span>{new Date(email.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="font-bold text-white">Asunto: {email.subject}</div>
                        <div className="bg-zinc-900 border border-zinc-850 p-2.5 rounded text-zinc-300 overflow-x-auto max-h-40 overflow-y-auto" style={{ wordBreak: 'break-all' }}>
                          {/* Strip or safely display HTML content snippet */}
                          <div dangerouslySetInnerHTML={{ __html: email.body }} className="mail-preview-wrapper" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Security and Password */}
        {activeTab === 'security' && (
          <div className="space-y-8 max-w-2xl">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="border-b border-zinc-150 pb-2">
                <h3 className="text-sm font-extrabold text-zinc-950 font-mono uppercase">Cambio de Contraseña</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Actualiza tu clave de acceso para resguardar tu cuenta.</p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Contraseña Actual</label>
                  <input 
                    type={showOldPass ? 'text' : 'password'} 
                    value={oldPassword} 
                    onChange={e => setOldPassword(e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg pl-3 pr-10 py-2 text-xs bg-white focus:outline-none focus:border-zinc-500" 
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowOldPass(!showOldPass)} 
                    className="absolute right-3 top-[25px] text-zinc-400 hover:text-zinc-700"
                  >
                    {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Nueva Contraseña</label>
                    <input 
                      type={showNewPass ? 'text' : 'password'} 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full border border-zinc-200 rounded-lg pl-3 pr-10 py-2 text-xs bg-white focus:outline-none focus:border-zinc-500" 
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowNewPass(!showNewPass)} 
                      className="absolute right-3 top-[25px] text-zinc-400 hover:text-zinc-700"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Confirmar Nueva Contraseña</label>
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-zinc-500" 
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex items-center gap-2 bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors font-mono uppercase"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  Actualizar Contraseña
                </button>
              </div>
            </form>

            <div className="space-y-4 pt-4 border-t border-zinc-150">
              <div>
                <h3 className="text-sm font-extrabold text-zinc-950 font-mono uppercase">Sesiones Activas</h3>
                <p className="text-xs text-zinc-400 mt-0.5 font-medium">Dispositivos y navegadores que tienen una sesión activa con tus credenciales.</p>
              </div>

              <div className="space-y-3">
                {mockSessions.map(sess => (
                  <div key={sess.id} className="border border-zinc-200 p-4 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-55 hover:bg-zinc-100 rounded-lg border border-zinc-200">
                        <Laptop className="w-4 h-4 text-zinc-650" />
                      </div>
                      <div>
                        <span className="text-xs font-extrabold text-zinc-900 block">{sess.device}</span>
                        <span className="text-[10px] text-zinc-400 font-mono block">Dirección IP: {sess.ip} · {sess.status}</span>
                      </div>
                    </div>
                    {sess.id !== 1 && (
                      <button 
                        onClick={() => showNotificationMessage('success', 'Sesión cerrada exitosamente.')}
                        className="text-[10px] font-mono font-bold uppercase text-red-650 hover:text-red-800 hover:bg-red-50 px-2.5 py-1.5 rounded transition-all"
                      >
                        Cerrar Sesión
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Preferences */}
        {activeTab === 'preferences' && (
          <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">
            <div className="border-b border-zinc-150 pb-2">
              <h3 className="text-sm font-extrabold text-zinc-950 font-mono uppercase">Preferencias de la Interfaz</h3>
              <p className="text-xs text-zinc-400 mt-0.5 font-medium">Personaliza el aspecto, idioma y visualización del sistema.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-zinc-400 uppercase block font-bold">Tema Visual</label>
                <select 
                  value={theme} 
                  onChange={e => setTheme(e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-zinc-500"
                >
                  <option value="light">☀️ Claro (Corporativo)</option>
                  <option value="dark">🌙 Oscuro (Mono Premium)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-zinc-400 uppercase block font-bold">Idioma / Language</label>
                <select 
                  value={language} 
                  onChange={e => setLanguage(e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-zinc-500"
                >
                  <option value="es">Español (Chile)</option>
                  <option value="en">English (US)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-zinc-400 uppercase block font-bold">Densidad de la Interfaz</label>
                <select 
                  value={density} 
                  onChange={e => setDensity(e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-zinc-500"
                >
                  <option value="normal">Normal</option>
                  <option value="compact">Compacto (Alta Densidad)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="flex items-center gap-2 bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors font-mono uppercase"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Guardar Preferencias
              </button>
            </div>
          </form>
        )}
        
      </div>
    </div>
  );
};

export default Profile;

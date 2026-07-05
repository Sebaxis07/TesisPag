import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, ArrowRight, FileCheck, Layers, BookOpen, AlertTriangle, 
  Search, Filter, Users, Clock, CheckCircle2, ExternalLink, 
  UserCheck, ShieldAlert, Award, Activity, X, Info, Mail, Send
} from 'lucide-react';

interface StudentMetric {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    rut?: string;
    role: string;
  };
  operationalRole: string;
  tasksCount: number;
  tasksCompletedCount: number;
  meetingsCount: number;
  evaluationsReceived: Array<{
    rubricName: string;
    totalScore: number;
    status: string;
  }>;
}

interface ProjectSummary {
  _id: string;
  name: string;
  description: string;
  companyName: string;
  methodology: string;
  members: Array<any>;
  students: Array<StudentMetric>;
  progress: number;
  risk: 'Low' | 'Medium' | 'High';
  alerts: Array<{ type: 'warning' | 'danger' | 'info'; message: string }>;
  alertsCount: number;
  currentDeliverable: string;
  lastActivityDate: string;
  createdAt: string;
}

interface DashboardData {
  kpis: {
    totalProjects: number;
    totalStudents: number;
    pendingReviewsCount: number;
    pendingEvaluationsCount: number;
    criticalAlertsCount: number;
  };
  projects: Array<ProjectSummary>;
  pendingReviews: Array<{
    _id: string;
    project: string;
    itemType: string;
    itemTitle: string;
    version: number;
    requestedByName: string;
    submittedAt: string;
  }>;
  recentActivity: Array<{
    _id: string;
    projectName: string;
    userName: string;
    action: string;
    resourceType: string;
    details: string;
    timestamp: string;
  }>;
}

export const AdvisorDashboard: React.FC = () => {
  const { selectProject } = useProjectStore();
  const { user, getAuthHeaders } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  
  // Interactive UI States
  const [activeTab, setActiveTab] = useState<'projects' | 'reviews' | 'activity'>('projects');
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  
  // Student Detail Modal State
  const [selectedStudent, setSelectedStudent] = useState<StudentMetric | null>(null);
  const [selectedStudentProject, setSelectedStudentProject] = useState<string>('');

  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAlert, setEmailAlert] = useState<any | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleOpenEmailModal = (alert: any) => {
    setEmailAlert(alert);
    setEmailSubject(`[ThesisFlow] Alerta de Consistencia: ${alert.projectName}`);
    setEmailBody(`Estimados alumnos de ${alert.projectName},\n\nLes escribo para alertarles sobre la siguiente observación de consistencia detectada en su proyecto de tesis:\n\n👉 "${alert.message}"\n\nPor favor, revisen esto a la brevedad y realicen las correcciones correspondientes en la plataforma.\n\nAtentamente,\n${user?.name || 'Docente Guía'}`);
    setEmailSuccess(null);
    setEmailError(null);
    setShowEmailModal(true);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAlert) return;

    try {
      setSendingEmail(true);
      setEmailSuccess(null);
      setEmailError(null);

      const headers = getAuthHeaders();
      headers['Content-Type'] = 'application/json';

      const response = await fetch('http://localhost:5000/api/notifications/send-custom-email', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectId: emailAlert.projectId,
          subject: emailSubject,
          body: emailBody
        })
      });

      if (response.ok) {
        setEmailSuccess('¡Correo enviado con éxito a los integrantes del proyecto!');
        setTimeout(() => {
          setShowEmailModal(false);
        }, 1800);
      } else {
        const errData = await response.json();
        setEmailError(errData.message || 'Error al enviar el correo.');
      }
    } catch (err) {
      console.error('Error sending custom email:', err);
      setEmailError('Error de conexión con el servidor.');
    } finally {
      setSendingEmail(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const response = await fetch('http://localhost:5000/api/projects/advisor/dashboard-summary', { headers });
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSelectProject = async (projectId: string, route: string = '/') => {
    await selectProject(projectId);
    navigate(route);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <div className="w-12 h-12 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-mono text-zinc-500 animate-pulse">Cargando Panel Docente...</p>
      </div>
    );
  }

  const kpis = dashboardData?.kpis || {
    totalProjects: 0,
    totalStudents: 0,
    pendingReviewsCount: 0,
    pendingEvaluationsCount: 0,
    criticalAlertsCount: 0
  };

  const projects = dashboardData?.projects || [];
  const pendingReviews = dashboardData?.pendingReviews || [];
  const recentActivity = dashboardData?.recentActivity || [];

  // Filter projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.students.some(s => s.user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.companyName && p.companyName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRisk = riskFilter === 'All' || p.risk === riskFilter;
    
    return matchesSearch && matchesRisk;
  });

  // Critical alerts across all projects
  const allAlerts = projects.flatMap(p => 
    p.alerts.map(a => ({
      ...a,
      projectId: p._id,
      projectName: p.name
    }))
  );

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-800 p-8 rounded-2xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="space-y-2 z-10">
          <span className="text-[10px] font-mono tracking-widest uppercase bg-white/10 px-2.5 py-1 rounded-full text-zinc-300">
            Vista Académica · {user?.role === 'Docente' ? 'Docente Guía' : user?.role || 'Evaluador'}
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Panel de Supervisión Docente</h1>
          <p className="text-zinc-400 text-sm max-w-lg">
            Supervisa el desempeño estudiantil, audita la consistencia metodológica de los requerimientos y aplica evaluaciones de rúbricas.
          </p>
        </div>
        <div className="flex gap-4 z-10">
          <button 
            onClick={() => navigate('/evaluacion-rubricas')}
            className="bg-white text-black hover:bg-zinc-100 px-5 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg"
          >
            <Award className="w-4 h-4 text-zinc-900" />
            Configurar Rúbricas
          </button>
        </div>
      </div>

      {/* KPI Cards (Section A) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono text-zinc-400 uppercase block">Proyectos Asignados</span>
            <span className="text-3xl font-black font-mono text-zinc-900">{kpis.totalProjects}</span>
          </div>
          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-100">
            <Layers className="w-6 h-6 text-zinc-600" />
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono text-zinc-400 uppercase block">Estudiantes</span>
            <span className="text-3xl font-black font-mono text-zinc-900">{kpis.totalStudents}</span>
          </div>
          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-100">
            <Users className="w-6 h-6 text-zinc-600" />
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono text-zinc-400 uppercase block">Firmas Pendientes</span>
            <span className="text-3xl font-black font-mono text-amber-600">{kpis.pendingReviewsCount}</span>
          </div>
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-100">
            <FileCheck className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-mono text-zinc-400 uppercase block">Proyectos en Riesgo</span>
            <span className="text-3xl font-black font-mono text-red-600">{kpis.criticalAlertsCount}</span>
          </div>
          <div className="p-3.5 bg-red-50 rounded-xl border border-red-100">
            <ShieldAlert className="w-6 h-6 text-red-600" />
          </div>
        </div>
      </div>

      {/* Tabs for Table Selector */}
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'projects' 
              ? 'border-black text-black' 
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Layers className="w-4 h-4" /> Proyectos Supervisados ({projects.length})
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'reviews' 
              ? 'border-black text-black' 
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <FileCheck className="w-4 h-4" /> Solicitudes de Firma ({pendingReviews.length})
        </button>
      </div>

      {/* Content based on Active Tab */}
      {activeTab === 'projects' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Columns: Project table & Quick Actions */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Section B: Interactive Project Table */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Header + Filters */}
              <div className="p-6 border-b border-zinc-100 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900">Proyectos Supervisados</h2>
                    <p className="text-xs text-zinc-500">Busca proyectos, estudiantes o filtra por semáforo de riesgo.</p>
                  </div>
                  
                  {/* Risk Tab Filters */}
                  <div className="flex bg-zinc-100 p-1 rounded-xl text-xs font-bold border border-zinc-200">
                    <button 
                      onClick={() => setRiskFilter('All')} 
                      className={`px-3 py-1.5 rounded-lg transition-all ${riskFilter === 'All' ? 'bg-white shadow text-black' : 'text-zinc-500 hover:text-zinc-800'}`}
                    >
                      Todos
                    </button>
                    <button 
                      onClick={() => setRiskFilter('High')} 
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${riskFilter === 'High' ? 'bg-red-500 text-white shadow' : 'text-zinc-500 hover:text-red-600'}`}
                    >
                      Alto
                    </button>
                    <button 
                      onClick={() => setRiskFilter('Medium')} 
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${riskFilter === 'Medium' ? 'bg-amber-500 text-white shadow' : 'text-zinc-500 hover:text-amber-600'}`}
                    >
                      Medio
                    </button>
                    <button 
                      onClick={() => setRiskFilter('Low')} 
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${riskFilter === 'Low' ? 'bg-emerald-500 text-white shadow' : 'text-zinc-500 hover:text-emerald-600'}`}
                    >
                      Bajo
                    </button>
                  </div>
                </div>

                {/* Search input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    placeholder="Buscar por proyecto, estudiante o empresa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black placeholder-zinc-400 font-medium"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-mono text-zinc-400 uppercase">
                      <th className="px-6 py-4">Proyecto / Alumnos</th>
                      <th className="px-6 py-4">Avance</th>
                      <th className="px-6 py-4">Hito / Capítulo</th>
                      <th className="px-6 py-4">Riesgo</th>
                      <th className="px-6 py-4">Última Actividad</th>
                      <th className="px-6 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {filteredProjects.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-zinc-400 font-mono text-xs">
                          No se encontraron proyectos supervisados con los filtros actuales.
                        </td>
                      </tr>
                    ) : (
                      filteredProjects.map((p) => (
                        <tr key={p._id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4 space-y-2">
                            <div>
                              <span className="font-extrabold text-black hover:underline cursor-pointer block" onClick={() => handleSelectProject(p._id, '/proyecto')}>
                                {p.name}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono block">
                                {p.companyName || 'Sin Empresa'} · {p.methodology}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {p.students.map((s) => (
                                <button 
                                  key={s._id}
                                  onClick={() => {
                                    setSelectedStudent(s);
                                    setSelectedStudentProject(p.name);
                                  }}
                                  className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded text-[10px] font-bold text-zinc-800 transition-all flex items-center gap-1"
                                >
                                  <Users className="w-2.5 h-2.5 text-zinc-400" />
                                  {s.user.name}
                                </button>
                              ))}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <span className="font-bold font-mono text-xs text-zinc-950 block">{p.progress}%</span>
                              <div className="w-20 bg-zinc-100 h-1 rounded-full overflow-hidden">
                                <div className="bg-black h-full transition-all duration-300" style={{ width: `${p.progress}%` }}></div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-zinc-800 font-medium text-xs bg-zinc-100 px-2 py-1 rounded border border-zinc-200 inline-block max-w-[120px] truncate">
                              {p.currentDeliverable}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.risk === 'High' 
                                ? 'bg-red-50 text-red-700 border border-red-200' 
                                : p.risk === 'Medium'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                p.risk === 'High' ? 'bg-red-500 animate-pulse' : p.risk === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}></span>
                              {p.risk === 'High' ? 'Alto' : p.risk === 'Medium' ? 'Medio' : 'Bajo'}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-xs font-mono text-zinc-500">
                            {new Date(p.lastActivityDate).toLocaleDateString('es-CL', {
                              day: '2-digit', month: '2-digit', year: 'numeric'
                            })}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleSelectProject(p._id, '/proyecto')}
                              className="text-black hover:text-zinc-600 p-1 rounded-lg hover:bg-zinc-100 transition-all inline-flex items-center"
                              title="Ver Workspace de Tesis"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section E: Contextual Quick Actions */}
            <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-zinc-950 text-base">Acciones Rápidas del Docente</h3>
                <p className="text-xs text-zinc-500">Accede directamente a los módulos clave para dar avance académico a las memorias.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button 
                  onClick={() => navigate('/evaluacion-rubricas')}
                  className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 p-4 rounded-xl text-left space-y-2 transition-all group"
                >
                  <div className="p-2 bg-black text-white rounded-lg w-fit group-hover:scale-105 transition-all">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-zinc-950 block">Evaluar con Rúbrica</span>
                    <span className="text-[10px] text-zinc-500 block">Registrar calificaciones de hito o finales.</span>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    if (projects.length > 0) {
                      handleSelectProject(projects[0]._id, '/aprobaciones');
                    } else {
                      navigate('/aprobaciones');
                    }
                  }}
                  className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 p-4 rounded-xl text-left space-y-2 transition-all group"
                >
                  <div className="p-2 bg-zinc-905 text-white rounded-lg w-fit group-hover:scale-105 transition-all">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-zinc-950 block">Firmar Entregables</span>
                    <span className="text-[10px] text-zinc-500 block">Revisar e ingresar firma criptográfica.</span>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    if (projects.length > 0) {
                      handleSelectProject(projects[0]._id, '/presencia');
                    } else {
                      navigate('/proyecto');
                    }
                  }}
                  className="bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 p-4 rounded-xl text-left space-y-2 transition-all group"
                >
                  <div className="p-2 bg-zinc-905 text-white rounded-lg w-fit group-hover:scale-105 transition-all">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-zinc-950 block">Asistencia Co-presencia</span>
                    <span className="text-[10px] text-zinc-500 block">Validar reuniones en tiempo real.</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Alerts & Recent Activity */}
          <div className="space-y-8">
            
            {/* Section D: Critical Alerts Detail Panel */}
            <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-zinc-950 text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Alertas de Consistencia
                </h3>
                <p className="text-xs text-zinc-500">Advertencias de inactividad, requerimientos huérfanos o atrasos.</p>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {allAlerts.length === 0 ? (
                  <div className="text-center py-8 bg-zinc-50 border border-zinc-100 rounded-xl">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <span className="font-bold text-xs text-zinc-900 block">Todo al día</span>
                    <span className="text-[10px] text-zinc-500 block">No hay alertas activas en tus proyectos.</span>
                  </div>
                ) : (
                  allAlerts.map((alert, i) => (
                    <div 
                      key={i} 
                      className={`p-3.5 border rounded-xl space-y-2.5 transition-all ${
                        alert.type === 'danger'
                          ? 'bg-red-50/50 border-red-200 text-red-950'
                          : alert.type === 'warning'
                          ? 'bg-amber-50/50 border-amber-200 text-amber-950'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-950'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-[11px] hover:underline cursor-pointer block" onClick={() => handleSelectProject(alert.projectId)}>
                          {alert.projectName}
                        </span>
                        <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                          alert.type === 'danger' ? 'bg-red-500' : alert.type === 'warning' ? 'bg-amber-500' : 'bg-zinc-500'
                        }`}></span>
                      </div>
                      <p className="text-xs font-medium leading-relaxed">{alert.message}</p>
                      
                      <div className="flex justify-end pt-1 border-t border-zinc-200/40">
                        <button
                          type="button"
                          onClick={() => handleOpenEmailModal(alert)}
                          className="text-[10px] font-bold text-zinc-600 hover:text-black transition-colors flex items-center gap-1 bg-white border border-zinc-200 hover:border-zinc-300 px-2 py-1 rounded shadow-sm"
                        >
                          <Mail className="w-3 h-3" />
                          Notificar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section C: Recent Activity Feed */}
            <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-zinc-950 text-base flex items-center gap-2">
                  <Activity className="w-5 h-5 text-zinc-800" />
                  Actividad Reciente
                </h3>
                <p className="text-xs text-zinc-500">Bitácora de auditoría de los proyectos supervisados.</p>
              </div>

              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {recentActivity.length === 0 ? (
                  <span className="text-xs text-zinc-400 font-mono block text-center py-6">Sin eventos registrados</span>
                ) : (
                  recentActivity.map((log) => (
                    <div key={log._id} className="text-xs space-y-1 pb-3 border-b border-zinc-100 last:border-b-0">
                      <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                        <span className="truncate max-w-[150px]">{log.projectName}</span>
                        <span>{new Date(log.timestamp).toLocaleDateString('es-CL')}</span>
                      </div>
                      <p className="text-zinc-800">
                        <span className="font-bold text-black">{log.userName}</span>{' '}
                        <span className="text-zinc-600 font-medium">realizó {log.action}</span>: {log.details}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Pending reviews tab */
        pendingReviews.length === 0 ? (
          <div className="text-center py-16 bg-white border border-zinc-200 rounded-xl">
            <FileCheck className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-black mb-1">Sin solicitudes pendientes</h3>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              No tienes revisiones ni solicitudes de firma digital esperando tu veredicto.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-mono text-zinc-400 uppercase">
                    <th className="px-6 py-3">Tipo / Item</th>
                    <th className="px-6 py-3">Solicitante</th>
                    <th className="px-6 py-3">Fecha Solicitud</th>
                    <th className="px-6 py-3">Versión</th>
                    <th className="px-6 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {pendingReviews.map((rev) => (
                    <tr key={rev._id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-zinc-100 rounded text-zinc-700">
                            {rev.itemType === 'Proposal' ? <Layers className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                          </span>
                          <div>
                            <span className="font-bold text-black block">{rev.itemTitle}</span>
                            <span className="text-[10px] text-zinc-400 font-mono capitalize">{rev.itemType}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 font-medium">
                        {rev.requestedByName}
                      </td>
                      <td className="px-6 py-4 text-zinc-400 font-mono text-xs">
                        {new Date(rev.submittedAt).toLocaleDateString('es-CL', {
                          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-800 rounded font-mono text-xs">
                          v{rev.version}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            if (rev.project) {
                              handleSelectProject(rev.project, '/aprobaciones');
                            } else {
                              navigate('/aprobaciones');
                            }
                          }}
                          className="bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-1.5 rounded transition-colors"
                        >
                          Revisar y Firmar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Student Detail Modal (Drawer Effect) */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end animate-fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-8 flex flex-col justify-between overflow-y-auto transform translate-x-0 transition-transform duration-300">
            <div className="space-y-8">
              {/* Top bar */}
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
                  Detalle del Estudiante
                </span>
                <button 
                  onClick={() => setSelectedStudent(null)} 
                  className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-black transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* General Profile */}
              <div className="flex items-start gap-4 pb-6 border-b border-zinc-100">
                <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-md">
                  {selectedStudent.user.name.charAt(0)}
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg text-zinc-950 leading-tight">{selectedStudent.user.name}</h3>
                  <p className="text-xs text-zinc-500 font-medium">{selectedStudent.user.email}</p>
                  <span className="inline-block text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200 px-2 py-0.5 rounded uppercase mt-1">
                    {selectedStudent.operationalRole}
                  </span>
                </div>
              </div>

              {/* Project Context */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-zinc-400 uppercase block">Proyecto</span>
                <span className="font-bold text-sm text-zinc-950 block">{selectedStudentProject}</span>
              </div>

              {/* Tasks Progress */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-zinc-400 uppercase block">Desempeño en Tareas</span>
                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-150 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-500 font-medium block">Tareas Completadas</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black font-mono text-zinc-900">{selectedStudent.tasksCompletedCount}</span>
                      <span className="text-xs text-zinc-400 font-mono">/ {selectedStudent.tasksCount}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black font-mono text-zinc-950 block">
                      {selectedStudent.tasksCount > 0 ? Math.round((selectedStudent.tasksCompletedCount / selectedStudent.tasksCount) * 100) : 0}%
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400 uppercase block">Porcentaje de Avance</span>
                  </div>
                </div>
              </div>

              {/* Meetings Attendance */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-zinc-400 uppercase block">Asistencia a Reuniones</span>
                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-150 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-500 font-medium block">Participación en Minutas</span>
                    <span className="text-2xl font-black font-mono text-zinc-900">{selectedStudent.meetingsCount}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-zinc-400 font-mono block">Reuniones registradas</span>
                    <span className="text-[10px] text-zinc-400 block">con presencia activa</span>
                  </div>
                </div>
              </div>

              {/* Rubric Evaluations */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-zinc-400 uppercase block">Evaluaciones por Rúbrica Recibidas</span>
                {selectedStudent.evaluationsReceived.length === 0 ? (
                  <span className="text-xs text-zinc-400 font-mono block italic py-2">Ninguna evaluación registrada para este estudiante aún.</span>
                ) : (
                  <div className="space-y-2">
                    {selectedStudent.evaluationsReceived.map((evalItem, index) => (
                      <div key={index} className="p-3 border border-zinc-200 rounded-xl bg-zinc-50/50 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-zinc-950 block">{evalItem.rubricName}</span>
                          <span className="text-[10px] text-zinc-400 font-mono capitalize">Estado: {evalItem.status === 'Published' ? 'Publicado' : 'Borrador'}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-sm text-zinc-950 font-mono block">{evalItem.totalScore.toFixed(2)}</span>
                          <span className="text-[9px] text-zinc-400 font-mono block">Puntuación</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom action */}
            <div className="pt-6 border-t border-zinc-100">
              <button 
                onClick={() => setSelectedStudent(null)}
                className="w-full bg-black text-white hover:bg-zinc-900 py-3 rounded-xl font-bold text-xs transition-colors text-center block"
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Email Composition Modal */}
      {showEmailModal && emailAlert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-zinc-900 text-white rounded-lg">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-zinc-950">Enviar Correo a Estudiantes</h3>
                  <p className="text-[11px] text-zinc-500 font-mono">{emailAlert.projectName}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="p-1 rounded-lg hover:bg-zinc-150 text-zinc-400 hover:text-zinc-950 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="p-6 flex-1 overflow-y-auto space-y-4">
              {emailSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium animate-pulse">
                  ✓ {emailSuccess}
                </div>
              )}
              {emailError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl font-medium">
                  ⚠ {emailError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700">Asunto del Correo</label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700">Mensaje para el Equipo</label>
                <textarea
                  required
                  rows={8}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black font-medium font-sans leading-relaxed"
                  placeholder="Escribe el cuerpo del correo aquí..."
                />
              </div>

              {/* Info alert */}
              <div className="flex gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-[11px] text-zinc-500 font-medium">
                <Info className="w-4 h-4 text-zinc-400 shrink-0" />
                <p>
                  Este correo será despachado de inmediato utilizando la configuración SMTP institucional y se enviará a todos los estudiantes inscritos en el proyecto.
                </p>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-zinc-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="px-4 py-2 bg-black text-white hover:bg-zinc-900 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {sendingEmail ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Enviar Correo
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

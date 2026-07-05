import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { 
  Trophy, 
  Target, 
  CheckSquare, 
  FileText, 
  Calendar, 
  AlertCircle,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  Sparkles,
  Info,
  Clock,
  Check,
  ChevronRight,
  X,
  AlertTriangle,
  Activity,
  UserCheck
} from 'lucide-react';

interface Deliverable {
  _id: string;
  name: string;
  description: string;
  dueDate: string;
  status: 'Pending' | 'InReview' | 'Approved' | 'ChangesRequested' | 'Finalized';
  versions?: any[];
}

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'Todo' | 'In-Progress' | 'Review' | 'Done';
  dueDate: string | null;
  createdAt: string;
  sprint: string;
}

interface Requirement {
  _id: string;
  title: string;
  status: 'Draft' | 'Review' | 'Approved' | 'Rejected';
}

export const Roadmap: React.FC = () => {
  const { activeProject, members } = useProjectStore();
  const { getAuthHeaders, user } = useAuthStore();

  // Tab State
  const [activeTab, setActiveTab] = useState<'timeline' | 'gantt' | 'analytics'>('timeline');

  // Backend Data
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedMilestone, setSelectedMilestone] = useState<Deliverable | null>(null);
  
  // Form State
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formStatus, setFormStatus] = useState<Deliverable['status']>('Pending');

  // Check permissions
  const isSupervisor = useMemo(() => {
    return ['Docente', 'Coordinador', 'Admin'].includes(user?.role || '');
  }, [user]);

  const isProjectAdmin = useMemo(() => {
    return members.some(m => m.user._id === user?._id && m.role === 'Admin');
  }, [members, user]);

  const canManage = isSupervisor || isProjectAdmin;

  // Fetch all related entities
  const fetchData = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      const projectId = activeProject._id;

      const [delRes, taskRes, reqRes] = await Promise.all([
        fetch(`http://localhost:5000/api/deliverables/project/${projectId}`, { headers }),
        fetch(`http://localhost:5000/api/tasks/project/${projectId}`, { headers }),
        fetch(`http://localhost:5000/api/requirements/project/${projectId}`, { headers })
      ]);

      if (!delRes.ok || !taskRes.ok || !reqRes.ok) {
        throw new Error('Error al cargar datos del proyecto.');
      }

      const delData = await delRes.json();
      const taskData = await taskRes.json();
      const reqData = await reqRes.json();

      setDeliverables(delData.sort((a: Deliverable, b: Deliverable) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
      setTasks(taskData);
      setRequirements(reqData);
    } catch (err: any) {
      setError(err.message || 'Error de red.');
    } finally {
      setLoading(false);
    }
  }, [activeProject, getAuthHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Overall progress percentage
  const overallProgress = useMemo(() => {
    if (deliverables.length === 0) return 0;
    const approvedCount = deliverables.filter(d => d.status === 'Approved' || d.status === 'Finalized').length;
    return Math.round((approvedCount / deliverables.length) * 100);
  }, [deliverables]);

  // Health assessment
  const projectHealth = useMemo(() => {
    const now = new Date();
    // Overdue tasks
    const overdueTasks = tasks.filter(t => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < now).length;
    // Overdue deliverables (milestones)
    const overdueDeliverables = deliverables.filter(d => d.status !== 'Approved' && d.status !== 'Finalized' && new Date(d.dueDate) < now).length;

    if (overdueDeliverables > 0 || overdueTasks > 4) {
      return { label: 'Crítico', color: 'text-rose-600 bg-rose-50 border-rose-200', text: 'Múltiples retrasos identificados. Es urgente reprogramar tareas o hitos.' };
    }
    if (overdueTasks > 0) {
      return { label: 'En Riesgo', color: 'text-amber-600 bg-amber-50 border-amber-200', text: 'Tienes tareas del sprint vencidas. Monitorea los plazos de entrega.' };
    }
    return { label: 'Saludable', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', text: 'El proyecto se encuentra al día según los plazos establecidos.' };
  }, [tasks, deliverables]);

  // AI Forecast Calculation
  const aiForecast = useMemo(() => {
    if (!activeProject || tasks.length === 0) {
      return { 
        text: 'Crea y cierra tareas en tus sprints para generar estimaciones de progreso predictivas de la IA.',
        eta: null,
        status: 'insufficient_data'
      };
    }

    const start = new Date(activeProject.createdAt || Date.now());
    const now = new Date();
    const daysElapsed = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    
    const completedTasks = tasks.filter(t => t.status === 'Done').length;
    const totalTasks = tasks.length;
    const pendingTasks = totalTasks - completedTasks;

    if (completedTasks === 0) {
      return {
        text: 'Comienza a completar tus tareas para evaluar el ritmo de desarrollo del equipo.',
        eta: 'Sin estimación de velocidad',
        status: 'no_completed_tasks'
      };
    }

    // Average tasks completed per day
    const tasksPerDay = completedTasks / daysElapsed;
    const estimatedDaysNeeded = Math.ceil(pendingTasks / tasksPerDay);
    const estimatedCompletionDate = new Date(now.getTime() + estimatedDaysNeeded * 24 * 60 * 60 * 1000);

    // Final Milestone Due Date
    const lastMilestone = deliverables[deliverables.length - 1];
    if (!lastMilestone) {
      return {
        text: 'No hay hitos registrados para contrastar la proyección.',
        eta: estimatedCompletionDate.toLocaleDateString(),
        status: 'no_milestones'
      };
    }

    const targetDate = new Date(lastMilestone.dueDate);
    const diffDays = Math.ceil((targetDate.getTime() - estimatedCompletionDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0) {
      return {
        text: `✨ Proyección de la IA: Tu equipo progresa a un ritmo de ${(tasksPerDay * 7).toFixed(1)} tareas por semana. Se estima la finalización para el ${estimatedCompletionDate.toLocaleDateString()} (aproximadamente ${diffDays} días antes de la fecha límite final).`,
        eta: estimatedCompletionDate.toLocaleDateString(),
        status: 'ahead'
      };
    } else {
      return {
        text: `⚠️ Alerta de Retraso IA: Al ritmo actual de ${(tasksPerDay * 7).toFixed(1)} tareas por semana, finalizarás cerca del ${estimatedCompletionDate.toLocaleDateString()} (${Math.abs(diffDays)} días de retraso respecto a la fecha final programada). Se sugiere reasignar tareas o extender plazos.`,
        eta: estimatedCompletionDate.toLocaleDateString(),
        status: 'behind'
      };
    }
  }, [activeProject, tasks, deliverables]);

  // Gantt Dimensions
  const ganttConfig = useMemo(() => {
    if (!activeProject || deliverables.length === 0) return null;
    const start = new Date(activeProject.createdAt || Date.now());
    let end = new Date(start.getTime() + 120 * 24 * 60 * 60 * 1000); // 120 days base

    deliverables.forEach(d => {
      const dDate = new Date(d.dueDate);
      if (dDate > end) {
        end = dDate;
      }
    });

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.max(12, Math.ceil(totalDays / 7));

    return {
      startDate: start,
      endDate: end,
      totalDays,
      totalWeeks
    };
  }, [activeProject, deliverables]);

  // Handle open modal
  const openModal = (mode: 'create' | 'edit', milestone?: Deliverable) => {
    setModalMode(mode);
    if (mode === 'edit' && milestone) {
      setSelectedMilestone(milestone);
      setFormName(milestone.name);
      setFormDescription(milestone.description);
      setFormDueDate(milestone.dueDate.split('T')[0]);
      setFormStatus(milestone.status);
    } else {
      setSelectedMilestone(null);
      setFormName('');
      setFormDescription('');
      setFormDueDate('');
      setFormStatus('Pending');
    }
    setIsModalOpen(true);
  };

  // Submit Milestone (Create/Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    const payload = {
      name: formName,
      description: formDescription,
      dueDate: new Date(formDueDate).toISOString(),
      status: formStatus,
      project: activeProject._id
    };

    try {
      const headers = {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      };

      let res;
      if (modalMode === 'edit' && selectedMilestone) {
        res = await fetch(`http://localhost:5000/api/deliverables/${selectedMilestone._id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('http://localhost:5000/api/deliverables', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al guardar el hito.');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error al guardar el entregable.');
    }
  };

  // Delete Milestone
  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este hito académico? Se perderá el registro del entregable asociado.')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/deliverables/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al eliminar el hito.');
      }

      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar entregable.');
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500">
        <AlertCircle className="w-12 h-12 mb-4 text-zinc-400 animate-pulse" />
        <p className="text-sm font-semibold">Por favor selecciona un proyecto activo en el panel superior.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in pb-16">
      {/* Premium Banner */}
      <div className="relative overflow-hidden bg-zinc-950 text-white rounded-2xl p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/50 via-transparent to-transparent pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold uppercase tracking-wider">
              {activeProject.methodology}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              Proyecto ID: {activeProject._id}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            Hoja de Ruta y Cronograma
          </h1>
          <p className="text-zinc-400 text-sm max-w-2xl">
            Monitorea el progreso consolidado del proyecto. Administra metas académicas, visualiza plazos en el diagrama Gantt y evalúa riesgos con proyecciones inteligentes de la IA.
          </p>
        </div>

        <div className="flex items-center gap-6 bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 relative z-10 shadow-inner">
          <div className="relative flex items-center justify-center">
            {/* Custom SVG Radial Progress */}
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                className="stroke-zinc-800 fill-transparent"
                strokeWidth="5"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                className="stroke-emerald-500 fill-transparent transition-all duration-1000 ease-out"
                strokeWidth="5"
                strokeDasharray={175}
                strokeDashoffset={175 - (175 * overallProgress) / 100}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-sm font-black font-mono text-white">
              {overallProgress}%
            </span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 font-mono block uppercase tracking-wider">
              Hitos Aprobados
            </span>
            <span className="text-xl font-black text-white font-mono">
              {deliverables.filter(d => d.status === 'Approved' || d.status === 'Finalized').length}
              <span className="text-xs text-zinc-500 font-normal"> / {deliverables.length}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-zinc-200 pb-px gap-4">
        <div className="flex border-b border-zinc-200 sm:border-b-0">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'timeline'
                ? 'border-black text-black'
                : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Línea de Hitos
          </button>
          <button
            onClick={() => setActiveTab('gantt')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'gantt'
                ? 'border-black text-black'
                : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Diagrama Gantt
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'border-black text-black'
                : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <Activity className="w-4 h-4" />
            Análisis de Salud e IA
          </button>
        </div>

        {canManage && (
          <button
            onClick={() => openModal('create')}
            className="flex items-center gap-2 bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-zinc-800 transition-all shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Agregar Hito de Tesis
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <div className="w-8 h-8 border-3 border-zinc-950 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-mono text-zinc-500">Analizando registros y estructurando cronograma...</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
          <p className="font-semibold text-sm">Error al sincronizar la hoja de ruta</p>
          <p className="text-xs text-red-500 mt-1">{error}</p>
        </div>
      ) : (
        <>
          {/* TAB 1: TIMELINE DETAIL CHECKLIST */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {deliverables.length === 0 ? (
                <div className="text-center py-16 bg-white border border-zinc-200 rounded-2xl shadow-xs text-zinc-400">
                  <Trophy className="w-12 h-12 mb-3 text-zinc-300 mx-auto" />
                  <p className="text-sm font-semibold">Sin hitos registrados.</p>
                  <p className="text-xs text-zinc-500 mt-1">Crea entregables oficiales para construir la línea de progreso del proyecto.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Vertical Timeline Tree */}
                  <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6">
                    <h2 className="text-base font-bold text-zinc-950 flex items-center gap-2 border-b border-zinc-100 pb-3">
                      <MapPin className="w-5 h-5 text-zinc-400" />
                      <span>Cronograma Académico y Metas Clave</span>
                    </h2>

                    <div className="relative border-l border-zinc-200 ml-5 pl-8 space-y-8 py-2">
                      {deliverables.map((milestone, idx) => {
                        const isApproved = milestone.status === 'Approved' || milestone.status === 'Finalized';
                        const isInReview = milestone.status === 'InReview';
                        const isChangesRequested = milestone.status === 'ChangesRequested';
                        const isPast = new Date(milestone.dueDate) < new Date() && !isApproved;

                        return (
                          <div key={milestone._id} className="relative group">
                            {/* Dot Icon */}
                            <div className={`absolute -left-13 top-0.5 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                              isApproved 
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' 
                                : isInReview
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md animate-pulse'
                                : isChangesRequested
                                ? 'bg-rose-500 border-rose-500 text-white shadow-md'
                                : isPast
                                ? 'bg-rose-100 border-rose-350 text-rose-600 animate-pulse'
                                : 'bg-white border-zinc-200 text-zinc-400'
                            }`}>
                              {isApproved ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : isInReview ? (
                                <Clock className="w-5 h-5 animate-spin" />
                              ) : (
                                <span className="text-xs font-mono font-bold">{idx + 1}</span>
                              )}
                            </div>

                            {/* Info Card */}
                            <div className={`p-5 rounded-xl border transition-all ${
                              isApproved 
                                ? 'bg-zinc-50/50 border-zinc-200' 
                                : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-sm'
                            }`}>
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                                <div>
                                  <h3 className={`text-sm font-extrabold ${isApproved ? 'text-zinc-600 line-through' : 'text-zinc-900'}`}>
                                    {milestone.name}
                                  </h3>
                                  <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                                    Límite: {new Date(milestone.dueDate).toLocaleDateString('es-CL', { dateStyle: 'long' })}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                                    isApproved 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : isInReview
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : isChangesRequested
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : isPast
                                      ? 'bg-red-50 text-red-700 border-red-200'
                                      : 'bg-zinc-150 text-zinc-600 border-zinc-200'
                                  }`}>
                                    {isApproved ? 'Aprobado' : isInReview ? 'En Revisión' : isChangesRequested ? 'Cambios Requeridos' : isPast ? 'Vencido' : 'Pendiente'}
                                  </span>

                                  {canManage && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => openModal('edit', milestone)}
                                        className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-800 transition-colors"
                                        title="Editar Hito"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(milestone._id)}
                                        className="p-1 hover:bg-red-50 rounded text-zinc-500 hover:text-red-600 transition-colors"
                                        title="Eliminar Hito"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs text-zinc-500 leading-relaxed font-normal mb-3">
                                {milestone.description || 'Sin descripción detallada.'}
                              </p>

                              {/* Task and requirements associations */}
                              <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-400 border-t border-zinc-150/60 pt-3 mt-3">
                                <span className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded text-zinc-600">
                                  <CheckSquare className="w-3.5 h-3.5" />
                                  <span className="font-semibold">Ficha Entregables</span>
                                </span>
                                {milestone.versions && milestone.versions.length > 0 && (
                                  <span className="text-zinc-500 font-mono">
                                    Último archivo: {milestone.versions[milestone.versions.length - 1].fileName} (V{milestone.versions.length})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sidebar Analytics widgets */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 space-y-4">
                      <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                        <span>Estado General y Salud</span>
                      </h3>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500 font-medium">Fórmula del Proyecto:</span>
                          <span className="font-bold text-zinc-950">{projectHealth.label}</span>
                        </div>
                        <div className={`p-4 rounded-xl border text-xs font-medium leading-relaxed ${projectHealth.color}`}>
                          {projectHealth.text}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-sm">
                      <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-zinc-500" />
                        <span>Resumen Operativo</span>
                      </h3>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-50 border border-zinc-150 p-3.5 rounded-xl text-center">
                          <span className="text-xl font-black text-zinc-950 font-mono block">
                            {tasks.filter(t => t.status === 'Done').length}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                            Tareas Listas
                          </span>
                        </div>
                        <div className="bg-zinc-50 border border-zinc-150 p-3.5 rounded-xl text-center">
                          <span className="text-xl font-black text-zinc-950 font-mono block">
                            {requirements.filter(r => r.status === 'Approved').length}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                            Requisitos OK
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INTERACTIVE GANTT CHART */}
          {activeTab === 'gantt' && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-zinc-400" />
                    <span>Diagrama Gantt e Hitos por Semana</span>
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Planificación estructurada en base a la fecha de creación del proyecto. Las barras representan la duración estimada de cada hito y tarea.
                  </p>
                </div>
              </div>

              {deliverables.length === 0 ? (
                <div className="text-center py-12 text-zinc-400">
                  <Calendar className="w-12 h-12 mb-3 text-zinc-300 mx-auto" />
                  <p className="text-sm font-semibold">Diagrama vacío.</p>
                  <p className="text-xs text-zinc-500 mt-1">Registra hitos para visualizar la carta Gantt del proyecto.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[800px] border border-zinc-150 rounded-xl overflow-hidden relative">
                    
                    {/* Header Columns */}
                    <div className="grid grid-cols-12 bg-zinc-50 border-b border-zinc-150 font-mono text-[10px] text-zinc-500 font-bold uppercase py-3 divide-x divide-zinc-200">
                      <div className="col-span-3 px-4 flex items-center">Hito / Fase Académica</div>
                      <div className="col-span-9 grid grid-cols-8 divide-x divide-zinc-200 text-center">
                        <div className="px-1">S 1-2</div>
                        <div className="px-1">S 3-4</div>
                        <div className="px-1">S 5-6</div>
                        <div className="px-1">S 7-8</div>
                        <div className="px-1">S 9-10</div>
                        <div className="px-1">S 11-12</div>
                        <div className="px-1">S 13-14</div>
                        <div className="px-1">S 15-16</div>
                      </div>
                    </div>

                    {/* Gantt Rows */}
                    <div className="divide-y divide-zinc-150 relative">
                      
                      {/* Vertical Red Line representing TODAY */}
                      {(() => {
                        if (!ganttConfig) return null;
                        const today = new Date();
                        const elapsed = today.getTime() - ganttConfig.startDate.getTime();
                        const percent = Math.min(100, Math.max(0, (elapsed / (ganttConfig.totalDays * 24 * 60 * 60 * 1000)) * 100));
                        
                        // Width of the left column is 3/12 = 25%. So we offset by 25% + (percent * 0.75)
                        const offsetPercent = 25 + (percent * 0.75);

                        return (
                          <div 
                            className="absolute top-0 bottom-0 border-l-2 border-dashed border-red-500 z-10 pointer-events-none"
                            style={{ left: `${offsetPercent}%` }}
                            title="Hoy"
                          >
                            <span className="bg-red-500 text-white font-mono text-[8px] px-1 py-0.5 rounded absolute top-0 -translate-x-1/2">HOY</span>
                          </div>
                        );
                      })()}

                      {deliverables.map((milestone, idx) => {
                        // Calculate phase start and span.
                        // First milestone starts at week 1, subsequent start after previous milestone's date
                        const start = new Date(activeProject.createdAt || Date.now());
                        const prevMilestone = idx > 0 ? deliverables[idx - 1] : null;
                        const phaseStart = prevMilestone ? new Date(prevMilestone.dueDate) : start;
                        const phaseEnd = new Date(milestone.dueDate);

                        // Percentages relative to total timeline duration
                        const totalMs = ganttConfig ? ganttConfig.endDate.getTime() - start.getTime() : 1;
                        const startPct = Math.max(0, ((phaseStart.getTime() - start.getTime()) / totalMs) * 100);
                        const endPct = Math.min(100, ((phaseEnd.getTime() - start.getTime()) / totalMs) * 100);
                        const widthPct = Math.max(5, endPct - startPct);

                        const isApproved = milestone.status === 'Approved' || milestone.status === 'Finalized';

                        return (
                          <div key={milestone._id} className="grid grid-cols-12 items-center hover:bg-zinc-50/50 transition-colors py-4">
                            {/* Left Text */}
                            <div className="col-span-3 px-4 min-w-0">
                              <p className={`text-xs font-bold text-zinc-900 truncate`} title={milestone.name}>
                                {milestone.name}
                              </p>
                              <span className="text-[9px] text-zinc-400 font-mono block">
                                Límite: {phaseEnd.toLocaleDateString()}
                              </span>
                            </div>

                            {/* Gantt Bar Container */}
                            <div className="col-span-9 h-6 relative px-2">
                              <div
                                className={`h-5 rounded-full absolute flex items-center justify-between px-3 text-[9px] font-bold font-mono transition-all group cursor-pointer ${
                                  isApproved
                                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/10'
                                    : 'bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-700 shadow-sm'
                                }`}
                                style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                                title={`${milestone.name}: ${phaseStart.toLocaleDateString()} al ${phaseEnd.toLocaleDateString()}`}
                              >
                                <span className="truncate pr-2">{milestone.name}</span>
                                {isApproved && <Check className="w-3 h-3 shrink-0" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HEALTH AND PREDICITIVE ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-8">
              
              {/* AI Forecast Card */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                  <div className="p-2 bg-zinc-950 text-white rounded-lg">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">
                      Asistente Predictivo y Pronósticos de Tesis
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Lógica predictiva avanzada que calcula el desempeño de sprints y la fecha de finalización.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-8 space-y-3">
                    <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 p-4 rounded-xl">
                      <TrendingUp className="w-5 h-5 text-zinc-700 shrink-0" />
                      <p className="text-xs text-zinc-700 leading-relaxed font-medium">
                        {aiForecast.text}
                      </p>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      💡 <strong>¿Cómo funciona la proyección?</strong> Analizamos los días transcurridos desde que se inscribió tu proyecto en la plataforma y calculamos la tasa diaria de tareas cerradas en tus sprints para estimar la fecha en que culminarás los entregables restantes.
                    </p>
                  </div>

                  <div className="md:col-span-4 bg-zinc-950 text-white p-5 rounded-xl border border-zinc-800 text-center space-y-2">
                    <span className="text-[10px] text-zinc-500 font-mono block uppercase tracking-wider">
                      Fecha Estimada de Término
                    </span>
                    <span className="text-xl font-black text-emerald-400 font-mono block">
                      {aiForecast.eta || 'Requiere más datos'}
                    </span>
                    <span className="text-[10px] text-zinc-400 block font-medium">
                      {aiForecast.status === 'ahead' ? 'Vas a ritmo óptimo' : aiForecast.status === 'behind' ? 'Riesgo de retraso detectado' : 'Sin proyección disponible'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Analytics Dashboard Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Task Breakdown */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Estado del Sprint</span>
                    <CheckSquare className="w-4.5 h-4.5 text-zinc-400" />
                  </h3>
                  
                  <div className="space-y-3.5">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-xs text-zinc-500 font-medium mb-1">
                        <span>Tareas Done</span>
                        <span>{tasks.filter(t => t.status === 'Done').length} / {tasks.length}</span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-1.5">
                        <div 
                          className="bg-zinc-950 h-1.5 rounded-full transition-all duration-500" 
                          style={{ width: `${tasks.length > 0 ? (tasks.filter(t => t.status === 'Done').length / tasks.length) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-lg">
                        <span className="text-base font-black text-zinc-900 font-mono block">
                          {tasks.filter(t => t.status === 'In-Progress').length}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider block">
                          En Desarrollo
                        </span>
                      </div>
                      <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-lg">
                        <span className="text-base font-black text-zinc-900 font-mono block">
                          {tasks.filter(t => t.status === 'Review').length}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider block">
                          Por Revisar
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Requirements Health */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Requerimientos de Tesis</span>
                    <Target className="w-4.5 h-4.5 text-zinc-400" />
                  </h3>

                  <div className="space-y-3.5">
                    <div>
                      <div className="flex justify-between text-xs text-zinc-500 font-medium mb-1">
                        <span>Aprobados</span>
                        <span>{requirements.filter(r => r.status === 'Approved').length} / {requirements.length}</span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-1.5">
                        <div 
                          className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500" 
                          style={{ width: `${requirements.length > 0 ? (requirements.filter(r => r.status === 'Approved').length / requirements.length) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-lg">
                        <span className="text-base font-black text-zinc-900 font-mono block">
                          {requirements.filter(r => r.status === 'Review').length}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider block">
                          En Revisión
                        </span>
                      </div>
                      <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-lg">
                        <span className="text-base font-black text-zinc-900 font-mono block">
                          {requirements.filter(r => r.status === 'Draft').length}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider block">
                          Borradores
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overdue Tasks and Deadlines */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Alarmas de Plazos</span>
                    <AlertTriangle className="w-4.5 h-4.5 text-zinc-400" />
                  </h3>

                  {(() => {
                    const overdueTasksCount = tasks.filter(t => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < new Date()).length;
                    return (
                      <div className="space-y-4 flex-1 flex flex-col justify-center">
                        <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
                          overdueTasksCount > 0 
                            ? 'bg-rose-50 border-rose-200 text-rose-800' 
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        }`}>
                          {overdueTasksCount > 0 ? (
                            <>
                              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                              <div>
                                <span className="font-bold">Alerta:</span> Tienes <span className="font-bold">{overdueTasksCount} tareas fuera de plazo</span> en este ciclo.
                              </div>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                              <div>
                                <span className="font-bold">Al día:</span> No tienes tareas fuera de plazo actualmente. ¡Excelente ritmo!
                              </div>
                            </>
                          )}
                        </div>

                        <p className="text-[10px] text-zinc-400">
                          Revisa la fecha de término en tus tareas de sprint para evitar retrasar el entregable del hito actual.
                        </p>
                      </div>
                    );
                  })()}
                </div>

              </div>

            </div>
          )}
        </>
      )}

      {/* CREATE / EDIT MILESTONE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl space-y-6 p-6">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h2 className="text-base font-bold text-zinc-900">
                {modalMode === 'edit' ? 'Modificar Hito de Tesis' : 'Crear Nuevo Hito Académico'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 block">Nombre del Hito</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-250 rounded-xl p-3 focus:outline-none focus:border-zinc-900 font-sans"
                  placeholder="Ej. Hito 2: Requisitos y Diseño"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 block">Descripción Académica / Criterio de Aceptación</label>
                <textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-250 rounded-xl p-3 focus:outline-none focus:border-zinc-900 resize-none font-sans"
                  placeholder="Describe los entregables esperados en este hito y sus criterios mínimos..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 block">Fecha Límite</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-250 rounded-xl p-3 focus:outline-none focus:border-zinc-900 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 block">Estado Inicial</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as Deliverable['status'])}
                    className="w-full bg-zinc-50 border border-zinc-250 rounded-xl p-3 focus:outline-none focus:border-zinc-900"
                  >
                    <option value="Pending">Pendiente</option>
                    <option value="InReview">En Revisión</option>
                    <option value="Approved">Aprobado / Completado</option>
                    <option value="ChangesRequested">Cambios Solicitados</option>
                    <option value="Finalized">Finalizado (Congelado)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-zinc-600 font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white hover:bg-zinc-800 rounded-xl font-bold transition-all"
                >
                  {modalMode === 'edit' ? 'Guardar Cambios' : 'Crear Hito'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roadmap;

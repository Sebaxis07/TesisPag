import React, { useEffect, useState, useCallback } from 'react';
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
  CheckCircle2
} from 'lucide-react';

interface Metric {
  total: number;
  completed: number;
  pct: number;
}

export const Roadmap: React.FC = () => {
  const { activeProject } = useProjectStore();
  const { getAuthHeaders } = useAuthStore();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [requirementsMetric, setRequirementsMetric] = useState<Metric>({ total: 0, completed: 0, pct: 0 });
  const [tasksMetric, setTasksMetric] = useState<Metric>({ total: 0, completed: 0, pct: 0 });
  const [deliverablesMetric, setDeliverablesMetric] = useState<Metric>({ total: 0, completed: 0, pct: 0 });
  const [reportsMetric, setReportsMetric] = useState<Metric>({ total: 0, completed: 0, pct: 0 });
  
  const [overdueTasksCount, setOverdueTasksCount] = useState<number>(0);
  const [overallProgress, setOverallProgress] = useState<number>(0);

  const fetchMetrics = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      const projectId = activeProject._id;

      const [reqsRes, tasksRes, deliverablesRes, docsRes] = await Promise.all([
        fetch(`http://localhost:5000/api/requirements/project/${projectId}`, { headers }),
        fetch(`http://localhost:5000/api/tasks/project/${projectId}`, { headers }),
        fetch(`http://localhost:5000/api/deliverables/project/${projectId}`, { headers }),
        fetch(`http://localhost:5000/api/documents/project/${projectId}`, { headers })
      ]);

      let reqsData = [];
      if (reqsRes.ok) reqsData = await reqsRes.json();
      
      let tasksData = [];
      if (tasksRes.ok) tasksData = await tasksRes.json();

      let delData = [];
      if (deliverablesRes.ok) delData = await deliverablesRes.json();

      let docsData = [];
      if (docsRes.ok) docsData = await docsRes.json();

      // 1. Requirements metrics
      const totalReqs = reqsData.length;
      const completedReqs = reqsData.filter((r: any) => r.status === 'Completed' || r.status === 'Approved').length;
      const reqPct = totalReqs > 0 ? Math.round((completedReqs / totalReqs) * 100) : 0;
      setRequirementsMetric({ total: totalReqs, completed: completedReqs, pct: reqPct });

      // 2. Tasks metrics & Overdue
      const totalTasks = tasksData.length;
      const completedTasks = tasksData.filter((t: any) => t.status === 'Done').length;
      const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      setTasksMetric({ total: totalTasks, completed: completedTasks, pct: taskPct });

      const now = new Date();
      const overdueTasks = tasksData.filter((t: any) => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < now).length;
      setOverdueTasksCount(overdueTasks);

      // 3. Deliverables metrics
      const totalDels = delData.length;
      const completedDels = delData.filter((d: any) => d.status === 'Approved' || d.status === 'Finalized').length;
      const delPct = totalDels > 0 ? Math.round((completedDels / totalDels) * 100) : 0;
      setDeliverablesMetric({ total: totalDels, completed: completedDels, pct: delPct });

      // 4. Report sections metrics
      const totalDocs = docsData.length;
      const completedDocs = docsData.filter((d: any) => d.status === 'Final').length;
      const docPct = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;
      setReportsMetric({ total: totalDocs, completed: completedDocs, pct: docPct });

      // 5. Overall project progress calculation:
      // Weighting: 35% Requirements, 35% Deliverables, 20% Tasks, 10% Report Sections
      let calculatedProgress = 0;
      let weightsUsed = 0;

      if (totalReqs > 0) { calculatedProgress += reqPct * 0.35; weightsUsed += 0.35; }
      if (totalDels > 0) { calculatedProgress += delPct * 0.35; weightsUsed += 0.35; }
      if (totalTasks > 0) { calculatedProgress += taskPct * 0.20; weightsUsed += 0.20; }
      if (totalDocs > 0) { calculatedProgress += docPct * 0.10; weightsUsed += 0.10; }

      const finalProgress = weightsUsed > 0 ? Math.round(calculatedProgress / weightsUsed) : 0;
      setOverallProgress(finalProgress);

    } catch (err: any) {
      setError(err.message || 'Error al obtener datos del Roadmap');
    } finally {
      setLoading(false);
    }
  }, [activeProject, getAuthHeaders]);

  useEffect(() => {
    fetchMetrics();
  }, [activeProject]);

  // Defined interactive milestones
  const milestones = [
    {
      title: 'Hito 1: Propuesta y Anteproyecto',
      requiredProgress: 15,
      description: 'Formalización del tema, definición del problema del cliente Electrans y aprobación de objetivos iniciales.',
      deliverables: 'Propuesta de Tesis, Ficha de Inscripción',
      status: overallProgress >= 15 ? 'completed' : 'pending'
    },
    {
      title: 'Hito 2: Requisitos y Marco Conceptual',
      requiredProgress: 40,
      description: 'Levantamiento exhaustivo de requerimientos, especificación técnica de stacks y primera reunión de avance.',
      deliverables: 'Documento de Requerimientos, Minutas 1-3',
      status: overallProgress >= 40 ? 'completed' : overallProgress >= 15 ? 'current' : 'pending'
    },
    {
      title: 'Hito 3: Arquitectura, Diagramas y Diseño',
      requiredProgress: 70,
      description: 'Modelamiento de bases de datos, diagramas de arquitectura UML, y decisiones técnicas críticas (ADRs).',
      deliverables: 'Informe de Arquitectura, Diagramas Mermaid',
      status: overallProgress >= 70 ? 'completed' : overallProgress >= 40 ? 'current' : 'pending'
    },
    {
      title: 'Hito 4: Informe de Avance Parcial',
      requiredProgress: 85,
      description: 'Carga de pautas académicas procesadas e importación de borradores de redacción asistida por IA.',
      deliverables: 'Borrador Completo de Tesis (Capítulos 1-3)',
      status: overallProgress >= 85 ? 'completed' : overallProgress >= 70 ? 'current' : 'pending'
    },
    {
      title: 'Hito 5: Congelamiento e Informe Final',
      requiredProgress: 95,
      description: 'Todos los entregables oficiales congelados, aprobados formalmente por el profesor guía y listos para la entrega.',
      deliverables: 'Informe de Tesis Final (PDF)',
      status: overallProgress >= 95 ? 'completed' : overallProgress >= 85 ? 'current' : 'pending'
    },
    {
      title: 'Hito 6: Simulación y Defensa Pública',
      requiredProgress: 100,
      description: 'Ensayos y preparación de la presentación de defensa con el asistente de inteligencia artificial.',
      deliverables: 'Plan de Presentación y Diapositivas listos',
      status: overallProgress >= 100 ? 'completed' : overallProgress >= 95 ? 'current' : 'pending'
    }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950 text-white p-8 rounded-2xl shadow-xl">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight">Hitos y Roadmap del Proyecto</h1>
          <p className="text-zinc-400 text-sm max-w-xl">
            Monitoreo en tiempo real del progreso acumulado de la tesis. Visualiza metas, plazos críticos e indicadores de desempeño.
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-zinc-800 text-emerald-400 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 font-mono block uppercase">Progreso Estimado</span>
            <span className="text-2xl font-black text-white font-mono">{overallProgress}%</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <div className="w-8 h-8 border-3 border-zinc-950 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-mono text-zinc-500">Calculando avance del proyecto...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-xl text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
          <p className="font-semibold text-sm">Error al cargar datos del Roadmap</p>
          <p className="text-xs text-red-500 mt-1">{error}</p>
        </div>
      ) : (
        <>
          {/* Progress Overview Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Requirements Card */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 font-mono uppercase tracking-wider">Requerimientos</span>
                <Target className="w-4.5 h-4.5 text-zinc-400" />
              </div>
              <div className="mt-4 mb-2">
                <span className="text-2xl font-black text-zinc-950 font-mono">{requirementsMetric.completed}</span>
                <span className="text-xs text-zinc-400 font-mono"> / {requirementsMetric.total} aprobados</span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-1.5 mt-2">
                <div 
                  className="bg-zinc-950 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${requirementsMetric.pct}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-zinc-500 mt-2 block font-medium">{requirementsMetric.pct}% completado</span>
            </div>

            {/* Deliverables Card */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 font-mono uppercase tracking-wider">Entregables</span>
                <Trophy className="w-4.5 h-4.5 text-zinc-400" />
              </div>
              <div className="mt-4 mb-2">
                <span className="text-2xl font-black text-zinc-950 font-mono">{deliverablesMetric.completed}</span>
                <span className="text-xs text-zinc-400 font-mono"> / {deliverablesMetric.total} aprobados</span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-1.5 mt-2">
                <div 
                  className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${deliverablesMetric.pct}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-zinc-500 mt-2 block font-medium">{deliverablesMetric.pct}% de avance oficial</span>
            </div>

            {/* Tasks Card */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 font-mono uppercase tracking-wider">Tareas de Sprint</span>
                <CheckSquare className="w-4.5 h-4.5 text-zinc-400" />
              </div>
              <div className="mt-4 mb-2">
                <span className="text-2xl font-black text-zinc-950 font-mono">{tasksMetric.completed}</span>
                <span className="text-xs text-zinc-400 font-mono"> / {tasksMetric.total} cerradas</span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-1.5 mt-2">
                <div 
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${tasksMetric.pct}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-zinc-500 mt-2 block font-medium">{tasksMetric.pct}% tareas resueltas</span>
            </div>

            {/* Reports Card */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 font-mono uppercase tracking-wider">Redacción</span>
                <FileText className="w-4.5 h-4.5 text-zinc-400" />
              </div>
              <div className="mt-4 mb-2">
                <span className="text-2xl font-black text-zinc-950 font-mono">{reportsMetric.completed}</span>
                <span className="text-xs text-zinc-400 font-mono"> / {reportsMetric.total} capítulos finalizados</span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-1.5 mt-2">
                <div 
                  className="bg-amber-600 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${reportsMetric.pct}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-zinc-500 mt-2 block font-medium">{reportsMetric.pct}% redactado</span>
            </div>

          </div>

          {/* Overdue alert banner if there are overdue tasks */}
          {overdueTasksCount > 0 && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-3 shadow-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 animate-bounce" />
              <div className="text-xs">
                <span className="font-bold">¡Atención con los plazos!</span> Tienes <span className="font-bold">{overdueTasksCount} tareas vencidas</span> sin finalizar en tu sprint activo. Te recomendamos reasignarlas o marcarlas resueltas para estabilizar el avance.
              </div>
            </div>
          )}

          {/* Interactive Timeline Roadmap */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-zinc-950 mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-zinc-400" />
              <span>Cronograma de Hitos y Avance Académico</span>
            </h2>

            <div className="relative border-l border-zinc-200 ml-4 pl-8 space-y-8 py-2">
              
              {milestones.map((milestone, idx) => {
                const isCompleted = milestone.status === 'completed';
                const isCurrent = milestone.status === 'current';

                return (
                  <div key={idx} className="relative group">
                    
                    {/* Node Dot Icon */}
                    <div className={`absolute -left-12.5 top-0.5 w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${
                      isCompleted 
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' 
                        : isCurrent
                        ? 'bg-zinc-900 border-zinc-950 text-white shadow-md animate-pulse'
                        : 'bg-white border-zinc-200 text-zinc-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <span className="text-xs font-mono font-bold">{idx + 1}</span>
                      )}
                    </div>

                    {/* Content Card */}
                    <div className={`p-5 rounded-xl border transition-all ${
                      isCompleted 
                        ? 'bg-zinc-50/50 border-zinc-200' 
                        : isCurrent
                        ? 'bg-white border-zinc-900 shadow-md ring-1 ring-zinc-950/5'
                        : 'bg-white border-zinc-200/60 opacity-60'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <h3 className={`text-sm font-extrabold ${isCompleted ? 'text-zinc-700 line-through' : 'text-zinc-900'}`}>
                          {milestone.title}
                        </h3>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          isCompleted 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : isCurrent
                            ? 'bg-zinc-900 text-white'
                            : 'bg-zinc-100 text-zinc-400'
                        }`}>
                          Meta: {milestone.requiredProgress}%
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                        {milestone.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-[10px] text-zinc-400 border-t border-zinc-100 pt-2.5 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="font-semibold text-zinc-500">Documentos clave:</span> {milestone.deliverables}
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })}

            </div>
          </div>
        </>
      )}

    </div>
  );
};
export default Roadmap;

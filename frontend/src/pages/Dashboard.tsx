import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { 
  ClipboardList, MessageSquare, Cpu, Users, Plus, FolderOpen, 
  FileText, ArrowRight
} from 'lucide-react';
import { AdvisorDashboard } from './AdvisorDashboard';
import { CoordinatorDashboard } from './CoordinatorDashboard';

export const Dashboard: React.FC = () => {
  const { activeProject, createProject, projects, loadTestProject } = useProjectStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (user?.role === 'Docente' || user?.role === 'Evaluador') {
    return <AdvisorDashboard />;
  }

  if (user?.role === 'Coordinador') {
    return <CoordinatorDashboard />;
  }

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjCompany, setNewProjCompany] = useState('');

  const [proposals, setProposals] = useState<any[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);

  // Local counters for UI display (simulated or fetched)
  const [stats, setStats] = useState({
    meetings: 0,
    requirements: 0,
    adrs: 0,
    tasks: 0
  });

  useEffect(() => {
    if (activeProject) {
      // Fetch stats for active project
      const API_URL = 'http://localhost:5000/api';
      const headers = useAuthStore.getState().getAuthHeaders();
      
      const fetchStats = async () => {
        try {
          const [mRes, rRes, aRes, tRes] = await Promise.all([
            fetch(`${API_URL}/meetings/project/${activeProject._id}`, { headers }),
            fetch(`${API_URL}/requirements/project/${activeProject._id}`, { headers }),
            fetch(`${API_URL}/adrs/project/${activeProject._id}`, { headers }),
            fetch(`${API_URL}/tasks/project/${activeProject._id}`, { headers })
          ]);
          
          const mData = mRes.ok ? await mRes.json() : [];
          const rData = rRes.ok ? await rRes.json() : [];
          const aData = aRes.ok ? await aRes.json() : [];
          const tData = tRes.ok ? await tRes.json() : [];

          setStats({
            meetings: mData.length,
            requirements: rData.length,
            adrs: aData.length,
            tasks: tData.length
          });
        } catch (err) {
          console.error('Error fetching dashboard stats:', err);
        }
      };

      fetchStats();
    }
  }, [activeProject]);

  useEffect(() => {
    if (projects.length === 0 && user) {
      const fetchProposals = async () => {
        setLoadingProposals(true);
        try {
          const headers = useAuthStore.getState().getAuthHeaders();
          const response = await fetch('http://localhost:5000/api/proposals/student', { headers });
          if (response.ok) {
            const data = await response.json();
            setProposals(data);
          }
        } catch (err) {
          console.error('Error fetching student proposals:', err);
        } finally {
          setLoadingProposals(false);
        }
      };
      fetchProposals();
    }
  }, [projects, user]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName) return;
    const project = await createProject({
      name: newProjName,
      description: newProjDesc,
      companyName: newProjCompany
    });
    if (project) {
      setShowCreateModal(false);
      setNewProjName('');
      setNewProjDesc('');
      setNewProjCompany('');
    }
  };

  const handleLoadTestProject = async () => {
    try {
      const proj = await loadTestProject();
      if (proj) {
        alert('¡Proyecto de prueba y simulación de datos cargado con éxito!');
      } else {
        alert('Error al intentar cargar el proyecto de prueba.');
      }
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error inesperado al cargar el proyecto.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return <span className="bg-zinc-100 text-zinc-650 border border-zinc-200 px-2 py-0.5 rounded text-xs font-semibold">Borrador</span>;
      case 'Submitted':
        return <span className="bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded text-xs font-semibold">Enviada</span>;
      case 'InReview':
        return <span className="bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded text-xs font-semibold">En Revisión</span>;
      case 'ChangesRequested':
        return <span className="bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded text-xs font-semibold">Ajustes Requeridos</span>;
      case 'Approved':
        return <span className="bg-emerald-50 text-emerald-600 border border-emerald-250 px-2 py-0.5 rounded text-xs font-semibold">Aprobada</span>;
      case 'Rejected':
        return <span className="bg-red-50 text-red-600 border border-red-250 px-2 py-0.5 rounded text-xs font-semibold">Rechazada</span>;
      default:
        return <span className="bg-zinc-100 text-zinc-650 border border-zinc-200 px-2 py-0.5 rounded text-xs font-semibold">{status}</span>;
    }
  };

  const parseFeedback = (feedbackStr?: string) => {
    if (!feedbackStr) return '';
    try {
      if (feedbackStr.trim().startsWith('{')) {
        const obj = JSON.parse(feedbackStr);
        const parts = [];
        if (obj.general) parts.push(obj.general);
        if (obj.problem) parts.push(`Problema: ${obj.problem}`);
        if (obj.justification) parts.push(`Justificación: ${obj.justification}`);
        if (obj.objectives) parts.push(`Objetivos: ${obj.objectives}`);
        if (obj.risksStack) parts.push(`Riesgos/Stack: ${obj.risksStack}`);
        return parts.length > 0 ? parts.join(' | ') : 'Sin observaciones.';
      }
    } catch (e) {
      console.error('Error parsing feedback JSON in Dashboard:', e);
    }
    return feedbackStr;
  };

  if (projects.length === 0) {
    return (
      <div className="max-w-4xl mx-auto mt-8 space-y-6">
        {/* Welcome Section */}
        <div className="bg-white border border-zinc-200 rounded-xl p-8 shadow-sm animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">PROCESO ACADÉMICO</span>
              <h1 className="text-2xl font-extrabold text-black tracking-tight">Bienvenido a ThesisFlow, {user?.name}</h1>
              <p className="text-sm text-zinc-500 max-w-xl leading-relaxed">
                Aún no tienes un proyecto de tesis activo. Para comenzar el desarrollo de tu memoria de título, debes registrar tu propuesta académica formal para la evaluación y aprobación de tu docente guía.
              </p>
            </div>
            <div className="shrink-0 flex flex-col gap-2">
              <button
                onClick={() => navigate('/propuestas')}
                className="flex items-center justify-center gap-2 bg-black hover:bg-zinc-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors shadow-md"
              >
                <Plus className="w-4 h-4" /> Registrar Propuesta de Tesis
              </button>

              {user?.role === 'Creador' && (
                <button
                  onClick={handleLoadTestProject}
                  className="flex items-center justify-center gap-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors"
                >
                  ✨ Cargar Proyecto Demo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Proposals List Card */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
            <h2 className="text-sm font-bold text-black flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-zinc-500" />
              Tus Propuestas de Tesis
            </h2>
            <span className="text-xs text-zinc-400 font-mono">Total: {proposals.length}</span>
          </div>

          {loadingProposals ? (
            <div className="py-12 text-center text-xs text-zinc-400">Cargando propuestas académicas...</div>
          ) : proposals.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <FolderOpen className="w-10 h-10 text-zinc-300 mx-auto" />
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                No has registrado ninguna propuesta. Presiona el botón de arriba para registrar tu propuesta académica inicial.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-150">
              {proposals.map((prop: any) => (
                <div key={prop._id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-black hover:underline cursor-pointer" onClick={() => navigate('/propuestas')}>
                        {prop.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 mt-1">
                        <span>Docente Guía: <strong className="text-zinc-750 font-semibold">{prop.assignedAdvisorName || 'No asignado'}</strong></span>
                        {prop.contextInstitutional && (
                          <>
                            <span>•</span>
                            <span>Empresa: <strong className="text-zinc-750 font-semibold">{prop.contextInstitutional}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      {getStatusBadge(prop.status)}
                      <button
                        onClick={() => navigate('/propuestas')}
                        className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black transition-colors"
                        title="Ir a gestionar propuesta"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {prop.feedback && (
                    <div className="bg-zinc-50 border border-zinc-150 rounded-lg p-3 text-xs text-zinc-650 mt-1 flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-zinc-800 font-semibold">Observación Docente: </strong>
                        {parseFeedback(prop.feedback)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-200 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight">{activeProject?.name}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Empresa asociada: <span className="font-semibold text-black">{activeProject?.companyName}</span> · Metodología: <span className="font-mono bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded text-xs">{activeProject?.methodology}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user?.role === 'Creador' && (
            <button
              onClick={handleLoadTestProject}
              className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-black text-xs font-bold px-3 py-2 rounded transition-colors"
            >
              ✨ Cargar Proyecto de Prueba
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-2 rounded transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo Proyecto
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-zinc-200 rounded-lg p-5 flex items-center gap-4">
          <div className="p-3 bg-zinc-100 rounded-md text-black">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase block">Reuniones</span>
            <span className="text-2xl font-bold text-black">{stats.meetings}</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-5 flex items-center gap-4">
          <div className="p-3 bg-zinc-100 rounded-md text-black">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase block">Requerimientos</span>
            <span className="text-2xl font-bold text-black">{stats.requirements}</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-5 flex items-center gap-4">
          <div className="p-3 bg-zinc-100 rounded-md text-black">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase block">Decisiones ADR</span>
            <span className="text-2xl font-bold text-black">{stats.adrs}</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-5 flex items-center gap-4">
          <div className="p-3 bg-zinc-100 rounded-md text-black">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase block">Tareas Kanban</span>
            <span className="text-2xl font-bold text-black">{stats.tasks}</span>
          </div>
        </div>
      </div>

      {/* Main Grid content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Summary Context */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
            <h3 className="text-sm font-bold text-black border-b border-zinc-100 pb-2">Descripción General del Problema</h3>
            <p className="text-sm text-zinc-600 leading-relaxed">
              {activeProject?.problem || "No se ha definido un planteamiento del problema para este proyecto. Dirígete a la pestaña 'Proyecto y Empresa' para estructurar el caso de estudio."}
            </p>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
            <h3 className="text-sm font-bold text-black border-b border-zinc-100 pb-2">Objetivos de la Propuesta</h3>
            <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line">
              {activeProject?.objectives || "No se han estructurado objetivos del proyecto aún."}
            </p>
          </div>
        </div>

        {/* Right Side: Core Project Team */}
        <div className="space-y-8">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
            <h3 className="text-sm font-bold text-black border-b border-zinc-100 pb-2">Equipo Académico Designado</h3>
            <div className="space-y-4">
              <div className="border-l-2 border-black pl-3 py-1">
                <span className="text-xs font-semibold text-black block">Sebastian Vasquez</span>
                <span className="text-[10px] text-zinc-500 uppercase font-mono">Líder Técnico & Arquitectura</span>
              </div>
              <div className="border-l-2 border-zinc-400 pl-3 py-1">
                <span className="text-xs font-semibold text-black block">Paolo Grassi</span>
                <span className="text-[10px] text-zinc-500 uppercase font-mono">Líder Funcional & Requerimientos</span>
              </div>
              <div className="border-l-2 border-zinc-300 pl-3 py-1">
                <span className="text-xs font-semibold text-black block">Benjamin Flores</span>
                <span className="text-[10px] text-zinc-500 uppercase font-mono">Líder Documental, QA & UX</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 max-w-md w-full shadow-lg">
            <h3 className="text-base font-bold text-black mb-4">Inicializar un Nuevo Proyecto</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Nombre del Proyecto</label>
                <input
                  type="text"
                  required
                  value={newProjName}
                  onChange={e => setNewProjName(e.target.value)}
                  placeholder="Ej: Sistema Integrado de Finanzas"
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Empresa Real / Cliente</label>
                <input
                  type="text"
                  required
                  value={newProjCompany}
                  onChange={e => setNewProjCompany(e.target.value)}
                  placeholder="Ej: Electrans S.A."
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Descripción Breve</label>
                <textarea
                  value={newProjDesc}
                  onChange={e => setNewProjDesc(e.target.value)}
                  placeholder="Describe qué se busca resolver..."
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300 h-20 resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-black transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-1.5 rounded transition-colors"
                >
                  Crear Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { ClipboardList, MessageSquare, Cpu, Users, Plus, FolderOpen } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { activeProject, createProject, projects, loadTestProject } = useProjectStore();
  const { user } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjCompany, setNewProjCompany] = useState('');

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

  if (projects.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center">
        <FolderOpen className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-black mb-2">Bienvenido a ThesisFlow, {user?.name}</h1>
        <p className="text-sm text-zinc-500 mb-8 max-w-md mx-auto">
          No tienes ningún proyecto activo asignado. Comienza creando un nuevo proyecto de título en colaboración con tu empresa asociada.
        </p>

        {user?.role === 'Creador' && (
          <div className="mb-8 p-6 border border-dashed border-zinc-300 rounded-lg bg-zinc-50 flex items-center justify-between shadow-sm">
            <div className="text-left pr-4">
              <span className="text-sm font-bold text-black block">💡 ¿Quieres probar la plataforma al instante?</span>
              <span className="text-xs text-zinc-500 mt-1 block font-sans">Carga un proyecto de simulación completo con requerimientos, tareas, minutas, ADRs y diagramas.</span>
            </div>
            <button
              onClick={handleLoadTestProject}
              className="flex items-center gap-1.5 bg-black text-white hover:bg-zinc-800 text-xs font-bold px-4 py-2.5 rounded transition-colors whitespace-nowrap shadow-md"
            >
              ✨ Cargar Proyecto de Prueba
            </button>
          </div>
        )}

        <form onSubmit={handleCreateProject} className="bg-white border border-zinc-200 rounded-lg p-6 text-left space-y-4 shadow-sm">
          <h2 className="text-sm font-bold text-black border-b border-zinc-150 pb-2 mb-2">Crear Nuevo Proyecto</h2>
          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Nombre del Proyecto</label>
            <input
              type="text"
              required
              value={newProjName}
              onChange={e => setNewProjName(e.target.value)}
              placeholder="Ej: Automatización de Inventarios Eléctricos"
              className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Empresa Cliente / Real</label>
            <input
              type="text"
              required
              value={newProjCompany}
              onChange={e => setNewProjCompany(e.target.value)}
              placeholder="Ej: Electrans Ltda."
              className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Descripción Breve</label>
            <textarea
              value={newProjDesc}
              onChange={e => setNewProjDesc(e.target.value)}
              placeholder="Resume el propósito del proyecto..."
              className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300 h-20 resize-none"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-black text-white hover:bg-zinc-800 text-sm font-semibold py-2 rounded transition-colors"
          >
            Inicializar Proyecto
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex justify-between items-center border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight">{activeProject?.name}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Empresa asociada: <span className="font-semibold text-black">{activeProject?.companyName}</span> · Metodología: <span className="font-mono bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded text-xs">{activeProject?.methodology}</span>
          </p>
        </div>
        <div className="flex gap-2">
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

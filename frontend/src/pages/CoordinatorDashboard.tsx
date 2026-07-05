import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { useNavigate } from 'react-router-dom';
import { 
  Layers, Search, Plus, Trash2, Settings, ChevronRight
} from 'lucide-react';

interface RubricCriterion {
  name: string;
  description: string;
  weight: number;
  dimension: string;
}

export const CoordinatorDashboard: React.FC = () => {
  const { projects, selectProject, fetchProjects } = useProjectStore();
  const { getAuthHeaders } = useAuthStore();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Stats
  const [projectStats, setProjectStats] = useState<Record<string, any>>({});
  const [rubrics, setRubrics] = useState<any[]>([]);
  const [showRubricModal, setShowRubricModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'rubrics'>('overview');

  // Rubric Form State
  const [rubricName, setRubricName] = useState('');
  const [rubricDesc, setRubricDesc] = useState('');
  const [criteria, setCriteria] = useState<RubricCriterion[]>([
    { name: '', description: '', weight: 1, dimension: 'General' }
  ]);

  useEffect(() => {
    const initDashboard = async () => {
      setLoading(true);
      await fetchProjects();
      await fetchRubrics();
      setLoading(false);
    };
    initDashboard();
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      const fetchAllStats = async () => {
        const statsMap: Record<string, any> = {};
        const API_URL = 'http://localhost:5000/api';
        const headers = getAuthHeaders();

        await Promise.all(
          projects.map(async (p) => {
            try {
              const [mRes, tRes, dRes] = await Promise.all([
                fetch(`${API_URL}/meetings/project/${p._id}`, { headers }),
                fetch(`${API_URL}/tasks/project/${p._id}`, { headers }),
                fetch(`${API_URL}/documents/project/${p._id}`, { headers })
              ]);

              const meetings = mRes.ok ? await mRes.json() : [];
              const tasks = tRes.ok ? await tRes.json() : [];
              const documents = dRes.ok ? await dRes.json() : [];

              // Calculate progress % based on tasks
              const completedTasks = tasks.filter((t: any) => t.status === 'Completed').length;
              const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

              // Calculate risk semaphore
              const risk = calculateProjectRisk(meetings, tasks);

              statsMap[p._id] = {
                meetingsCount: meetings.length,
                tasksCount: tasks.length,
                completedTasks,
                chaptersCount: documents.length,
                progress,
                risk,
                lastMeetingDate: meetings.length > 0 ? new Date(meetings[0].date) : null
              };
            } catch (err) {
              console.error(`Error loading stats for project ${p._id}:`, err);
            }
          })
        );

        setProjectStats(statsMap);
      };

      fetchAllStats();
    }
  }, [projects]);

  const fetchRubrics = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch('http://localhost:5000/api/evaluations/rubrics', { headers });
      if (response.ok) {
        const data = await response.json();
        setRubrics(data);
      }
    } catch (err) {
      console.error('Error fetching rubrics:', err);
    }
  };

  const calculateProjectRisk = (meetings: any[], tasks: any[]): 'Low' | 'Medium' | 'High' => {
    let riskPoints = 0;

    if (meetings.length === 0) {
      riskPoints += 3;
    } else {
      const lastMeetingDate = new Date(meetings[0].date);
      const daysSinceLastMeeting = Math.floor((Date.now() - lastMeetingDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastMeeting > 21) {
        riskPoints += 3;
      } else if (daysSinceLastMeeting > 14) {
        riskPoints += 1.5;
      }
    }

    const stalledTasks = tasks.filter(t => t.status !== 'Completed' && new Date(t.dueDate).getTime() < Date.now()).length;
    if (stalledTasks > 3) {
      riskPoints += 2;
    } else if (stalledTasks > 0) {
      riskPoints += 1;
    }

    if (riskPoints >= 3) return 'High';
    if (riskPoints >= 1.5) return 'Medium';
    return 'Low';
  };

  const handleCreateRubric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rubricName || criteria.some(c => !c.name)) return;

    try {
      const headers = getAuthHeaders();
      const response = await fetch('http://localhost:5000/api/evaluations/rubrics', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rubricName,
          description: rubricDesc,
          criteria
        })
      });

      if (response.ok) {
        await fetchRubrics();
        setShowRubricModal(false);
        setRubricName('');
        setRubricDesc('');
        setCriteria([{ name: '', description: '', weight: 1, dimension: 'General' }]);
      } else {
        const data = await response.json();
        alert(data.message || 'Error al crear la rúbrica');
      }
    } catch (err) {
      console.error('Error creating rubric:', err);
    }
  };

  const handleAddCriterion = () => {
    setCriteria([...criteria, { name: '', description: '', weight: 1, dimension: 'General' }]);
  };

  const handleRemoveCriterion = (index: number) => {
    if (criteria.length > 1) {
      setCriteria(criteria.filter((_, i) => i !== index));
    }
  };

  const handleCriterionChange = (index: number, field: keyof RubricCriterion, value: any) => {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    setCriteria(updated);
  };

  const handleSelectProject = async (projectId: string) => {
    await selectProject(projectId);
    navigate('/');
  };

  // Filtered projects
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.companyName && p.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Semaphore distribution count
  const distribution = { Low: 0, Medium: 0, High: 0 };
  Object.values(projectStats).forEach((stat: any) => {
    if (stat.risk === 'High') distribution.High++;
    else if (stat.risk === 'Medium') distribution.Medium++;
    else distribution.Low++;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-800 p-8 rounded-2xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="space-y-2 z-10">
          <span className="text-[10px] font-mono tracking-widest uppercase bg-white/10 px-2.5 py-1 rounded-full text-zinc-300">
            Panel de Gestión Académica · Carrera
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Coordinación de Carrera</h1>
          <p className="text-zinc-400 text-sm max-w-lg">
            Monitoreo global de tesis de título, gestión de plantillas de rúbricas institucionales y supervisión de riesgos del departamento.
          </p>
        </div>
        <div className="flex gap-4 z-10 font-mono text-center">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/5">
            <span className="text-[9px] text-zinc-400 uppercase block">Total Proyectos</span>
            <span className="text-xl font-bold">{projects.length}</span>
          </div>
          <div className="bg-red-500/20 backdrop-blur-md px-4 py-2.5 rounded-xl border border-red-500/25">
            <span className="text-[9px] text-red-300 uppercase block">Riesgo Alto</span>
            <span className="text-xl font-bold text-red-400">{distribution.High}</span>
          </div>
          <div className="bg-amber-500/20 backdrop-blur-md px-4 py-2.5 rounded-xl border border-amber-500/25">
            <span className="text-[9px] text-amber-300 uppercase block">Riesgo Medio</span>
            <span className="text-xl font-bold text-amber-400">{distribution.Medium}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'overview' 
              ? 'border-black text-black' 
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Layers className="w-4 h-4" /> Portafolio de Proyectos ({filteredProjects.length})
        </button>
        <button
          onClick={() => setActiveTab('rubrics')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'rubrics' 
              ? 'border-black text-black' 
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Settings className="w-4 h-4" /> Rúbricas de Evaluación ({rubrics.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="flex gap-4 items-center bg-white border border-zinc-200 p-4 rounded-xl shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar tesis por título, tema o empresa asociada..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 focus:bg-white focus:border-black rounded-lg pl-10 pr-4 py-2 text-sm text-black focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Table list */}
          {filteredProjects.length === 0 ? (
            <div className="text-center py-16 bg-white border border-zinc-200 rounded-xl">
              <Search className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-black mb-1">Sin resultados</h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                No encontramos proyectos que coincidan con la palabra buscada.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-mono text-zinc-400 uppercase">
                      <th className="px-6 py-3">Nombre del Proyecto / Tesis</th>
                      <th className="px-6 py-3">Empresa</th>
                      <th className="px-6 py-3">Semáforo de Riesgo</th>
                      <th className="px-6 py-3">Avance</th>
                      <th className="px-6 py-3 font-mono text-center">Reuniones</th>
                      <th className="px-6 py-3 font-mono text-center">Capítulos</th>
                      <th className="px-6 py-3 text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {filteredProjects.map((p) => {
                      const stat = projectStats[p._id] || {
                        progress: 0,
                        risk: 'Low',
                        meetingsCount: 0,
                        chaptersCount: 0
                      };

                      return (
                        <tr key={p._id} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="max-w-md">
                              <span className="font-bold text-zinc-900 block truncate hover:text-black cursor-pointer" onClick={() => handleSelectProject(p._id)}>
                                {p.name}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono">Metodología: {p.methodology}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-zinc-500 font-medium">
                            {p.companyName || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              stat.risk === 'High' 
                                ? 'bg-red-50 text-red-700 border border-red-200' 
                                : stat.risk === 'Medium'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                stat.risk === 'High' ? 'bg-red-500 animate-pulse' : stat.risk === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}></span>
                              Riesgo {stat.risk === 'High' ? 'Alto' : stat.risk === 'Medium' ? 'Medio' : 'Bajo'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-black h-full" 
                                  style={{ width: `${stat.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-mono font-bold">{stat.progress}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-mono font-bold text-zinc-700">
                            {stat.meetingsCount}
                          </td>
                          <td className="px-6 py-4 text-center font-mono font-bold text-zinc-700">
                            {stat.chaptersCount}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleSelectProject(p._id)}
                              className="text-zinc-500 hover:text-black hover:underline inline-flex items-center gap-1 font-bold text-xs"
                            >
                              Ver <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Rubrics management tab */
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white border border-zinc-200 p-4 rounded-xl shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-black">Plantillas de Rúbrica Institucionales</h3>
              <p className="text-xs text-zinc-500">
                Define y publica criterios de evaluación uniformes para evaluar hitos y capítulos del proyecto de tesis.
              </p>
            </div>
            <button
              onClick={() => setShowRubricModal(true)}
              className="bg-black hover:bg-zinc-800 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Crear Rúbrica
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rubrics.map((rub) => (
              <div key={rub._id} className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-black text-base">{rub.name}</h4>
                    <p className="text-zinc-500 text-xs mt-1">{rub.description || 'Sin descripción'}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                    Activa
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase block">Criterios de Evaluación</span>
                  <div className="divide-y divide-zinc-150 border border-zinc-200 rounded-lg overflow-hidden bg-zinc-50">
                    {rub.criteria.map((c: any, idx: number) => (
                      <div key={idx} className="p-3 text-xs flex justify-between items-center">
                        <div>
                          <span className="font-bold text-zinc-900 block">{c.name}</span>
                          <span className="text-[10px] text-zinc-400 block font-mono capitalize">Dimensión: {c.dimension}</span>
                        </div>
                        <span className="font-mono text-zinc-500 bg-white border border-zinc-200 px-1.5 py-0.5 rounded text-[10px]">
                          Peso: {c.weight}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rubric Creation Modal */}
      {showRubricModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-xl p-6 max-w-2xl w-full shadow-lg max-h-[85vh] overflow-y-auto">
            <h3 className="text-base font-extrabold text-black mb-4 border-b border-zinc-100 pb-2">Crear Plantilla de Rúbrica Institucional</h3>
            
            <form onSubmit={handleCreateRubric} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Nombre de la Rúbrica</label>
                  <input
                    type="text"
                    required
                    value={rubricName}
                    onChange={e => setRubricName(e.target.value)}
                    placeholder="Ej: Evaluación Primer Hito Avance"
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Descripción Corta</label>
                  <input
                    type="text"
                    value={rubricDesc}
                    onChange={e => setRubricDesc(e.target.value)}
                    placeholder="Ej: Evalúa justificación, consistencia..."
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
                  />
                </div>
              </div>

              {/* Criteria Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                  <span className="text-xs font-bold text-black">Criterios de Calificación (Escala 1 a 5)</span>
                  <button
                    type="button"
                    onClick={handleAddCriterion}
                    className="text-zinc-500 hover:text-black text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Criterio
                  </button>
                </div>

                <div className="space-y-4">
                  {criteria.map((c, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-zinc-50 border border-zinc-250 rounded-lg relative">
                      <div className="md:col-span-4">
                        <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Nombre Criterio</label>
                        <input
                          type="text"
                          required
                          value={c.name}
                          onChange={e => handleCriterionChange(index, 'name', e.target.value)}
                          placeholder="Ej: Claridad del problema"
                          className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs text-black focus:outline-none focus:border-black"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Descripción</label>
                        <input
                          type="text"
                          value={c.description}
                          onChange={e => handleCriterionChange(index, 'description', e.target.value)}
                          placeholder="Ej: Mide la formulación y contexto..."
                          className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs text-black focus:outline-none focus:border-black"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Dimensión</label>
                        <input
                          type="text"
                          value={c.dimension}
                          onChange={e => handleCriterionChange(index, 'dimension', e.target.value)}
                          placeholder="Ej: Negocio"
                          className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs text-black focus:outline-none focus:border-black"
                        />
                      </div>
                      <div className="md:col-span-1.5 flex gap-2 items-end">
                        <div>
                          <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Peso</label>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            required
                            value={c.weight}
                            onChange={e => handleCriterionChange(index, 'weight', parseFloat(e.target.value) || 1)}
                            className="w-16 bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs text-black font-mono focus:outline-none focus:border-black"
                          />
                        </div>
                        {criteria.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCriterion(index)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors mb-0.5"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowRubricModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-black transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-black hover:bg-zinc-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Crear e Instalar Rúbrica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

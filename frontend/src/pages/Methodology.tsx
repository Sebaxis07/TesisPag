import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { Settings, Plus, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'Todo' | 'In-Progress' | 'Review' | 'Done';
  assignedTo: { _id: string, name: string } | null;
  sprint: string;
}

export const Methodology: React.FC = () => {
  const { activeProject, updateProject, members } = useProjectStore();
  const { user: currentUser } = useAuthStore();
  
  const [methodology, setMethodology] = useState<'Scrum' | 'Kanban' | 'Waterfall' | 'Hibrida' | 'Personalizada'>('Scrum');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // New task form fields
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskSprint, setTaskSprint] = useState('Sprint 1');

  const API_URL = 'http://localhost:5000/api';
  const headers = useAuthStore.getState().getAuthHeaders();

  const fetchTasks = async () => {
    if (!activeProject) return;
    try {
      const response = await fetch(`${API_URL}/tasks/project/${activeProject._id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeProject) {
      setMethodology(activeProject.methodology);
      fetchTasks();
    }
  }, [activeProject]);

  const handleUpdateMethodology = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!activeProject) return;
    const value = e.target.value as any;
    setMethodology(value);
    await updateProject(activeProject._id, { methodology: value });
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !taskTitle) return;

    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: activeProject._id,
          title: taskTitle,
          description: taskDesc,
          assignedTo: taskAssignedTo || null,
          sprint: taskSprint,
          status: 'Todo'
        })
      });

      if (response.ok) {
        setShowTaskModal(false);
        setTaskTitle('');
        setTaskDesc('');
        setTaskAssignedTo('');
        setTaskSprint('Sprint 1');
        await fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveTask = async (taskId: string, nextStatus: 'Todo' | 'In-Progress' | 'Review' | 'Done') => {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (response.ok) {
        await fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('¿Eliminar esta tarea definitivamente?')) {
      try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
          method: 'DELETE',
          headers
        });
        if (response.ok) {
          await fetchTasks();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-zinc-200 rounded-lg bg-white p-8">
        <Settings className="w-8 h-8 text-zinc-400 mb-2" />
        <span className="text-sm text-zinc-500">Selecciona un proyecto para configurar su metodología y flujo de trabajo.</span>
      </div>
    );
  }

  const columns: { name: string, status: 'Todo' | 'In-Progress' | 'Review' | 'Done' }[] = [
    { name: 'Por Hacer', status: 'Todo' },
    { name: 'En Desarrollo', status: 'In-Progress' },
    { name: 'En Revisión / QA', status: 'Review' },
    { name: 'Finalizado', status: 'Done' }
  ];

  return (
    <div className="space-y-8">
      {/* Configuration Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-zinc-200 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight font-sans">Metodología de Trabajo y Tareas</h1>
          <p className="text-sm text-zinc-500 mt-1">Elige el marco metodológico y gestiona el tablero Kanban de entregas.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400 uppercase">Marco Activo:</span>
            <select
              value={methodology}
              onChange={handleUpdateMethodology}
              disabled={currentUser?.role === 'Viewer'}
              className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-black font-semibold focus:outline-none focus:border-black"
            >
              <option value="Scrum">Scrum (Sprints ágiles)</option>
              <option value="Kanban">Kanban (Flujo continuo)</option>
              <option value="Waterfall">Waterfall (Cascada secuencial)</option>
              <option value="Hibrida">Híbrida Agile-Waterfall</option>
              <option value="Personalizada">Personalizada Asignatura</option>
            </select>
          </div>

          {currentUser?.role !== 'Viewer' && (
            <button
              onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-2 rounded transition-colors"
            >
              <Plus className="w-4 h-4" /> Crear Tarea
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.status);
          return (
            <div key={col.status} className="bg-zinc-100 rounded-lg p-4 border border-zinc-200 min-h-[500px] flex flex-col">
              {/* Column Header */}
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-200">
                <span className="text-xs font-extrabold text-black uppercase font-mono">{col.name}</span>
                <span className="text-[10px] bg-white border border-zinc-250 font-bold px-2 py-0.5 rounded-full text-zinc-700">
                  {colTasks.length}
                </span>
              </div>

              {/* Column tasks list */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colTasks.map(task => (
                  <div key={task._id} className="bg-white border border-zinc-200 rounded-md p-4 shadow-sm space-y-3 hover:border-zinc-400 transition-colors">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-bold text-black font-sans leading-tight block">{task.title}</span>
                        {currentUser?.role !== 'Viewer' && (
                          <button
                            onClick={() => handleDeleteTask(task._id)}
                            className="text-zinc-300 hover:text-red-600 transition-colors shrink-0"
                            title="Borrar Tarea"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">{task.description}</p>
                    </div>

                    <div className="flex justify-between items-center border-t border-zinc-100 pt-3">
                      <span className="text-[9px] font-mono bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">
                        {task.sprint}
                      </span>
                      <span className="text-[10px] font-semibold text-zinc-950 truncate max-w-[80px]">
                        {task.assignedTo?.name ? task.assignedTo.name.split(' ')[0] : 'Sin asignar'}
                      </span>
                    </div>

                    {/* Column Movement controls */}
                    {currentUser?.role !== 'Viewer' && (
                      <div className="flex gap-2 justify-end border-t border-zinc-50 pt-2 shrink-0">
                        {col.status !== 'Todo' && (
                          <button
                            onClick={() => {
                              const steps: ('Todo' | 'In-Progress' | 'Review' | 'Done')[] = ['Todo', 'In-Progress', 'Review', 'Done'];
                              const prevIdx = steps.indexOf(col.status) - 1;
                              handleMoveTask(task._id, steps[prevIdx]);
                            }}
                            className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black transition-colors"
                            title="Mover atrás"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                        )}
                        {col.status !== 'Done' && (
                          <button
                            onClick={() => {
                              const steps: ('Todo' | 'In-Progress' | 'Review' | 'Done')[] = ['Todo', 'In-Progress', 'Review', 'Done'];
                              const nextIdx = steps.indexOf(col.status) + 1;
                              handleMoveTask(task._id, steps[nextIdx]);
                            }}
                            className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black transition-colors"
                            title="Mover adelante"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <span className="text-[10px] text-zinc-400 block text-center py-8 italic">Sin tareas</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 max-w-md w-full shadow-lg">
            <h3 className="text-base font-bold text-black mb-4">Crear Nueva Tarea</h3>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Título de la Tarea</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="Ej: Levantar arquitectura base"
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Descripción de la Tarea</label>
                <textarea
                  value={taskDesc}
                  onChange={e => setTaskDesc(e.target.value)}
                  placeholder="Especifica el alcance y los entregables..."
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300 h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Asignada A</label>
                  <select
                    value={taskAssignedTo}
                    onChange={e => setTaskAssignedTo(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none focus:border-black"
                  >
                    <option value="">Seleccionar...</option>
                    {members.map(m => (
                      <option key={m.user?._id} value={m.user?._id}>
                        {m.user?.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Sprint o Hito</label>
                  <input
                    type="text"
                    required
                    value={taskSprint}
                    onChange={e => setTaskSprint(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-black transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-1.5 rounded transition-colors"
                >
                  Crear Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

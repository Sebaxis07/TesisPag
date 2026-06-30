import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { MessageSquare, Plus, BrainCircuit, Calendar, Trash2 } from 'lucide-react';

interface Meeting {
  _id: string;
  title: string;
  date: string;
  transcription: string;
  summary: string;
  agreements: string[];
  tasks: string[];
  risks: string[];
}

export const Meetings: React.FC = () => {
  const { activeProject } = useProjectStore();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTranscription, setMeetingTranscription] = useState('');

  const [aiRunning, setAiRunning] = useState(false);

  const API_URL = 'http://localhost:5000/api';
  const headers = useAuthStore.getState().getAuthHeaders();

  const fetchMeetings = async () => {
    if (!activeProject) return;
    try {
      const response = await fetch(`${API_URL}/meetings/project/${activeProject._id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setMeetings(data);
        if (data.length > 0) {
          // Keep selection or default to first
          setSelectedMeeting(prev => {
            const match = data.find((m: Meeting) => m._id === prev?._id);
            return match || data[0];
          });
        } else {
          setSelectedMeeting(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeProject) {
      fetchMeetings();
    }
  }, [activeProject]);

  const handleAddMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !meetingTitle) return;

    try {
      const response = await fetch(`${API_URL}/meetings`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: activeProject._id,
          title: meetingTitle,
          date: meetingDate || new Date(),
          transcription: meetingTranscription
        })
      });

      if (response.ok) {
        setShowAddModal(false);
        setMeetingTitle('');
        setMeetingDate('');
        setMeetingTranscription('');
        await fetchMeetings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMeeting = async (meetingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Eliminar esta reunión definitivamente?')) {
      try {
        const response = await fetch(`${API_URL}/meetings/${meetingId}`, {
          method: 'DELETE',
          headers
        });
        if (response.ok) {
          if (selectedMeeting?._id === meetingId) setSelectedMeeting(null);
          await fetchMeetings();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleRunAISummary = async () => {
    if (!selectedMeeting) return;
    setAiRunning(true);
    try {
      const response = await fetch(`${API_URL}/meetings/${selectedMeeting._id}/summarize`, {
        method: 'POST',
        headers
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedMeeting(updated);
        // Refresh items in sidebar list
        setMeetings(prev => prev.map(m => m._id === updated._id ? updated : m));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiRunning(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-zinc-200 rounded-lg bg-white p-8">
        <MessageSquare className="w-8 h-8 text-zinc-400 mb-2" />
        <span className="text-sm text-zinc-500">Selecciona un proyecto para registrar reuniones del equipo.</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight">Reuniones Inteligentes</h1>
          <p className="text-sm text-zinc-500 mt-1">Registra minutas y usa el análisis IA para extraer tareas, acuerdos y requerimientos.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-2 rounded transition-colors"
        >
          <Plus className="w-4 h-4" /> Agregar Minuta
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Sidebar of meetings */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold text-black uppercase font-mono tracking-wider">Historial de Reuniones</h3>
          <div className="bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-200 overflow-hidden shadow-sm">
            {meetings.map(m => (
              <div
                key={m._id}
                onClick={() => setSelectedMeeting(m)}
                className={`p-4 cursor-pointer transition-colors flex justify-between items-center ${
                  selectedMeeting?._id === m._id ? 'bg-zinc-50 font-semibold' : 'hover:bg-zinc-50'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <span className="text-xs font-bold text-black block truncate">{m.title}</span>
                  <span className="text-[10px] text-zinc-400 font-mono mt-0.5 block">
                    {new Date(m.date).toLocaleDateString('es-ES')}
                  </span>
                </div>
                <button
                  onClick={(e) => handleDeleteMeeting(m._id, e)}
                  className="text-zinc-300 hover:text-red-600 transition-colors p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {meetings.length === 0 && (
              <div className="p-8 text-center text-xs text-zinc-400 italic">Sin reuniones registradas.</div>
            )}
          </div>
        </div>

        {/* Right Side: Active Meeting content & AI summary runner */}
        <div className="lg:col-span-2">
          {selectedMeeting ? (
            <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-6 shadow-sm">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-black">{selectedMeeting.title}</h2>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono mt-1">
                    <Calendar className="w-3.5 h-3.5" /> {new Date(selectedMeeting.date).toLocaleDateString('es-ES')}
                  </div>
                </div>

                <button
                  onClick={handleRunAISummary}
                  disabled={aiRunning}
                  className="flex items-center gap-2 bg-black text-white hover:bg-zinc-800 disabled:opacity-50 text-[11px] font-bold px-3 py-1.5 rounded transition-colors"
                >
                  <BrainCircuit className="w-4 h-4" /> {aiRunning ? 'Analizando...' : 'Generar Minuta con IA'}
                </button>
              </div>

              {/* Transcription Box */}
              <div>
                <h4 className="text-xs font-mono text-zinc-400 uppercase mb-2">Notas / Transcripción</h4>
                <div className="bg-zinc-50 border border-zinc-200 rounded-md p-4 max-h-48 overflow-y-auto text-xs text-zinc-700 leading-relaxed font-sans whitespace-pre-wrap">
                  {selectedMeeting.transcription || "Sin transcripción adjunta."}
                </div>
              </div>

              {/* AI outputs */}
              <div className="border-t border-zinc-100 pt-6 space-y-6">
                <div>
                  <h4 className="text-xs font-mono text-zinc-400 uppercase mb-2">Resumen AI</h4>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {selectedMeeting.summary || "No se ha generado el resumen de la minuta todavía. Haz clic en 'Generar Minuta con IA'."}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-50">
                  <div>
                    <h4 className="text-xs font-mono text-zinc-400 uppercase mb-2">Acuerdos Clave</h4>
                    {selectedMeeting.agreements.length > 0 ? (
                      <ul className="list-disc pl-4 text-xs text-zinc-600 space-y-1">
                        {selectedMeeting.agreements.map((a, idx) => (
                          <li key={idx}>{a}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-zinc-400 italic">Sin acuerdos registrados.</span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-mono text-zinc-400 uppercase mb-2">Tareas Identificadas</h4>
                    {selectedMeeting.tasks.length > 0 ? (
                      <ul className="list-decimal pl-4 text-xs text-zinc-600 space-y-1">
                        {selectedMeeting.tasks.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-zinc-400 italic">Sin tareas identificadas.</span>
                    )}
                  </div>
                </div>

                <div className="border-t border-zinc-50 pt-6">
                  <h4 className="text-xs font-mono text-zinc-400 uppercase mb-2">Riesgos Técnicos / Desafíos</h4>
                  {selectedMeeting.risks.length > 0 ? (
                    <ul className="list-disc pl-4 text-xs text-red-700 space-y-1">
                      {selectedMeeting.risks.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-zinc-400 italic">No se han detectado riesgos.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-lg p-16 text-center text-zinc-500 shadow-sm">
              <MessageSquare className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <span>Selecciona una reunión del listado lateral para ver su análisis o crear uno nuevo.</span>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 max-w-lg w-full shadow-lg">
            <h3 className="text-base font-bold text-black mb-4">Registrar Minuta de Reunión</h3>
            <form onSubmit={handleAddMeeting} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Título de la Sesión</label>
                <input
                  type="text"
                  required
                  value={meetingTitle}
                  onChange={e => setMeetingTitle(e.target.value)}
                  placeholder="Ej: Reunión Inicial con Gerente de Operaciones"
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Fecha</label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={e => setMeetingDate(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Transcripción de Audio o Apuntes de Reunión</label>
                <textarea
                  value={meetingTranscription}
                  onChange={e => setMeetingTranscription(e.target.value)}
                  placeholder="Pega la transcripción del audio de Teams/Zoom o las notas manuscritas tomadas durante la sesión..."
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300 h-40 resize-none font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-black transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-1.5 rounded transition-colors"
                >
                  Guardar Reunión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

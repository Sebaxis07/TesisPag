import React, { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { Share2, Plus, BrainCircuit, Trash2, Code } from 'lucide-react';
import mermaid from 'mermaid';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  flowchart: { useMaxWidth: true, htmlLabels: true }
});

interface Diagram {
  _id: string;
  title: string;
  description: string;
  mermaidCode: string;
  type: string;
}

// Subcomponent to safely compile and render Mermaid code
const MermaidPreview: React.FC<{ code: string }> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    setError(null);

    const renderId = 'mermaid-' + Math.floor(Math.random() * 1000000);

    const drawDiagram = async () => {
      try {
        const { svg } = await mermaid.render(renderId, code);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          // Apply some css adjustments to force responsiveness
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.setAttribute('width', '100%');
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = 'auto';
          }
        }
      } catch (err: any) {
        console.warn('Mermaid compile warning:', err);
        setError('Sintaxis inválida en el código del diagrama. Revisa la definición.');
        
        // Reset mermaid internal state to prevent lockups on next renders
        const badElement = document.getElementById(renderId);
        if (badElement) badElement.remove();
      }
    };

    drawDiagram();
  }, [code]);

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 min-h-[400px] flex items-center justify-center overflow-x-auto shadow-inner">
      {error ? (
        <div className="text-center p-6 space-y-2">
          <span className="text-xs text-red-500 font-mono font-medium block">{error}</span>
          <span className="text-[10px] text-zinc-400 block font-mono">Ej: graph TD\n  A --&gt; B</span>
        </div>
      ) : (
        <div ref={containerRef} className="w-full flex justify-center text-center" />
      )}
    </div>
  );
};

export const Diagrams: React.FC = () => {
  const { activeProject } = useProjectStore();
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [selectedDiagram, setSelectedDiagram] = useState<Diagram | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  
  // Forms fields
  const [diagTitle, setDiagTitle] = useState('');
  const [diagDesc, setDiagDesc] = useState('');
  const [diagType, setDiagType] = useState('Flowchart');
  const [diagCode, setDiagCode] = useState('graph TD\n  Inicio --> Proceso\n  Proceso --> Fin');

  // AI prompt
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiType, setAiType] = useState('Flowchart');
  const [aiRunning, setAiRunning] = useState(false);

  // Edit live code field
  const [liveCode, setLiveCode] = useState('');

  // Context lists
  const [meetings, setMeetings] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);

  const API_URL = 'http://localhost:5000/api';
  const headers = useAuthStore.getState().getAuthHeaders();

  const fetchDiagrams = async () => {
    if (!activeProject) return;
    try {
      const response = await fetch(`${API_URL}/diagrams/project/${activeProject._id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setDiagrams(data);
        if (data.length > 0) {
          setSelectedDiagram(prev => {
            const match = data.find((d: Diagram) => d._id === prev?._id);
            return match || data[0];
          });
        } else {
          setSelectedDiagram(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMeetings = async () => {
    if (!activeProject) return;
    try {
      const response = await fetch(`${API_URL}/meetings/project/${activeProject._id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setMeetings(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRequirements = async () => {
    if (!activeProject) return;
    try {
      const response = await fetch(`${API_URL}/requirements/project/${activeProject._id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setRequirements(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeProject) {
      fetchDiagrams();
      fetchMeetings();
      fetchRequirements();
    }
  }, [activeProject]);

  useEffect(() => {
    if (selectedDiagram) {
      setLiveCode(selectedDiagram.mermaidCode);
    } else {
      setLiveCode('');
    }
  }, [selectedDiagram]);

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !diagTitle || !diagCode) return;

    try {
      const response = await fetch(`${API_URL}/diagrams`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: activeProject._id,
          title: diagTitle,
          description: diagDesc,
          mermaidCode: diagCode,
          type: diagType
        })
      });

      if (response.ok) {
        setShowAddModal(false);
        setDiagTitle('');
        setDiagDesc('');
        setDiagCode('graph TD\n  Inicio --> Fin');
        await fetchDiagrams();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !aiPrompt) return;
    setAiRunning(true);

    try {
      const response = await fetch(`${API_URL}/diagrams/generate`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject._id,
          prompt: aiPrompt,
          type: aiType
        })
      });

      if (response.ok) {
        setShowAiModal(false);
        setAiPrompt('');
        await fetchDiagrams();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiRunning(false);
    }
  };

  const handleUpdateCode = async () => {
    if (!selectedDiagram) return;
    try {
      const response = await fetch(`${API_URL}/diagrams/${selectedDiagram._id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mermaidCode: liveCode })
      });
      if (response.ok) {
        const updated = await response.json();
        setDiagrams(prev => prev.map(d => d._id === updated._id ? updated : d));
        setSelectedDiagram(updated);
        alert('Código del diagrama actualizado con éxito');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDiagram = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Eliminar este diagrama?')) {
      try {
        const response = await fetch(`${API_URL}/diagrams/${id}`, {
          method: 'DELETE',
          headers
        });
        if (response.ok) {
          if (selectedDiagram?._id === id) setSelectedDiagram(null);
          await fetchDiagrams();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-zinc-200 rounded-lg bg-white p-8">
        <Share2 className="w-8 h-8 text-zinc-400 mb-2" />
        <span className="text-sm text-zinc-500">Selecciona un proyecto para ver los diagramas y modelos del sistema.</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-zinc-200 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight font-sans">Modelador Visual</h1>
          <p className="text-sm text-zinc-500 mt-1">Genera diagramas de secuencia, casos de uso, flujos y arquitectura usando sintaxis Mermaid.js.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-2 border border-zinc-250 hover:bg-zinc-50 text-xs font-bold px-3 py-2 rounded text-zinc-950 transition-colors"
          >
            <BrainCircuit className="w-4 h-4" /> Generar con IA
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-2 rounded transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo Diagrama
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left list */}
        <div className="space-y-4 lg:col-span-1">
          <h3 className="text-xs font-extrabold text-black uppercase font-mono tracking-wider">Diagramas Disponibles</h3>
          <div className="bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-200 overflow-hidden shadow-sm">
            {diagrams.map(d => (
              <div
                key={d._id}
                onClick={() => setSelectedDiagram(d)}
                className={`p-4 cursor-pointer transition-colors flex justify-between items-center ${
                  selectedDiagram?._id === d._id ? 'bg-zinc-50 font-semibold' : 'hover:bg-zinc-50'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <span className="text-xs font-bold text-black block truncate">{d.title}</span>
                  <span className="text-[10px] text-zinc-400 font-mono mt-0.5 block">
                    {d.type}
                  </span>
                </div>
                <button
                  onClick={(e) => handleDeleteDiagram(d._id, e)}
                  className="text-zinc-300 hover:text-red-600 transition-colors p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {diagrams.length === 0 && (
              <div className="p-8 text-center text-xs text-zinc-400 italic">No hay diagramas creados.</div>
            )}
          </div>
        </div>

        {/* Live Editor + Render Canvas */}
        <div className="lg:col-span-3 space-y-6">
          {selectedDiagram ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Text Area Editor */}
              <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4 shadow-sm xl:col-span-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="border-b border-zinc-150 pb-2">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Editor Código</span>
                    <h3 className="text-xs font-bold text-black">{selectedDiagram.title}</h3>
                  </div>
                  <textarea
                    value={liveCode}
                    onChange={e => setLiveCode(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded p-3 text-xs font-mono text-zinc-800 h-80 focus:outline-none focus:border-zinc-400"
                    placeholder="graph TD..."
                  />
                </div>
                <button
                  onClick={handleUpdateCode}
                  className="w-full flex items-center justify-center gap-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold py-2 rounded transition-colors"
                >
                  <Code className="w-4 h-4" /> Guardar Cambios
                </button>
              </div>

              {/* Previewer */}
              <div className="xl:col-span-2 space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-mono text-zinc-400 uppercase">Vista Previa Renderizada</span>
                </div>
                {liveCode && <MermaidPreview code={liveCode} />}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-lg p-16 text-center text-zinc-500 shadow-sm">
              <Share2 className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <span>Selecciona un diagrama del listado o genéralo a partir de texto usando Inteligencia Artificial.</span>
            </div>
          )}
        </div>
      </div>

      {/* Manual Creation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 max-w-lg w-full shadow-lg">
            <h3 className="text-base font-bold text-black mb-4 font-sans">Crear Diagrama Manual</h3>
            <form onSubmit={handleCreateManual} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={diagTitle}
                  onChange={e => setDiagTitle(e.target.value)}
                  placeholder="Ej: Secuencia de Autenticación"
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Tipo de Diagrama</label>
                  <select
                    value={diagType}
                    onChange={e => setDiagType(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none focus:border-black"
                  >
                    <option value="Flowchart">Flujograma (Flowchart)</option>
                    <option value="Sequence">Secuencia (Sequence)</option>
                    <option value="Architecture">Arquitectura (Architecture)</option>
                    <option value="Use Case">Casos de Uso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Descripción Breve</label>
                  <input
                    type="text"
                    value={diagDesc}
                    onChange={e => setDiagDesc(e.target.value)}
                    placeholder="Opcional..."
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-xs text-black focus:outline-none focus:border-black placeholder-zinc-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Código Mermaid inicial</label>
                <textarea
                  required
                  value={diagCode}
                  onChange={e => setDiagCode(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded p-3 text-xs font-mono text-zinc-800 h-40 focus:outline-none focus:border-black"
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
                  Crear Diagrama
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 max-w-lg w-full shadow-lg">
            <h3 className="text-base font-bold text-black mb-4 font-sans">Generar Diagrama con IA</h3>
            <form onSubmit={handleGenerateAI} className="space-y-4">
              {(requirements.length > 0 || meetings.length > 0) && (
                <div className="grid grid-cols-2 gap-4">
                  {requirements.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Cargar desde Requerimiento</label>
                      <select
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          if (selectedId) {
                            const found = requirements.find(r => r._id === selectedId);
                            if (found) {
                              setAiPrompt(`Diseña un diagrama para el requerimiento [${found.code}] ${found.title}:\n\n${found.description}`);
                              if (found.type === 'Non-Functional') {
                                setAiType('Architecture');
                              } else {
                                setAiType('Flowchart');
                              }
                            }
                          }
                        }}
                        className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-black focus:outline-none focus:border-black"
                      >
                        <option value="">-- Requerimiento --</option>
                        {requirements.map(r => (
                          <option key={r._id} value={r._id}>[{r.code}] {r.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {meetings.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Cargar desde Reunión</label>
                      <select
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          if (selectedId) {
                            const found = meetings.find(m => m._id === selectedId);
                            if (found) {
                              setAiPrompt(`Diseña un diagrama de procesos basado en la siguiente minuta de reunión:\n\nTítulo: ${found.title}\nResumen: ${found.summary}\nAcuerdos:\n${found.agreements?.map((a: string) => `- ${a}`).join('\n')}`);
                              setAiType('Flowchart');
                            }
                          }
                        }}
                        className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-black focus:outline-none focus:border-black"
                      >
                        <option value="">-- Reunión --</option>
                        {meetings.map(m => (
                          <option key={m._id} value={m._id}>{new Date(m.date).toLocaleDateString()} - {m.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Instrucciones / Descripción del Flujo</label>
                <textarea
                  required
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="Describe qué quieres modelar. Ej: Un diagrama de secuencia de login donde el usuario ingresa email y clave, el cliente valida en el servidor Node que a su vez consulta la base de datos MongoDB y devuelve un token JWT..."
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300 h-28 resize-none text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Tipo de Diagrama Esperado</label>
                <select
                  value={aiType}
                  onChange={e => setAiType(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none focus:border-black"
                >
                  <option value="Flowchart">Flujograma de Procesos</option>
                  <option value="Sequence">Diagrama de Secuencia</option>
                  <option value="Architecture">Diagrama de Componentes / Arquitectura</option>
                  <option value="Use Case">Diagrama de Casos de Uso</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  disabled={aiRunning}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-black transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={aiRunning}
                  className="flex items-center gap-2 bg-black text-white hover:bg-zinc-800 disabled:opacity-50 text-xs font-bold px-3 py-1.5 rounded transition-colors"
                >
                  <BrainCircuit className="w-4 h-4" /> {aiRunning ? 'Generando Modelo...' : 'Generar Mermaid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

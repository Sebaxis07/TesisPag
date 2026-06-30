import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { FileText, Plus, BrainCircuit, Trash2, Save } from 'lucide-react';

interface DocumentSection {
  _id: string;
  title: string;
  sectionType: string;
  content: string;
  status: 'Draft' | 'Reviewed' | 'Final';
}

export const Reports: React.FC = () => {
  const { activeProject } = useProjectStore();
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<DocumentSection | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [secTitle, setSecTitle] = useState('');
  const [secType, setSecType] = useState('Introduction');

  // AI Generation params
  const [templateType, setTemplateType] = useState('Introducción del Proyecto');
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiRunning, setAiRunning] = useState(false);

  // Live markdown text
  const [liveContent, setLiveContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [autocompleteRunning, setAutocompleteRunning] = useState(false);

  // Inline smart suggestions
  const [inlineSuggestion, setInlineSuggestion] = useState('');
  const [fetchingSuggestion, setFetchingSuggestion] = useState(false);

  const API_URL = 'http://localhost:5000/api';
  const headers = useAuthStore.getState().getAuthHeaders();

  const fetchSections = async () => {
    if (!activeProject) return;
    try {
      const response = await fetch(`${API_URL}/reports/project/${activeProject._id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setSections(data);
        if (data.length > 0) {
          setSelectedSection(prev => {
            const match = data.find((s: DocumentSection) => s._id === prev?._id);
            return match || data[0];
          });
        } else {
          setSelectedSection(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeProject) {
      fetchSections();
    }
  }, [activeProject]);

  useEffect(() => {
    if (selectedSection) {
      setLiveContent(selectedSection.content);
    } else {
      setLiveContent('');
    }
    setInlineSuggestion('');
  }, [selectedSection]);

  // Debounce effect to request inline suggestions when the user stops typing
  useEffect(() => {
    if (!selectedSection || !liveContent.trim()) {
      setInlineSuggestion('');
      return;
    }

    // Instantly hide previous suggestion as user edits
    setInlineSuggestion('');

    const delayDebounce = setTimeout(async () => {
      // Don't request for very short texts
      if (liveContent.trim().length < 15) return;

      setFetchingSuggestion(true);
      try {
        const response = await fetch(`${API_URL}/reports/${selectedSection._id}/inline-suggest`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentContent: liveContent })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.suggestion && data.suggestion.trim()) {
            setInlineSuggestion(data.suggestion);
          }
        }
      } catch (err) {
        console.error('Error fetching inline suggestion:', err);
      } finally {
        setFetchingSuggestion(false);
      }
    }, 1200); // 1.2s delay of inactivity

    return () => clearTimeout(delayDebounce);
  }, [liveContent, selectedSection]);

  const acceptInlineSuggestion = (textareaElement?: HTMLTextAreaElement | null) => {
    if (!inlineSuggestion) return;
    
    let start = liveContent.length;
    let end = liveContent.length;
    let targetTextarea = textareaElement;

    if (!targetTextarea) {
      targetTextarea = document.getElementById('report-editor-textarea') as HTMLTextAreaElement;
    }

    if (targetTextarea) {
      start = targetTextarea.selectionStart;
      end = targetTextarea.selectionEnd;
    }

    const needsSpace = start > 0 && 
                       !liveContent.substring(0, start).endsWith(' ') && 
                       !liveContent.substring(0, start).endsWith('\n') && 
                       !inlineSuggestion.startsWith(' ');

    const textToInsert = (needsSpace ? ' ' : '') + inlineSuggestion;
    const newContent = liveContent.substring(0, start) + textToInsert + liveContent.substring(end);

    setLiveContent(newContent);
    setInlineSuggestion('');

    if (targetTextarea) {
      setTimeout(() => {
        targetTextarea!.focus();
        targetTextarea!.selectionStart = targetTextarea!.selectionEnd = start + textToInsert.length;
      }, 0);
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && inlineSuggestion) {
      e.preventDefault();
      acceptInlineSuggestion(e.currentTarget);
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !secTitle) return;

    try {
      const response = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: activeProject._id,
          title: secTitle,
          sectionType: secType,
          content: ''
        })
      });

      if (response.ok) {
        setShowAddModal(false);
        setSecTitle('');
        await fetchSections();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveContent = async () => {
    if (!selectedSection) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/reports/${selectedSection._id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: liveContent })
      });
      if (response.ok) {
        const updated = await response.json();
        setSections(prev => prev.map(s => s._id === updated._id ? updated : s));
        setSelectedSection(updated);
        alert('Sección académica guardada con éxito.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRunAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection) return;
    setAiRunning(true);

    try {
      const response = await fetch(`${API_URL}/reports/${selectedSection._id}/generate-section`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType,
          instruction: aiInstruction
        })
      });

      if (response.ok) {
        const updated = await response.json();
        setLiveContent(updated.content);
        setSelectedSection(updated);
        setSections(prev => prev.map(s => s._id === updated._id ? updated : s));
        setAiInstruction('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiRunning(false);
    }
  };

  const handleAutocomplete = async () => {
    if (!selectedSection) return;
    setAutocompleteRunning(true);
    try {
      const response = await fetch(`${API_URL}/reports/${selectedSection._id}/autocomplete`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentContent: liveContent,
          instruction: aiInstruction
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.completion) {
          const separator = liveContent.endsWith('\n') || liveContent.length === 0 ? '' : '\n\n';
          setLiveContent(prev => prev + separator + data.completion);
        }
      } else {
        const errData = await response.json();
        alert(errData.message || 'Error al autocompletar la sección.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al intentar conectar con el servidor.');
    } finally {
      setAutocompleteRunning(false);
    }
  };

  const handleDeleteSection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Eliminar este borrador de sección académica?')) {
      try {
        const response = await fetch(`${API_URL}/reports/${id}`, {
          method: 'DELETE',
          headers
        });
        if (response.ok) {
          if (selectedSection?._id === id) setSelectedSection(null);
          await fetchSections();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-zinc-200 rounded-lg bg-white p-8">
        <FileText className="w-8 h-8 text-zinc-400 mb-2" />
        <span className="text-sm text-zinc-500">Selecciona un proyecto para ver y redactar informes de título.</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight font-sans">Asistente de Informes de Título</h1>
          <p className="text-sm text-zinc-500 mt-1">Escribe y maqueta los capítulos de tu tesis con redacción formal académica apoyada por IA.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-2 rounded transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva Sección
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Side: Chapter index list */}
        <div className="space-y-4 lg:col-span-1">
          <h3 className="text-xs font-extrabold text-black uppercase font-mono tracking-wider">Capítulos & Secciones</h3>
          <div className="bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-200 overflow-hidden shadow-sm">
            {sections.map(s => (
              <div
                key={s._id}
                onClick={() => setSelectedSection(s)}
                className={`p-4 cursor-pointer transition-colors flex justify-between items-center ${
                  selectedSection?._id === s._id ? 'bg-zinc-50 font-semibold' : 'hover:bg-zinc-50'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <span className="text-xs font-bold text-black block truncate">{s.title}</span>
                  <span className="text-[10px] text-zinc-400 font-mono mt-0.5 block">
                    {s.sectionType}
                  </span>
                </div>
                <button
                  onClick={(e) => handleDeleteSection(s._id, e)}
                  className="text-zinc-300 hover:text-red-600 transition-colors p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {sections.length === 0 && (
              <div className="p-8 text-center text-xs text-zinc-400 italic">No hay secciones de informes creadas.</div>
            )}
          </div>
        </div>

        {/* Right Side: AI writing canvas */}
        <div className="lg:col-span-3 space-y-6">
          {selectedSection ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Markdown Editor */}
              <div className="xl:col-span-2 space-y-4">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-mono text-zinc-400 uppercase">Redactor Markdown Académico</span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAutocomplete}
                      disabled={autocompleteRunning || !selectedSection}
                      className="flex items-center gap-1.5 bg-zinc-150 hover:bg-zinc-200 border border-zinc-300 text-black disabled:opacity-50 text-[11px] font-bold px-3 py-1.5 rounded transition-colors"
                    >
                      <BrainCircuit className="w-3.5 h-3.5" /> {autocompleteRunning ? 'Autocompletando...' : 'Autocompletar con IA'}
                    </button>
                    <button
                      onClick={handleSaveContent}
                      disabled={saving}
                      className="flex items-center gap-1.5 bg-black text-white hover:bg-zinc-800 disabled:opacity-50 text-[11px] font-bold px-3 py-1.5 rounded transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" /> {saving ? 'Guardando...' : 'Guardar Sección'}
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <textarea
                    id="report-editor-textarea"
                    value={liveContent}
                    onChange={e => setLiveContent(e.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    className="w-full bg-white border border-zinc-200 rounded-lg p-6 text-xs text-zinc-800 h-[450px] focus:outline-none focus:border-zinc-400 leading-relaxed font-sans shadow-sm"
                    placeholder="# Título de la Sección&#10;&#10;Comienza a escribir aquí tu informe..."
                  />

                  {/* Smart inline suggestion overlay/badge */}
                  {inlineSuggestion && (
                    <div className="absolute bottom-4 left-4 right-4 bg-zinc-50 border border-zinc-200 rounded px-3 py-2 flex items-center justify-between text-[11px] shadow-sm animate-fade-in z-10">
                      <span className="text-zinc-600 truncate pr-4 text-left">
                        💡 <strong className="text-black">Sugerencia de tesis:</strong> <span className="italic text-zinc-800">"...{inlineSuggestion}..."</span>
                      </span>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => acceptInlineSuggestion(null)}
                          className="bg-black hover:bg-zinc-800 text-white text-[9px] font-bold px-2 py-1 rounded transition-colors"
                        >
                          Tab / Aceptar
                        </button>
                        <button
                          type="button"
                          onClick={() => setInlineSuggestion('')}
                          className="text-zinc-400 hover:text-red-650 text-[9px] font-bold px-1.5 py-1"
                        >
                          Ignorar
                        </button>
                      </div>
                    </div>
                  )}

                  {fetchingSuggestion && (
                    <div className="absolute bottom-4 right-4 text-[10px] text-zinc-400 italic bg-white px-2 py-1 rounded border border-zinc-100 flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 bg-black rounded-full animate-ping" />
                      Pensando sugerencia...
                    </div>
                  )}
                </div>
              </div>

              {/* AI Writer Options */}
              <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4 shadow-sm xl:col-span-1 h-fit">
                <div className="border-b border-zinc-150 pb-2 flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-black" />
                  <span className="text-xs font-bold text-black">Redactor Asistido por IA</span>
                </div>

                <form onSubmit={handleRunAIGenerate} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Tipo de Plantilla Tesis</label>
                    <select
                      value={templateType}
                      onChange={e => setTemplateType(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none focus:border-black font-semibold"
                    >
                      <option value="Introducción del Proyecto">Introducción y Contexto</option>
                      <option value="Planteamiento de Problema">Planteamiento de Problema</option>
                      <option value="Objetivos del Software">Objetivos (General y Específicos)</option>
                      <option value="Análisis de Requerimientos">Análisis de Requerimientos (RF/RN)</option>
                      <option value="Definición de Arquitectura Técnica">Arquitectura y Stack Técnico</option>
                      <option value="Metodología y Planificación">Metodología de Desarrollo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Pautas / Instrucciones específicas</label>
                    <textarea
                      value={aiInstruction}
                      onChange={e => setAiInstruction(e.target.value)}
                      required
                      placeholder="Indica a la IA en qué enfocarse para la redacción académica. Ej: 'Escribe en tercera persona formal. Detalla los problemas de latencia de la base de datos actual y destaca la escalabilidad de MongoDB para manejar grandes flujos de datos...'"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded p-2.5 text-xs text-zinc-800 h-28 resize-none focus:outline-none focus:border-zinc-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={aiRunning}
                    className="w-full flex items-center justify-center gap-2 bg-black text-white hover:bg-zinc-800 disabled:opacity-50 text-xs font-bold py-2 rounded transition-colors"
                  >
                    <BrainCircuit className="w-4 h-4" /> {aiRunning ? 'Generando Redacción...' : 'Redactar Sección'}
                  </button>
                </form>

                <div className="bg-zinc-50 border border-zinc-150 p-3 rounded text-[10px] text-zinc-500 leading-relaxed">
                  <span className="font-bold text-zinc-700 block mb-1">Tip de Redacción:</span>
                  La IA utilizará automáticamente la ficha técnica de la empresa, objetivos y planteamiento del problema del proyecto como contexto base para una redacción altamente adaptada.
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-lg p-16 text-center text-zinc-500 shadow-sm">
              <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <span>Selecciona un capítulo de la barra lateral para ver su editor académico u obtener redacciones de la IA.</span>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 max-w-md w-full shadow-lg">
            <h3 className="text-base font-bold text-black mb-4 font-sans">Registrar Nueva Sección Académica</h3>
            <form onSubmit={handleAddSection} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Título del Capítulo / Subsección</label>
                <input
                  type="text"
                  required
                  value={secTitle}
                  onChange={e => setSecTitle(e.target.value)}
                  placeholder="Ej: Capítulo 1. Introducción y Negocio"
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Tipo de Sección</label>
                <select
                  value={secType}
                  onChange={e => setSecType(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none focus:border-black"
                >
                  <option value="Capitulo I">Capítulo I (Introducción y Contexto)</option>
                  <option value="Capitulo II">Capítulo II (Análisis de Requerimientos)</option>
                  <option value="Capitulo III">Capítulo III (Diseño de Arquitectura)</option>
                  <option value="Capitulo IV">Capítulo IV (Metodología de Desarrollo)</option>
                  <option value="Capitulo V">Capítulo V (Validaciones y Pruebas)</option>
                  <option value="Conclusiones">Conclusiones y Trabajo Futuro</option>
                </select>
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
                  Crear Sección
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

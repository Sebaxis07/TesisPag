import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { 
  FileText, Plus, BrainCircuit, Trash2, Save, BookOpen, 
  History, Lock, FileDown, CheckCircle, AlertTriangle, 
  Link2, CheckSquare, Eye, RefreshCw, Layers, Sparkles
} from 'lucide-react';

interface IDocumentVersion {
  versionNumber: number;
  content: string;
  commitMessage: string;
  updatedBy: string;
  createdAt: string;
}

interface IParagraphEvidence {
  _id?: string;
  paragraphId: string;
  sourceType: 'Meeting' | 'Requirement' | 'ADRDecision' | 'SourceDocument' | 'Task';
  sourceId: string;
  matchedText: string;
  confidence: number;
}

interface ICitation {
  _id?: string;
  citationKey: string;
  sourceType: 'ExternalPDF' | 'InternalArtifact';
  sourceId?: string;
  bibtexData?: string;
  citationString: string;
}

interface DocumentSection {
  _id: string;
  title: string;
  templateType: string;
  content: string;
  status: 'Draft' | 'InReview' | 'Approved' | 'Frozen';
  level: number;
  parentSection: string | null;
  order: number;
  assignedTo: string | null;
  versions?: IDocumentVersion[];
  evidence?: IParagraphEvidence[];
  citations?: ICitation[];
}

const PREDEFINED_RUBRICS: Record<string, string> = {
  '': 'Personalizado (Escribir o pegar rúbrica)',
  'introduccion': `Criterios para Introducción y Contexto:\n1. El capítulo debe plantear claramente la problemática o necesidad de la organización.\n2. Se debe especificar formalmente el rubro de la empresa patrocinadora.\n3. Se debe justificar la viabilidad y alcance inicial del proyecto.`,
  'requerimientos': `Criterios para Análisis de Requerimientos:\n1. Se deben listar requerimientos funcionales estructurados y codificados.\n2. Cada requerimiento debe tener asignada una prioridad.\n3. Se deben definir criterios de aceptación claros para cada requerimiento.`,
  'arquitectura': `Criterios para Arquitectura Técnica:\n1. Se debe justificar técnicamente el stack tecnológico seleccionado.\n2. Debe describirse la arquitectura lógica del sistema con sus diagramas.\n3. Deben detallarse los mecanismos de seguridad y autenticación.`
};

export const Reports: React.FC = () => {
  const { activeProject } = useProjectStore();
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<DocumentSection | null>(null);

  // Modals and inputs
  const [showAddModal, setShowAddModal] = useState(false);
  const [secTitle, setSecTitle] = useState('');
  const [secLevel, setSecLevel] = useState(1);
  const [secParent, setSecParent] = useState('');
  const [templateType, setTemplateType] = useState('Introducción del Proyecto');

  // Live markdown text & saving
  const [liveContent, setLiveContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiRunning, setAiRunning] = useState(false);
  const [autocompleteRunning, setAutocompleteRunning] = useState(false);

  // Inline smart suggestions
  const [inlineSuggestion, setInlineSuggestion] = useState('');
  const [fetchingSuggestion, setFetchingSuggestion] = useState(false);

  // Active column 3 tab
  const [inspectorTab, setInspectorTab] = useState<'evidence' | 'ai_review'>('evidence');

  // Checkpoints / Versions
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitMsg, setCommitMsg] = useState('');
  const [selectedVersionView, setSelectedVersionView] = useState<IDocumentVersion | null>(null);

  // Citations
  const [showCitationModal, setShowCitationModal] = useState(false);
  const [citeType, setCiteType] = useState<'ExternalPDF' | 'InternalArtifact'>('ExternalPDF');
  const [citeString, setCiteString] = useState('');
  const [citeKey, setCiteKey] = useState('');

  // Evidence binding form
  const [selectedParagraph, setSelectedParagraph] = useState('Párrafo 1');
  const [evidenceSourceType, setEvidenceSourceType] = useState<'Meeting' | 'Requirement' | 'ADRDecision' | 'Task'>('Meeting');
  const [evidenceSourceId, setEvidenceSourceId] = useState('');
  const [evidenceQuote, setEvidenceQuote] = useState('');

  // Project artifacts lists for evidence selection
  const [projectRequirements, setProjectRequirements] = useState<any[]>([]);
  const [projectMeetings, setProjectMeetings] = useState<any[]>([]);
  const [projectADRs, setProjectADRs] = useState<any[]>([]);
  const [projectTasks, setProjectTasks] = useState<any[]>([]);

  // AI Critique and Consistency results
  const [aiCritique, setAiCritique] = useState<any | null>(null);
  const [aiConsistency, setAiConsistency] = useState<any | null>(null);
  const [loadingCritique, setLoadingCritique] = useState(false);
  const [loadingConsistency, setLoadingConsistency] = useState(false);

  // Rubric check states
  const [rubricText, setRubricText] = useState('');
  const [aiRubricEvaluation, setAiRubricEvaluation] = useState<any | null>(null);
  const [loadingRubric, setLoadingRubric] = useState(false);

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

  const fetchProjectArtifacts = async () => {
    if (!activeProject) return;
    try {
      // Requirements
      const reqRes = await fetch(`${API_URL}/requirements/project/${activeProject._id}`, { headers });
      if (reqRes.ok) setProjectRequirements(await reqRes.json());

      // Meetings
      const meetRes = await fetch(`${API_URL}/meetings/project/${activeProject._id}`, { headers });
      if (meetRes.ok) setProjectMeetings(await meetRes.json());

      // ADRs
      const adrRes = await fetch(`${API_URL}/adrs/project/${activeProject._id}`, { headers });
      if (adrRes.ok) setProjectADRs(await adrRes.json());

      // Tasks
      const taskRes = await fetch(`${API_URL}/tasks/project/${activeProject._id}`, { headers });
      if (taskRes.ok) setProjectTasks(await taskRes.json());
    } catch (err) {
      console.error('Error fetching project artifacts:', err);
    }
  };

  useEffect(() => {
    if (activeProject) {
      fetchSections();
      fetchProjectArtifacts();
    }
  }, [activeProject]);

  useEffect(() => {
    if (selectedSection) {
      setLiveContent(selectedSection.content);
      setSelectedVersionView(null);
      setAiCritique(null);
      setAiConsistency(null);
      setAiRubricEvaluation(null);
      setRubricText('');
    } else {
      setLiveContent('');
    }
    setInlineSuggestion('');
  }, [selectedSection]);

  // Debounce for inline suggestions
  useEffect(() => {
    if (!selectedSection || !liveContent.trim() || selectedSection.status === 'Approved' || selectedSection.status === 'Frozen') {
      setInlineSuggestion('');
      return;
    }

    setInlineSuggestion('');

    const delayDebounce = setTimeout(async () => {
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
        console.error('Error inline suggestion:', err);
      } finally {
        setFetchingSuggestion(false);
      }
    }, 1200);

    return () => clearTimeout(delayDebounce);
  }, [liveContent, selectedSection]);

  const acceptInlineSuggestion = () => {
    if (!inlineSuggestion) return;
    const targetTextarea = document.getElementById('report-editor-textarea') as HTMLTextAreaElement;
    let start = liveContent.length;
    let end = liveContent.length;

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
        targetTextarea.focus();
        targetTextarea.selectionStart = targetTextarea.selectionEnd = start + textToInsert.length;
      }, 0);
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && inlineSuggestion) {
      e.preventDefault();
      acceptInlineSuggestion();
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
          templateType,
          level: secLevel,
          parentSection: secParent || null,
          content: ''
        })
      });

      if (response.ok) {
        setShowAddModal(false);
        setSecTitle('');
        setSecParent('');
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
        alert('Contenido guardado con éxito.');
      } else {
        const errData = await response.json();
        alert(errData.message || 'Error al guardar.');
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
          prompt: aiInstruction,
          useRag: true
        })
      });

      if (response.ok) {
        const updated = await response.json();
        setLiveContent(updated.content);
        setSelectedSection(updated);
        setSections(prev => prev.map(s => s._id === updated._id ? updated : s));
        setAiInstruction('');
      } else {
        const errData = await response.json();
        alert(errData.message || 'Error al generar redacción.');
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
    } finally {
      setAutocompleteRunning(false);
    }
  };

  const handleDeleteSection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Eliminar esta sección del informe?')) {
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

  const handleCommitCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection) return;

    try {
      const response = await fetch(`${API_URL}/reports/${selectedSection._id}/commit`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ commitMessage: commitMsg })
      });

      if (response.ok) {
        const updated = await response.json();
        setSelectedSection(updated);
        setSections(prev => prev.map(s => s._id === updated._id ? updated : s));
        setCommitMsg('');
        setShowCommitModal(false);
        alert('Checkpoint registrado con éxito. El estado se ha restablecido a borrador para continuar redactando.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection || !citeString) return;

    try {
      const response = await fetch(`${API_URL}/reports/${selectedSection._id}/cite`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: citeType,
          citationString: citeString,
          citationKey: citeKey || undefined
        })
      });

      if (response.ok) {
        const updated = await response.json();
        setSelectedSection(updated);
        setSections(prev => prev.map(s => s._id === updated._id ? updated : s));
        setCiteString('');
        setCiteKey('');
        setShowCitationModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBindEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection || !evidenceSourceId) return;

    try {
      const response = await fetch(`${API_URL}/reports/${selectedSection._id}/evidence/bind`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paragraphId: selectedParagraph,
          sourceType: evidenceSourceType,
          sourceId: evidenceSourceId,
          matchedText: evidenceQuote
        })
      });

      if (response.ok) {
        const updated = await response.json();
        setSelectedSection(updated);
        setSections(prev => prev.map(s => s._id === updated._id ? updated : s));
        setEvidenceQuote('');
        setEvidenceSourceId('');
        alert('Evidencia asociada exitosamente.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const runAiCritique = async () => {
    if (!selectedSection) return;
    setLoadingCritique(true);
    setAiCritique(null);

    try {
      // Auto-save first
      await fetch(`${API_URL}/reports/${selectedSection._id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: liveContent })
      });

      const response = await fetch(`${API_URL}/reports/${selectedSection._id}/critique`, {
        method: 'POST',
        headers
      });

      if (response.ok) {
        setAiCritique(await response.json());
      } else {
        const err = await response.json();
        alert(err.message || 'Error en revisión de pares.');
      }
    } catch (err) {
      console.error('Error peer review:', err);
      alert('Error al conectar con el servidor.');
    } finally {
      setLoadingCritique(false);
    }
  };

  const runAiConsistencyCheck = async () => {
    if (!selectedSection) return;
    setLoadingConsistency(true);
    setAiConsistency(null);

    try {
      // Auto-save first
      await fetch(`${API_URL}/reports/${selectedSection._id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: liveContent })
      });

      const response = await fetch(`${API_URL}/reports/${selectedSection._id}/consistency`, {
        method: 'POST',
        headers
      });

      if (response.ok) {
        setAiConsistency(await response.json());
      } else {
        const err = await response.json();
        alert(err.message || 'Error en validación de consistencia.');
      }
    } catch (err) {
      console.error('Error consistency validation:', err);
      alert('Error al conectar con el servidor.');
    } finally {
      setLoadingConsistency(false);
    }
  };

  const runAiRubricCheck = async () => {
    if (!selectedSection || !rubricText.trim()) return;
    setLoadingRubric(true);
    setAiRubricEvaluation(null);

    try {
      // Auto-save first
      await fetch(`${API_URL}/reports/${selectedSection._id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: liveContent })
      });

      const response = await fetch(`${API_URL}/reports/${selectedSection._id}/check-rubric`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rubricText })
      });

      if (response.ok) {
        setAiRubricEvaluation(await response.json());
      } else {
        const err = await response.json();
        alert(err.message || 'Error en evaluación de rúbrica.');
      }
    } catch (err) {
      console.error('Error rubric evaluation:', err);
      alert('Error al conectar con el servidor.');
    } finally {
      setLoadingRubric(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!selectedSection) return;
    try {
      const response = await fetch(`${API_URL}/reports/${selectedSection._id}/export/${format}`, {
        method: 'POST',
        headers
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedSection.title.replace(/\s+/g, '_')}.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const handleUpdateStatus = async (newStatus: 'Draft' | 'InReview' | 'Approved' | 'Frozen') => {
    if (!selectedSection) return;
    try {
      const response = await fetch(`${API_URL}/reports/${selectedSection._id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedSection(updated);
        setSections(prev => prev.map(s => s._id === updated._id ? updated : s));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Frozen':
        return 'bg-zinc-150 text-zinc-700 border-zinc-300';
      case 'InReview':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Approved': return 'Aprobado';
      case 'Frozen': return 'Congelado';
      case 'InReview': return 'En Revisión';
      default: return 'Borrador';
    }
  };

  const isLocked = selectedSection?.status === 'Approved' || selectedSection?.status === 'Frozen';

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-200 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight font-sans flex items-center gap-2">
            Workspace de Redacción Académica <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Escribe, revisa, versiona y vincula evidencias de tu tesis con rigor metodológico e IA.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-2 rounded transition-colors"
          >
            <Plus className="w-4 h-4" /> Crear Sección
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column 1: Planner & Sections list (3/12) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Progreso de la Tesis</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-600">Secciones completadas:</span>
                <span className="font-bold text-black font-mono">
                  {sections.filter(s => s.status === 'Approved' || s.status === 'Frozen').length} / {sections.length}
                </span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-1.5 transition-all duration-500" 
                  style={{ width: `${sections.length > 0 ? (sections.filter(s => s.status === 'Approved' || s.status === 'Frozen').length / sections.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-150 overflow-hidden shadow-sm">
            <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center">
              <span className="text-xs font-bold text-black">Esquema del Documento</span>
            </div>
            
            <div className="divide-y divide-zinc-100 max-h-[500px] overflow-y-auto">
              {sections.map(s => (
                <div
                  key={s._id}
                  onClick={() => setSelectedSection(s)}
                  className={`p-3 cursor-pointer transition-colors flex justify-between items-center ${
                    selectedSection?._id === s._id ? 'bg-indigo-50/40 border-l-2 border-indigo-600 font-semibold' : 'hover:bg-zinc-50'
                  }`}
                  style={{ paddingLeft: s.level > 1 ? `${s.level * 8 + 12}px` : '12px' }}
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs text-black block truncate">{s.title}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-zinc-400 font-mono">{s.templateType}</span>
                      <span className={`text-[8px] border px-1 rounded-full font-semibold ${getStatusBadgeClass(s.status)}`}>
                        {getStatusLabel(s.status)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSection(s._id, e)}
                    className="text-zinc-300 hover:text-red-650 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {sections.length === 0 && (
                <div className="p-8 text-center text-xs text-zinc-400 italic">No hay capítulos agregados.</div>
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Live Editor Workspace (6/12) */}
        <div className="lg:col-span-6 space-y-4">
          {selectedSection ? (
            <div className="space-y-4">
              {/* Lock Banner if Approved/Frozen */}
              {isLocked && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    <span><strong>Sección Congelada:</strong> Aprobada formalmente. La edición directa está bloqueada para preservar la versión.</span>
                  </span>
                  <button
                    onClick={() => setShowCommitModal(true)}
                    className="bg-amber-800 text-white font-bold px-2 py-1 rounded hover:bg-amber-900 transition-colors"
                  >
                    Registrar Cambio
                  </button>
                </div>
              )}

              {/* Editor Workspace Panel */}
              <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-150 pb-3 gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-black">{selectedSection.title}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] border px-1.5 py-0.5 rounded-full font-semibold ${getStatusBadgeClass(selectedSection.status)}`}>
                        {getStatusLabel(selectedSection.status)}
                      </span>
                      {selectedSection.versions && selectedSection.versions.length > 0 && (
                        <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                          <Layers className="w-3 h-3" /> v{selectedSection.versions.length + 1}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExport('pdf')}
                      className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 text-[10px] font-bold px-2 py-1.5 rounded transition-colors"
                    >
                      <FileDown className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button
                      onClick={() => handleExport('docx')}
                      className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 text-[10px] font-bold px-2 py-1.5 rounded transition-colors"
                    >
                      <FileDown className="w-3.5 h-3.5" /> Word
                    </button>
                    <button
                      onClick={() => setShowCommitModal(true)}
                      className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100 text-[10px] font-bold px-2 py-1.5 rounded transition-colors"
                    >
                      <History className="w-3.5 h-3.5" /> Commit
                    </button>
                    <button
                      onClick={handleSaveContent}
                      disabled={saving || isLocked}
                      className="flex items-center gap-1 bg-black text-white hover:bg-zinc-800 disabled:opacity-50 text-[10px] font-bold px-2.5 py-1.5 rounded transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" /> Guardar
                    </button>
                  </div>
                </div>

                {/* Sub-status settings for reviewers */}
                <div className="flex gap-2 items-center bg-zinc-50 p-2 rounded-lg border border-zinc-200 text-xs">
                  <span className="text-zinc-500 font-medium">Cambiar Estado:</span>
                  {(['Draft', 'InReview', 'Approved', 'Frozen'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(st)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        selectedSection.status === st 
                          ? 'bg-zinc-800 text-white' 
                          : 'bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {getStatusLabel(st)}
                    </button>
                  ))}
                </div>

                {/* Textarea workspace */}
                <div className="relative">
                  <textarea
                    id="report-editor-textarea"
                    value={liveContent}
                    disabled={isLocked}
                    onChange={e => setLiveContent(e.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    className="w-full bg-white border border-zinc-200 rounded-lg p-5 text-xs text-zinc-800 h-[400px] focus:outline-none focus:border-zinc-400 leading-relaxed font-sans shadow-inner disabled:bg-zinc-50/50"
                    placeholder="# Título de la Sección&#10;&#10;Comienza a redactar aquí tu informe..."
                  />

                  {/* Inline smart suggestion badge */}
                  {inlineSuggestion && (
                    <div className="absolute bottom-4 left-4 right-4 bg-zinc-900 text-white rounded p-3 flex items-center justify-between text-[11px] shadow-lg animate-fade-in z-10">
                      <span className="truncate pr-4 text-left">
                        💡 <strong className="text-zinc-200">IA sugiere:</strong> <span className="italic text-zinc-300">"...{inlineSuggestion}..."</span>
                      </span>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={acceptInlineSuggestion}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold px-2 py-1 rounded transition-colors"
                        >
                          Tab
                        </button>
                        <button
                          type="button"
                          onClick={() => setInlineSuggestion('')}
                          className="text-zinc-400 hover:text-white text-[9px] font-bold px-1.5 py-1"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  )}

                  {fetchingSuggestion && (
                    <div className="absolute bottom-4 right-4 text-[10px] text-zinc-400 italic bg-white px-2 py-1 rounded border border-zinc-150 flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 bg-black rounded-full animate-ping" />
                      Analizando...
                    </div>
                  )}
                </div>

                {/* Citations Footer & List */}
                <div className="border-t border-zinc-200 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-black flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-zinc-600" /> Citas y Referencias (APA 7)
                    </h4>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => setShowCitationModal(true)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50 transition-colors disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Cita
                    </button>
                  </div>
                  
                  <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-[10px] text-zinc-600 divide-y divide-zinc-150 max-h-36 overflow-y-auto">
                    {selectedSection.citations && selectedSection.citations.length > 0 ? (
                      selectedSection.citations.map((c, i) => (
                        <div key={c._id || i} className="py-2 first:pt-0 last:pb-0 flex justify-between gap-4">
                          <span className="font-mono font-bold text-black flex-shrink-0">{c.citationKey}</span>
                          <span className="text-left flex-grow">{c.citationString}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-2 italic text-zinc-400">No se han registrado citas en esta sección.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Version picker / Historical diff preview */}
              {selectedSection.versions && selectedSection.versions.length > 0 && (
                <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-black flex items-center gap-1.5">
                    <History className="w-4 h-4 text-zinc-500" /> Histórico de Checkpoints y Versiones
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedSection.versions.map(v => (
                      <button
                        key={v.versionNumber}
                        onClick={() => setSelectedVersionView(selectedVersionView?.versionNumber === v.versionNumber ? null : v)}
                        className={`text-[10px] border px-2 py-1 rounded font-mono transition-all flex items-center gap-1 ${
                          selectedVersionView?.versionNumber === v.versionNumber 
                            ? 'bg-zinc-800 text-white border-zinc-800' 
                            : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-600'
                        }`}
                      >
                        <Layers className="w-3 h-3" /> v{v.versionNumber}
                      </button>
                    ))}
                  </div>

                  {selectedVersionView && (
                    <div className="bg-zinc-50 border border-zinc-200 rounded p-3 text-[10px] text-zinc-700 space-y-2 text-left">
                      <div className="flex justify-between border-b border-zinc-200 pb-1">
                        <span className="font-bold">Detalle Checkpoint v{selectedVersionView.versionNumber}</span>
                        <span className="font-mono text-zinc-400">{new Date(selectedVersionView.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="italic font-semibold">Mensaje: "{selectedVersionView.commitMessage}"</p>
                      <div className="bg-white border border-zinc-150 p-2.5 rounded max-h-40 overflow-y-auto font-mono text-[9px] leading-relaxed whitespace-pre-wrap">
                        {selectedVersionView.content}
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Restaurar el editor al contenido de la versión ${selectedVersionView.versionNumber}?`)) {
                              setLiveContent(selectedVersionView.content);
                              setSelectedVersionView(null);
                            }
                          }}
                          className="bg-black hover:bg-zinc-800 text-white text-[9px] font-bold px-2 py-1 rounded transition-colors"
                        >
                          Restaurar este contenido
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-lg p-16 text-center text-zinc-500 shadow-sm">
              <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <span>Selecciona un capítulo de la barra lateral izquierda para iniciar la redacción.</span>
            </div>
          )}
        </div>

        {/* Column 3: Inspector Panel (Evidence & AI) (3/12) */}
        <div className="lg:col-span-3 space-y-4">
          {selectedSection ? (
            <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden">
              {/* Tab headers */}
              <div className="flex border-b border-zinc-200 bg-zinc-50 text-[10px] font-bold">
                <button
                  onClick={() => setInspectorTab('evidence')}
                  className={`flex-1 py-3 text-center transition-colors border-r border-zinc-250 flex justify-center items-center gap-1 ${
                    inspectorTab === 'evidence' ? 'bg-white text-black font-extrabold border-t-2 border-indigo-600' : 'text-zinc-500 hover:bg-zinc-100'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" /> Evidencias
                </button>
                <button
                  onClick={() => setInspectorTab('ai_review')}
                  className={`flex-1 py-3 text-center transition-colors flex justify-center items-center gap-1 ${
                    inspectorTab === 'ai_review' ? 'bg-white text-black font-extrabold border-t-2 border-indigo-600' : 'text-zinc-500 hover:bg-zinc-100'
                  }`}
                >
                  <BrainCircuit className="w-3.5 h-3.5" /> Revisor IA
                </button>
              </div>

              {/* Tab 1: Evidences */}
              {inspectorTab === 'evidence' && (
                <div className="p-4 space-y-4 text-left">
                  <h4 className="text-xs font-bold text-black border-b border-zinc-150 pb-1">Fundamentos del Borrador</h4>

                  {/* Bind form */}
                  <form onSubmit={handleBindEvidence} className="space-y-3 bg-zinc-50 border border-zinc-200 p-3 rounded-lg text-xs">
                    <span className="font-bold text-zinc-700 block text-[10px] uppercase">Asociar Nuevo Respaldo</span>
                    
                    <div>
                      <label className="block text-[9px] text-zinc-400 uppercase font-mono mb-0.5">Párrafo/Bloque</label>
                      <select
                        value={selectedParagraph}
                        onChange={e => setSelectedParagraph(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded px-1.5 py-1 text-[11px]"
                      >
                        <option value="Párrafo 1">Párrafo 1</option>
                        <option value="Párrafo 2">Párrafo 2</option>
                        <option value="Párrafo 3">Párrafo 3</option>
                        <option value="Párrafo 4">Párrafo 4</option>
                        <option value="Párrafo 5">Párrafo 5</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] text-zinc-400 uppercase font-mono mb-0.5">Tipo de Artefacto</label>
                      <select
                        value={evidenceSourceType}
                        onChange={e => {
                          setEvidenceSourceType(e.target.value as any);
                          setEvidenceSourceId('');
                        }}
                        className="w-full bg-white border border-zinc-200 rounded px-1.5 py-1 text-[11px]"
                      >
                        <option value="Meeting">Acta de Reunión</option>
                        <option value="Requirement">Requerimiento</option>
                        <option value="ADRDecision">Decisión Técnica (ADR)</option>
                        <option value="Task">Tarea del Tablero</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] text-zinc-400 uppercase font-mono mb-0.5">Seleccionar Elemento</label>
                      <select
                        value={evidenceSourceId}
                        required
                        onChange={e => setEvidenceSourceId(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded px-1.5 py-1 text-[11px] font-medium"
                      >
                        <option value="">-- Seleccionar --</option>
                        {evidenceSourceType === 'Meeting' && projectMeetings.map(m => (
                          <option key={m._id} value={m._id}>{new Date(m.date).toLocaleDateString()} - {m.title}</option>
                        ))}
                        {evidenceSourceType === 'Requirement' && projectRequirements.map(r => (
                          <option key={r._id} value={r._id}>{r.code}: {r.title}</option>
                        ))}
                        {evidenceSourceType === 'ADRDecision' && projectADRs.map(a => (
                          <option key={a._id} value={a._id}>{a.code}: {a.title}</option>
                        ))}
                        {evidenceSourceType === 'Task' && projectTasks.map(t => (
                          <option key={t._id} value={t._id}>[{t.status}] {t.title}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] text-zinc-400 uppercase font-mono mb-0.5">Texto/Cita de Respaldo</label>
                      <textarea
                        value={evidenceQuote}
                        onChange={e => setEvidenceQuote(e.target.value)}
                        placeholder="Ej: En la reunión se acordó migrar a un backend en FastAPI debido a la latencia..."
                        className="w-full bg-white border border-zinc-200 rounded p-1.5 text-[10px] h-12 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLocked || !evidenceSourceId}
                      className="w-full bg-black text-white hover:bg-zinc-800 disabled:opacity-50 text-[10px] font-bold py-1.5 rounded transition-colors"
                    >
                      Vincular Evidencia
                    </button>
                  </form>

                  {/* List bound evidences */}
                  <div className="space-y-3 pt-2">
                    <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Evidencias Vinculadas</span>
                    {selectedSection.evidence && selectedSection.evidence.length > 0 ? (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {selectedSection.evidence.map(e => (
                          <div key={e._id} className="border border-zinc-200 p-2.5 rounded-lg text-[10px] space-y-1.5 bg-zinc-50/50">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-black">{e.paragraphId}</span>
                              <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-1 rounded text-[8px] font-bold">
                                {e.sourceType === 'ADRDecision' ? 'ADR' : e.sourceType === 'Meeting' ? 'Reunión' : e.sourceType}
                              </span>
                            </div>
                            {e.matchedText && (
                              <p className="italic text-zinc-600 bg-white p-1.5 rounded border border-zinc-100">"{e.matchedText}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="italic text-zinc-400 text-[10px] text-center">No hay evidencias vinculadas a los párrafos de esta sección.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: AI Reviewer */}
              {inspectorTab === 'ai_review' && (
                <div className="p-4 space-y-4 text-left">
                  <h4 className="text-xs font-bold text-black border-b border-zinc-150 pb-1">Evaluación de Comité Científico</h4>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={runAiCritique}
                      disabled={loadingCritique || !liveContent.trim()}
                      className="flex-1 flex items-center justify-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-50 text-[10px] font-bold py-2 rounded transition-colors"
                    >
                      {loadingCritique ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Peer Review
                        </>
                      )}
                    </button>
                    <button
                      onClick={runAiConsistencyCheck}
                      disabled={loadingConsistency || !liveContent.trim()}
                      className="flex-1 flex items-center justify-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-50 text-[10px] font-bold py-2 rounded transition-colors"
                    >
                      {loadingConsistency ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <CheckSquare className="w-3.5 h-3.5" /> Consistencia
                        </>
                      )}
                    </button>
                  </div>

                  {/* Render Peer Review results */}
                  {aiCritique && (
                    <div className="space-y-3 bg-zinc-50 border border-zinc-200 p-3 rounded-lg text-[10px]">
                      <div className="flex justify-between items-center border-b border-zinc-200 pb-1.5">
                        <span className="font-extrabold uppercase font-mono tracking-wider">Crítica Académica IA</span>
                        <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[9px] font-mono font-bold">{aiCritique.gradeEstimate}</span>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="font-bold text-emerald-700 block">✓ Puntos Fuertes:</span>
                        <ul className="list-disc pl-3 text-zinc-600 space-y-0.5">
                          {aiCritique.strongPoints?.map((p: string, idx: number) => (
                            <li key={idx}>{p}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2 pt-1 border-t border-zinc-200">
                        <span className="font-bold text-red-650 block">✗ Debilidades a Corregir:</span>
                        {aiCritique.weakPoints?.map((w: any, idx: number) => (
                          <div key={idx} className="bg-white border border-zinc-150 p-2 rounded space-y-1">
                            <p className="italic text-zinc-500">"{w.paragraph}"</p>
                            <p className="font-semibold text-zinc-800">{w.critique}</p>
                            <p className="text-indigo-600 font-medium bg-indigo-50/50 p-1 rounded">Sugerencia: {w.improvement}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Render Consistency Results */}
                  {aiConsistency && (
                    <div className="space-y-3 bg-zinc-50 border border-zinc-200 p-3 rounded-lg text-[10px]">
                      <span className="font-extrabold uppercase font-mono tracking-wider border-b border-zinc-200 pb-1.5 block">Alertas de Consistencia Cruzada</span>
                      {aiConsistency.inconsistencies && aiConsistency.inconsistencies.length > 0 ? (
                        <div className="space-y-2.5">
                          {aiConsistency.inconsistencies.map((inc: any, idx: number) => (
                            <div key={idx} className="bg-white border border-zinc-150 p-2.5 rounded space-y-1">
                              <div className="flex gap-1.5 items-center font-bold">
                                {inc.severity === 'High' ? (
                                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                                ) : (
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                )}
                                <span className={inc.severity === 'High' ? 'text-red-700' : 'text-amber-700'}>
                                  [{inc.field}] Conflicto {inc.severity === 'High' ? 'Alto' : 'Medio'}
                                </span>
                              </div>
                              <p className="text-zinc-700">{inc.message}</p>
                              <p className="text-emerald-700 font-semibold bg-emerald-50/50 p-1 rounded">Solución: {inc.suggestion}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-white border border-zinc-150 rounded flex flex-col items-center gap-1">
                          <CheckCircle className="w-6 h-6 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Consistencia Perfecta</span>
                          <span className="text-zinc-400 text-[9px]">El borrador coincide perfectamente con la configuración de ThesisFlow.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rubric evaluation widget */}
                  <div className="border-t border-zinc-200 pt-4 space-y-3">
                    <h4 className="text-xs font-bold text-black flex items-center gap-1">
                      📋 Revisor por Rúbrica Académica
                    </h4>
                    
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[8px] font-mono text-zinc-400 uppercase mb-0.5">Cargar Plantilla de Rúbrica</label>
                        <select
                          onChange={e => {
                            const val = e.target.value;
                            if (val) {
                              setRubricText(PREDEFINED_RUBRICS[val]);
                            } else {
                              setRubricText('');
                            }
                          }}
                          className="w-full bg-white border border-zinc-200 rounded px-1.5 py-1 text-[10px] font-semibold cursor-pointer"
                        >
                          {Object.keys(PREDEFINED_RUBRICS).map(key => (
                            <option key={key} value={key}>
                              {key === '' ? 'Copiar y pegar...' : `Rúbrica: ${key.toUpperCase()}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[8px] font-mono text-zinc-400 uppercase mb-0.5">Texto de la Rúbrica de Evaluación</label>
                        <textarea
                          value={rubricText}
                          onChange={e => setRubricText(e.target.value)}
                          placeholder="Ingresa los criterios o rúbrica de evaluación institucional contra la cual contrastar este borrador..."
                          className="w-full bg-white border border-zinc-200 rounded p-1.5 text-[10px] h-20 resize-none font-mono"
                        />
                      </div>

                      <button
                        onClick={runAiRubricCheck}
                        disabled={loadingRubric || !rubricText.trim() || !liveContent.trim()}
                        className="w-full bg-black text-white hover:bg-zinc-800 disabled:opacity-50 text-[10px] font-bold py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                      >
                        {loadingRubric ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" /> Evaluando Rúbrica...
                          </>
                        ) : (
                          'Evaluar contra Rúbrica'
                        )}
                      </button>
                    </div>

                    {/* Rubric evaluation results */}
                    {aiRubricEvaluation && (
                      <div className="space-y-3 bg-zinc-50 border border-zinc-200 p-3 rounded-lg text-[10px] mt-3 animate-fade-in text-left">
                        <div className="flex justify-between items-center border-b border-zinc-200 pb-1.5">
                          <span className="font-extrabold uppercase font-mono tracking-wider">Resultado de la Rúbrica</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${
                              aiRubricEvaluation.complianceScore >= 85
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : aiRubricEvaluation.complianceScore >= 70
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            Score: {aiRubricEvaluation.complianceScore}%
                          </span>
                        </div>

                        <p className="text-zinc-600 leading-relaxed font-sans italic bg-white border border-zinc-150 p-2 rounded whitespace-pre-wrap">
                          {aiRubricEvaluation.evaluationReport}
                        </p>

                        {aiRubricEvaluation.missingCriteria && aiRubricEvaluation.missingCriteria.length > 0 ? (
                          <div className="space-y-2">
                            <span className="font-bold text-red-650 block">Criterios Insatisfechos / Faltantes:</span>
                            {aiRubricEvaluation.missingCriteria.map((item: any, idx: number) => (
                              <div key={idx} className="bg-white border border-zinc-150 p-2 rounded space-y-1">
                                <p className="font-bold text-zinc-800">⚠️ {item.criterion}</p>
                                <p className="text-zinc-650">{item.missingDetails}</p>
                                {item.recommendation && (
                                  <p className="text-indigo-600 font-semibold bg-indigo-50/50 p-1 rounded">Sugerencia: {item.recommendation}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-emerald-700 font-bold flex items-center gap-1 mt-1">
                            ✅ ¡Cumple todos los criterios evaluados!
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-lg p-6 text-center text-zinc-400 italic shadow-sm text-xs">
              Selecciona una sección para ver metadatos, evidencias y revisiones.
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-35 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 max-w-md w-full shadow-2xl text-left">
            <h3 className="text-base font-bold text-black mb-4 font-sans">Registrar Nueva Sección Académica</h3>
            <form onSubmit={handleAddSection} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Título del Capítulo / Subsección</label>
                <input
                  type="text"
                  required
                  value={secTitle}
                  onChange={e => setSecTitle(e.target.value)}
                  placeholder="Ej: Capítulo III. Diseño Arquitectónico"
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Nivel Jerárquico</label>
                  <select
                    value={secLevel}
                    onChange={e => setSecLevel(Number(e.target.value))}
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-2 text-xs text-black focus:outline-none focus:border-black"
                  >
                    <option value={1}>1 (Capítulo Principal)</option>
                    <option value={2}>2 (Subsección Nivel 2)</option>
                    <option value={3}>3 (Subsección Nivel 3)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Capítulo Padre</label>
                  <select
                    value={secParent}
                    onChange={e => setSecParent(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-2 text-xs text-black focus:outline-none focus:border-black"
                  >
                    <option value="">Ninguno</option>
                    {sections.filter(s => s.level === 1).map(s => (
                      <option key={s._id} value={s._id}>{s.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Plantilla de IA Correspondiente</label>
                <select
                  value={templateType}
                  onChange={e => setTemplateType(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-2 text-xs text-black focus:outline-none focus:border-black font-semibold"
                >
                  <option value="Introducción del Proyecto">Introducción y Contexto</option>
                  <option value="Planteamiento de Problema">Planteamiento de Problema</option>
                  <option value="Objetivos del Software">Objetivos (General y Específicos)</option>
                  <option value="Análisis de Requerimientos">Análisis de Requerimientos (RF/RN)</option>
                  <option value="Definición de Arquitectura Técnica">Arquitectura y Stack Técnico</option>
                  <option value="Metodología y Planificación">Metodología de Desarrollo</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-xs text-zinc-500 hover:text-black transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-black text-white hover:bg-zinc-800 text-xs font-bold px-4 py-2 rounded transition-colors"
                >
                  Crear Sección
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Commit Checkpoint Modal */}
      {showCommitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-35 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 max-w-md w-full shadow-2xl text-left">
            <h3 className="text-base font-bold text-black mb-1 font-sans flex items-center gap-1.5">
              <History className="w-5 h-5 text-indigo-600" /> Registrar Punto de Control (Commit)
            </h3>
            <p className="text-xs text-zinc-500 mb-4">Esta acción congelará el contenido actual en el historial de versiones para que puedas editar de forma segura.</p>
            <form onSubmit={handleCommitCheckpoint} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Descripción del Cambio / Mensaje de Commit</label>
                <input
                  type="text"
                  required
                  value={commitMsg}
                  onChange={e => setCommitMsg(e.target.value)}
                  placeholder="Ej: Agregado diagrama de arquitectura y justificación de MongoDB"
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCommitModal(false)}
                  className="px-3 py-2 text-xs text-zinc-500 hover:text-black transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-black text-white hover:bg-zinc-800 text-xs font-bold px-4 py-2 rounded transition-colors"
                >
                  Confirmar Commit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Citation Modal */}
      {showCitationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-35 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 max-w-md w-full shadow-2xl text-left">
            <h3 className="text-base font-bold text-black mb-4 font-sans flex items-center gap-1.5">
              <BookOpen className="w-5 h-5 text-indigo-600" /> Agregar Cita Bibliográfica (APA 7)
            </h3>
            <form onSubmit={handleAddCitation} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Tipo de Origen</label>
                <select
                  value={citeType}
                  onChange={e => setCiteType(e.target.value as any)}
                  className="w-full bg-white border border-zinc-200 rounded px-2 py-2 text-xs text-black focus:outline-none"
                >
                  <option value="ExternalPDF">Artículo Científico / PDF Externo</option>
                  <option value="InternalArtifact">Artefacto Interno ThesisFlow</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Etiqueta de Referencia (Citation Key)</label>
                <input
                  type="text"
                  value={citeKey}
                  onChange={e => setCiteKey(e.target.value)}
                  placeholder="Ej: [APA-1] (dejar en blanco para autogenerar)"
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-xs text-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Cita APA 7 Completa</label>
                <textarea
                  required
                  value={citeString}
                  onChange={e => setCiteString(e.target.value)}
                  placeholder="Ej: Vasquez, S., & Gomez, M. (2026). Arquitectura RAG en Ambientes de Tesis. Journal of Academic Software, 12(3), 45-56."
                  className="w-full bg-white border border-zinc-200 rounded p-2.5 text-xs text-zinc-800 h-20 resize-none focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCitationModal(false)}
                  className="px-3 py-2 text-xs text-zinc-500 hover:text-black transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-black text-white hover:bg-zinc-800 text-xs font-bold px-4 py-2 rounded transition-colors"
                >
                  Registrar Cita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Writer Panel (only visible if section is selected and editable) */}
      {selectedSection && !isLocked && (
        <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4 text-left">
          <div className="border-b border-zinc-150 pb-2 flex justify-between items-center">
            <span className="text-xs font-bold text-black flex items-center gap-1.5">
              <BrainCircuit className="w-4 h-4 text-indigo-600" /> Escritura Asistida con Contexto del Proyecto
            </span>
          </div>

          <form onSubmit={handleRunAIGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-3">
              <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Instrucciones de Redacción Académica</label>
              <input
                type="text"
                value={aiInstruction}
                onChange={e => setAiInstruction(e.target.value)}
                placeholder="Indica en qué enfocarse. Ej: 'Escribe en tercera persona formal. Explica la metodología Scrum aplicada a los 3 primeros sprints de tesis...'"
                className="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-400"
              />
            </div>
            
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={handleAutocomplete}
                disabled={autocompleteRunning}
                className="flex-1 flex items-center justify-center gap-1 bg-zinc-100 hover:bg-zinc-200 border border-zinc-350 text-zinc-700 disabled:opacity-50 text-[11px] font-bold py-2 rounded transition-colors"
              >
                <BrainCircuit className="w-3.5 h-3.5" /> Autocompletar
              </button>
              <button
                type="submit"
                disabled={aiRunning}
                className="flex-1 flex items-center justify-center gap-1 bg-black text-white hover:bg-zinc-800 disabled:opacity-50 text-[11px] font-bold py-2 rounded transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" /> {aiRunning ? 'Generando...' : 'Redactar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

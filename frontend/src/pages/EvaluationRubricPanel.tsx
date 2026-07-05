import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/AuthStore';
import { useProjectStore } from '../store/ProjectStore';
import { 
  Star, Award, Save, Plus, Trash2, BookOpen, Upload, Sparkles, Cpu,
  Eye, Check, FileText, Calendar, MessageSquare, List, Users, User, ArrowRight,
  TrendingUp, CheckCircle, ShieldAlert, AlertCircle, RefreshCw, Layers, Copy, Search
} from 'lucide-react';

interface RubricLevel {
  name: string;
  points: number;
  description?: string;
}

interface RubricCriterion {
  _id?: string;
  name: string;
  description: string;
  weight: number;
  dimension: string;
  levels?: RubricLevel[];
}

interface Rubric {
  _id: string;
  name: string;
  description: string;
  evaluationType: 'grupal' | 'individual' | 'mixta';
  criteria: RubricCriterion[];
  isActive: boolean;
  createdAt?: string;
}

interface EvidenceLink {
  entityType: 'Deliverable' | 'Meeting' | 'Task' | 'Comment' | 'Document' | 'Other';
  entityId: string;
  label: string;
}

interface Evaluation {
  _id: string;
  project: {
    _id: string;
    name: string;
  } | string;
  rubric: {
    _id: string;
    name: string;
    criteria: RubricCriterion[];
  } | string;
  rubricName: string;
  evaluator: {
    _id: string;
    name: string;
  } | string;
  evaluatorName: string;
  evaluationType: 'grupal' | 'individual' | 'mixta';
  targetType: 'Team' | 'Student';
  studentTarget?: string;
  studentTargetName?: string;
  grades: Array<{
    criterionId: string;
    criterionName: string;
    score: number;
    comment?: string;
  }>;
  generalFeedback?: string;
  evidenceLinks?: EvidenceLink[];
  status: 'Draft' | 'Published';
  totalScore: number;
  createdAt: string;
}

export const EvaluationRubricPanel: React.FC = () => {
  const { user, getAuthHeaders } = useAuthStore();
  const { projects, activeProject } = useProjectStore();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'templates'>('list');

  // Core Data
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Project Data (for evaluations creation)
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [projectDeliverables, setProjectDeliverables] = useState<any[]>([]);
  const [projectMeetings, setProjectMeetings] = useState<any[]>([]);
  
  // Selection States for Evaluation Creation
  const [evalProjectId, setEvalProjectId] = useState('');
  const [evalRubricId, setEvalRubricId] = useState('');
  const [evaluationType, setEvaluationType] = useState<'grupal' | 'individual' | 'mixta'>('grupal');
  const [targetType, setTargetType] = useState<'Team' | 'Student'>('Team');
  const [studentTargetId, setStudentTargetId] = useState('');
  
  // Scoring / Inputs
  const [criterionScores, setCriterionScores] = useState<Record<string, { score: number; comment: string }>>({});
  const [generalFeedback, setGeneralFeedback] = useState('');
  const [evalStatus, setEvalStatus] = useState<'Draft' | 'Published'>('Draft');
  
  // Linked Evidences
  const [selectedEvidences, setSelectedEvidences] = useState<EvidenceLink[]>([]);
  
  // Rubric Template Form State
  const [newRubricName, setNewRubricName] = useState('');
  const [newRubricDesc, setNewRubricDesc] = useState('');
  const [newRubricEvalType, setNewRubricEvalType] = useState<'grupal' | 'individual' | 'mixta'>('grupal');
  const [newCriteria, setNewCriteria] = useState<RubricCriterion[]>([]);
  
  // AI OCR Scanner State
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanPhase, setScanPhase] = useState(0);
  const [scanProgressText, setScanProgressText] = useState('');

  // Selected evaluation details modal
  const [viewEvaluation, setViewEvaluation] = useState<Evaluation | null>(null);

  const isAcademic = user?.role === 'Docente' || user?.role === 'Evaluador' || user?.role === 'Coordinador';
  const isCoordinator = user?.role === 'Coordinador' || user?.role === 'Admin';

  const API_URL = 'http://localhost:5000/api';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      // 1. Fetch rubrics
      const rRes = await fetch(`${API_URL}/evaluations/rubrics`, { headers });
      let rubData: Rubric[] = [];
      if (rRes.ok) {
        rubData = await rRes.json();
        setRubrics(rubData);
      }

      // 2. Fetch evaluations
      let evalUrl = '';
      if (isAcademic) {
        // Fetch all evaluations created by the evaluator, or project-specific
        evalUrl = activeProject 
          ? `${API_URL}/evaluations/projects/${activeProject._id}`
          : `${API_URL}/evaluations/evaluator`;
      } else if (activeProject) {
        evalUrl = `${API_URL}/evaluations/projects/${activeProject._id}`;
      }

      if (evalUrl) {
        const eRes = await fetch(evalUrl, { headers });
        if (eRes.ok) {
          const evalData = await eRes.json();
          setEvaluations(evalData);
        }
      }
    } catch (err) {
      console.error('Error fetching evaluations:', err);
    } finally {
      setLoading(false);
    }
  }, [activeProject, isAcademic, getAuthHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load project-specific assets (members, deliverables, meetings) when selected for evaluation
  useEffect(() => {
    if (!evalProjectId) {
      setProjectMembers([]);
      setProjectDeliverables([]);
      setProjectMeetings([]);
      return;
    }

    const loadProjectAssets = async () => {
      try {
        const headers = getAuthHeaders();
        
        // Fetch members
        const memRes = await fetch(`${API_URL}/projects/${evalProjectId}/members`, { headers });
        if (memRes.ok) {
          const mems = await memRes.json();
          setProjectMembers(mems);
          if (mems.length > 0) setStudentTargetId(mems[0].user?._id || '');
        }

        // Fetch deliverables
        const delRes = await fetch(`${API_URL}/deliverables/project/${evalProjectId}`, { headers });
        if (delRes.ok) {
          setProjectDeliverables(await delRes.json());
        }

        // Fetch meetings
        const meetRes = await fetch(`${API_URL}/meetings/project/${evalProjectId}`, { headers });
        if (meetRes.ok) {
          setProjectMeetings(await meetRes.json());
        }
      } catch (err) {
        console.error('Error loading project assets:', err);
      }
    };

    loadProjectAssets();
  }, [evalProjectId, getAuthHeaders]);

  // Sync evaluation type when rubric changes
  const handleRubricSelection = (rubricId: string) => {
    setEvalRubricId(rubricId);
    const selected = rubrics.find(r => r._id === rubricId);
    if (selected) {
      setEvaluationType(selected.evaluationType);
      setTargetType(selected.evaluationType === 'grupal' ? 'Team' : 'Student');
      
      // Initialize scores
      const initialScores: Record<string, { score: number; comment: string }> = {};
      selected.criteria.forEach(c => {
        initialScores[c.name] = { score: 3, comment: '' };
      });
      setCriterionScores(initialScores);
    }
  };

  // Qualitative scale mapping (1.0 to 5.0)
  const getQualitativeRating = (score: number) => {
    if (score < 2.0) return { label: 'Insuficiente', color: 'text-red-700 bg-red-50 border-red-200' };
    if (score < 3.0) return { label: 'Bajo el Estándar', color: 'text-orange-700 bg-orange-50 border-orange-200' };
    if (score < 4.0) return { label: 'Cumple Requisitos', color: 'text-zinc-700 bg-zinc-50 border-zinc-200' };
    if (score < 4.8) return { label: 'Destacado', color: 'text-zinc-950 bg-zinc-100 border-zinc-950' };
    return { label: 'Excelente / Cumbre', color: 'text-white bg-black border-black' };
  };

  // Calculate live weighted average
  const calculateLiveAverage = () => {
    const selectedRubric = rubrics.find(r => r._id === evalRubricId);
    if (!selectedRubric) return 0;

    let totalWeight = 0;
    let weightedSum = 0;

    selectedRubric.criteria.forEach(c => {
      const scoreObj = criterionScores[c.name] || { score: 3, comment: '' };
      weightedSum += scoreObj.score * c.weight;
      totalWeight += c.weight;
    });

    if (totalWeight === 0) return 0;
    return Math.round((weightedSum / totalWeight) * 100) / 100;
  };

  // Submit Evaluation
  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalProjectId) {
      alert('Por favor selecciona un proyecto a calificar.');
      return;
    }
    if (!evalRubricId) {
      alert('Por favor selecciona una rúbrica.');
      return;
    }

    const selectedStudent = projectMembers.find(m => m.user?._id === studentTargetId);

    const payload = {
      project: evalProjectId,
      rubric: evalRubricId,
      evaluationType,
      targetType,
      studentTarget: targetType === 'Student' ? studentTargetId : undefined,
      studentTargetName: targetType === 'Student' ? (selectedStudent?.user?.name || '') : '',
      grades: Object.entries(criterionScores).map(([name, scoreObj]) => ({
        criterionId: name,
        criterionName: name,
        score: scoreObj.score,
        comment: scoreObj.comment
      })),
      generalFeedback,
      evidenceLinks: selectedEvidences,
      status: evalStatus
    };

    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_URL}/evaluations`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Evaluación guardada exitosamente.');
        setGeneralFeedback('');
        setSelectedEvidences([]);
        setEvalProjectId('');
        setEvalRubricId('');
        setActiveTab('list');
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Error al guardar la evaluación.');
      }
    } catch (err) {
      console.error(err);
      alert('Error en la conexión con el servidor.');
    }
  };

  // Toggle evidence linking
  const toggleEvidence = (type: EvidenceLink['entityType'], id: string, label: string) => {
    const exists = selectedEvidences.find(e => e.entityId === id);
    if (exists) {
      setSelectedEvidences(selectedEvidences.filter(e => e.entityId !== id));
    } else {
      setSelectedEvidences([...selectedEvidences, { entityType: type, entityId: id, label }]);
    }
  };

  // Add criterion to new rubric creation form
  const addEmptyCriterion = () => {
    setNewCriteria([
      ...newCriteria,
      {
        name: `Criterio ${newCriteria.length + 1}`,
        description: '',
        weight: 1,
        dimension: 'General',
        levels: [
          { name: 'Insuficiente', points: 1, description: 'Desempeño deficiente o no logrado.' },
          { name: 'Aceptable', points: 3.5, description: 'Satisface los requisitos básicos.' },
          { name: 'Excelente', points: 5, description: 'Excede las expectativas académicas.' }
        ]
      }
    ]);
  };

  // Remove criterion from rubric creation form
  const removeCriterionIdx = (idx: number) => {
    setNewCriteria(newCriteria.filter((_, i) => i !== idx));
  };

  // Submit Rubric Template Creation
  const handleSaveRubricTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRubricName.trim()) {
      alert('La rúbrica requiere un nombre.');
      return;
    }
    if (newCriteria.length === 0) {
      alert('Debes agregar al menos un criterio de evaluación.');
      return;
    }

    const payload = {
      name: newRubricName,
      description: newRubricDesc,
      evaluationType: newRubricEvalType,
      criteria: newCriteria
    };

    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_URL}/evaluations/rubrics`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Plantilla de Rúbrica creada exitosamente.');
        setNewRubricName('');
        setNewRubricDesc('');
        setNewCriteria([]);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Error al guardar la rúbrica.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al guardar la rúbrica.');
    }
  };

  // Simulated AI OCR Scanner Animation & Parsing
  const handleScanRubric = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanFile(file);
    setScanning(true);
    setScanPhase(1);
    setScanProgressText('Detectando diseño estructural del documento...');

    setTimeout(() => {
      setScanPhase(2);
      setScanProgressText('Analizando dimensiones de evaluación académica (Metodología, Arquitectura, Trazabilidad)...');
    }, 1500);

    setTimeout(() => {
      setScanPhase(3);
      setScanProgressText('Identificando criterios de desempeño, descripciones y pesos...');
    }, 3000);

    setTimeout(() => {
      setScanPhase(4);
      setScanProgressText('Reconstruyendo estructura editable de rúbrica ThesisFlow...');
    }, 4500);

    setTimeout(() => {
      setScanning(false);
      setNewRubricName(`Rúbrica Importada - ${file.name.replace(/\.[^/.]+$/, "")}`);
      setNewRubricDesc('Documento procesado inteligente para evaluación de tesis.');
      setNewRubricEvalType('mixta');
      setNewCriteria([
        {
          name: 'Calidad del Diseño y Arquitectura',
          description: 'Solidez de las decisiones de diseño técnico y registro de ADRs en la solución.',
          weight: 1.5,
          dimension: 'Arquitectura',
          levels: [
            { name: 'Insuficiente', points: 1, description: 'Falta justificación técnica en las decisiones.' },
            { name: 'Aceptable', points: 3.5, description: 'Diseño coherente con ADRs básicos registrados.' },
            { name: 'Excelente', points: 5, description: 'Arquitectura óptima, modular y completamente trazada.' }
          ]
        },
        {
          name: 'Trazabilidad de Requerimientos',
          description: 'Nivel de mapeo verificado entre requerimientos funcionales, tareas de desarrollo y código.',
          weight: 1.5,
          dimension: 'Trazabilidad',
          levels: [
            { name: 'Insuficiente', points: 1, description: 'Requerimientos huérfanos o sin verificación clara.' },
            { name: 'Aceptable', points: 3.5, description: 'Trazabilidad documentada para la mayoría de hitos.' },
            { name: 'Excelente', points: 5, description: 'Trazabilidad perfecta en todo el ciclo de desarrollo.' }
          ]
        },
        {
          name: 'Implementación del Marco Metodológico',
          description: 'Evidencia práctica de planificación ágil, compromisos de sprints y roles operativos.',
          weight: 1.0,
          dimension: 'Metodología',
          levels: [
            { name: 'Insuficiente', points: 1, description: 'Ausencia de planificación de sprints o roles difusos.' },
            { name: 'Aceptable', points: 3.5, description: 'Uso de sprints y reuniones documentadas periódicamente.' },
            { name: 'Excelente', points: 5, description: 'Roles claros, sprints eficientes y métricas de avance óptimas.' }
          ]
        }
      ]);
      setScanFile(null);
    }, 6000);
  };

  const activeAvg = calculateLiveAverage();
  const activeQual = getQualitativeRating(activeAvg);

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in pb-16">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950 text-white p-8 rounded-2xl shadow-xl">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight">Rúbricas y Sistema de Evaluación</h1>
          <p className="text-zinc-400 text-sm max-w-xl">
            Herramienta formal para la gestión de pautas académicas. Evalúa proyectos de forma grupal, individual o mixta vinculando evidencias y trazabilidad.
          </p>
        </div>
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 shrink-0">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'list' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" /> Evaluaciones
          </button>
          
          {isAcademic && (
            <button
              onClick={() => {
                setActiveTab('create');
                if (activeProject) setEvalProjectId(activeProject._id);
              }}
              className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'create' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Nueva Evaluación
            </button>
          )}

          {isAcademic && (
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'templates' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Plantillas
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <div className="w-8 h-8 border-3 border-zinc-950 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-mono text-zinc-500">Cargando módulo de rúbricas...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: EVALUATIONS LIST */}
          {activeTab === 'list' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-extrabold text-zinc-950 flex items-center gap-2">
                  <Award className="w-5 h-5 text-zinc-650" />
                  <span>Historial de Evaluaciones Registradas</span>
                </h2>
              </div>

              {evaluations.length === 0 ? (
                <div className="text-center py-16 bg-white border border-zinc-200 rounded-xl shadow-xs">
                  <Star className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-zinc-900">No hay evaluaciones registradas</p>
                  <p className="text-xs text-zinc-500 mt-1">Aún no se han registrado o publicado evaluaciones para este proyecto.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {evaluations.map((ev) => {
                    const qual = getQualitativeRating(ev.totalScore);
                    const isDraft = ev.status === 'Draft';
                    
                    return (
                      <div 
                        key={ev._id} 
                        className={`bg-white border rounded-xl p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                          isDraft ? 'border-dashed border-amber-300' : 'border-zinc-200'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wide block">
                                Rúbrica Aplicada
                              </span>
                              <h3 className="font-extrabold text-zinc-900 text-base">{ev.rubricName}</h3>
                              <p className="text-[10px] text-zinc-500 font-mono mt-1">
                                Evaluado por: <span className="font-semibold text-black">{ev.evaluatorName}</span>
                              </p>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1.5">
                              <span className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                isDraft ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-zinc-100 text-zinc-800'
                              }`}>
                                {isDraft ? 'Borrador' : 'Publicada'}
                              </span>
                              <span className="text-[9px] font-mono bg-zinc-50 text-zinc-650 px-1.5 py-0.5 rounded uppercase font-semibold">
                                {ev.evaluationType}
                              </span>
                            </div>
                          </div>

                          {/* Evaluation Target (Team vs Student) */}
                          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-150 p-2.5 rounded-lg text-xs mb-4">
                            {ev.targetType === 'Team' ? (
                              <>
                                <Users className="w-4 h-4 text-zinc-500" />
                                <span className="text-zinc-600 font-medium">Evaluación Grupal: Toda la Comisión</span>
                              </>
                            ) : (
                              <>
                                <User className="w-4 h-4 text-zinc-500" />
                                <span className="text-zinc-600 font-medium">
                                  Evaluación Individual: <span className="font-bold text-black">{ev.studentTargetName || 'Integrante'}</span>
                                </span>
                              </>
                            )}
                          </div>

                          {/* Grade Summary Box */}
                          <div className="flex items-center justify-between bg-zinc-950 text-white rounded-lg p-3.5 mb-4">
                            <div>
                              <span className="text-[9px] font-mono text-zinc-400 uppercase block">Promedio Final</span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black font-mono">{ev.totalScore.toFixed(2)}</span>
                                <span className="text-xs text-zinc-500">/ 5.0</span>
                              </div>
                            </div>
                            <div className={`px-2.5 py-1 rounded text-xs font-bold font-mono border ${qual.color}`}>
                              {qual.label}
                            </div>
                          </div>

                          {/* Evidence Count */}
                          {ev.evidenceLinks && ev.evidenceLinks.length > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono mb-4">
                              <Layers className="w-3.5 h-3.5" />
                              <span>{ev.evidenceLinks.length} evidencias vinculadas</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t border-zinc-150 flex justify-end">
                          <button
                            onClick={() => setViewEvaluation(ev)}
                            className="flex items-center gap-1 text-xs font-bold text-zinc-955 hover:bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver Detalle Rúbrica
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE EVALUATION FORM */}
          {activeTab === 'create' && (
            <form onSubmit={handleSaveEvaluation} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Form Inputs left column */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Meta Configuration Card */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold text-zinc-950 uppercase tracking-wider border-b border-zinc-150 pb-2">
                    Configuración de Instancia Evaluativa
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Proyecto a Calificar</label>
                      <select
                        required
                        value={evalProjectId}
                        onChange={e => setEvalProjectId(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-zinc-950"
                      >
                        <option value="">Selecciona un proyecto...</option>
                        {projects.map(p => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Seleccionar Rúbrica</label>
                      <select
                        required
                        value={evalRubricId}
                        onChange={e => handleRubricSelection(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-zinc-950"
                      >
                        <option value="">Selecciona una rúbrica...</option>
                        {rubrics.map(r => (
                          <option key={r._id} value={r._id}>{r.name} ({r.evaluationType})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {evalRubricId && (
                    <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-4 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Modo de Evaluación (Rúbrica)</label>
                          <span className="text-sm font-bold text-zinc-800 capitalize block mt-1.5">{evaluationType}</span>
                        </div>

                        <div>
                          <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Destinatario</label>
                          <select
                            value={targetType}
                            onChange={e => setTargetType(e.target.value as any)}
                            className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-xs text-black focus:outline-none"
                          >
                            <option value="Team">Todo el Equipo (Nota Grupal)</option>
                            <option value="Student">Integrante Específico (Nota Individual)</option>
                          </select>
                        </div>
                      </div>

                      {targetType === 'Student' && (
                        <div className="animate-fade-in border-t border-zinc-200 pt-3">
                          <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Seleccionar Integrante</label>
                          <select
                            value={studentTargetId}
                            onChange={e => setStudentTargetId(e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-xs text-black focus:outline-none focus:border-zinc-950"
                          >
                            {projectMembers.map(m => (
                              <option key={m._id} value={m.user?._id}>
                                {m.user?.name} ({m.operationalRole})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Scorecard Criterias */}
                {evalRubricId ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-extrabold text-zinc-950 uppercase tracking-wider block mt-8">
                      Criterios evaluativos
                    </h3>

                    {rubrics.find(r => r._id === evalRubricId)?.criteria.map((c, idx) => {
                      const activeScoreObj = criterionScores[c.name] || { score: 3, comment: '' };
                      
                      return (
                        <div key={idx} className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-4">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <span className="text-[9px] font-mono text-zinc-400 bg-zinc-155 px-1.5 py-0.5 rounded uppercase font-semibold">
                                {c.dimension}
                              </span>
                              <h4 className="font-bold text-zinc-950 text-sm mt-1">{c.name}</h4>
                              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{c.description}</p>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-700 bg-zinc-50 border border-zinc-150 px-2 py-0.5 rounded font-bold whitespace-nowrap">
                              Peso: {c.weight}
                            </span>
                          </div>

                          {/* Score options */}
                          <div className="flex flex-wrap gap-2 items-center">
                            {[1.0, 2.0, 3.0, 3.5, 4.0, 4.5, 5.0].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => {
                                  setCriterionScores({
                                    ...criterionScores,
                                    [c.name]: { ...activeScoreObj, score: num }
                                  });
                                }}
                                className={`px-3 py-1.5 rounded font-mono text-xs font-bold border transition-all ${
                                  activeScoreObj.score === num
                                    ? 'bg-black text-white border-black shadow-xs scale-105'
                                    : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                                }`}
                              >
                                {num.toFixed(1)}
                              </button>
                            ))}

                            {/* Qualitative tag helper */}
                            <span className="text-[10px] text-zinc-400 italic ml-2">
                              ({activeScoreObj.score <= 2.0 ? 'Insuficiente' : activeScoreObj.score <= 3.5 ? 'Satisface' : 'Excelente'})
                            </span>
                          </div>

                          {/* Criterion Comment */}
                          <input
                            type="text"
                            placeholder="Observaciones de este criterio..."
                            value={activeScoreObj.comment}
                            onChange={e => {
                              setCriterionScores({
                                ...criterionScores,
                                [c.name]: { ...activeScoreObj, comment: e.target.value }
                              });
                            }}
                            className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-xs text-black placeholder-zinc-300 focus:outline-none focus:border-zinc-950"
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white border border-zinc-200 rounded-2xl">
                    <BookOpen className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    <span className="text-xs text-zinc-500">Selecciona una rúbrica en la parte superior para desplegar la pauta de evaluación.</span>
                  </div>
                )}
              </div>

              {/* Sidebar column (linking evidence, previewing results, actions) */}
              <div className="space-y-6">
                
                {/* Scoring Estimator Card */}
                {evalRubricId && (
                  <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-4">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wide block">
                      Promedio Estimado
                    </span>
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black font-mono text-zinc-950">{activeAvg.toFixed(2)}</span>
                        <span className="text-sm text-zinc-400">/ 5.0</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase border ${activeQual.color}`}>
                        {activeQual.label}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Comentarios Generales</label>
                      <textarea
                        required
                        value={generalFeedback}
                        onChange={e => setGeneralFeedback(e.target.value)}
                        placeholder="Observaciones consolidadas del docente..."
                        className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-xs text-black h-24 focus:outline-none focus:border-zinc-950"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Publicación</label>
                      <select
                        value={evalStatus}
                        onChange={e => setEvalStatus(e.target.value as any)}
                        className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-xs text-black focus:outline-none"
                      >
                        <option value="Draft">Draft (Borrador Interno)</option>
                        <option value="Published">Published (Publicado Estudiante)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-black hover:bg-zinc-800 text-white font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-4 h-4" /> Guardar Evaluación
                    </button>
                  </div>
                )}

                {/* Evidence Linking Card */}
                {evalProjectId && (
                  <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-4">
                    <div>
                      <h4 className="text-xs font-mono text-zinc-450 uppercase font-bold">Vincular Evidencia Académica</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Asocia hitos, minutas o entregables a esta evaluación.</p>
                    </div>

                    {/* Deliverables List */}
                    <div className="space-y-2 max-h-40 overflow-y-auto border-t border-zinc-100 pt-3">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold block">Entregables del Proyecto</span>
                      {projectDeliverables.length === 0 ? (
                        <span className="text-[10px] text-zinc-400 italic block">No hay entregables.</span>
                      ) : (
                        projectDeliverables.map(d => (
                          <label key={d._id} className="flex items-center gap-2 text-xs text-zinc-650 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!selectedEvidences.find(e => e.entityId === d._id)}
                              onChange={() => toggleEvidence('Deliverable', d._id, `Entregable: ${d.name}`)}
                              className="w-3.5 h-3.5 rounded border-zinc-350 text-black focus:ring-black"
                            />
                            <span className="truncate">{d.name} ({d.status})</span>
                          </label>
                        ))
                      )}
                    </div>

                    {/* Meetings List */}
                    <div className="space-y-2 max-h-40 overflow-y-auto border-t border-zinc-100 pt-3">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold block">Minutas & Reuniones</span>
                      {projectMeetings.length === 0 ? (
                        <span className="text-[10px] text-zinc-400 italic block">No hay reuniones.</span>
                      ) : (
                        projectMeetings.map(m => (
                          <label key={m._id} className="flex items-center gap-2 text-xs text-zinc-650 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!selectedEvidences.find(e => e.entityId === m._id)}
                              onChange={() => toggleEvidence('Meeting', m._id, `Reunión: ${m.title}`)}
                              className="w-3.5 h-3.5 rounded border-zinc-350 text-black focus:ring-black"
                            />
                            <span className="truncate">{m.title} ({new Date(m.date).toLocaleDateString()})</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </form>
          )}

          {/* TAB 3: RUBRIC TEMPLATES MANAGER */}
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Rubric Creator / Editor */}
              <div className="lg:col-span-2 space-y-6">
                <form onSubmit={handleSaveRubricTemplate} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6">
                  <h3 className="text-sm font-extrabold text-zinc-950 uppercase tracking-wider border-b border-zinc-150 pb-2">
                    Crear Plantilla de Rúbrica
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Nombre de la Rúbrica</label>
                      <input
                        type="text"
                        required
                        value={newRubricName}
                        onChange={e => setNewRubricName(e.target.value)}
                        placeholder="Ej: Rúbrica de Hito de Tesis"
                        className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black placeholder-zinc-300 focus:outline-none focus:border-zinc-950"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Configuración del tipo de evaluación</label>
                      <select
                        value={newRubricEvalType}
                        onChange={e => setNewRubricEvalType(e.target.value as any)}
                        className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none"
                      >
                        <option value="grupal">Grupal (Toda la Comisión)</option>
                        <option value="individual">Individual (Miembros por Separado)</option>
                        <option value="mixta">Mixta (Componente Grupal e Individual)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Descripción General</label>
                    <textarea
                      value={newRubricDesc}
                      onChange={e => setNewRubricDesc(e.target.value)}
                      placeholder="Propósito evaluativo de esta pauta..."
                      className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-xs text-black h-16 focus:outline-none focus:border-zinc-950"
                    />
                  </div>

                  {/* Criteria Items List */}
                  <div className="space-y-4 border-t border-zinc-100 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-zinc-800">Criterios Evaluativos ({newCriteria.length})</span>
                      <button
                        type="button"
                        onClick={addEmptyCriterion}
                        className="flex items-center gap-1 text-[10px] font-mono font-bold bg-zinc-950 hover:bg-zinc-800 text-white px-2.5 py-1.5 rounded transition-all"
                      >
                        <Plus className="w-3 h-3" /> Agregar Criterio
                      </button>
                    </div>

                    {newCriteria.map((crit, idx) => (
                      <div key={idx} className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3 relative group">
                        
                        <button
                          type="button"
                          onClick={() => removeCriterionIdx(idx)}
                          className="absolute right-4 top-4 text-zinc-300 hover:text-red-650 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-[9px] font-mono text-zinc-450 uppercase mb-0.5">Nombre del Criterio</label>
                            <input
                              type="text"
                              required
                              value={crit.name}
                              onChange={e => {
                                const copy = [...newCriteria];
                                copy[idx].name = e.target.value;
                                setNewCriteria(copy);
                              }}
                              placeholder="Ej: Calidad de Redacción"
                              className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-black focus:outline-none focus:border-zinc-950"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-mono text-zinc-455 uppercase mb-0.5">Dimensión (Categoría)</label>
                            <input
                              type="text"
                              required
                              value={crit.dimension}
                              onChange={e => {
                                const copy = [...newCriteria];
                                copy[idx].dimension = e.target.value;
                                setNewCriteria(copy);
                              }}
                              placeholder="Ej: Arquitectura"
                              className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-black focus:outline-none focus:border-zinc-950"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="md:col-span-3">
                            <label className="block text-[9px] font-mono text-zinc-450 uppercase mb-0.5">Descripción del Criterio</label>
                            <input
                              type="text"
                              required
                              value={crit.description}
                              onChange={e => {
                                const copy = [...newCriteria];
                                copy[idx].description = e.target.value;
                                setNewCriteria(copy);
                              }}
                              placeholder="Detalles sobre qué se califica..."
                              className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-black focus:outline-none focus:border-zinc-950"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-mono text-zinc-450 uppercase mb-0.5">Ponderación (Peso)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0.1"
                              required
                              value={crit.weight}
                              onChange={e => {
                                const copy = [...newCriteria];
                                copy[idx].weight = parseFloat(e.target.value) || 1;
                                setNewCriteria(copy);
                              }}
                              className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-black focus:outline-none focus:border-zinc-950"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-zinc-950 hover:bg-zinc-800 text-white font-bold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-4 h-4" /> Registrar Plantilla
                  </button>
                </form>
              </div>

              {/* Sidebar with AI OCR Rubric Importer */}
              <div className="space-y-6">
                
                {/* AI Scanner Card */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 bg-zinc-50 border-l border-b border-zinc-150 rounded-bl-xl">
                    <Sparkles className="w-4 h-4 text-zinc-650" />
                  </div>
                  
                  <div>
                    <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-wider block font-bold">Importador de Rúbricas</h3>
                    <p className="text-[10px] text-zinc-500 mt-1">Sube un PNG, JPG, PDF o screenshot de la pauta docente para estructurarla automáticamente.</p>
                  </div>

                  {scanning ? (
                    <div className="border border-zinc-200 bg-zinc-50 p-6 rounded-xl space-y-4 text-center animate-pulse">
                      <div className="relative w-12 h-12 mx-auto">
                        <Cpu className="w-12 h-12 text-zinc-650" />
                        <div className="absolute inset-0 border-t-2 border-zinc-950 rounded-full animate-spin"></div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-zinc-450 uppercase font-bold block">Leyendo pauta...</span>
                        <p className="text-xs font-medium text-zinc-800 leading-relaxed">{scanProgressText}</p>
                      </div>
                      
                      {/* Simulated Scanning Line */}
                      <div className="w-full bg-zinc-200 h-1 rounded-full overflow-hidden relative mt-4">
                        <div 
                          className="bg-black h-full absolute transition-all duration-300"
                          style={{ width: `${scanPhase * 25}%` }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-zinc-250 hover:border-black rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-zinc-50/50 hover:bg-zinc-50">
                      <Upload className="w-8 h-8 text-zinc-450 mb-2.5" />
                      <span className="text-xs font-bold text-zinc-800 block">Subir Archivo de Rúbrica</span>
                      <span className="text-[10px] text-zinc-500 block mt-0.5">Formatos soportados: PDF, PNG, JPG</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleScanRubric}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Templates List */}
                <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-4">
                  <span className="text-xs font-bold text-zinc-900 font-sans block">Plantillas Oficiales</span>
                  <div className="space-y-3">
                    {rubrics.map(rub => (
                      <div key={rub._id} className="p-3 bg-zinc-50 border border-zinc-150 rounded-lg flex items-center justify-between text-xs hover:bg-zinc-100 transition-colors">
                        <div>
                          <span className="font-bold text-zinc-900 block">{rub.name}</span>
                          <span className="text-[9px] font-mono text-zinc-500 capitalize block mt-0.5">Modo: {rub.evaluationType} · {rub.criteria.length} Criterios</span>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setNewRubricName(rub.name);
                              setNewRubricDesc(rub.description || '');
                              setNewRubricEvalType(rub.evaluationType);
                              setNewCriteria(rub.criteria);
                            }}
                            className="text-[9px] font-mono font-bold bg-white border border-zinc-250 hover:bg-zinc-50 text-zinc-800 px-2 py-1 rounded transition-colors"
                          >
                            Clonar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          </>
      )}

      {/* DETAIL MODAL: VIEW SPECIFIC EVALUATION */}
      {viewEvaluation && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-white border border-zinc-200 rounded-2xl p-8 max-w-2xl w-full shadow-2xl space-y-6 my-8">
            
            <div className="flex justify-between items-start border-b border-zinc-100 pb-4">
              <div>
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block font-bold">
                  Detalles de la Evaluación
                </span>
                <h3 className="text-xl font-extrabold text-zinc-950 mt-1">{viewEvaluation.rubricName}</h3>
                <p className="text-xs text-zinc-500 font-mono mt-1">
                  Evaluador: <span className="font-semibold text-black">{viewEvaluation.evaluatorName}</span> · 
                  Fecha: {new Date(viewEvaluation.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setViewEvaluation(null)}
                className="text-xs font-mono font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>

            {/* Target & Score box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex flex-col justify-center">
                <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold block">
                  Sujeto Evaluado
                </span>
                <span className="text-sm font-bold text-zinc-900 block mt-1.5">
                  {viewEvaluation.targetType === 'Team' ? 'Toda la Comisión (Grupal)' : viewEvaluation.studentTargetName}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 mt-1 block capitalize">
                  Tipo: {viewEvaluation.evaluationType}
                </span>
              </div>

              <div className="bg-zinc-950 text-white rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono text-zinc-400 uppercase block">Nota Promedio</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black font-mono">{viewEvaluation.totalScore.toFixed(2)}</span>
                    <span className="text-xs text-zinc-450">/ 5.0</span>
                  </div>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase font-mono border ${getQualitativeRating(viewEvaluation.totalScore).color}`}>
                  {getQualitativeRating(viewEvaluation.totalScore).label}
                </div>
              </div>
            </div>

            {/* Criterios list */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-zinc-900 block border-b border-zinc-100 pb-1">Criterios Evaluados</span>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {viewEvaluation.grades.map((gr, idx) => (
                  <div key={idx} className="p-4 bg-zinc-50 border border-zinc-150 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs text-zinc-900">{gr.criterionName}</span>
                      <span className="font-mono text-xs font-extrabold text-black bg-white border border-zinc-250 px-2 py-0.5 rounded">
                        {gr.score.toFixed(1)}
                      </span>
                    </div>
                    {gr.comment && (
                      <p className="text-[10px] text-zinc-500 italic">"{gr.comment}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* General comments */}
            {viewEvaluation.generalFeedback && (
              <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-4 space-y-1 text-xs">
                <span className="font-bold text-zinc-900 block">Comentarios Generales del Docente:</span>
                <p className="text-zinc-650 leading-relaxed font-sans">{viewEvaluation.generalFeedback}</p>
              </div>
            )}

            {/* Linked Evidences */}
            {viewEvaluation.evidenceLinks && viewEvaluation.evidenceLinks.length > 0 && (
              <div className="space-y-2 border-t border-zinc-100 pt-4">
                <span className="text-xs font-bold text-zinc-900 block">Evidencias Vinculadas</span>
                <div className="flex flex-wrap gap-2">
                  {viewEvaluation.evidenceLinks.map((evL, eIdx) => (
                    <span 
                      key={eIdx} 
                      className="inline-flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded px-2.5 py-1 text-[10px] font-mono text-zinc-600"
                    >
                      <Layers className="w-3 h-3 text-zinc-450" />
                      {evL.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default EvaluationRubricPanel;

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/AuthStore';
import { useProjectStore } from '../store/ProjectStore';
import { 
  FileText, Plus, Send, Edit3, MessageSquare, 
  X, Trash2
} from 'lucide-react';

interface Proposal {
  _id: string;
  student: any;
  studentName: string;
  title: string;
  problem: string;
  justification: string;
  generalObjective: string;
  specificObjectives: string[];
  contextInstitutional: string;
  scope: string;
  risks: string[];
  tentativeStack: string[];
  assignedAdvisor: any;
  assignedAdvisorName: string;
  status: 'Draft' | 'Submitted' | 'InReview' | 'Approved' | 'ChangesRequested' | 'Rejected';
  feedback?: string;
  submittedAt?: string;
  reviewedAt?: string;
  project?: any;
}

export const ProposalManagement: React.FC = () => {
  const { user, getAuthHeaders } = useAuthStore();
  const { fetchProjects } = useProjectStore();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [justification, setJustification] = useState('');
  const [generalObjective, setGeneralObjective] = useState('');
  const [specificObjectives, setSpecificObjectives] = useState<string[]>(['']);
  const [contextInstitutional, setContextInstitutional] = useState('');
  const [scope, setScope] = useState('');
  const [risks, setRisks] = useState<string[]>(['']);
  const [tentativeStack, setTentativeStack] = useState<string[]>(['']);
  const [assignedAdvisorId, setAssignedAdvisorId] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editProposalId, setEditProposalId] = useState('');

  // Expanded proposals tracking
  const [expandedProposalIds, setExpandedProposalIds] = useState<Record<string, boolean>>({});

  // Review states & section feedback
  const [reviewStatus, setReviewStatus] = useState<'Approved' | 'ChangesRequested' | 'Rejected'>('Approved');
  const [problemFeedback, setProblemFeedback] = useState('');
  const [justificationFeedback, setJustificationFeedback] = useState('');
  const [objectivesFeedback, setObjectivesFeedback] = useState('');
  const [risksStackFeedback, setRisksStackFeedback] = useState('');
  const [generalFeedback, setGeneralFeedback] = useState('');

  const parseFeedback = (feedbackStr?: string) => {
    if (!feedbackStr) return null;
    try {
      if (feedbackStr.trim().startsWith('{')) {
        return JSON.parse(feedbackStr);
      }
    } catch (e) {
      console.error('Error parsing feedback JSON:', e);
    }
    return { general: feedbackStr };
  };

  const toggleExpand = (id: string) => {
    setExpandedProposalIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const isAcademic = user?.role === 'Docente' || user?.role === 'Evaluador' || user?.role === 'Coordinador';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const API_URL = 'http://localhost:5000/api';

      // 1. Fetch proposals
      let proposalUrl = `${API_URL}/proposals/student`;
      if (isAcademic) {
        proposalUrl = `${API_URL}/proposals/advisor`;
      }
      const pRes = await fetch(proposalUrl, { headers });
      if (pRes.ok) {
        const data = await pRes.json();
        setProposals(data);
      }

      // 2. Fetch users to find advisors (role === 'Docente')
      const uRes = await fetch(`${API_URL}/auth/users`, { headers });
      if (uRes.ok) {
        const users = await uRes.json();
        const docs = users.filter((u: any) => u.role === 'Docente');
        setAdvisors(docs);
      }
    } catch (err) {
      console.error('Error fetching proposals data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = getAuthHeaders();
      const API_URL = 'http://localhost:5000/api';
      
      const payload = {
        title,
        problem,
        justification,
        generalObjective,
        specificObjectives: specificObjectives.filter(o => o.trim() !== ''),
        contextInstitutional,
        scope,
        risks: risks.filter(r => r.trim() !== ''),
        tentativeStack: tentativeStack.filter(s => s.trim() !== ''),
        assignedAdvisorId
      };

      let res;
      if (editMode) {
        res = await fetch(`${API_URL}/proposals/${editProposalId}`, {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_URL}/proposals`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setShowCreateModal(false);
        resetForm();
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Error al guardar propuesta');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setTitle('');
    setProblem('');
    setJustification('');
    setGeneralObjective('');
    setSpecificObjectives(['']);
    setContextInstitutional('');
    setScope('');
    setRisks(['']);
    setTentativeStack(['']);
    setAssignedAdvisorId('');
    setEditMode(false);
    setEditProposalId('');
  };

  const handleEdit = (p: Proposal) => {
    setEditMode(true);
    setEditProposalId(p._id);
    setTitle(p.title);
    setProblem(p.problem);
    setJustification(p.justification);
    setGeneralObjective(p.generalObjective);
    setSpecificObjectives(p.specificObjectives.length > 0 ? p.specificObjectives : ['']);
    setContextInstitutional(p.contextInstitutional || '');
    setScope(p.scope || '');
    setRisks(p.risks.length > 0 ? p.risks : ['']);
    setTentativeStack(p.tentativeStack.length > 0 ? p.tentativeStack : ['']);
    setAssignedAdvisorId(p.assignedAdvisor?._id || p.assignedAdvisor || '');
    setShowCreateModal(true);
  };

  const handleSubmitProposal = async (id: string) => {
    if (!window.confirm('¿Estás seguro de enviar esta propuesta para revisión? No podrás editarla mientras se evalúa.')) return;
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:5000/api/proposals/${id}/submit`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        await fetchData();
        alert('Propuesta enviada con éxito.');
      } else {
        const err = await res.json();
        alert(err.message || 'Error al enviar propuesta');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenReview = (p: Proposal) => {
    setSelectedProposal(p);
    setReviewStatus('Approved');
    const parsed = parseFeedback(p.feedback);
    setProblemFeedback(parsed?.problem || '');
    setJustificationFeedback(parsed?.justification || '');
    setObjectivesFeedback(parsed?.objectives || '');
    setRisksStackFeedback(parsed?.risksStack || '');
    setGeneralFeedback(parsed?.general || '');
    setShowReviewModal(true);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProposal) return;
    try {
      const combinedFeedback = JSON.stringify({
        problem: problemFeedback,
        justification: justificationFeedback,
        objectives: objectivesFeedback,
        risksStack: risksStackFeedback,
        general: generalFeedback
      });

      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:5000/api/proposals/${selectedProposal._id}/review`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reviewStatus,
          feedback: combinedFeedback
        })
      });

      if (res.ok) {
        setShowReviewModal(false);
        setSelectedProposal(null);
        await fetchData();
        // If approved, refresh projects in store
        if (reviewStatus === 'Approved') {
          await fetchProjects();
          alert('Propuesta aprobada con éxito. Se ha creado el proyecto y asignado el equipo de trabajo.');
        } else {
          alert('Revisión registrada con éxito.');
        }
      } else {
        const err = await res.json();
        alert(err.message || 'Error al registrar la revisión');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: Proposal['status']) => {
    const styles = {
      Draft: 'bg-zinc-100 text-zinc-800 border-zinc-200',
      Submitted: 'bg-amber-50 text-amber-700 border-amber-200',
      InReview: 'bg-blue-50 text-blue-700 border-blue-200',
      Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      ChangesRequested: 'bg-orange-50 text-orange-700 border-orange-200',
      Rejected: 'bg-red-50 text-red-700 border-red-200'
    };

    const labels = {
      Draft: 'Borrador',
      Submitted: 'Presentada',
      InReview: 'En Revisión',
      Approved: 'Aprobada',
      ChangesRequested: 'Requiere Ajustes',
      Rejected: 'Rechazada'
    };

    return (
      <span className={`px-2.5 py-0.5 border text-xs font-bold rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight">Propuestas de Proyecto de Título</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isAcademic 
              ? 'Revisa y evalúa las propuestas iniciales de temas de tesis enviadas por los estudiantes.' 
              : 'Registra, edita y realiza seguimiento al ciclo de aprobación formal de tu tema de tesis.'}
          </p>
        </div>
        {!isAcademic && (
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 bg-black hover:bg-zinc-800 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Crear Propuesta
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[250px]">
          <div className="w-8 h-8 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-16 bg-white border border-zinc-200 rounded-xl">
          <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-black mb-1">Sin propuestas</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            {isAcademic 
              ? 'No hay propuestas de tesis pendientes de revisión asignadas a tu cuenta.' 
              : 'Aún no has registrado ninguna propuesta de tema de tesis. Haz clic en "Crear Propuesta" para iniciar.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {proposals.map((p) => (
            <div key={p._id} className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-extrabold text-lg text-zinc-900 break-words">{p.title}</h3>
                    {getStatusBadge(p.status)}
                    <button
                      onClick={() => toggleExpand(p._id)}
                      className="text-xs text-zinc-500 hover:text-black font-semibold underline underline-offset-2 ml-2 transition-colors"
                    >
                      {expandedProposalIds[p._id] ? 'Contraer Detalles' : 'Ver Detalles Completos'}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 font-mono">
                    Estudiante: <span className="font-semibold text-black">{p.studentName || p.student?.name}</span> · 
                    Docente Guía: <span className="font-semibold text-black">{p.assignedAdvisorName || p.assignedAdvisor?.name || 'No asignado'}</span>
                  </p>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                  {!isAcademic && p.status === 'Draft' && (
                    <>
                      <button
                        onClick={() => handleEdit(p)}
                        className="p-2 border border-zinc-250 hover:bg-zinc-50 text-zinc-600 rounded transition-colors"
                        title="Editar borrador"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleSubmitProposal(p._id)}
                        className="flex items-center gap-1.5 bg-black hover:bg-zinc-800 text-white text-xs font-bold px-3 py-2 rounded transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" /> Presentar
                      </button>
                    </>
                  )}

                  {isAcademic && p.status === 'Submitted' && (
                    <button
                      onClick={() => handleOpenReview(p)}
                      className="bg-black hover:bg-zinc-800 text-white text-xs font-bold px-4 py-2 rounded transition-colors"
                    >
                      Evaluar Propuesta
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsible info summary - Expanded or compact */}
              {expandedProposalIds[p._id] ? (
                <div className="border-t border-zinc-100 pt-4 space-y-6 text-sm">
                  {/* Row 1: Context and Stack */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase block">Contexto Institucional / Empresa</span>
                      <p className="text-zinc-850 font-bold text-xs">{p.contextInstitutional || 'No especificado (Tesis Libre)'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase block">Stack Tecnológico Tentativo</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {p.tentativeStack && p.tentativeStack.length > 0 && p.tentativeStack[0] !== '' ? (
                          p.tentativeStack.map((s, idx) => (
                            <span key={idx} className="bg-zinc-100 text-zinc-800 border border-zinc-200 px-2 py-0.5 rounded text-xs font-mono">
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-400 text-xs italic">No definido</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Problem and Justification */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-zinc-50 pt-4">
                    <div className="space-y-2 min-w-0">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase block font-semibold">Problema a resolver</span>
                      <p className="text-zinc-600 leading-relaxed break-words whitespace-pre-line text-xs">{p.problem}</p>
                      
                      {/* Section Feedback */}
                      {parseFeedback(p.feedback)?.problem && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 mt-2 flex items-start gap-1.5 shadow-sm">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <strong>Observación de Problemática:</strong> {parseFeedback(p.feedback)?.problem}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 min-w-0">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase block font-semibold">Justificación de la Investigación</span>
                      <p className="text-zinc-600 leading-relaxed break-words whitespace-pre-line text-xs">{p.justification}</p>
                      
                      {/* Section Feedback */}
                      {parseFeedback(p.feedback)?.justification && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 mt-2 flex items-start gap-1.5 shadow-sm">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <strong>Observación de Justificación:</strong> {parseFeedback(p.feedback)?.justification}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Scope and Objectives */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-zinc-50 pt-4">
                    <div className="space-y-2 min-w-0">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase block font-semibold">Alcance del Proyecto</span>
                      <p className="text-zinc-600 leading-relaxed break-words whitespace-pre-line text-xs">{p.scope || 'No especificado'}</p>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase block font-semibold">Objetivo General</span>
                      <p className="text-zinc-700 leading-relaxed break-words whitespace-pre-line text-xs font-semibold">{p.generalObjective}</p>
                    </div>
                  </div>

                  {/* Row 4: Specific Objectives & Risks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-zinc-50 pt-4">
                    <div className="space-y-2 min-w-0">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase block font-bold">Objetivos Específicos</span>
                      <ul className="list-disc pl-4 space-y-1.5 text-zinc-600 text-xs">
                        {p.specificObjectives && p.specificObjectives.length > 0 ? (
                          p.specificObjectives.map((o, idx) => (
                            <li key={idx} className="break-words">{o}</li>
                          ))
                        ) : (
                          <li className="italic text-zinc-400">Ninguno registrado</li>
                        )}
                      </ul>
                      
                      {/* Section Feedback */}
                      {parseFeedback(p.feedback)?.objectives && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 mt-2 flex items-start gap-1.5 shadow-sm">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <strong>Observación de Objetivos:</strong> {parseFeedback(p.feedback)?.objectives}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 min-w-0">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase block font-bold">Riesgos Identificados</span>
                      <div className="flex flex-wrap gap-1.5">
                        {p.risks && p.risks.length > 0 && p.risks[0] !== '' ? (
                          p.risks.map((r, idx) => (
                            <span key={idx} className="bg-red-50 text-red-700 border border-red-150 px-2 py-0.5 rounded text-xs">
                              ⚠️ {r}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-400 text-xs italic">No definidos</span>
                        )}
                      </div>
                      
                      {/* Section Feedback */}
                      {parseFeedback(p.feedback)?.risksStack && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 mt-2 flex items-start gap-1.5 shadow-sm">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <strong>Observación de Riesgos & Stack:</strong> {parseFeedback(p.feedback)?.risksStack}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Compact summary representation */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm border-t border-zinc-100 pt-4">
                  <div className="space-y-2 min-w-0">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase block">Problema a resolver</span>
                    <p className="text-zinc-650 leading-relaxed line-clamp-2 break-words text-xs">{p.problem}</p>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase block">Objetivo General</span>
                    <p className="text-zinc-650 leading-relaxed line-clamp-2 break-words text-xs">{p.generalObjective}</p>
                  </div>
                </div>
              )}

              {parseFeedback(p.feedback)?.general && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-xs space-y-1 min-w-0">
                  <span className="font-bold text-black flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-500" /> Observaciones Generales del Evaluador:
                  </span>
                  <p className="text-zinc-600 leading-relaxed font-sans break-words whitespace-pre-line">
                    {parseFeedback(p.feedback)?.general}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-xl p-6 max-w-3xl w-full shadow-lg max-h-[85vh] overflow-y-auto space-y-6">
            <h3 className="text-lg font-extrabold text-black border-b border-zinc-150 pb-2">
              {editMode ? 'Modificar Propuesta de Tesis' : 'Registrar Nueva Propuesta'}
            </h3>
            
            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Título de la Propuesta</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Análisis predictivo de fallas de climatización usando IoT"
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Problema</label>
                  <textarea
                    required
                    value={problem}
                    onChange={e => setProblem(e.target.value)}
                    placeholder="Describe detalladamente el problema detectado..."
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black h-24 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Justificación</label>
                  <textarea
                    required
                    value={justification}
                    onChange={e => setJustification(e.target.value)}
                    placeholder="¿Por qué es relevante realizar este proyecto?"
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black h-24 resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Objetivo General</label>
                  <textarea
                    required
                    value={generalObjective}
                    onChange={e => setGeneralObjective(e.target.value)}
                    placeholder="Ej: Implementar una red de sensores que optimice..."
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black h-20 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Contexto Institucional / Empresa</label>
                  <input
                    type="text"
                    value={contextInstitutional}
                    onChange={e => setContextInstitutional(e.target.value)}
                    placeholder="Ej: Empresa Inmobiliaria Futuro S.A."
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* Specific Objectives List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-mono text-zinc-400 uppercase">Objetivos Específicos</label>
                  <button
                    type="button"
                    onClick={() => setSpecificObjectives([...specificObjectives, ''])}
                    className="text-xs text-zinc-500 hover:text-black font-bold"
                  >
                    + Agregar Objetivo
                  </button>
                </div>
                <div className="space-y-2">
                  {specificObjectives.map((obj, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        required
                        value={obj}
                        onChange={e => {
                          const updated = [...specificObjectives];
                          updated[i] = e.target.value;
                          setSpecificObjectives(updated);
                        }}
                        placeholder={`Objetivo específico #${i + 1}`}
                        className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-xs text-black focus:outline-none focus:border-black"
                      />
                      {specificObjectives.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSpecificObjectives(specificObjectives.filter((_, idx) => idx !== i))}
                          className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Risks & Stack */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-mono text-zinc-400 uppercase">Riesgos Identificados</label>
                    <button
                      type="button"
                      onClick={() => setRisks([...risks, ''])}
                      className="text-[10px] text-zinc-500 font-bold"
                    >
                      + Agregar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {risks.map((risk, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="text"
                          required
                          value={risk}
                          onChange={e => {
                            const updated = [...risks];
                            updated[i] = e.target.value;
                            setRisks(updated);
                          }}
                          placeholder="Ej: Falla de broker MQTT"
                          className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs text-black focus:outline-none focus:border-black"
                        />
                        {risks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setRisks(risks.filter((_, idx) => idx !== i))}
                            className="text-zinc-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-mono text-zinc-400 uppercase">Stack Tecnológico Tentativo</label>
                    <button
                      type="button"
                      onClick={() => setTentativeStack([...tentativeStack, ''])}
                      className="text-[10px] text-zinc-500 font-bold"
                    >
                      + Agregar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {tentativeStack.map((stack, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="text"
                          required
                          value={stack}
                          onChange={e => {
                            const updated = [...tentativeStack];
                            updated[i] = e.target.value;
                            setTentativeStack(updated);
                          }}
                          placeholder="Ej: Node.js, ESP32, React"
                          className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs text-black focus:outline-none focus:border-black"
                        />
                        {tentativeStack.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setTentativeStack(tentativeStack.filter((_, idx) => idx !== i))}
                            className="text-zinc-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advisor Selection */}
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Docente Guía Asignado / Solicitado</label>
                <select
                  required
                  value={assignedAdvisorId}
                  onChange={e => setAssignedAdvisorId(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black"
                >
                  <option value="">Selecciona un docente guía...</option>
                  {advisors.map(a => (
                    <option key={a._id} value={a._id}>
                      {a.name} ({a.rut})
                    </option>
                  ))}
                </select>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-zinc-150 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-black transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-black hover:bg-zinc-800 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  {editMode ? 'Actualizar Propuesta' : 'Guardar en Borrador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedProposal && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-xl p-6 max-w-5xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-extrabold text-black border-b border-zinc-150 pb-3 flex justify-between items-center">
              <span>Evaluar Propuesta de Tesis: {selectedProposal.title}</span>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedProposal(null);
                }}
                className="text-zinc-400 hover:text-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Student Inputs (Detalles) */}
              <div className="space-y-5 overflow-y-auto max-h-[65vh] pr-4 lg:border-r lg:border-zinc-200">
                <div className="flex gap-4">
                  <div className="flex-1 bg-zinc-50 rounded-lg p-3 border border-zinc-200">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Estudiante</span>
                    <span className="text-xs font-bold text-zinc-900">{selectedProposal.studentName || selectedProposal.student?.name}</span>
                  </div>

                  <div className="flex-1 bg-zinc-50 rounded-lg p-3 border border-zinc-200">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Contexto / Empresa</span>
                    <span className="text-xs font-bold text-zinc-900">{selectedProposal.contextInstitutional || 'Tesis Libre'}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono text-zinc-400 uppercase block font-bold">1. Planteamiento del Problema</span>
                  <div className="text-xs text-zinc-655 bg-zinc-50 border border-zinc-200 rounded-lg p-3 break-words whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto font-sans">
                    {selectedProposal.problem}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono text-zinc-400 uppercase block font-bold">2. Justificación y Alcance</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="text-xs text-zinc-655 bg-zinc-50 border border-zinc-200 rounded-lg p-3 break-words whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">
                      <strong className="text-[9px] text-zinc-400 block uppercase mb-1">Justificación</strong>
                      {selectedProposal.justification}
                    </div>
                    <div className="text-xs text-zinc-655 bg-zinc-50 border border-zinc-200 rounded-lg p-3 break-words whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">
                      <strong className="text-[9px] text-zinc-400 block uppercase mb-1">Alcance Preliminar</strong>
                      {selectedProposal.scope || 'No definido'}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono text-zinc-400 uppercase block font-bold">3. Objetivos del Proyecto</span>
                  <div className="space-y-3">
                    <div className="text-xs text-zinc-655 bg-zinc-50 border border-zinc-200 rounded-lg p-3 break-words leading-relaxed font-semibold">
                      <strong className="text-[9px] text-zinc-400 block uppercase mb-1 font-mono font-normal">Objetivo General</strong>
                      {selectedProposal.generalObjective}
                    </div>
                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
                      <strong className="text-[9px] text-zinc-400 block uppercase mb-1 font-mono">Objetivos Específicos</strong>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-zinc-655 font-sans">
                        {selectedProposal.specificObjectives.map((o, idx) => (
                          <li key={idx} className="break-words">{o}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono text-zinc-400 uppercase block font-bold">4. Riesgos & Stack Tecnológico</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
                      <strong className="text-[9px] text-zinc-400 block uppercase mb-1 font-mono">Riesgos Identificados</strong>
                      <div className="flex flex-col gap-1 text-[11px] text-red-650 font-medium">
                        {selectedProposal.risks && selectedProposal.risks.length > 0 && selectedProposal.risks[0] !== '' ? (
                          selectedProposal.risks.map((r, idx) => <span key={idx}>⚠️ {r}</span>)
                        ) : (
                          <span className="text-zinc-400 italic">No definidos</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
                      <strong className="text-[9px] text-zinc-400 block uppercase mb-1 font-mono">Stack Tecnológico</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedProposal.tentativeStack && selectedProposal.tentativeStack.length > 0 && selectedProposal.tentativeStack[0] !== '' ? (
                          selectedProposal.tentativeStack.map((s, idx) => (
                            <span key={idx} className="bg-white border border-zinc-200 text-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-mono">
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-400 italic">No definido</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Advisor Feedback form */}
              <form onSubmit={submitReview} className="flex flex-col justify-between space-y-4 max-h-[65vh]">
                <div className="space-y-4 overflow-y-auto pr-2 pb-2">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase mb-1 font-bold">Resultado de la Evaluación</label>
                    <select
                      value={reviewStatus}
                      onChange={e => setReviewStatus(e.target.value as any)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold text-zinc-950 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                    >
                      <option value="Approved">Aprobar Propuesta (Inicializará el Proyecto)</option>
                      <option value="ChangesRequested">Solicitar Ajustes / Observaciones</option>
                      <option value="Rejected">Rechazar Propuesta</option>
                    </select>
                  </div>

                  <div className="border-t border-zinc-100 pt-3 space-y-3">
                    <span className="text-xs font-bold text-zinc-950 block">Observaciones por Sección (Opcional):</span>
                    
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Comentarios: Planteamiento del Problema</label>
                      <textarea
                        value={problemFeedback}
                        onChange={e => setProblemFeedback(e.target.value)}
                        placeholder="Observaciones sobre la definición del problema..."
                        className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-black h-14 resize-none focus:outline-none focus:border-black"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Comentarios: Justificación y Alcance</label>
                      <textarea
                        value={justificationFeedback}
                        onChange={e => setJustificationFeedback(e.target.value)}
                        placeholder="Observaciones sobre relevancia y limitaciones..."
                        className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-black h-14 resize-none focus:outline-none focus:border-black"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Comentarios: Objetivos del Proyecto</label>
                      <textarea
                        value={objectivesFeedback}
                        onChange={e => setObjectivesFeedback(e.target.value)}
                        placeholder="Observaciones sobre la redacción/viabilidad de objetivos..."
                        className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-black h-14 resize-none focus:outline-none focus:border-black"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Comentarios: Riesgos & Stack</label>
                      <textarea
                        value={risksStackFeedback}
                        onChange={e => setRisksStackFeedback(e.target.value)}
                        placeholder="Observaciones sobre los riesgos y tecnologías..."
                        className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-black h-14 resize-none focus:outline-none focus:border-black"
                      />
                    </div>
                  </div>

                  <div className="border-t border-zinc-100 pt-3">
                    <label className="block text-xs font-mono text-zinc-400 uppercase mb-1 font-bold">Comentarios Generales / Dictamen</label>
                    <textarea
                      required
                      value={generalFeedback}
                      onChange={e => setGeneralFeedback(e.target.value)}
                      placeholder="Resume el veredicto general o describe los siguientes pasos..."
                      className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-xs text-black h-20 resize-none focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-zinc-150 pt-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewModal(false);
                      setSelectedProposal(null);
                    }}
                    className="px-3 py-1.5 text-xs text-zinc-500 hover:text-black font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-black hover:bg-zinc-800 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Registrar Evaluación
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { 
  Cpu, 
  Plus, 
  Trash2, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileEdit, 
  UserCheck,
  RotateCcw
} from 'lucide-react';

interface ADR {
  _id: string;
  project: string;
  owner: string;
  code: string;
  title: string;
  status: 'Draft' | 'InReview' | 'ChangesRequested' | 'Accepted' | 'Rejected' | 'Superseded';
  context: string;
  decision: string;
  consequences: string;
  version: number;
  submittedAt?: string;
  reviewedAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  requiredApprovals: number;
  currentApprovals: number;
}

interface ADRReview {
  _id: string;
  adr: string;
  reviewer: string;
  reviewerName: string;
  hasRead: boolean;
  readAt?: string;
  decision?: 'Approved' | 'Rejected' | 'SuggestedChanges';
  comment?: string;
  createdAt: string;
}

export const TechnicalSolution: React.FC = () => {
  const { activeProject, members, fetchMembers } = useProjectStore();
  const { user, getAuthHeaders } = useAuthStore();
  
  const [adrs, setAdrs] = useState<ADR[]>([]);
  const [selectedAdr, setSelectedAdr] = useState<ADR | null>(null);
  const [reviews, setReviews] = useState<ADRReview[]>([]);
  
  // Modals and Forms
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [adrCode, setAdrCode] = useState('');
  const [adrTitle, setAdrTitle] = useState('');
  const [adrContext, setAdrContext] = useState('');
  const [adrDecision, setAdrDecision] = useState('');
  const [adrConsequences, setAdrConsequences] = useState('');

  // Review Form
  const [reviewDecision, setReviewDecision] = useState<'Approved' | 'Rejected' | 'SuggestedChanges'>('Approved');
  const [reviewComment, setReviewComment] = useState('');

  const API_URL = 'http://localhost:5000/api';
  const headers = getAuthHeaders();

  const fetchADRs = async () => {
    if (!activeProject) return;
    try {
      const response = await fetch(`${API_URL}/adrs/project/${activeProject._id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setAdrs(data);
        if (data.length > 0) {
          setSelectedAdr(prev => {
            const match = data.find((a: ADR) => a._id === prev?._id);
            return match || data[0];
          });
        } else {
          setSelectedAdr(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReviews = async (adrId: string) => {
    try {
      const response = await fetch(`${API_URL}/adrs/${adrId}/reviews`, { headers });
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeProject) {
      fetchADRs();
      fetchMembers(activeProject._id);
    }
  }, [activeProject]);

  useEffect(() => {
    if (selectedAdr) {
      fetchReviews(selectedAdr._id);
    } else {
      setReviews([]);
    }
  }, [selectedAdr]);

  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setAdrCode(`ADR-${String(adrs.length + 1).padStart(2, '0')}`);
    setAdrTitle('');
    setAdrContext('');
    setAdrDecision('');
    setAdrConsequences('');
    setShowModal(true);
  };

  const handleOpenEditModal = (adr: ADR) => {
    setIsEditMode(true);
    setAdrCode(adr.code);
    setAdrTitle(adr.title);
    setAdrContext(adr.context);
    setAdrDecision(adr.decision);
    setAdrConsequences(adr.consequences);
    setShowModal(true);
  };

  const handleSaveADR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !adrCode || !adrTitle) return;

    try {
      const url = isEditMode && selectedAdr ? `${API_URL}/adrs/${selectedAdr._id}` : `${API_URL}/adrs`;
      const method = isEditMode ? 'PUT' : 'POST';

      const body = {
        project: activeProject._id,
        code: adrCode,
        title: adrTitle,
        context: adrContext,
        decision: adrDecision,
        consequences: adrConsequences
      };

      const response = await fetch(url, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setShowModal(false);
        await fetchADRs();
      } else {
        const data = await response.json();
        alert(data.message || 'Error guardando decisión.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteADR = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Eliminar este registro ADR y todas sus evaluaciones asociadas?')) {
      try {
        const response = await fetch(`${API_URL}/adrs/${id}`, {
          method: 'DELETE',
          headers
        });
        if (response.ok) {
          if (selectedAdr?._id === id) setSelectedAdr(null);
          await fetchADRs();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSubmitForReview = async () => {
    if (!selectedAdr) return;
    try {
      const response = await fetch(`${API_URL}/adrs/${selectedAdr._id}/submit`, {
        method: 'POST',
        headers
      });
      if (response.ok) {
        await fetchADRs();
      } else {
        const data = await response.json();
        alert(data.message || 'Error al enviar a revisión.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdr) return;

    try {
      const response = await fetch(`${API_URL}/adrs/${selectedAdr._id}/reviews`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: reviewDecision,
          comment: reviewComment
        })
      });

      if (response.ok) {
        setReviewComment('');
        await fetchADRs();
        await fetchReviews(selectedAdr._id);
      } else {
        const data = await response.json();
        alert(data.message || 'Error al enviar revisión.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-zinc-200 rounded-xl bg-white p-8 shadow-sm">
        <Cpu className="w-8 h-8 text-zinc-400 mb-2" />
        <span className="text-sm text-zinc-500">Selecciona un proyecto para ver el registro de decisiones arquitectónicas.</span>
      </div>
    );
  }

  const isOwner = selectedAdr?.owner === user?._id;
  const ownerMember = members.find(m => m.user._id === selectedAdr?.owner);
  const ownerName = ownerMember ? ownerMember.user.name : 'Miembro del Equipo';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Borrador</span>;
      case 'InReview':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">En Revisión</span>;
      case 'ChangesRequested':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-orange-50 text-orange-700 border border-orange-200">Cambios Solicitados</span>;
      case 'Accepted':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-emerald-500 text-white border border-emerald-600">Aceptado</span>;
      case 'Rejected':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-red-600 text-white border border-red-700">Rechazado</span>;
      case 'Superseded':
        return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-zinc-100 text-zinc-600 border border-zinc-300">Reemplazado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex justify-between items-center border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight">Arquitectura y Registro de Decisiones (ADRs)</h1>
          <p className="text-sm text-zinc-500 mt-1">Colabora, evalúa y aprueba decisiones técnicas con el consenso del equipo.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-2 rounded transition-colors"
        >
          <Plus className="w-4 h-4" /> Proponer ADR
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Sidebar Log */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold text-black uppercase font-mono tracking-wider">Bitácora de Decisiones</h3>
          <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-200 overflow-hidden shadow-sm">
            {adrs.map(adr => {
              return (
                <div
                  key={adr._id}
                  onClick={() => setSelectedAdr(adr)}
                  className={`p-4 cursor-pointer transition-colors flex justify-between items-start ${
                    selectedAdr?._id === adr._id ? 'bg-zinc-50 font-semibold' : 'hover:bg-zinc-50'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-zinc-400">{adr.code}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">v{adr.version}</span>
                    </div>
                    <span className="text-xs font-bold text-black block truncate mt-0.5">{adr.title}</span>
                    
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(adr.status)}
                      {adr.status === 'InReview' && (
                        <span className="text-[9px] font-mono text-zinc-400 font-bold bg-zinc-100 px-1.5 py-0.5 rounded">
                          {adr.currentApprovals}/{adr.requiredApprovals} votos
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteADR(adr._id, e)}
                    className="text-zinc-300 hover:text-red-600 transition-colors p-1 self-center"
                    title="Eliminar ADR"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {adrs.length === 0 && (
              <div className="p-8 text-center text-xs text-zinc-400 italic">No hay registros de decisiones técnicas.</div>
            )}
          </div>
        </div>

        {/* Right: Selected Detail Canvas */}
        <div className="lg:col-span-2 space-y-6">
          {selectedAdr ? (
            <div className="space-y-6">
              {/* Main ADR Metadata Card */}
              <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-6 shadow-sm">
                <div className="border-b border-zinc-150 pb-4 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-zinc-400 font-bold">{selectedAdr.code}</span>
                      <span className="text-xs bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded font-mono">Versión {selectedAdr.version}</span>
                    </div>
                    <h2 className="text-base font-bold text-black mt-1 font-sans">{selectedAdr.title}</h2>
                    <span className="text-[10px] text-zinc-400 block mt-1">Propuesto por: <strong>{ownerName}</strong></span>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {getStatusBadge(selectedAdr.status)}
                    {selectedAdr.status === 'InReview' && (
                      <span className="text-[10px] text-zinc-500 font-mono font-bold">
                        Quórum: {selectedAdr.currentApprovals} / {selectedAdr.requiredApprovals} aprobaciones
                      </span>
                    )}
                  </div>
                </div>

                {/* Workflow Stepper Progress bar */}
                <div className="py-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 font-bold uppercase mb-2">
                    <span>Estado del flujo colaborativo</span>
                    <span className="text-zinc-600">Revisión formal activa</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className={`h-1.5 rounded-full ${selectedAdr.status === 'Draft' ? 'bg-amber-400' : 'bg-zinc-200'}`}></div>
                    <div className={`h-1.5 rounded-full ${selectedAdr.status === 'InReview' ? 'bg-blue-500' : selectedAdr.status === 'Accepted' || selectedAdr.status === 'Rejected' || selectedAdr.status === 'ChangesRequested' ? 'bg-blue-300' : 'bg-zinc-200'}`}></div>
                    <div className={`h-1.5 rounded-full ${selectedAdr.status === 'ChangesRequested' ? 'bg-orange-400' : 'bg-zinc-200'}`}></div>
                    <div className={`h-1.5 rounded-full ${selectedAdr.status === 'Accepted' ? 'bg-emerald-500' : selectedAdr.status === 'Rejected' ? 'bg-red-500' : 'bg-zinc-200'}`}></div>
                  </div>
                </div>

                {/* Core ADR Sections */}
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase block font-bold">Contexto de la Decisión:</span>
                    <p className="text-xs text-zinc-700 mt-1.5 leading-relaxed font-sans bg-zinc-50 border border-zinc-200 rounded p-3 whitespace-pre-wrap">
                      {selectedAdr.context || "Sin contexto definido."}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase block font-bold">Decisión Adoptada:</span>
                    <p className="text-xs text-zinc-700 mt-1.5 leading-relaxed font-sans bg-zinc-50 border border-zinc-200 rounded p-3 whitespace-pre-wrap">
                      {selectedAdr.decision || "Sin decisión detallada."}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase block font-bold">Consecuencias y Resultados:</span>
                    <p className="text-xs text-zinc-700 mt-1.5 leading-relaxed font-sans bg-zinc-50 border border-zinc-200 rounded p-3 whitespace-pre-wrap">
                      {selectedAdr.consequences || "Sin consecuencias registradas."}
                    </p>
                  </div>
                </div>

                {/* Owner Actions Panel */}
                {isOwner && (
                  <div className="border-t border-zinc-150 pt-4 flex gap-3 justify-between items-center">
                    <div>
                      {selectedAdr.status === 'Draft' && (
                        <p className="text-[10px] text-zinc-500">Este ADR se encuentra en borrador. Envíalo para revisión del equipo.</p>
                      )}
                      {selectedAdr.status === 'InReview' && (
                        <p className="text-[10px] text-zinc-500">Esperando votos de tus compañeros para alcanzar el quórum.</p>
                      )}
                      {selectedAdr.status === 'ChangesRequested' && (
                        <p className="text-[10px] text-amber-600 font-medium">Se solicitaron cambios. Corrige el ADR para volver a iniciar revisión.</p>
                      )}
                      {selectedAdr.status === 'Accepted' && (
                        <p className="text-[10px] text-emerald-600 font-medium">Este ADR ha sido aprobado formalmente y está congeleado.</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {(selectedAdr.status === 'Draft' || selectedAdr.status === 'ChangesRequested') && (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(selectedAdr)}
                            className="flex items-center gap-1.5 border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold px-3 py-1.5 rounded transition-colors text-zinc-700"
                          >
                            <FileEdit className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button
                            onClick={handleSubmitForReview}
                            className="flex items-center gap-1.5 bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-1.5 rounded transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" /> Enviar a Revisión
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Collaborative Evaluation & Reviews Grid */}
              <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-6 shadow-sm">
                <h3 className="text-xs font-extrabold text-black uppercase font-mono tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-zinc-500" />
                  Estado de Evaluación del Equipo
                </h3>

                {/* Team member voting actions (Active if ADR is InReview) */}
                {!isOwner && selectedAdr.status === 'InReview' && (
                  <form onSubmit={handleSubmitReview} className="p-4 border border-zinc-200 rounded-xl bg-zinc-50/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-950">Tu Evaluación Técnico-Arquitectónica</span>
                      <span className="text-[10px] text-zinc-400 font-mono">Feedback requerido</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setReviewDecision('Approved')}
                        className={`py-2 text-xs font-bold rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                          reviewDecision === 'Approved'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-100'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Aprobar
                      </button>

                      <button
                        type="button"
                        onClick={() => setReviewDecision('SuggestedChanges')}
                        className={`py-2 text-xs font-bold rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                          reviewDecision === 'SuggestedChanges'
                            ? 'bg-amber-50 text-amber-850 border-amber-300 ring-2 ring-amber-100'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        <RotateCcw className="w-4 h-4 text-amber-500" />
                        Sugerir Cambios
                      </button>

                      <button
                        type="button"
                        onClick={() => setReviewDecision('Rejected')}
                        className={`py-2 text-xs font-bold rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                          reviewDecision === 'Rejected'
                            ? 'bg-red-50 text-red-800 border-red-300 ring-2 ring-red-100'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        <XCircle className="w-4 h-4 text-red-600" />
                        Rechazar
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase font-bold">Observaciones / Feedback técnico</label>
                      <textarea
                        required={reviewDecision !== 'Approved'}
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        placeholder="Justifica tu voto técnico o detalla las modificaciones sugeridas..."
                        className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-xs text-black focus:outline-none focus:border-black placeholder-zinc-300 h-16 resize-none"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-1.5 rounded transition-colors"
                      >
                        Enviar Evaluación
                      </button>
                    </div>
                  </form>
                )}

                {/* Displaying Review status for other teammates */}
                <div className="space-y-3">
                  {members
                    .filter(m => m.user._id !== selectedAdr.owner) // Teammates only
                    .map(m => {
                      const teammateReview = reviews.find(r => r.reviewer === m.user._id);
                      return (
                        <div key={m._id} className="p-3 border border-zinc-250 rounded-xl flex gap-3 items-start justify-between text-xs">
                          <div className="space-y-1">
                            <span className="font-bold text-zinc-950 block">{m.user.name}</span>
                            <span className="text-[10px] text-zinc-400 block font-mono capitalize">{m.role} &bull; {m.operationalRole}</span>
                            {teammateReview?.comment && (
                              <p className="text-zinc-600 mt-2 bg-zinc-50 p-2 rounded border border-zinc-200 italic font-mono text-[11px]">
                                "{teammateReview.comment}"
                              </p>
                            )}
                          </div>

                          <div>
                            {teammateReview ? (
                              <div className="flex flex-col items-end gap-1 font-mono text-[9px] font-bold">
                                {teammateReview.decision === 'Approved' && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aprobado
                                  </span>
                                )}
                                {teammateReview.decision === 'SuggestedChanges' && (
                                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase flex items-center gap-1">
                                    <RotateCcw className="w-3 h-3 text-amber-600" /> Cambios Solicitados
                                  </span>
                                )}
                                {teammateReview.decision === 'Rejected' && (
                                  <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 uppercase flex items-center gap-1">
                                    <XCircle className="w-3 h-3 text-red-650" /> Rechazado
                                  </span>
                                )}
                                <span className="text-zinc-400 text-[8px]">
                                  Leído el {new Date(teammateReview.readAt || teammateReview.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-zinc-50 text-zinc-400 border border-zinc-200 uppercase font-mono text-[9px] font-bold flex items-center gap-1">
                                <Clock className="w-3 h-3 text-zinc-400" /> Pendiente
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-xl p-16 text-center text-zinc-500 shadow-sm">
              <Cpu className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <span>Selecciona una propuesta (ADR) del listado lateral o presiona 'Proponer ADR'.</span>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit ADR Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-xl p-6 max-w-lg w-full shadow-lg">
            <h3 className="text-base font-bold text-black mb-4 font-sans">
              {isEditMode ? 'Editar Decisión Arquitectónica (ADR)' : 'Proponer Decisión Arquitectónica (ADR)'}
            </h3>
            <form onSubmit={handleSaveADR} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1 font-bold text-black">Código Correlativo</label>
                <input
                  type="text"
                  required
                  value={adrCode}
                  onChange={e => setAdrCode(e.target.value)}
                  placeholder="ADR-01, ADR-02"
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1 font-bold text-black">Título de la Decisión</label>
                <input
                  type="text"
                  required
                  value={adrTitle}
                  onChange={e => setAdrTitle(e.target.value)}
                  placeholder="Ej: Uso de PostgreSQL para base transaccional"
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1 font-bold text-black">Contexto (Problema y alternativas)</label>
                <textarea
                  required
                  value={adrContext}
                  onChange={e => setAdrContext(e.target.value)}
                  placeholder="Describe la problemática técnica, necesidad de negocio y opciones analizadas..."
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300 h-20 resize-none font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1 font-bold text-black">Decisión (Propuesta seleccionada)</label>
                <textarea
                  required
                  value={adrDecision}
                  onChange={e => setAdrDecision(e.target.value)}
                  placeholder="Detalla qué opción se eligió y por qué..."
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300 h-20 resize-none font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1 font-bold text-black">Consecuencias (Resultados esperados)</label>
                <textarea
                  required
                  value={adrConsequences}
                  onChange={e => setAdrConsequences(e.target.value)}
                  placeholder="Efectos secundarios de la decisión (positivos, negativos, compromisos)..."
                  className="w-full bg-white border border-zinc-250 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300 h-20 resize-none font-sans"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-black transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-1.5 rounded transition-colors"
                >
                  {isEditMode ? 'Guardar Cambios' : 'Registrar Decisión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicalSolution;

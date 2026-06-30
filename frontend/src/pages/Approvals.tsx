import React, { useEffect, useState, useCallback } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Plus, 
  Clock, 
  FileCheck,
  Send
} from 'lucide-react';

interface Review {
  user: string;
  userName: string;
  status: 'Approved' | 'Rejected' | 'ChangesRequested';
  note: string;
  updatedAt: string;
}

interface ApprovalRequest {
  _id: string;
  project: string;
  itemType: 'Requirement' | 'Meeting' | 'Deliverable' | 'Report' | 'ADRDecision';
  itemId: string;
  title: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'ChangesRequested';
  requestedBy: string;
  requestedByName: string;
  approvals: Review[];
  requiredApprovalsCount: number;
  currentApprovalsCount: number;
  createdAt: string;
  updatedAt: string;
}

export const Approvals: React.FC = () => {
  const { activeProject } = useProjectStore();
  const { getAuthHeaders, user } = useAuthStore();

  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [, setError] = useState<string | null>(null);

  // New Request Form State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newItemType, setNewItemType] = useState<'Requirement' | 'Meeting' | 'Deliverable' | 'Report' | 'ADRDecision'>('Deliverable');
  const [newItemId, setNewItemId] = useState<string>('');
  const [newRequiredCount, setNewRequiredCount] = useState<number>(1);

  // Lists of available items to choose from
  const [availableItems, setAvailableItems] = useState<Array<{ id: string; name: string }>>([]);

  // Review submission state
  const [reviewStatus, setReviewStatus] = useState<'Approved' | 'Rejected' | 'ChangesRequested'>('Approved');
  const [reviewNote, setReviewNote] = useState<string>('');

  const fetchApprovals = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:5000/api/approvals/project/${activeProject._id}`, { headers });
      if (!res.ok) throw new Error('Error al cargar las aprobaciones.');
      const data = await res.json();
      setApprovals(data);
      if (selectedApproval) {
        const updated = data.find((a: ApprovalRequest) => a._id === selectedApproval._id);
        if (updated) setSelectedApproval(updated);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeProject, getAuthHeaders, selectedApproval]);

  // Fetch target items based on selected item type
  const fetchAvailableItems = async (type: string) => {
    if (!activeProject) return;
    try {
      const headers = getAuthHeaders();
      let url = '';
      if (type === 'Requirement') url = `http://localhost:5000/api/requirements/project/${activeProject._id}`;
      else if (type === 'Meeting') url = `http://localhost:5000/api/meetings/project/${activeProject._id}`;
      else if (type === 'Deliverable') url = `http://localhost:5000/api/deliverables/project/${activeProject._id}`;
      else if (type === 'ADRDecision') url = `http://localhost:5000/api/adrs/project/${activeProject._id}`;
      else if (type === 'Report') url = `http://localhost:5000/api/documents/project/${activeProject._id}`;

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        // Map to standard { id, name } structure
        const mapped = data.map((item: any) => {
          if (type === 'Requirement') return { id: item._id, name: `[${item.code}] ${item.title}` };
          if (type === 'Meeting') return { id: item._id, name: `Minuta: ${item.title} (${new Date(item.date).toLocaleDateString()})` };
          if (type === 'Deliverable') return { id: item._id, name: `Entregable: ${item.name}` };
          if (type === 'ADRDecision') return { id: item._id, name: `[${item.code}] ${item.title}` };
          if (type === 'Report') return { id: item._id, name: `Sección: ${item.title}` };
          return { id: item._id, name: item.title || item.name || item._id };
        });
        setAvailableItems(mapped);
        if (mapped.length > 0) setNewItemId(mapped[0].id);
        else setNewItemId('');
      }
    } catch (err) {
      console.error('Error fetching available items:', err);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [activeProject]);

  useEffect(() => {
    if (showCreateModal) {
      fetchAvailableItems(newItemType);
    }
  }, [newItemType, showCreateModal]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newTitle || !newItemId) return;

    try {
      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:5000/api/approvals`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project: activeProject._id,
          itemType: newItemType,
          itemId: newItemId,
          title: newTitle,
          requiredApprovalsCount: newRequiredCount
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al solicitar aprobación');
      }

      await fetchApprovals();
      setShowCreateModal(false);
      setNewTitle('');
      setNewRequiredCount(1);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApproval) return;

    try {
      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:5000/api/approvals/${selectedApproval._id}/review`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: reviewStatus,
          note: reviewNote
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al enviar revisión');
      }

      await fetchApprovals();
      setReviewNote('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Aprobado</span>;
      case 'Rejected':
        return <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Rechazado</span>;
      case 'ChangesRequested':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Cambios Solicitados</span>;
      default:
        return <span className="bg-zinc-100 text-zinc-600 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Pendiente</span>;
    }
  };

  const getReviewStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded font-bold font-mono">Aprobar</span>;
      case 'Rejected':
        return <span className="bg-red-50 text-red-700 text-[10px] px-2 py-0.5 rounded font-bold font-mono">Rechazar</span>;
      default:
        return <span className="bg-amber-50 text-amber-700 text-[10px] px-2 py-0.5 rounded font-bold font-mono">Requerir Cambios</span>;
    }
  };

  const getItemTypeName = (type: string) => {
    switch (type) {
      case 'Requirement': return 'Requerimiento';
      case 'Meeting': return 'Minuta de Reunión';
      case 'Deliverable': return 'Entregable Oficial';
      case 'Report': return 'Capítulo / Informe';
      case 'ADRDecision': return 'Decisión Arquitectónica (ADR)';
      default: return type;
    }
  };

  const canReview = user?.role === 'Admin' || user?.role === 'Viewer'; // Viewer includes Guide Professors

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950 text-white p-8 rounded-2xl shadow-xl">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight">Workflow de Aprobaciones</h1>
          <p className="text-zinc-400 text-sm max-w-xl">
            Solicita y gestiona revisiones formales de requerimientos, entregables y minutas con la comisión o profesores guías.
          </p>
        </div>
        <div>
          {user?.role !== 'Viewer' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-zinc-950 font-bold hover:bg-zinc-100 rounded-xl transition-all shadow-md text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Solicitar Aprobación</span>
            </button>
          )}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Requests List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-zinc-950 mb-3 uppercase tracking-wider font-mono">Historial de Solicitudes</h2>
            
            {loading ? (
              <div className="text-center py-12">
                <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs text-zinc-500 font-mono">Cargando revisiones...</p>
              </div>
            ) : approvals.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 italic text-xs">
                No hay solicitudes de aprobación registradas.
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {approvals.map(approval => {
                  const isSelected = selectedApproval?._id === approval._id;
                  return (
                    <div
                      key={approval._id}
                      onClick={() => setSelectedApproval(approval)}
                      className={`p-4 border rounded-xl shadow-xs transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-zinc-900 border-zinc-900 text-white' 
                          : 'bg-white border-zinc-200 text-zinc-900 hover:border-zinc-400'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold font-mono ${
                          isSelected ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {getItemTypeName(approval.itemType)}
                        </span>
                        <span className="text-[10px] font-semibold">
                          {approval.currentApprovalsCount} / {approval.requiredApprovalsCount} Aprob.
                        </span>
                      </div>

                      <h3 className="text-xs font-bold truncate">{approval.title}</h3>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-100/10 text-[10px] text-zinc-400">
                        <span className="truncate max-w-[120px]">Por: {approval.requestedByName}</span>
                        <div className="scale-90 origin-right">
                          {getStatusBadge(approval.status)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detailed Review panel (7 cols) */}
        <div className="lg:col-span-7">
          {selectedApproval ? (
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col h-full min-h-[500px]">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-6">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">Solicitud Detallada</h3>
                  <h2 className="text-base font-bold text-zinc-950 mt-1">{selectedApproval.title}</h2>
                </div>
                <div>{getStatusBadge(selectedApproval.status)}</div>
              </div>

              {/* Requestor / Metadata info */}
              <div className="grid grid-cols-2 gap-4 bg-zinc-50 border border-zinc-100 p-4 rounded-xl mb-6 text-xs">
                <div>
                  <span className="text-zinc-400 block font-mono">Solicitante:</span>
                  <span className="font-bold text-zinc-800">{selectedApproval.requestedByName}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-mono">Tipo de Item:</span>
                  <span className="font-bold text-zinc-800">{getItemTypeName(selectedApproval.itemType)}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-mono">Solicitado el:</span>
                  <span className="font-semibold text-zinc-600">
                    {new Date(selectedApproval.createdAt).toLocaleDateString()} {new Date(selectedApproval.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-mono">Aprobaciones Requeridas:</span>
                  <span className="font-bold text-zinc-800 font-mono">
                    {selectedApproval.currentApprovalsCount} / {selectedApproval.requiredApprovalsCount}
                  </span>
                </div>
              </div>

              {/* List of Reviews made */}
              <div className="flex-1 space-y-4 mb-6">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">Decisiones de Revisores</h4>
                {selectedApproval.approvals.length === 0 ? (
                  <div className="text-center py-6 text-zinc-400 italic text-xs border border-dashed border-zinc-200 rounded-xl">
                    Ningún profesor o revisor ha emitido su decisión aún.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedApproval.approvals.map((review, idx) => (
                      <div key={idx} className="border border-zinc-150 p-4 rounded-xl bg-white shadow-xs">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 text-[10px] font-bold font-mono">
                              {review.userName.charAt(0)}
                            </div>
                            <span className="text-xs font-bold text-zinc-800">{review.userName}</span>
                          </div>
                          <div>{getReviewStatusBadge(review.status)}</div>
                        </div>
                        {review.note && (
                          <p className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-100 p-2.5 rounded-lg font-medium">
                            "{review.note}"
                          </p>
                        )}
                        <div className="text-[9px] text-zinc-400 text-right mt-1.5 font-mono">
                          {new Date(review.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Review Input form (only for authorized users and if pending) */}
              {canReview && selectedApproval.status === 'Pending' && (
                <form onSubmit={handleSubmitReview} className="border-t border-zinc-100 pt-6 space-y-4">
                  <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-wider font-mono">Enviar mi Decisión</h4>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {(['Approved', 'ChangesRequested', 'Rejected'] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setReviewStatus(opt)}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                          reviewStatus === opt
                            ? opt === 'Approved'
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                              : opt === 'ChangesRequested'
                              ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                              : 'bg-red-600 border-red-600 text-white shadow-sm'
                            : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        {opt === 'Approved' ? 'Aprobar' : opt === 'ChangesRequested' ? 'Pedir Cambios' : 'Rechazar'}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-zinc-500 font-mono uppercase">Nota / Comentario de Revisión</label>
                    <textarea
                      value={reviewNote}
                      onChange={e => setReviewNote(e.target.value)}
                      placeholder="Indica observaciones específicas, justificaciones o felicitaciones..."
                      className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 focus:outline-none focus:border-zinc-500 min-h-[80px]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Decisión de Aprobación</span>
                  </button>
                </form>
              )}

            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center shadow-sm h-full flex flex-col justify-center items-center min-h-[500px]">
              <FileCheck className="w-12 h-12 text-zinc-300 mb-3" />
              <h3 className="text-sm font-bold text-zinc-950">Selecciona una Solicitud</h3>
              <p className="text-xs text-zinc-400 max-w-xs mt-1">
                Selecciona una solicitud de aprobación de la lista de historial para revisar el progreso, decisiones tomadas o enviar tu veredicto académico.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Request Approval Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-scale-in">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h3 className="font-extrabold text-zinc-950 text-base">Solicitar Nueva Aprobación</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-zinc-950 font-bold text-sm"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-500 font-mono uppercase">Título de la Solicitud</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ej: Aprobación de Requerimientos de Negocio V1"
                  className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-500 font-mono uppercase">Tipo de Elemento</label>
                  <select
                    value={newItemType}
                    onChange={e => setNewItemType(e.target.value as any)}
                    className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 focus:outline-none focus:border-zinc-500"
                  >
                    <option value="Deliverable">Entregable Oficial</option>
                    <option value="Requirement">Requerimiento</option>
                    <option value="ADRDecision">Decisión Arquitectónica (ADR)</option>
                    <option value="Report">Capítulo / Sección de Informe</option>
                    <option value="Meeting">Minuta de Reunión</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-500 font-mono uppercase">Votos Requeridos</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={newRequiredCount}
                    onChange={e => setNewRequiredCount(parseInt(e.target.value, 10))}
                    className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-500 font-mono uppercase">Seleccionar Item Específico</label>
                {availableItems.length === 0 ? (
                  <p className="text-xs text-red-500 font-medium bg-red-50 p-2 rounded border border-red-150">
                    No hay elementos de este tipo creados en el proyecto actualmente.
                  </p>
                ) : (
                  <select
                    value={newItemId}
                    onChange={e => setNewItemId(e.target.value)}
                    className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 focus:outline-none focus:border-zinc-500"
                  >
                    {availableItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <button
                type="submit"
                disabled={availableItems.length === 0}
                className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Solicitud a Revisores</span>
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Approvals;

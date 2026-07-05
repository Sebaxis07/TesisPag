import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { 
  FileText, 
  Plus, 
  Calendar, 
  Upload, 
  Download, 
  Lock, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  History,
  Send
} from 'lucide-react';

interface Version {
  versionNumber: number;
  filename: string;
  fileSize: number;
  filePath: string;
  comment: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
  advisorApprovalStatus?: 'Pending' | 'Approved' | 'ChangesRequested';
  advisorApprovalFeedback?: string;
}

interface Deliverable {
  _id: string;
  project: string;
  name: string;
  description: string;
  dueDate: string;
  status: 'Pending' | 'InReview' | 'Approved' | 'ChangesRequested' | 'Finalized';
  versions: Version[];
  createdAt: string;
  updatedAt: string;
}

export const Deliverables: React.FC = () => {
  const { activeProject, members } = useProjectStore();
  const { getAuthHeaders, user } = useAuthStore();

  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [, setError] = useState<string | null>(null);

  // Deliverable Creation Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newDueDate, setNewDueDate] = useState<string>('');

  // Version Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadComment, setUploadComment] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Faculty Version Review State
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [reviewVerNum, setReviewVerNum] = useState<number | null>(null);
  const [advisorStatus, setAdvisorStatus] = useState<'Approved' | 'ChangesRequested'>('Approved');
  const [advisorFeedback, setAdvisorFeedback] = useState<string>('');

  const fetchDeliverables = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:5000/api/deliverables/project/${activeProject._id}`, { headers });
      if (!res.ok) throw new Error('Error al cargar entregables');
      const data = await res.json();
      setDeliverables(data);

      if (selectedDeliverable) {
        const updated = data.find((d: Deliverable) => d._id === selectedDeliverable._id);
        if (updated) setSelectedDeliverable(updated);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeProject, getAuthHeaders, selectedDeliverable]);

  useEffect(() => {
    fetchDeliverables();
  }, [activeProject]);

  const handleCreateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newName || !newDueDate) return;

    try {
      const headers = getAuthHeaders();
      const res = await fetch('http://localhost:5000/api/deliverables', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project: activeProject._id,
          name: newName,
          description: newDesc,
          dueDate: newDueDate
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al crear entregable');
      }

      await fetchDeliverables();
      setShowCreateModal(false);
      setNewName('');
      setNewDesc('');
      setNewDueDate('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeliverable || !selectedFile) return;

    setUploading(true);
    try {
      const headers = getAuthHeaders();
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('comment', uploadComment);

      const res = await fetch(`http://localhost:5000/api/deliverables/${selectedDeliverable._id}/version`, {
        method: 'POST',
        headers: {
          'Authorization': (headers as any)['Authorization'] || '' // Do not set Content-Type, let browser boundary handle it
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al subir la versión');
      }

      await fetchDeliverables();
      setSelectedFile(null);
      setUploadComment('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFreeze = async (deliverableId: string) => {
    if (!window.confirm('¿Estás seguro de congelar este entregable? Ya no se podrán subir más versiones.')) return;
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:5000/api/deliverables/${deliverableId}/freeze`, {
        method: 'PATCH',
        headers
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al congelar el entregable');
      }

      await fetchDeliverables();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDownload = async (deliverableId: string, versionNumber: number, filename: string) => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:5000/api/deliverables/${deliverableId}/download/${versionNumber}`, { headers });
      if (!res.ok) throw new Error('Error al descargar archivo');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRequestApproval = async (deliverable: Deliverable) => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch('http://localhost:5000/api/approvals', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project: deliverable.project,
          itemType: 'Deliverable',
          itemId: deliverable._id,
          title: `Revisión de Entregable: ${deliverable.name} (Versión ${deliverable.versions.length})`,
          requiredApprovalsCount: 1
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al solicitar aprobación');
      }

      alert('Solicitud de aprobación académica enviada al panel con éxito.');
      await fetchDeliverables();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenReviewModal = (verNum: number) => {
    setReviewVerNum(verNum);
    const existingVer = selectedDeliverable?.versions.find(v => v.versionNumber === verNum);
    setAdvisorStatus((existingVer?.advisorApprovalStatus as any) || 'Approved');
    setAdvisorFeedback(existingVer?.advisorApprovalFeedback || '');
    setShowReviewModal(true);
  };

  const handleRegisterVersionReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeliverable || reviewVerNum === null) return;

    try {
      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:5000/api/deliverables/${selectedDeliverable._id}/version/${reviewVerNum}/approve`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          advisorApprovalStatus: advisorStatus,
          advisorApprovalFeedback: advisorFeedback
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al guardar la revisión');
      }

      await fetchDeliverables();
      setShowReviewModal(false);
      setReviewVerNum(null);
      setAdvisorFeedback('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Aprobado</span>;
      case 'ChangesRequested':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Cambios Solicitados</span>;
      case 'Finalized':
        return <span className="bg-zinc-900 text-white text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Congelado</span>;
      case 'InReview':
        return <span className="bg-indigo-100 text-indigo-800 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> En Revisión</span>;
      default:
        return <span className="bg-zinc-100 text-zinc-600 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Pendiente</span>;
    }
  };

  const getFileSizeString = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const currentMember = members.find(m => m.user?._id === user?._id);
  const projectRole = currentMember?.role;
  const isTeacherOrAdmin = !!(user && ['Admin', 'Docente', 'Coordinador'].includes(user.role));
  const isStudentEditor = !!(user && (user.role === 'Creador' || user.role === 'Editor' || projectRole === 'Admin' || projectRole === 'Editor'));
  const canEdit = isTeacherOrAdmin || isStudentEditor;

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950 text-white p-8 rounded-2xl shadow-xl">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight">Gestor de Entregables</h1>
          <p className="text-zinc-400 text-sm max-w-xl">
            Control formal de versiones oficiales para la entrega académica. Carga borradores, registra comentarios de autor y congela documentos aprobados.
          </p>
        </div>
        <div>
          {canEdit && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-zinc-950 font-bold hover:bg-zinc-100 rounded-xl transition-all shadow-md text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Entregable Hito</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Deliverables Hitos List (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-zinc-950 mb-4 uppercase tracking-wider font-mono">Entregables Requeridos</h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs text-zinc-500 font-mono">Cargando hitos...</p>
              </div>
            ) : deliverables.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 italic text-xs">
                No hay hitos de entregables creados.
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {deliverables.map(del => {
                  const isSelected = selectedDeliverable?._id === del._id;
                  return (
                    <div
                      key={del._id}
                      onClick={() => setSelectedDeliverable(del)}
                      className={`p-4 border rounded-xl shadow-xs transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-zinc-900 border-zinc-900 text-white' 
                          : 'bg-white border-zinc-200 text-zinc-900 hover:border-zinc-400'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                          isSelected ? 'text-zinc-300' : 'text-zinc-400'
                        }`}>
                          <Calendar className="w-3.5 h-3.5" />
                          Plazo: {new Date(del.dueDate).toLocaleDateString()}
                        </span>
                        <div className="scale-90 origin-right">
                          {getStatusBadge(del.status)}
                        </div>
                      </div>

                      <h3 className="text-xs font-bold truncate">{del.name}</h3>
                      <p className={`text-[11px] line-clamp-1 mt-1 ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {del.description || 'Sin descripción descriptiva.'}
                      </p>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-100/10 text-[10px] text-zinc-400">
                        <span>Versiones subidas: {del.versions.length}</span>
                        {del.versions.length > 0 && (
                          <span className="font-semibold text-zinc-400 font-mono">V{del.versions.length}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Document Versions list & upload area (7 Cols) */}
        <div className="lg:col-span-7">
          {selectedDeliverable ? (
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col h-full min-h-[500px]">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-5">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">Panel de Control de Entregable</h3>
                  <h2 className="text-base font-bold text-zinc-950 mt-1">{selectedDeliverable.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDeliverable.status === 'Approved' && isTeacherOrAdmin && (
                    <button
                      onClick={() => handleFreeze(selectedDeliverable._id)}
                      className="flex items-center gap-1.5 text-xs font-bold bg-zinc-950 text-white hover:bg-zinc-800 border border-zinc-950 px-3 py-1.5 rounded-lg transition-colors"
                      title="Congelar versión definitiva"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Congelar</span>
                    </button>
                  )}
                  {selectedDeliverable.status !== 'Finalized' && selectedDeliverable.versions.length > 0 && isStudentEditor && (
                    <button
                      onClick={() => handleRequestApproval(selectedDeliverable)}
                      className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors shadow-xs"
                      title="Solicitar aprobación del profesor"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Pedir Aprobación</span>
                    </button>
                  )}
                  {getStatusBadge(selectedDeliverable.status)}
                </div>
              </div>

              {selectedDeliverable.description && (
                <p className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 p-3 rounded-lg mb-6 leading-relaxed">
                  {selectedDeliverable.description}
                </p>
              )}

              {/* Version History Table */}
              <div className="flex-1 space-y-4 mb-6">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <History className="w-4 h-4 text-zinc-400" />
                  <span>Historial de Versiones (Versionamiento Físico)</span>
                </h4>

                {selectedDeliverable.versions.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 italic text-xs border border-dashed border-zinc-200 rounded-xl">
                    No se han subido versiones para este entregable.
                  </div>
                ) : (
                  <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-mono text-[10px] uppercase">
                            <th className="p-3 font-semibold">Ver.</th>
                            <th className="p-3 font-semibold">Archivo</th>
                            <th className="p-3 font-semibold">Subido por</th>
                            <th className="p-3 font-semibold text-right">Tamaño</th>
                            <th className="p-3 font-semibold text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-250">
                          {selectedDeliverable.versions.map((ver, idx) => (
                            <tr key={idx} className="hover:bg-zinc-50/50">
                              <td className="p-3 font-bold font-mono text-zinc-800">V{ver.versionNumber}</td>
                              <td className="p-3">
                                <div className="font-semibold text-zinc-900 truncate max-w-[200px]">{ver.filename}</div>
                                {ver.comment && (
                                  <div className="text-[10px] text-zinc-400 italic mt-0.5 truncate max-w-[200px]">
                                    "{ver.comment}"
                                  </div>
                                )}
                                
                                {/* Constancia de Revisión Aprobada */}
                                <div className="mt-2 space-y-1 bg-zinc-50 border border-zinc-200 p-2 rounded-lg text-[10px] max-w-[250px]">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-zinc-400 uppercase tracking-wider text-[8px] font-mono">Constancia:</span>
                                    {ver.advisorApprovalStatus === 'Approved' ? (
                                      <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-250 font-bold rounded uppercase text-[8px]">Conforme</span>
                                    ) : ver.advisorApprovalStatus === 'ChangesRequested' ? (
                                      <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-250 font-bold rounded uppercase text-[8px]">Observado</span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 bg-zinc-100 text-zinc-500 border border-zinc-200 font-bold rounded uppercase text-[8px]">Pendiente</span>
                                    )}
                                  </div>
                                  {ver.advisorApprovalFeedback ? (
                                    <p className="text-zinc-650 italic mt-1 font-sans">
                                      "{ver.advisorApprovalFeedback}"
                                    </p>
                                  ) : (
                                    <p className="text-zinc-400 italic mt-1 font-sans">Sin comentarios de supervisión.</p>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="font-semibold text-zinc-800 block truncate max-w-[100px]">{ver.uploadedByName}</span>
                                <span className="text-[9px] text-zinc-400 font-mono block">
                                  {new Date(ver.createdAt).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono text-zinc-500">{getFileSizeString(ver.fileSize)}</td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleDownload(selectedDeliverable._id, ver.versionNumber, ver.filename)}
                                    className="p-1.5 border border-zinc-200 hover:border-zinc-400 rounded hover:bg-zinc-100 transition-all text-zinc-600 inline-flex items-center justify-center"
                                    title="Descargar esta versión"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  
                                  {(user?.role === 'Docente' || user?.role === 'Evaluador' || user?.role === 'Coordinador') && (
                                    <button
                                      onClick={() => handleOpenReviewModal(ver.versionNumber)}
                                      className="px-2 py-1 bg-zinc-950 text-white hover:bg-zinc-800 rounded text-[9px] font-extrabold uppercase tracking-wider transition-all"
                                      title="Registrar Constancia de Revisión"
                                    >
                                      Evaluar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Version Upload Area (only if not Finalized / Frozen) */}
              {selectedDeliverable.status !== 'Finalized' && canEdit ? (
                <form onSubmit={handleUploadVersion} className="border-t border-zinc-150 pt-5 space-y-4">
                  <h4 className="text-xs font-bold text-zinc-950 uppercase tracking-wider font-mono">Subir Nueva Versión (Incremento V{selectedDeliverable.versions.length + 1})</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-500 font-mono uppercase">Archivo (PDF, ZIP, Word)</label>
                      <input
                        type="file"
                        required
                        ref={fileInputRef}
                        onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                        className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 focus:outline-none file:mr-2.5 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-zinc-900 file:text-white file:hover:bg-zinc-800 file:cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-500 font-mono uppercase">Comentario de Versión</label>
                      <input
                        type="text"
                        value={uploadComment}
                        onChange={e => setUploadComment(e.target.value)}
                        placeholder="Ej: Corregido capítulo 2 según feedback."
                        className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploading ? 'Subiendo archivo...' : 'Cargar Nueva Versión'}</span>
                  </button>
                </form>
              ) : selectedDeliverable.status === 'Finalized' ? (
                <div className="bg-zinc-900 border border-zinc-900 text-white text-xs rounded-xl p-4 flex items-center gap-3 justify-center shadow-md">
                  <Lock className="w-5 h-5 text-amber-400 animate-pulse" />
                  <span>Este entregable ha sido congelado y cerrado como versión definitiva. No se admiten más cargas.</span>
                </div>
              ) : (
                <div className="bg-zinc-50 border border-zinc-200 text-zinc-500 text-xs rounded-xl p-3 text-center italic">
                  No tienes permisos de Edición para subir nuevas versiones físicas.
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center shadow-sm h-full flex flex-col justify-center items-center min-h-[500px]">
              <FileText className="w-12 h-12 text-zinc-300 mb-3" />
              <h3 className="text-sm font-bold text-zinc-950">Selecciona un Hito</h3>
              <p className="text-xs text-zinc-400 max-w-xs mt-1">
                Haz clic en cualquier entregable de la lista para gestionar las versiones físicas oficiales del proyecto de tesis.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Deliverable Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-scale-in">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h3 className="font-extrabold text-zinc-950 text-base">Crear Hito de Entregable</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-zinc-950 font-bold text-sm"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateDeliverable} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-500 font-mono uppercase">Nombre del Entregable</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ej: Informe Parcial: Capítulos 1-3"
                  className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-500 font-mono uppercase">Descripción / Objetivos</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Escribe detalles del contenido esperado en esta entrega académica..."
                  className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 focus:outline-none focus:border-zinc-500 min-h-[80px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-500 font-mono uppercase">Fecha Límite (Entrega Oficial)</label>
                <input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={e => setNewDueDate(e.target.value)}
                  className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Hito Entregable</span>
              </button>

            </form>
          </div>
        </div>
      )}

      {/* Faculty Version Review Modal */}
      {showReviewModal && reviewVerNum !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-scale-in text-left">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-extrabold text-zinc-950 text-base">Registrar Constancia de Revisión</h3>
                <p className="text-[10px] text-zinc-400 font-mono mt-0.5">VERSIÓN V{reviewVerNum} &bull; {selectedDeliverable?.name}</p>
              </div>
              <button 
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewVerNum(null);
                }}
                className="text-zinc-400 hover:text-zinc-950 font-bold text-sm"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleRegisterVersionReview} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-500 font-mono uppercase block">Veredicto de Supervisión</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdvisorStatus('Approved')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      advisorStatus === 'Approved'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-100'
                        : 'bg-white text-zinc-650 border-zinc-250 hover:bg-zinc-50'
                    }`}
                  >
                    Conforme (Aprobar)
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdvisorStatus('ChangesRequested')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      advisorStatus === 'ChangesRequested'
                        ? 'bg-amber-50 text-amber-850 border-amber-300 ring-2 ring-amber-100'
                        : 'bg-white text-zinc-650 border-zinc-250 hover:bg-zinc-50'
                    }`}
                  >
                    Observado (Solicitar Cambios)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-500 font-mono uppercase">Observaciones y Retroalimentación</label>
                <textarea
                  required
                  value={advisorFeedback}
                  onChange={e => setAdvisorFeedback(e.target.value)}
                  placeholder="Justifica detalladamente tu decisión o describe las correcciones obligatorias que el estudiante debe aplicar para la siguiente versión..."
                  className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 focus:outline-none focus:border-zinc-500 min-h-[100px]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Guardar Constancia de Revisión</span>
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Deliverables;

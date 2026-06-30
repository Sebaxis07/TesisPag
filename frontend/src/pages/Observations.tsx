import React, { useEffect, useState, useCallback } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  Filter, 
  ArrowRight, 
  Send,
  AlertCircle,
  CornerDownRight,
  UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Reply {
  _id?: string;
  user: string;
  userName: string;
  content: string;
  createdAt: string;
}

interface Comment {
  _id: string;
  project: string;
  user: string;
  userName: string;
  resourceType: 'requirement' | 'meeting' | 'adr' | 'diagram' | 'task' | 'report';
  resourceId: string;
  content: string;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  replies: Reply[];
  createdAt: string;
  updatedAt: string;
}

export const Observations: React.FC = () => {
  const { activeProject } = useProjectStore();
  const { getAuthHeaders } = useAuthStore();
  const navigate = useNavigate();

  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [replyText, setReplyText] = useState<string>('');
  const [, setError] = useState<string | null>(null);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [professorOnly, setProfessorOnly] = useState<boolean>(false);

  const fetchComments = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:5000/api/comments/project/${activeProject._id}`, { headers });
      if (!res.ok) {
        throw new Error('Error al obtener las observaciones');
      }
      const data: Comment[] = await res.json();
      setComments(data);
      
      // Keep selected comment reference updated
      if (selectedComment) {
        const updated = data.find(c => c._id === selectedComment._id);
        if (updated) setSelectedComment(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [activeProject, getAuthHeaders, selectedComment]);

  useEffect(() => {
    fetchComments();
  }, [activeProject]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComment || !replyText.trim()) return;

    try {
      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:5000/api/comments/${selectedComment._id}/reply`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: replyText })
      });

      if (!res.ok) {
        throw new Error('Error al enviar respuesta');
      }

      const updatedComment: Comment = await res.json();
      
      // Update local state
      setComments(prev => prev.map(c => c._id === updatedComment._id ? updatedComment : c));
      setSelectedComment(updatedComment);
      setReplyText('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResolve = async (commentId: string) => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:5000/api/comments/${commentId}/resolve`, {
        method: 'PATCH',
        headers
      });

      if (!res.ok) {
        throw new Error('Error al resolver el comentario');
      }

      const updatedComment: Comment = await res.json();
      
      setComments(prev => prev.map(c => c._id === updatedComment._id ? updatedComment : c));
      if (selectedComment && selectedComment._id === commentId) {
        setSelectedComment(updatedComment);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getResourceTypeName = (type: string) => {
    switch (type) {
      case 'requirement': return 'Requerimiento';
      case 'meeting': return 'Reunión';
      case 'adr': return 'Decisión Arquitectónica (ADR)';
      case 'diagram': return 'Diagrama';
      case 'task': return 'Tarea';
      case 'report': return 'Informe de Tesis';
      default: return type;
    }
  };

  const navigateToResource = (comment: Comment) => {
    switch (comment.resourceType) {
      case 'requirement':
        navigate('/requerimientos');
        break;
      case 'meeting':
        navigate('/reuniones');
        break;
      case 'adr':
        navigate('/arquitectura');
        break;
      case 'diagram':
        navigate('/diagramas');
        break;
      case 'report':
        navigate('/informes');
        break;
      default:
        break;
    }
  };

  // Filter logic
  const filteredComments = comments.filter(c => {
    // Status filter
    if (statusFilter === 'open' && c.isResolved) return false;
    if (statusFilter === 'resolved' && !c.isResolved) return false;

    // Type filter
    if (typeFilter !== 'all' && c.resourceType !== typeFilter) return false;

    // Professor only filter (comments where user name contains 'Profesor', or user role might be Viewer)
    // For simplicity, we can also check if the userName/role matches, or if we filter out Admin/Editor comments
    if (professorOnly && !c.userName.toLowerCase().includes('profesor') && !c.userName.toLowerCase().includes('guia')) {
      return false;
    }

    return true;
  });

  const totalOpen = comments.filter(c => !c.isResolved).length;
  const totalResolved = comments.filter(c => c.isResolved).length;
  const totalProf = comments.filter(c => !c.isResolved && (c.userName.toLowerCase().includes('profesor') || c.userName.toLowerCase().includes('guia'))).length;

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950 text-white p-8 rounded-2xl shadow-xl">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight">Panel de Observaciones</h1>
          <p className="text-zinc-400 text-sm max-w-xl">
            Centralización y gestión de comentarios, revisiones y observaciones académicas de profesores y del equipo de desarrollo.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => fetchComments()}
            className="px-4 py-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-zinc-500 block uppercase tracking-wider font-mono">Pendientes</span>
            <span className="text-2xl font-bold text-zinc-950 font-mono">{totalOpen}</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-zinc-500 block uppercase tracking-wider font-mono">Resueltas</span>
            <span className="text-2xl font-bold text-zinc-950 font-mono">{totalResolved}</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-zinc-500 block uppercase tracking-wider font-mono">Feedback de Profesores</span>
            <span className="text-2xl font-bold text-zinc-950 font-mono">{totalProf}</span>
          </div>
        </div>
      </div>

      {/* Grid Layout for filters, list and details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Filters and List (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 font-semibold text-sm text-zinc-900 border-b border-zinc-100 pb-3">
              <Filter className="w-4 h-4 text-zinc-400" />
              <span>Filtros de Búsqueda</span>
            </div>

            {/* Filter by Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500">Estado</label>
              <div className="grid grid-cols-3 gap-2">
                {(['all', 'open', 'resolved'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-medium border capitalize transition-colors ${
                      statusFilter === status
                        ? 'bg-zinc-900 border-zinc-950 text-white'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    {status === 'all' ? 'Todos' : status === 'open' ? 'Pendientes' : 'Resueltos'}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter by Resource Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500">Módulo u Origen</label>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 focus:outline-none focus:border-zinc-500"
              >
                <option value="all">Cualquiera</option>
                <option value="requirement">Requerimientos</option>
                <option value="meeting">Reuniones</option>
                <option value="adr">Decisiones Arquitectónicas (ADRs)</option>
                <option value="diagram">Diagramas</option>
                <option value="report">Informes</option>
              </select>
            </div>

            {/* Professor Filter Checkbox */}
            <label className="flex items-center gap-2.5 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={professorOnly}
                onChange={e => setProfessorOnly(e.target.checked)}
                className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-4 h-4"
              />
              <span className="text-xs font-semibold text-zinc-700">Ver comentarios pendientes de Profesores</span>
            </label>
          </div>

          {/* Comment List */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {loading ? (
              <div className="text-center py-12 bg-white border border-zinc-200 rounded-xl">
                <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs text-zinc-500 font-mono">Cargando observaciones...</p>
              </div>
            ) : filteredComments.length === 0 ? (
              <div className="text-center py-12 bg-white border border-zinc-200 rounded-xl p-6">
                <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                <p className="text-xs font-medium text-zinc-600">No se encontraron observaciones</p>
                <p className="text-[11px] text-zinc-400 mt-1">Intenta ajustando los filtros.</p>
              </div>
            ) : (
              filteredComments.map(comment => {
                const isSelected = selectedComment?._id === comment._id;
                return (
                  <div
                    key={comment._id}
                    onClick={() => setSelectedComment(comment)}
                    className={`p-4 border rounded-xl shadow-xs transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-zinc-900 border-zinc-900 text-white' 
                        : 'bg-white border-zinc-200 text-zinc-900 hover:border-zinc-400'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                        isSelected 
                          ? 'bg-zinc-800 text-zinc-200' 
                          : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {getResourceTypeName(comment.resourceType)}
                      </span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                        comment.isResolved
                          ? 'bg-emerald-100 text-emerald-800'
                          : comment.replies.length > 0
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {comment.isResolved 
                          ? 'Resuelto' 
                          : comment.replies.length > 0 
                          ? 'Respondido' 
                          : 'Abierto'}
                      </span>
                    </div>

                    <p className={`text-xs line-clamp-2 ${isSelected ? 'text-zinc-300' : 'text-zinc-600'}`}>
                      {comment.content}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-100/10 text-[10px] text-zinc-400">
                      <span className="font-semibold truncate max-w-[120px]">{comment.userName}</span>
                      <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Thread (7 Cols) */}
        <div className="lg:col-span-7">
          {selectedComment ? (
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col h-full min-h-[500px]">
              
              {/* Thread Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-6">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">Detalle de Observación</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold text-zinc-950">
                      Origen: {getResourceTypeName(selectedComment.resourceType)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigateToResource(selectedComment)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 border border-zinc-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <span>Ir al Recurso</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  {!selectedComment.isResolved && (
                    <button
                      onClick={() => handleResolve(selectedComment._id)}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors shadow-xs"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Resolver</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Main Message Card */}
              <div className="bg-zinc-50 border border-zinc-100 p-4 rounded-xl mb-6 relative">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600 font-bold text-xs uppercase font-mono shadow-xs">
                    {selectedComment.userName.charAt(0)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 block">{selectedComment.userName}</span>
                    <span className="text-[10px] text-zinc-400 block font-mono">
                      {new Date(selectedComment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {selectedComment.isResolved && (
                    <span className="ml-auto bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Resuelto
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                  {selectedComment.content}
                </p>
              </div>

              {/* Replies Thread */}
              <div className="flex-1 space-y-4 overflow-y-auto mb-6 pr-2 max-h-[300px]">
                {selectedComment.replies.length === 0 ? (
                  <div className="text-center py-6 text-xs text-zinc-400 italic">
                    No hay respuestas en este hilo académico.
                  </div>
                ) : (
                  selectedComment.replies.map((reply, idx) => (
                    <div key={idx} className="flex gap-3 pl-4 relative">
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-zinc-100"></div>
                      <div className="mt-1">
                        <CornerDownRight className="w-4 h-4 text-zinc-300" />
                      </div>
                      <div className="flex-1 bg-white border border-zinc-100 p-3 rounded-lg shadow-xs">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-bold text-zinc-800">{reply.userName}</span>
                          <span className="text-[9px] text-zinc-400 font-mono">
                            {new Date(reply.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 leading-normal">
                          {reply.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reply Form */}
              {!selectedComment.isResolved ? (
                <form onSubmit={handleReply} className="border-t border-zinc-100 pt-4 flex gap-3">
                  <input
                    type="text"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Escribe tu respuesta aclaratoria o técnica..."
                    className="flex-1 text-xs border border-zinc-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 bg-zinc-50"
                  />
                  <button
                    type="submit"
                    className="bg-zinc-950 text-white hover:bg-zinc-800 p-2.5 rounded-lg transition-colors flex items-center justify-center shadow-xs"
                    title="Enviar respuesta"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-lg p-3 flex items-center gap-2 justify-center">
                  <CheckCircle className="w-4 h-4" />
                  <span>Este hilo ha sido resuelto y cerrado por {selectedComment.userName}.</span>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center shadow-sm h-full flex flex-col justify-center items-center min-h-[500px]">
              <MessageSquare className="w-12 h-12 text-zinc-300 mb-3" />
              <h3 className="text-sm font-bold text-zinc-950">Selecciona una Observación</h3>
              <p className="text-xs text-zinc-400 max-w-xs mt-1">
                Haz clic en cualquier observación de la lista para ver el hilo completo de comentarios y respuestas académicas.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
export default Observations;

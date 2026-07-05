import React, { useEffect, useState } from 'react';
import { useProjectStore } from '../../store/ProjectStore';
import { useAuthStore } from '../../store/AuthStore';
import { X, Send, CheckCircle2, MessageSquare, CornerDownRight, ShieldAlert } from 'lucide-react';

interface Reply {
  user: string;
  userName: string;
  content: string;
  createdAt: string;
}

interface Comment {
  _id: string;
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
}

interface CommentsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommentsSidebar: React.FC<CommentsSidebarProps> = ({ isOpen, onClose }) => {
  const { activeProject, members } = useProjectStore();
  const { user: currentUser } = useAuthStore();

  const [comments, setComments] = useState<Comment[]>([]);
  const [filterMode, setFilterMode] = useState<'module' | 'all'>('module');
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

  const getModuleMapping = (pathname: string): { type: string; id: string } => {
    // Determine the contextual resource depending on current route
    if (pathname.includes('/arquitectura')) return { type: 'adr', id: 'adr-general' };
    if (pathname.includes('/requerimientos')) return { type: 'requirement', id: 'req-general' };
    if (pathname.includes('/diagramas')) return { type: 'diagram', id: 'diagram-general' };
    if (pathname.includes('/reuniones')) return { type: 'meeting', id: 'meeting-general' };
    if (pathname.includes('/informes')) return { type: 'report', id: 'report-general' };
    return { type: 'task', id: 'task-general' };
  };

  const currentModule = getModuleMapping(window.location.pathname);

  // Fetch project comments
  const fetchComments = async () => {
    if (!activeProject) return;
    try {
      const response = await fetch(`${API_URL}/comments/project/${activeProject._id}`, {
        headers: useAuthStore.getState().getAuthHeaders(),
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  useEffect(() => {
    if (isOpen && activeProject) {
      fetchComments();
    }
  }, [isOpen, activeProject, window.location.pathname]);

  // Check user canComment permission
  const getCanComment = () => {
    if (!currentUser || !members) return true;
    const member = members.find((m: any) => {
      const uId = (m.user as any)?._id || m.user;
      return uId === currentUser._id;
    });
    return member ? member.canComment !== false : true;
  };

  const canComment = getCanComment();

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !activeProject || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...useAuthStore.getState().getAuthHeaders()
        },
        body: JSON.stringify({
          project: activeProject._id,
          resourceType: currentModule.type,
          resourceId: currentModule.id,
          content: newCommentText.trim()
        }),
        credentials: 'include'
      });

      if (response.ok) {
        setNewCommentText('');
        fetchComments();
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (commentId: string) => {
    const text = replyTexts[commentId];
    if (!text || !text.trim()) return;

    try {
      const response = await fetch(`${API_URL}/comments/${commentId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...useAuthStore.getState().getAuthHeaders()
        },
        body: JSON.stringify({ content: text.trim() }),
        credentials: 'include'
      });

      if (response.ok) {
        setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
        fetchComments();
      }
    } catch (err) {
      console.error('Error adding reply:', err);
    }
  };

  const handleResolve = async (commentId: string) => {
    try {
      const response = await fetch(`${API_URL}/comments/${commentId}/resolve`, {
        method: 'PATCH',
        headers: useAuthStore.getState().getAuthHeaders(),
        credentials: 'include'
      });

      if (response.ok) {
        fetchComments();
      }
    } catch (err) {
      console.error('Error resolving comment:', err);
    }
  };

  if (!isOpen) return null;

  // Filter comments depending on selection
  const filteredComments = comments.filter((c) => {
    if (filterMode === 'all') return true;
    return c.resourceType === currentModule.type;
  });

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 flex flex-col text-zinc-100 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-zinc-950/80 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold font-mono">Observaciones del Proyecto</h3>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-zinc-850 text-zinc-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Toggle */}
      <div className="p-3 bg-zinc-950/40 border-b border-zinc-800/60 grid grid-cols-2 gap-1 text-xs font-semibold font-mono">
        <button
          onClick={() => setFilterMode('module')}
          className={`py-1.5 rounded-lg transition-all ${
            filterMode === 'module' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Este Módulo ({currentModule.type.toUpperCase()})
        </button>
        <button
          onClick={() => setFilterMode('all')}
          className={`py-1.5 rounded-lg transition-all ${
            filterMode === 'all' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Todo el Proyecto
        </button>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredComments.length === 0 ? (
          <div className="text-center text-xs text-zinc-500 py-12">
            No hay comentarios registrados {filterMode === 'module' ? 'en este módulo' : 'en el proyecto'}.
          </div>
        ) : (
          filteredComments.map((comment) => (
            <div
              key={comment._id}
              className={`p-3.5 rounded-xl border transition-all ${
                comment.isResolved
                  ? 'bg-zinc-950/30 border-zinc-900/60 opacity-60'
                  : 'bg-zinc-950/60 border-zinc-800/80 shadow-md'
              }`}
            >
              {/* Comment Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-white">{comment.userName}</span>
                  <span className="text-[9px] text-zinc-500 font-mono ml-2">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                  <div className="text-[9px] text-zinc-400 font-mono mt-0.5 bg-zinc-900 px-1.5 py-0.5 rounded inline-block">
                    {comment.resourceType.toUpperCase()}
                  </div>
                </div>

                {!comment.isResolved && (
                  <button
                    onClick={() => handleResolve(comment._id)}
                    className="p-1 text-[10px] text-emerald-400 hover:bg-emerald-950/40 rounded border border-emerald-900/30 flex items-center gap-1 font-mono transition-all"
                    title="Marcar como resuelto"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Resolver
                  </button>
                )}
              </div>

              {/* Comment Content */}
              <p className="text-xs text-zinc-300 mt-2 whitespace-pre-wrap">{comment.content}</p>

              {/* Thread Replies */}
              {comment.replies.length > 0 && (
                <div className="mt-3.5 pt-3.5 border-t border-zinc-900 space-y-2.5">
                  {comment.replies.map((reply, idx) => (
                    <div key={idx} className="flex gap-2 text-xs">
                      <CornerDownRight className="w-3.5 h-3.5 text-zinc-650 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-semibold text-zinc-200">{reply.userName}</span>
                        <p className="text-zinc-400 mt-0.5">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Form */}
              {!comment.isResolved && canComment && (
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    placeholder="Responder..."
                    value={replyTexts[comment._id] || ''}
                    onChange={(e) =>
                      setReplyTexts((prev) => ({ ...prev, [comment._id]: e.target.value }))
                    }
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                  />
                  <button
                    onClick={() => handleAddReply(comment._id)}
                    className="p-1 px-2.5 bg-indigo-650 hover:bg-indigo-600 rounded text-white text-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Main Comment Input */}
      <div className="p-4 bg-zinc-950/80 border-t border-zinc-800">
        {canComment ? (
          <form onSubmit={handleAddComment} className="space-y-3">
            <textarea
              placeholder={`Agregar observación en ${currentModule.type.toUpperCase()}...`}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              rows={2}
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 resize-none"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 py-2 bg-white hover:bg-zinc-250 text-zinc-950 text-xs font-semibold rounded-lg transition-colors font-mono"
            >
              {isSubmitting ? 'Publicando...' : 'Publicar Comentario'}
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-3 flex items-start gap-2.5 text-xs text-amber-300">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Tu cuenta tiene asignados permisos de Solo Lectura. No puedes publicar ni responder comentarios.</p>
          </div>
        )}
      </div>
    </div>
  );
};

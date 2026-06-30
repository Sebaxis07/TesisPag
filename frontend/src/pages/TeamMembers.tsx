import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { Users, Plus, Trash2, ShieldAlert, Share2, Copy, Check } from 'lucide-react';

export const TeamMembers: React.FC = () => {
  const { activeProject, members, fetchMembers, addMember, removeMember } = useProjectStore();
  const { user: currentUser } = useAuthStore();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [projectRole, setProjectRole] = useState<'Admin' | 'Editor' | 'Viewer'>('Editor');
  const [operationalRole, setOperationalRole] = useState('Full Stack Developer');
  const [workload, setWorkload] = useState(30);

  // Invitation Modal States
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCanComment, setInviteCanComment] = useState(true);
  const [inviteDays, setInviteDays] = useState(7);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchInvites = async () => {
    if (!activeProject) return;
    try {
      const response = await fetch(`http://localhost:5000/api/invites/project/${activeProject._id}`, {
        headers: useAuthStore.getState().getAuthHeaders(),
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setInvites(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    const emailToSubmit = inviteEmail.trim() || `observador.general+${Math.floor(100000 + Math.random() * 900000)}@thesisflow.cl`;

    try {
      const response = await fetch(`http://localhost:5000/api/invites/project/${activeProject._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...useAuthStore.getState().getAuthHeaders()
        },
        body: JSON.stringify({
          email: emailToSubmit,
          canComment: inviteCanComment,
          expiresInDays: inviteDays
        }),
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setGeneratedLink(data.inviteLink);
        setInviteEmail('');
        fetchInvites();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const member = members.find(m => {
    const uId = (m.user as any)?._id || m.user;
    return uId === currentUser?._id;
  });
  const isProjectManager = member ? member.role === 'Admin' || member.role === 'Editor' : false;

  useEffect(() => {
    if (activeProject) {
      fetchMembers(activeProject._id);
      
      // Fetch all system users to add members from
      const fetchAllUsers = async () => {
        try {
          const API_URL = 'http://localhost:5000/api';
          const headers = useAuthStore.getState().getAuthHeaders();
          const response = await fetch(`${API_URL}/auth/users`, { headers });
          if (response.ok) {
            const data = await response.json();
            setAvailableUsers(data);
            if (data.length > 0) setSelectedUserId(data[0]._id);
          }
        } catch (err) {
          console.error(err);
        }
      };

      fetchAllUsers();
    }
  }, [activeProject, fetchMembers]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !selectedUserId) return;
    
    const success = await addMember(activeProject._id, {
      userId: selectedUserId,
      role: projectRole,
      operationalRole,
      workload
    });

    if (success) {
      setShowAddModal(false);
      setProjectRole('Editor');
      setOperationalRole('Full Stack Developer');
      setWorkload(30);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (confirm('¿Estás seguro de eliminar a este miembro del proyecto?')) {
      await removeMember(memberId);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-zinc-200 rounded-lg bg-white p-8">
        <Users className="w-8 h-8 text-zinc-400 mb-2" />
        <span className="text-sm text-zinc-500">Selecciona un proyecto para gestionar su equipo de trabajo.</span>
      </div>
    );
  }

  // Filter out users already in the project members list
  const nonMemberUsers = availableUsers.filter(
    u => !members.some(m => m.user?._id === u._id)
  );

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight">Gestión del Equipo y Roles</h1>
          <p className="text-sm text-zinc-500 mt-1">Asigna privilegios, roles de desarrollo y mide la carga horaria comprometida.</p>
        </div>
        <div className="flex items-center gap-2">
          {isProjectManager && (
            <button
              onClick={() => {
                setShowInviteModal(true);
                fetchInvites();
              }}
              className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-bold px-3.5 py-2 rounded transition-colors"
            >
              <Share2 className="w-4 h-4" /> Invitar Evaluador/Profesor
            </button>
          )}
          {currentUser?.role === 'Admin' && (
            <button
              onClick={() => {
                if (nonMemberUsers.length > 0) setSelectedUserId(nonMemberUsers[0]._id);
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3.5 py-2 rounded transition-colors"
            >
              <Plus className="w-4 h-4" /> Asignar Miembro
            </button>
          )}
        </div>
      </div>

      {/* Team grid list */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {members.map(member => (
          <div key={member._id} className="bg-white border border-zinc-200 rounded-lg p-6 flex flex-col justify-between shadow-sm relative group">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-bold text-black">{member.user?.name || 'Usuario Externo'}</span>
                <span className="text-[9px] font-mono bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded uppercase font-semibold">
                  {member.role}
                </span>
              </div>
              <span className="text-xs text-zinc-400 block mb-4 truncate">{member.user?.rut}</span>
              
              <div className="space-y-2 border-t border-zinc-100 pt-4">
                <div>
                  <span className="text-[9px] font-mono text-zinc-400 uppercase block">Rol Operativo:</span>
                  <span className="text-xs font-medium text-zinc-950">{member.operationalRole}</span>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-zinc-400 uppercase block">Carga de Trabajo:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-black h-full" 
                        style={{ width: `${Math.min(member.workload, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-zinc-950">{member.workload}%</span>
                  </div>
                </div>
              </div>
            </div>

            {currentUser?.role === 'Admin' && (
              <div className="mt-6 pt-4 border-t border-zinc-100 flex justify-end">
                <button
                  onClick={() => handleRemoveMember(member._id)}
                  className="text-zinc-300 hover:text-red-600 transition-colors p-1"
                  title="Remover Miembro"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {members.length === 0 && (
        <div className="text-center bg-white border border-zinc-200 rounded-lg py-16 px-4">
          <Users className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">No hay integrantes asignados a este proyecto todavía.</p>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 max-w-md w-full shadow-lg">
            <h3 className="text-base font-bold text-black mb-4">Asignar Integrante al Proyecto</h3>
            
            {nonMemberUsers.length > 0 ? (
              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Seleccionar Usuario</label>
                  <select
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black"
                  >
                    {nonMemberUsers.map(u => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.rut})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Permiso del Proyecto</label>
                  <select
                    value={projectRole}
                    onChange={e => setProjectRole(e.target.value as any)}
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black"
                  >
                    <option value="Admin">Admin (Control Total)</option>
                    <option value="Editor">Editor (Modificar Contenido)</option>
                    <option value="Viewer">Viewer (Solo lectura)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Rol Operativo</label>
                  <input
                    type="text"
                    required
                    value={operationalRole}
                    onChange={e => setOperationalRole(e.target.value)}
                    placeholder="Ej: Líder Técnico, Diseñador UX"
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Carga Horaria / Compromiso (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={workload}
                    onChange={e => setWorkload(parseInt(e.target.value))}
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black"
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
                    Asignar Integrante
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded border border-amber-100">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span className="text-xs">No hay usuarios disponibles en el sistema para asignar. Pide a tus compañeros que se registren en la pantalla de Login primero.</span>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 py-1.5 text-xs text-zinc-950 font-bold border border-zinc-200 rounded hover:bg-zinc-50 transition-colors"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 max-w-lg w-full shadow-lg space-y-6 my-8">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-black flex items-center gap-2">
                <Share2 className="w-4 h-4 text-zinc-500" />
                Invitar Evaluador o Profesor
              </h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setGeneratedLink('');
                }}
                className="text-xs text-zinc-400 hover:text-zinc-950 font-mono font-bold"
              >
                CERRAR
              </button>
            </div>

            <form onSubmit={handleGenerateInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-455 uppercase mb-1">Email del Invitado (Opcional - dejar en blanco para link general)</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="ej: profesor.guia@universidad.cl (opcional)"
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-350"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Duración del Link</label>
                  <select
                    value={inviteDays}
                    onChange={(e) => setInviteDays(Number(e.target.value))}
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black"
                  >
                    <option value={1}>1 Día</option>
                    <option value={3}>3 Días</option>
                    <option value={7}>7 Días</option>
                    <option value={30}>30 Días</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inviteCanComment}
                      onChange={(e) => setInviteCanComment(e.target.checked)}
                      className="w-4 h-4 text-black border-zinc-300 rounded focus:ring-black"
                    />
                    <span className="text-xs text-zinc-700 font-medium">Permitir Comentarios</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-black text-white hover:bg-zinc-800 text-xs font-bold px-4 py-2 rounded transition-colors font-mono"
                >
                  Generar Enlace
                </button>
              </div>
            </form>

            {generatedLink && (
              <div className="bg-zinc-50 border border-zinc-200 rounded p-4 space-y-2">
                <div className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Link de Invitación:</div>
                <div className="flex items-center gap-2 bg-white border border-zinc-250 p-2.5 rounded">
                  <span className="text-xs text-zinc-700 font-mono select-all truncate flex-1">{generatedLink}</span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="p-1 hover:bg-zinc-100 rounded text-zinc-650 transition-all shrink-0"
                  >
                    {copied ? <Check className="w-4.5 h-4.5 text-emerald-600" /> : <Copy className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* List */}
            <div className="border-t border-zinc-100 pt-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">Enlaces Generados</h4>
              {invites.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No hay invitaciones registradas en este proyecto.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                  {invites.map((inv) => (
                    <div key={inv._id} className="flex justify-between items-center p-2.5 bg-zinc-50 border border-zinc-150 rounded text-xs">
                      <div>
                        <div className="font-semibold text-zinc-800">{inv.email}</div>
                        <div className="text-[10px] text-zinc-400">Expira: {new Date(inv.expiresAt).toLocaleDateString()} | Comentarios: {inv.canComment ? 'Sí' : 'No'}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono ${
                        inv.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                        inv.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-zinc-150 text-zinc-500'
                      }`}>
                        {inv.status === 'Pending' ? 'Pendiente' :
                         inv.status === 'Accepted' ? 'Aceptado' :
                         inv.status === 'Expired' ? 'Expirado' : 'Revocado'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import {
  Users, Trash2, ShieldAlert, Share2, Copy, Check,
  Edit2, Save, X, Search, AlertTriangle, ChevronDown, ChevronUp,
  Shield, Eye, Pencil, Clock, UserMinus, UserPlus
} from 'lucide-react';

const API = 'http://localhost:5000/api';

type ProjectRole = 'Admin' | 'Editor' | 'Viewer';

export const TeamMembers: React.FC = () => {
  const { activeProject, members, fetchMembers, addMember, removeMember } = useProjectStore();
  const { user: currentUser, getAuthHeaders } = useAuthStore();

  // Add member modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [projectRole, setProjectRole] = useState<ProjectRole>('Editor');
  const [operationalRole, setOperationalRole] = useState('Full Stack Developer');
  const [workload, setWorkload] = useState(30);
  const [addNote, setAddNote] = useState('');

  // Remove member modal
  const [removingMember, setRemovingMember] = useState<any | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [removeConfirm, setRemoveConfirm] = useState('');

  // Edit member inline
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<ProjectRole>('Editor');
  const [editOpRole, setEditOpRole] = useState('');
  const [editWorkload, setEditWorkload] = useState(0);

  // UI
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Invitation
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
  const isAdmin = member?.role === 'Admin' || currentUser?.role === 'Admin';
  const isProjectManager = member ? member.role === 'Admin' || member.role === 'Editor' : false;

  useEffect(() => {
    if (activeProject) {
      fetchMembers(activeProject._id);
      fetchAllUsers();
      fetchInvites();
    }
  }, [activeProject]);

  const fetchAllUsers = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API}/auth/users`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAvailableUsers(data);
        if (data.length > 0) setSelectedUserId(data[0]._id);
      }
    } catch (err) { console.error(err); }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !selectedUserId) return;
    const success = await addMember(activeProject._id, { userId: selectedUserId, role: projectRole, operationalRole, workload });
    if (success) {
      setShowAddModal(false);
      setProjectRole('Editor');
      setOperationalRole('Full Stack Developer');
      setWorkload(30);
      setAddNote('');
    }
  };

  const openRemoveModal = (m: any) => {
    setRemovingMember(m);
    setRemoveReason('');
    setRemoveConfirm('');
  };

  const handleConfirmRemove = async () => {
    if (!removingMember || removeConfirm !== 'CONFIRMAR') return;
    const ok = await removeMember(removingMember._id);
    if (ok) { setRemovingMember(null); setRemoveReason(''); setRemoveConfirm(''); }
  };

  const startEdit = (m: any) => {
    setEditingMemberId(m._id);
    setEditRole(m.role);
    setEditOpRole(m.operationalRole);
    setEditWorkload(m.workload);
  };

  const handleUpdateMember = async (memberId: string) => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API}/projects/members/${memberId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole, operationalRole: editOpRole, workload: editWorkload })
      });
      if (res.ok) {
        if (activeProject) await fetchMembers(activeProject._id);
        setEditingMemberId(null);
      } else {
        const d = await res.json();
        alert(d.message || 'Error al actualizar miembro.');
      }
    } catch (err) { console.error(err); }
  };

  const filteredMembers = members.filter(m =>
    (m.user?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.operationalRole || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const staffRoles = ['Docente', 'Evaluador', 'Coordinador'];
  const studentTeam = filteredMembers.filter(m => !staffRoles.includes(m.user?.role));
  const academicStaff = filteredMembers.filter(m => staffRoles.includes(m.user?.role));

  const studentMembersCount = members.filter(m => !staffRoles.includes(m.user?.role)).length;
  const staffMembersCount = members.filter(m => staffRoles.includes(m.user?.role)).length;
  const studentMembers = members.filter(m => !staffRoles.includes(m.user?.role));
  const avgWorkload = studentMembers.length > 0 ? Math.round(studentMembers.reduce((s, m) => s + (m.workload || 0), 0) / studentMembers.length) : 0;

  const roleIcon = (role: string) => {
    if (role === 'Admin') return <Shield className="w-3 h-3 text-zinc-900" />;
    if (role === 'Editor') return <Pencil className="w-3 h-3 text-zinc-600" />;
    return <Eye className="w-3 h-3 text-zinc-400" />;
  };

  const roleBadge = (role: string) => {
    const base = 'px-2 py-0.5 text-[9px] font-mono font-extrabold rounded uppercase flex items-center gap-1';
    if (role === 'Admin') return <span className={`${base} bg-zinc-900 text-white`}>{roleIcon(role)} Admin</span>;
    if (role === 'Editor') return <span className={`${base} bg-zinc-100 text-zinc-800 border border-zinc-200`}>{roleIcon(role)} Editor</span>;
    return <span className={`${base} bg-zinc-50 text-zinc-500 border border-zinc-200`}>{roleIcon(role)} Viewer</span>;
  };

  const workloadColor = (w: number) => w >= 80 ? 'bg-red-500' : w >= 50 ? 'bg-amber-500' : 'bg-emerald-500';



  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-zinc-200 rounded-lg bg-white p-8">
        <Users className="w-8 h-8 text-zinc-400 mb-2" />
        <span className="text-sm text-zinc-500">Selecciona un proyecto para gestionar su equipo de trabajo.</span>
      </div>
    );
  }

  const nonMemberUsers = availableUsers.filter(u => !members.some(m => m.user?._id === u._id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight">Equipo del Proyecto</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {studentMembersCount} estudiante{studentMembersCount !== 1 ? 's' : ''} y {staffMembersCount} docente{staffMembersCount !== 1 ? 's' : ''} asignado{studentMembersCount + staffMembersCount !== 1 ? 's' : ''}. Gestiona roles, permisos y carga horaria.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isProjectManager && (
            <button
              onClick={() => { setShowInviteModal(true); fetchInvites(); }}
              className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-bold px-3.5 py-2 rounded-lg transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> Invitar Externo
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => { if (nonMemberUsers.length > 0) setSelectedUserId(nonMemberUsers[0]._id); setShowAddModal(true); }}
              className="flex items-center gap-2 bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-bold px-3.5 py-2 rounded-lg transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" /> Agregar Miembro
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-3">
          <Users className="w-4 h-4 text-zinc-500" />
          <div>
            <p className="text-lg font-extrabold text-zinc-950">{studentMembersCount}</p>
            <p className="text-[10px] text-zinc-400 font-mono uppercase">Estudiantes</p>
          </div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-3">
          <Shield className="w-4 h-4 text-zinc-500" />
          <div>
            <p className="text-lg font-extrabold text-zinc-950">{staffMembersCount}</p>
            <p className="text-[10px] text-zinc-400 font-mono uppercase">Docentes</p>
          </div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-4 h-4 text-zinc-400" />
          <div>
            <p className="text-lg font-extrabold text-zinc-950">{avgWorkload}%</p>
            <p className="text-[10px] text-zinc-400 font-mono uppercase">Carga Prom. Alumnos</p>
          </div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-3">
          <Share2 className="w-4 h-4 text-zinc-400" />
          <div>
            <p className="text-lg font-extrabold text-zinc-950">{invites.length}</p>
            <p className="text-[10px] text-zinc-400 font-mono uppercase">Invitaciones</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o rol..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-500 bg-white"
        />
      </div>

      {/* Lists Container */}
      <div className="space-y-8">
        {/* Student Team Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-zinc-950 flex items-center gap-2 border-b border-zinc-150 pb-2">
            <Users className="w-4 h-4 text-zinc-650" />
            Integrantes de la Tesis (Estudiantes)
            <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-bold font-mono">
              {studentTeam.length}
            </span>
          </h2>

          {studentTeam.length === 0 ? (
            <div className="text-center bg-white border border-zinc-200 rounded-xl py-12">
              <Users className="w-6 h-6 text-zinc-300 mx-auto mb-1" />
              <p className="text-xs text-zinc-500">{searchQuery ? 'Sin estudiantes que coincidan con la búsqueda.' : 'No hay estudiantes asignados.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {studentTeam.map(m => {
                const isEditing = editingMemberId === m._id;
                const isExpanded = expandedMemberId === m._id;
                const isSelf = (m.user?._id || m.user) === currentUser?._id;
                return (
                  <div key={m._id} className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${isExpanded ? 'border-zinc-400' : 'border-zinc-200'}`}>
                    {/* Card Header */}
                    <div className="flex items-center justify-between p-4 gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {(m.user?.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-zinc-950">{m.user?.name || 'Usuario'}</span>
                            {isSelf && <span className="text-[9px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-mono uppercase">Tú</span>}
                            {roleBadge(m.role)}
                          </div>
                          <span className="text-xs text-zinc-400 block truncate">{m.operationalRole} · {m.user?.rut}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:flex items-center gap-1.5">
                          <div className="w-20 bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${workloadColor(m.workload)}`} style={{ width: `${Math.min(m.workload, 100)}%` }} />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-zinc-700">{m.workload}%</span>
                        </div>

                        {isAdmin && !isSelf && (
                          <>
                            <button
                              onClick={() => isEditing ? setEditingMemberId(null) : startEdit(m)}
                              className="p-1.5 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-700 transition-colors"
                              title="Editar miembro"
                            >
                              {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => openRemoveModal(m)}
                              className="p-1.5 hover:bg-red-50 rounded text-zinc-350 hover:text-red-650 transition-colors"
                              title="Remover del proyecto"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setExpandedMemberId(isExpanded ? null : m._id)}
                          className="p-1.5 hover:bg-zinc-100 rounded text-zinc-400 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Inline Edit Form */}
                    {isEditing && (
                      <div className="px-4 pb-4 pt-0 border-t border-zinc-100 bg-zinc-50">
                        <p className="text-[10px] font-mono text-zinc-400 uppercase font-bold pt-3 mb-3">Editar Configuración del Miembro</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[9px] font-mono text-zinc-400 uppercase block mb-1">Permiso</label>
                            <select value={editRole} onChange={e => setEditRole(e.target.value as ProjectRole)}
                              className="w-full border border-zinc-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-zinc-500">
                              <option value="Admin">Admin</option>
                              <option value="Editor">Editor</option>
                              <option value="Viewer">Viewer</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-mono text-zinc-400 uppercase block mb-1">Rol Operativo</label>
                            <input type="text" value={editOpRole} onChange={e => setEditOpRole(e.target.value)}
                              className="w-full border border-zinc-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-zinc-500" />
                          </div>
                          <div>
                            <label className="text-[9px] font-mono text-zinc-400 uppercase block mb-1">Carga (%)</label>
                            <input type="number" min={0} max={100} value={editWorkload} onChange={e => setEditWorkload(Number(e.target.value))}
                              className="w-full border border-zinc-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-zinc-500" />
                          </div>
                        </div>
                        <div className="flex justify-end mt-3">
                          <button onClick={() => handleUpdateMember(m._id)}
                            className="flex items-center gap-1.5 bg-zinc-950 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-zinc-800 transition-colors">
                            <Save className="w-3.5 h-3.5" /> Guardar Cambios
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Expanded Detail */}
                    {isExpanded && !isEditing && (
                      <div className="px-4 pb-4 pt-0 border-t border-zinc-100 bg-zinc-50/50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3">
                          <div>
                            <span className="text-[9px] font-mono text-zinc-400 uppercase block">Permiso Sistema</span>
                            <span className="text-xs font-bold text-zinc-800">{m.role}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-mono text-zinc-400 uppercase block">Rol Operativo</span>
                            <span className="text-xs font-bold text-zinc-800">{m.operationalRole}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-mono text-zinc-400 uppercase block">Carga Horaria</span>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-24 bg-zinc-200 h-2 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${workloadColor(m.workload)}`} style={{ width: `${Math.min(m.workload, 100)}%` }} />
                              </div>
                              <span className="text-xs font-bold">{m.workload}%</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[9px] font-mono text-zinc-400 uppercase block">RUT</span>
                            <span className="text-xs font-bold text-zinc-800 font-mono">{m.user?.rut || '—'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Academic/Supervisor Staff Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-zinc-950 flex items-center gap-2 border-b border-zinc-150 pb-2">
            <Shield className="w-4 h-4 text-zinc-650" />
            Cuerpo Docente y Supervisión Académica
            <span className="text-[10px] bg-zinc-950 text-white px-2 py-0.5 rounded-full font-bold font-mono">
              {academicStaff.length}
            </span>
          </h2>

          {academicStaff.length === 0 ? (
            <div className="text-center bg-zinc-50 border border-zinc-200 border-dashed rounded-xl py-8">
              <p className="text-xs text-zinc-400 italic">No hay docentes o evaluadores asignados como supervisores directos en este proyecto.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {academicStaff.map(m => {
                const isExpanded = expandedMemberId === m._id;
                const isSelf = (m.user?._id || m.user) === currentUser?._id;
                
                return (
                  <div key={m._id} className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden shadow-sm hover:border-zinc-350 transition-all">
                    <div className="flex items-center justify-between p-4 gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full bg-zinc-950 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
                          🎓
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-extrabold text-zinc-950">{m.user?.name || 'Docente'}</span>
                            {isSelf && <span className="text-[9px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-mono uppercase">Tú</span>}
                            <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-zinc-950 text-white rounded uppercase">
                              {m.user?.role}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-500 block truncate">Supervisor Académico · {m.user?.rut || 'Sin RUT'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isAdmin && !isSelf && (
                          <button
                            onClick={() => openRemoveModal(m)}
                            className="p-1.5 hover:bg-red-50 rounded text-zinc-305 hover:text-red-650 transition-colors"
                            title="Desvincular Supervisor"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedMemberId(isExpanded ? null : m._id)}
                          className="p-1.5 hover:bg-zinc-150 rounded text-zinc-500 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Academic Detail */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-zinc-200 bg-zinc-100/30">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 text-xs">
                          <div>
                            <span className="text-[9px] font-mono text-zinc-400 uppercase block">Rol de Permiso</span>
                            <span className="font-bold text-zinc-800">{m.role} (Acceso de Lectura/Escritura)</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-mono text-zinc-400 uppercase block">Contacto / Email</span>
                            <span className="font-bold text-zinc-800 select-all">{m.user?.email || 'No especificado'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-mono text-zinc-400 uppercase block">Estado de Firmas</span>
                            <span className="font-bold text-emerald-700 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Habilitado para Evaluar
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-zinc-950">Agregar Integrante</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Asigna un usuario registrado al proyecto.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-zinc-900 transition-colors"><X className="w-4 h-4" /></button>
            </div>

            {nonMemberUsers.length > 0 ? (
              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Usuario del Sistema</label>
                  <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-zinc-500">
                    {nonMemberUsers.map(u => <option key={u._id} value={u._id}>{u.name} — {u.rut} ({u.role})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Permiso de Proyecto</label>
                    <select value={projectRole} onChange={e => setProjectRole(e.target.value as ProjectRole)}
                      className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-zinc-500">
                      <option value="Admin">Admin – Control total</option>
                      <option value="Editor">Editor – Modificar</option>
                      <option value="Viewer">Viewer – Solo lectura</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Carga (%)</label>
                    <input type="number" min={0} max={100} value={workload} onChange={e => setWorkload(Number(e.target.value))}
                      className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-zinc-500" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Rol Operativo</label>
                  <input type="text" value={operationalRole} onChange={e => setOperationalRole(e.target.value)}
                    placeholder="Ej: Líder Frontend, DBA, Analista"
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-zinc-500 placeholder-zinc-300" />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Nota de Incorporación (Opcional)</label>
                  <input type="text" value={addNote} onChange={e => setAddNote(e.target.value)}
                    placeholder="Ej: Reemplaza a integrante anterior en módulo X"
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-zinc-500 placeholder-zinc-300" />
                </div>
                <div className="flex gap-2 justify-end pt-1 border-t border-zinc-100">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors">Cancelar</button>
                  <button type="submit" className="flex items-center gap-1.5 bg-zinc-950 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
                    <UserPlus className="w-3.5 h-3.5" /> Agregar al Proyecto
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="text-xs">Todos los usuarios registrados ya son miembros del proyecto, o no hay usuarios disponibles en el sistema.</span>
                </div>
                <div className="flex justify-end"><button onClick={() => setShowAddModal(false)} className="text-xs font-bold border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors">Cerrar</button></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Remove Member Modal */}
      {removingMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-zinc-950">Remover Integrante</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Estás por remover a <strong>{removingMember.user?.name}</strong> del proyecto. Esta acción revocará su acceso inmediatamente.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Motivo de Remoción <span className="text-red-500">*</span></label>
                <select value={removeReason} onChange={e => setRemoveReason(e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-zinc-500">
                  <option value="">— Seleccionar motivo —</option>
                  <option value="Abandono del proyecto">Abandono del proyecto</option>
                  <option value="Fin de participación acordada">Fin de participación acordada</option>
                  <option value="Cambio de equipo">Cambio de equipo</option>
                  <option value="Incumplimiento de compromisos">Incumplimiento de compromisos</option>
                  <option value="Cambio de institución">Cambio de institución</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Escribe "CONFIRMAR" para continuar <span className="text-red-500">*</span></label>
                <input type="text" value={removeConfirm} onChange={e => setRemoveConfirm(e.target.value)}
                  placeholder="CONFIRMAR"
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm font-mono bg-white focus:outline-none focus:border-red-400 placeholder-zinc-300" />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1 border-t border-zinc-100">
              <button onClick={() => setRemovingMember(null)} className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors">Cancelar</button>
              <button
                onClick={handleConfirmRemove}
                disabled={!removeReason || removeConfirm !== 'CONFIRMAR'}
                className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remover del Proyecto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-6 my-8">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-zinc-950 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-zinc-500" /> Invitar Evaluador / Supervisor
              </h3>
              <button onClick={() => { setShowInviteModal(false); setGeneratedLink(''); }} className="text-zinc-400 hover:text-zinc-900 transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleGenerateInvite} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Email del Invitado (Opcional)</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="profesor.guia@universidad.cl (opcional)"
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-zinc-500 placeholder-zinc-300" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Duración del Link</label>
                  <select value={inviteDays} onChange={e => setInviteDays(Number(e.target.value))}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-zinc-500">
                    <option value={1}>1 Día</option>
                    <option value={3}>3 Días</option>
                    <option value={7}>7 Días</option>
                    <option value={30}>30 Días</option>
                  </select>
                </div>
                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={inviteCanComment} onChange={e => setInviteCanComment(e.target.checked)} className="w-4 h-4 rounded border-zinc-300 focus:ring-black" />
                    <span className="text-xs font-medium text-zinc-700">Permitir Comentarios</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="bg-zinc-950 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors">Generar Enlace</button>
              </div>
            </form>

            {generatedLink && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
                <div className="text-[10px] font-mono text-emerald-700 uppercase font-bold">✓ Link Generado:</div>
                <div className="flex items-center gap-2 bg-white border border-emerald-200 p-2.5 rounded-lg">
                  <span className="text-xs text-zinc-700 font-mono select-all truncate flex-1">{generatedLink}</span>
                  <button onClick={handleCopyLink} className="p-1 hover:bg-zinc-100 rounded text-zinc-500 transition-all shrink-0">
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-zinc-100 pt-4">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-3 font-bold">Invitaciones Generadas</h4>
              {invites.length === 0 ? (
                <p className="text-xs text-zinc-400 italic text-center py-4">No hay invitaciones registradas.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {invites.map(inv => (
                    <div key={inv._id} className="flex justify-between items-center p-2.5 bg-zinc-50 border border-zinc-150 rounded-lg text-xs">
                      <div>
                        <div className="font-semibold text-zinc-800">{inv.email}</div>
                        <div className="text-[10px] text-zinc-400">Expira: {new Date(inv.expiresAt).toLocaleDateString()} · Comentarios: {inv.canComment ? 'Sí' : 'No'}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                        inv.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                        inv.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-zinc-100 text-zinc-500'
                      }`}>
                        {inv.status === 'Pending' ? 'Pendiente' : inv.status === 'Accepted' ? 'Aceptado' : inv.status === 'Expired' ? 'Expirado' : 'Revocado'}
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

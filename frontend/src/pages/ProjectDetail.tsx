import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { Save, AlertCircle, Share2, Copy, Check, Users, Trash2 } from 'lucide-react';

export const ProjectDetail: React.FC = () => {
  const { activeProject, updateProject, deleteProject, members } = useProjectStore();
  const { user: currentUser } = useAuthStore();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    problem: '',
    objectives: '',
    restrictions: '',
    companyName: '',
    companyContact: ''
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Invitations States
  const [invites, setInvites] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCanComment, setInviteCanComment] = useState(true);
  const [inviteDays, setInviteDays] = useState(7);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchInvites = async () => {
    if (!activeProject) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')}/invites/project/${activeProject._id}`, {
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

  useEffect(() => {
    if (activeProject) {
      setFormData({
        name: activeProject.name || '',
        description: activeProject.description || '',
        problem: activeProject.problem || '',
        objectives: activeProject.objectives || '',
        restrictions: activeProject.restrictions || '',
        companyName: activeProject.companyName || '',
        companyContact: activeProject.companyContact || ''
      });
      setSuccess(false);
      fetchInvites();
      setGeneratedLink('');
    }
  }, [activeProject]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    setSaving(true);
    setSuccess(false);
    
    const isOk = await updateProject(activeProject._id, formData);
    setSaving(false);
    if (isOk) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    const emailToSubmit = inviteEmail.trim() || `observador.general+${Math.floor(100000 + Math.random() * 900000)}@thesisflow.cl`;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')}/invites/project/${activeProject._id}`, {
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
  const isAdmin = currentUser?.role === 'Admin' || (member && member.role === 'Admin');

  const handleDeleteProject = async () => {
    if (!activeProject) return;
    const confirmName = prompt(
      `ATENCIÓN: Esto borrará de forma permanente el proyecto y todos sus datos en todos los módulos.\n\nPara confirmar la eliminación, escribe el nombre del proyecto: "${activeProject.name}"`
    );
    if (confirmName === activeProject.name) {
      const isOk = await deleteProject(activeProject._id);
      if (isOk) {
        window.location.href = '/';
      } else {
        alert('Error al eliminar el proyecto.');
      }
    } else if (confirmName !== null) {
      alert('El nombre ingresado no coincide. Operación cancelada.');
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-zinc-200 rounded-lg bg-white p-8">
        <AlertCircle className="w-8 h-8 text-zinc-400 mb-2" />
        <span className="text-sm text-zinc-500">Selecciona o crea un proyecto para ver sus detalles.</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div className="flex justify-between items-center border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight">Ficha del Proyecto y Empresa</h1>
          <p className="text-sm text-zinc-500 mt-1">Estructura el contexto de negocio, requerimientos del cliente y problemas a resolver.</p>
        </div>
      </div>

      {success && (
        <div className="bg-zinc-950 text-white text-xs p-3 rounded font-medium border border-zinc-900 transition-opacity">
          ¡Ficha del proyecto actualizada exitosamente en el servidor!
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="bg-white border border-zinc-200 rounded-lg p-8 space-y-6 shadow-sm">
        {/* Core fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">Nombre del Proyecto de Título</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">Nombre de la Empresa Real</label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300 font-semibold"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">Contacto en la Empresa (Nombre, Email, Teléfono)</label>
          <input
            type="text"
            name="companyContact"
            value={formData.companyContact}
            onChange={handleChange}
            placeholder="Ej: Marcelo Rojas, Product Manager (m.rojas@electrans.cl)"
            className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
          />
        </div>

        <div className="border-t border-zinc-100 pt-6">
          <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5 font-bold text-black">Descripción General</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Resume de qué se trata el proyecto a nivel global..."
            className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300 h-24 resize-none"
          />
        </div>

        <div className="border-t border-zinc-100 pt-6">
          <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5 font-bold text-black">Planteamiento del Problema</label>
          <textarea
            name="problem"
            value={formData.problem}
            onChange={handleChange}
            placeholder="¿Cuál es la situación actual, brecha y problemática del negocio?"
            className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300 h-32 resize-none"
          />
        </div>

        <div className="border-t border-zinc-100 pt-6">
          <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5 font-bold text-black">Objetivos del Proyecto (General y Específicos)</label>
          <textarea
            name="objectives"
            value={formData.objectives}
            onChange={handleChange}
            placeholder="Enumera los objetivos esperados..."
            className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300 h-32 resize-none"
          />
        </div>

        <div className="border-t border-zinc-100 pt-6">
          <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5 font-bold text-black">Restricciones Técnicas y de Negocio</label>
          <textarea
            name="restrictions"
            value={formData.restrictions}
            onChange={handleChange}
            placeholder="Ej: Base de datos local, uso de MERN stack, tiempos de entrega de la asignatura, etc."
            className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300 h-28 resize-none"
          />
        </div>

        {/* Submit */}
        <div className="border-t border-zinc-200 pt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold px-4 py-2.5 rounded transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar Ficha Técnica'}
          </button>
        </div>
      </form>

      {/* Share / Invite Section */}
      <div className="bg-white border border-zinc-200 rounded-lg p-8 space-y-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-black flex items-center gap-2">
            <Share2 className="w-5 h-5 text-zinc-500" />
            Compartir Proyecto (Profesores y Evaluadores)
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Genera enlaces de invitación con expiración y permisos específicos. Los invitados accederán como Observadores (Viewer).
          </p>
        </div>

        <form onSubmit={handleGenerateInvite} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border-t border-zinc-100 pt-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">Correo del Invitado (Opcional - dejar vacío para link general)</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="ej: profesor.guia@universidad.cl (opcional)"
              className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-350"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">Expiración (Días)</label>
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

          <div>
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={inviteCanComment}
                onChange={(e) => setInviteCanComment(e.target.checked)}
                className="w-4 h-4 text-black border-zinc-300 rounded focus:ring-black"
              />
              <span className="text-xs text-zinc-700 font-medium">Permitir Comentarios</span>
            </label>
          </div>

          <div className="md:col-span-4 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold px-4 py-2.5 rounded transition-colors font-mono"
            >
              Generar Enlace Seguro
            </button>
          </div>
        </form>

        {generatedLink && (
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 space-y-2">
            <div className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Enlace de Invitación Generado</div>
            <div className="flex items-center gap-2 bg-white border border-zinc-250 p-2.5 rounded-md">
              <span className="text-xs text-zinc-700 font-mono select-all truncate flex-1">{generatedLink}</span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-1.5 hover:bg-zinc-100 rounded text-zinc-650 transition-all shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              Envía este link directamente a tu evaluador o profesor. Deberán crear una cuenta o iniciar sesión para redimirlo.
            </p>
          </div>
        )}

        {/* Invites list */}
        <div className="border-t border-zinc-100 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold">Invitaciones Pendientes / Enviadas</h3>
          </div>

          {invites.length === 0 ? (
            <p className="text-xs text-zinc-400 italic">No hay invitaciones registradas en este proyecto.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-150 text-zinc-400 uppercase font-mono text-[10px]">
                    <th className="py-2">Invitado</th>
                    <th className="py-2">Comenta</th>
                    <th className="py-2">Expiración</th>
                    <th className="py-2 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700 font-medium">
                  {invites.map((inv) => (
                    <tr key={inv._id}>
                      <td className="py-2.5">{inv.email}</td>
                      <td className="py-2.5">{inv.canComment ? 'Sí' : 'No'}</td>
                      <td className="py-2.5">{new Date(inv.expiresAt).toLocaleDateString()}</td>
                      <td className="py-2.5 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          inv.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                          inv.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-zinc-100 text-zinc-500'
                        }`}>
                          {inv.status === 'Pending' ? 'Pendiente' :
                           inv.status === 'Accepted' ? 'Aceptado' :
                           inv.status === 'Expired' ? 'Expirado' : 'Revocado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      {isAdmin && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 space-y-4 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-red-700 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Zona de Peligro: Eliminar Proyecto
            </h2>
            <p className="text-xs text-red-650 mt-1">
              Esta acción es irreversible y eliminará permanentemente este proyecto junto con toda su información, incluyendo requerimientos, reuniones, tareas, diagramas, actas de decisión (ADR) y entregables.
            </p>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleDeleteProject}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded transition-colors font-mono"
            >
              Eliminar Proyecto Completamente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

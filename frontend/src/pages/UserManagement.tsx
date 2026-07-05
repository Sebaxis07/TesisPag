import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/AuthStore';
import { Trash2, Search, UserPlus, Lock, AlertCircle, RefreshCw } from 'lucide-react';
import { validateRut, normalizeRut } from '../utils/rutHelper';

export const UserManagement: React.FC = () => {
  const { user: currentUser, getAuthHeaders } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRut, setNewRut] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'Admin' | 'Editor' | 'Viewer' | 'Creador' | 'Docente' | 'Coordinador' | 'Evaluador'>('Editor');
  const [newIsActivated, setNewIsActivated] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/auth/users', {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Error al obtener el listado de usuarios');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'Creador') {
      fetchUsers();
    }
  }, [currentUser]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!newName || !newRut || !newPassword || !newRole) {
      setModalError('Todos los campos son obligatorios.');
      return;
    }

    if (!validateRut(newRut)) {
      setModalError('El RUT ingresado no es válido. Formato esperado: 12.345.678-K');
      return;
    }

    setModalLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          name: newName,
          rut: normalizeRut(newRut),
          password: newPassword,
          role: newRole,
          isActivated: newIsActivated
        }),
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al crear el usuario');
      }

      setShowCreateModal(false);
      // Reset fields
      setNewName('');
      setNewRut('');
      setNewPassword('');
      setNewRole('Editor');
      setNewIsActivated(false);

      fetchUsers();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === currentUser?._id) {
      alert('No puedes eliminarte a ti mismo de la plataforma.');
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar a "${userName}"? Esto también removerá su participación en todos los proyectos.`)) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')}/auth/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al eliminar el usuario');
      }

      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ userId, role }),
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al actualizar el rol');
      }

      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role } : u));
    } catch (err: any) {
      alert(err.message);
      fetchUsers(); // Refresh on error
    }
  };

  // If user is not Creator, show Access Denied
  if (currentUser?.role !== 'Creador') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] p-8">
        <div className="bg-white border border-zinc-200 rounded-xl p-8 max-w-md text-center shadow-sm">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-black tracking-tight mb-2">Acceso Restringido</h2>
          <p className="text-sm text-zinc-500 mb-6">
            Esta pantalla es exclusiva para el <strong>Creador</strong> del proyecto. Tu rol actual es <strong>{currentUser?.role || 'Visitante'}</strong>.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-black text-white hover:bg-zinc-800 text-xs font-semibold px-4 py-2 rounded transition-colors"
          >
            Volver atrás
          </button>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(
    u =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.rut.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight">Gestión de Usuarios</h1>
          <p className="text-sm text-zinc-500 mt-1">Administra todas las cuentas de la plataforma y sus permisos globales.</p>
        </div>
        <div>
          <button
            onClick={() => {
              setModalError(null);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold px-4 py-2.5 rounded transition-colors shadow-sm self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" /> Crear Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center bg-white border border-zinc-200 rounded-lg px-3 py-2 max-w-md shadow-sm">
        <Search className="w-4 h-4 text-zinc-400 mr-2 shrink-0" />
        <input
          type="text"
          placeholder="Buscar por nombre o RUT..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="bg-transparent text-sm text-black placeholder-zinc-400 focus:outline-none w-full"
        />
      </div>

      {/* Error notification */}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-lg border border-red-150 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error al cargar usuarios</p>
            <p className="text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Users List Table */}
      {loading ? (
        <div className="bg-white border border-zinc-200 rounded-lg p-12 text-center shadow-sm">
          <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin mx-auto mb-2" />
          <span className="text-xs font-mono text-zinc-500">Cargando cuentas registradas...</span>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-mono uppercase text-zinc-400">
                  <th className="px-6 py-3 font-semibold">Nombre</th>
                  <th className="px-6 py-3 font-semibold">RUT</th>
                  <th className="px-6 py-3 font-semibold">Rol Global</th>
                  <th className="px-6 py-3 font-semibold">Estado de Cuenta</th>
                  <th className="px-6 py-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-sm text-black">
                {filteredUsers.map(u => {
                  const isSelf = u._id === currentUser?._id;
                  return (
                    <tr key={u._id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-zinc-900 block">{u.name}</span>
                        {isSelf && (
                          <span className="text-[9px] font-mono bg-zinc-950 text-white px-1.5 py-0.5 rounded inline-block mt-1 font-semibold uppercase">
                            Tú
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-zinc-500">{u.rut}</td>
                      <td className="px-6 py-4">
                        {u.role === 'Creador' ? (
                          <span className="text-xs font-bold text-black border border-black bg-zinc-50 px-2 py-0.5 rounded uppercase">
                            Creador
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={e => handleUpdateRole(u._id, e.target.value)}
                            disabled={isSelf}
                            className="bg-zinc-50 border border-zinc-200 rounded px-2 py-1 text-xs font-medium text-black focus:outline-none focus:border-black disabled:opacity-50"
                          >
                            <option value="Editor">Editor</option>
                            <option value="Docente">Docente</option>
                            <option value="Coordinador">Coordinador</option>
                            <option value="Evaluador">Evaluador</option>
                            <option value="Admin">Admin</option>
                            <option value="Viewer">Viewer</option>
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                            u.isActivated
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActivated ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                          {u.isActivated ? 'Activo' : 'Pendiente activación'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteUser(u._id, u.name)}
                          disabled={isSelf}
                          className="text-zinc-400 hover:text-red-600 transition-colors p-1.5 disabled:opacity-30 rounded hover:bg-red-50 disabled:hover:bg-transparent"
                          title={isSelf ? 'No puedes eliminarte a ti mismo' : 'Eliminar usuario'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 italic">
                      No se encontraron usuarios que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-extrabold text-black tracking-tight">Crear Nuevo Usuario</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-xs text-zinc-400 hover:text-zinc-950 font-mono font-bold"
              >
                CERRAR
              </button>
            </div>

            {modalError && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded border border-red-150 mb-4 font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ej: Diego Pérez"
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">RUT</label>
                <input
                  type="text"
                  required
                  value={newRut}
                  onChange={e => setNewRut(normalizeRut(e.target.value))}
                  placeholder="12.345.678-K"
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">Contraseña Temporal</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">Rol Global</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as any)}
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-black focus:outline-none focus:border-black"
                >
                  <option value="Editor">Editor (Líder / Integrante de Proyecto)</option>
                  <option value="Docente">Docente (Guía / Supervisor)</option>
                  <option value="Coordinador">Coordinador (Coordinador de Tesis)</option>
                  <option value="Evaluador">Evaluador (Comisión Evaluadora)</option>
                  <option value="Admin">Admin (Administrador)</option>
                  <option value="Viewer">Viewer (Solo Lectura)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="newIsActivated"
                  checked={newIsActivated}
                  onChange={e => setNewIsActivated(e.target.checked)}
                  className="w-4 h-4 text-black border-zinc-300 rounded focus:ring-black"
                />
                <label htmlFor="newIsActivated" className="text-xs text-zinc-700 font-medium cursor-pointer select-none">
                  Crear cuenta como "Activa" (No requerirá flujo de primer ingreso)
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs text-zinc-500 hover:text-black transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="bg-black text-white hover:bg-zinc-800 text-xs font-bold px-4 py-2 rounded transition-colors disabled:opacity-50"
                >
                  {modalLoading ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

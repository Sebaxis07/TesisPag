import React, { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { History, ShieldAlert, Search, Calendar, User as UserIcon, RefreshCw, FileText } from 'lucide-react';

interface AuditLog {
  _id: string;
  userName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  timestamp: string;
}

export const AuditLogs: React.FC = () => {
  const { activeProject } = useProjectStore();
  const { getAuthHeaders } = useAuthStore();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState('All');
  const [selectedActionType, setSelectedActionType] = useState('All');

  const fetchLogs = useCallback(async () => {
    if (!activeProject) return;
    setIsLoading(true);
    setHasAccess(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:5000/api/audit/project/${activeProject._id}`, { headers });
      
      if (res.status === 403) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setLogs(data);
        setFilteredLogs(data);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProject, getAuthHeaders]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Apply filters
  useEffect(() => {
    let result = [...logs];

    // Search query
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase();
      result = result.filter(log =>
        log.userName.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.details.toLowerCase().includes(query) ||
        log.resourceType.toLowerCase().includes(query)
      );
    }

    // Resource Filter
    if (selectedResource !== 'All') {
      result = result.filter(log => log.resourceType === selectedResource);
    }

    // Action type Filter
    if (selectedActionType !== 'All') {
      result = result.filter(log => {
        const action = log.action.toUpperCase();
        if (selectedActionType === 'CREATE') return action.startsWith('CREATE') || action.startsWith('UPLOAD') || action.startsWith('GENERATE') || action.startsWith('EXTRACT');
        if (selectedActionType === 'UPDATE') return action.startsWith('UPDATE') || action.startsWith('TRIGGER');
        if (selectedActionType === 'DELETE') return action.startsWith('DELETE') || action.startsWith('REMOVE');
        return true;
      });
    }

    setFilteredLogs(result);
  }, [searchQuery, selectedResource, selectedActionType, logs]);

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.startsWith('CREATE') || act.startsWith('UPLOAD') || act.startsWith('GENERATE') || act.startsWith('ADD') || act.startsWith('EXTRACT')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }
    if (act.startsWith('UPDATE') || act.startsWith('TRIGGER') || act.startsWith('COMPARE')) {
      return 'bg-amber-50 text-amber-700 border-amber-100';
    }
    if (act.startsWith('DELETE') || act.startsWith('REMOVE')) {
      return 'bg-red-50 text-red-700 border-red-100';
    }
    return 'bg-zinc-50 text-zinc-700 border-zinc-100';
  };

  const getResourceLabel = (resType: string) => {
    const mapping: Record<string, string> = {
      'Requirement': 'Requerimiento',
      'Meeting': 'Minuta de Reunión',
      'Diagram': 'Diagrama Visual',
      'ADRDecision': 'Decisión ADR',
      'Task': 'Tarea/Sprint',
      'Document': 'Informe Documental',
      'SourceDocument': 'Archivo RAG',
      'TeamMember': 'Miembro de Equipo',
      'Project': 'Proyecto'
    };
    return mapping[resType] || resType;
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500">
        <ShieldAlert className="w-12 h-12 mb-4 text-zinc-400 animate-pulse" />
        <p className="text-sm font-medium">Por favor selecciona o crea un proyecto activo.</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center max-w-lg mx-auto shadow-sm mt-[10vh] space-y-4">
        <div className="mx-auto w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center border border-red-100">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-zinc-900">Acceso Restringido</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Solo los miembros de equipo con el rol de **Administrador del Proyecto** o Administradores de Sistema pueden acceder al Registro de Auditoría de ThesisFlow.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-3">
            <History className="w-6 h-6 text-zinc-900" />
            Registro de Auditoría de Seguridad
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Registro inmutable de actividades administrativas, operaciones de escritura y generación IA dentro de este proyecto.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
          title="Sincronizar Logs"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Search */}
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por operador, acción, detalles..."
            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>

        {/* Resource Select */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-zinc-400">Recurso:</label>
          <select
            value={selectedResource}
            onChange={e => setSelectedResource(e.target.value)}
            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none"
          >
            <option value="All">Todos</option>
            <option value="Requirement">Requerimientos</option>
            <option value="Meeting">Minutas</option>
            <option value="Diagram">Diagramas</option>
            <option value="ADRDecision">Decisiones ADR</option>
            <option value="Task">Tareas</option>
            <option value="Document">Informes</option>
            <option value="SourceDocument">Base RAG</option>
            <option value="TeamMember">Miembros</option>
          </select>
        </div>

        {/* Action Type Select */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-zinc-400">Acción:</label>
          <select
            value={selectedActionType}
            onChange={e => setSelectedActionType(e.target.value)}
            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none"
          >
            <option value="All">Todas</option>
            <option value="CREATE">Creaciones (+)</option>
            <option value="UPDATE">Modificaciones (&Delta;)</option>
            <option value="DELETE">Eliminaciones (-)</option>
          </select>
        </div>
      </div>

      {/* Logs Table / Timeline */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-900">Eventos de Auditoría</span>
          <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-medium font-mono">
            {filteredLogs.length} mostrados
          </span>
        </div>

        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-2.5">
            <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-950 rounded-full animate-spin"></div>
            <span className="text-xs text-zinc-500 font-medium">Recuperando registros...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center text-zinc-400 flex flex-col items-center">
            <FileText className="w-12 h-12 mb-3 text-zinc-300" />
            <p className="text-sm font-medium">No se encontraron eventos coincidentes.</p>
            <p className="text-xs text-zinc-500 mt-1">Prueba reajustando los criterios de búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-bold text-zinc-500 font-mono uppercase">
                  <th className="px-6 py-3">Fecha y Hora</th>
                  <th className="px-6 py-3">Operador</th>
                  <th className="px-6 py-3">Operación</th>
                  <th className="px-6 py-3">Recurso Afectado</th>
                  <th className="px-6 py-3">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {filteredLogs.map(log => (
                  <tr key={log._id} className="hover:bg-zinc-50/50 transition-colors">
                    {/* Timestamp */}
                    <td className="px-6 py-4 whitespace-nowrap text-zinc-500 font-mono flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    {/* Operator */}
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-zinc-900">
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                        {log.userName}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Resource Type */}
                    <td className="px-6 py-4 whitespace-nowrap text-zinc-700">
                      <div className="flex flex-col">
                        <span className="font-semibold">{getResourceLabel(log.resourceType)}</span>
                        <span className="text-[9px] text-zinc-400 font-mono">ID: {log.resourceId}</span>
                      </div>
                    </td>

                    {/* Details */}
                    <td className="px-6 py-4 text-zinc-600 leading-normal font-medium max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;

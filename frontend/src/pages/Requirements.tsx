import React, { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { ClipboardList, Plus, BrainCircuit, Trash2, Link2, Share2, Activity, FileText, AlertTriangle, MessageSquare, Cpu, CheckCircle2 } from 'lucide-react';

interface Requirement {
  _id: string;
  code: string;
  title: string;
  description: string;
  type: 'Functional' | 'Non-Functional';
  priority: 'High' | 'Medium' | 'Low';
  status: 'Draft' | 'Approved' | 'In-Progress' | 'Completed';
  source: string;
}

interface TraceLink {
  _id: string;
  project: string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  linkType: 'implements' | 'relates' | 'extracted_from' | 'models' | 'documents';
  createdBy: string;
}

export const Requirements: React.FC = () => {
  const { activeProject } = useProjectStore();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selectedReq, setSelectedReq] = useState<Requirement | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExtractModal, setShowExtractModal] = useState(false);
  
  // Requirement Form Fields
  const [reqCode, setReqCode] = useState('');
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqType, setReqType] = useState<'Functional' | 'Non-Functional'>('Functional');
  const [reqPriority, setReqPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [reqStatus, setReqStatus] = useState<'Draft' | 'Approved' | 'In-Progress' | 'Completed'>('Draft');
  const [reqSource, setReqSource] = useState('Manual');

  // AI Extraction field
  const [extractText, setExtractText] = useState('');
  const [extractRunning, setExtractRunning] = useState(false);
  const [suggestedRequirements, setSuggestedRequirements] = useState<any[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Record<string, boolean>>({});
  const [showSuggestionsScreen, setShowSuggestionsScreen] = useState(false);
  const [savingSuggestions, setSavingSuggestions] = useState(false);

  // Project Assets for Traceability
  const [meetings, setMeetings] = useState<any[]>([]);
  const [diagrams, setDiagrams] = useState<any[]>([]);
  const [adrs, setAdrs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [traceLinks, setTraceLinks] = useState<TraceLink[]>([]);

  // New Link form state
  const [targetType, setTargetType] = useState<'Requirement' | 'Diagram' | 'Meeting' | 'ADRDecision' | 'Task' | 'Document'>('Meeting');
  const [targetId, setTargetId] = useState('');
  const [linkType, setLinkType] = useState<'implements' | 'relates' | 'extracted_from' | 'models' | 'documents'>('relates');

  const API_URL = 'http://localhost:5000/api';
  const { getAuthHeaders } = useAuthStore();
  const headers = getAuthHeaders();

  const fetchRequirements = useCallback(async () => {
    if (!activeProject) return;
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_URL}/requirements/project/${activeProject._id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setRequirements(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [activeProject, getAuthHeaders]);

  const fetchTraceLinks = useCallback(async () => {
    if (!activeProject) return;
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_URL}/tracelinks/project/${activeProject._id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setTraceLinks(data);
      }
    } catch (err) {
      console.error('Error fetching tracelinks:', err);
    }
  }, [activeProject, getAuthHeaders]);

  const fetchAllAssets = useCallback(async () => {
    if (!activeProject) return;
    try {
      const headers = getAuthHeaders();
      const pMeetings = fetch(`${API_URL}/meetings/project/${activeProject._id}`, { headers }).then(r => r.ok ? r.json() : []);
      const pDiagrams = fetch(`${API_URL}/diagrams/project/${activeProject._id}`, { headers }).then(r => r.ok ? r.json() : []);
      const pAdrs = fetch(`${API_URL}/adrs/project/${activeProject._id}`, { headers }).then(r => r.ok ? r.json() : []);
      const pTasks = fetch(`${API_URL}/tasks/project/${activeProject._id}`, { headers }).then(r => r.ok ? r.json() : []);
      const pReports = fetch(`${API_URL}/reports/project/${activeProject._id}`, { headers }).then(r => r.ok ? r.json() : []);

      const [resMeetings, resDiagrams, resAdrs, resTasks, resReports] = await Promise.all([
        pMeetings, pDiagrams, pAdrs, pTasks, pReports
      ]);

      setMeetings(resMeetings);
      setDiagrams(resDiagrams);
      setAdrs(resAdrs);
      setTasks(resTasks);
      setReports(resReports);
    } catch (err) {
      console.error('Error fetching assets:', err);
    }
  }, [activeProject, getAuthHeaders]);

  useEffect(() => {
    if (activeProject) {
      fetchRequirements();
      fetchTraceLinks();
      fetchAllAssets();
      setSelectedReq(null);
    }
  }, [activeProject, fetchRequirements, fetchTraceLinks, fetchAllAssets]);

  const handleAddRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !reqCode || !reqTitle) return;

    try {
      const response = await fetch(`${API_URL}/requirements`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: activeProject._id,
          code: reqCode,
          title: reqTitle,
          description: reqDesc,
          type: reqType,
          priority: reqPriority,
          status: reqStatus,
          source: reqSource
        })
      });

      if (response.ok) {
        setShowAddModal(false);
        setReqCode('');
        setReqTitle('');
        setReqDesc('');
        setReqType('Functional');
        setReqPriority('Medium');
        setReqStatus('Draft');
        setReqSource('Manual');
        await fetchRequirements();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !extractText) return;
    setExtractRunning(true);

    try {
      const response = await fetch(`${API_URL}/requirements/extract`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject._id,
          text: extractText
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestedRequirements(data);
        const initialSelected: Record<string, boolean> = {};
        data.forEach((_: any, idx: number) => {
          initialSelected[idx] = true;
        });
        setSelectedSuggestions(initialSelected);
        setShowSuggestionsScreen(true);
      } else {
        const errData = await response.json();
        alert(errData.message || 'Error al procesar el texto.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al conectar con el servidor.');
    } finally {
      setExtractRunning(false);
    }
  };

  const handleSaveSuggestions = async () => {
    if (!activeProject) return;
    setSavingSuggestions(true);
    try {
      const selectedReqs = suggestedRequirements.filter((_, idx) => selectedSuggestions[idx]);
      if (selectedReqs.length === 0) {
        alert('Por favor selecciona al menos un requerimiento.');
        setSavingSuggestions(false);
        return;
      }

      const response = await fetch(`${API_URL}/requirements/bulk`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: activeProject._id,
          requirements: selectedReqs
        })
      });

      if (response.ok) {
        setShowExtractModal(false);
        setShowSuggestionsScreen(false);
        setSuggestedRequirements([]);
        setExtractText('');
        await fetchRequirements();
      } else {
        const errData = await response.json();
        alert(errData.message || 'Error al guardar los requerimientos.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al intentar guardar los requerimientos.');
    } finally {
      setSavingSuggestions(false);
    }
  };

  const handleCloseExtractModal = () => {
    setShowExtractModal(false);
    setShowSuggestionsScreen(false);
    setSuggestedRequirements([]);
    setExtractText('');
  };

  const handleDeleteRequirement = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Eliminar este requerimiento? Se perderán también sus trazas.')) {
      try {
        const response = await fetch(`${API_URL}/requirements/${id}`, {
          method: 'DELETE',
          headers
        });
        if (response.ok) {
          if (selectedReq?._id === id) {
            setSelectedReq(null);
          }
          await fetchRequirements();
          await fetchTraceLinks();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleUpdateStatus = async (id: string, status: any) => {
    try {
      const response = await fetch(`${API_URL}/requirements/${id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        await fetchRequirements();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trace Link Actions
  const handleCreateTraceLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !targetId) return;

    try {
      const response = await fetch(`${API_URL}/tracelinks`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: activeProject?._id,
          sourceType: 'Requirement',
          sourceId: selectedReq._id,
          targetType,
          targetId,
          linkType
        })
      });

      if (response.ok) {
        setTargetId('');
        await fetchTraceLinks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTraceLink = async (linkId: string) => {
    try {
      const response = await fetch(`${API_URL}/tracelinks/${linkId}`, {
        method: 'DELETE',
        headers
      });
      if (response.ok) {
        await fetchTraceLinks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // BFS-based impact analysis traversal engine
  const getImpactedAssets = () => {
    if (!selectedReq) return [];
    
    const visited = new Set<string>();
    const impacted: Array<{ id: string; name: string; type: string; relation: string; depth: number }> = [];
    
    // BFS Queue: [id, type, name, depth]
    const queue: Array<[string, string, string, number]> = [[selectedReq._id, 'Requirement', selectedReq.code, 0]];
    visited.add(selectedReq._id);

    while (queue.length > 0) {
      const [currentId, , , depth] = queue.shift()!;

      for (const link of traceLinks) {
        let neighborId = '';
        let neighborType = '';

        if (link.sourceId === currentId) {
          neighborId = link.targetId;
          neighborType = link.targetType;
        } else if (link.targetId === currentId) {
          neighborId = link.sourceId;
          neighborType = link.sourceType;
        }

        if (neighborId && !visited.has(neighborId)) {
          visited.add(neighborId);

          let name = 'Recurso sin título';
          if (neighborType === 'Requirement') {
            name = requirements.find(r => r._id === neighborId)?.code || 'Requerimiento';
          } else if (neighborType === 'Diagram') {
            name = diagrams.find(d => d._id === neighborId)?.title || 'Diagrama';
          } else if (neighborType === 'Meeting') {
            name = meetings.find(m => m._id === neighborId)?.title || 'Reunión';
          } else if (neighborType === 'ADRDecision') {
            name = adrs.find(a => a._id === neighborId)?.title || 'Decisión ADR';
          } else if (neighborType === 'Task') {
            name = tasks.find(t => t._id === neighborId)?.title || 'Tarea';
          } else if (neighborType === 'Document') {
            name = reports.find(r => r._id === neighborId)?.title || 'Informe';
          }

          impacted.push({
            id: neighborId,
            name,
            type: neighborType,
            relation: link.linkType,
            depth: depth + 1
          });

          queue.push([neighborId, neighborType, name, depth + 1]);
        }
      }
    }
    return impacted;
  };

  const currentImpacted = getImpactedAssets();
  const currentReqLinks = selectedReq ? traceLinks.filter(l => l.sourceId === selectedReq._id || l.targetId === selectedReq._id) : [];

  // Get active dropdown values based on type
  const getDropdownOptions = () => {
    if (targetType === 'Meeting') return meetings;
    if (targetType === 'Diagram') return diagrams;
    if (targetType === 'ADRDecision') return adrs;
    if (targetType === 'Task') return tasks;
    if (targetType === 'Document') return reports;
    if (targetType === 'Requirement') return requirements.filter(r => r._id !== selectedReq?._id);
    return [];
  };

  const getAssetIcon = (type: string) => {
    if (type === 'Requirement') return <ClipboardList className="w-4 h-4 text-zinc-600" />;
    if (type === 'Meeting') return <MessageSquare className="w-4 h-4 text-blue-600" />;
    if (type === 'Diagram') return <Share2 className="w-4 h-4 text-emerald-600" />;
    if (type === 'ADRDecision') return <Cpu className="w-4 h-4 text-amber-600" />;
    if (type === 'Task') return <CheckCircle2 className="w-4 h-4 text-indigo-600" />;
    return <FileText className="w-4 h-4 text-purple-600" />;
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-zinc-200 rounded-lg bg-white p-8">
        <ClipboardList className="w-8 h-8 text-zinc-400 mb-2" />
        <span className="text-sm text-zinc-500">Selecciona un proyecto para ver sus requerimientos.</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-zinc-200 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight font-sans">Matriz de Requerimientos y Trazabilidad</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Centraliza la matriz de requerimientos y audita su impacto sobre la arquitectura, diagramas y decisiones.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExtractModal(true)}
            className="flex items-center gap-2 border border-zinc-250 hover:bg-zinc-50 text-xs font-bold px-3 py-2 rounded text-zinc-950 transition-colors"
          >
            <BrainCircuit className="w-4 h-4" /> Extraer por IA
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-2 rounded transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo Requerimiento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Requirement Matrix list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-mono text-zinc-400 uppercase">
                  <th className="py-3 px-4 font-bold">Código</th>
                  <th className="py-3 px-4 font-bold">Título</th>
                  <th className="py-3 px-4 font-bold">Tipo</th>
                  <th className="py-3 px-4 font-bold">Prioridad</th>
                  <th className="py-3 px-4 font-bold">Estado</th>
                  <th className="py-3 px-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-150 text-xs">
                {requirements.map(req => {
                  const isSelected = selectedReq?._id === req._id;
                  return (
                    <tr
                      key={req._id}
                      onClick={() => setSelectedReq(req)}
                      className={`hover:bg-zinc-50/70 text-zinc-950 font-sans cursor-pointer transition-colors ${
                        isSelected ? 'bg-zinc-100/80 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold">{req.code}</td>
                      <td className="py-3.5 px-4">
                        <span className="block">{req.title}</span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5 max-w-sm truncate">
                          {req.description}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          req.type === 'Functional' 
                            ? 'bg-zinc-100 text-zinc-800' 
                            : 'bg-zinc-950 text-white font-mono'
                        }`}>
                          {req.type === 'Functional' ? 'Funcional' : 'No Funcional'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`font-semibold ${
                          req.priority === 'High' ? 'text-red-700' : req.priority === 'Medium' ? 'text-black' : 'text-zinc-400'
                        }`}>
                          {req.priority === 'High' ? 'Alta' : req.priority === 'Medium' ? 'Media' : 'Baja'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
                        <select
                          value={req.status}
                          onChange={(e) => handleUpdateStatus(req._id, e.target.value)}
                          className="bg-transparent border-0 font-medium text-xs text-zinc-800 focus:outline-none focus:ring-0 cursor-pointer"
                        >
                          <option value="Draft">Borrador</option>
                          <option value="Approved">Aprobado</option>
                          <option value="In-Progress">En Progreso</option>
                          <option value="Completed">Completado</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleDeleteRequirement(req._id, e)}
                          className="text-zinc-300 hover:text-red-600 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {requirements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500 italic">
                      No hay requerimientos en la matriz. Créalos manualmente o extráelos con IA.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Traceability sidebar panel */}
        <div className="lg:col-span-1 space-y-6">
          {!selectedReq ? (
            <div className="bg-zinc-50 border border-zinc-200 border-dashed rounded-xl p-8 text-center text-zinc-400 flex flex-col items-center justify-center min-h-[300px]">
              <Link2 className="w-10 h-10 mb-2.5 text-zinc-300" />
              <p className="text-xs font-semibold text-zinc-800">Panel de Trazabilidad</p>
              <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px]">
                Selecciona un requerimiento de la matriz para gestionar sus vínculos y auditar su impacto.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              {/* Direct Links */}
              <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <h3 className="text-xs font-bold font-mono text-zinc-950 uppercase tracking-wide">
                    Trazas de {selectedReq.code}
                  </h3>
                  <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-medium">
                    {currentReqLinks.length} enlaces
                  </span>
                </div>

                {/* List of current links */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {currentReqLinks.length === 0 ? (
                    <p className="text-[10px] text-zinc-400 italic">No hay enlaces directos vinculados.</p>
                  ) : (
                    currentReqLinks.map(link => {
                      const isSource = link.sourceId === selectedReq._id;
                      const relatedType = isSource ? link.targetType : link.sourceType;
                      const relatedId = isSource ? link.targetId : link.sourceId;

                      // Get human readable label
                      let relatedName = 'Cargando...';
                      if (relatedType === 'Requirement') {
                        relatedName = requirements.find(r => r._id === relatedId)?.code || 'Requerimiento';
                      } else if (relatedType === 'Diagram') {
                        relatedName = diagrams.find(d => d._id === relatedId)?.title || 'Diagrama';
                      } else if (relatedType === 'Meeting') {
                        relatedName = meetings.find(m => m._id === relatedId)?.title || 'Reunión';
                      } else if (relatedType === 'ADRDecision') {
                        relatedName = adrs.find(a => a._id === relatedId)?.title || 'ADR';
                      } else if (relatedType === 'Task') {
                        relatedName = tasks.find(t => t._id === relatedId)?.title || 'Tarea';
                      } else if (relatedType === 'Document') {
                        relatedName = reports.find(r => r._id === relatedId)?.title || 'Informe';
                      }

                      return (
                        <div key={link._id} className="flex items-center justify-between bg-zinc-50 border border-zinc-150 p-2 rounded-lg text-xs">
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            {getAssetIcon(relatedType)}
                            <div className="min-w-0">
                              <span className="font-semibold text-zinc-900 truncate block" title={relatedName}>
                                {relatedName}
                              </span>
                              <span className="text-[9px] text-zinc-400 font-mono capitalize">
                                {link.linkType} &bull; {relatedType}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteTraceLink(link._id)}
                            className="text-zinc-400 hover:text-red-600 p-0.5 rounded transition-colors"
                            title="Desvincular"
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add new link form */}
                <form onSubmit={handleCreateTraceLink} className="border-t border-zinc-100 pt-3.5 space-y-3">
                  <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase block">Vincular con Recurso</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-mono text-zinc-400 block mb-0.5">Tipo</label>
                      <select
                        value={targetType}
                        onChange={e => {
                          setTargetType(e.target.value as any);
                          setTargetId('');
                        }}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 text-[11px] focus:outline-none"
                      >
                        <option value="Meeting">Reunión</option>
                        <option value="Diagram">Diagrama</option>
                        <option value="ADRDecision">Decisión ADR</option>
                        <option value="Task">Tarea</option>
                        <option value="Document">Informe</option>
                        <option value="Requirement">Requerimiento</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-mono text-zinc-400 block mb-0.5">Relación</label>
                      <select
                        value={linkType}
                        onChange={e => setLinkType(e.target.value as any)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded px-1.5 py-1 text-[11px] focus:outline-none"
                      >
                        <option value="implements">implements</option>
                        <option value="relates">relates</option>
                        <option value="extracted_from">extracted_from</option>
                        <option value="models">models</option>
                        <option value="documents">documents</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-mono text-zinc-400 block mb-0.5">Destino</label>
                    <select
                      value={targetId}
                      onChange={e => setTargetId(e.target.value)}
                      required
                      className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1 text-[11px] focus:outline-none"
                    >
                      <option value="">-- Seleccionar --</option>
                      {getDropdownOptions().map((opt: any) => (
                        <option key={opt._id} value={opt._id}>
                          {opt.code || opt.title || new Date(opt.date).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={!targetId}
                    className="w-full bg-zinc-950 text-white hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 py-1.5 rounded text-[10px] font-bold uppercase transition-colors"
                  >
                    Establecer Vínculo
                  </button>
                </form>
              </div>

              {/* Impact Analysis Graph */}
              <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                  <Activity className="w-4 h-4 text-zinc-950 shrink-0" />
                  <h3 className="text-xs font-bold font-mono text-zinc-950 uppercase tracking-wide">
                    Análisis de Impacto (BFS)
                  </h3>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] leading-relaxed text-zinc-500">
                    Calcula los activos afectados directa o indirectamente (transitivamente) en caso de modificar **{selectedReq.code}**.
                  </p>

                  {currentImpacted.length === 0 ? (
                    <div className="p-4 bg-zinc-50 rounded-lg text-center border border-zinc-150">
                      <p className="text-[10px] text-zinc-400 italic">Sin impacto en la arquitectura o código.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="p-3 bg-red-50/50 border border-red-100 rounded-lg flex items-start gap-2 text-red-950">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <span className="text-[10px] font-semibold leading-snug">
                          ¡Alerta de Rework! Modificar este requerimiento impactará a {currentImpacted.length} componentes del proyecto.
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {currentImpacted.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-zinc-50 border border-zinc-150 p-2 rounded-lg text-xs">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              {getAssetIcon(item.type)}
                              <div className="min-w-0">
                                <span className="font-semibold text-zinc-950 truncate block" title={item.name}>
                                  {item.name}
                                </span>
                                <span className="text-[9px] text-zinc-500 font-mono capitalize">
                                  {item.type} &bull; Vía {item.relation}
                                </span>
                              </div>
                            </div>
                            <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${
                              item.depth === 1 
                                ? 'bg-orange-50 text-orange-700 border border-orange-100' 
                                : 'bg-red-50 text-red-700 border border-red-100'
                            }`}>
                              {item.depth === 1 ? 'Directo' : `Secundario (d=${item.depth})`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Creation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 max-w-md w-full shadow-lg">
            <h3 className="text-base font-bold text-black mb-4">Agregar Requerimiento Manual</h3>
            <form onSubmit={handleAddRequirement} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Código</label>
                  <input
                    type="text"
                    required
                    value={reqCode}
                    onChange={e => setReqCode(e.target.value)}
                    placeholder="RF-01, RN-01"
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Tipo</label>
                  <select
                    value={reqType}
                    onChange={e => setReqType(e.target.value as any)}
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none focus:border-black"
                  >
                    <option value="Functional">Funcional (RF)</option>
                    <option value="Non-Functional">No Funcional (RN)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Título descriptivo</label>
                <input
                  type="text"
                  required
                  value={reqTitle}
                  onChange={e => setReqTitle(e.target.value)}
                  placeholder="Ej: Registro de bitácoras del cliente"
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Descripción / Alcance</label>
                <textarea
                  value={reqDesc}
                  onChange={e => setReqDesc(e.target.value)}
                  placeholder="Detalla qué debe hacer el software y criterios de aceptación..."
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300 h-24 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Prioridad</label>
                  <select
                    value={reqPriority}
                    onChange={e => setReqPriority(e.target.value as any)}
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none focus:border-black"
                  >
                    <option value="High">Alta</option>
                    <option value="Medium">Media</option>
                    <option value="Low">Baja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Fuente</label>
                  <input
                    type="text"
                    required
                    value={reqSource}
                    onChange={e => setReqSource(e.target.value)}
                    placeholder="Ej: Minuta Reunión 1"
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
                  />
                </div>
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
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Extraction Modal */}
      {showExtractModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 max-w-lg w-full shadow-lg">
            {showSuggestionsScreen ? (
              <div className="space-y-4 max-h-[70vh] flex flex-col">
                <div>
                  <h3 className="text-base font-bold text-black">Requerimientos Sugeridos por IA</h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Revisa las sugerencias y explicaciones generadas antes de guardarlas en la matriz del proyecto.
                  </p>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2">
                  {suggestedRequirements.map((req, idx) => (
                    <div key={idx} className="border border-zinc-200 rounded-lg p-4 space-y-2 bg-zinc-50/50">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          id={`suggest-${idx}`}
                          checked={!!selectedSuggestions[idx]}
                          onChange={(e) => {
                            setSelectedSuggestions({
                              ...selectedSuggestions,
                              [idx]: e.target.checked
                            });
                          }}
                          className="mt-1 rounded border-zinc-300 text-black focus:ring-black"
                        />
                        <div className="flex-1">
                          <label htmlFor={`suggest-${idx}`} className="font-mono text-xs font-bold text-black cursor-pointer flex items-center gap-2">
                            {req.code}: {req.title}
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-sans ${
                              req.type === 'Functional' ? 'bg-zinc-200 text-zinc-800' : 'bg-zinc-950 text-white font-mono'
                            }`}>
                              {req.type === 'Functional' ? 'Funcional' : 'No Funcional'}
                            </span>
                          </label>
                          <p className="text-xs text-zinc-650 mt-1 font-sans leading-relaxed">
                            {req.description}
                          </p>
                        </div>
                      </div>

                      {/* Suggestion Explanation box */}
                      <div className="ml-6 bg-amber-50/60 border border-amber-100 rounded p-2.5">
                        <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-wider block mb-0.5">
                          Explicación de la Sugerencia:
                        </span>
                        <p className="text-[10px] text-amber-900 font-sans italic leading-relaxed">
                          {req.explanation || 'Sugerido en base a las especificaciones descritas en el texto.'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={handleCloseExtractModal}
                    className="px-3 py-1.5 text-xs text-zinc-500 hover:text-black transition-colors font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSuggestions}
                    disabled={savingSuggestions || suggestedRequirements.filter((_, i) => selectedSuggestions[i]).length === 0}
                    className="bg-black text-white hover:bg-zinc-800 disabled:opacity-50 text-xs font-bold px-4 py-1.5 rounded transition-colors"
                  >
                    {savingSuggestions ? 'Guardando...' : `Guardar Seleccionados (${suggestedRequirements.filter((_, i) => selectedSuggestions[i]).length})`}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-base font-bold text-black mb-4">Extracción de Requerimientos con IA</h3>
                <form onSubmit={handleRunExtract} className="space-y-4">
                  {meetings.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Cargar desde Minuta de Reunión</label>
                      <select
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          if (selectedId) {
                            const found = meetings.find(m => m._id === selectedId);
                            if (found) {
                              setExtractText(found.transcription || found.summary || '');
                            }
                          }
                        }}
                        className="w-full bg-white border border-zinc-250 rounded px-2.5 py-1.5 text-xs text-black focus:outline-none focus:border-black mb-1"
                      >
                        <option value="">-- Seleccionar Reunión --</option>
                        {meetings.map(m => (
                          <option key={m._id} value={m._id}>
                            {new Date(m.date).toLocaleDateString()} - {m.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Texto de Origen (Minuta o Conversación)</label>
                    <textarea
                      value={extractText}
                      onChange={e => setExtractText(e.target.value)}
                      required
                      placeholder="Pega aquí la minuta de la reunión, apuntes informales o requerimientos descritos en bruto para que la IA los estructure en requerimientos funcionales y no funcionales..."
                      className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300 h-40 resize-none font-mono text-xs"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleCloseExtractModal}
                      disabled={extractRunning}
                      className="px-3 py-1.5 text-xs text-zinc-500 hover:text-black transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={extractRunning}
                      className="flex items-center gap-2 bg-black text-white hover:bg-zinc-800 disabled:opacity-50 text-xs font-bold px-3 py-1.5 rounded transition-colors"
                    >
                      <BrainCircuit className="w-4 h-4" /> {extractRunning ? 'Procesando Texto...' : 'Estructurar Matriz'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Requirements;

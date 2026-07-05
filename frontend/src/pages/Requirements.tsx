import React, { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { 
  ClipboardList, Plus, BrainCircuit, Trash2, Link2, Share2, Activity, 
  FileText, AlertTriangle, MessageSquare, Cpu, CheckCircle2, Award,
  BarChart2, Layers
} from 'lucide-react';

interface Requirement {
  _id: string;
  code: string;
  title: string;
  description: string;
  type: 'Functional' | 'Non-Functional' | 'NonFunctional' | 'Business' | 'Constraint';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Draft' | 'Under Review' | 'Approved Baseline' | 'Needs Adjustment' | 'Obsolete';
  advisorFeedback?: string;
  source: string;
  methodologyTypeSnapshot?: string;
  workflowStatus?: string;
  sprintRef?: string;
  phaseRef?: string;
  iterationRef?: string;
  prototypeVersionRef?: string;
  linkedTasks: any[];
  linkedMeetings: any[];
  linkedADRs: any[];
  linkedDeliverables: any[];
  linkedTests: Array<{
    title: string;
    description?: string;
    status?: 'Pending' | 'Passed' | 'Failed';
  }>;
  version: number;
  sourceType?: string;
  sourceRef?: string;
  approvalStatus?: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: any;
  approvedAt?: string;
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
  const [activeTab, setActiveTab] = useState<'matrix' | 'rtm'>('matrix');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExtractModal, setShowExtractModal] = useState(false);
  
  // Requirement Form Fields
  const [reqCode, setReqCode] = useState('');
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqType, setReqType] = useState<Requirement['type']>('Functional');
  const [reqPriority, setReqPriority] = useState<Requirement['priority']>('Medium');
  const [reqStatus, setReqStatus] = useState<Requirement['status']>('Draft');
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
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [traceLinks, setTraceLinks] = useState<TraceLink[]>([]);

  // New Link form state
  const [targetType, setTargetType] = useState<'Requirement' | 'Diagram' | 'Meeting' | 'ADRDecision' | 'Task' | 'Document' | 'Deliverable'>('Meeting');
  const [targetId, setTargetId] = useState('');
  const [linkType, setLinkType] = useState<'implements' | 'relates' | 'extracted_from' | 'models' | 'documents'>('relates');

  // Quick Task State
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [isCreatingQuickTask, setIsCreatingQuickTask] = useState(false);

  // New test case state
  const [newTestTitle, setNewTestTitle] = useState('');
  const [newTestDesc, setNewTestDesc] = useState('');
  const [filterWarning, setFilterWarning] = useState<string | null>(null);
  const [advisorComments, setAdvisorComments] = useState('');

  useEffect(() => {
    if (selectedReq) {
      setAdvisorComments(selectedReq.advisorFeedback || '');
    } else {
      setAdvisorComments('');
    }
  }, [selectedReq?._id]);

  const API_URL = 'http://localhost:5000/api';
  const { getAuthHeaders, user } = useAuthStore();
  const headers = getAuthHeaders();

  const fetchRequirements = useCallback(async () => {
    if (!activeProject) return;
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_URL}/requirements/project/${activeProject._id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setRequirements(data);
        // Refresh selected if open
        if (selectedReq) {
          const updated = data.find((r: any) => r._id === selectedReq._id);
          if (updated) setSelectedReq(updated);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [activeProject, getAuthHeaders, selectedReq]);

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
      const pDeliverables = fetch(`${API_URL}/deliverables/project/${activeProject._id}`, { headers }).then(r => r.ok ? r.json() : []);

      const [resMeetings, resDiagrams, resAdrs, resTasks, resReports, resDeliverables] = await Promise.all([
        pMeetings, pDiagrams, pAdrs, pTasks, pReports, pDeliverables
      ]);

      setMeetings(resMeetings);
      setDiagrams(resDiagrams);
      setAdrs(resAdrs);
      setTasks(resTasks);
      setReports(resReports);
      setDeliverables(resDeliverables);
    } catch (err) {
      console.error('Error fetching assets:', err);
    }
  }, [activeProject, getAuthHeaders]);

  useEffect(() => {
    if (activeProject) {
      fetchRequirements();
      fetchTraceLinks();
      fetchAllAssets();
    }
  }, [activeProject]);

  const handleUpdateRequirement = async (id: string, fields: Partial<Requirement>) => {
    try {
      const response = await fetch(`${API_URL}/requirements/${id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      if (response.ok) {
        const updated = await response.json();
        setRequirements(prev => prev.map(r => r._id === id ? { ...r, ...updated } : r));
        if (selectedReq?._id === id) {
          setSelectedReq(updated);
        }
      }
    } catch (err) {
      console.error('Error updating requirement:', err);
    }
  };

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
          source: reqSource,
          workflowStatus: 'Backlog',
          approvalStatus: 'Draft'
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
        await fetchRequirements(); // Reload populate
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
        await fetchRequirements(); // Reload populate
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick task creation
  const handleCreateQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !quickTaskTitle.trim() || !activeProject) return;
    setIsCreatingQuickTask(true);

    try {
      let taskSprint = 'General';
      const meth = (activeProject.methodology || 'Scrum').toLowerCase();
      if (meth === 'scrum' || meth === 'agile') {
        taskSprint = selectedReq.sprintRef || 'Backlog';
      } else if (meth === 'waterfall') {
        taskSprint = selectedReq.phaseRef || 'Fase 1: Requisitos';
      } else if (meth === 'spiral') {
        taskSprint = selectedReq.iterationRef || 'Iteración 1';
      } else if (meth === 'prototypes') {
        taskSprint = selectedReq.prototypeVersionRef || 'Prototipo v1';
      }

      const taskRes = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: activeProject._id,
          title: quickTaskTitle,
          description: `Implementación de requerimiento ${selectedReq.code}: ${selectedReq.title}`,
          sprint: taskSprint,
          status: 'Todo'
        })
      });

      if (taskRes.ok) {
        const newTask = await taskRes.json();
        
        // Create tracelink
        await fetch(`${API_URL}/tracelinks`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project: activeProject._id,
            sourceType: 'Requirement',
            sourceId: selectedReq._id,
            targetType: 'Task',
            targetId: newTask._id,
            linkType: 'implements'
          })
        });

        setQuickTaskTitle('');
        await fetchRequirements();
        await fetchTraceLinks();
        await fetchAllAssets();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingQuickTask(false);
    }
  };

  // Test cases actions
  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !newTestTitle.trim()) return;

    const newTests = [...(selectedReq.linkedTests || []), {
      title: newTestTitle,
      description: newTestDesc,
      status: 'Pending' as const
    }];

    await handleUpdateRequirement(selectedReq._id, { linkedTests: newTests });
    setNewTestTitle('');
    setNewTestDesc('');
  };

  const handleRemoveTest = async (idx: number) => {
    if (!selectedReq) return;
    const newTests = selectedReq.linkedTests.filter((_, i) => i !== idx);
    await handleUpdateRequirement(selectedReq._id, { linkedTests: newTests });
  };

  const handleChangeTestStatus = async (idx: number, status: 'Pending' | 'Passed' | 'Failed') => {
    if (!selectedReq) return;
    const newTests = [...selectedReq.linkedTests];
    newTests[idx] = { ...newTests[idx], status };
    await handleUpdateRequirement(selectedReq._id, { linkedTests: newTests });
  };

  // Coverage Helper
  const getRequirementCoverage = (req: Requirement) => {
    const hasTasks = req.linkedTasks && req.linkedTasks.length > 0;
    const hasTests = req.linkedTests && req.linkedTests.length > 0;

    if (!hasTasks) {
      return {
        label: 'Sin Tareas',
        color: 'bg-zinc-100 text-zinc-500 border-zinc-200',
        score: 0
      };
    }
    if (!hasTests) {
      return {
        label: 'Sin Pruebas',
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        score: 33
      };
    }

    const failed = req.linkedTests.some(t => t.status === 'Failed');
    const pending = req.linkedTests.some(t => t.status === 'Pending');

    if (failed) {
      return {
        label: 'Prueba Fallida',
        color: 'bg-red-50 text-red-700 border-red-200',
        score: 50
      };
    }
    if (pending) {
      return {
        label: 'QA Pendiente',
        color: 'bg-orange-50 text-orange-700 border-orange-200',
        score: 75
      };
    }

    return {
      label: 'Totalmente Cubierto',
      color: 'bg-green-50 text-green-700 border-green-200',
      score: 100
    };
  };

  const getRequirementWarnings = (req: Requirement) => {
    const warnings: string[] = [];
    if (!req.linkedTasks || req.linkedTasks.length === 0) warnings.push('Huérfano (sin tareas de desarrollo)');
    if (!req.linkedTests || req.linkedTests.length === 0) warnings.push('Sin pruebas de validación');
    if ((!req.linkedMeetings || req.linkedMeetings.length === 0) && (!req.linkedADRs || req.linkedADRs.length === 0)) {
      warnings.push('Sin justificación formal (sin actas ni ADRs)');
    }
    return warnings;
  };

  // BFS-based impact analysis traversal engine
  const getImpactedAssets = () => {
    if (!selectedReq) return [];
    
    const visited = new Set<string>();
    const impacted: Array<{ id: string; name: string; type: string; relation: string; depth: number }> = [];
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
          } else if (neighborType === 'Deliverable') {
            name = deliverables.find(d => d._id === neighborId)?.name || 'Entregable';
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

  const getDropdownOptions = () => {
    if (targetType === 'Meeting') return meetings;
    if (targetType === 'Diagram') return diagrams;
    if (targetType === 'ADRDecision') return adrs;
    if (targetType === 'Task') return tasks;
    if (targetType === 'Document') return reports;
    if (targetType === 'Deliverable') return deliverables;
    if (targetType === 'Requirement') return requirements.filter(r => r._id !== selectedReq?._id);
    return [];
  };

  const getAssetIcon = (type: string) => {
    if (type === 'Requirement') return <ClipboardList className="w-4 h-4 text-zinc-650" />;
    if (type === 'Meeting') return <MessageSquare className="w-4 h-4 text-blue-600" />;
    if (type === 'Diagram') return <Share2 className="w-4 h-4 text-emerald-600" />;
    if (type === 'ADRDecision') return <Cpu className="w-4 h-4 text-amber-600" />;
    if (type === 'Task') return <CheckCircle2 className="w-4 h-4 text-indigo-600" />;
    if (type === 'Deliverable') return <Award className="w-4 h-4 text-rose-600" />;
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

  // Active framework helper
  const projectMethodology = (activeProject.methodology || 'Scrum').toLowerCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-zinc-200 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight font-sans">
            Matriz de Requerimientos y Trazabilidad
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Centraliza la matriz de requerimientos y audita su impacto y cobertura de tareas y pruebas.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExtractModal(true)}
            className="flex items-center gap-2 border border-zinc-255 hover:bg-zinc-50 text-xs font-bold px-3.5 py-2 rounded text-zinc-950 transition-colors"
          >
            <BrainCircuit className="w-4 h-4" /> Extraer por IA
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3.5 py-2 rounded transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo Requerimiento
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 pb-px">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'matrix' 
              ? 'border-black text-black' 
              : 'border-transparent text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <Layers className="w-4 h-4" /> Matriz del Proyecto ({requirements.length})
        </button>
        <button
          onClick={() => setActiveTab('rtm')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'rtm' 
              ? 'border-black text-black' 
              : 'border-transparent text-zinc-400 hover:text-zinc-700'
          }`}
        >
          <BarChart2 className="w-4 h-4" /> RTM (Traceability Coverage)
        </button>
      </div>

      {activeTab === 'matrix' ? (
        <div className="space-y-6">
          {/* Quality Stats Panel / Orphan Alerts */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <button
              onClick={() => setFilterWarning(null)}
              className={`p-3 rounded-xl border text-left transition-all ${
                !filterWarning 
                  ? 'bg-black text-white border-black shadow-sm' 
                  : 'bg-white text-zinc-950 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <div className="text-[10px] uppercase font-mono tracking-wider opacity-60">Todos</div>
              <div className="text-xl font-bold mt-1">{requirements.length}</div>
            </button>

            <button
              onClick={() => setFilterWarning('orphans')}
              className={`p-3 rounded-xl border text-left transition-all ${
                filterWarning === 'orphans'
                  ? 'bg-red-950 text-red-50 border-red-900 shadow-sm font-semibold'
                  : 'bg-white text-zinc-950 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <div className="text-[10px] uppercase font-mono tracking-wider flex items-center gap-1 text-red-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span> Huérfanos
              </div>
              <div className="text-xl font-bold mt-1">
                {requirements.filter(r => (!r.linkedTasks || r.linkedTasks.length === 0) && (!r.linkedTests || r.linkedTests.length === 0) && (!r.linkedDeliverables || r.linkedDeliverables.length === 0)).length}
              </div>
            </button>

            <button
              onClick={() => setFilterWarning('noTasks')}
              className={`p-3 rounded-xl border text-left transition-all ${
                filterWarning === 'noTasks'
                  ? 'bg-orange-950 text-orange-50 border-orange-900 shadow-sm font-semibold'
                  : 'bg-white text-zinc-950 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <div className="text-[10px] uppercase font-mono tracking-wider flex items-center gap-1 text-orange-550">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Sin Tarea
              </div>
              <div className="text-xl font-bold mt-1">
                {requirements.filter(r => !r.linkedTasks || r.linkedTasks.length === 0).length}
              </div>
            </button>

            <button
              onClick={() => setFilterWarning('noTests')}
              className={`p-3 rounded-xl border text-left transition-all ${
                filterWarning === 'noTests'
                  ? 'bg-amber-950 text-amber-50 border-amber-900 shadow-sm font-semibold'
                  : 'bg-white text-zinc-950 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <div className="text-[10px] uppercase font-mono tracking-wider flex items-center gap-1 text-amber-550">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Sin Pruebas
              </div>
              <div className="text-xl font-bold mt-1">
                {requirements.filter(r => !r.linkedTests || r.linkedTests.length === 0).length}
              </div>
            </button>

            <button
              onClick={() => setFilterWarning('noSource')}
              className={`p-3 rounded-xl border text-left transition-all ${
                filterWarning === 'noSource'
                  ? 'bg-zinc-900 text-zinc-50 border-zinc-955 shadow-sm font-semibold'
                  : 'bg-white text-zinc-950 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <div className="text-[10px] uppercase font-mono tracking-wider flex items-center gap-1 text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span> Sin Fuente
              </div>
              <div className="text-xl font-bold mt-1">
                {requirements.filter(r => !r.source || r.source.trim() === '' || r.source === 'Manual').length}
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Requirement list */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-mono text-zinc-400 uppercase">
                      <th className="py-3 px-4 font-bold">Código</th>
                      <th className="py-3 px-4 font-bold">Título</th>
                      <th className="py-3 px-4 font-bold">Tipo</th>
                      <th className="py-3 px-4 font-bold">Prioridad</th>
                      <th className="py-3 px-4 font-bold">Cobertura</th>
                      <th className="py-3 px-4 font-bold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150 text-xs">
                    {requirements.filter(req => {
                      if (!filterWarning) return true;
                      if (filterWarning === 'noTasks') return !req.linkedTasks || req.linkedTasks.length === 0;
                      if (filterWarning === 'noTests') return !req.linkedTests || req.linkedTests.length === 0;
                      if (filterWarning === 'noSource') return !req.source || req.source.trim() === '' || req.source === 'Manual';
                      if (filterWarning === 'orphans') {
                        return (!req.linkedTasks || req.linkedTasks.length === 0) && 
                               (!req.linkedTests || req.linkedTests.length === 0) &&
                               (!req.linkedDeliverables || req.linkedDeliverables.length === 0);
                      }
                      return true;
                    }).map(req => {
                      const isSelected = selectedReq?._id === req._id;
                      const coverage = getRequirementCoverage(req);
                      const warnings = getRequirementWarnings(req);
                      return (
                        <tr
                          key={req._id}
                          onClick={() => setSelectedReq(req)}
                          className={`hover:bg-zinc-50/70 text-zinc-950 font-sans cursor-pointer transition-colors ${
                            isSelected ? 'bg-zinc-100/80 font-semibold' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                            <div className="flex items-center gap-1.5">
                              {req.code}
                              {warnings.length > 0 && (
                                <span className="text-amber-500" title={`Alertas: ${warnings.join(', ')}`}>
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="block">{req.title}</span>
                            <span className="text-[10px] text-zinc-400 block mt-0.5 max-w-sm truncate">
                              {req.description}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-[10px] bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded font-medium">
                              {req.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`font-semibold ${
                              req.priority === 'Critical' || req.priority === 'High' ? 'text-red-650' : 'text-zinc-600'
                            }`}>
                              {req.priority}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${coverage.color}`}>
                              {coverage.label}
                            </span>
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

          {/* Traceability and Methodology Sidebar */}
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
                {/* Block 1: Contexto Metodológico y Gobernanza */}
                <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <h3 className="text-xs font-bold font-mono text-zinc-950 uppercase tracking-wide flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" /> Contexto Metodológico
                    </h3>
                    <span className="text-[9px] uppercase font-mono bg-zinc-950 text-white px-2 py-0.5 rounded font-extrabold">
                      {projectMethodology}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[9px] font-mono text-zinc-400 block mb-1">Estado Workflow</label>
                      <select
                        value={selectedReq.workflowStatus || 'Backlog'}
                        onChange={(e) => handleUpdateRequirement(selectedReq._id, { workflowStatus: e.target.value })}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:border-black"
                      >
                        <option value="Backlog">Backlog</option>
                        <option value="SprintBacklog">Sprint Backlog</option>
                        <option value="InProgress">En Desarrollo</option>
                        <option value="QA">En Revisión / QA</option>
                        <option value="Done">Finalizado</option>
                      </select>
                    </div>

                    {/* Conditional input based on Methodology */}
                    {(projectMethodology === 'scrum' || projectMethodology === 'agile') && (
                      <div>
                        <label className="text-[9px] font-mono text-zinc-400 block mb-1">Sprint</label>
                        <select
                          value={selectedReq.sprintRef || ''}
                          onChange={(e) => handleUpdateRequirement(selectedReq._id, { sprintRef: e.target.value })}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:border-black"
                        >
                          <option value="">-- Sin Sprint --</option>
                          <option value="Sprint 1">Sprint 1</option>
                          <option value="Sprint 2">Sprint 2</option>
                          <option value="Sprint 3">Sprint 3</option>
                          <option value="Sprint 4">Sprint 4</option>
                        </select>
                      </div>
                    )}

                    {projectMethodology === 'waterfall' && (
                      <div>
                        <label className="text-[9px] font-mono text-zinc-400 block mb-1">Fase Cascada</label>
                        <select
                          value={selectedReq.phaseRef || ''}
                          onChange={(e) => handleUpdateRequirement(selectedReq._id, { phaseRef: e.target.value })}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:border-black"
                        >
                          <option value="">-- Sin Fase --</option>
                          <option value="Fase 1: Requisitos">Fase 1: Requisitos</option>
                          <option value="Fase 2: Diseño">Fase 2: Diseño</option>
                          <option value="Fase 3: Desarrollo">Fase 3: Desarrollo</option>
                          <option value="Fase 4: Pruebas">Fase 4: Pruebas</option>
                          <option value="Fase 5: Implementación">Fase 5: Implementación</option>
                        </select>
                      </div>
                    )}

                    {projectMethodology === 'spiral' && (
                      <div>
                        <label className="text-[9px] font-mono text-zinc-400 block mb-1">Iteración Espiral</label>
                        <select
                          value={selectedReq.iterationRef || ''}
                          onChange={(e) => handleUpdateRequirement(selectedReq._id, { iterationRef: e.target.value })}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:border-black"
                        >
                          <option value="">-- Sin Iteración --</option>
                          <option value="Iteración 1">Iteración 1</option>
                          <option value="Iteración 2">Iteración 2</option>
                          <option value="Iteración 3">Iteración 3</option>
                          <option value="Iteración 4">Iteración 4</option>
                        </select>
                      </div>
                    )}

                    {projectMethodology === 'prototypes' && (
                      <div>
                        <label className="text-[9px] font-mono text-zinc-400 block mb-1">Versión Prototipo</label>
                        <select
                          value={selectedReq.prototypeVersionRef || ''}
                          onChange={(e) => handleUpdateRequirement(selectedReq._id, { prototypeVersionRef: e.target.value })}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1 focus:outline-none focus:border-black"
                        >
                          <option value="">-- Sin Prototipo --</option>
                          <option value="Prototipo v1">Prototipo v1</option>
                          <option value="Prototipo v2">Prototipo v2</option>
                          <option value="Prototipo v3">Prototipo v3</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Governance details */}
                  <div className="border-t border-zinc-100 pt-3.5 space-y-3.5 text-xs">
                    <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase block">Gobernanza y Aprobación Línea Base</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-mono text-zinc-400 block mb-1">Estado Aval</label>
                        {user?.role === 'Docente' || user?.role === 'Evaluador' || user?.role === 'Coordinador' ? (
                          <select
                            value={selectedReq.status || 'Draft'}
                            onChange={(e) => handleUpdateRequirement(selectedReq._id, { 
                              status: e.target.value as any
                            })}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded px-2 py-1.5 focus:outline-none focus:border-black font-semibold text-zinc-900"
                          >
                            <option value="Draft">Borrador</option>
                            <option value="Under Review">En Revisión</option>
                            <option value="Approved Baseline">Línea Base Aprobada</option>
                            <option value="Needs Adjustment">Requiere Ajustes</option>
                            <option value="Obsolete">Obsoleto</option>
                          </select>
                        ) : (
                          <span className={`inline-block font-semibold px-2.5 py-1 rounded text-[10px] uppercase font-mono ${
                            selectedReq.status === 'Approved Baseline' ? 'bg-green-50 text-green-700 border border-green-200' :
                            selectedReq.status === 'Needs Adjustment' ? 'bg-red-50 text-red-700 border border-red-200' :
                            selectedReq.status === 'Under Review' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            selectedReq.status === 'Obsolete' ? 'bg-zinc-100 text-zinc-500 border border-zinc-200' :
                            'bg-zinc-50 text-zinc-600 border border-zinc-200'
                          }`}>
                            {selectedReq.status === 'Approved Baseline' ? 'Línea Base Ok' :
                             selectedReq.status === 'Needs Adjustment' ? 'Obs. Docente' :
                             selectedReq.status === 'Under Review' ? 'En Revisión' :
                             selectedReq.status === 'Obsolete' ? 'Obsoleto' : 'Borrador'}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="text-[9px] font-mono text-zinc-400 block mb-1">Versión</label>
                        <div className="flex items-center gap-1.5">
                          <span className="bg-zinc-100 px-2 py-1 rounded font-bold font-mono">v{selectedReq.version || 1}</span>
                          {(user?.role !== 'Docente' && user?.role !== 'Evaluador' && user?.role !== 'Coordinador') && (
                            <button
                              onClick={() => handleUpdateRequirement(selectedReq._id, { version: (selectedReq.version || 1) + 1 })}
                              className="bg-black hover:bg-zinc-800 text-white rounded px-2 py-1 font-bold text-[10px] transition-colors"
                              title="Subir versión"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Advisor Feedback Field */}
                    <div className="space-y-1.5 border-t border-zinc-100 pt-3">
                      <label className="text-[9px] font-mono text-zinc-400 block">Observaciones del Docente Guía</label>
                      {user?.role === 'Docente' || user?.role === 'Evaluador' || user?.role === 'Coordinador' ? (
                        <div className="space-y-2">
                          <textarea
                            value={advisorComments}
                            onChange={(e) => setAdvisorComments(e.target.value)}
                            placeholder="Añade observaciones y comentarios al requerimiento..."
                            className="w-full bg-zinc-50 border border-zinc-200 rounded p-2 text-xs text-zinc-900 focus:outline-none focus:border-black h-20 resize-none font-sans"
                          />
                          <button
                            onClick={() => handleUpdateRequirement(selectedReq._id, { advisorFeedback: advisorComments })}
                            className="w-full bg-black text-white hover:bg-zinc-800 text-[10px] font-bold py-1 px-3 rounded transition-colors uppercase tracking-wider"
                          >
                            Guardar Observación
                          </button>
                        </div>
                      ) : (
                        <div className="bg-zinc-50 border border-zinc-200 rounded p-3 text-zinc-700 min-h-[40px] italic">
                          {selectedReq.advisorFeedback ? selectedReq.advisorFeedback : "Sin observaciones de supervisión registradas."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Block 2: Trazabilidad y Cobertura */}
                <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <h3 className="text-xs font-bold font-mono text-zinc-950 uppercase tracking-wide flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" /> Trazabilidad y Enlaces
                    </h3>
                    <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-medium">
                      {currentReqLinks.length} activos
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
                        } else if (relatedType === 'Deliverable') {
                          relatedName = deliverables.find(d => d._id === relatedId)?.name || 'Entregable';
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
                              className="text-zinc-400 hover:text-red-600 p-0.5 rounded transition-colors text-sm"
                              title="Desvincular"
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Quick Task Creation */}
                  <form onSubmit={handleCreateQuickTask} className="border-t border-zinc-100 pt-3 space-y-2">
                    <span className="text-[9px] font-bold font-mono text-zinc-400 uppercase block">Crear Tarea Rápida en Sprint/Fase</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={quickTaskTitle}
                        onChange={e => setQuickTaskTitle(e.target.value)}
                        placeholder="Ej: Implementar endpoint de base..."
                        className="flex-1 bg-zinc-50 border border-zinc-200 rounded px-2 py-1 text-xs focus:outline-none placeholder-zinc-300"
                        required
                      />
                      <button
                        type="submit"
                        disabled={isCreatingQuickTask || !quickTaskTitle.trim()}
                        className="bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 px-3 py-1 rounded text-xs font-bold transition-colors"
                      >
                        {isCreatingQuickTask ? '...' : 'Crear'}
                      </button>
                    </div>
                  </form>

                  {/* Manual Test Case Management */}
                  <div className="border-t border-zinc-100 pt-3 space-y-3">
                    <span className="text-[9px] font-bold font-mono text-zinc-400 uppercase block">Casos de Prueba / Validación</span>
                    
                    {/* List of tests */}
                    <div className="space-y-1.5">
                      {selectedReq.linkedTests && selectedReq.linkedTests.length > 0 ? (
                        selectedReq.linkedTests.map((t, idx) => (
                          <div key={idx} className="bg-zinc-50 border border-zinc-150 p-2 rounded-lg text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-zinc-900">{t.title}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTest(idx)}
                                className="text-zinc-400 hover:text-red-600 font-bold"
                              >
                                &times;
                              </button>
                            </div>
                            {t.description && <p className="text-[10px] text-zinc-500 leading-tight">{t.description}</p>}
                            <div className="flex items-center gap-2 pt-1 border-t border-zinc-100">
                              <select
                                value={t.status || 'Pending'}
                                onChange={(e) => handleChangeTestStatus(idx, e.target.value as any)}
                                className={`text-[9px] font-bold border-0 bg-transparent rounded focus:ring-0 cursor-pointer ${
                                  t.status === 'Passed' ? 'text-green-700 font-extrabold' : t.status === 'Failed' ? 'text-red-700 font-extrabold' : 'text-amber-700 font-extrabold'
                                }`}
                              >
                                <option value="Pending">Pendiente</option>
                                <option value="Passed">Aprobado (Passed)</option>
                                <option value="Failed">Fallido (Failed)</option>
                              </select>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-zinc-400 italic">No hay pruebas de validación añadidas.</p>
                      )}
                    </div>

                    {/* New test form */}
                    <form onSubmit={handleAddTest} className="bg-zinc-50/50 p-2 border border-zinc-200 rounded-lg space-y-2">
                      <input
                        type="text"
                        value={newTestTitle}
                        onChange={e => setNewTestTitle(e.target.value)}
                        placeholder="Título del test..."
                        className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[11px] focus:outline-none placeholder-zinc-300"
                        required
                      />
                      <input
                        type="text"
                        value={newTestDesc}
                        onChange={e => setNewTestDesc(e.target.value)}
                        placeholder="Descripción corta (opcional)..."
                        className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[11px] focus:outline-none placeholder-zinc-300"
                      />
                      <button
                        type="submit"
                        className="w-full bg-zinc-900 text-white hover:bg-zinc-800 py-1 rounded text-[9px] font-bold uppercase transition-colors"
                      >
                        Añadir Prueba
                      </button>
                    </form>
                  </div>

                  {/* Add standard tracelink form */}
                  <form onSubmit={handleCreateTraceLink} className="border-t border-zinc-100 pt-3.5 space-y-3">
                    <span className="text-[9px] font-bold font-mono text-zinc-400 uppercase block">Vincular con Recurso del Proyecto</span>
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
                          <option value="Deliverable">Entregable</option>
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
                            {opt.code || opt.title || opt.name || new Date(opt.date).toLocaleDateString()}
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
                      Calcula los activos afectados en cascada en caso de modificar **{selectedReq.code}**.
                    </p>

                    {currentImpacted.length === 0 ? (
                      <div className="p-4 bg-zinc-50 rounded-lg text-center border border-zinc-150">
                        <p className="text-[10px] text-zinc-400 italic">Sin impacto en otros componentes.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="p-3 bg-red-50/50 border border-red-100 rounded-lg flex items-start gap-2 text-red-950">
                          <AlertTriangle className="w-4 h-4 text-red-650 shrink-0 mt-0.5" />
                          <span className="text-[10px] font-semibold leading-snug">
                            ¡Alerta de Rework! Modificar este requerimiento afectará a {currentImpacted.length} componentes del proyecto.
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
      </div>
      ) : (
        /* Requirements Traceability Matrix (RTM) View */
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm animate-fadeIn">
          <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold text-black uppercase font-mono block">RTM: Matriz de Cobertura y Trazabilidad</span>
              <span className="text-[10px] text-zinc-500">Revisa la alineación y cobertura total del proyecto.</span>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                <span>Totalmente Cubierto</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                <span>QA Pendiente</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Sin Pruebas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-400"></span>
                <span>Sin Tareas</span>
              </div>
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-mono text-zinc-400 uppercase">
                <th className="py-3 px-4 font-bold">Req</th>
                <th className="py-3 px-4 font-bold">Título</th>
                <th className="py-3 px-4 font-bold">Tareas Vinculadas</th>
                <th className="py-3 px-4 font-bold">Decisiones ADR</th>
                <th className="py-3 px-4 font-bold">Entregables</th>
                <th className="py-3 px-4 font-bold">Casos de Prueba (QA)</th>
                <th className="py-3 px-4 font-bold">Cobertura</th>
                <th className="py-3 px-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150 text-xs text-zinc-950 font-sans">
              {requirements.map(req => {
                const coverage = getRequirementCoverage(req);
                const passedTests = req.linkedTests?.filter(t => t.status === 'Passed').length || 0;
                const totalTests = req.linkedTests?.length || 0;

                return (
                  <tr key={req._id} className="hover:bg-zinc-50/50">
                    <td className="py-3 px-4 font-mono font-bold">{req.code}</td>
                    <td className="py-3 px-4 font-medium">{req.title}</td>
                    <td className="py-3 px-4">
                      {req.linkedTasks && req.linkedTasks.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {req.linkedTasks.map((t: any) => (
                            <span key={t._id} className="text-[10px] text-zinc-650 block leading-tight">
                              &bull; {t.title} ({t.status})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-400 italic">Sin tareas</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {req.linkedADRs && req.linkedADRs.length > 0 ? (
                        <div className="flex flex-col gap-0.5 font-mono text-[9px] text-zinc-700">
                          {req.linkedADRs.map((adr: any) => (
                            <span key={adr._id} className="block leading-tight">
                              &bull; {adr.code}: {adr.title}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-400 italic">Sin decisiones</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {req.linkedDeliverables && req.linkedDeliverables.length > 0 ? (
                        <div className="flex flex-col gap-0.5 text-[10px] text-zinc-650">
                          {req.linkedDeliverables.map((d: any) => (
                            <span key={d._id} className="block leading-tight font-medium">
                              &bull; {d.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-400 italic">Sin entregables</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {totalTests > 0 ? (
                        <div>
                          <span className="font-semibold block">{passedTests} / {totalTests} Aprobadas</span>
                          <div className="w-20 bg-zinc-200 h-1.5 rounded-full overflow-hidden mt-1">
                            <div 
                              className={`h-full ${passedTests === totalTests ? 'bg-green-500' : 'bg-orange-500'}`} 
                              style={{ width: `${(passedTests / totalTests) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-400 italic">Sin pruebas</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${coverage.color}`}>
                        {coverage.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedReq(req);
                          setActiveTab('matrix');
                        }}
                        className="bg-black text-white hover:bg-zinc-800 font-bold text-[9px] px-2.5 py-1 rounded uppercase tracking-wide transition-colors"
                      >
                        Ver Detalles
                      </button>
                    </td>
                  </tr>
                );
              })}

              {requirements.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500 italic">
                    Carga o crea requerimientos para ver la matriz de trazabilidad general.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
                    <option value="Business">Negocio (RB)</option>
                    <option value="Constraint">Restricción (RC)</option>
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
                  placeholder="Detalla qué debe hacer el software..."
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
                    <option value="Critical">Crítica</option>
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
                              {req.type}
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

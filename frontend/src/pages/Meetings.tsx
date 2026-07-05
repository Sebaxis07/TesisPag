import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { 
  MessageSquare, 
  Plus, 
  BrainCircuit, 
  Trash2, 
  Users, 
  CheckCircle2, 
  XCircle, 
  User, 
  Check, 
  Loader2,
  ChevronRight,
  Info,
  Layers
} from 'lucide-react';

interface Meeting {
  _id: string;
  title: string;
  date: string;
  transcription: string;
  summary: string;
  agreements: string[];
  tasks: string[];
  risks: string[];
  agenda?: string;

  // New fields
  participants: Array<{ name: string; role?: string; email?: string }>;
  rawTranscript?: string;
  notes?: string;
  aiSummary?: string;

  extractedActions?: Array<{
    title: string;
    description?: string;
    ownerName?: string;
    dueDate?: string;
    priority?: 'Low' | 'Medium' | 'High';
    confidence?: number;
    accepted?: boolean;
    convertedTaskId?: string;
  }>;

  extractedRequirements?: Array<{
    type: 'Functional' | 'NonFunctional';
    text: string;
    confidence?: number;
    accepted?: boolean;
    convertedRequirementId?: string;
  }>;

  extractedDecisions?: Array<{
    text: string;
    accepted?: boolean;
    convertedToADR?: boolean;
    convertedADRId?: string;
  }>;

  extractedRisks?: Array<{
    text: string;
    severity?: 'Low' | 'Medium' | 'High';
    accepted?: boolean;
  }>;

  followUpDate?: string;
  status: 'Draft' | 'Analyzed' | 'Validated' | 'Published';
  advisorApprovalStatus?: 'Pending' | 'Conforme' | 'Observada' | 'Pendiente de Ajuste';
  advisorApprovalFeedback?: string;
}

const AI_LOADING_PHASES = [
  'Analizando el tono y la estructura de la sesión...',
  'Buscando patrones en el lenguaje de compromiso (ej: "yo me encargo")...',
  'Extrayendo tareas, responsables y plazos acordados...',
  'Identificando requerimientos funcionales y no funcionales sugeridos...',
  'Compilando el registro de riesgos y decisiones arquitectónicas...',
  'Finalizando la estructuración de la minuta inteligente...'
];

export const Meetings: React.FC = () => {
  const { activeProject, members, fetchMembers } = useProjectStore();
  const { user } = useAuthStore();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [advisorMeetingFeedback, setAdvisorMeetingFeedback] = useState('');
  const currentStatus = selectedMeeting?.status || 'Draft';
  
  // Paso 1 Capture States
  const [showAddModal, setShowAddModal] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingAgenda, setMeetingAgenda] = useState('');
  const [meetingTranscript, setMeetingTranscript] = useState('');
  const [tempParticipants, setTempParticipants] = useState<Array<{ name: string; role?: string; email?: string }>>([]);
  
  // Participant Form States
  const [pType, setPType] = useState<'member' | 'external'>('member');
  const [pMemberId, setPMemberId] = useState('');
  const [pName, setPName] = useState('');
  const [pRole, setPRole] = useState('');
  const [pEmail, setPEmail] = useState('');

  // Editing Suggestion States
  const [editingActionIdx, setEditingActionIdx] = useState<number | null>(null);
  const [editActionTitle, setEditActionTitle] = useState('');
  const [editActionDesc, setEditActionDesc] = useState('');
  const [editActionOwner, setEditActionOwner] = useState('');
  const [editActionPriority, setEditActionPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [editActionDueDate, setEditActionDueDate] = useState('');

  const [editingReqIdx, setEditingReqIdx] = useState<number | null>(null);
  const [editReqText, setEditReqText] = useState('');
  const [editReqType, setEditReqType] = useState<'Functional' | 'NonFunctional'>('Functional');

  // Convert states
  const [convertTaskIdx, setConvertTaskIdx] = useState<number | null>(null);
  const [convertTaskAssigned, setConvertTaskAssigned] = useState('');

  const [convertReqIdx, setConvertReqIdx] = useState<number | null>(null);
  const [convertReqCode, setConvertReqCode] = useState('');
  const [convertReqPriority, setConvertReqPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  const [convertDecIdx, setConvertDecIdx] = useState<number | null>(null);
  const [convertDecCode, setConvertDecCode] = useState('');

  // AI loading logic
  const [aiRunning, setAiRunning] = useState(false);
  const [aiProgressText, setAiProgressText] = useState(AI_LOADING_PHASES[0]);

  // Tabs for step 3 review board
  const [activeReviewTab, setActiveReviewTab] = useState<'summary' | 'actions' | 'requirements' | 'decisions' | 'risks' | 'compare'>('summary');

  // Compare Meetings State
  const [compareWithId, setCompareWithId] = useState('');
  const [compareResult, setCompareResult] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const getPreviousMeeting = () => {
    if (!selectedMeeting || meetings.length <= 1) return null;
    const sorted = [...meetings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const currentIndex = sorted.findIndex(m => m._id === selectedMeeting._id);
    if (currentIndex <= 0) return null;
    return sorted[currentIndex - 1];
  };

  const getPreviousMeetingCommitmentStats = () => {
    const prevMeeting = getPreviousMeeting();
    if (!prevMeeting) return null;
    const actions = prevMeeting.extractedActions || [];
    if (actions.length === 0) return { total: 0, completed: 0, percent: 100, prevMeeting };
    
    let completedCount = 0;
    actions.forEach(action => {
      if (action.accepted && action.convertedTaskId) {
        const task = action.convertedTaskId as any;
        if (task && task.status === 'Done') {
          completedCount++;
        }
      }
    });
    
    return {
      total: actions.length,
      completed: completedCount,
      percent: Math.round((completedCount / actions.length) * 100),
      prevMeeting
    };
  };

  const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');
  const headers = useAuthStore.getState().getAuthHeaders();

  const fetchMeetings = async () => {
    if (!activeProject) return;
    try {
      const response = await fetch(`${API_URL}/meetings/project/${activeProject._id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setMeetings(data);
        if (data.length > 0) {
          setSelectedMeeting(prev => {
            const match = data.find((m: Meeting) => m._id === prev?._id);
            return match || data[0];
          });
        } else {
          setSelectedMeeting(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeProject) {
      fetchMeetings();
      fetchMembers(activeProject._id);
    }
  }, [activeProject]);

  useEffect(() => {
    setCompareWithId('');
    setCompareResult(null);
  }, [selectedMeeting?._id]);

  useEffect(() => {
    if (selectedMeeting) {
      setAdvisorMeetingFeedback(selectedMeeting.advisorApprovalFeedback || '');
    } else {
      setAdvisorMeetingFeedback('');
    }
  }, [selectedMeeting?._id]);

  // AI progress text rotation
  useEffect(() => {
    let interval: any;
    if (aiRunning) {
      let idx = 0;
      interval = setInterval(() => {
        idx = (idx + 1) % AI_LOADING_PHASES.length;
        setAiProgressText(AI_LOADING_PHASES[idx]);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [aiRunning]);

  const handleAddParticipant = () => {
    if (pType === 'member') {
      const matchedMember = members.find(m => m.user._id === pMemberId);
      if (matchedMember) {
        // Prevent duplicate
        if (tempParticipants.some(p => p.email === matchedMember.user.rut)) return;
        setTempParticipants(prev => [
          ...prev, 
          { 
            name: matchedMember.user.name, 
            role: matchedMember.operationalRole || matchedMember.role,
            email: matchedMember.user.rut 
          }
        ]);
      }
    } else {
      if (!pName) return;
      setTempParticipants(prev => [
        ...prev, 
        { name: pName, role: pRole || 'Externo', email: pEmail || 'N/A' }
      ]);
      setPName('');
      setPRole('');
      setPEmail('');
    }
  };

  const handleRemoveParticipant = (idx: number) => {
    setTempParticipants(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !meetingTitle) return;

    try {
      const response = await fetch(`${API_URL}/meetings`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: activeProject._id,
          title: meetingTitle,
          date: meetingDate || new Date(),
          rawTranscript: meetingTranscript,
          transcription: meetingTranscript, // compatibility
          notes: meetingNotes,
          agenda: meetingAgenda,
          participants: tempParticipants,
          status: 'Draft'
        })
      });

      if (response.ok) {
        setShowAddModal(false);
        setMeetingTitle('');
        setMeetingDate('');
        setMeetingTranscript('');
        setMeetingNotes('');
        setMeetingAgenda('');
        setTempParticipants([]);
        await fetchMeetings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMeeting = async (meetingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Eliminar esta reunión definitivamente? Todas las sugerencias no guardadas se perderán.')) {
      try {
        const response = await fetch(`${API_URL}/meetings/${meetingId}`, {
          method: 'DELETE',
          headers
        });
        if (response.ok) {
          if (selectedMeeting?._id === meetingId) setSelectedMeeting(null);
          await fetchMeetings();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCompareMeetings = async () => {
    if (!selectedMeeting || !compareWithId) return;
    setCompareLoading(true);
    setCompareResult(null);
    try {
      const response = await fetch(`${API_URL}/meetings/${selectedMeeting._id}/compare`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ compareWithId })
      });
      const data = await response.json();
      if (response.ok) {
        setCompareResult(data);
      } else {
        alert(data.message || 'Error al comparar reuniones.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al conectar con el servidor de comparación.');
    } finally {
      setCompareLoading(false);
    }
  };

  const handleRunAISummary = async () => {
    if (!selectedMeeting) return;
    setAiRunning(true);
    try {
      const response = await fetch(`${API_URL}/meetings/${selectedMeeting._id}/summarize`, {
        method: 'POST',
        headers
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedMeeting(updated);
        setMeetings(prev => prev.map(m => m._id === updated._id ? updated : m));
        setActiveReviewTab('summary');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiRunning(false);
    }
  };

  // Convert suggestions helpers
  const handleConvertTask = async (actionIdx: number) => {
    if (!selectedMeeting) return;
    try {
      const response = await fetch(`${API_URL}/meetings/${selectedMeeting._id}/convert-task`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionIndex: actionIdx,
          assignedToUserId: convertTaskAssigned || null
        })
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedMeeting(data.meeting);
        setMeetings(prev => prev.map(m => m._id === data.meeting._id ? data.meeting : m));
        setConvertTaskIdx(null);
        setConvertTaskAssigned('');
      } else {
        const errData = await response.json();
        alert(errData.message || 'Error al convertir tarea');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertRequirement = async (reqIdx: number) => {
    if (!selectedMeeting) return;
    if (!convertReqCode.trim()) {
      alert('Debes ingresar un código para el requerimiento (ej: RF-01).');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/meetings/${selectedMeeting._id}/convert-requirement`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirementIndex: reqIdx,
          code: convertReqCode.trim(),
          priority: convertReqPriority
        })
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedMeeting(data.meeting);
        setMeetings(prev => prev.map(m => m._id === data.meeting._id ? data.meeting : m));
        setConvertReqIdx(null);
        setConvertReqCode('');
      } else {
        const errData = await response.json();
        alert(errData.message || 'Error al convertir requerimiento');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertDecision = async (decIdx: number) => {
    if (!selectedMeeting) return;
    if (!convertDecCode.trim()) {
      alert('Debes ingresar un código para el ADR (ej: ADR-01).');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/meetings/${selectedMeeting._id}/convert-decision`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionIndex: decIdx,
          code: convertDecCode.trim()
        })
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedMeeting(data.meeting);
        setMeetings(prev => prev.map(m => m._id === data.meeting._id ? data.meeting : m));
        setConvertDecIdx(null);
        setConvertDecCode('');
      } else {
        const errData = await response.json();
        alert(errData.message || 'Error al convertir decisión');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePublishMeeting = async () => {
    if (!selectedMeeting) return;
    if (!confirm('¿Deseas dar por cerrada y publicar oficialmente esta minuta? No podrás editarla ni hacer más análisis de IA.')) return;
    try {
      const response = await fetch(`${API_URL}/meetings/${selectedMeeting._id}/publish`, {
        method: 'POST',
        headers
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedMeeting(updated);
        setMeetings(prev => prev.map(m => m._id === updated._id ? updated : m));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateMeetingFields = async (fields: Partial<Meeting>) => {
    if (!selectedMeeting) return;
    try {
      const response = await fetch(`${API_URL}/meetings/${selectedMeeting._id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedMeeting(updated);
        setMeetings(prev => prev.map(m => m._id === updated._id ? updated : m));
      } else {
        const errData = await response.json();
        alert(errData.message || 'Error al actualizar la minuta');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Edit inline updates
  const handleSaveActionEdit = async (actionIdx: number) => {
    if (!selectedMeeting) return;
    const updatedActions = [...(selectedMeeting.extractedActions || [])];
    updatedActions[actionIdx] = {
      ...updatedActions[actionIdx],
      title: editActionTitle,
      description: editActionDesc,
      ownerName: editActionOwner,
      priority: editActionPriority,
      dueDate: editActionDueDate ? editActionDueDate : undefined
    };

    try {
      const response = await fetch(`${API_URL}/meetings/${selectedMeeting._id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedActions: updatedActions })
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedMeeting(updated);
        setMeetings(prev => prev.map(m => m._id === updated._id ? updated : m));
        setEditingActionIdx(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDiscardAction = async (actionIdx: number) => {
    if (!selectedMeeting) return;
    if (!confirm('¿Descartar esta tarea sugerida de la minuta?')) return;
    const updatedActions = (selectedMeeting.extractedActions || []).filter((_, idx) => idx !== actionIdx);
    try {
      const response = await fetch(`${API_URL}/meetings/${selectedMeeting._id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedActions: updatedActions })
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedMeeting(updated);
        setMeetings(prev => prev.map(m => m._id === updated._id ? updated : m));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveReqEdit = async (reqIdx: number) => {
    if (!selectedMeeting) return;
    const updatedReqs = [...(selectedMeeting.extractedRequirements || [])];
    updatedReqs[reqIdx] = {
      ...updatedReqs[reqIdx],
      text: editReqText,
      type: editReqType
    };

    try {
      const response = await fetch(`${API_URL}/meetings/${selectedMeeting._id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedRequirements: updatedReqs })
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedMeeting(updated);
        setMeetings(prev => prev.map(m => m._id === updated._id ? updated : m));
        setEditingReqIdx(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDiscardReq = async (reqIdx: number) => {
    if (!selectedMeeting) return;
    if (!confirm('¿Descartar este requerimiento sugerido?')) return;
    const updatedReqs = (selectedMeeting.extractedRequirements || []).filter((_, idx) => idx !== reqIdx);
    try {
      const response = await fetch(`${API_URL}/meetings/${selectedMeeting._id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedRequirements: updatedReqs })
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedMeeting(updated);
        setMeetings(prev => prev.map(m => m._id === updated._id ? updated : m));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDiscardDecision = async (decIdx: number) => {
    if (!selectedMeeting) return;
    if (!confirm('¿Descartar esta decisión?')) return;
    const updatedDecs = (selectedMeeting.extractedDecisions || []).filter((_, idx) => idx !== decIdx);
    try {
      const response = await fetch(`${API_URL}/meetings/${selectedMeeting._id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedDecisions: updatedDecs })
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedMeeting(updated);
        setMeetings(prev => prev.map(m => m._id === updated._id ? updated : m));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDiscardRisk = async (riskIdx: number) => {
    if (!selectedMeeting) return;
    if (!confirm('¿Descartar este riesgo sugerido?')) return;
    const updatedRisks = (selectedMeeting.extractedRisks || []).filter((_, idx) => idx !== riskIdx);
    try {
      const response = await fetch(`${API_URL}/meetings/${selectedMeeting._id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedRisks: updatedRisks })
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedMeeting(updated);
        setMeetings(prev => prev.map(m => m._id === updated._id ? updated : m));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptRiskDirectly = async (riskIdx: number) => {
    if (!selectedMeeting) return;
    const updatedRisks = [...(selectedMeeting.extractedRisks || [])];
    updatedRisks[riskIdx].accepted = true;
    try {
      const response = await fetch(`${API_URL}/meetings/${selectedMeeting._id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedRisks: updatedRisks })
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedMeeting(updated);
        setMeetings(prev => prev.map(m => m._id === updated._id ? updated : m));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptDecisionDirectly = async (decIdx: number) => {
    if (!selectedMeeting) return;
    const updatedDecs = [...(selectedMeeting.extractedDecisions || [])];
    updatedDecs[decIdx].accepted = true;
    try {
      const response = await fetch(`${API_URL}/meetings/${selectedMeeting._id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedDecisions: updatedDecs })
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedMeeting(updated);
        setMeetings(prev => prev.map(m => m._id === updated._id ? updated : m));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-zinc-200 rounded-lg bg-white p-8">
        <MessageSquare className="w-8 h-8 text-zinc-400 mb-2" />
        <span className="text-sm text-zinc-500">Selecciona un proyecto para registrar reuniones del equipo.</span>
      </div>
    );
  }

  // Follow-up statistics counting
  const getFollowUpStats = () => {
    if (!selectedMeeting) return { tasks: 0, reqs: 0, adrs: 0, risks: 0 };
    return {
      tasks: (selectedMeeting.extractedActions || []).filter(a => a.accepted).length,
      reqs: (selectedMeeting.extractedRequirements || []).filter(r => r.accepted).length,
      adrs: (selectedMeeting.extractedDecisions || []).filter(d => d.accepted && d.convertedToADR).length,
      risks: (selectedMeeting.extractedRisks || []).filter(r => r.accepted).length
    };
  };

  const stats = getFollowUpStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight">Reuniones Inteligentes</h1>
          <p className="text-xs text-zinc-500 mt-1">Registra minutas estructuradas, detecta acuerdos con IA y conviértelos en artefactos con trazabilidad.</p>
        </div>
        <button
          onClick={() => {
            setMeetingDate(new Date().toISOString().split('T')[0]);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-2 rounded transition-colors"
        >
          <Plus className="w-4 h-4" /> Registrar Minuta
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar - Historical List (Col span 3) */}
        <div className="lg:col-span-3 space-y-4">
          <h3 className="text-[10px] font-extrabold text-zinc-400 uppercase font-mono tracking-wider">Historial de Minutas</h3>
          <div className="bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-200 overflow-hidden shadow-sm">
            {meetings.map(m => {
              let statusColor = 'text-zinc-500 bg-zinc-50 border-zinc-150';
              let statusLabel = 'Borrador';
              if (m.status === 'Analyzed') {
                statusColor = 'text-blue-700 bg-blue-50 border-blue-150';
                statusLabel = 'Analizado';
              } else if (m.status === 'Published') {
                statusColor = 'text-green-700 bg-green-50 border-green-150';
                statusLabel = 'Publicado';
              }

              return (
                <div
                  key={m._id}
                  onClick={() => setSelectedMeeting(m)}
                  className={`p-3.5 cursor-pointer transition-all flex flex-col gap-1.5 ${
                    selectedMeeting?._id === m._id ? 'bg-zinc-50 border-l-2 border-black pl-3 font-semibold' : 'hover:bg-zinc-50 pl-3.5'
                  }`}
                >
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-xs text-black font-extrabold truncate w-10/12">{m.title}</span>
                    <button
                      onClick={(e) => handleDeleteMeeting(m._id, e)}
                      className="text-zinc-300 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-zinc-400 font-mono">
                      {new Date(m.date).toLocaleDateString('es-ES')}
                    </span>
                    <span className={`text-[8px] font-extrabold font-mono px-1.5 py-0.5 rounded border ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
              );
            })}

            {meetings.length === 0 && (
              <div className="p-8 text-center text-xs text-zinc-400 italic">Sin reuniones registradas.</div>
            )}
          </div>
        </div>

        {/* Right Active View (Col span 9) */}
        <div className="lg:col-span-9">
          {selectedMeeting ? (
            <div className="space-y-6">
              {/* Meeting Core Card */}
              <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm space-y-6">
                
                {/* Upper row: Title & Step Status */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                  <div>
                    <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded">
                      Estado: {currentStatus === 'Draft' ? 'Paso 1: Captura' : currentStatus === 'Analyzed' ? 'Paso 3: Validación' : 'Paso 4: Publicado'}
                    </span>
                    <h2 className="text-lg font-bold text-black mt-1.5">{selectedMeeting.title}</h2>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono mt-1">
                      <span>📅 {new Date(selectedMeeting.date).toLocaleDateString('es-ES')}</span>
                      <span>👥 {selectedMeeting.participants?.length || 0} Participantes</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {currentStatus === 'Draft' && (
                      <button
                        onClick={handleRunAISummary}
                        disabled={aiRunning}
                        className="flex items-center gap-1.5 bg-black text-white hover:bg-zinc-800 disabled:opacity-50 text-[11px] font-bold px-3.5 py-2 rounded transition-colors shadow-sm"
                      >
                        <BrainCircuit className="w-4 h-4" /> {aiRunning ? 'Analizando con IA...' : 'Analizar Reunión con IA'}
                      </button>
                    )}

                    {currentStatus === 'Analyzed' && (
                      <>
                        <button
                          onClick={handleRunAISummary}
                          disabled={aiRunning}
                          className="flex items-center gap-1.5 border border-zinc-250 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 text-[11px] font-bold px-3 py-2 rounded transition-colors"
                          title="Volver a ejecutar el análisis borrará las sugerencias actuales"
                        >
                          Re-Analizar
                        </button>
                        <button
                          onClick={handlePublishMeeting}
                          className="flex items-center gap-1.5 bg-black text-white hover:bg-zinc-800 text-[11px] font-bold px-4 py-2 rounded transition-colors shadow-sm"
                        >
                          <Check className="w-4 h-4" /> Publicar Minuta
                        </button>
                      </>
                    )}

                    {currentStatus === 'Published' && (
                      <span className="flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold px-3 py-1.5 rounded">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 animate-pulse" /> Minuta Firmada y Publicada
                      </span>
                    )}
                  </div>
                </div>

                {/* AI Progress Bar loader */}
                {aiRunning && (
                  <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-lg flex flex-col items-center justify-center space-y-4 animate-pulse">
                    <Loader2 className="w-8 h-8 text-black animate-spin" />
                    <div className="text-center">
                      <p className="text-xs font-bold text-black">Ejecutando motores de Meeting Intelligence...</p>
                      <p className="text-[10px] text-zinc-400 font-mono mt-1">{aiProgressText}</p>
                    </div>
                  </div>
                )}

                {/* Meeting Meta / Content details row */}
                {!aiRunning && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left: Notes & Transcript */}
                    <div className="md:col-span-2 space-y-4">
                      {selectedMeeting.agenda && (
                        <div>
                          <h4 className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Agenda Previa / Temas a tratar</h4>
                          <div className="bg-zinc-50 border border-zinc-150 rounded p-3 text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed font-semibold">
                            {selectedMeeting.agenda}
                          </div>
                        </div>
                      )}

                      {selectedMeeting.notes && (
                        <div>
                          <h4 className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Apuntes / Temas tratados</h4>
                          <div className="bg-zinc-50 border border-zinc-150 rounded p-3 text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">
                            {selectedMeeting.notes}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Transcripción de la Sesión</h4>
                        <div className="bg-zinc-50 border border-zinc-150 rounded p-3 text-xs text-zinc-700 max-h-40 overflow-y-auto font-mono whitespace-pre-wrap leading-relaxed">
                          {selectedMeeting.rawTranscript || selectedMeeting.transcription || 'Sin transcripción registrada.'}
                        </div>
                      </div>
                    </div>

                    {/* Right: Participants List */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider border-b pb-1.5">Participantes</h4>
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {selectedMeeting.participants && selectedMeeting.participants.length > 0 ? (
                          selectedMeeting.participants.map((p, idx) => (
                            <div key={idx} className="bg-white border border-zinc-150 p-2 rounded flex flex-col gap-0.5 text-left shadow-xs">
                              <span className="text-xs font-bold text-black flex items-center gap-1">
                                <User className="w-3 h-3 text-zinc-400" /> {p.name}
                              </span>
                              <div className="flex justify-between items-center text-[9px] text-zinc-400 font-mono mt-0.5">
                                <span>{p.role}</span>
                                <span className="text-[8px] max-w-[120px] truncate">{p.email}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-zinc-400 italic">No se registraron participantes.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Seguimiento Minuta Anterior & Gobernanza Docente */}
                {!aiRunning && (
                  <div className="border-t border-zinc-150 pt-5 space-y-4">
                    {/* Previous commitments tracking */}
                    {(() => {
                      const prevStats = getPreviousMeetingCommitmentStats();
                      if (!prevStats) return null;
                      return (
                        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase block tracking-wider">
                              Seguimiento de la Minuta Anterior
                            </span>
                            <p className="text-zinc-700">
                              Cumplimiento de compromisos de la sesión anterior (<strong>{prevStats.prevMeeting.title}</strong> del {new Date(prevStats.prevMeeting.date).toLocaleDateString('es-ES')}):
                            </p>
                            <p className="text-zinc-500 font-mono text-[10px]">
                              {prevStats.completed} de {prevStats.total} tareas de desarrollo completadas.
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-lg font-extrabold text-black font-mono">{prevStats.percent}%</span>
                              <span className="text-[9px] text-zinc-400 font-mono block">COMPLETADO</span>
                            </div>
                            <div className="w-24 bg-zinc-200 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${prevStats.percent === 100 ? 'bg-green-500' : 'bg-black'}`} 
                                style={{ width: `${prevStats.percent}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Advisor Approval controls */}
                    <div className="bg-white border border-zinc-250 rounded-lg p-4 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-black animate-pulse"></span>
                          <span className="text-[10px] font-bold font-mono text-zinc-950 uppercase tracking-wider">
                            Supervisión y Visto Bueno Académico
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-zinc-400">Estado de Aprobación:</span>
                          <span className={`inline-block font-mono text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase ${
                            selectedMeeting.advisorApprovalStatus === 'Conforme' ? 'bg-green-50 text-green-700 border-green-200' :
                            selectedMeeting.advisorApprovalStatus === 'Observada' ? 'bg-red-50 text-red-700 border-red-200' :
                            selectedMeeting.advisorApprovalStatus === 'Pendiente de Ajuste' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            'bg-zinc-50 text-zinc-500 border-zinc-200'
                          }`}>
                            {selectedMeeting.advisorApprovalStatus === 'Conforme' ? 'Conforme' :
                             selectedMeeting.advisorApprovalStatus === 'Observada' ? 'Observada' :
                             selectedMeeting.advisorApprovalStatus === 'Pendiente de Ajuste' ? 'Pendiente Ajuste' : 'Pendiente'}
                          </span>
                        </div>
                      </div>

                      {user?.role === 'Docente' || user?.role === 'Evaluador' || user?.role === 'Coordinador' ? (
                        <div className="space-y-3 text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-1">
                              <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-1">Decisión de Firma</label>
                              <select
                                value={selectedMeeting.advisorApprovalStatus || 'Pending'}
                                onChange={(e) => handleUpdateMeetingFields({ 
                                  advisorApprovalStatus: e.target.value as any
                                })}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded px-2.5 py-1.5 font-semibold text-zinc-900 focus:outline-none focus:border-black cursor-pointer"
                              >
                                <option value="Pending">Pendiente de Visto Bueno</option>
                                <option value="Conforme">Conforme (Aprobado)</option>
                                <option value="Observada">Observada (Rechazado)</option>
                                <option value="Pendiente de Ajuste">Requiere Ajustes</option>
                              </select>
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-1">Comentarios / Observaciones del Docente</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={advisorMeetingFeedback}
                                  onChange={(e) => setAdvisorMeetingFeedback(e.target.value)}
                                  placeholder="Detalla los cambios solicitados o observaciones..."
                                  className="w-full bg-zinc-50 border border-zinc-200 rounded px-3 py-1.5 focus:outline-none focus:border-black"
                                />
                                <button
                                  onClick={() => handleUpdateMeetingFields({ 
                                    advisorApprovalFeedback: advisorMeetingFeedback 
                                  })}
                                  className="bg-black text-white hover:bg-zinc-800 font-bold px-3 py-1.5 rounded uppercase tracking-wider text-[10px] shrink-0 transition-colors"
                                >
                                  Firma
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-zinc-50 border border-zinc-200 rounded p-3 text-xs text-zinc-700 italic">
                          <strong>Observaciones de la Supervisión:</strong> {selectedMeeting.advisorApprovalFeedback ? selectedMeeting.advisorApprovalFeedback : "No se han ingresado observaciones para esta minuta."}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Review Board / Validation Panel */}
              {!aiRunning && (currentStatus === 'Analyzed' || currentStatus === 'Published') && (
                <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden">
                  {/* Validation panel header */}
                  <div className="bg-zinc-50 border-b border-zinc-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-black" />
                      <h3 className="text-xs font-extrabold text-black uppercase font-mono tracking-wider">Review Board & Validación IA</h3>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {currentStatus === 'Analyzed' ? '⚠️ Revisa y aprueba cada elemento para cargarlo al proyecto.' : '✓ Minuta cerrada. Historial de elementos integrados.'}
                    </span>
                  </div>

                  {/* Review Board Tabs */}
                  <div className="flex border-b border-zinc-200 overflow-x-auto text-xs bg-zinc-50/50">
                    <button
                      onClick={() => setActiveReviewTab('summary')}
                      className={`px-4 py-2.5 font-bold transition-all border-b-2 ${
                        activeReviewTab === 'summary' ? 'border-black text-black bg-white' : 'border-transparent text-zinc-400 hover:text-black'
                      }`}
                    >
                      Resumen Ejecutivo
                    </button>
                    <button
                      onClick={() => setActiveReviewTab('actions')}
                      className={`px-4 py-2.5 font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                        activeReviewTab === 'actions' ? 'border-black text-black bg-white' : 'border-transparent text-zinc-400 hover:text-black'
                      }`}
                    >
                      Tareas {(selectedMeeting.extractedActions || []).length > 0 && `(${(selectedMeeting.extractedActions || []).length})`}
                    </button>
                    <button
                      onClick={() => setActiveReviewTab('requirements')}
                      className={`px-4 py-2.5 font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                        activeReviewTab === 'requirements' ? 'border-black text-black bg-white' : 'border-transparent text-zinc-400 hover:text-black'
                      }`}
                    >
                      Requerimientos {(selectedMeeting.extractedRequirements || []).length > 0 && `(${(selectedMeeting.extractedRequirements || []).length})`}
                    </button>
                    <button
                      onClick={() => setActiveReviewTab('decisions')}
                      className={`px-4 py-2.5 font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                        activeReviewTab === 'decisions' ? 'border-black text-black bg-white' : 'border-transparent text-zinc-400 hover:text-black'
                      }`}
                    >
                      Decisiones {(selectedMeeting.extractedDecisions || []).length > 0 && `(${(selectedMeeting.extractedDecisions || []).length})`}
                    </button>
                    <button
                      onClick={() => setActiveReviewTab('risks')}
                      className={`px-4 py-2.5 font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                        activeReviewTab === 'risks' ? 'border-black text-black bg-white' : 'border-transparent text-zinc-400 hover:text-black'
                      }`}
                    >
                      Riesgos {(selectedMeeting.extractedRisks || []).length > 0 && `(${(selectedMeeting.extractedRisks || []).length})`}
                    </button>
                    <button
                      onClick={() => setActiveReviewTab('compare')}
                      className={`px-4 py-2.5 font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                        activeReviewTab === 'compare' ? 'border-black text-black bg-white' : 'border-transparent text-zinc-400 hover:text-black'
                      }`}
                    >
                      ⚡ Comparar y Alcance (IA)
                    </button>
                  </div>

                  {/* Tab Contents */}
                  <div className="p-6">

                    {/* Tab 6: Compare Meetings and Scope Creep Analysis */}
                    {activeReviewTab === 'compare' && (
                      <div className="space-y-6">
                        <div className="bg-zinc-50 border border-zinc-150 p-4 rounded-lg">
                          <h4 className="text-xs font-bold text-black mb-2 flex items-center gap-1.5">
                            🔍 Control de Alcance y Desviaciones (Scope Creep)
                          </h4>
                          <p className="text-[11px] text-zinc-500 leading-relaxed mb-4">
                            Selecciona una reunión previa del proyecto para contrastarla con la sesión actual. Nuestro motor de IA analizará los cambios de rumbo, nuevos compromisos imprevistos, y alertas de desvío sobre la planificación original.
                          </p>

                          <div className="flex flex-col sm:flex-row gap-3 items-end">
                            <div className="w-full">
                              <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-1">Reunión de Comparación (Anterior)</label>
                              <select
                                value={compareWithId}
                                onChange={e => setCompareWithId(e.target.value)}
                                className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-black focus:outline-none focus:border-black cursor-pointer font-semibold"
                              >
                                <option value="">Seleccionar reunión...</option>
                                {meetings
                                  .filter(m => m._id !== selectedMeeting._id)
                                  .map(m => (
                                    <option key={m._id} value={m._id}>
                                      {m.title} ({new Date(m.date).toLocaleDateString('es-ES')})
                                    </option>
                                  ))}
                              </select>
                            </div>

                            <button
                              onClick={handleCompareMeetings}
                              disabled={!compareWithId || compareLoading}
                              className={`px-4 py-1.5 rounded text-xs font-bold transition-all text-white shrink-0 ${
                                !compareWithId || compareLoading
                                  ? 'bg-zinc-200 cursor-not-allowed text-zinc-400'
                                  : 'bg-black hover:bg-zinc-800'
                              }`}
                            >
                              {compareLoading ? 'Comparando...' : 'Analizar Diferencias'}
                            </button>
                          </div>
                        </div>

                        {compareLoading && (
                          <div className="border border-zinc-150 p-8 rounded-lg flex flex-col items-center justify-center bg-white space-y-2.5 animate-pulse">
                            <span className="w-6 h-6 rounded-full border-2 border-zinc-300 border-t-black animate-spin" />
                            <span className="text-[11px] font-mono text-zinc-400">Analizando discrepancias y cambios de alcance...</span>
                          </div>
                        )}

                        {compareResult && (
                          <div className="space-y-4 animate-fade-in">
                            {/* Summary of changes */}
                            <div className="border border-zinc-200 rounded-lg bg-white p-4 space-y-2">
                              <h5 className="text-[10px] font-mono text-zinc-400 uppercase">Resumen de Cambios de Rumbo</h5>
                              <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-line font-sans">
                                {compareResult.summaryOfChanges}
                              </p>
                            </div>

                            {/* Agreements Diff */}
                            <div className="border border-zinc-200 rounded-lg bg-white p-4 space-y-2">
                              <h5 className="text-[10px] font-mono text-zinc-400 uppercase">Diferencia en Acuerdos y Compromisos</h5>
                              <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-line font-sans">
                                {compareResult.agreementsDiff}
                              </p>
                            </div>

                            {/* Scope Creep Alerts */}
                            <div className="space-y-2">
                              <h5 className="text-[10px] font-mono text-zinc-400 uppercase">Alertas de Desviación de Alcance (Scope Creep)</h5>
                              {compareResult.scopeCreepAlerts && compareResult.scopeCreepAlerts.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3">
                                  {compareResult.scopeCreepAlerts.map((alert: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className={`border rounded-lg p-4 font-sans space-y-1.5 ${
                                        alert.severity === 'High'
                                          ? 'border-red-150 bg-red-50 text-red-900'
                                          : alert.severity === 'Medium'
                                          ? 'border-amber-150 bg-amber-50 text-amber-900'
                                          : 'border-zinc-200 bg-zinc-50 text-zinc-900'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <span
                                          className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase font-mono ${
                                            alert.severity === 'High'
                                              ? 'text-red-700 bg-red-100 border-red-200'
                                              : alert.severity === 'Medium'
                                              ? 'text-amber-700 bg-amber-100 border-amber-200'
                                              : 'text-zinc-650 bg-zinc-200 border-zinc-300'
                                          }`}
                                        >
                                          Severidad: {alert.severity}
                                        </span>
                                      </div>
                                      <p className="text-xs font-bold leading-relaxed">{alert.description}</p>
                                      {alert.impact && (
                                        <div className="text-[10px] opacity-80 pt-1 border-t border-current/10 font-sans">
                                          🎯 <strong>Impacto estimado:</strong> {alert.impact}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-zinc-400 italic bg-zinc-50 border p-4 rounded text-center">
                                  ✅ No se detectaron desvíos o ampliaciones críticas de alcance respecto a la reunión seleccionada.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 1: Executive Summary */}
                    {activeReviewTab === 'summary' && (
                      <div className="space-y-4">
                        <div className="bg-zinc-50 border border-zinc-150 p-4 rounded-lg leading-relaxed">
                          <h4 className="text-[10px] font-mono text-zinc-400 uppercase mb-2">Propósito y Resumen Ejecutivo</h4>
                          <p className="text-xs text-zinc-700 leading-relaxed font-sans">
                            {selectedMeeting.aiSummary || selectedMeeting.summary || 'Resumen no generado.'}
                          </p>
                        </div>
                        {selectedMeeting.agreements && selectedMeeting.agreements.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-mono text-zinc-400 uppercase mb-2">Temas Tratados</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedMeeting.agreements.map((t, idx) => (
                                <span key={idx} className="bg-zinc-100 text-zinc-700 text-[10px] font-bold px-2 py-0.5 rounded border border-zinc-200">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 2: Actions / Tasks suggestions */}
                    {activeReviewTab === 'actions' && (
                      <div className="space-y-4">
                        {(selectedMeeting.extractedActions || []).map((action, idx) => {
                          const isEditing = editingActionIdx === idx;
                          const isConverting = convertTaskIdx === idx;

                          return (
                            <div key={idx} className="border border-zinc-200 rounded-lg p-4 bg-white hover:border-zinc-300 transition-colors shadow-xs">
                              {isEditing ? (
                                <div className="space-y-3">
                                  <span className="text-[9px] font-mono text-zinc-400 uppercase">Modo Edición</span>
                                  <div>
                                    <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-1">Título de la Tarea</label>
                                    <input
                                      type="text"
                                      value={editActionTitle}
                                      onChange={e => setEditActionTitle(e.target.value)}
                                      className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-black font-semibold"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-1">Descripción</label>
                                    <textarea
                                      value={editActionDesc}
                                      onChange={e => setEditActionDesc(e.target.value)}
                                      className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-black h-16 resize-none"
                                    />
                                  </div>
                                  <div className="grid grid-cols-3 gap-3">
                                    <div>
                                      <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-1">Responsable Detectado</label>
                                      <input
                                        type="text"
                                        value={editActionOwner}
                                        onChange={e => setEditActionOwner(e.target.value)}
                                        className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-1">Prioridad</label>
                                      <select
                                        value={editActionPriority}
                                        onChange={e => setEditActionPriority(e.target.value as any)}
                                        className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs focus:outline-none cursor-pointer"
                                      >
                                        <option value="Low">Baja</option>
                                        <option value="Medium">Media</option>
                                        <option value="High">Alta</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-1">Fecha Límite</label>
                                      <input
                                        type="date"
                                        value={editActionDueDate}
                                        onChange={e => setEditActionDueDate(e.target.value)}
                                        className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex gap-2 justify-end pt-1">
                                    <button
                                      onClick={() => setEditingActionIdx(null)}
                                      className="px-2.5 py-1 text-[10px] text-zinc-500 hover:text-black font-semibold"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      onClick={() => handleSaveActionEdit(idx)}
                                      className="bg-black text-white hover:bg-zinc-800 px-3 py-1 text-[10px] font-bold rounded"
                                    >
                                      Guardar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                  <div className="space-y-1 w-full">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="text-xs font-bold text-black">{action.title}</h4>
                                      <span className="text-[8px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-mono border">
                                        Confianza: {Math.round((action.confidence || 1.0) * 100)}%
                                      </span>
                                      {action.priority && (
                                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase font-mono ${
                                          action.priority === 'High' ? 'text-red-700 bg-red-50 border-red-150' : action.priority === 'Medium' ? 'text-amber-700 bg-amber-50 border-amber-150' : 'text-zinc-600 bg-zinc-50 border-zinc-150'
                                        }`}>
                                          {action.priority}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-zinc-500 leading-relaxed pr-2">{action.description || 'Sin descripción detallada.'}</p>
                                    <div className="flex items-center gap-3 pt-2 text-[10px] font-mono text-zinc-400">
                                      <span>👤 Responsable sugerido: <strong className="text-zinc-700">{action.ownerName}</strong></span>
                                      {action.dueDate && (
                                        <span>📅 Límite: <strong className="text-zinc-700">{new Date(action.dueDate).toLocaleDateString('es-ES')}</strong></span>
                                      )}
                                    </div>

                                    {/* Link to Task after creation */}
                                    {action.accepted && action.convertedTaskId && (
                                      <div className="mt-2.5 flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold px-2 py-1 rounded w-fit">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                        <span>Convertido formalmente en Tarea del Proyecto</span>
                                        <span className="text-[9px] text-zinc-400 font-normal font-sans">(TraceLink registrado)</span>
                                      </div>
                                    )}

                                    {/* Conversion interface drawer */}
                                    {isConverting && (
                                      <div className="mt-3 bg-zinc-50 border border-zinc-200 p-3 rounded space-y-2">
                                        <span className="text-[9px] font-mono text-zinc-400 uppercase block">Asignación Operativa</span>
                                        <div className="flex flex-col md:flex-row gap-2 items-end">
                                          <div className="w-full">
                                            <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-1">Miembro del Proyecto</label>
                                            <select
                                              value={convertTaskAssigned}
                                              onChange={e => setConvertTaskAssigned(e.target.value)}
                                              className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-black cursor-pointer font-semibold"
                                            >
                                              <option value="">No asignar responsable (Sin asignar)</option>
                                              {members.map(m => (
                                                <option key={m.user._id} value={m.user._id}>
                                                  {m.user.name} ({m.operationalRole || m.role})
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                          <div className="flex gap-1.5 shrink-0">
                                            <button
                                              onClick={() => setConvertTaskIdx(null)}
                                              className="px-2 py-1 text-[10px] font-semibold text-zinc-500 hover:text-black bg-white border rounded"
                                            >
                                              Cancelar
                                            </button>
                                            <button
                                              onClick={() => handleConvertTask(idx)}
                                              className="bg-black text-white hover:bg-zinc-800 px-3 py-1 text-[10px] font-bold rounded"
                                            >
                                              Confirmar & Crear
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Action Buttons */}
                                  {currentStatus === 'Analyzed' && !action.accepted && !isConverting && (
                                    <div className="flex md:flex-col gap-1.5 justify-end shrink-0 md:w-32">
                                      <button
                                        onClick={() => {
                                          setConvertTaskIdx(idx);
                                          // prefill if possible matching member name
                                          const matched = members.find(m => m.user.name.toLowerCase().includes((action.ownerName || '').toLowerCase()));
                                          if (matched) setConvertTaskAssigned(matched.user._id);
                                        }}
                                        className="bg-black hover:bg-zinc-800 text-white text-[10px] font-bold px-2 py-1 rounded text-center transition-colors w-full flex items-center justify-center gap-1"
                                      >
                                        Crear Tarea <ChevronRight className="w-3 h-3" />
                                      </button>
                                      <div className="flex gap-1 w-full">
                                        <button
                                          onClick={() => {
                                            setEditActionTitle(action.title);
                                            setEditActionDesc(action.description || '');
                                            setEditActionOwner(action.ownerName || '');
                                            setEditActionPriority(action.priority || 'Medium');
                                            setEditActionDueDate(action.dueDate ? new Date(action.dueDate).toISOString().split('T')[0] : '');
                                            setEditingActionIdx(idx);
                                          }}
                                          className="text-[10px] border border-zinc-200 text-zinc-600 hover:bg-zinc-50 px-2 py-1 rounded text-center flex-1"
                                        >
                                          Editar
                                        </button>
                                        <button
                                          onClick={() => handleDiscardAction(idx)}
                                          className="text-[10px] hover:text-red-600 hover:bg-red-50 text-zinc-400 px-2 py-1 rounded text-center"
                                        >
                                          <XCircle className="w-3.5 h-3.5 mx-auto" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {(selectedMeeting.extractedActions || []).length === 0 && (
                          <div className="text-xs text-zinc-400 italic">No se identificaron compromisos/tareas sugeridas.</div>
                        )}
                      </div>
                    )}

                    {/* Tab 3: Requirements suggestion */}
                    {activeReviewTab === 'requirements' && (
                      <div className="space-y-4">
                        {(selectedMeeting.extractedRequirements || []).map((reqSug, idx) => {
                          const isEditing = editingReqIdx === idx;
                          const isConverting = convertReqIdx === idx;

                          return (
                            <div key={idx} className="border border-zinc-200 rounded-lg p-4 bg-white hover:border-zinc-300 transition-colors shadow-xs">
                              {isEditing ? (
                                <div className="space-y-3">
                                  <span className="text-[9px] font-mono text-zinc-400 uppercase">Modo Edición</span>
                                  <div>
                                    <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-1">Descripción del Requerimiento</label>
                                    <textarea
                                      value={editReqText}
                                      onChange={e => setEditReqText(e.target.value)}
                                      className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-black h-20 resize-none font-sans"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-1">Clasificación</label>
                                    <select
                                      value={editReqType}
                                      onChange={e => setEditReqType(e.target.value as any)}
                                      className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs focus:outline-none cursor-pointer"
                                    >
                                      <option value="Functional">Funcional</option>
                                      <option value="NonFunctional">No Funcional</option>
                                    </select>
                                  </div>
                                  <div className="flex gap-2 justify-end pt-1">
                                    <button
                                      onClick={() => setEditingReqIdx(null)}
                                      className="px-2.5 py-1 text-[10px] text-zinc-500 hover:text-black font-semibold"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      onClick={() => handleSaveReqEdit(idx)}
                                      className="bg-black text-white hover:bg-zinc-800 px-3 py-1 text-[10px] font-bold rounded"
                                    >
                                      Guardar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                  <div className="space-y-1.5 w-full">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase font-mono ${
                                        reqSug.type === 'NonFunctional' ? 'text-teal-700 bg-teal-50 border-teal-150' : 'text-blue-700 bg-blue-50 border-blue-150'
                                      }`}>
                                        {reqSug.type === 'NonFunctional' ? 'No Funcional' : 'Funcional'}
                                      </span>
                                      <span className="text-[8px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-mono border">
                                        Confianza: {Math.round((reqSug.confidence || 1.0) * 100)}%
                                      </span>
                                    </div>
                                    <p className="text-xs text-zinc-700 leading-relaxed font-sans">{reqSug.text}</p>

                                    {/* Link to Requirement after creation */}
                                    {reqSug.accepted && reqSug.convertedRequirementId && (
                                      <div className="mt-2.5 flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold px-2 py-1 rounded w-fit">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                        <span>Convertido formalmente en Requerimiento del Proyecto</span>
                                        <span className="text-[9px] text-zinc-400 font-normal font-sans">(TraceLink registrado)</span>
                                      </div>
                                    )}

                                    {/* Conversion interface drawer */}
                                    {isConverting && (
                                      <div className="mt-3 bg-zinc-50 border border-zinc-200 p-3 rounded space-y-3">
                                        <span className="text-[9px] font-mono text-zinc-400 uppercase block">Configuración de Requerimiento</span>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          <div>
                                            <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-1">Código Único (Requerido)</label>
                                            <input
                                              type="text"
                                              required
                                              value={convertReqCode}
                                              onChange={e => setConvertReqCode(e.target.value)}
                                              placeholder={reqSug.type === 'NonFunctional' ? 'Ej: RN-01' : 'Ej: RF-01'}
                                              className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-black font-semibold"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-1">Prioridad</label>
                                            <select
                                              value={convertReqPriority}
                                              onChange={e => setConvertReqPriority(e.target.value as any)}
                                              className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs focus:outline-none cursor-pointer"
                                            >
                                              <option value="High">Alta</option>
                                              <option value="Medium">Media</option>
                                              <option value="Low">Baja</option>
                                            </select>
                                          </div>
                                        </div>
                                        <div className="flex gap-1.5 justify-end pt-1">
                                          <button
                                            onClick={() => setConvertReqIdx(null)}
                                            className="px-2 py-1 text-[10px] font-semibold text-zinc-500 hover:text-black bg-white border rounded"
                                          >
                                            Cancelar
                                          </button>
                                          <button
                                            onClick={() => handleConvertRequirement(idx)}
                                            className="bg-black text-white hover:bg-zinc-800 px-3 py-1 text-[10px] font-bold rounded"
                                          >
                                            Confirmar & Crear
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Action Buttons */}
                                  {currentStatus === 'Analyzed' && !reqSug.accepted && !isConverting && (
                                    <div className="flex md:flex-col gap-1.5 justify-end shrink-0 md:w-36">
                                      <button
                                        onClick={() => {
                                          setConvertReqIdx(idx);
                                          // Pre-fill code suggestion based on current count
                                          const count = (selectedMeeting.extractedRequirements || []).slice(0, idx).filter(r => r.type === reqSug.type).length + 1;
                                          const prefix = reqSug.type === 'NonFunctional' ? 'RN' : 'RF';
                                          setConvertReqCode(`${prefix}-${count < 10 ? '0' + count : count}`);
                                        }}
                                        className="bg-black hover:bg-zinc-800 text-white text-[10px] font-bold px-2 py-1 rounded text-center transition-colors w-full flex items-center justify-center gap-1"
                                      >
                                        Crear Req. <ChevronRight className="w-3 h-3" />
                                      </button>
                                      <div className="flex gap-1 w-full">
                                        <button
                                          onClick={() => {
                                            setEditReqText(reqSug.text);
                                            setEditReqType(reqSug.type);
                                            setEditingReqIdx(idx);
                                          }}
                                          className="text-[10px] border border-zinc-200 text-zinc-600 hover:bg-zinc-50 px-2 py-1 rounded text-center flex-1"
                                        >
                                          Editar
                                        </button>
                                        <button
                                          onClick={() => handleDiscardReq(idx)}
                                          className="text-[10px] hover:text-red-600 hover:bg-red-50 text-zinc-400 px-2 py-1 rounded text-center"
                                        >
                                          <XCircle className="w-3.5 h-3.5 mx-auto" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {(selectedMeeting.extractedRequirements || []).length === 0 && (
                          <div className="text-xs text-zinc-400 italic">No se identificaron requerimientos implícitos.</div>
                        )}
                      </div>
                    )}

                    {/* Tab 4: Decisions suggestion */}
                    {activeReviewTab === 'decisions' && (
                      <div className="space-y-4">
                        {(selectedMeeting.extractedDecisions || []).map((dec, idx) => {
                          const isConverting = convertDecIdx === idx;

                          return (
                            <div key={idx} className="border border-zinc-200 rounded-lg p-4 bg-white hover:border-zinc-300 transition-colors shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="space-y-1.5 w-full">
                                <p className="text-xs text-zinc-700 leading-relaxed font-sans">{dec.text}</p>
                                
                                {dec.accepted && dec.convertedADRId && (
                                  <div className="mt-2.5 flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold px-2 py-1 rounded w-fit">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                    <span>Registrada oficialmente como ADR (Borrador)</span>
                                    <span className="text-[9px] text-zinc-400 font-normal font-sans">(TraceLink registrado)</span>
                                  </div>
                                )}

                                {dec.accepted && !dec.convertedADRId && (
                                  <span className="mt-2.5 inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-150 px-2 py-0.5 rounded text-[10px] font-bold">
                                    ✓ Aceptada como decisión de la minuta
                                  </span>
                                )}

                                {isConverting && (
                                  <div className="mt-3 bg-zinc-50 border border-zinc-200 p-3 rounded space-y-2">
                                    <span className="text-[9px] font-mono text-zinc-400 uppercase block">Creación de ADR (Architecture Decision Record)</span>
                                    <div className="flex flex-col md:flex-row gap-2 items-end">
                                      <div className="w-full">
                                        <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-1">Código de ADR</label>
                                        <input
                                          type="text"
                                          required
                                          value={convertDecCode}
                                          onChange={e => setConvertDecCode(e.target.value)}
                                          placeholder="Ej: ADR-01"
                                          className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-black font-semibold"
                                        />
                                      </div>
                                      <div className="flex gap-1.5 shrink-0">
                                        <button
                                          onClick={() => setConvertDecIdx(null)}
                                          className="px-2 py-1 text-[10px] font-semibold text-zinc-500 hover:text-black bg-white border rounded"
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          onClick={() => handleConvertDecision(idx)}
                                          className="bg-black text-white hover:bg-zinc-800 px-3 py-1 text-[10px] font-bold rounded"
                                        >
                                          Crear ADR
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              {currentStatus === 'Analyzed' && !dec.accepted && !isConverting && (
                                <div className="flex md:flex-col gap-1.5 justify-end shrink-0 md:w-36">
                                  <button
                                    onClick={() => {
                                      setConvertDecIdx(idx);
                                      setConvertDecCode('ADR-01');
                                    }}
                                    className="bg-black hover:bg-zinc-800 text-white text-[10px] font-bold px-2 py-1 rounded text-center transition-colors w-full flex items-center justify-center gap-1"
                                  >
                                    Convertir a ADR <ChevronRight className="w-3 h-3" />
                                  </button>
                                  <div className="flex gap-1 w-full">
                                    <button
                                      onClick={() => handleAcceptDecisionDirectly(idx)}
                                      className="text-[10px] border border-zinc-200 text-zinc-600 hover:bg-zinc-50 px-2 py-1 rounded text-center flex-1"
                                    >
                                      Validar
                                    </button>
                                    <button
                                      onClick={() => handleDiscardDecision(idx)}
                                      className="text-[10px] hover:text-red-600 hover:bg-red-50 text-zinc-400 px-2 py-1 rounded text-center"
                                    >
                                      <XCircle className="w-3.5 h-3.5 mx-auto" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {(selectedMeeting.extractedDecisions || []).length === 0 && (
                          <div className="text-xs text-zinc-400 italic">No se identificaron decisiones explícitas en la reunión.</div>
                        )}
                      </div>
                    )}

                    {/* Tab 5: Risks suggestion */}
                    {activeReviewTab === 'risks' && (
                      <div className="space-y-4">
                        {(selectedMeeting.extractedRisks || []).map((risk, idx) => (
                          <div key={idx} className="border border-zinc-200 rounded-lg p-4 bg-white hover:border-zinc-300 transition-colors shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="space-y-1.5 w-full">
                              <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border uppercase font-mono ${
                                  risk.severity === 'High' ? 'text-red-700 bg-red-50 border-red-150 animate-pulse' : risk.severity === 'Medium' ? 'text-amber-700 bg-amber-50 border-amber-150' : 'text-zinc-600 bg-zinc-50 border-zinc-150'
                                }`}>
                                  Riesgo {risk.severity}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-700 leading-relaxed font-sans">{risk.text}</p>
                              
                              {risk.accepted && (
                                <span className="mt-2 inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-150 px-2 py-0.5 rounded text-[10px] font-bold">
                                  ✓ Aceptado e integrado al registro de la minuta
                                </span>
                              )}
                            </div>

                            {/* Action Buttons */}
                            {currentStatus === 'Analyzed' && !risk.accepted && (
                              <div className="flex md:flex-col gap-1.5 justify-end shrink-0 md:w-28">
                                <button
                                  onClick={() => handleAcceptRiskDirectly(idx)}
                                  className="bg-black hover:bg-zinc-800 text-white text-[10px] font-bold px-2.5 py-1 rounded text-center transition-colors w-full"
                                >
                                  Validar Riesgo
                                </button>
                                <button
                                  onClick={() => handleDiscardRisk(idx)}
                                  className="text-[10px] border border-zinc-200 text-zinc-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded text-center transition-all w-full"
                                >
                                  Descartar
                                </button>
                              </div>
                            )}
                          </div>
                        ))}

                        {(selectedMeeting.extractedRisks || []).length === 0 && (
                          <div className="text-xs text-zinc-400 italic">No se identificaron riesgos o bloqueos potenciales.</div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* Step 4: Published metrics summary */}
              {currentStatus === 'Published' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-white shadow-lg space-y-6">
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                    <Info className="w-4 h-4 text-green-400" />
                    <h3 className="text-xs font-extrabold uppercase font-mono tracking-wider text-zinc-200">Seguimiento Post-Reunión y Trazabilidad</h3>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-zinc-950/80 border border-zinc-850 p-4 rounded text-center">
                      <span className="text-xl font-bold text-white block">{stats.tasks}</span>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase">Tareas Creadas</span>
                    </div>
                    <div className="bg-zinc-950/80 border border-zinc-850 p-4 rounded text-center">
                      <span className="text-xl font-bold text-white block">{stats.reqs}</span>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase">Requerimientos</span>
                    </div>
                    <div className="bg-zinc-950/80 border border-zinc-850 p-4 rounded text-center">
                      <span className="text-xl font-bold text-white block">{stats.adrs}</span>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase">ADRs Generados</span>
                    </div>
                    <div className="bg-zinc-950/80 border border-zinc-850 p-4 rounded text-center">
                      <span className="text-xl font-bold text-white block">{stats.risks}</span>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase">Riesgos Aceptados</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-950/40 p-3 rounded border border-zinc-850/50">
                    💡 <strong>Nota de Trazabilidad:</strong> Cada uno de estos artefactos creados posee un enlace de procedencia (`TraceLink`) de tipo `extracted_from` indexado automáticamente en la base documental del proyecto. Puedes visualizarlos directamente en sus respectivos módulos de trabajo.
                  </p>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-lg p-16 text-center text-zinc-500 shadow-sm flex flex-col items-center justify-center">
              <MessageSquare className="w-12 h-12 text-zinc-200 mb-3" />
              <span className="text-sm font-bold text-zinc-700">Ninguna Minuta Seleccionada</span>
              <p className="text-xs text-zinc-400 max-w-sm mt-1">Selecciona una minuta del panel izquierdo o registra una nueva sesión de equipo para comenzar.</p>
            </div>
          )}
        </div>
      </div>

      {/* STEP 1: Add Modal Capture */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 max-w-3xl w-full shadow-lg max-h-[90vh] overflow-y-auto space-y-4">
            <div>
              <h3 className="text-base font-bold text-black">Registrar Minuta de Reunión</h3>
              <p className="text-[11px] text-zinc-400">Paso 1: Registra los detalles básicos, participantes y apuntes o transcripciones.</p>
            </div>

            <form onSubmit={handleAddMeeting} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Título de la Sesión</label>
                  <input
                    type="text"
                    required
                    value={meetingTitle}
                    onChange={e => setMeetingTitle(e.target.value)}
                    placeholder="Ej: Sincronización de requerimientos con Stakeholder"
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-xs text-black focus:outline-none focus:border-black font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Fecha de la Sesión</label>
                  <input
                    type="date"
                    required
                    value={meetingDate}
                    onChange={e => setMeetingDate(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-xs text-black focus:outline-none focus:border-black cursor-pointer font-semibold"
                  />
                </div>
              </div>

              {/* Participant manager inside modal */}
              <div className="border border-zinc-150 p-4 rounded-lg bg-zinc-50/50 space-y-3">
                <h4 className="text-xs font-bold text-black flex items-center gap-1">
                  <Users className="w-4 h-4" /> Gestión de Participantes
                </h4>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="pType"
                      checked={pType === 'member'}
                      onChange={() => setPType('member')}
                    />
                    Miembro de Proyecto
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="pType"
                      checked={pType === 'external'}
                      onChange={() => setPType('external')}
                    />
                    Externo (ej: Cliente/Tutor)
                  </label>
                </div>

                <div className="flex flex-col md:flex-row gap-2 items-end">
                  {pType === 'member' ? (
                    <div className="w-full">
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Seleccionar Integrante</label>
                      <select
                        value={pMemberId}
                        onChange={e => setPMemberId(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none cursor-pointer"
                      >
                        <option value="">Seleccionar...</option>
                        {members.map(m => (
                          <option key={m.user._id} value={m.user._id}>
                            {m.user.name} ({m.operationalRole || m.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 w-full">
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Nombre</label>
                        <input
                          type="text"
                          value={pName}
                          onChange={e => setPName(e.target.value)}
                          placeholder="Juan Pérez"
                          className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Rol / Cargo</label>
                        <input
                          type="text"
                          value={pRole}
                          onChange={e => setPRole(e.target.value)}
                          placeholder="Product Owner"
                          className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">E-mail</label>
                        <input
                          type="email"
                          value={pEmail}
                          onChange={e => setPEmail(e.target.value)}
                          placeholder="juan@empresa.com"
                          className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleAddParticipant}
                    className="bg-black text-white hover:bg-zinc-800 text-[10px] font-bold px-3 py-1.5 rounded transition-colors shrink-0"
                  >
                    Añadir
                  </button>
                </div>

                {/* Badge list of current temp participants */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-200/60">
                  {tempParticipants.map((tp, idx) => (
                    <span key={idx} className="bg-white border border-zinc-200 text-zinc-700 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      {tp.name} <span className="text-[8px] text-zinc-400">({tp.role})</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(idx)}
                        className="text-zinc-300 hover:text-red-600 font-extrabold ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {tempParticipants.length === 0 && (
                    <span className="text-zinc-400 italic text-[11px]">Agrega personas participantes de la reunión.</span>
                  )}
                </div>
              </div>

              {/* Text areas for Manual Notes and Full transcription */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Agenda Previa / Temas Planificados</label>
                  <textarea
                    value={meetingAgenda}
                    onChange={e => setMeetingAgenda(e.target.value)}
                    placeholder="Describe los temas o puntos definidos previamente para tratar en la reunión..."
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-xs text-black focus:outline-none focus:border-black placeholder-zinc-300 h-16 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Apuntes / Notas Generales</label>
                  <textarea
                    value={meetingNotes}
                    onChange={e => setMeetingNotes(e.target.value)}
                    placeholder="Escribe aquí los temas generales discutidos o anotaciones rápidas tomadas durante la sesión..."
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-xs text-black focus:outline-none focus:border-black placeholder-zinc-300 h-16 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Transcripción de Audio (Recomendado para análisis IA)</label>
                  <textarea
                    value={meetingTranscript}
                    onChange={e => setMeetingTranscript(e.target.value)}
                    placeholder="Pega aquí la transcripción completa de la llamada de Teams, Zoom, Meet o el archivo de texto del dictado..."
                    className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-xs text-black focus:outline-none focus:border-black placeholder-zinc-300 h-32 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setTempParticipants([]);
                  }}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-black transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-1.5 rounded transition-colors"
                >
                  Guardar Minuta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

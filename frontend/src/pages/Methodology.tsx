import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { Settings, Plus, Trash2, ArrowRight, ArrowLeft, Lock, Unlock, AlertTriangle } from 'lucide-react';

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'Todo' | 'In-Progress' | 'Review' | 'Done';
  assignedTo: { _id: string, name: string } | null;
  sprint: string;
}

const METHODOLOGY_DETAILS: Record<string, {
  name: string;
  icon: string;
  description: string;
  howItWorks: string[];
  howTheyWork: string[];
  recommendation: string;
}> = {
  Waterfall: {
    name: "Cascada (Waterfall)",
    icon: "📈",
    description: "Trabaja de forma lineal y secuencial. Cada fase debe completarse antes de iniciar la siguiente. Ideal para proyectos con requisitos claros y estables.",
    howItWorks: [
      "Requisitos: Levantamiento inicial detallado.",
      "Diseño: Planificación y diseño de arquitectura.",
      "Desarrollo: Codificación sistemática.",
      "Pruebas: Verificación de fallos final.",
      "Despliegue: Entrega del producto completo.",
      "Mantenimiento: Ajustes post-entrega."
    ],
    howTheyWork: [
      "Mucha documentación en cada hito.",
      "Poco cambio admitido durante el proceso.",
      "Revisión y aprobación al final de cada fase."
    ],
    recommendation: "Es recomendable si la tesis tiene objetivos completamente delimitados que no variarán y el cliente externo requiere control secuencial y formal."
  },
  Agile: {
    name: "Ágil (Agile)",
    icon: "⚡",
    description: "Enfoque iterativo centrado en la colaboración, adaptación rápida y entrega continua de valor. El software funcional es la principal medida de progreso.",
    howItWorks: [
      "Se divide el trabajo en ciclos cortos.",
      "Se priorizan tareas constantemente por valor de negocio.",
      "Se revisa y ajusta continuamente según feedback.",
      "Se entrega software usable por partes incrementales."
    ],
    howTheyWork: [
      "Comunicación constante y fluida en el equipo.",
      "Cambios bienvenidos y gestionados en cualquier momento.",
      "Menos burocracia documental inicial."
    ],
    recommendation: "Ideal para proyectos de tesis que involucren desarrollo de software interactivo donde los requerimientos evolucionan al interactuar con el cliente."
  },
  Scrum: {
    name: "Scrum",
    icon: "🔄",
    description: "Marco ágil estructurado en iteraciones fijas llamadas Sprints. Organiza al equipo en roles definidos para maximizar la productividad y entregas rápidas.",
    howItWorks: [
      "Product Backlog con tareas priorizadas.",
      "Sprint Planning (planificación del ciclo).",
      "Sprint de desarrollo (2 a 4 semanas).",
      "Sprint Review (demostración de avance).",
      "Sprint Retrospective (mejora de procesos)."
    ],
    howTheyWork: [
      "Roles definidos: Product Owner, Scrum Master y Equipo de Desarrollo.",
      "Trabajo riguroso por iteraciones fijas.",
      "Reuniones diarias cortas y frecuentes."
    ],
    recommendation: "Es la mejor opción para tesis en equipo, pues permite planificar las entregas quincenales para las reuniones de avance con el profesor guía."
  },
  Kanban: {
    name: "Kanban",
    icon: "📋",
    description: "Centrado en visualizar el flujo de trabajo en tiempo real y limitar el trabajo en progreso (WIP). Evita cuellos de botella y optimiza la eficiencia.",
    howItWorks: [
      "Visualización del flujo en columnas.",
      "Las tareas se mueven según el avance real del equipo.",
      "Control estricto de cuántas tareas pueden estar activas en simultáneo."
    ],
    howTheyWork: [
      "Flujo continuo y flexible sin sprints fijos de tiempo.",
      "Ideal para equipos reactivos o mantenciones.",
      "Fácil de entender visualmente."
    ],
    recommendation: "Sugerido si tu tesis es individual, de carácter investigativo o consiste en dar soporte a una plataforma existente con tareas entrantes variables."
  },
  Espiral: {
    name: "Espiral (Spiral)",
    icon: "🌀",
    description: "Combina desarrollo iterativo con análisis riguroso de riesgos. En cada vuelta se planifica, evalúan riesgos, se desarrolla un prototipo y se evalúa.",
    howItWorks: [
      "Planificación y definición de objetivos.",
      "Análisis profundo y mitigación de riesgos.",
      "Desarrollo y testeo de prototipos conceptuales.",
      "Evaluación del avance con el cliente.",
      "Planificación del siguiente ciclo."
    ],
    howTheyWork: [
      "Enfoque proactivo hacia la prevención de fallos.",
      "Modelo altamente iterativo y flexible.",
      "Útil cuando el proyecto no está completamente definido."
    ],
    recommendation: "Altamente recomendado para tesis con alta incertidumbre tecnológica (ej. algoritmos complejos de Machine Learning o integración de hardware nuevo)."
  },
  Prototipos: {
    name: "Prototipos",
    icon: "🎨",
    description: "Consiste en construir maquetas y versiones rápidas para validar ideas, flujos e interfaces con el usuario antes del desarrollo definitivo del software.",
    howItWorks: [
      "Creación veloz de un prototipo interactivo.",
      "Prueba de usabilidad con el usuario real.",
      "Recolección de feedback inmediato.",
      "Refinamiento del diseño hasta la versión final."
    ],
    howTheyWork: [
      "Mucha interacción directa con el usuario final.",
      "Validación de diseño y funcionalidad clave a bajo costo.",
      "Reducción sustancial de errores de entendimiento de requisitos."
    ],
    recommendation: "Esencial para tesis enfocadas en Experiencia de Usuario (UX/UI) o sistemas con procesos de negocio complejos no digitalizados previamente."
  },
  RUP: {
    name: "RUP (Rational Unified Process)",
    icon: "🏛️",
    description: "Metodología iterativa y formal orientada a la arquitectura, modelamiento de casos de uso y documentación formal detallada del diseño de software.",
    howItWorks: [
      "Fase de Inicio: Delimitación de objetivos del negocio.",
      "Fase de Elaboración: Definición de arquitectura base.",
      "Fase de Construcción: Desarrollo e implementación del código.",
      "Fase de Transición: Entrega, pruebas finales y puesta en marcha."
    ],
    howTheyWork: [
      "Enfoque iterativo estructurado y disciplinado.",
      "Generación de diagramas y especificaciones de requisitos UML formal.",
      "Orientado a proyectos medianos o grandes."
    ],
    recommendation: "Recomendado para tesis académicas muy estructuradas que exigen un cuerpo documental robusto de diagramas y planos de ingeniería antes de codificar."
  },
  XP: {
    name: "Programación Extrema (XP)",
    icon: "🛠️",
    description: "Metodología ágil que maximiza la calidad técnica del código mediante ciclos muy cortos y prácticas colaborativas intensivas de ingeniería de software.",
    howItWorks: [
      "Iteraciones muy cortas con entregas de software utilizable.",
      "Muchos tests automatizados (TDD sugerido).",
      "Refactorización constante para mantener código limpio.",
      "Feedback continuo con el cliente integrado."
    ],
    howTheyWork: [
      "Programación en parejas (Pair Programming).",
      "Propiedad colectiva y diseño simple.",
      "Ideal para equipos pequeños y dinámicos."
    ],
    recommendation: "Muy útil en proyectos de tesis donde los estudiantes programan en pareja y desean asegurar una calidad y orden técnico excepcional en el código."
  },
  DevOps: {
    name: "DevOps",
    icon: "♾️",
    description: "Unión de desarrollo y operaciones para automatizar la integración, pruebas, despliegue y monitoreo de software con ciclos de entrega continuos.",
    howItWorks: [
      "Integración continua de cambios de código (CI).",
      "Entrega y despliegue automatizado en servidores (CD).",
      "Monitoreo constante del sistema en producción.",
      "Automatización de la infraestructura (IaC)."
    ],
    howTheyWork: [
      "Colaboración estrecha entre desarrollo y operaciones.",
      "Uso de pipelines, contenedores (Docker) y automatizaciones.",
      "Ciclos de entrega estables y muy rápidos."
    ],
    recommendation: "Indispensable si tu tesis aborda temas de arquitectura en la nube, microservicios, infraestructura como código o automatización de despliegues."
  },
  Hibrida: {
    name: "Híbrida",
    icon: "🧩",
    description: "Combina la planificación secuencial del Waterfall con la flexibilidad de ejecución del Agile. Ofrece control estructurado en unas partes y dinamismo en otras.",
    howItWorks: [
      "Definición rígida inicial de requisitos y arquitectura.",
      "Ejecución ágil (sprints o kanban) para desarrollo y código.",
      "Integración de lo mejor de ambos enfoques."
    ],
    howTheyWork: [
      "Altamente adaptable a las necesidades de cada proyecto.",
      "Equilibra entregas rápidas con documentación robusta exigida.",
      "Muy común en la industria de TI real."
    ],
    recommendation: "La propuesta de oro para proyectos de tesis chilenos: entrega la estructura y manuales de ingeniería formal que pide la universidad y la flexibilidad ágil que requiere el equipo."
  },
  Personalizada: {
    name: "Personalizada Asignatura",
    icon: "✏️",
    description: "Se enfoca en adaptar el flujo de desarrollo a los plazos establecidos y rúbricas particulares del curso de proyecto de título de la universidad.",
    howItWorks: [
      "Definición libre del flujo según la planificación docente.",
      "Alineación directa con los hitos y entregas del semestre académico."
    ],
    howTheyWork: [
      "Independiente de marcos comerciales.",
      "Altamente variable."
    ],
    recommendation: "Selecciónala si la universidad exige pautas de evaluación específicas que no calzan con estándares tradicionales de desarrollo."
  }
};



const WATERFALL_PHASES = [
  'Fase 1: Requisitos',
  'Fase 2: Diseño',
  'Fase 3: Desarrollo',
  'Fase 4: Pruebas',
  'Fase 5: Implementación'
];

const SPIRAL_ITERATIONS = [
  'Iteración 1',
  'Iteración 2',
  'Iteración 3'
];

const PROTOTYPE_VERSIONS = [
  'Prototipo v1',
  'Prototipo v2',
  'Versión Final'
];

interface ColumnConfig {
  name: string;
  status: 'Todo' | 'In-Progress' | 'Review' | 'Done';
}

interface BoardLayout {
  type: 'scrum' | 'kanban' | 'waterfall' | 'spiral' | 'prototypes' | 'hybrid' | 'rup' | 'xp' | 'devops';
  columns?: ColumnConfig[];
}

const getBoardLayout = (methodology: string): BoardLayout => {
  switch (methodology) {
    case 'Kanban':
      return {
        type: 'kanban',
        columns: [
          { name: 'Por Hacer', status: 'Todo' },
          { name: 'En Desarrollo', status: 'In-Progress' },
          { name: 'En Revisión / QA', status: 'Review' },
          { name: 'Finalizado', status: 'Done' }
        ]
      };
    case 'Scrum':
    case 'Agile':
      return {
        type: 'scrum',
        columns: [
          { name: 'Pendiente', status: 'Todo' },
          { name: 'En Progreso', status: 'In-Progress' },
          { name: 'En Revisión', status: 'Review' },
          { name: 'Hecho', status: 'Done' }
        ]
      };
    case 'XP':
      return {
        type: 'xp',
        columns: [
          { name: 'Historias / Todo', status: 'Todo' },
          { name: 'Codificación & TDD', status: 'In-Progress' },
          { name: 'Refactorización & QA', status: 'Review' },
          { name: 'Listo / Aprobado', status: 'Done' }
        ]
      };
    case 'DevOps':
      return {
        type: 'devops',
        columns: [
          { name: 'Plan & Backlog', status: 'Todo' },
          { name: 'CI/CD Pipelines', status: 'In-Progress' },
          { name: 'Deploy / Release', status: 'Review' },
          { name: 'Monitoreo / Prod', status: 'Done' }
        ]
      };
    case 'Espiral':
      return {
        type: 'spiral',
        columns: [
          { name: '1. Planificación', status: 'Todo' },
          { name: '2. Análisis de Riesgos', status: 'In-Progress' },
          { name: '3. Desarrollo & Prototipo', status: 'Review' },
          { name: '4. Evaluación del Cliente', status: 'Done' }
        ]
      };
    case 'Prototipos':
      return {
        type: 'prototypes',
        columns: [
          { name: 'Requisitos / Idea', status: 'Todo' },
          { name: 'Maqueta / Wireframe', status: 'In-Progress' },
          { name: 'Validación Usuario', status: 'Review' },
          { name: 'Ajustes & Cierre', status: 'Done' }
        ]
      };
    case 'RUP':
      return {
        type: 'rup',
        columns: [
          { name: 'Por Hacer', status: 'Todo' },
          { name: 'En Desarrollo', status: 'In-Progress' },
          { name: 'En Revisión', status: 'Review' },
          { name: 'Finalizado', status: 'Done' }
        ]
      };
    case 'Waterfall':
      return {
        type: 'waterfall',
        columns: [
          { name: 'Por Hacer', status: 'Todo' },
          { name: 'En Desarrollo', status: 'In-Progress' },
          { name: 'En Revisión', status: 'Review' },
          { name: 'Finalizado', status: 'Done' }
        ]
      };
    case 'Hibrida':
      return {
        type: 'hybrid',
        columns: [
          { name: 'Sprint Backlog', status: 'Todo' },
          { name: 'En Desarrollo', status: 'In-Progress' },
          { name: 'QA & Testing', status: 'Review' },
          { name: 'Entregado / Desplegado', status: 'Done' }
        ]
      };
    default:
      return {
        type: 'kanban',
        columns: [
          { name: 'Por Hacer', status: 'Todo' },
          { name: 'En Desarrollo', status: 'In-Progress' },
          { name: 'En Revisión / QA', status: 'Review' },
          { name: 'Finalizado', status: 'Done' }
        ]
      };
  }
};

export const Methodology: React.FC = () => {
  const { activeProject, updateProject, members } = useProjectStore();
  const { user: currentUser } = useAuthStore();

  const [methodology, setMethodology] = useState<'Scrum' | 'Kanban' | 'Waterfall' | 'Hibrida' | 'Personalizada' | 'Agile' | 'Espiral' | 'Prototipos' | 'RUP' | 'XP' | 'DevOps'>('Scrum');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // New task form fields
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskSprint, setTaskSprint] = useState('Sprint 1');
  const [taskStatus, setTaskStatus] = useState<'Todo' | 'In-Progress' | 'Review' | 'Done'>('Todo');

  // Dynamic view states
  const [activeSprint, setActiveSprint] = useState('Sprint 1');
  const [activeIteration, setActiveIteration] = useState('Iteración 1');
  const [activeVersion, setActiveVersion] = useState('Prototipo v1');
  const [spiralRisk, setSpiralRisk] = useState('');

  // Trazabilidad y gobernanza adaptativa states
  const [requirements, setRequirements] = useState<any[]>([]);
  const [taskLinkedReqs, setTaskLinkedReqs] = useState<string[]>([]);
  const [isWaterfallBaseline, setIsWaterfallBaseline] = useState(false);
  const [changeRequestCode, setChangeRequestCode] = useState('');
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeRequestAuditLog, setChangeRequestAuditLog] = useState<{ id: string, code: string, action: string, timestamp: string }[]>([]);
  const [newTestTitle, setNewTestTitle] = useState('');
  const [selectedReqForTest, setSelectedReqForTest] = useState('');
  const [activePhase, setActivePhase] = useState('Fase 1: Requisitos');
  const [rupDeliverables, setRupDeliverables] = useState<Record<string, boolean>>({});
  const [quickCode, setQuickCode] = useState('');
  const [quickTitle, setQuickTitle] = useState('');

  const API_URL = 'http://localhost:5000/api';
  const headers = useAuthStore.getState().getAuthHeaders();

  const fetchTasks = async () => {
    if (!activeProject) return;
    try {
      const response = await fetch(`${API_URL}/tasks/project/${activeProject._id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRequirements = async () => {
    if (!activeProject) return;
    try {
      const response = await fetch(`${API_URL}/requirements/project/${activeProject._id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setRequirements(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeProject) {
      setMethodology(activeProject.methodology as any);
      fetchTasks();
      fetchRequirements();

      const isBaseline = localStorage.getItem(`tf_wf_baseline_${activeProject._id}`) === 'true';
      setIsWaterfallBaseline(isBaseline);

      const savedAuditLog = localStorage.getItem(`tf_wf_baseline_audit_${activeProject._id}`);
      if (savedAuditLog) {
        setChangeRequestAuditLog(JSON.parse(savedAuditLog));
      } else {
        setChangeRequestAuditLog([]);
      }

      const savedRupDeliv = localStorage.getItem(`tf_rup_deliv_${activeProject._id}`);
      if (savedRupDeliv) {
        setRupDeliverables(JSON.parse(savedRupDeliv));
      } else {
        setRupDeliverables({});
      }
    }
  }, [activeProject]);

  useEffect(() => {
    if (methodology === 'Waterfall') {
      setActivePhase('Fase 1: Requisitos');
      setTaskSprint('Fase 1: Requisitos');
    } else if (methodology === 'RUP') {
      setActivePhase('Inicio');
      setTaskSprint('Inicio');
    } else if (methodology === 'Espiral') {
      setTaskSprint('Iteración 1');
    } else if (methodology === 'Prototipos') {
      setTaskSprint('Prototipo v1');
    } else {
      setTaskSprint('Sprint 1');
    }
  }, [methodology]);

  useEffect(() => {
    if (activeProject) {
      const savedRisk = localStorage.getItem(`tf_risk_${activeProject._id}_${activeIteration}`);
      setSpiralRisk(savedRisk || '');
    }
  }, [activeIteration, activeProject]);

  const handleSaveRisk = () => {
    if (activeProject) {
      localStorage.setItem(`tf_risk_${activeProject._id}_${activeIteration}`, spiralRisk);
      alert('Plan de mitigación de riesgos guardado para ' + activeIteration + '.');
    }
  };

  const handleUpdateMethodology = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!activeProject) return;
    const value = e.target.value as any;
    setMethodology(value);
    await updateProject(activeProject._id, { methodology: value });
  };

  const handleCreateQuickRequirement = async (code: string, title: string) => {
    if (!activeProject) return;
    try {
      const response = await fetch(`${API_URL}/requirements`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: activeProject._id,
          code,
          title,
          type: code.startsWith('RN') ? 'NonFunctional' : 'Functional',
          priority: 'Medium',
          status: 'Draft',
          source: 'Manual'
        })
      });
      if (response.ok) {
        await fetchRequirements();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignRequirement = async (reqId: string, value: string) => {
    let updateField = {};
    if (methodology === 'Waterfall' || methodology === 'RUP') {
      updateField = { phaseRef: value };
    } else if (methodology === 'Espiral') {
      updateField = { iterationRef: value };
    } else if (methodology === 'Prototipos') {
      updateField = { prototypeVersionRef: value };
    } else {
      updateField = { sprintRef: value };
    }
    try {
      const response = await fetch(`${API_URL}/requirements/${reqId}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(updateField)
      });
      if (response.ok) {
        await fetchRequirements();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTestStatus = async (reqId: string, testIdx: number, currentStatus: any) => {
    const req = requirements.find(r => r._id === reqId);
    if (!req) return;
    const updatedTests = [...(req.linkedTests || [])];
    const nextStatus = currentStatus === 'Passed' ? 'Failed' : currentStatus === 'Failed' ? 'Pending' : 'Passed';
    updatedTests[testIdx] = { ...updatedTests[testIdx], status: nextStatus };
    try {
      await fetch(`${API_URL}/requirements/${reqId}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedTests: updatedTests })
      });
      await fetchRequirements();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddUsabilityTest = async (reqId: string) => {
    if (!newTestTitle.trim()) return;
    const req = requirements.find(r => r._id === reqId);
    if (!req) return;
    const updatedTests = [...(req.linkedTests || []), { title: newTestTitle, status: 'Pending', description: 'Prueba de Usabilidad' }];
    try {
      const response = await fetch(`${API_URL}/requirements/${reqId}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedTests: updatedTests })
      });
      if (response.ok) {
        setNewTestTitle('');
        setSelectedReqForTest('');
        await fetchRequirements();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleWaterfallBaseline = () => {
    if (!activeProject) return;
    const nextVal = !isWaterfallBaseline;
    setIsWaterfallBaseline(nextVal);
    localStorage.setItem(`tf_wf_baseline_${activeProject._id}`, nextVal ? 'true' : 'false');
  };

  const handleExecuteChangeRequest = async () => {
    if (!changeRequestCode.trim() || !activeProject) return;

    const pending = (window as any)._pendingReqAction;
    if (!pending) return;

    let desc = "";
    if (pending.action === 'create') {
      desc = `Creado Req Rápido [${pending.code}] ${pending.title}`;
      await handleCreateQuickRequirement(pending.code, pending.title);
    } else if (pending.action === 'assign') {
      desc = `Asignado Req ID [${pending.id}] a valor [${pending.value}]`;
      await handleAssignRequirement(pending.id, pending.value);
    } else if (pending.action === 'create_task') {
      desc = `Creada Tarea [${pending.body.title}] vinculada a requerimientos`;
      await handleCreateTaskAction(pending.body);
    }

    const logEntry = {
      id: Date.now().toString(),
      code: changeRequestCode,
      action: desc,
      timestamp: new Date().toLocaleString()
    };

    const newLog = [logEntry, ...changeRequestAuditLog];
    setChangeRequestAuditLog(newLog);
    localStorage.setItem(`tf_wf_baseline_audit_${activeProject._id}`, JSON.stringify(newLog));

    setChangeRequestCode('');
    setShowChangeRequestModal(false);
    (window as any)._pendingReqAction = null;
  };

  const handleCreateTaskAction = async (body: any) => {
    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (response.ok) {
        setShowTaskModal(false);
        setTaskTitle('');
        setTaskDesc('');
        setTaskAssignedTo('');
        setTaskLinkedReqs([]);
        await fetchTasks();
        await fetchRequirements();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !taskTitle) return;

    const body = {
      project: activeProject._id,
      title: taskTitle,
      description: taskDesc,
      assignedTo: taskAssignedTo || null,
      sprint: taskSprint,
      status: taskStatus,
      linkedRequirements: taskLinkedReqs
    };

    if (methodology === 'Waterfall' && isWaterfallBaseline) {
      setShowChangeRequestModal(true);
      (window as any)._pendingReqAction = {
        action: 'create_task',
        body
      };
      return;
    }

    await handleCreateTaskAction(body);
  };

  const handleMoveTask = async (taskId: string, nextStatus: 'Todo' | 'In-Progress' | 'Review' | 'Done') => {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (response.ok) {
        await fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('¿Eliminar esta tarea definitivamente?')) {
      try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
          method: 'DELETE',
          headers
        });
        if (response.ok) {
          await fetchTasks();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };
  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-zinc-200 rounded-lg bg-white p-8">
        <Settings className="w-8 h-8 text-zinc-400 mb-2" />
        <span className="text-sm text-zinc-500">Selecciona un proyecto para configurar su metodología y flujo de trabajo.</span>
      </div>
    );
  }

  const getLinkedRequirementsForTask = (taskId: string) => {
    return requirements.filter(req => req.linkedTasks?.some((tId: any) => tId.toString() === taskId || tId._id === taskId));
  };

  const getFilteredTasks = () => {
    if (methodology === 'Kanban') {
      return tasks;
    } else if (methodology === 'Waterfall' || methodology === 'RUP') {
      return tasks.filter(t => t.sprint === activePhase);
    } else if (methodology === 'Espiral') {
      return tasks.filter(t => t.sprint === activeIteration);
    } else if (methodology === 'Prototipos') {
      return tasks.filter(t => t.sprint === activeVersion);
    } else {
      return tasks.filter(t => t.sprint === activeSprint);
    }
  };

  const checkWaterfallLocked = (taskSprint: string) => {
    if (methodology !== 'Waterfall') return { isLocked: false, prevPhase: '' };
    const phaseIdx = WATERFALL_PHASES.indexOf(taskSprint);
    if (phaseIdx <= 0) return { isLocked: false, prevPhase: '' };
    
    for (let i = 0; i < phaseIdx; i++) {
      const prevPhase = WATERFALL_PHASES[i];
      const prevTasks = tasks.filter(t => t.sprint === prevPhase);
      const prevCompleted = prevTasks.filter(t => t.status === 'Done').length;
      if (prevTasks.length > 0 && prevCompleted < prevTasks.length) {
        return { isLocked: true, prevPhase };
      }
    }
    return { isLocked: false, prevPhase: '' };
  };

  const handleUpdateReqWfStatus = async (reqId: string, status: string) => {
    try {
      const response = await fetch(`${API_URL}/requirements/${reqId}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowStatus: status })
      });
      if (response.ok) {
        await fetchRequirements();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleRupDeliverable = (key: string) => {
    if (!activeProject) return;
    const updated = { ...rupDeliverables, [key]: !rupDeliverables[key] };
    setRupDeliverables(updated);
    localStorage.setItem(`tf_rup_deliv_${activeProject._id}`, JSON.stringify(updated));
  };

  const renderRequirementPanel = (): React.ReactNode => {
    const handleQuickAddSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!quickCode.trim() || !quickTitle.trim()) return;

      const code = quickCode.toUpperCase();
      const title = quickTitle;

      if (methodology === 'Waterfall' && isWaterfallBaseline) {
        setShowChangeRequestModal(true);
        (window as any)._pendingReqAction = {
          action: 'create',
          code,
          title
        };
        return;
      }

      await handleCreateQuickRequirement(code, title);
      setQuickCode('');
      setQuickTitle('');
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-extrabold text-black font-mono uppercase tracking-wider">Planificación de Requisitos</h3>
          <p className="text-[10px] text-zinc-550">Trazabilidad y Asignación de Alcance</p>
        </div>

        {/* Quick Add Form */}
        {currentUser?.role !== 'Viewer' && (
          <form onSubmit={handleQuickAddSubmit} className="space-y-2.5 bg-white border border-zinc-200 rounded p-3 shadow-inner">
            <span className="text-[9px] font-mono text-zinc-400 uppercase block font-bold">Agregar Requisito Rápido</span>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="RF-01"
                value={quickCode}
                onChange={e => setQuickCode(e.target.value)}
                className="col-span-1 bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-black font-semibold focus:outline-none focus:border-black uppercase placeholder-zinc-300"
              />
              <input
                type="text"
                placeholder="Nombre del requisito..."
                value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)}
                className="col-span-2 bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-black focus:outline-none focus:border-black placeholder-zinc-300"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-black text-white hover:bg-zinc-800 text-[10px] font-bold py-1.5 rounded transition-colors"
            >
              + Crear Requisito
            </button>
          </form>
        )}

        {/* Requirements list */}
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
          {requirements.map((req) => {
            const hasTests = req.linkedTests && req.linkedTests.length > 0;
            const passedTests = hasTests ? req.linkedTests.filter((t: any) => t.status === 'Passed').length : 0;
            const statusLabel = req.workflowStatus || req.status || 'Draft';

            let currentValue = '';
            if (methodology === 'Waterfall' || methodology === 'RUP') {
              currentValue = req.phaseRef || '';
            } else if (methodology === 'Espiral') {
              currentValue = req.iterationRef || '';
            } else if (methodology === 'Prototipos') {
              currentValue = req.prototypeVersionRef || '';
            } else {
              currentValue = req.sprintRef || '';
            }

            return (
              <div key={req._id} className="bg-white border border-zinc-200 rounded p-3 space-y-2 shadow-sm hover:border-zinc-350 transition-colors">
                <div className="flex justify-between items-start gap-1">
                  <div>
                    <span className="text-[9px] font-mono font-bold bg-zinc-100 border border-zinc-200 px-1 py-0.5 rounded text-zinc-600">
                      {req.code}
                    </span>
                    <span className="text-[9px] font-mono font-bold ml-1.5 uppercase text-zinc-400">
                      {req.type === 'NonFunctional' ? 'RNF' : 'RF'}
                    </span>
                  </div>

                  <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                    statusLabel === 'Completed' ? 'bg-green-50 text-green-700' :
                    statusLabel === 'Implemented' || statusLabel === 'En Validación' ? 'bg-amber-50 text-amber-700' :
                    statusLabel === 'In-Progress' ? 'bg-blue-50 text-blue-700' : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    {statusLabel}
                  </span>
                </div>

                <span className="text-xs font-bold text-black block leading-tight">{req.title}</span>

                {/* Assignment Dropdown */}
                {currentUser?.role !== 'Viewer' && (
                  <div className="space-y-1">
                    <label className="block text-[8px] font-mono text-zinc-400 uppercase font-semibold">
                      {methodology === 'Waterfall' || methodology === 'RUP' ? 'Fase de Ingeniería' :
                       methodology === 'Espiral' ? 'Ciclo / Iteración' :
                       methodology === 'Prototipos' ? 'Versión de Prototipo' : 'Sprint Asignado'}
                    </label>
                    <select
                      value={currentValue}
                      onChange={async e => {
                        const val = e.target.value;
                        if (methodology === 'Waterfall' && isWaterfallBaseline) {
                          setShowChangeRequestModal(true);
                          (window as any)._pendingReqAction = {
                            action: 'assign',
                            id: req._id,
                            value: val
                          };
                          return;
                        }
                        await handleAssignRequirement(req._id, val);
                      }}
                      className="w-full bg-white border border-zinc-200 rounded px-1.5 py-1 text-[10px] text-zinc-700 font-semibold focus:outline-none focus:border-black cursor-pointer"
                    >
                      <option value="">Sin Asignar</option>
                      {methodology === 'Waterfall' && (
                        WATERFALL_PHASES.map(p => <option key={p} value={p}>{p}</option>)
                      )}
                      {methodology === 'RUP' && (
                        ['Inicio', 'Elaboración', 'Construcción', 'Transición'].map(p => <option key={p} value={p}>{p}</option>)
                      )}
                      {methodology === 'Espiral' && (
                        SPIRAL_ITERATIONS.map(p => <option key={p} value={p}>{p}</option>)
                      )}
                      {methodology === 'Prototipos' && (
                        PROTOTYPE_VERSIONS.map(p => <option key={p} value={p}>{p}</option>)
                      )}
                      {!['Waterfall', 'RUP', 'Espiral', 'Prototipos'].includes(methodology) && (
                        ['Sprint 1', 'Sprint 2', 'Sprint 3', 'Backlog'].map(p => <option key={p} value={p}>{p}</option>)
                      )}
                    </select>
                  </div>
                )}

                {/* Test verification metrics */}
                {hasTests && (
                  <div className="flex justify-between items-center text-[9px] text-zinc-500 pt-1.5 border-t border-zinc-100">
                    <span>Pruebas:</span>
                    <span className={`font-bold font-mono ${passedTests === req.linkedTests.length ? 'text-green-700' : 'text-zinc-600'}`}>
                      {passedTests}/{req.linkedTests.length} ({Math.round((passedTests / req.linkedTests.length) * 100)}%)
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {requirements.length === 0 && (
            <div className="text-center py-8 border border-dashed border-zinc-200 rounded-md text-[10px] text-zinc-400 italic bg-white">
              No hay requerimientos en la pila
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMethodologyWorkspaces = (): React.ReactNode => {
    if (methodology === 'Waterfall') {
      return (
        <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-zinc-150">
            <div>
              <h4 className="text-xs font-extrabold text-black font-mono uppercase tracking-wider">Gobernanza Waterfall</h4>
              <p className="text-[10px] text-zinc-500">Línea Base del Alcance y Control de Cambios</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleWaterfallBaseline}
                disabled={currentUser?.role === 'Viewer'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                  isWaterfallBaseline
                    ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                    : 'bg-zinc-100 text-zinc-700 border border-zinc-200 hover:bg-zinc-200'
                }`}
              >
                {isWaterfallBaseline ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-red-650" /> Línea Base Congelada
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-zinc-550" /> Establecer Línea Base
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-zinc-400 uppercase block font-bold">Fases de Ingeniería Cascada</span>
              <div className="flex flex-wrap gap-1.5">
                {WATERFALL_PHASES.map((phase) => {
                  const phaseTasks = tasks.filter(t => t.sprint === phase);
                  const isDone = phaseTasks.length > 0 && phaseTasks.every(t => t.status === 'Done');
                  const active = phase === activePhase;
                  return (
                    <button
                      key={phase}
                      type="button"
                      onClick={() => {
                        setActivePhase(phase);
                        setTaskSprint(phase);
                      }}
                      className={`px-3 py-1.5 rounded-full font-semibold border transition-all text-[11px] ${
                        active
                          ? 'bg-black text-white border-black'
                          : isDone
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-white text-zinc-650 border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      {phase.replace('Fase ', 'F')} {isDone && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded p-3 space-y-1">
              <span className="text-[9px] font-mono text-zinc-400 uppercase block font-bold">Bitácora de Control de Cambios</span>
              <div className="max-h-20 overflow-y-auto space-y-1.5 pr-1 font-mono text-[9px] text-zinc-600">
                {changeRequestAuditLog.map(log => (
                  <div key={log.id} className="flex justify-between border-b border-zinc-100 pb-0.5">
                    <span>[{log.code}] {log.action}</span>
                    <span className="text-zinc-400">{log.timestamp}</span>
                  </div>
                ))}
                {changeRequestAuditLog.length === 0 && (
                  <span className="text-zinc-400 italic block py-2">No se han registrado solicitudes de cambio.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (methodology === 'RUP') {
      const phases = ['Inicio', 'Elaboración', 'Construcción', 'Transición'];
      const deliverables: Record<string, string[]> = {
        'Inicio': ['Elicitación de Requisitos base', 'Modelo del Dominio y Glosario'],
        'Elaboración': ['Documento de Arquitectura (SAD)', 'Prototipo de Arquitectura Ejecutable'],
        'Construcción': ['Código Fuente e Implementación', 'Casos de Pruebas de Integración'],
        'Transición': ['Manuales de Usuario y Entrega', 'Despliegue Staging / Prod']
      };

      return (
        <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="pb-2 border-b border-zinc-150">
            <h4 className="text-xs font-extrabold text-black font-mono uppercase tracking-wider">Hitos del Rational Unified Process (RUP)</h4>
            <p className="text-[10px] text-zinc-500">Gobernanza de Fases Formales y Entregables de Ingeniería</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            {phases.map((phase) => {
              const active = phase === activePhase;
              const phaseDelivs = deliverables[phase] || [];
              const completedCount = phaseDelivs.filter(d => rupDeliverables[`${phase}_${d}`]).length;
              const percent = Math.round((completedCount / phaseDelivs.length) * 100);

              return (
                <div
                  key={phase}
                  onClick={() => {
                    setActivePhase(phase);
                    setTaskSprint(phase);
                  }}
                  className={`p-3 border rounded-md cursor-pointer transition-all ${
                    active
                      ? 'border-black ring-1 ring-black bg-zinc-50/20'
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-black">{phase}</span>
                    <span className="text-[10px] font-mono font-bold text-zinc-550">{percent}%</span>
                  </div>
                  <div className="w-full bg-zinc-100 h-1 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-black h-full" style={{ width: `${percent}%` }}></div>
                  </div>

                  {/* Deliverables checklist */}
                  <div className="mt-3 space-y-1.5 border-t border-zinc-100 pt-2" onClick={e => e.stopPropagation()}>
                    {phaseDelivs.map(d => (
                      <label key={d} className="flex items-center gap-1.5 text-[9px] text-zinc-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!rupDeliverables[`${phase}_${d}`]}
                          disabled={currentUser?.role === 'Viewer'}
                          onChange={() => handleToggleRupDeliverable(`${phase}_${d}`)}
                          className="rounded text-black focus:ring-black h-3 w-3"
                        />
                        <span className={rupDeliverables[`${phase}_${d}`] ? 'line-through text-zinc-400' : ''}>
                          {d}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (methodology === 'Kanban') {
      const workflowStatuses = ['Backlog', 'En Análisis', 'Listo para Desarrollo', 'En Validación', 'Aprobado'];
      return (
        <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="pb-2 border-b border-zinc-150">
            <h4 className="text-xs font-extrabold text-black font-mono uppercase tracking-wider">Tablero de Estados de Requerimientos</h4>
            <p className="text-[10px] text-zinc-500">Monitoreo conceptual del alcance (independiente de tareas técnicas)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {workflowStatuses.map((wfStatus) => {
              const reqs = requirements.filter(r => {
                if (wfStatus === 'Backlog') return r.workflowStatus === 'Backlog' || !r.workflowStatus;
                if (wfStatus === 'En Análisis') return r.workflowStatus === 'In-Progress';
                if (wfStatus === 'Listo para Desarrollo') return r.workflowStatus === 'Implemented';
                if (wfStatus === 'En Validación') return r.workflowStatus === 'En Validación';
                return r.workflowStatus === 'Completed';
              });

              return (
                <div key={wfStatus} className="bg-zinc-50/50 border border-zinc-200 rounded p-3 space-y-2">
                  <div className="flex justify-between items-center border-b border-zinc-150 pb-1">
                    <span className="text-[10px] font-bold text-zinc-700 uppercase font-mono">{wfStatus}</span>
                    <span className="text-[10px] font-mono bg-zinc-200 text-zinc-800 px-1.5 py-0.5 rounded-full font-bold">
                      {reqs.length}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {reqs.map((req: any) => (
                      <div key={req._id} className="bg-white border border-zinc-200 rounded p-1.5 shadow-sm text-[10px] space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-zinc-500">{req.code}</span>
                          {currentUser?.role !== 'Viewer' && (
                            <div className="flex gap-0.5">
                              <button
                                type="button"
                                onClick={async () => {
                                  const nextIdx = workflowStatuses.indexOf(wfStatus) - 1;
                                  if (nextIdx >= 0) {
                                    const nextWf = workflowStatuses[nextIdx];
                                    const mappedStatus = nextWf === 'Backlog' ? 'Backlog' : nextWf === 'En Análisis' ? 'In-Progress' : nextWf === 'Listo para Desarrollo' ? 'Implemented' : nextWf === 'En Validación' ? 'En Validación' : 'Completed';
                                    await handleUpdateReqWfStatus(req._id, mappedStatus);
                                  }
                                }}
                                className="px-1 bg-zinc-100 hover:bg-zinc-200 border rounded font-bold"
                              >
                                ◀
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const nextIdx = workflowStatuses.indexOf(wfStatus) + 1;
                                  if (nextIdx < workflowStatuses.length) {
                                    const nextWf = workflowStatuses[nextIdx];
                                    const mappedStatus = nextWf === 'Backlog' ? 'Backlog' : nextWf === 'En Análisis' ? 'In-Progress' : nextWf === 'Listo para Desarrollo' ? 'Implemented' : nextWf === 'En Validación' ? 'En Validación' : 'Completed';
                                    await handleUpdateReqWfStatus(req._id, mappedStatus);
                                  }
                                }}
                                className="px-1 bg-zinc-100 hover:bg-zinc-200 border rounded font-bold"
                              >
                                ▶
                              </button>
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-black line-clamp-1">{req.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (methodology === 'Prototipos') {
      const activeVersionReqs = requirements.filter(r => r.prototypeVersionRef === activeVersion);
      return (
        <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="pb-2 border-b border-zinc-150">
            <h4 className="text-xs font-extrabold text-black font-mono uppercase tracking-wider">Validación de Usabilidad del Prototipo ({activeVersion})</h4>
            <p className="text-[10px] text-zinc-500">Trazabilidad de pruebas y feedback directo con usuarios</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-zinc-400 uppercase block font-bold">Pruebas por Requerimiento</span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeVersionReqs.map(req => (
                  <div key={req._id} className="border border-zinc-200 rounded p-2.5 bg-zinc-50 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-200 px-1 py-0.5 rounded">{req.code}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedReqForTest(req._id)}
                        className="text-[10px] text-blue-700 font-bold hover:underline"
                      >
                        + Nueva Prueba
                      </button>
                    </div>
                    <span className="text-[11px] font-bold text-black block">{req.title}</span>

                    {/* Tests list */}
                    <div className="space-y-1 mt-1.5">
                      {req.linkedTests?.map((test: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-white border border-zinc-150 p-1.5 rounded text-[10px]">
                          <span>{test.title}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleTestStatus(req._id, idx, test.status)}
                            disabled={currentUser?.role === 'Viewer'}
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[9px] ${
                              test.status === 'Passed' ? 'bg-green-100 text-green-700' :
                              test.status === 'Failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {test.status === 'Passed' ? 'PASÓ' : test.status === 'Failed' ? 'FALLÓ' : 'PEND.'}
                          </button>
                        </div>
                      ))}
                      {(!req.linkedTests || req.linkedTests.length === 0) && (
                        <span className="text-[10px] text-zinc-400 italic block">Sin pruebas registradas.</span>
                      )}
                    </div>

                    {/* Quick test add form */}
                    {selectedReqForTest === req._id && (
                      <div className="mt-2 pt-2 border-t border-zinc-200 flex gap-1">
                        <input
                          type="text"
                          placeholder="Nombre de la prueba..."
                          value={newTestTitle}
                          onChange={e => setNewTestTitle(e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded px-2 py-0.5 text-[10px] text-black focus:outline-none focus:border-black"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddUsabilityTest(req._id)}
                          className="bg-black text-white hover:bg-zinc-800 px-2 py-0.5 rounded text-[10px] font-bold"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {activeVersionReqs.length === 0 && (
                  <div className="text-zinc-400 italic text-[11px] py-4 text-center">
                    Asigna requerimientos a la versión "{activeVersion}" para registrar pruebas.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded p-4 flex flex-col justify-center">
              <span className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-bold">Métricas de Validación</span>
              <div className="grid grid-cols-2 gap-3 text-center mt-2">
                <div className="bg-white border rounded p-2.5">
                  <span className="text-[9px] text-zinc-500 font-medium block font-bold">Total Pruebas</span>
                  <span className="text-lg font-bold text-black">
                    {activeVersionReqs.reduce((acc, r) => acc + (r.linkedTests?.length || 0), 0)}
                  </span>
                </div>
                <div className="bg-white border rounded p-2.5">
                  <span className="text-[9px] text-zinc-500 font-medium block font-bold">Pruebas Aprobadas</span>
                  <span className="text-lg font-bold text-green-700">
                    {activeVersionReqs.reduce((acc, r) => acc + (r.linkedTests?.filter((t: any) => t.status === 'Passed').length || 0), 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (methodology === 'Espiral') {
      const nfrs = requirements.filter(r => r.type === 'NonFunctional');
      return (
        <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="pb-2 border-b border-zinc-150">
            <h4 className="text-xs font-extrabold text-black font-mono uppercase tracking-wider">Mitigación de Riesgos e Ingeniería de Requisitos No Funcionales (RNF)</h4>
            <p className="text-[10px] text-zinc-500">Trazabilidad de riesgos y restricciones de seguridad / arquitectura</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-zinc-400 uppercase block font-bold">Análisis de Riesgos: {activeIteration}</span>
              <div className="space-y-2">
                <textarea
                  value={spiralRisk}
                  onChange={e => setSpiralRisk(e.target.value)}
                  placeholder="Escribe el plan de mitigación y evaluación de riesgos técnicos de este ciclo..."
                  rows={3}
                  className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-black focus:outline-none focus:border-black"
                />
                <button
                  type="button"
                  onClick={handleSaveRisk}
                  className="bg-black text-white hover:bg-zinc-800 text-[10px] font-bold px-3 py-1.5 rounded transition-colors"
                >
                  Guardar Bitácora de Riesgos
                </button>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded p-3 space-y-2">
              <span className="text-[10px] font-mono text-zinc-400 uppercase block font-bold">Requisitos No Funcionales Vinculados</span>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {nfrs.map(r => (
                  <div key={r._id} className="bg-white border border-zinc-200 rounded p-2 text-[10px] flex justify-between items-center shadow-sm">
                    <div>
                      <span className="font-mono font-bold text-zinc-550 block">{r.code}</span>
                      <span className="font-bold text-black">{r.title}</span>
                    </div>
                    <span className="text-[9px] bg-red-50 text-red-750 px-1.5 py-0.5 rounded font-mono font-bold">RNF</span>
                  </div>
                ))}
                {nfrs.length === 0 && (
                  <span className="text-[10px] text-zinc-400 italic block py-2">No se han registrado requerimientos no funcionales (códigos RN-xx).</span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (methodology === 'DevOps') {
      const activeSprintReqs = requirements.filter(r => r.sprintRef === activeSprint);
      return (
        <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="pb-2 border-b border-zinc-150">
            <h4 className="text-xs font-extrabold text-black font-mono uppercase tracking-wider">Pipeline de Despliegue de Requerimientos ({activeSprint})</h4>
            <p className="text-[10px] text-zinc-500">Trazabilidad en tiempo real desde la implementación hasta producción</p>
          </div>

          <div className="space-y-3">
            {activeSprintReqs.map(req => {
              const reqTasks = tasks.filter(t => req.linkedTasks?.some((id: any) => id.toString() === t._id));
              let step = 0;
              if (reqTasks.length > 0) {
                if (reqTasks.every(t => t.status === 'Done')) {
                  step = 3;
                } else if (reqTasks.some(t => t.status === 'Review')) {
                  step = 2;
                } else if (reqTasks.some(t => t.status === 'In-Progress')) {
                  step = 1;
                }
              }

              return (
                <div key={req._id} className="border border-zinc-150 rounded-lg p-3 bg-zinc-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="w-full md:w-1/3">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 bg-zinc-200 px-1 py-0.5 rounded">{req.code}</span>
                    <span className="text-xs font-bold text-black block mt-1">{req.title}</span>
                  </div>

                  <div className="w-full md:w-2/3 flex items-center justify-between gap-1">
                    {[
                      { label: 'Plan', active: step >= 0, color: 'bg-zinc-400' },
                      { label: 'CI Test', active: step >= 1, color: 'bg-blue-600' },
                      { label: 'Staging', active: step >= 2, color: 'bg-amber-600' },
                      { label: 'Prod', active: step >= 3, color: 'bg-green-600' }
                    ].map((st, sIdx) => (
                      <React.Fragment key={st.label}>
                        {sIdx > 0 && (
                          <div className={`flex-1 h-0.5 ${step >= sIdx ? 'bg-black' : 'bg-zinc-200'}`}></div>
                        )}
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white transition-all ${
                            st.active ? st.color + ' ring-2 ring-white shadow-sm' : 'bg-zinc-200 text-zinc-400'
                          }`}>
                            {sIdx + 1}
                          </div>
                          <span className={`text-[8px] font-mono font-bold uppercase ${st.active ? 'text-black' : 'text-zinc-400'}`}>{st.label}</span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })}
            {activeSprintReqs.length === 0 && (
              <div className="text-zinc-400 italic text-[11px] py-4 text-center">
                Asigna requerimientos a la pila de "{activeSprint}" para ver el estado de despliegue DevOps.
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderTaskBoard = (): React.ReactNode => {
    const boardTasks = getFilteredTasks();
    const layout = getBoardLayout(methodology);
    const columns = layout.columns || [
      { name: 'Por Hacer', status: 'Todo' },
      { name: 'En Desarrollo', status: 'In-Progress' },
      { name: 'En Revisión', status: 'Review' },
      { name: 'Finalizado', status: 'Done' }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        {columns.map(col => {
          const colTasks = boardTasks.filter(t => t.status === col.status);
          return (
            <div key={col.status} className="bg-zinc-100 rounded-lg p-3 border border-zinc-200 min-h-[500px] flex flex-col">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-200">
                <span className="text-xs font-extrabold text-black uppercase font-mono">{col.name}</span>
                <span className="text-[10px] bg-white border border-zinc-250 font-bold px-2 py-0.5 rounded-full text-zinc-700">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {colTasks.map(task => {
                  const linkedReqs = getLinkedRequirementsForTask(task._id);
                  const isWfLocked = checkWaterfallLocked(task.sprint);

                  return (
                    <div key={task._id} className="bg-white border border-zinc-200 rounded-md p-3.5 shadow-sm space-y-3 hover:border-zinc-300 transition-colors relative">
                      {isWfLocked.isLocked && (
                        <div className="absolute inset-0 bg-zinc-100/70 z-10 flex items-center justify-center p-2 rounded-md">
                          <span className="text-[9px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-250 px-2 py-1 rounded text-center">
                            ⚠️ Bloqueado: Completa {isWfLocked.prevPhase.replace('Fase ', 'F')} primero
                          </span>
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-xs font-bold text-black font-sans leading-tight block">{task.title}</span>
                          {currentUser?.role !== 'Viewer' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task._id)}
                              className="text-zinc-300 hover:text-red-650 shrink-0 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{task.description}</p>
                      </div>

                      {/* Display linked requirements links */}
                      {linkedReqs.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {linkedReqs.map(req => (
                            <span key={req._id} className="text-[8px] font-mono font-bold bg-zinc-100 border border-zinc-200 px-1 py-0.5 rounded text-zinc-600">
                              {req.code}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* XP & TDD specifics inside task card */}
                      {methodology === 'XP' && linkedReqs.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-zinc-100 space-y-1.5 bg-zinc-50 p-2 rounded">
                          <span className="text-[9px] font-mono text-zinc-400 uppercase block font-semibold">Criterios TDD:</span>
                          {linkedReqs.map(req => (
                            <div key={req._id} className="space-y-1">
                              <span className="text-[8px] font-bold text-zinc-600 block">{req.code} Criterios</span>
                              {req.linkedTests?.map((test: any, testIdx: number) => (
                                <label key={testIdx} className="flex items-center gap-1.5 text-[9px] text-zinc-700 cursor-pointer hover:bg-zinc-200 rounded p-0.5">
                                  <input
                                    type="checkbox"
                                    checked={test.status === 'Passed'}
                                    disabled={currentUser?.role === 'Viewer'}
                                    onChange={() => handleToggleTestStatus(req._id, testIdx, test.status)}
                                    className="rounded text-black focus:ring-black h-3 w-3"
                                  />
                                  <span className={test.status === 'Passed' ? 'line-through text-zinc-400' : ''}>
                                    {test.title}
                                  </span>
                                </label>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* DevOps CI/CD pipeline display on task card */}
                      {methodology === 'DevOps' && (
                        <div className="mt-2 pt-2 border-t border-zinc-100 space-y-1">
                          <span className="text-[8px] font-mono text-zinc-400 uppercase block font-semibold">DevOps Stage:</span>
                          <div className="flex justify-between items-center gap-1 bg-zinc-50 p-1 rounded border border-zinc-150">
                            {[
                              { label: 'Plan', active: true, style: 'bg-zinc-100 text-zinc-500' },
                              { label: 'CI Test', active: task.status !== 'Todo', style: task.status === 'Todo' ? 'bg-zinc-100 text-zinc-400' : 'bg-blue-100 text-blue-750 font-bold' },
                              { label: 'Stage', active: task.status === 'Review' || task.status === 'Done', style: (task.status === 'Review' || task.status === 'Done') ? 'bg-amber-100 text-amber-700 font-bold' : 'bg-zinc-100 text-zinc-400' },
                              { label: 'Prod', active: task.status === 'Done', style: task.status === 'Done' ? 'bg-green-100 text-green-750 font-bold' : 'bg-zinc-100 text-zinc-400' }
                            ].map(step => (
                              <span key={step.label} className={`text-[8px] px-1 py-0.5 rounded ${step.style}`}>
                                {step.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center border-t border-zinc-100 pt-2 text-[10px]">
                        <span className="text-zinc-400 font-mono text-[9px] truncate max-w-[90px]">{task.sprint}</span>
                        <span className="text-zinc-950 font-bold">
                          {task.assignedTo?.name ? task.assignedTo.name.split(' ')[0] : 'Sin asignar'}
                        </span>
                      </div>

                      {currentUser?.role !== 'Viewer' && (
                        <div className="flex gap-2 justify-end border-t border-zinc-50 pt-2 shrink-0">
                          {col.status !== 'Todo' && (
                            <button
                              type="button"
                              onClick={() => {
                                const steps: ('Todo' | 'In-Progress' | 'Review' | 'Done')[] = ['Todo', 'In-Progress', 'Review', 'Done'];
                                const prevIdx = steps.indexOf(col.status) - 1;
                                handleMoveTask(task._id, steps[prevIdx]);
                              }}
                              className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black transition-colors"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {col.status !== 'Done' && (
                            <button
                              type="button"
                              onClick={() => {
                                const steps: ('Todo' | 'In-Progress' | 'Review' | 'Done')[] = ['Todo', 'In-Progress', 'Review', 'Done'];
                                const nextIdx = steps.indexOf(col.status) + 1;
                                handleMoveTask(task._id, steps[nextIdx]);
                              }}
                              className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black transition-colors"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <span className="text-[10px] text-zinc-400 block text-center py-8 italic bg-white border border-zinc-200 border-dashed rounded-md">
                    Sin tareas en esta columna
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Configuration Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-zinc-200 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight font-sans">Metodología de Trabajo y Tareas</h1>
          <p className="text-sm text-zinc-500 mt-1">Elige el marco metodológico y gestiona el tablero de entregas.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400 uppercase">Marco Activo:</span>
            <select
              value={methodology}
              onChange={handleUpdateMethodology}
              disabled={currentUser?.role === 'Viewer'}
              className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs text-black font-semibold focus:outline-none focus:border-black"
            >
              <option value="Scrum">Scrum (Sprints ágiles)</option>
              <option value="Kanban">Kanban (Flujo continuo)</option>
              <option value="Waterfall">Waterfall (Cascada secuencial)</option>
              <option value="Agile">Ágil (Iteraciones cortas)</option>
              <option value="Espiral">Espiral (Análisis de riesgos)</option>
              <option value="Prototipos">Prototipos (Validación rápida)</option>
              <option value="RUP">RUP (Iterativo formal)</option>
              <option value="XP">Extreme Programming (XP)</option>
              <option value="DevOps">DevOps (Integración continua)</option>
              <option value="Hibrida">Híbrida (Agile + Cascada)</option>
              <option value="Personalizada">Personalizada Asignatura</option>
            </select>
          </div>

          {currentUser?.role !== 'Viewer' && (
            <button
              onClick={() => {
                setTaskLinkedReqs([]);
                setShowTaskModal(true);
              }}
              className="flex items-center gap-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-2 rounded transition-colors"
            >
              <Plus className="w-4 h-4" /> Crear Tarea
            </button>
          )}
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Adaptive Requirement Panel (3 spans) */}
        <div className="xl:col-span-3 space-y-6 bg-zinc-50/50 border border-zinc-200 rounded-lg p-5 shadow-sm">
          {renderRequirementPanel()}
        </div>

        {/* Right Column: Execution Board & Workspace (9 spans) */}
        <div className="xl:col-span-9 space-y-6">
          {/* Active Selector Bar */}
          {['Scrum', 'Agile', 'Hibrida', 'XP', 'DevOps'].includes(methodology) && (
            <div className="flex items-center gap-4 bg-zinc-50 border border-zinc-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-500 uppercase">Sprint Activo:</span>
                <select
                  value={activeSprint}
                  onChange={e => setActiveSprint(e.target.value)}
                  className="bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs text-black font-semibold focus:outline-none focus:border-black cursor-pointer"
                >
                  {Array.from(new Set(['Sprint 1', 'Sprint 2', 'Sprint 3', ...tasks.map(t => t.sprint).filter(s => s && s.startsWith('Sprint'))])).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <span className="text-xs text-zinc-400">|</span>
              <span className="text-xs text-zinc-550 font-sans">
                Muestra las tareas asociadas al sprint activo. Utiliza el panel izquierdo para vincular y asignar requerimientos.
              </span>
            </div>
          )}

          {['Waterfall', 'RUP'].includes(methodology) && (
            <div className="flex items-center gap-4 bg-zinc-50 border border-zinc-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-500 uppercase">Fase Activa:</span>
                <select
                  value={activePhase}
                  onChange={e => {
                    setActivePhase(e.target.value);
                    setTaskSprint(e.target.value);
                  }}
                  className="bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs text-black font-semibold focus:outline-none focus:border-black cursor-pointer"
                >
                  {methodology === 'Waterfall'
                    ? WATERFALL_PHASES.map(p => <option key={p} value={p}>{p}</option>)
                    : ['Inicio', 'Elaboración', 'Construcción', 'Transición'].map(p => <option key={p} value={p}>{p}</option>)
                  }
                </select>
              </div>
              <span className="text-xs text-zinc-400">|</span>
              <span className="text-xs text-zinc-550 font-sans">
                Visualiza las tareas de la fase de ingeniería seleccionada. El flujo está gobernado por el orden del ciclo de vida.
              </span>
            </div>
          )}

          {methodology === 'Espiral' && (
            <div className="flex items-center gap-4 bg-zinc-50 border border-zinc-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-500 uppercase">Iteración Activa:</span>
                <select
                  value={activeIteration}
                  onChange={e => {
                    setActiveIteration(e.target.value);
                    setTaskSprint(e.target.value);
                  }}
                  className="bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs text-black font-semibold focus:outline-none focus:border-black cursor-pointer"
                >
                  {SPIRAL_ITERATIONS.map(it => (
                    <option key={it} value={it}>{it}</option>
                  ))}
                </select>
              </div>
              <span className="text-xs text-zinc-400">|</span>
              <span className="text-xs text-zinc-550 font-sans">
                Cada ciclo de la espiral evalúa riesgos y diseña planes de mitigación correspondientes.
              </span>
            </div>
          )}

          {methodology === 'Prototipos' && (
            <div className="flex items-center gap-4 bg-zinc-50 border border-zinc-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-500 uppercase">Versión Activa:</span>
                <select
                  value={activeVersion}
                  onChange={e => {
                    setActiveVersion(e.target.value);
                    setTaskSprint(e.target.value);
                  }}
                  className="bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs text-black font-semibold focus:outline-none focus:border-black cursor-pointer"
                >
                  {PROTOTYPE_VERSIONS.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <span className="text-xs text-zinc-400">|</span>
              <span className="text-xs text-zinc-550 font-sans">
                Define las maquetas rápidas para pruebas de usabilidad y feedback de clientes.
              </span>
            </div>
          )}

          {/* Guide Card info */}
          {METHODOLOGY_DETAILS[methodology] && (
            <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{METHODOLOGY_DETAILS[methodology].icon}</span>
                <h4 className="text-xs font-bold text-black uppercase font-mono tracking-wider">{METHODOLOGY_DETAILS[methodology].name}</h4>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{METHODOLOGY_DETAILS[methodology].description}</p>
            </div>
          )}

          {/* Methodology Specific Workspaces */}
          {renderMethodologyWorkspaces()}

          {/* Main Task Kanban Board */}
          {renderTaskBoard()}
        </div>
      </div>

      {/* Change Request Modal (Waterfall Scope Control) */}
      {showChangeRequestModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-red-750 pb-2 border-b border-zinc-150">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-black uppercase font-mono">Control de Cambios - Línea Base Activada</h3>
            </div>

            <p className="text-xs text-zinc-550 leading-relaxed">
              La edición de requerimientos y tareas asociadas está bloqueada por la línea base de este proyecto en Cascada.
              Para realizar esta acción, ingrese el código de autorización de la solicitud de cambio (Change Request).
            </p>

            <div className="space-y-2">
              <label className="block text-[10px] font-mono text-zinc-400 uppercase">Código de Cambio (CR-XXX)</label>
              <input
                type="text"
                required
                value={changeRequestCode}
                onChange={e => setChangeRequestCode(e.target.value)}
                placeholder="Ej: CR-101"
                className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-xs text-black font-semibold focus:outline-none focus:border-black uppercase"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowChangeRequestModal(false);
                  (window as any)._pendingReqAction = null;
                  setChangeRequestCode('');
                }}
                className="px-3 py-1.5 text-xs text-zinc-500 hover:text-black font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteChangeRequest}
                disabled={!changeRequestCode.trim()}
                className="bg-black text-white hover:bg-zinc-800 text-xs font-bold px-4 py-1.5 rounded transition-colors disabled:opacity-50"
              >
                Autorizar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/35 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 max-w-md w-full shadow-lg">
            <h3 className="text-sm font-bold text-black mb-4 uppercase font-mono border-b border-zinc-150 pb-2">Crear Nueva Tarea</h3>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Título de la Tarea</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="Ej: Levantar arquitectura base"
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-xs text-black focus:outline-none focus:border-black placeholder-zinc-300 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Descripción</label>
                <textarea
                  value={taskDesc}
                  onChange={e => setTaskDesc(e.target.value)}
                  placeholder="Especifica el alcance y los entregables..."
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-xs text-black focus:outline-none focus:border-black placeholder-zinc-300 h-16 resize-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Asignada A</label>
                  <select
                    value={taskAssignedTo}
                    onChange={e => setTaskAssignedTo(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none focus:border-black cursor-pointer font-semibold"
                  >
                    <option value="">Seleccionar...</option>
                    {members.map(m => (
                      <option key={m.user?._id} value={m.user?._id}>
                        {m.user?.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Estado Inicial</label>
                  <select
                    value={taskStatus}
                    onChange={e => setTaskStatus(e.target.value as any)}
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none focus:border-black cursor-pointer font-semibold"
                  >
                    <option value="Todo">Por Hacer</option>
                    <option value="In-Progress">En Desarrollo</option>
                    <option value="Review">En Revisión</option>
                    <option value="Done">Finalizado</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Sprint / Hito / Iteración / Versión</label>
                  {['Waterfall', 'RUP'].includes(methodology) ? (
                    <select
                      value={taskSprint}
                      onChange={e => setTaskSprint(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none focus:border-black font-semibold cursor-pointer"
                    >
                      {methodology === 'Waterfall'
                        ? WATERFALL_PHASES.map(p => <option key={p} value={p}>{p}</option>)
                        : ['Inicio', 'Elaboración', 'Construcción', 'Transición'].map(p => <option key={p} value={p}>{p}</option>)
                      }
                    </select>
                  ) : methodology === 'Espiral' ? (
                    <select
                      value={taskSprint}
                      onChange={e => setTaskSprint(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none focus:border-black font-semibold cursor-pointer"
                    >
                      {SPIRAL_ITERATIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : methodology === 'Prototipos' ? (
                    <select
                      value={taskSprint}
                      onChange={e => setTaskSprint(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none focus:border-black font-semibold cursor-pointer"
                    >
                      {PROTOTYPE_VERSIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={taskSprint}
                      onChange={e => setTaskSprint(e.target.value)}
                      placeholder="Ej: Sprint 1 o Backlog"
                      className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none focus:border-black placeholder-zinc-300 font-semibold"
                    />
                  )}
                </div>

                {/* Vincular a Requerimiento(s) */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Vincular a Requerimiento(s)</label>
                  <div className="border border-zinc-200 rounded p-2.5 max-h-24 overflow-y-auto space-y-1 bg-zinc-50/50">
                    {requirements.map((req: any) => (
                      <label key={req._id} className="flex items-center gap-2 text-[11px] text-zinc-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={taskLinkedReqs.includes(req._id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setTaskLinkedReqs([...taskLinkedReqs, req._id]);
                            } else {
                              setTaskLinkedReqs(taskLinkedReqs.filter(id => id !== req._id));
                            }
                          }}
                          className="rounded text-black focus:ring-black h-3.5 w-3.5"
                        />
                        <span>[{req.code}] {req.title}</span>
                      </label>
                    ))}
                    {requirements.length === 0 && (
                      <span className="text-[10px] text-zinc-450 italic">No hay requerimientos en este proyecto.</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-zinc-150">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-black font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-black text-white hover:bg-zinc-800 text-xs font-bold px-4 py-1.5 rounded transition-colors"
                >
                  Crear Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

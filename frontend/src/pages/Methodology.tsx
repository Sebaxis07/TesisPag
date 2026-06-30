import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { Settings, Plus, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';

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
  type: 'scrum' | 'kanban' | 'waterfall' | 'spiral' | 'prototypes' | 'hybrid';
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
        type: 'kanban',
        columns: [
          { name: 'Backlog / Historias', status: 'Todo' },
          { name: 'Codificación & TDD', status: 'In-Progress' },
          { name: 'Refactorización & QA', status: 'Review' },
          { name: 'Desplegado / Listo', status: 'Done' }
        ]
      };
    case 'DevOps':
      return {
        type: 'kanban',
        columns: [
          { name: 'Plan & Backlog', status: 'Todo' },
          { name: 'Code & CI Test', status: 'In-Progress' },
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
        type: 'kanban',
        columns: [
          { name: 'Inicio (Requisitos)', status: 'Todo' },
          { name: 'Elaboración (Diseño)', status: 'In-Progress' },
          { name: 'Construcción (Código)', status: 'Review' },
          { name: 'Transición (Despliegue)', status: 'Done' }
        ]
      };
    case 'Waterfall':
      return { type: 'waterfall' };
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

  useEffect(() => {
    if (activeProject) {
      setMethodology(activeProject.methodology);
      fetchTasks();
    }
  }, [activeProject]);

  useEffect(() => {
    if (methodology === 'Waterfall') {
      setTaskSprint('Fase 1: Requisitos');
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

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !taskTitle) return;

    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: activeProject._id,
          title: taskTitle,
          description: taskDesc,
          assignedTo: taskAssignedTo || null,
          sprint: taskSprint,
          status: taskStatus
        })
      });

      if (response.ok) {
        setShowTaskModal(false);
        setTaskTitle('');
        setTaskDesc('');
        setTaskAssignedTo('');
        if (methodology === 'Waterfall') {
          setTaskSprint('Fase 1: Requisitos');
        } else if (methodology === 'Espiral') {
          setTaskSprint(activeIteration);
        } else if (methodology === 'Prototipos') {
          setTaskSprint(activeVersion);
        } else {
          setTaskSprint(activeSprint);
        }
        setTaskStatus('Todo');
        await fetchTasks();
      }
    } catch (err) {
      console.error(err);
    }
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

  const layout = getBoardLayout(methodology);

  return (
    <div className="space-y-8">
      {/* Configuration Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-zinc-200 pb-6 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-black tracking-tight font-sans">Metodología de Trabajo y Tareas</h1>
          <p className="text-sm text-zinc-500 mt-1">Elige el marco metodológico y gestiona el tablero Kanban de entregas.</p>
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
              onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-2 bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-2 rounded transition-colors"
            >
              <Plus className="w-4 h-4" /> Crear Tarea
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Selector based on layout type */}
      {(layout.type === 'scrum' || layout.type === 'hybrid') && (
        <div className="flex items-center gap-4 bg-zinc-50 border border-zinc-200 rounded-lg p-4">
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
          <span className="text-xs text-zinc-500 font-sans">
            Muestra las tareas asociadas al sprint activo. Usa la columna izquierda para arrastrar desde el Product Backlog.
          </span>
        </div>
      )}

      {layout.type === 'spiral' && (
        <div className="flex items-center gap-4 bg-zinc-50 border border-zinc-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500 uppercase">Iteración Activa:</span>
            <select
              value={activeIteration}
              onChange={e => setActiveIteration(e.target.value)}
              className="bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs text-black font-semibold focus:outline-none focus:border-black cursor-pointer"
            >
              {SPIRAL_ITERATIONS.map(it => (
                <option key={it} value={it}>{it}</option>
              ))}
            </select>
          </div>
          <span className="text-xs text-zinc-400">|</span>
          <span className="text-xs text-zinc-500 font-sans">
            Cada ciclo de la espiral evalúa riesgos y valida prototipos antes del siguiente ciclo.
          </span>
        </div>
      )}

      {layout.type === 'prototypes' && (
        <div className="flex items-center gap-4 bg-zinc-50 border border-zinc-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500 uppercase">Versión Activa:</span>
            <select
              value={activeVersion}
              onChange={e => setActiveVersion(e.target.value)}
              className="bg-white border border-zinc-200 rounded px-2.5 py-1 text-xs text-black font-semibold focus:outline-none focus:border-black cursor-pointer"
            >
              {PROTOTYPE_VERSIONS.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <span className="text-xs text-zinc-400">|</span>
          <span className="text-xs text-zinc-500 font-sans">
            Visualiza el avance del prototipo actual. Construye rápido para validar con el usuario final.
          </span>
        </div>
      )}

      {/* Dynamic Methodology Details Guide Card */}
      {METHODOLOGY_DETAILS[methodology] && (
        <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="text-3xl bg-zinc-100 p-3 rounded-lg flex items-center justify-center">
              {METHODOLOGY_DETAILS[methodology].icon}
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-black flex items-center gap-2">
                Guía Metodológica: {METHODOLOGY_DETAILS[methodology].name}
              </h2>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-4xl">
                {METHODOLOGY_DETAILS[methodology].description}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-zinc-150 pt-4">
            {/* Cómo funciona */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-extrabold text-zinc-400 uppercase font-mono tracking-wider">¿Cómo funciona?</h3>
              <ul className="space-y-1.5">
                {METHODOLOGY_DETAILS[methodology].howItWorks.map((step, idx) => (
                  <li key={idx} className="text-xs text-zinc-700 flex items-start gap-2">
                    <span className="text-zinc-400 select-none">•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cómo trabajan */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-extrabold text-zinc-400 uppercase font-mono tracking-wider">¿Cómo trabajan?</h3>
              <ul className="space-y-1.5">
                {METHODOLOGY_DETAILS[methodology].howTheyWork.map((item, idx) => (
                  <li key={idx} className="text-xs text-zinc-700 flex items-start gap-2">
                    <span className="text-zinc-400 select-none">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Proposal / Academic Recommendation */}
          <div className="bg-zinc-50 border-l-4 border-black p-4 rounded-r text-xs text-zinc-800 leading-relaxed shadow-sm">
            💡 <strong className="text-black">Propuesta de Mejora / Recomendación Académica:</strong> {METHODOLOGY_DETAILS[methodology].recommendation}
          </div>
        </div>
      )}

      {/* RENDER VIEW: WATERFALL */}
      {layout.type === 'waterfall' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
            <span className="text-xs text-zinc-500 font-semibold flex items-center gap-1.5">
              📈 Flujo Secuencial: Cada fase debe completarse al 100% para iniciar la siguiente.
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase">Progreso Global:</span>
              <span className="text-xs font-bold text-black">
                {Math.round((tasks.filter(t => t.status === 'Done').length / (tasks.length || 1)) * 100)}%
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {WATERFALL_PHASES.map((phase, idx) => {
              const phaseTasks = tasks.filter(t => t.sprint === phase);
              const completedTasks = phaseTasks.filter(t => t.status === 'Done').length;
              const percent = phaseTasks.length ? Math.round((completedTasks / phaseTasks.length) * 100) : 0;
              
              // Warning if previous phase is not completed
              let isLocked = false;
              let unresolvedPrevPhase = '';
              for (let i = 0; i < idx; i++) {
                const prevPhase = WATERFALL_PHASES[i];
                const prevTasks = tasks.filter(t => t.sprint === prevPhase);
                const prevCompleted = prevTasks.filter(t => t.status === 'Done').length;
                if (prevTasks.length > 0 && prevCompleted < prevTasks.length) {
                  isLocked = true;
                  unresolvedPrevPhase = prevPhase;
                  break;
                }
              }

              return (
                <div key={phase} className={`border rounded-lg p-5 bg-white transition-all shadow-sm ${isLocked ? 'opacity-65 border-zinc-200 bg-zinc-50/50' : 'border-zinc-200 hover:border-zinc-300'}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-extrabold px-2 py-0.5 bg-black text-white rounded">
                        Fase {idx + 1}
                      </span>
                      <h3 className="text-xs font-bold text-black">{phase.replace(/Fase \d+: /, '')}</h3>
                      {isLocked && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-mono font-semibold">
                          ⚠️ Bloqueado por {unresolvedPrevPhase.replace(/Fase \d+: /, '')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-zinc-150 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-black h-1.5 transition-all duration-300" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-xs font-mono text-zinc-700 font-bold">{percent}% ({completedTasks}/{phaseTasks.length})</span>
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="mt-4 space-y-2">
                    {phaseTasks.map(task => (
                      <div key={task._id} className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-md hover:border-zinc-300 transition-colors">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            disabled={currentUser?.role === 'Viewer' || isLocked}
                            checked={task.status === 'Done'}
                            onChange={async () => {
                              const nextStatus = task.status === 'Done' ? 'Todo' : 'Done';
                              await handleMoveTask(task._id, nextStatus);
                            }}
                            className="rounded border-zinc-300 text-black focus:ring-black w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div>
                            <span className={`text-xs font-semibold block ${task.status === 'Done' ? 'line-through text-zinc-400 font-normal' : 'text-black'}`}>
                              {task.title}
                            </span>
                            <p className="text-[10px] text-zinc-500 line-clamp-1">{task.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-medium text-zinc-600">
                            {task.assignedTo?.name ? task.assignedTo.name.split(' ')[0] : 'Sin asignar'}
                          </span>
                          {currentUser?.role !== 'Viewer' && (
                            <button
                              onClick={() => handleDeleteTask(task._id)}
                              className="text-zinc-300 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {phaseTasks.length === 0 && (
                      <div className="text-center py-6 border border-dashed border-zinc-200 rounded-md text-[10px] text-zinc-400 italic">
                        Sin tareas planificadas para esta fase.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RENDER VIEW: SCRUM */}
      {layout.type === 'scrum' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start animate-fade-in">
          {/* Left Column: Product Backlog Sidebar */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 flex flex-col min-h-[500px]">
            <div className="pb-3 border-b border-zinc-200 mb-4 flex justify-between items-center">
              <span className="text-xs font-extrabold text-black uppercase font-mono">Product Backlog</span>
              <span className="text-[10px] bg-white border border-zinc-250 font-bold px-2 py-0.5 rounded-full text-zinc-700">
                {tasks.filter(t => t.sprint === 'Backlog' || t.sprint === 'General' || t.sprint !== activeSprint).length}
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {tasks
                .filter(t => t.sprint === 'Backlog' || t.sprint === 'General' || t.sprint !== activeSprint)
                .map(task => (
                  <div key={task._id} className="bg-white border border-zinc-200 rounded-md p-3 shadow-sm hover:border-zinc-300 transition-colors space-y-2">
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-xs font-bold text-black leading-tight block">{task.title}</span>
                      {currentUser?.role !== 'Viewer' && (
                        <button onClick={() => handleDeleteTask(task._id)} className="text-zinc-300 hover:text-red-600 shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 line-clamp-2">{task.description}</p>
                    <div className="flex justify-between items-center pt-2 border-t border-zinc-50">
                      <span className="text-[8px] font-mono bg-zinc-100 text-zinc-500 px-1 py-0.5 rounded">
                        {task.sprint}
                      </span>
                      {currentUser?.role !== 'Viewer' && (
                        <button
                          onClick={async () => {
                            const response = await fetch(`${API_URL}/tasks/${task._id}`, {
                              method: 'PUT',
                              headers: { ...headers, 'Content-Type': 'application/json' },
                              body: JSON.stringify({ sprint: activeSprint })
                            });
                            if (response.ok) fetchTasks();
                          }}
                          className="text-[9px] bg-black text-white hover:bg-zinc-800 px-2 py-0.5 rounded font-bold transition-colors"
                        >
                          Llevar a Sprint
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              {tasks.filter(t => t.sprint === 'Backlog' || t.sprint === 'General' || t.sprint !== activeSprint).length === 0 && (
                <span className="text-[10px] text-zinc-400 block text-center py-8 italic">Backlog vacío</span>
              )}
            </div>
          </div>

          {/* Right Columns: Sprint Kanban Board */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            {layout.columns?.map(col => {
              const colTasks = tasks.filter(t => t.status === col.status && t.sprint === activeSprint);
              return (
                <div key={col.status} className="bg-zinc-100 rounded-lg p-3 border border-zinc-200 min-h-[500px] flex flex-col">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-200">
                    <span className="text-xs font-extrabold text-black uppercase font-mono">{col.name}</span>
                    <span className="text-[10px] bg-white border border-zinc-250 font-bold px-2 py-0.5 rounded-full text-zinc-700">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {colTasks.map(task => (
                      <div key={task._id} className="bg-white border border-zinc-200 rounded-md p-3.5 shadow-sm space-y-3 hover:border-zinc-350 transition-colors">
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-xs font-bold text-black font-sans leading-tight block">{task.title}</span>
                            {currentUser?.role !== 'Viewer' && (
                              <button onClick={() => handleDeleteTask(task._id)} className="text-zinc-300 hover:text-red-600 shrink-0">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{task.description}</p>
                        </div>

                        <div className="flex justify-between items-center border-t border-zinc-100 pt-2.5">
                          {currentUser?.role !== 'Viewer' && (
                            <button
                              onClick={async () => {
                                const response = await fetch(`${API_URL}/tasks/${task._id}`, {
                                  method: 'PUT',
                                  headers: { ...headers, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ sprint: 'Backlog' })
                                });
                                if (response.ok) fetchTasks();
                              }}
                              className="text-[9px] text-zinc-400 hover:text-black font-semibold transition-colors"
                              title="Retornar a Backlog"
                            >
                              ➔ Backlog
                            </button>
                          )}
                          <span className="text-[10px] font-semibold text-zinc-950 truncate max-w-[80px]">
                            {task.assignedTo?.name ? task.assignedTo.name.split(' ')[0] : 'Sin asignar'}
                          </span>
                        </div>

                        {currentUser?.role !== 'Viewer' && (
                          <div className="flex gap-2 justify-end border-t border-zinc-50 pt-2 shrink-0">
                            {col.status !== 'Todo' && (
                              <button
                                onClick={() => {
                                  const steps: ('Todo' | 'In-Progress' | 'Review' | 'Done')[] = ['Todo', 'In-Progress', 'Review', 'Done'];
                                  const prevIdx = steps.indexOf(col.status) - 1;
                                  handleMoveTask(task._id, steps[prevIdx]);
                                }}
                                className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {col.status !== 'Done' && (
                              <button
                                onClick={() => {
                                  const steps: ('Todo' | 'In-Progress' | 'Review' | 'Done')[] = ['Todo', 'In-Progress', 'Review', 'Done'];
                                  const nextIdx = steps.indexOf(col.status) + 1;
                                  handleMoveTask(task._id, steps[nextIdx]);
                                }}
                                className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {colTasks.length === 0 && (
                      <span className="text-[10px] text-zinc-400 block text-center py-8 italic">Sin tareas</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RENDER VIEW: ESPIRAL */}
      {layout.type === 'spiral' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start animate-fade-in">
          {/* Main 4 Spiral Quadrant columns */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            {layout.columns?.map(col => {
              const colTasks = tasks.filter(t => t.status === col.status && t.sprint === activeIteration);
              return (
                <div key={col.status} className="bg-zinc-100 rounded-lg p-3 border border-zinc-200 min-h-[500px] flex flex-col">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-200">
                    <span className="text-xs font-extrabold text-black uppercase font-mono">{col.name}</span>
                    <span className="text-[10px] bg-white border border-zinc-250 font-bold px-2 py-0.5 rounded-full text-zinc-700">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {colTasks.map(task => (
                      <div key={task._id} className="bg-white border border-zinc-200 rounded-md p-3.5 shadow-sm space-y-3 hover:border-zinc-300 transition-colors">
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-xs font-bold text-black font-sans leading-tight block">{task.title}</span>
                            {currentUser?.role !== 'Viewer' && (
                              <button onClick={() => handleDeleteTask(task._id)} className="text-zinc-300 hover:text-red-600 shrink-0">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{task.description}</p>
                        </div>

                        <div className="flex justify-between items-center border-t border-zinc-100 pt-2.5">
                          <span className="text-[9px] font-mono bg-zinc-50 text-zinc-500 px-1.5 py-0.5 rounded">{task.sprint}</span>
                          <span className="text-[10px] font-semibold text-zinc-950 truncate max-w-[80px]">
                            {task.assignedTo?.name ? task.assignedTo.name.split(' ')[0] : 'Sin asignar'}
                          </span>
                        </div>

                        {currentUser?.role !== 'Viewer' && (
                          <div className="flex gap-2 justify-end border-t border-zinc-50 pt-2 shrink-0">
                            {col.status !== 'Todo' && (
                              <button
                                onClick={() => {
                                  const steps: ('Todo' | 'In-Progress' | 'Review' | 'Done')[] = ['Todo', 'In-Progress', 'Review', 'Done'];
                                  const prevIdx = steps.indexOf(col.status) - 1;
                                  handleMoveTask(task._id, steps[prevIdx]);
                                }}
                                className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {col.status !== 'Done' && (
                              <button
                                onClick={() => {
                                  const steps: ('Todo' | 'In-Progress' | 'Review' | 'Done')[] = ['Todo', 'In-Progress', 'Review', 'Done'];
                                  const nextIdx = steps.indexOf(col.status) + 1;
                                  handleMoveTask(task._id, steps[nextIdx]);
                                }}
                                className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {colTasks.length === 0 && (
                      <span className="text-[10px] text-zinc-400 block text-center py-8 italic">Sin tareas</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Risk Mitigation Register */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 space-y-4">
            <h3 className="text-xs font-extrabold text-black uppercase font-mono pb-2 border-b border-zinc-200">
              🌀 Plan de Riesgos ({activeIteration})
            </h3>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              La metodología en Espiral exige documentar y mitigar activamente los riesgos técnicos en cada iteración.
            </p>
            <div className="space-y-2">
              <label className="block text-[9px] font-mono text-zinc-400 uppercase">Riesgos y Mitigación</label>
              <textarea
                value={spiralRisk}
                onChange={e => setSpiralRisk(e.target.value)}
                placeholder="Ej: Riesgo de que la API de OpenAI falle por cuota. Mitigación: Implementar reintentos y caché local..."
                className="w-full bg-white border border-zinc-200 rounded p-2 text-xs text-black focus:outline-none focus:border-black h-48 resize-none shadow-inner"
              />
            </div>
            <button
              onClick={handleSaveRisk}
              className="w-full bg-black text-white hover:bg-zinc-800 text-xs font-bold py-2 rounded transition-colors"
            >
              Guardar Riesgos
            </button>
          </div>
        </div>
      )}

      {/* RENDER VIEW: PROTOTIPOS */}
      {layout.type === 'prototypes' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start animate-fade-in">
          {layout.columns?.map(col => {
            const colTasks = tasks.filter(t => t.status === col.status && t.sprint === activeVersion);
            return (
              <div key={col.status} className="bg-zinc-100 rounded-lg p-4 border border-zinc-200 min-h-[500px] flex flex-col">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-200">
                  <span className="text-xs font-extrabold text-black uppercase font-mono">{col.name}</span>
                  <span className="text-[10px] bg-white border border-zinc-250 font-bold px-2 py-0.5 rounded-full text-zinc-700">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.map(task => (
                    <div key={task._id} className="bg-white border border-zinc-200 rounded-md p-4 shadow-sm space-y-3 hover:border-zinc-400 transition-colors">
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-xs font-bold text-black font-sans leading-tight block">{task.title}</span>
                          {currentUser?.role !== 'Viewer' && (
                            <button onClick={() => handleDeleteTask(task._id)} className="text-zinc-300 hover:text-red-600 shrink-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">{task.description}</p>
                      </div>

                      <div className="flex justify-between items-center border-t border-zinc-100 pt-3">
                        <span className="text-[9px] font-mono bg-zinc-50 text-zinc-500 px-1.5 py-0.5 rounded">{task.sprint}</span>
                        <span className="text-[10px] font-semibold text-zinc-950 truncate max-w-[80px]">
                          {task.assignedTo?.name ? task.assignedTo.name.split(' ')[0] : 'Sin asignar'}
                        </span>
                      </div>

                      {currentUser?.role !== 'Viewer' && (
                        <div className="flex gap-2 justify-end border-t border-zinc-50 pt-2 shrink-0">
                          {col.status !== 'Todo' && (
                            <button
                              onClick={() => {
                                const steps: ('Todo' | 'In-Progress' | 'Review' | 'Done')[] = ['Todo', 'In-Progress', 'Review', 'Done'];
                                const prevIdx = steps.indexOf(col.status) - 1;
                                handleMoveTask(task._id, steps[prevIdx]);
                              }}
                              className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black"
                            >
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                          )}
                          {col.status !== 'Done' && (
                            <button
                              onClick={() => {
                                const steps: ('Todo' | 'In-Progress' | 'Review' | 'Done')[] = ['Todo', 'In-Progress', 'Review', 'Done'];
                                const nextIdx = steps.indexOf(col.status) + 1;
                                handleMoveTask(task._id, steps[nextIdx]);
                              }}
                              className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <span className="text-[10px] text-zinc-400 block text-center py-8 italic">Sin tareas</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RENDER VIEW: HIBRIDA */}
      {layout.type === 'hybrid' && (
        <div className="space-y-8 animate-fade-in">
          {/* Gantt-like High Level Roadmap */}
          <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-black uppercase font-mono pb-2 border-b border-zinc-150">
              📍 Cronograma / Hitos de Alto Nivel (Cascada)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              {[
                { name: 'Hito 1: Requisitos', desc: 'Levantamiento & ADRs iniciales', status: 'Done', color: 'bg-green-500 border-green-600' },
                { name: 'Hito 2: MVP Base', desc: 'Dashboard y Frontend Integrado', status: 'In-Progress', color: 'bg-amber-500 border-amber-600 animate-pulse' },
                { name: 'Hito 3: QA & Pruebas', desc: 'Pruebas de estrés y seguridad', status: 'Todo', color: 'bg-zinc-300 border-zinc-400' },
                { name: 'Hito 4: Puesta en Marcha', desc: 'Despliegue y producción final', status: 'Todo', color: 'bg-zinc-300 border-zinc-400' },
              ].map((h, idx) => (
                <div key={idx} className="bg-zinc-50 border border-zinc-200 rounded-md p-3 flex items-start gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full border mt-0.5 flex items-center justify-center text-[8px] text-white font-bold ${h.color}`}>
                    {h.status === 'Done' && '✓'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-black leading-tight">{h.name}</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5 leading-snug">{h.desc}</p>
                    <span className={`text-[8px] font-mono font-bold uppercase mt-1.5 inline-block px-1.5 py-0.5 rounded ${h.status === 'Done' ? 'bg-green-50 text-green-700' : h.status === 'In-Progress' ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-600'}`}>
                      {h.status === 'Done' ? 'Completado' : h.status === 'In-Progress' ? 'En Curso' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sprints Board below */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            {layout.columns?.map(col => {
              const colTasks = tasks.filter(t => t.status === col.status && t.sprint === activeSprint);
              return (
                <div key={col.status} className="bg-zinc-100 rounded-lg p-3 border border-zinc-200 min-h-[500px] flex flex-col">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-200">
                    <span className="text-xs font-extrabold text-black uppercase font-mono">{col.name}</span>
                    <span className="text-[10px] bg-white border border-zinc-250 font-bold px-2 py-0.5 rounded-full text-zinc-700">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {colTasks.map(task => (
                      <div key={task._id} className="bg-white border border-zinc-200 rounded-md p-3.5 shadow-sm space-y-3 hover:border-zinc-300 transition-colors">
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-xs font-bold text-black font-sans leading-tight block">{task.title}</span>
                            {currentUser?.role !== 'Viewer' && (
                              <button onClick={() => handleDeleteTask(task._id)} className="text-zinc-300 hover:text-red-600 shrink-0">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{task.description}</p>
                        </div>

                        <div className="flex justify-between items-center border-t border-zinc-100 pt-2.5">
                          <span className="text-[9px] font-mono bg-zinc-50 text-zinc-500 px-1 py-0.5 rounded">{task.sprint}</span>
                          <span className="text-[10px] font-semibold text-zinc-950 truncate max-w-[80px]">
                            {task.assignedTo?.name ? task.assignedTo.name.split(' ')[0] : 'Sin asignar'}
                          </span>
                        </div>

                        {currentUser?.role !== 'Viewer' && (
                          <div className="flex gap-2 justify-end border-t border-zinc-50 pt-2 shrink-0">
                            {col.status !== 'Todo' && (
                              <button
                                onClick={() => {
                                  const steps: ('Todo' | 'In-Progress' | 'Review' | 'Done')[] = ['Todo', 'In-Progress', 'Review', 'Done'];
                                  const prevIdx = steps.indexOf(col.status) - 1;
                                  handleMoveTask(task._id, steps[prevIdx]);
                                }}
                                className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {col.status !== 'Done' && (
                              <button
                                onClick={() => {
                                  const steps: ('Todo' | 'In-Progress' | 'Review' | 'Done')[] = ['Todo', 'In-Progress', 'Review', 'Done'];
                                  const nextIdx = steps.indexOf(col.status) + 1;
                                  handleMoveTask(task._id, steps[nextIdx]);
                                }}
                                className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {colTasks.length === 0 && (
                      <span className="text-[10px] text-zinc-400 block text-center py-8 italic">Sin tareas</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RENDER VIEW: KANBAN / DEFAULT */}
      {layout.type === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start animate-fade-in">
          {layout.columns?.map(col => {
            const colTasks = tasks.filter(t => t.status === col.status);
            return (
              <div key={col.status} className="bg-zinc-100 rounded-lg p-4 border border-zinc-200 min-h-[500px] flex flex-col">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-200">
                  <span className="text-xs font-extrabold text-black uppercase font-mono">{col.name}</span>
                  <span className="text-[10px] bg-white border border-zinc-250 font-bold px-2 py-0.5 rounded-full text-zinc-700">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.map(task => (
                    <div key={task._id} className="bg-white border border-zinc-200 rounded-md p-4 shadow-sm space-y-3 hover:border-zinc-400 transition-colors">
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-xs font-bold text-black font-sans leading-tight block">{task.title}</span>
                          {currentUser?.role !== 'Viewer' && (
                            <button onClick={() => handleDeleteTask(task._id)} className="text-zinc-300 hover:text-red-600 shrink-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">{task.description}</p>
                      </div>

                      <div className="flex justify-between items-center border-t border-zinc-100 pt-3">
                        <span className="text-[9px] font-mono bg-zinc-50 text-zinc-500 px-1.5 py-0.5 rounded">{task.sprint}</span>
                        <span className="text-[10px] font-semibold text-zinc-950 truncate max-w-[80px]">
                          {task.assignedTo?.name ? task.assignedTo.name.split(' ')[0] : 'Sin asignar'}
                        </span>
                      </div>

                      {currentUser?.role !== 'Viewer' && (
                        <div className="flex gap-2 justify-end border-t border-zinc-50 pt-2 shrink-0">
                          {col.status !== 'Todo' && (
                            <button
                              onClick={() => {
                                const steps: ('Todo' | 'In-Progress' | 'Review' | 'Done')[] = ['Todo', 'In-Progress', 'Review', 'Done'];
                                const prevIdx = steps.indexOf(col.status) - 1;
                                handleMoveTask(task._id, steps[prevIdx]);
                              }}
                              className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black"
                            >
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                          )}
                          {col.status !== 'Done' && (
                            <button
                              onClick={() => {
                                const steps: ('Todo' | 'In-Progress' | 'Review' | 'Done')[] = ['Todo', 'In-Progress', 'Review', 'Done'];
                                const nextIdx = steps.indexOf(col.status) + 1;
                                handleMoveTask(task._id, steps[nextIdx]);
                              }}
                              className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <span className="text-[10px] text-zinc-400 block text-center py-8 italic">Sin tareas</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-zinc-200 rounded-lg p-6 max-w-md w-full shadow-lg">
            <h3 className="text-base font-bold text-black mb-4">Crear Nueva Tarea</h3>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Título de la Tarea</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="Ej: Levantar arquitectura base"
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Descripción de la Tarea</label>
                <textarea
                  value={taskDesc}
                  onChange={e => setTaskDesc(e.target.value)}
                  placeholder="Especifica el alcance y los entregables..."
                  className="w-full bg-white border border-zinc-200 rounded px-3 py-1.5 text-sm text-black focus:outline-none focus:border-black placeholder-zinc-300 h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Asignada A</label>
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
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Estado Inicial</label>
                  <select
                    value={taskStatus}
                    onChange={e => setTaskStatus(e.target.value as any)}
                    className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none focus:border-black cursor-pointer font-semibold"
                  >
                    {layout.columns ? (
                      layout.columns.map(col => (
                        <option key={col.status} value={col.status}>{col.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="Todo">Por Hacer</option>
                        <option value="In-Progress">En Progreso</option>
                        <option value="Review">En Revisión</option>
                        <option value="Done">Finalizado</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Sprint / Hito / Iteración / Versión</label>
                  {methodology === 'Waterfall' ? (
                    <select
                      value={taskSprint}
                      onChange={e => setTaskSprint(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none focus:border-black font-semibold cursor-pointer"
                    >
                      {WATERFALL_PHASES.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  ) : methodology === 'Espiral' ? (
                    <select
                      value={taskSprint}
                      onChange={e => setTaskSprint(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none focus:border-black font-semibold cursor-pointer"
                    >
                      {SPIRAL_ITERATIONS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  ) : methodology === 'Prototipos' ? (
                    <select
                      value={taskSprint}
                      onChange={e => setTaskSprint(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none focus:border-black font-semibold cursor-pointer"
                    >
                      {PROTOTYPE_VERSIONS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={taskSprint}
                      onChange={e => setTaskSprint(e.target.value)}
                      placeholder="Ej: Sprint 1 o Backlog"
                      className="w-full bg-white border border-zinc-200 rounded px-2 py-1.5 text-xs text-black focus:outline-none focus:border-black placeholder-zinc-300"
                    />
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-black transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-black text-white hover:bg-zinc-800 text-xs font-bold px-3 py-1.5 rounded transition-colors"
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

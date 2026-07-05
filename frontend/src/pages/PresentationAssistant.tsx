import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { 
  Sparkles, 
  Volume2, 
  Clock, 
  AlertCircle,
  Clock3,
  Layers,
  CheckSquare2
} from 'lucide-react';

interface Slide {
  slideNumber: number;
  title: string;
  keyPoints: string[];
  visuals: string;
  estimatedDuration: number;
}

interface TimePhase {
  phase: string;
  durationMin: number;
}

interface PresentationPlan {
  slides: Slide[];
  narrative: string;
  timeOutline: TimePhase[];
  checklist: string[];
}

export const PresentationAssistant: React.FC = () => {
  const { activeProject } = useProjectStore();
  const { getAuthHeaders } = useAuthStore();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PresentationPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'slides' | 'narrative' | 'timing' | 'checklist'>('slides');
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // Restore plan from localStorage if available for this project to avoid redundant LLM calls
  useEffect(() => {
    if (activeProject) {
      const cached = localStorage.getItem(`presentation_plan_${activeProject._id}`);
      if (cached) {
        try {
          setPlan(JSON.parse(cached));
        } catch (e) {
          localStorage.removeItem(`presentation_plan_${activeProject._id}`);
        }
      } else {
        setPlan(null);
      }
    }
  }, [activeProject]);

  const generatePlan = async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')}/projects/${activeProject._id}/presentation-helper`, {
        method: 'POST',
        headers
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al generar el plan de defensa.');
      }

      const data: PresentationPlan = await res.json();
      setPlan(data);
      localStorage.setItem(`presentation_plan_${activeProject._id}`, JSON.stringify(data));
      
      // Initialize checklist state
      const initialChecked: Record<number, boolean> = {};
      data.checklist.forEach((_, idx) => {
        initialChecked[idx] = false;
      });
      setCheckedItems(initialChecked);
    } catch (err: any) {
      setError(err.message || 'Error de comunicación.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (idx: number) => {
    setCheckedItems(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const totalDuration = plan?.slides.reduce((acc, curr) => acc + curr.estimatedDuration, 0) || 20;

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950 text-white p-8 rounded-2xl shadow-xl">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-amber-400 fill-amber-400" />
            <span>Asistente de Defensa y Presentación</span>
          </h1>
          <p className="text-zinc-400 text-sm max-w-xl">
            Preparación inteligente y estructuración de diapositivas para tu examen de defensa pública de título ante la comisión académica.
          </p>
        </div>
        <div>
          <button
            onClick={generatePlan}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-zinc-950 font-bold hover:bg-zinc-100 rounded-xl transition-all shadow-md text-sm disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 text-zinc-950" />
            <span>{loading ? 'Analizando Proyecto...' : 'Generar Guía de Defensa con IA'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-4">
          <div className="w-10 h-10 border-3 border-zinc-950 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="space-y-1">
            <p className="text-xs font-mono font-bold text-zinc-800">Compilando contexto y requerimientos de tesis...</p>
            <p className="text-[11px] text-zinc-400">El modelo LLM de Google Gemini está estructurando tus diapositivas (20 minutos objetivo)</p>
          </div>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-xl text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
          <p className="font-semibold text-sm">Error de Generación</p>
          <p className="text-xs text-red-500 mt-1">{error}</p>
        </div>
      ) : plan ? (
        <div className="space-y-6">
          
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-zinc-900 text-white rounded-lg">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-mono block uppercase">Total Diapositivas</span>
                <span className="text-xl font-bold text-zinc-950 font-mono">{plan.slides.length} diapositivas</span>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-zinc-900 text-white rounded-lg">
                <Clock3 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-mono block uppercase">Duración Estimada</span>
                <span className="text-xl font-bold text-zinc-950 font-mono">{totalDuration} minutos</span>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-zinc-900 text-white rounded-lg">
                <CheckSquare2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-mono block uppercase">Preparación Técnica</span>
                <span className="text-xl font-bold text-zinc-950 font-mono">
                  {Object.values(checkedItems).filter(Boolean).length} / {plan.checklist.length} listos
                </span>
              </div>
            </div>
          </div>

          {/* Tabs header */}
          <div className="border-b border-zinc-200 flex gap-4 overflow-x-auto pb-1">
            {(['slides', 'narrative', 'timing', 'checklist'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 capitalize transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-zinc-950 text-zinc-950'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}
              >
                {tab === 'slides' ? 'Estructura de Diapositivas' : tab === 'narrative' ? 'Guion y Oratoria' : tab === 'timing' ? 'Distribución del Tiempo' : 'Lista de Preparación'}
              </button>
            ))}
          </div>

          {/* Tab content area */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm min-h-[400px]">
            
            {/* 1. SLIDES TAB */}
            {activeTab === 'slides' && (
              <div className="space-y-6">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wider font-mono">Recomendación Diapositiva por Diapositiva</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {plan.slides.map((slide) => (
                    <div key={slide.slideNumber} className="border border-zinc-200 rounded-xl p-5 hover:border-zinc-450 transition-all flex flex-col justify-between shadow-xs">
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] bg-zinc-900 text-white font-mono font-bold px-2 py-0.5 rounded">
                            Diapositiva {slide.slideNumber}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {slide.estimatedDuration} min
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-zinc-900 mb-2.5">{slide.title}</h3>
                        
                        <ul className="space-y-1.5 list-disc pl-4 text-xs text-zinc-600 mb-4 leading-normal">
                          {slide.keyPoints.map((pt, pIdx) => (
                            <li key={pIdx}>{pt}</li>
                          ))}
                        </ul>
                      </div>

                      {slide.visuals && (
                        <div className="bg-zinc-50 border border-zinc-100 p-2.5 rounded-lg text-[10px] text-zinc-500">
                          <span className="font-bold text-zinc-700 block font-mono uppercase mb-0.5">Sugerencia Visual:</span>
                          {slide.visuals}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. NARRATIVE TAB */}
            {activeTab === 'narrative' && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-zinc-400" />
                  <span>Guion de Apoyo Académico y Transición</span>
                </h2>
                <div className="bg-zinc-50 border border-zinc-100 p-6 rounded-xl leading-relaxed text-xs text-zinc-700 whitespace-pre-wrap">
                  {plan.narrative}
                </div>
              </div>
            )}

            {/* 3. TIMING TAB */}
            {activeTab === 'timing' && (
              <div className="space-y-6">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wider font-mono">Bloques de Tiempo (Estrategia de 20 Minutos)</h2>
                
                <div className="space-y-5 max-w-xl">
                  {plan.timeOutline.map((t, idx) => {
                    const pct = (t.durationMin / totalDuration) * 100;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-zinc-800">
                          <span>{t.phase}</span>
                          <span className="font-mono">{t.durationMin} min ({Math.round(pct)}%)</span>
                        </div>
                        <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-zinc-900 h-2.5 rounded-full" 
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. CHECKLIST TAB */}
            {activeTab === 'checklist' && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wider font-mono">Control de Aseguramiento de Defensa</h2>
                <p className="text-xs text-zinc-400">Verifica que tengas todo resuelto antes de entrar a la sala o iniciar la videollamada de examen.</p>

                <div className="space-y-2.5 max-w-lg mt-3">
                  {plan.checklist.map((item, idx) => {
                    const isChecked = !!checkedItems[idx];
                    return (
                      <label 
                        key={idx}
                        onClick={() => toggleCheck(idx)}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-zinc-50 border-zinc-200 opacity-60 text-zinc-500' 
                            : 'bg-white border-zinc-200 text-zinc-800 hover:border-zinc-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="mt-0.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-4 h-4"
                        />
                        <span className="text-xs font-semibold select-none leading-normal">
                          {item}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl p-16 text-center shadow-sm max-w-xl mx-auto space-y-4">
          <Sparkles className="w-12 h-12 text-zinc-300 mx-auto" />
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-zinc-950">Prepara tu Presentación Final</h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Genera una guía interactiva con la estructura ideal de diapositivas y guion de oratoria personalizado con la IA basándose en tus requerimientos y capítulos redactados.
            </p>
          </div>
          <button
            onClick={generatePlan}
            className="px-4 py-2 bg-zinc-950 hover:bg-zinc-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>Generar Guía de Defensa</span>
          </button>
        </div>
      )}

    </div>
  );
};
export default PresentationAssistant;

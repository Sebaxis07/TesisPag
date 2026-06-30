import React, { useState } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { Layers, ShieldAlert, Cpu, Sparkles, CheckCircle2 } from 'lucide-react';

interface MatrixRow {
  criteria: string;
  optionA: string;
  optionB: string;
  winner: string;
}

interface ComparisonResult {
  matrix: MatrixRow[];
  recommendation: string;
  alignmentScore: number;
}

export const StackComparer: React.FC = () => {
  const { activeProject } = useProjectStore();
  const { getAuthHeaders } = useAuthStore();

  const [optionA, setOptionA] = useState('Stack MERN (React, Node.js, Express, MongoDB) + FastAPI');
  const [optionB, setOptionB] = useState('Stack Next.js (React) + PostgreSQL + Spring Boot (Java)');
  
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([
    'Curva de Aprendizaje',
    'Costo de Servidores',
    'Velocidad de Desarrollo',
    'Escalabilidad',
    'Integración con IA'
  ]);

  const [newCriteria, setNewCriteria] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableCriterias = [
    'Rendimiento en Tiempo Real',
    'Comunidad y Soporte',
    'Facilidad de Deploy',
    'Seguridad de Datos',
    'SEO nativo',
    'Mantenibilidad'
  ];

  const handleAddCriteria = (criteria: string) => {
    if (!criteria.trim() || selectedCriteria.includes(criteria)) return;
    setSelectedCriteria([...selectedCriteria, criteria]);
    setNewCriteria('');
  };

  const handleRemoveCriteria = (criteria: string) => {
    setSelectedCriteria(selectedCriteria.filter(c => c !== criteria));
  };

  const handleCompare = async () => {
    if (!activeProject) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const headers = getAuthHeaders();
      const res = await fetch(`http://localhost:5000/api/projects/${activeProject._id}/compare-stacks`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          options: [optionA, optionB],
          criterias: selectedCriteria
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al ejecutar la comparación');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado al conectar con la IA.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500">
        <ShieldAlert className="w-12 h-12 mb-4 text-zinc-400 animate-pulse" />
        <p className="text-sm font-medium">Por favor selecciona o crea un proyecto activo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-3">
          <Layers className="w-6 h-6 text-zinc-900" />
          Comparador de Stacks Tecnológicos
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Analiza y compara múltiples arquitecturas de software o stacks de tecnologías basándote en las restricciones, objetivos y alcance de tu proyecto.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-zinc-950 font-mono uppercase tracking-wider">Configuración del Análisis</h2>

            {/* Option A */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Opción A (Actual o Propuesta)</label>
              <input
                type="text"
                value={optionA}
                onChange={e => setOptionA(e.target.value)}
                placeholder="Ej: React + Node.js"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Option B */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Opción B (Alternativa)</label>
              <input
                type="text"
                value={optionB}
                onChange={e => setOptionB(e.target.value)}
                placeholder="Ej: Next.js + Django"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Selected Criteria */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-zinc-700 block">Criterios de Evaluación</label>
              <div className="flex flex-wrap gap-1.5">
                {selectedCriteria.map(c => (
                  <span
                    key={c}
                    onClick={() => handleRemoveCriteria(c)}
                    className="text-[10px] bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded-full font-medium border border-zinc-200 hover:bg-red-50 hover:text-red-700 hover:border-red-100 cursor-pointer transition-colors"
                    title="Click para quitar"
                  >
                    {c} &times;
                  </span>
                ))}
              </div>

              {/* Add Custom Criteria */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCriteria}
                  onChange={e => setNewCriteria(e.target.value)}
                  placeholder="Agregar criterio..."
                  className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-500"
                  onKeyDown={e => e.key === 'Enter' && handleAddCriteria(newCriteria)}
                />
                <button
                  onClick={() => handleAddCriteria(newCriteria)}
                  className="px-3 py-1.5 bg-zinc-950 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Quick Add Available */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider block">Sugeridos</span>
              <div className="flex flex-wrap gap-1">
                {availableCriterias.filter(c => !selectedCriteria.includes(c)).map(c => (
                  <button
                    key={c}
                    onClick={() => handleAddCriteria(c)}
                    className="text-[10px] text-zinc-600 hover:text-zinc-950 bg-zinc-50 hover:bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200"
                  >
                    + {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Compare CTA */}
            <button
              onClick={handleCompare}
              disabled={isLoading || !optionA || !optionB || selectedCriteria.length === 0}
              className="w-full bg-zinc-950 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-300 border-t-white rounded-full animate-spin"></div>
                  Analizando Stacks...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  Comparar con IA
                </>
              )}
            </button>

            {error && (
              <p className="text-[11px] text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 font-medium">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {!result && !isLoading && (
            <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-zinc-400 flex flex-col items-center justify-center shadow-sm h-full">
              <Cpu className="w-12 h-12 mb-3 text-zinc-200" />
              <p className="text-sm font-semibold text-zinc-800">Comparador listo para evaluar</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Configura los stacks tecnológicos y haz clic en "Comparar con IA" para obtener un trade-off fundamentado por arquitectura.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-zinc-400 flex flex-col items-center justify-center shadow-sm h-full space-y-4">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-zinc-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                <Sparkles className="w-6 h-6 text-zinc-950 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-800 animate-pulse">Generando matriz de trade-offs...</p>
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                  Evaluando restricciones del proyecto y comparando características técnicas con modelos de IA.
                </p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-fadeIn">
              {/* Recommendation Card */}
              <div className="bg-zinc-950 text-white rounded-xl p-6 shadow-md border border-zinc-800 relative overflow-hidden">
                {/* Background glow decoration */}
                <div className="absolute -right-16 -top-16 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none"></div>

                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider block font-bold">Recomendación Final</span>
                    <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      Stack Recomendado
                    </h3>
                  </div>

                  {/* Alignment Score Meter */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-14 h-14 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-full shadow-inner">
                      <span className="text-sm font-extrabold text-white font-mono">{result.alignmentScore}%</span>
                    </div>
                    <span className="text-[9px] text-zinc-400 mt-1 font-mono uppercase">Alineación</span>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-zinc-200 mt-4 bg-zinc-900/60 p-4 rounded-lg border border-zinc-800/80">
                  {result.recommendation}
                </p>
              </div>

              {/* Trade-off Matrix */}
              <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100">
                  <span className="text-sm font-semibold text-zinc-950">Matriz de Criterios y Trade-offs</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-bold text-zinc-500 font-mono uppercase">
                        <th className="px-6 py-3.5 w-1/4">Criterio</th>
                        <th className="px-6 py-3.5 w-1/3">{optionA}</th>
                        <th className="px-6 py-3.5 w-1/3">{optionB}</th>
                        <th className="px-6 py-3.5 w-1/6 text-right">Ganador</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-xs">
                      {result.matrix.map((row, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-zinc-900">{row.criteria}</td>
                          <td className="px-6 py-4 text-zinc-600 leading-relaxed">{row.optionA}</td>
                          <td className="px-6 py-4 text-zinc-600 leading-relaxed">{row.optionB}</td>
                          <td className="px-6 py-4 text-right">
                            <span className="inline-flex items-center gap-1 font-bold text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-100">
                              {row.winner}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StackComparer;

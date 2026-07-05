import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useProjectStore } from '../store/ProjectStore';
import { useAuthStore } from '../store/AuthStore';
import { useNavigate } from 'react-router-dom';
import { 
  FileUp, 
  Trash2, 
  ShieldAlert, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowLeft, 
  Copy, 
  Check, 
  ArrowRight, 
  LayoutTemplate,
  BrainCircuit,
  BookOpen
} from 'lucide-react';

interface SourceDoc {
  _id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  status: 'uploaded' | 'parsed' | 'chunked' | 'failed';
  errorMessage?: string;
  documentType: 'context' | 'guideline';
  chunkCount: number;
  guidelineStructure?: Array<{
    title: string;
    level: number;
    instruction: string;
    suggestedContent?: string;
    suggestedDraft?: string;
  }>;
  uploadedBy: string;
  createdAt: string;
}

export const KnowledgeBase: React.FC = () => {
  const { activeProject } = useProjectStore();
  const { getAuthHeaders } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'context' | 'guideline'>('context');
  const [documents, setDocuments] = useState<SourceDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected Guideline for details view
  const [selectedGuideline, setSelectedGuideline] = useState<SourceDoc | null>(null);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [importingIndex, setImportingIndex] = useState<number | null>(null);
  const [importedSections, setImportedSections] = useState<Record<number, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    if (!activeProject) return;
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')}/documents/project/${activeProject._id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  }, [activeProject, getAuthHeaders]);

  // Poll for document status changes if any doc is not finalized ('chunked' or 'failed')
  useEffect(() => {
    fetchDocuments();

    const needsPolling = documents.some(doc => doc.status === 'uploaded' || doc.status === 'parsed');
    if (!needsPolling) return;

    const interval = setInterval(() => {
      fetchDocuments();
    }, 4000);

    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  // Keep selected guideline updated with fresh data if polling finishes
  useEffect(() => {
    if (selectedGuideline) {
      const updated = documents.find(d => d._id === selectedGuideline._id);
      if (updated && updated.status !== selectedGuideline.status) {
        setSelectedGuideline(updated);
      }
    }
  }, [documents, selectedGuideline]);

  const handleUpload = async (file: File) => {
    if (!activeProject) return;
    if (file.type !== 'application/pdf' && !file.name.endsWith('.txt')) {
      setErrorMessage('Solo se permiten archivos PDF o texto plano (.txt)');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', activeProject._id);
    formData.append('documentType', activeTab);

    try {
      const tokenHeaders = getAuthHeaders();
      const headers = { ...tokenHeaders };
      delete (headers as any)['Content-Type'];

      const res = await fetch('http://localhost:5000/api/documents/upload', {
        method: 'POST',
        headers,
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al subir el documento');
      }

      await fetchDocuments();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de red al intentar subir el archivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿Estás seguro de eliminar este documento de la base de conocimiento?')) return;
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')}/documents/${id}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        setDocuments(prev => prev.filter(doc => doc._id !== id));
        if (selectedGuideline?._id === id) {
          setSelectedGuideline(null);
        }
      } else {
        const data = await res.json();
        alert(data.message || 'Error al eliminar el documento');
      }
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  // Maps guideline title to default chapter template type
  const mapTitleToSectionType = (title: string): string => {
    const t = title.toLowerCase();
    if (t.includes('introducción') || t.includes('introduccion') || t.includes('capítulo 1') || t.includes('capítulo i')) return 'Capitulo I';
    if (t.includes('requerimientos') || t.includes('requisitos') || t.includes('análisis') || t.includes('analisis') || t.includes('capítulo 2') || t.includes('capítulo ii')) return 'Capitulo II';
    if (t.includes('arquitectura') || t.includes('diseño') || t.includes('capítulo 3') || t.includes('capítulo iii')) return 'Capitulo III';
    if (t.includes('metodología') || t.includes('metodologia') || t.includes('planificación') || t.includes('planificacion') || t.includes('capítulo 4') || t.includes('capítulo iv')) return 'Capitulo IV';
    if (t.includes('pruebas') || t.includes('validación') || t.includes('validaciones') || t.includes('capítulo 5') || t.includes('capítulo v')) return 'Capitulo V';
    if (t.includes('conclusión') || t.includes('conclusiones') || t.includes('trabajo futuro')) return 'Conclusiones';
    return 'Capitulo I';
  };

  const handleImportToReports = async (index: number) => {
    if (!selectedGuideline || !selectedGuideline.guidelineStructure || !activeProject) return;
    const section = selectedGuideline.guidelineStructure[index];
    if (!section) return;

    setImportingIndex(index);
    try {
      const sectionType = mapTitleToSectionType(section.title);
      const res = await fetch('http://localhost:5000/api/reports', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: activeProject._id,
          title: section.title,
          templateType: sectionType,
          sectionType: sectionType,
          content: section.suggestedDraft || ''
        })
      });

      if (res.ok) {
        setImportedSections(prev => ({ ...prev, [index]: true }));
      } else {
        const errData = await res.json();
        alert('Error al importar la sección: ' + (errData.message || 'Error desconocido'));
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al intentar importar la sección.');
    } finally {
      setImportingIndex(null);
    }
  };

  const handleCopyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Filter documents according to selected tab
  const filteredDocs = documents.filter(doc => {
    if (activeTab === 'context') {
      return !doc.documentType || doc.documentType === 'context';
    } else {
      return doc.documentType === 'guideline';
    }
  });

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500">
        <ShieldAlert className="w-12 h-12 mb-4 text-zinc-400 animate-pulse" />
        <p className="text-sm font-medium">Por favor selecciona o crea un proyecto activo.</p>
      </div>
    );
  }

  // If a guideline is selected, render the dedicated structured workspace
  if (selectedGuideline) {
    const structure = selectedGuideline.guidelineStructure || [];
    const activeSection = structure[selectedSectionIndex];

    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
        {/* Workspace Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedGuideline(null);
                setImportedSections({});
                setSelectedSectionIndex(0);
              }}
              className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-950 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-zinc-600" />
                Asistente de Plantilla Académica
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Pauta analizada: <span className="font-semibold text-zinc-700">{selectedGuideline.filename}</span>
              </p>
            </div>
          </div>
        </div>

        {selectedGuideline.status !== 'chunked' ? (
          <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center shadow-sm">
            <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-950 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-semibold text-zinc-800">Analizando estructura de pauta...</p>
            <p className="text-xs text-zinc-500 mt-1">La IA está detectando secciones y generando propuestas. Esto puede tardar hasta un minuto.</p>
          </div>
        ) : structure.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center shadow-sm text-zinc-500">
            <AlertCircle className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-medium">No se detectó una estructura válida en esta pauta.</p>
            <p className="text-xs mt-1">Intenta con otro archivo que contenga capítulos y requisitos de formato claros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Indented Navigation Index */}
            <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-3 max-h-[65vh] overflow-y-auto">
              <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider block border-b border-zinc-100 pb-2">
                Estructura del Formato
              </span>
              <div className="space-y-1">
                {structure.map((sec, idx) => {
                  const isActive = selectedSectionIndex === idx;
                  const isImported = importedSections[idx];
                  
                  // Set margin level based on section hierarchy
                  const paddingLeft = sec.level === 2 ? 'pl-4' : sec.level === 3 ? 'pl-8' : 'pl-0';
                  const isChapter = sec.level === 1 || !sec.level;

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedSectionIndex(idx)}
                      className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-center justify-between gap-2 ${paddingLeft} ${
                        isActive 
                          ? 'bg-zinc-950 text-white font-semibold' 
                          : 'text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      <span className={`truncate ${isChapter ? 'font-bold' : ''}`}>
                        {sec.title}
                      </span>
                      {isImported && (
                        <span className="shrink-0 text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-mono flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" />
                          Importado
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: AI Guided Assistance Card */}
            <div className="lg:col-span-8 space-y-6">
              {activeSection && (
                <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                  {/* Tab Title */}
                  <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center">
                    <div>
                      <h2 className="text-sm font-bold text-zinc-900">{activeSection.title}</h2>
                      <span className="text-[10px] text-zinc-500 font-mono">Jerarquía Nivel {activeSection.level}</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyToClipboard(activeSection.suggestedDraft || '', selectedSectionIndex)}
                        className="flex items-center gap-1 bg-white border border-zinc-200 hover:bg-zinc-50 text-[11px] font-bold px-3 py-1.5 rounded transition-colors text-zinc-700"
                      >
                        {copiedIndex === selectedSectionIndex ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copiar Borrador
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleImportToReports(selectedSectionIndex)}
                        disabled={importingIndex !== null || importedSections[selectedSectionIndex]}
                        className="flex items-center gap-1.5 bg-black text-white hover:bg-zinc-800 disabled:opacity-50 text-[11px] font-bold px-3 py-1.5 rounded transition-colors"
                      >
                        <LayoutTemplate className="w-3.5 h-3.5" />
                        {importedSections[selectedSectionIndex] 
                          ? 'Importado en Informes' 
                          : importingIndex === selectedSectionIndex 
                            ? 'Importando...' 
                            : 'Importar a Informes'
                        }
                      </button>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-6">
                    {/* Successfully Imported Banner */}
                    {importedSections[selectedSectionIndex] && (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>¡Sección académica creada con éxito en tus informes!</span>
                        </div>
                        <button
                          onClick={() => navigate('/informes')}
                          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded transition-colors text-[10px]"
                        >
                          Ir a Redactar <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Section 1: Guideline Instructions */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider block">
                        Instrucciones de la Pauta Oficial
                      </span>
                      <div className="bg-zinc-50 border border-zinc-150 p-4 rounded-xl text-xs text-zinc-700 leading-relaxed">
                        {activeSection.instruction || 'No hay instrucciones específicas para esta sección.'}
                      </div>
                    </div>

                    {/* Section 2: Project suggestions */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider block">
                        Recomendaciones del Asistente
                      </span>
                      <div className="bg-sky-50/50 border border-sky-100 p-4 rounded-xl text-xs text-sky-950 leading-relaxed flex gap-3">
                        <BrainCircuit className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold mb-1 text-sky-900">¿Cómo usar los datos de tu proyecto?</p>
                          <p className="text-sky-850 font-medium">
                            {activeSection.suggestedContent || 'La IA sugiere redactar esta sección utilizando la ficha de metodologías y los requerimientos generales.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: AI Draft Output */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider block">
                        Borrador Preliminar Sugerido (Markdown)
                      </span>
                      <textarea
                        value={activeSection.suggestedDraft || ''}
                        readOnly
                        rows={10}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 font-mono text-xs text-zinc-800 focus:outline-none focus:border-zinc-200 resize-y"
                        placeholder="Sin borrador inicial sugerido..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 font-sans">Base Documental Inteligente</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Gestiona el contexto externo de tus clientes y analiza las pautas de tesis universitarias.
          </p>
        </div>
        <button
          onClick={fetchDocuments}
          className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors text-zinc-600 hover:text-zinc-900"
          title="Sincronizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('context')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'context'
              ? 'border-black text-black'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          1. Base de Contexto RAG
        </button>
        <button
          onClick={() => setActiveTab('guideline')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'guideline'
              ? 'border-black text-black'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          2. Analizador de Pautas PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Dynamic Upload Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-900 mb-2">
              {activeTab === 'context' ? 'Cargar Contexto de Cliente' : 'Cargar Formato o Pauta'}
            </h2>
            <p className="text-xs text-zinc-400 mb-4">
              {activeTab === 'context' 
                ? 'Sube documentos para que la IA se base en ellos al redactar.' 
                : 'Sube la guía de tesis institucional para estructurar las secciones.'}
            </p>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                dragActive
                  ? 'border-zinc-950 bg-zinc-50'
                  : 'border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.txt"
                onChange={handleFileChange}
                disabled={isUploading}
              />

              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-950 rounded-full animate-spin"></div>
                  <span className="text-xs font-semibold text-zinc-800">Procesando archivo...</span>
                  <span className="text-[10px] text-zinc-500">
                    {activeTab === 'context' 
                      ? 'Extrayendo texto y dividiendo en chunks' 
                      : 'Estructurando pauta académica y generando sugerencias'}
                  </span>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-zinc-50 rounded-lg text-zinc-500 mb-3">
                    <FileUp className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-800">
                    Arrastra tu archivo aquí o haz clic
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    PDF o TXT. Máximo 15MB.
                  </p>
                </>
              )}
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-red-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5">
            <h3 className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider mb-2">
              {activeTab === 'context' ? 'Flujo de Contexto RAG' : 'Estructuración Asistida'}
            </h3>
            <p className="text-[11px] leading-relaxed text-zinc-600">
              {activeTab === 'context' 
                ? 'El material de contexto se indexa semánticamente en fragmentos y sirve para responder preguntas o redactar textos utilizando datos verídicos de tus clientes.' 
                : 'La pauta se convierte en una lista interactiva de apartados académicos con instrucciones, sugerencias de tus datos y borradores integrados al editor.'}
            </p>
          </div>
        </div>

        {/* Right Side: Dynamic Filtered Documents List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-900">
                {activeTab === 'context' ? 'Documentos de Contexto Activos' : 'Pautas Académicas de Tesis'}
              </span>
              <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-medium">
                {filteredDocs.length} archivos
              </span>
            </div>

            {filteredDocs.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 flex flex-col items-center">
                <FileText className="w-12 h-12 mb-3 text-zinc-300" />
                <p className="text-sm font-medium">No hay documentos en esta sección.</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {activeTab === 'context' 
                    ? 'Sube actas de reuniones o especificaciones para alimentar el RAG.' 
                    : 'Carga el formato PDF institucional o pauta guía para iniciar.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {filteredDocs.map(doc => (
                  <div 
                    key={doc._id} 
                    onClick={() => {
                      if (activeTab === 'guideline') {
                        setSelectedGuideline(doc);
                      }
                    }}
                    className={`p-6 flex items-center justify-between hover:bg-zinc-50/80 transition-colors ${
                      activeTab === 'guideline' ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4 min-w-0 pr-4">
                      <div className="p-2.5 bg-zinc-50 rounded-lg text-zinc-600 shrink-0 border border-zinc-200">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 truncate" title={doc.filename}>
                          {doc.filename}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-[10px] text-zinc-500 font-medium">
                            {(doc.fileSize / 1024).toFixed(1)} KB
                          </span>
                          <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                          <span className="text-[10px] text-zinc-500">
                            Subido el {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                          
                          {doc.status === 'chunked' && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                              <span className="text-[10px] text-zinc-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                {activeTab === 'context' 
                                  ? `${doc.chunkCount} chunks indexados` 
                                  : `${doc.guidelineStructure?.length || 0} secciones detectadas`
                                }
                              </span>
                            </>
                          )}
                        </div>
                        {doc.status === 'failed' && (
                          <p className="text-[10px] text-red-600 mt-1 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Error: {doc.errorMessage || 'Procesamiento fallido'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Status Badges */}
                      {doc.status === 'uploaded' && (
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full animate-pulse">
                          Subido
                        </span>
                      )}
                      {doc.status === 'parsed' && (
                        <span className="text-[10px] font-semibold text-yellow-700 bg-yellow-50 border border-yellow-100 px-2 py-0.5 rounded-full animate-pulse">
                          Procesando...
                        </span>
                      )}
                      {doc.status === 'failed' && (
                        <span className="text-[10px] font-semibold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                          Fallido
                        </span>
                      )}
                      {doc.status === 'chunked' && activeTab === 'guideline' && (
                        <span className="text-[10px] font-semibold text-zinc-700 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          Ver Plantilla <ArrowRight className="w-3 h-3" />
                        </span>
                      )}

                      <button
                        onClick={(e) => handleDelete(doc._id, e)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Eliminar de base"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;

import os
import json
import re
import httpx
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
import pypdf
import pdfplumber

# Load environment variables
load_dotenv()

app = FastAPI(title="ThesisFlow AI Microservice")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")

class TranscriptionRequest(BaseModel):
    transcription: str

class TextExtractionRequest(BaseModel):
    text: str

class DiagramRequest(BaseModel):
    prompt: str
    type: str

class ReportSectionRequest(BaseModel):
    section_title: str
    template_type: str
    project_context: Dict[str, Any]
    instruction: str
    rag_context: Optional[str] = None

class AutocompleteSectionRequest(BaseModel):
    current_content: str
    section_title: str
    template_type: str
    project_context: Dict[str, Any]
    instruction: Optional[str] = None

class InlineSuggestRequest(BaseModel):
    current_text: str
    section_title: str
    template_type: str
    project_context: Dict[str, Any]

class CompareStacksRequest(BaseModel):
    options: List[str]
    criterias: List[str]
    project_context: Dict[str, Any]

class GuidelineAnalysisRequest(BaseModel):
    text: str
    project_context: Dict[str, Any]

class PresentationRequest(BaseModel):
    project_context: Dict[str, Any]
    requirements: List[Dict[str, Any]]
    chapters_summary: str

async def call_openrouter(system_prompt: str, user_prompt: str, is_json: bool = True) -> str:
    """Helper to query OpenRouter LLM"""
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OpenRouter API Key not configured")
        
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "ThesisFlow Platform",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2
    }
    
    if is_json:
        payload["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            res_data = response.json()
            return res_data["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"Error calling OpenRouter: {e}")
            raise HTTPException(status_code=502, detail=f"Error contacting LLM service: {str(e)}")

def sanitize_json_response(text: str) -> Dict[str, Any]:
    """Cleans up markdown codeblock wrapper from LLM output if present"""
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    return json.loads(cleaned)

@app.get("/health")
def health():
    return {"status": "ok", "service": "FastAPI AI Service", "model": OPENROUTER_MODEL}

def get_fallback_meeting_summary(transcription: str) -> Dict[str, Any]:
    # Clean and split into sentences
    sentences = [s.strip() for s in re.split(r'[.|\n]', transcription) if len(s.strip()) > 5]
    
    decisions = []
    actions = []
    requirements = []
    risks = []
    
    # Simple keyword scanning
    for s in sentences:
        s_lower = s.lower()
        # Extract Decisions
        if any(w in s_lower for w in ["decidi", "acord", "defin", "aprob"]):
            decisions.append({
                "text": s[:150],
                "impact": "High" if any(w in s_lower for w in ["arquitectura", "base de datos", "lenguaje", "tecnolog"]) else "Medium"
            })
        # Extract Actions/Tasks
        if any(w in s_lower for w in ["encarg", "compromet", "tarea", "hacer", "crear", "revisar", "desarrollar"]):
            owner = "Sin definir"
            # Simple owner detection
            names = ["juan", "pedro", "maria", "sofia", "carlos", "diego", "ana", "luis", "laura"]
            for name in names:
                if name in s_lower:
                    owner = name.capitalize()
                    break
            actions.append({
                "title": s[:60] + "..." if len(s) > 60 else s,
                "description": s,
                "ownerName": owner,
                "dueDate": None,
                "priority": "High" if "urgente" in s_lower or "importante" in s_lower else "Medium",
                "confidence": 0.85
            })
        # Extract Requirements
        if any(w in s_lower for w in ["requeri", "requisito", "debe", "pantalla", "interfaz", "funcional"]):
            req_type = "NonFunctional" if any(w in s_lower for w in ["seguridad", "rendimiento", "tiempo", "rapido", "escalabil", "disponib", "mantenib"]) else "Functional"
            requirements.append({
                "type": req_type,
                "text": s,
                "confidence": 0.80
            })
        # Extract Risks
        if any(w in s_lower for w in ["riesgo", "bloque", "problema", "peligro", "demora", "retraso"]):
            risks.append({
                "text": s,
                "severity": "High" if "critico" in s_lower or "grave" in s_lower else "Medium"
            })

    # Deduplicate and limit
    decisions = decisions[:5]
    actions = actions[:5]
    requirements = requirements[:5]
    risks = risks[:5]

    # Defaults if empty
    if not decisions:
        decisions = [
            { "text": "Aprobación del alcance inicial del proyecto y definición del cronograma de entregas.", "impact": "Medium" },
            { "text": "Adopción de reuniones de sincronización semanales para control de hitos.", "impact": "Low" }
        ]
    if not actions:
        actions = [
            {
                "title": "Configurar repositorio inicial y entorno de desarrollo",
                "description": "Establecer la estructura de carpetas y las dependencias iniciales del frontend y backend.",
                "ownerName": "Líder Técnico",
                "dueDate": None,
                "priority": "High",
                "confidence": 0.90
            },
            {
                "title": "Redacción de la sección de objetivos del informe",
                "description": "Escribir y refinar el objetivo general y los objetivos específicos en la plantilla de tesis.",
                "ownerName": "Autor del Proyecto",
                "dueDate": None,
                "priority": "Medium",
                "confidence": 0.90
            }
        ]
    if not requirements:
        requirements = [
            { "type": "Functional", "text": "El sistema debe autenticar usuarios mediante correo institucional y contraseña.", "confidence": 0.85 },
            { "type": "Functional", "text": "El sistema debe permitir la visualización de la matriz de trazabilidad de requerimientos en tiempo real.", "confidence": 0.85 },
            { "type": "NonFunctional", "text": "La interfaz de usuario debe ser adaptativa y compatible con dispositivos móviles.", "confidence": 0.80 }
        ]
    if not risks:
        risks = [
            { "text": "Posible desfase en el cronograma debido a demoras en la validación por parte del profesor guía.", "severity": "Medium" },
            { "text": "Curva de aprendizaje pronunciada en las herramientas de modelamiento seleccionadas.", "severity": "Low" }
        ]

    topics = ["Planificación del Proyecto", "Definición de Requerimientos", "Asignación de Roles"]
    if len(transcription) > 200:
        # Generate some topics based on keywords
        inferred_topics = []
        if any(w in transcription.lower() for w in ["database", "base de datos", "sql", "mongo"]):
            inferred_topics.append("Diseño de Base de Datos")
        if any(w in transcription.lower() for w in ["ui", "frontend", "diseño", "pantalla"]):
            inferred_topics.append("Diseño de Interfaz de Usuario")
        if any(w in transcription.lower() for w in ["test", "prueba", "qa"]):
            inferred_topics.append("Plan de Pruebas")
        if inferred_topics:
            topics = inferred_topics + topics
            topics = list(dict.fromkeys(topics))[:4]

    summary = (
        "Reunión de alineación en la que se revisaron los objetivos del proyecto. "
        "Se discutieron los requerimientos principales y se delinearon las tareas inmediatas del equipo. "
        "Se identificaron riesgos de planificación y se acordó el esquema de comunicación."
    )
    if len(transcription) > 50:
        summary = f"Análisis de minuta: {transcription[:120]}..."

    return {
        "summary": summary,
        "topics": topics,
        "decisions": decisions,
        "actions": actions,
        "requirements": requirements,
        "risks": risks
    }

@app.post("/ai/summarize-meeting")
async def summarize_meeting(req: TranscriptionRequest):
    system_prompt = (
        "Eres un asistente de Inteligencia Artificial para ingeniería de software especializado en análisis de minutas de reunión.\n"
        "Analiza la transcripción o notas de la reunión dadas por el usuario y genera una extracción estructurada en JSON. "
        "Todo el contenido debe estar en idioma Español.\n\n"
        "El JSON de respuesta debe tener exactamente la siguiente estructura:\n"
        "{\n"
        "  \"summary\": \"Un resumen ejecutivo de la reunión (máximo 5 líneas).\",\n"
        "  \"topics\": [\"Tema principal 1\", \"Tema principal 2\"],\n"
        "  \"decisions\": [\n"
        "    { \"text\": \"Decisión tomada\", \"impact\": \"Alto/Medio/Bajo\" }\n"
        "  ],\n"
        "  \"actions\": [\n"
        "    {\n"
        "      \"title\": \"Título corto y directo de la tarea o compromiso\",\n"
        "      \"description\": \"Explicación detallada del compromiso o tarea\",\n"
        "      \"ownerName\": \"Nombre del responsable sugerido o 'Sin definir' si es ambiguo o general\",\n"
        "      \"dueDate\": \"Fecha límite estimada en formato YYYY-MM-DD o null si no se menciona\",\n"
        "      \"priority\": \"Low/Medium/High\",\n"
        "      \"confidence\": 0.95\n"
        "    }\n"
        "  ],\n"
        "  \"requirements\": [\n"
        "    {\n"
        "      \"type\": \"Functional/NonFunctional\",\n"
        "      \"text\": \"Descripción clara del requerimiento sugerido en la sesión\",\n"
        "      \"confidence\": 0.90\n"
        "    }\n"
        "  ],\n"
        "  \"risks\": [\n"
        "    { \"text\": \"Descripción del riesgo o bloqueo detectado\", \"severity\": \"Low/Medium/High\" }\n"
        "  ]\n"
        "}\n\n"
        "REGLAS DE EXTRACCIÓN:\n"
        "1. Analiza frases que denoten compromiso (ej: 'yo me encargo', 'lo resolveré', 'dejemos listo esto para', 'voy a revisar...').\n"
        "2. Identifica decisiones que afecten el diseño, arquitectura o planificación (ej: 'usaremos SQL Server', 'se decidió aplazar el entregable').\n"
        "3. Identifica solicitudes explícitas de características del sistema como requerimientos funcionales o no funcionales.\n"
        "4. Si no identificas elementos para alguna categoría, devuelve una lista vacía `[]` para ese campo."
    )
    
    try:
        raw_content = await call_openrouter(system_prompt, req.transcription, is_json=True)
        return sanitize_json_response(raw_content)
    except Exception as e:
        print(f"OpenRouter call failed: {e}. Falling back to local heuristic summarizer.")
        return get_fallback_meeting_summary(req.transcription)

@app.post("/ai/extract-requirements")
async def extract_requirements(req: TextExtractionRequest):
    system_prompt = (
        "Eres un analista de requerimientos de software de nivel Senior. "
        "Analiza el texto provisto por el usuario y extrae requerimientos funcionales y no funcionales que identifiques. "
        "Devuelve un objeto JSON con una única llave 'requirements', la cual contiene una lista de objetos. "
        "Cada objeto de requerimiento debe tener exactamente los siguientes campos:\n"
        "- 'code': Código único secuencial (ej: RF-01, RF-02 para funcionales, RN-01, RN-02 para no funcionales).\n"
        "- 'title': Título descriptivo corto del requerimiento.\n"
        "- 'description': Explicación detallada del requerimiento y sus criterios de aceptación generales.\n"
        "- 'explanation': Explicación o justificación detallada de por qué se sugiere este requerimiento y cómo se relaciona con el texto analizado.\n"
        "- 'type': Debe ser estrictamente 'Functional' o 'Non-Functional'.\n"
        "- 'priority': Prioridad del requerimiento ('High', 'Medium', 'Low').\n"
        "- 'source': Fuente del requerimiento (ej: 'Reunión con cliente', 'Restricción técnica').\n"
        "Todo debe estar en Español. Asegúrate de retornar solo un JSON válido."
    )
    
    raw_content = await call_openrouter(system_prompt, req.text, is_json=True)
    try:
        return sanitize_json_response(raw_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI requirements JSON: {str(e)}")

@app.post("/ai/generate-diagram")
async def generate_diagram(req: DiagramRequest):
    system_prompt = (
        "Eres una IA especializada en modelamiento y arquitectura de software. "
        "Genera código compatible con Mermaid.js basado en las instrucciones del usuario. "
        "El tipo de diagrama solicitado es: " + req.type + ".\n"
        "Debes retornar un JSON estructurado con una sola llave:\n"
        "- 'mermaidCode': Un string que contiene la sintaxis de Mermaid válida lista para ser renderizada en el cliente.\n"
        "No utilices marcas de código markdown como ```mermaid en el string, provee solo el código plano.\n"
        "REGLAS CRÍTICAS DE SINTAXIS PARA EVITAR ERRORES DE MERMAID:\n"
        "1. NUNCA introduzcas saltos de línea reales (físicos) dentro de las etiquetas de las figuras (como `A[...]`, `B{...}`, `C(...)`). Si quieres saltos de línea visuales, debes poner la etiqueta entre comillas dobles y usar `<br/>` (ej: `A[\"Línea 1<br/>Línea 2\"]`).\n"
        "2. Si una etiqueta de figura contiene caracteres especiales como dos puntos (:), paréntesis, comas o llaves, DEBES obligatoriamente envolver el texto de la etiqueta en comillas dobles (ej: `A[\"Inicio: Reunión Inicial\"]` en vez de `A[Inicio: Reunión Inicial]`).\n"
        "3. PROHIBICIÓN DE PLANTUML: Está totalmente prohibido usar sintaxis de PlantUML. No uses palabras clave como 'actor', 'usecase', 'rectangle', 'as' ni delimitadores de llaves tipo `rectangle Name { ... }`.\n"
        "4. DIAGRAMAS DE CASOS DE USO (Use Case): Mermaid no soporta la palabra clave 'usecaseDiagram'. Debes modelar los Casos de Uso estrictamente como un flujograma de dirección horizontal (`flowchart LR`).\n"
        "   - Representa a los actores como círculos: `admin((Administrador))` o `recep((Recepcionista))`.\n"
        "   - Representa los Casos de Uso como óvalos (estadio): `UC1([Registrar Cliente])`.\n"
        "   - Agrupa los casos de uso dentro de un `subgraph` para delimitar el sistema.\n"
        "   - Ejemplo correcto de Use Case en Mermaid:\n"
        "     flowchart LR\n"
        "       admin((Administrador)) --> UC1\n"
        "       subgraph Sistema [\"Sistema de Gestión de Clientes\"]\n"
        "         UC1([Registrar Cliente])\n"
        "         UC2([Actualizar Cliente])\n"
        "       end\n"
        "5. Asegúrate de que todos los nodos abiertos se cierren correctamente y que la sintaxis general sea válida."
    )
    
    raw_content = await call_openrouter(system_prompt, req.prompt, is_json=True)
    try:
        return sanitize_json_response(raw_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse Mermaid diagram JSON: {str(e)}")

@app.post("/ai/generate-report-section")
async def generate_report_section(req: ReportSectionRequest):
    system_prompt = (
        "Eres un redactor académico de nivel de postgrado especializado en informes de tesis y proyectos informáticos. "
        "Vas a redactar el contenido para un capítulo/sección de informe.\n"
        "Contexto del Proyecto:\n"
        f"- Nombre: {req.project_context.get('name')}\n"
        f"- Descripción: {req.project_context.get('description')}\n"
        f"- Problema: {req.project_context.get('problem')}\n"
        f"- Objetivos: {req.project_context.get('objectives')}\n"
        f"- Restricciones: {req.project_context.get('restrictions')}\n"
        f"- Empresa: {req.project_context.get('companyName')}\n\n"
    )
    
    if req.rag_context:
        system_prompt += f"Información extraída de la base documental del proyecto (RAG):\n{req.rag_context}\n\n"
        system_prompt += "Debes redactar la sección basándote firmemente en estos antecedentes documentales y citar cuando corresponda.\n\n"
        
    system_prompt += (
        "Instrucción adicional del usuario: " + req.instruction + "\n\n"
        "Genera el texto en formato Markdown profesional académico y devuelve un JSON estructurado con la llave:\n"
        "- 'content': El string con la sección redactada en Markdown.\n"
        "No agregues texto explicativo por fuera del JSON."
    )
    
    user_prompt = f"Redactar sección: '{req.section_title}' (Tipo de plantilla: '{req.template_type}')"
    raw_content = await call_openrouter(system_prompt, user_prompt, is_json=True)
    try:
        return sanitize_json_response(raw_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse report section JSON: {str(e)}")

@app.post("/ai/autocomplete-report-section")
async def autocomplete_report_section(req: AutocompleteSectionRequest):
    system_prompt = (
        "Eres un redactor académico de nivel de postgrado y co-autor de una tesis de ingeniería de software. "
        "Tu tarea es continuar redactando un párrafo o sección del informe que el usuario ya ha comenzado.\n"
        "Contexto del Proyecto:\n"
        f"- Nombre: {req.project_context.get('name')}\n"
        f"- Descripción: {req.project_context.get('description')}\n"
        f"- Problema: {req.project_context.get('problem')}\n"
        f"- Objetivos: {req.project_context.get('objectives')}\n"
        f"- Restricciones: {req.project_context.get('restrictions')}\n"
        f"- Empresa: {req.project_context.get('companyName')}\n\n"
        "Debes analizar el contenido actual del capítulo/sección y proveer una continuación lógica, fluida y con el mismo estilo y tono formal de redacción.\n"
        "Solo genera el fragmento de texto de autocompletado en sí mismo (unas 100-300 palabras). "
        "No vuelvas a escribir el contenido que el usuario ya aportó, solo continúa desde donde termina.\n"
    )
    if req.instruction:
        system_prompt += f"Instrucción específica de continuación: {req.instruction}\n\n"
        
    system_prompt += (
        "Devuelve un JSON estructurado con exactamente la siguiente llave:\n"
        "- 'completion': El fragmento de texto continuo en Markdown que autocompleta el texto del usuario.\n"
        "No agregues texto explicativo por fuera del JSON."
    )
    
    user_prompt = (
        f"Sección: '{req.section_title}' (Tipo de plantilla: '{req.template_type}')\n\n"
        f"Contenido actual escrito por el usuario:\n\"\"\"\n{req.current_content}\n\"\"\""
    )
    
    raw_content = await call_openrouter(system_prompt, user_prompt, is_json=True)
    try:
        return sanitize_json_response(raw_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse autocomplete JSON: {str(e)}")

@app.post("/ai/inline-suggest")
async def inline_suggest(req: InlineSuggestRequest):
    system_prompt = (
        "Eres un co-autor inteligente de una tesis académica de ingeniería de software.\n"
        "Tu tarea es sugerir la continuación inmediata del texto (una sola frase, máximo 15 palabras) "
        "comenzando exactamente desde la última palabra escrita por el usuario. "
        "Sé coherente con el contexto del proyecto y el tipo de sección.\n"
        "Contexto del Proyecto:\n"
        f"- Nombre: {req.project_context.get('name')}\n"
        f"- Descripción: {req.project_context.get('description')}\n"
        f"- Planteamiento del Problema: {req.project_context.get('problem')}\n"
        f"- Objetivos: {req.project_context.get('objectives')}\n"
        f"- Sección: {req.section_title}\n"
        f"- Tipo Plantilla: {req.template_type}\n\n"
        "REGLA CRÍTICA: Devuelve un JSON estructurado con exactamente la llave 'suggestion'.\n"
        "La sugerencia debe ser breve (máximo 15 palabras), académica, directa y continuar la última frase del usuario de forma natural. "
        "No comiences repitiendo el texto del usuario. Empieza directamente con la siguiente palabra para completar la frase."
    )
    
    user_prompt = f"Contenido actual escrito por el usuario:\n\"\"\"\n{req.current_text}\n\"\"\""
    raw_content = await call_openrouter(system_prompt, user_prompt, is_json=True)
    try:
        return sanitize_json_response(raw_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse inline suggestion JSON: {str(e)}")

@app.post("/ai/compare-stacks")
async def compare_stacks(req: CompareStacksRequest):
    system_prompt = (
        "Eres un Arquitecto de Software Senior y Consultor Tecnológico. "
        "Vas a realizar un análisis comparativo y de trade-offs entre múltiples opciones de stack tecnológico "
        "basándote en el contexto del proyecto provisto.\n"
        "Contexto del Proyecto:\n"
        f"- Nombre: {req.project_context.get('name')}\n"
        f"- Descripción: {req.project_context.get('description')}\n"
        f"- Problema: {req.project_context.get('problem')}\n"
        f"- Objetivos: {req.project_context.get('objectives')}\n"
        f"- Restricciones: {req.project_context.get('restrictions')}\n\n"
        "Debes retornar un JSON estructurado con exactamente las siguientes llaves:\n"
        "- 'matrix': Una lista de objetos, donde cada objeto representa un criterio analizado y tiene:\n"
        "    - 'criteria': El nombre del criterio (ej: Rendimiento, Costo, Curva de aprendizaje, Escalabilidad).\n"
        "    - 'optionA': Evaluación y justificación para la Opción A (primera opción).\n"
        "    - 'optionB': Evaluación y justificación para la Opción B (segunda opción).\n"
        "    - 'winner': Cuál opción resulta ganadora en ese criterio.\n"
        "- 'recommendation': La recomendación final justificada del stack a utilizar en este proyecto.\n"
        "- 'alignmentScore': Un número entero de 0 a 100 indicando el nivel de alineación de la recomendación con los objetivos y restricciones del proyecto.\n"
        "Todo debe estar redactado en idioma Español. Asegúrate de retornar solo un JSON válido y no envuelvas con marcas markdown."
    )
    
    user_prompt = f"Comparar stacks: {', '.join(req.options)} usando criterios: {', '.join(req.criterias)}"
    raw_content = await call_openrouter(system_prompt, user_prompt, is_json=True)
    try:
        return sanitize_json_response(raw_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse compare-stacks JSON: {str(e)}")

@app.post("/ai/analyze-guideline")
async def analyze_guideline(req: GuidelineAnalysisRequest):
    system_prompt = (
        "Eres un metodólogo de investigación académica y redactor de tesis experto en ingeniería de software. "
        "Analiza el texto de la pauta/plantilla académica y divídelo en capítulos, secciones o subsecciones requeridas.\n"
        "Contexto del Proyecto:\n"
        f"- Nombre: {req.project_context.get('name')}\n"
        f"- Descripción: {req.project_context.get('description')}\n"
        f"- Problema: {req.project_context.get('problem')}\n"
        f"- Objetivos: {req.project_context.get('objectives')}\n"
        f"- Restricciones: {req.project_context.get('restrictions')}\n"
        f"- Empresa: {req.project_context.get('companyName')}\n\n"
        "Debes estructurar tu respuesta obligatoriamente como un objeto JSON con la llave 'sections'.\n"
        "La llave 'sections' debe ser una lista de objetos, donde cada objeto tiene exactamente:\n"
        "- 'title': Nombre o título del capítulo o sección (ej: '1.1 Planteamiento del Problema').\n"
        "- 'level': Nivel jerárquico entero (1 para Capítulo principal, 2 para Sección, 3 para Subsección).\n"
        "- 'instruction': Instrucción o explicación detallada de lo que la pauta pide escribir en esa sección.\n"
        "- 'suggestedContent': Consejos prácticos sobre qué datos del proyecto (usando el contexto del proyecto provisto) "
        "deberían colocarse en esta sección específica.\n"
        "- 'suggestedDraft': Un borrador o propuesta de texto preliminar inicial (en formato Markdown formal) redactado para el proyecto, "
        "dejando marcadores tipo [Completar aquí] o [Detalles específicos] si falta información.\n\n"
        "Asegúrate de retornar solo un JSON válido y de extraer únicamente las secciones importantes y explícitas de la pauta (máximo 15-20 secciones importantes para no saturar)."
    )
    
    user_prompt = "Extraer la estructura académica e instrucciones de la siguiente pauta:\n\n" + req.text[:24000]
    raw_content = await call_openrouter(system_prompt, user_prompt, is_json=True)
    try:
        return sanitize_json_response(raw_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse Guideline analysis JSON: {str(e)}. Raw output was: {raw_content}")

@app.post("/ai/parse-pdf")
async def parse_pdf(file: UploadFile = File(...)):
    """Parses text from an uploaded PDF file, falling back to pypdf if pdfplumber fails"""
    try:
        # Save temp file
        temp_file_path = f"temp_{file.filename}"
        with open(temp_file_path, "wb") as f:
            f.write(await file.read())
            
        text = ""
        # Try pdfplumber first (better layout preservation)
        try:
            with pdfplumber.open(temp_file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as plumber_error:
            print(f"pdfplumber failed, trying pypdf fallback: {plumber_error}")
            # Fallback to pypdf
            with open(temp_file_path, "rb") as f:
                reader = pypdf.PdfReader(f)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                        
        # Clean up temp file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            
        if not text.strip():
            raise HTTPException(status_code=422, detail="No text could be extracted from the PDF. It may be an image-only scan.")
            
        return {"filename": file.filename, "extracted_text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing PDF: {str(e)}")

@app.post("/ai/presentation-helper")
async def presentation_helper(req: PresentationRequest):
    system_prompt = (
        "Eres un metodólogo de investigación académica y coach de defensa de tesis experto en proyectos informáticos.\n"
        "Tu tarea es generar un plan estructurado y guion de apoyo para la defensa y presentación final de la tesis del estudiante basándote en el contexto del proyecto, los requerimientos y el avance de redacción provisto.\n\n"
        "Debes retornar obligatoriamente un objeto JSON con la siguiente estructura y formato en idioma Español:\n"
        "{\n"
        "  \"slides\": [\n"
        "    {\n"
        "      \"slideNumber\": 1,\n"
        "      \"title\": \"Título de la diapositiva\",\n"
        "      \"keyPoints\": [\"Punto clave 1\", \"Punto clave 2\"],\n"
        "      \"visuals\": \"Recomendación visual (ej: diagrama de bloques del sistema, iconos de base de datos)\",\n"
        "      \"estimatedDuration\": 2\n"
        "    }\n"
        "  ],\n"
        "  \"narrative\": \"Guion detallado de apoyo para la defensa, consejos de postura, tono y cómo conectar las ideas de forma fluida ante la comisión evaluadora.\",\n"
        "  \"timeOutline\": [\n"
        "    { \"phase\": \"Introducción y Problema\", \"durationMin\": 5 },\n"
        "    { \"phase\": \"Propuesta de Solución y Requerimientos\", \"durationMin\": 7 },\n"
        "    { \"phase\": \"Arquitectura y Demostración\", \"durationMin\": 5 },\n"
        "    { \"phase\": \"Conclusión y Cierre\", \"durationMin\": 3 }\n"
        "  ],\n"
        "  \"checklist\": [\n"
        "    \"Probar conexión de proyector y puntero láser.\",\n"
        "    \"Realizar ensayo cronometrado bajo 20 minutos.\",\n"
        "    \"Tener abierta la demo en vivo en pestañas cargadas antes de iniciar.\",\n"
        "    \"Preparar respuestas cortas y basadas en datos para preguntas de trade-offs de arquitectura.\"\n"
        "  ]\n"
        "}"
    )

    user_prompt = (
        f"Contexto del Proyecto:\n"
        f"- Nombre: {req.project_context.get('name')}\n"
        f"- Descripción: {req.project_context.get('description')}\n"
        f"- Problema: {req.project_context.get('problem')}\n"
        f"- Objetivos: {req.project_context.get('objectives')}\n"
        f"- Empresa: {req.project_context.get('companyName')}\n\n"
        f"Requerimientos Clave:\n"
        f"{json.dumps(req.requirements, indent=2)}\n\n"
        f"Resumen del Avance Escrito (Informes):\n"
        f"{req.chapters_summary}\n\n"
        f"Por favor, genera la estructura considerando un tiempo de presentación de exactamente 20 minutos."
    )

    raw_content = await call_openrouter(system_prompt, user_prompt, is_json=True)
    try:
        return sanitize_json_response(raw_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse presentation helper JSON: {str(e)}")

# Request schemas for Academic Workspace Agent
class ConsistencyRequest(BaseModel):
    content: str
    section_title: str
    template_type: str
    project_context: Dict[str, Any]

class CritiqueRequest(BaseModel):
    content: str
    section_title: str
    template_type: str
    project_context: Dict[str, Any]

@app.post("/ai/check-consistency")
async def check_consistency(req: ConsistencyRequest):
    """Checks for contradictions between report text draft and project metadata"""
    system_prompt = (
        "Eres un revisor de tesis experto y un validador de consistencia de arquitectura de software.\n"
        "Tu tarea es analizar el texto redactado en una sección/capítulo de tesis y contrastarlo con los datos declarados en el contexto del proyecto (ej: metodologías, bases de datos, objetivos, restricciones).\n"
        "Debes identificar de manera rigurosa cualquier discrepancia o contradicción lógica entre el texto de la tesis y los metadatos del proyecto.\n\n"
        "Debes retornar obligatoriamente un objeto JSON con el siguiente formato en idioma Español:\n"
        "{\n"
        "  \"inconsistencies\": [\n"
        "    {\n"
        "      \"severity\": \"High\" | \"Medium\" | \"Low\",\n"
        "      \"field\": \"Campo/Materia en conflicto (ej: Metodología, Base de datos, Requerimientos)\",\n"
        "      \"message\": \"Descripción detallada del conflicto detectado.\",\n"
        "      \"suggestion\": \"Cómo corregir el texto o actualizar los artefactos del sistema para restaurar la coherencia.\"\n"
        "    }\n"
        "  ]\n"
        "}"
    )

    user_prompt = (
        f"Título de la Sección/Capítulo: {req.section_title}\n"
        f"Tipo de Plantilla: {req.template_type}\n\n"
        f"Contexto del Proyecto en el Sistema:\n"
        f"- Nombre: {req.project_context.get('name')}\n"
        f"- Descripción: {req.project_context.get('description')}\n"
        f"- Problema: {req.project_context.get('problem')}\n"
        f"- Objetivos: {req.project_context.get('objectives')}\n"
        f"- Restricciones: {req.project_context.get('restrictions')}\n"
        f"- Metodología Activa: {req.project_context.get('methodology')}\n"
        f"- Empresa: {req.project_context.get('companyName')}\n\n"
        f"Texto del Borrador a Validar:\n"
        f"{req.content}\n\n"
        f"Por favor, revisa detalladamente si hay inconsistencias entre el texto redactado y la configuración del proyecto, y sugiere soluciones."
    )

    raw_content = await call_openrouter(system_prompt, user_prompt, is_json=True)
    try:
        return sanitize_json_response(raw_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse consistency analysis JSON: {str(e)}")

@app.post("/ai/critique-section")
async def critique_section(req: CritiqueRequest):
    """Simulates a thesis evaluation committee (peer review) on written sections"""
    system_prompt = (
        "Eres un miembro exigente de la comisión de evaluación científica de tesis académicas (Peer Reviewer).\n"
        "Tu tarea es criticar con alto nivel intelectual y rigor científico el texto redactado de una sección o capítulo.\n"
        "Analiza la claridad del argumento, la calidad académica del tono, redundancias, afirmaciones sin evidencia numérica o lógica, y vacíos argumentativos.\n\n"
        "Debes retornar obligatoriamente un objeto JSON con la siguiente estructura en idioma Español:\n"
        "{\n"
        "  \"strongPoints\": [\"Punto fuerte 1\", \"Punto fuerte 2\"],\n"
        "  \"weakPoints\": [\n"
        "    {\n"
        "      \"paragraph\": \"Frase o párrafo del texto criticado\",\n"
        "      \"critique\": \"Explicación científica de la debilidad detectada.\",\n"
        "      \"improvement\": \"Sugerencia constructiva para robustecer el párrafo.\"\n"
        "    }\n"
        "  ],\n"
        "  \"gradeEstimate\": \"Nota estimada o nivel (ej: Excelente, Regular, Deficiente)\"\n"
        "}"
    )

    user_prompt = (
        f"Título de la Sección/Capítulo: {req.section_title}\n"
        f"Tipo de Plantilla: {req.template_type}\n\n"
        f"Objetivos del Proyecto:\n"
        f"{req.project_context.get('objectives')}\n\n"
        f"Texto de la Sección:\n"
        f"{req.content}\n\n"
        f"Por favor, realiza un Peer Review simulado riguroso del borrador."
    )

    raw_content = await call_openrouter(system_prompt, user_prompt, is_json=True)
    try:
        return sanitize_json_response(raw_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse academic critique JSON: {str(e)}")

class CompareMeetingsRequest(BaseModel):
    prev_title: str
    prev_summary: str
    prev_transcription: str
    curr_title: str
    curr_summary: str
    curr_transcription: str

class CheckRubricRequest(BaseModel):
    content: str
    section_title: str
    rubric_text: str
    project_context: Dict[str, Any]

@app.post("/ai/compare-meetings")
async def compare_meetings(req: CompareMeetingsRequest):
    system_prompt = (
        "Eres un analista de proyectos y Scrum Master experto en control de alcance.\n"
        "Tu tarea es analizar y comparar la minuta o transcripción de dos reuniones consecutivas (reunión anterior vs reunión actual) e identificar:\n"
        "1. Resumen de diferencias y cambios de enfoque.\n"
        "2. Nuevos requerimientos y compromisos asumidos en la reunión actual.\n"
        "3. Posibles desviaciones de alcance (Scope Creep) o ampliación de requerimientos que impacten el cronograma.\n"
        "4. Diferencias clave en los acuerdos.\n\n"
        "Debes retornar obligatoriamente un objeto JSON con el siguiente formato en idioma Español:\n"
        "{\n"
        "  \"summaryOfChanges\": \"Descripción fluida de los cambios de rumbo y diferencias principales entre ambas sesiones.\",\n"
        "  \"scopeCreepAlerts\": [\n"
        "    {\n"
        "      \"severity\": \"High\" | \"Medium\" | \"Low\",\n"
        "      \"description\": \"Descripción detallada del cambio de alcance o nuevo requerimiento no planificado.\",\n"
        "      \"impact\": \"Impacto sugerido sobre el cronograma o el esfuerzo del equipo.\"\n"
        "    }\n"
        "  ],\n"
        "  \"agreementsDiff\": \"Comparación sintética de los acuerdos nuevos vs anteriores.\"\n"
        "}"
    )
    user_prompt = (
        f"Reunión Anterior: {req.prev_title}\n"
        f"Resumen Anterior: {req.prev_summary}\n"
        f"Transcripción Anterior: {req.prev_transcription}\n\n"
        f"Reunión Actual: {req.curr_title}\n"
        f"Resumen Actual: {req.curr_summary}\n"
        f"Transcripción Actual: {req.curr_transcription}\n"
    )
    try:
        raw_content = await call_openrouter(system_prompt, user_prompt, is_json=True)
        return sanitize_json_response(raw_content)
    except Exception as e:
        return {
            "summaryOfChanges": "No se pudieron comparar las reuniones de forma automática. Revisa las transcripciones manualmente.",
            "scopeCreepAlerts": [],
            "agreementsDiff": "No disponible por fallo del servicio de IA."
        }

@app.post("/ai/check-rubric")
async def check_rubric(req: CheckRubricRequest):
    system_prompt = (
        "Eres un evaluador académico exigente de tesis de ingeniería de software.\n"
        "Tu tarea es evaluar el borrador de un capítulo o sección utilizando una rúbrica de evaluación provista.\n"
        "Analiza detalladamente si el contenido satisface los criterios de la rúbrica y entrega un informe estructurado.\n\n"
        "Debes retornar obligatoriamente un objeto JSON en español con el siguiente formato:\n"
        "{\n"
        "  \"evaluationReport\": \"Resumen detallado de la evaluación frente a la rúbrica.\",\n"
        "  \"complianceScore\": 85, \n"
        "  \"missingCriteria\": [\n"
        "    {\n"
        "      \"criterion\": \"Nombre del criterio de la rúbrica\",\n"
        "      \"missingDetails\": \"Detalles de qué falta en la redacción para cumplirlo.\",\n"
        "      \"recommendation\": \"Recomendación específica de redacción.\"\n"
        "    }\n"
        "  ]\n"
        "}"
    )
    user_prompt = (
        f"Título del Capítulo: {req.section_title}\n"
        f"Contexto del Proyecto:\n"
        f"- Nombre: {req.project_context.get('name')}\n"
        f"- Objetivos: {req.project_context.get('objectives')}\n\n"
        f"Rúbrica de Evaluación:\n{req.rubric_text}\n\n"
        f"Borrador Escrito:\n{req.content}\n"
    )
    try:
        raw_content = await call_openrouter(system_prompt, user_prompt, is_json=True)
        return sanitize_json_response(raw_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse rubric analysis JSON: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

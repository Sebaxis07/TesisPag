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

@app.post("/ai/summarize-meeting")
async def summarize_meeting(req: TranscriptionRequest):
    system_prompt = (
        "Eres un asistente de Inteligencia Artificial para ingeniería de software. "
        "Analiza la transcripción de la reunión dada por el usuario y genera un resumen profesional estructurado en JSON. "
        "El JSON debe tener exactamente las siguientes llaves:\n"
        "- 'summary': Un resumen redactado en un párrafo del transcurso de la reunión.\n"
        "- 'agreements': Una lista de strings conteniendo los acuerdos o compromisos logrados.\n"
        "- 'tasks': Una lista de strings con las tareas acordadas e idealmente sus responsables.\n"
        "- 'risks': Una lista de strings detallando potenciales riesgos, bloqueos o problemas identificados en la sesión.\n"
        "Todo el contenido debe estar en idioma Español."
    )
    
    raw_content = await call_openrouter(system_prompt, req.transcription, is_json=True)
    try:
        return sanitize_json_response(raw_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI JSON response: {str(e)}. Raw output was: {raw_content}")

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

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

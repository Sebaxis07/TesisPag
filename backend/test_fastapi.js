// Use native fetch

async function test() {
  const payload = {
    text: "Pauta de Evaluación: Introducción: Describir el problema. Requerimientos: Detallar los requisitos funcionales y no funcionales. Arquitectura: Explicar diagramas y decisiones de diseño.",
    project_context: {
      name: "Sistema de Control de Inventario",
      description: "Un software para controlar el inventario de Electrans.",
      problem: "Pérdida de stock y falta de trazabilidad.",
      objectives: "Implementar un sistema web con código QR.",
      restrictions: "Usar Node.js y React.",
      companyName: "Electrans"
    }
  };
  
  console.log("Sending request to FastAPI...");
  try {
    const res = await fetch('http://localhost:8000/ai/analyze-guideline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error connecting to FastAPI:", err);
  }
}

test();

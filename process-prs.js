// process-prs.js
import 'dotenv/config';
import OpenAI from 'openai';

const {
  GITHUB_TOKEN,
  OPENAI_API_KEY,
  GITHUB_OWNER,
  GITHUB_REPO,
  GITHUB_AUTHOR,
} = process.env;

if (!GITHUB_TOKEN || !OPENAI_API_KEY) {
  console.error('Faltan GITHUB_TOKEN u OPENAI_API_KEY en .env');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function fetchMergedPRs({ owner, repo, author, perPage = 100, page = 1 }) {
  // Usamos la API de búsqueda de issues/PRs de GitHub
  const q = `repo:${owner}/${repo} type:pr author:${author} is:merged`;
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(
    q
  )}&per_page=${perPage}&page=${page}&sort=created&order=desc`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'cv-builder-script',
      Accept: 'application/vnd.github+json',
    },
  });

  if (!res.ok) {
    console.error('Error al buscar PRs:', res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  return {
    prs: data.items.map((item) => ({
      number: item.number,
      title: item.title,
      url: item.html_url,
      body: item.body || '',
      createdAt: item.created_at,
      closedAt: item.closed_at,
    })),
    totalCount: data.total_count,
  };
}

function buildPrompt(prs) {
  return `
Sos un asistente experto en resumir trabajo técnico para CVs.

Tengo PRs mergeados en GasBuddy. Quiero que los agrupar en "sub-proyectos" que pueda usar en mi base de Notion para mi CV.

### PRs de entrada (JSON)
${JSON.stringify(prs, null, 2)}

### Contexto importante
- El stack es React Native + TypeScript (no repetir en cada sub-proyecto)
- Trabajé en GasBuddy como Senior React Native Developer
- Usá las fechas reales de los PRs (createdAt/closedAt) para calcular el timeFrame de cada sub-proyecto

### Objetivo

1. Ser MUY GRANULAR: Agrupar PRs en sub-proyectos específicos y detallados.
   - OBJETIVO: Generar entre 1-3 sub-proyectos por cada 3-5 PRs (no agrupar demasiado)
   - Cada feature importante merece su propio sub-proyecto
   - Ejemplos de sub-proyectos ESPECÍFICOS: 
     - "Credit Card Onboarding Flow"
     - "Apple Pay Integration"
     - "Map Marker Redesign"
     - "Station Search Performance"
     - "Reward Points System"
     - "Payment Error Handling"
     - "Flash Deals Feature"
     - "Spend Limits Implementation"
     - etc.

2. Para cada sub-proyecto, generar un objeto con este formato JSON (sin comentarios):

[
  {
    "title": "Nombre ESPECÍFICO del subproyecto (sin prefijo 'GasBuddy')",
    "timeFrame": "mes/año - mes/año (basado en fechas reales de PRs relacionados)",
    "overview": "Resumen de 2–3 líneas del subproyecto ESPECÍFICO.",
    "responsibilities": [
      "Responsabilidad técnica específica 1",
      "Responsabilidad técnica específica 2"
    ],
    "achievements": [
      "Logro concreto y cuantificable 1",
      "Logro concreto y cuantificable 2"
    ],
    "impact": [
      "Impacto medible en producto/negocio 1",
      "Impacto medible en producto/negocio 2"
    ],
    "tech": [
      "Solo tecnologías ADEMÁS de React Native y TypeScript (ej: Redux, Firebase, GraphQL, Stripe, etc)"
    ],
    "metrics": [
      "Datos específicos como: X% mejora, Y usuarios impactados, Z crashes reducidos"
    ],
    "tags": [
      "Payments",
      "Performance",
      "Fintech",
      "Mapas",
      "UI/UX",
      "API",
      "Testing"
    ],
    "relatedPrs": [
      { "number": 123, "title": "Titulo PR", "url": "https://..." }
    ]
  }
]

### Reglas CRÍTICAS

- GRANULARIDAD: NO agrupes demasiado. Si un PR trata de un feature distinto, es un sub-proyecto separado.
- La salida DEBE ser un JSON válido (array de objetos), sin texto antes ni después.
- NO incluir "company" ni "role" (ya está en el contexto general)
- NO repetir React Native ni TypeScript en "tech" (ya están en el contexto)
- timeFrame: usar formato "Ene 2023 - Mar 2023" basado en las fechas de los PRs
- No inventes PRs que no existan: usá solo los PRs de entrada en relatedPrs.
- NO ignores PRs: cada PR debe estar en algún sub-proyecto (ser generoso con la cantidad)
- Cada sub-proyecto debe tener entre 1-8 PRs relacionados (idealmente 2-5)
- Preferí crear MÁS sub-proyectos específicos que MENOS generales

Devolveme SOLO el JSON.
  `;
}

async function summarizePRs(prs) {
  const prompt = buildPrompt(prs);

  const response = await openai.chat.completions.create({
    model: 'gpt-5', // podés cambiar el modelo
    messages: [
      {
        role: 'system',
        content:
          'Sos un asistente que genera sub-proyectos técnicos a partir de PRs para un CV.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Respuesta vacía de OpenAI');
  }

  // Intentamos parsear el JSON que devuelve el modelo
  try {
    const jsonStart = content.indexOf('[');
    const jsonEnd = content.lastIndexOf(']');
    const jsonText =
      jsonStart !== -1 && jsonEnd !== -1
        ? content.slice(jsonStart, jsonEnd + 1)
        : content;

    const parsed = JSON.parse(jsonText);
    return parsed;
  } catch (err) {
    console.error('No se pudo parsear el JSON devuelto por el modelo');
    console.error('Contenido bruto:\n', content);
    throw err;
  }
}

async function main() {
  console.log('🔍 Buscando PRs mergeados del repo…');
  
  // Primera llamada para ver cuántos PRs hay en total
  const firstBatch = await fetchMergedPRs({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    author: GITHUB_AUTHOR,
    perPage: 100,
    page: 1,
  });

  console.log(`Total de PRs encontrados: ${firstBatch.totalCount}`);
  
  const allSubProjects = [];
  let allPRs = [...firstBatch.prs];
  
  // Calcular cuántas páginas necesitamos
  const totalPages = Math.ceil(firstBatch.totalCount / 100);
  
  // Traer el resto de las páginas si hay más
  if (totalPages > 1) {
    console.log(`Trayendo ${totalPages - 1} páginas adicionales...`);
    for (let page = 2; page <= totalPages; page++) {
      const batch = await fetchMergedPRs({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        author: GITHUB_AUTHOR,
        perPage: 100,
        page,
      });
      allPRs = [...allPRs, ...batch.prs];
      console.log(`  Página ${page}/${totalPages} - ${allPRs.length} PRs acumulados`);
    }
  }

  console.log(`\n📦 Procesando ${allPRs.length} PRs en batches de 25...`);
  
  // Procesar en batches de 25 PRs (más pequeño = más granular)
  const batchSize = 25;
  for (let i = 0; i < allPRs.length; i += batchSize) {
    const batch = allPRs.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(allPRs.length / batchSize);
    
    console.log(`\n🤖 Batch ${batchNum}/${totalBatches} (PRs ${i + 1}-${i + batch.length})...`);
    
    const subProjects = await summarizePRs(batch);
    allSubProjects.push(...subProjects);
    
    console.log(`   ✓ Generados ${subProjects.length} sub-proyectos en este batch`);
    
    // Pequeña pausa entre batches para no saturar la API
    if (i + batchSize < allPRs.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Guardar en archivo
  const outputFile = 'subprojects-gasbuddy.json';
  const fs = await import('fs/promises');
  await fs.writeFile(
    outputFile,
    JSON.stringify(allSubProjects, null, 2),
    'utf-8'
  );

  console.log(`\n✅ Completado! ${allSubProjects.length} sub-proyectos guardados en ${outputFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

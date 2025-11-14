jajaja me encanta la consigna 😎 — “apuntar altísimo y chamuyar al borde de lo imposible” pero con base técnica sólida. Te propongo **stack y arquitectura** para que hoy tengas MVP, y a la vez una rampa a un “nivel NASA”.

# Stack recomendado (rápido hoy, brutal mañana)

**Core**

* **TypeScript + Node 20**
* **Next.js 15 (App Router) en Vercel** — API routes (Edge/Node), UI mínima para pegar el job link/desc.
* **OpenAI (GPT-5 Thinking)** con **JSON Schemas** para outputs 100% estructurados.
* **Notion SDK** para leer tus DBs y **crear páginas** del CV.
* **Neon + Postgres + pgvector** (o Supabase) para embeddings y scoring (recall fuerte sobre experiencias).
* **Drizzle ORM** para schema limpio y migraciones.
* **Playwright** (Server/Edge fallback) para **scrapear** descripción de trabajos (Lever/Greenhouse/Workday/LinkedIn).
* **Zod** para validar inputs/outputs; **Resend** (opcional) para mandar el CV por mail.

**Opcional “high-end”**

* **Cloudflare Queues/Workers** para jobs largos (scrapeo masivo).
* **Upstash Redis** para cache de páginas de job.
* **OpenRouter** como backup multi-modelo (por si querés mezclar modelos).
* **n8n** como “control tower” si preferís orquestación no-code.

---

# Arquitectura a dos niveles

## Nivel 1 — MVP que funciona YA

1. **/ingest** (API): recibe `{ jobLink?, jobDescription, language, notes }`.

   * Si viene `jobLink` → **scrapea** y obtiene el `jobDescription`.
2. **/match**: consulta tus DBs de Notion (Experiencias/Proyectos, Skills, Certs), crea **embeddings**, hace **similarity search + reglas**.
3. **/curate**: LLM “selector” elige 4–6 experiencias, 10–15 skills, 1–2 certs, y arma **payload estructurado**:

   ```ts
   type CVPayload = {
     profile: string
     experiences: ExperienceBlock[]
     skillsByCategory: Record<string, string[]>
     education: EduEntry[]
     certs: CertEntry[]
     whyMe: string
     links: { label: string; url: string }[]
   }
   ```
4. **/compose**: LLM “rewriter” ajusta tono/terminología al **lenguaje del job** (EN/ES), mete **buzzwords ATS-friendly**, pero sin humo obvio.
5. **/publish**: crea **nueva página Notion** usando tu **template** (bloques + columnas) y devuelve URL.

> Resultado: una página “**CV – Empresa – Rol – Fecha**” con todo curado, en 1 click.

## Nivel 2 — Modo “al límite”

* **RAG híbrido**: `bm25 + pgvector` + **reranking** LLM.
* **Rewriters multi-agente**: “HR-style”, “Tech-lead-style”, “Fintech-tone” y mezcla por **weights**.
* **Anti-alucinación**: cada bullet debe citar un **PR/experiencia** (ID Notion/PR link) en metadata oculta.
* **Evaluación automática**: unit tests de prompts (con **goldens**) + regressions (si baja BLEU/ROUGE/METEOR en samples, falla el build).
* **Cover letter** y **email de outreach** autogenerados (con un slider de “spice”: sobrio → picante).
* **Detector ATS**: produce versión “**texto plano**” 1 página óptima para parsers.

---

# Scoring (selección de experiencias) — simple pero efectivo

```ts
score(exp) = 
  0.45 * techOverlap(exp, job)     // overlap de skills + sinonimia
+ 0.25 * respKeywordOverlap        // verbos/temas (lead, optimize, payments)
+ 0.10 * industryMatch             // fintech, mobility, etc.
+ 0.10 * metricsWeight             // métricas fuertes presentes
+ 0.10 * recencyWeight             // más reciente, mejor
+ bonus(notesForces)               // si vos pedís forzar algo (+100)
```

Embeddings sirven para `techOverlap`/temas; reglas con Zod para **no pasarte** de 2 páginas.

---

# Prompting clave (resumen)

**Selector (JSON estricto)**

* Instrucción: “De la lista de experiencias, elegí máx 4 que maximicen el match con este job. Devuelve **EXACTAMENTE** el JSON `CVPayload` según schema Zod. No inventes nada.”
* **Few-shots**: añade 3 ejemplos de “buena elección”.

**Rewriter**

* Instrucción: “Reescribí bullets con el **vocabulario del job**, usa **métricas** arriba, empieza con **verbos de impacto**, 1 idea por bullet, <= 140 caracteres/bullet. Mantener factualidad.”
* Toggle: **Spice=0..3** (0 sobrio, 3 “pitch ganador”).

**Why-Me**

* 2–3 oraciones que mapeen **requirements → tus evidencias** (citar proyectos por nombre).

---

# Estructura de repo

```
cv-builder/
  apps/web/ (Next.js 15)
    app/api/ingest/route.ts
    app/api/match/route.ts
    app/api/compose/route.ts
    app/api/publish/route.ts
    app/(ui)/page.tsx
  packages/core/
    scoring.ts    // funciones score + bm25
    llm.ts        // wrappers OpenAI + schemas
    scrape.ts     // Playwright job scrapers
    notion.ts     // SDK helpers (read/write)
    format.ts     // blocks Notion (2 columnas)
    schemas.ts    // Zod schemas (CVPayload, Experience)
  db/
    drizzle/
      schema.ts   // tables: jobs, chunks, embeds
  .env.example
```

---

# Esquema de datos (Drizzle + pgvector)

* **jobs**: id, link, raw_html, description_text, language, notes, created_at.
* **chunks**: id, source_type (‘experience’, ‘skill’, ‘cert’), source_id (notion id), text, meta(json).
* **embeddings**: chunk_id → vector.
* **cv_outputs**: id, job_id, notion_page_id, payload(json), version.

---

# Notion: qué leemos / qué escribimos

**Leemos** tus DBs:

* `Experiences`: título, empresa, fechas, stack (multi-select), bullets, métricas, industria, seniority, tags/“notes for CV”.
* `Skills`: nombre, categoría, sinónimos.
* `Certs/Education`.

**Escribimos**:

* Nueva página basada en tu **Template CV** con:

  * Header (nombre/título/contacto)
  * Summary
  * Experience (4 bloques máx)
  * Skills (agrupadas)
  * Education/Certs
  * Why-me
  * Links

---

# MVP en pasos (concretos)

1. **UI mínima** en Next.js con form:

   * `jobLink`, `jobDescription`, `language`, `notes`.
2. **Scraper**: si hay link → Playwright → texto limpio.
3. **Ingest**: store en `jobs`, extraer keywords básicas (regex + lista skills).
4. **Embed** tus experiencias (primera vez) y cachear en pgvector.
5. **Match**: top-K chunks → group por experiencia → **score**.
6. **Selector LLM** → `CVPayload` (Zod.parse).
7. **Rewriter LLM** (tone + idioma + ATS).
8. **Publish** → Notion blocks.

¿Querés que te deje el **esqueleto de Next API routes** + **schema Zod** + **helper de Notion** para que pegues y corras? Te paso un “starter” ultra-concreto y después iteramos los detalles finos (scraper, embeddings y publish).
¡Vamos! Acá tenés los **helpers mínimos** para que el MVP “one-shot” funcione ya. Copiá estos archivos en tu proyecto siguiendo las rutas sugeridas.

---

## `/src/lib/openai.ts`

```ts
import OpenAI from "openai";
import { ENV } from "./env";

const client = new OpenAI({ apiKey: ENV.openaiKey });

export async function callOpenAI(prompt: string): Promise<string> {
  const res = await client.chat.completions.create({
    model: "gpt-5-thinking", // o el que estés usando
    temperature: 0.2,
    max_tokens: 3000,
    messages: [
      { role: "system", content: "Eres un generador de CVs que devuelve JSON válido EXACTO según el schema indicado. No agregues texto fuera del JSON." },
      { role: "user", content: prompt },
    ],
  });

  const content = res.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI: respuesta vacía");
  // Si el modelo envía texto extra, intentamos recortar a [ ... ] o { ... }
  const start = Math.min(
    ...["[", "{"].map((c) => (content.indexOf(c) === -1 ? Infinity : content.indexOf(c)))
  );
  const end = Math.max(content.lastIndexOf("]"), content.lastIndexOf("}"));
  return (start !== Infinity && end !== -1) ? content.slice(start, end + 1) : content;
}
```

---

## `/src/lib/notion.ts`

```ts
import { Client } from "@notionhq/client";
import { ENV } from "./env";
import type { CVPayload } from "./schemas";

const notion = new Client({ auth: ENV.notionToken });

/** --- READERS --- */
export async function getProfile() {
  // Si guardaste tu perfil en una Page (no DB), leemos los bloques/propiedades simples por ahora.
  const page = await notion.pages.retrieve({ page_id: ENV.profilePage });
  // @ts-ignore
  const props = (page as any).properties || {};
  const get = (k: string) => {
    // intenta Title / RichText / URL
    const p = props[k];
    if (!p) return undefined;
    if (p.type === "title") return p.title?.[0]?.plain_text;
    if (p.type === "rich_text") return p.rich_text?.map((t: any) => t.plain_text).join(" ");
    if (p.type === "url") return p.url;
    if (p.type === "email") return p.email;
    return undefined;
  };
  return {
    fullName: get("FullName") ?? "",
    title: get("Title") ?? "",
    location: get("Location") ?? "",
    email: get("Email") ?? "",
    linkedin: get("LinkedIn") ?? "",
    github: get("GitHub") ?? "",
    portfolio: get("Portfolio") ?? "",
    summary: get("Summary") ?? "",
  };
}

export async function getExperiences() {
  const res = await notion.databases.query({
    database_id: ENV.dbExp,
    sorts: [{ property: "Start", direction: "descending" }],
    page_size: 100,
  });
  return res.results.map((p: any) => {
    const props = p.properties;
    const title = props["Name"]?.title?.[0]?.plain_text ?? "";
    const company = props["Company"]?.rich_text?.[0]?.plain_text ?? props["Company"]?.select?.name ?? "";
    const role = props["Role"]?.select?.name ?? "";
    const start = props["Start"]?.date?.start ?? "";
    const end = props["End"]?.date?.end ?? (props["End"]?.date?.start ?? "");
    const summary = props["Summary"]?.rich_text?.map((t: any) => t.plain_text).join(" ") ?? "";
    const responsibilities = props["Responsibilities"]?.rich_text?.map((t: any) => t.plain_text).join("\n") ?? "";
    const achievements = props["Achievements"]?.rich_text?.map((t: any) => t.plain_text).join("\n") ?? "";
    const tech = (props["Tech"]?.multi_select ?? []).map((s: any) => s.name);
    const industry = props["Industry"]?.select?.name ?? "";
    const seniority = props["Seniority"]?.select?.name ?? "";
    return { id: p.id, name: title, company, role, start, end, summary, responsibilities, achievements, tech, industry, seniority };
  });
}

export async function getSkills() {
  const res = await notion.databases.query({
    database_id: ENV.dbSkills,
    page_size: 200,
  });
  return res.results.map((p: any) => {
    const props = p.properties;
    const name = props["Name"]?.title?.[0]?.plain_text ?? "";
    const category = props["Category"]?.select?.name ?? "";
    const synonyms = props["Synonyms"]?.rich_text?.map((t: any) => t.plain_text).join(",") ?? "";
    const syns = synonyms.split(",").map((s: string) => s.trim()).filter(Boolean);
    return { name, category, synonyms: syns };
  });
}

export async function getEdu() {
  const res = await notion.databases.query({
    database_id: ENV.dbEdu,
    page_size: 100,
  });
  return res.results.map((p: any) => {
    const props = p.properties;
    return {
      name: props["Name"]?.title?.[0]?.plain_text ?? "",
      type: props["Type"]?.select?.name ?? "",
      org: props["Org"]?.rich_text?.[0]?.plain_text ?? "",
      year: props["Year"]?.number ? String(props["Year"]?.number) : "",
      details: props["Details"]?.rich_text?.map((t: any) => t.plain_text).join(" ") ?? "",
    };
  });
}

/** --- WRITER --- */
export async function createCVPage(args: { payload: CVPayload; profile: any }) {
  const { payload, profile } = args;
  const title = `CV – ${profile?.fullName || "Candidate"} – ${new Date().toISOString().slice(0,10)}`;

  const page = await notion.pages.create({
    parent: { page_id: ENV.profilePage }, // o un parent específico (workspace/page)
    properties: {
      title: { title: [{ text: { content: title } }] },
    } as any,
    children: [
      // Column layout
      {
        object: "block",
        type: "column_list",
        column_list: {
          children: [
            // LEFT COLUMN
            {
              object: "block",
              type: "column",
              column: {
                children: [
                  h1(`${profile.fullName} — ${profile.title}`),
                  pGray([txt(profile.location)]),
                  callout("🧠", payload.profile),
                  h2("💼 Experience"),
                  ...payload.experiences.flatMap((e) => [
                    h3(`${e.company} — ${e.role}`),
                    pGray([txt(e.period)]),
                    ...(e.context ? [bullet(`Contexto: ${e.context}`)] : []),
                    ...e.bullets.map((b) => bullet(b)),
                  ]),
                  h2("📚 Education & Certifications"),
                  ...payload.education.map((ed) =>
                    bullet(`${ed.title}${ed.org ? `, ${ed.org}` : ""}${ed.year ? ` — ${ed.year}` : ""}`)
                  ),
                  ...payload.certs.map((c) =>
                    bullet(`${c.name}${c.org ? `, ${c.org}` : ""}${c.year ? ` — ${c.year}` : ""}`)
                  ),
                  h2("💡 Why I fit this role"),
                  paragraph(payload.whyMe),
                ],
              },
            },
            // RIGHT COLUMN
            {
              object: "block",
              type: "column",
              column: {
                children: [
                  h2("📇 Contact"),
                  ...(profile.email ? [bullet(`Email: ${profile.email}`)] : []),
                  ...(profile.linkedin ? [bullet(`LinkedIn: ${profile.linkedin}`)] : []),
                  ...(profile.github ? [bullet(`GitHub: ${profile.github}`)] : []),
                  ...(profile.portfolio ? [bullet(`Portfolio: ${profile.portfolio}`)] : []),

                  h2("🛠 Skills"),
                  ...Object.entries(payload.skillsByCategory).flatMap(([cat, items]) => [
                    paragraph(`**${cat}**`),
                    bullet(items.join(", ")),
                  ]),

                  ...(payload.links?.length
                    ? [h2("🔗 Links"), ...payload.links.map((l) => bullet(`${l.label}: ${l.url}`))]
                    : []),
                ],
              },
            },
          ],
        },
      },
    ],
  });

  // @ts-ignore
  return page?.url as string;
}

/** ---- Block helpers ---- */
const txt = (content: string) => ({ type: "text", text: { content } });
const paragraph = (content: string) => ({
  object: "block",
  type: "paragraph",
  paragraph: { rich_text: [txt(content)] },
});
const pGray = (rich_text: any[]) => ({
  object: "block",
  type: "paragraph",
  paragraph: { rich_text, color: "gray" },
});
const h1 = (content: string) => ({
  object: "block",
  type: "heading_1",
  heading_1: { rich_text: [txt(content)] },
});
const h2 = (content: string) => ({
  object: "block",
  type: "heading_2",
  heading_2: { rich_text: [txt(content)] },
});
const h3 = (content: string) => ({
  object: "block",
  type: "heading_3",
  heading_3: { rich_text: [txt(content)] },
});
const bullet = (content: string) => ({
  object: "block",
  type: "bulleted_list_item",
  bulleted_list_item: { rich_text: [txt(content)] },
});
const callout = (icon: string, content: string) => ({
  object: "block",
  type: "callout",
  callout: { rich_text: [txt(content)], icon: { type: "emoji", emoji: icon } },
});
```

---

## `/src/lib/match.ts`

```ts
type Extracted = {
  tech: string[];
  respKW: string[];
  seniority?: string;
  industry?: string;
};

function norm(s: string) {
  return (s || "").toLowerCase();
}

export function simpleExtract(jobDescription: string): Extracted {
  const jd = norm(jobDescription);
  const verbs = ["lead","design","implement","optimize","scale","mentor","payments","performance","maps","security","ci/cd","react native","typescript","node","aws","graphql"];
  const respKW = verbs.filter(v => jd.includes(v));
  const seniority = jd.includes("senior") || jd.includes("lead") ? "Senior" : undefined;
  const industry = ["fintech","ecommerce","health","mobility","retail"].find(w => jd.includes(w));
  // tech la resolvemos más adelante intersectando con tus skills
  return { tech: [], respKW, seniority, industry };
}

export function simpleScoreSelect(opts: {
  exps: Array<{ id: string; name: string; company: string; role: string; start?: string; end?: string; summary?: string; responsibilities?: string; achievements?: string; tech: string[]; industry?: string; seniority?: string; }>;
  skills: Array<{ name: string; category?: string; synonyms?: string[] }>;
  edu: Array<{ name: string; type: string; org?: string; year?: string; details?: string }>;
  extract: Extracted;
  notes: string;
}) {
  const { exps, skills, edu, extract, notes } = opts;

  // tech from JD ∩ skills
  const jdTech = skills
    .filter(s => [s.name, ...(s.synonyms||[])].some(k => norm(notes + " ").includes(norm(k)))) // notas pueden forzar tech
    .map(s => s.name);

  const allJDTech = Array.from(new Set([...(extract.tech||[]), ...jdTech]));

  const scored = exps.map((e) => {
    const techOverlap = e.tech.filter(t => allJDTech.some(j => norm(j) === norm(t))).length;
    const respOverlap = (extract.respKW||[]).filter(k =>
      norm(e.responsibilities||"").includes(k) || norm(e.achievements||"").includes(k)
    ).length;
    const industryMatch = extract.industry && e.industry && norm(extract.industry) === norm(e.industry) ? 1 : 0;
    const seniorMatch = extract.seniority && e.seniority && extract.seniority === e.seniority ? 1 : 0;
    const recency = e.end ? Date.parse(e.end) : Date.now();
    const bonus = (notes && (notes.includes(e.name) || notes.includes(e.company))) ? 100 : 0;

    const score = 0.45*techOverlap + 0.25*respOverlap + 0.10*industryMatch + 0.10*seniorMatch + 0.10*(recency/1e13) + bonus;
    return { ...e, score };
  });

  const topExps = scored.sort((a,b) => b.score - a.score).slice(0, 4);

  // skills por categoría (tomamos tech de topExps y cruzamos con DB skills)
  const setTech = new Set(topExps.flatMap(e => e.tech));
  const selectedSkills = skills.filter(s => setTech.has(s.name)).slice(0, 15);

  // educación + certs
  const education = edu.filter(e => e.type === "Education").sort((a,b) => (b.year||"").localeCompare(a.year||"")).slice(0,1);
  const certs = edu.filter(e => e.type === "Certification").slice(0,3);

  return {
    exps: topExps,
    skills: selectedSkills,
    edu: [...education, ...certs],
  };
}
```

---

## `/src/lib/scrape.ts`

```ts
export async function fetchAndStrip(url: string): Promise<string> {
  if (!url) return "";
  const res = await fetch(url, { headers: { "User-Agent": "cv-one-shot/1.0" } });
  const html = await res.text();
  // limpieza muy básica; para producción conviene Playwright/cheerio y whitelists.
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 20000); // límite sano
}
```

---

## `/src/app/api/cv/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { IngestInputSchema, CVPayloadSchema } from "@/lib/schemas";
import { getProfile, getExperiences, getSkills, getEdu, createCVPage } from "@/lib/notion";
import { callOpenAI } from "@/lib/openai";
import { simpleExtract, simpleScoreSelect } from "@/lib/match";
import { fetchAndStrip } from "@/lib/scrape";
import { buildCVPrompt } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  const input = IngestInputSchema.parse(await req.json());

  const jobDescription =
    input.jobDescription ||
    (input.jobLink ? await fetchAndStrip(input.jobLink) : "");

  if (!jobDescription || jobDescription.length < 30) {
    return NextResponse.json({ error: "jobDescription insuficiente" }, { status: 400 });
  }

  const [profile, exps, skills, edu] = await Promise.all([
    getProfile(), getExperiences(), getSkills(), getEdu()
  ]);

  const extract = simpleExtract(jobDescription);
  const selection = simpleScoreSelect({ exps, skills, edu, extract, notes: input.notes });

  const prompt = buildCVPrompt({
    jobDescription,
    language: input.language,
    notes: input.notes,
    experiences: selection.exps,
    skills: selection.skills,
    education: selection.edu,
    profile
  });

  const raw = await callOpenAI(prompt);
  const payload = CVPayloadSchema.parse(JSON.parse(raw));

  const notionPageUrl = await createCVPage({ payload, profile });
  return NextResponse.json({ notionPageUrl });
}
```

---

## `/src/lib/prompts.ts`

```ts
import { CVPayloadSchema } from "./schemas";

export function buildCVPrompt(args: {
  jobDescription: string;
  language: "es" | "en";
  notes: string;
  experiences: Array<any>;
  skills: Array<any>;
  education: Array<any>;
  profile: any;
}) {
  const schemaString = JSON.stringify(CVPayloadSchema._def, null, 2); // referencia implícita
  return `
Eres un generador de CV. Idioma de salida: ${args.language}.
Devuelve SOLO JSON válido EXACTO con la siguiente forma (ejemplo textual, NO devuelvas este ejemplo):
{
  "profile": "string",
  "experiences": [
    { "company": "string", "role": "string", "period": "MMM YYYY – Present|MMM YYYY – MMM YYYY", "context": "string?", "bullets": ["string", "..."] }
  ],
  "skillsByCategory": { "Mobile": ["React Native","..."] },
  "education": [{ "title":"string","org":"string?","year":"string?" }],
  "certs": [{ "name":"string","org":"string?","year":"string?" }],
  "whyMe": "string",
  "links": [{ "label":"string","url":"https://..." }]
}

Reglas:
- Máx 4 experiencias; máx 6 bullets por experiencia; verbos de impacto; no inventes datos.
- Usa terminología del job cuando sea aplicable; conserva métricas reales si existen.
- Periodo en formato "MMM YYYY – Present" o "MMM YYYY – MMM YYYY".
- Agrupa skills por categoría; máx 15 skills en total.
- "whyMe": 2–3 oraciones que mapeen requerimientos→evidencia real del candidato.
- NO agregues texto fuera del JSON; no comentarios.

JOB DESCRIPTION:
${args.jobDescription}

NOTES (del candidato):
${args.notes}

PROFILE:
${JSON.stringify(args.profile)}

EXPERIENCES:
${JSON.stringify(args.experiences)}

SKILLS:
${JSON.stringify(args.skills)}

EDUCATION_CERTS:
${JSON.stringify(args.education)}
`;
}
```

---

## Checklist final

* Colocar estos archivos.
* Completar `.env.local`.
* Probar con:

```bash
npm run dev
# POST http://localhost:3000/api/cv
# body:
# { "jobLink": "https://...", "language": "en", "notes": "enfatizar RN + pagos" }
```

Si algo truena, pegá el error y lo ajustamos al toque.

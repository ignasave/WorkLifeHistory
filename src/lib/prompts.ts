// PROMPTS PARA GENERACIÓN DE CV POR SECCIONES

export function buildProfilePrompt(args: {
  jobDescription: string;
  language: "es" | "en";
  experiences: Array<any>;
  profile: any;
}) {
  return `
Eres un generador de CV profesional. Idioma de salida: ${args.language}.

⚠️ REGLA CRÍTICA: NUNCA INVENTES DATOS. Solo usa la información proporcionada.

TAREA: Genera un resumen profesional (profile summary) de 2-3 oraciones.

REGLAS:
- Basa el resumen en las tecnologías más comunes en las experiencias proporcionadas
- Menciona años de experiencia calculados desde las fechas reales de las experiencias
- NO inventes especialidades que no estén respaldadas por las experiencias
- Enfoca el resumen hacia los requerimientos del job description cuando sea relevante

FORMATO DE RESPUESTA:
⚠️ IMPORTANTE: Devuelve ÚNICAMENTE el texto del párrafo, SIN:
- Comillas (ni simples ' ni dobles ")
- JSON (nada de {}, [], etc)
- Prefijos como "summary:", "profile:", etc
- Markdown o formato adicional
Ejemplo CORRECTO: "Mobile engineer with 5 years of experience..."
Ejemplo INCORRECTO: {"summary": "Mobile engineer with..."}

JOB DESCRIPTION:
${args.jobDescription}

PERFIL BASE:
${JSON.stringify(args.profile, null, 2)}

EXPERIENCIAS (para calcular años y tecnologías):
${JSON.stringify(args.experiences, null, 2)}
`;
}

export function buildExperiencePrompt(args: {
  jobDescription: string;
  language: "es" | "en";
  experience: any;
}) {
  return `
Eres un generador de CV profesional. Idioma de salida: ${args.language}.

⚠️ REGLA CRÍTICA: NUNCA INVENTES DATOS. Solo usa la información proporcionada.

TAREA: Genera el bloque de experiencia para esta posición en formato JSON:
{
  "company": "nombre exacto de la empresa",
  "role": "rol exacto",
  "period": "MMM YYYY – Present|MMM YYYY – MMM YYYY",
  "context": "1-2 oraciones describiendo la industria/producto",
  "bullets": ["array de 3-5 bullets"]
}

REGLAS PARA BULLETS:

1. **Si "responsibilities" o "achievements" tienen contenido**: usa ESE texto, solo reformatea

2. **Si están VACÍOS pero tienes nombre de empresa + rol + tech**:
   Genera 3-5 bullets siguiendo esta estructura:

   a) **Contexto** (1 bullet):
      - Describe la industria/producto de forma genérica si la empresa es conocida
      - Para empresas conocidas: menciona el tipo de producto
      - Para startups: menciona que es startup y tipo de negocio si es obvio
      - Para empresas desconocidas: "Desarrollo de aplicaciones [mobile/web/fullstack]"

   b) **Responsabilidades técnicas** (2-3 bullets):
      - Lista actividades GENÉRICAS del rol mencionado
      - Menciona las tecnologías del array "tech" en contexto
      - Ejemplos válidos:
        * "Desarrollo y mantenimiento de features para [plataforma]"
        * "Implementación de componentes reutilizables con [tecnologías]"
        * "Colaboración con equipos de backend/diseño/producto"
        * "Optimización de rendimiento y experiencia de usuario"
      - Si es Tech Lead/Team Lead: menciona liderazgo técnico

   c) **Stack técnico** (1 bullet):
      - "Stack: [lista las tecnologías del array tech]"
      - ⚠️ SI EL ARRAY TECH ESTÁ VACÍO: NO agregues este bullet, omítelo completamente

3. **PROHIBICIONES ABSOLUTAS**:
   ❌ NO inventes métricas específicas (30%, 50%, $X millones, X usuarios, etc)
   ❌ NO inventes nombres de features específicas
   ❌ NO inventes logros cuantificables
   ❌ NO inventes tecnologías que no estén en "tech"
   ❌ NO menciones tamaños de equipo específicos
   ❌ NO escribas "Stack: []" si el array está vacío

4. **PERMITIDO**:
   ✅ Contexto de industria para empresas conocidas
   ✅ Actividades genéricas del rol
   ✅ Mencionar plataformas (mobile, web) basándote en el tech stack
   ✅ Términos cualitativos ("mejora de rendimiento", "optimización")

FORMATO DE FECHAS:
- Convierte fechas ISO (2020-02-01) a formato "Feb 2020"
- Si no hay end date: usa "Present"
- ⚠️ SI NO HAY START DATE: usa solo el año si lo tienes, o deja el period vacío ""
- ⚠️ SI AMBAS FECHAS ESTÁN VACÍAS: period debe ser ""

JOB DESCRIPTION (para contexto):
${args.jobDescription}

EXPERIENCIA:
${JSON.stringify(args.experience, null, 2)}

Devuelve SOLO el JSON, sin texto adicional antes o después.
`;
}

export function buildSkillsPrompt(args: {
  language: "es" | "en";
  skills: Array<any>;
}) {
  return `
Eres un generador de CV profesional. Idioma de salida: ${args.language}.

⚠️ REGLA CRÍTICA: NUNCA INVENTES DATOS. Solo usa la información proporcionada.

TAREA: Organiza las siguientes skills por categoría en formato JSON:
{
  "Categoría 1": ["skill1", "skill2"],
  "Categoría 2": ["skill3", "skill4"]
}

REGLAS:
- Usa EXACTAMENTE los nombres de las tecnologías proporcionadas
- Agrupa por la categoría proporcionada en cada skill
- Si una skill no tiene categoría, ponla en "Other"
- Máximo 15 skills en total (prioriza las más relevantes)

SKILLS:
${JSON.stringify(args.skills, null, 2)}

Devuelve SOLO el JSON, sin texto adicional antes o después.
`;
}

export function buildEducationPrompt(args: {
  language: "es" | "en";
  education: Array<any>;
}) {
  return `
Eres un generador de CV profesional. Idioma de salida: ${args.language}.

⚠️ REGLA CRÍTICA: NUNCA INVENTES DATOS. Solo usa la información proporcionada.

TAREA: Formatea la educación y certificaciones en formato JSON:
{
  "education": [{ "title": "título", "org": "institución", "year": "año" }],
  "certs": [{ "name": "nombre", "org": "org", "year": "año" }]
}

REGLAS:
- Separa education (type === "Education") de certs (type === "Certification")
- Usa los nombres, organizaciones y años EXACTOS proporcionados
- Si un campo no existe, omítelo (no uses null ni string vacío)

EDUCACIÓN Y CERTIFICACIONES:
${JSON.stringify(args.education, null, 2)}

Devuelve SOLO el JSON, sin texto adicional antes o después.
`;
}

export function buildWhyMePrompt(args: {
  jobDescription: string;
  language: "es" | "en";
  experiences: Array<any>;
  skills: Array<any>;
}) {
  return `
Eres un generador de CV profesional. Idioma de salida: ${args.language}.

⚠️ REGLA CRÍTICA: NUNCA INVENTES DATOS. Solo usa la información proporcionada.

TAREA: Genera un párrafo de 2-3 oraciones explicando por qué el candidato es un buen fit para este rol.

REGLAS:
- Mapea requerimientos específicos del job description a experiencias reales
- Cita nombres de empresas y tecnologías reales del historial
- Si no hay match claro, sé honesto: "Experiencia relevante en [tecnologías reales]"
- NO inventes proyectos ni logros

FORMATO DE RESPUESTA:
⚠️ IMPORTANTE: Devuelve ÚNICAMENTE el texto del párrafo, SIN:
- Comillas (ni simples ' ni dobles ")
- JSON (nada de {}, [], "fit_paragraph": etc)
- Prefijos como "paragraph:", "fit:", "whyMe:", etc
- Markdown o formato adicional
Ejemplo CORRECTO: "The candidate brings strong React Native experience..."
Ejemplo INCORRECTO: {"fit_paragraph": "The candidate brings..."}

JOB DESCRIPTION:
${args.jobDescription}

EXPERIENCIAS DEL CANDIDATO:
${JSON.stringify(args.experiences, null, 2)}

SKILLS DEL CANDIDATO:
${JSON.stringify(args.skills, null, 2)}
`;
}

// LEGACY: Prompt original completo (mantener por si acaso)
export function buildCVPrompt(args: {
  jobDescription: string;
  language: "es" | "en";
  notes: string;
  experiences: Array<any>;
  skills: Array<any>;
  education: Array<any>;
  profile: any;
}) {
  return `
Eres un generador de CV profesional. Idioma de salida: ${args.language}.

⚠️ REGLA CRÍTICA: NUNCA INVENTES DATOS. Solo usa la información proporcionada.

Devuelve SOLO JSON válido con esta estructura:
{
  "profile": "2-3 oraciones sobre el candidato basadas SOLO en su historial real y años de experiencia calculados de fechas reales",
  "experiences": [
    {
      "company": "nombre exacto de la empresa del JSON",
      "role": "rol exacto del JSON",
      "period": "MMM YYYY – Present|MMM YYYY – MMM YYYY",
      "context": "1-2 oraciones describiendo la industria/producto de la empresa si es conocida, o tipo de aplicación desarrollada",
      "bullets": ["array de 3-5 bullets siguiendo reglas de estructura abajo"]
    }
  ],
  "skillsByCategory": { "Categoría": ["skill1", "skill2"] },
  "education": [{ "title": "título real", "org": "institución real", "year": "año real" }],
  "certs": [{ "name": "nombre real", "org": "org real", "year": "año real" }],
  "whyMe": "2-3 oraciones mapeando requerimientos del job → experiencias reales del candidato con empresas y tecnologías específicas",
  "links": [{ "label": "GitHub", "url": "url real del perfil" }]
}

REGLAS PARA BULLETS (BALANCE ENTRE CONTEXTO Y FACTUALIDAD):

1. **Si "responsibilities" o "achievements" tienen contenido**: usa ESE texto, solo reformatea

2. **Si están VACÍOS pero tienes nombre de empresa + rol + tech**:
   Genera 3-5 bullets siguiendo esta estructura:

   a) **Contexto** (1 bullet):
      - Describe la industria/producto de forma genérica si la empresa es conocida
      - Para empresas conocidas (GasBuddy, Palcare): menciona el tipo de producto
      - Para startups (Biyuya): menciona que es startup y tipo de negocio si es obvio
      - Para empresas desconocidas: "Desarrollo de aplicaciones [mobile/web/fullstack]"

   b) **Responsabilidades técnicas** (2-3 bullets):
      - Lista actividades GENÉRICAS del rol mencionado
      - Menciona las tecnologías del array "tech" en contexto
      - Ejemplos de actividades genéricas válidas:
        * "Desarrollo y mantenimiento de features para [plataforma]"
        * "Implementación de componentes reutilizables con [tecnologías]"
        * "Colaboración con equipos de backend/diseño/producto"
        * "Optimización de rendimiento y experiencia de usuario"
      - Si es Tech Lead/Team Lead: menciona liderazgo técnico

   c) **Stack técnico** (1 bullet):
      - "Stack: [lista las tecnologías del array tech]"

3. **PROHIBICIONES ABSOLUTAS**:
   ❌ NO inventes métricas específicas (30%, 50%, $X millones, X usuarios, etc)
   ❌ NO inventes nombres de features específicas ("sistema de chat", "dashboard de analytics")
   ❌ NO inventes logros cuantificables
   ❌ NO inventes tecnologías que no estén en "tech"
   ❌ NO menciones tamaños de equipo específicos

4. **PERMITIDO** (inferencias razonables):
   ✅ Contexto de industria para empresas conocidas
   ✅ Actividades genéricas del rol (desarrollo, implementación, colaboración)
   ✅ Mencionar plataformas (mobile, web) basándote en el tech stack
   ✅ Términos cualitativos ("mejora de rendimiento", "optimización", "escalabilidad")

5. **Si el array "tech" está vacío**: genera bullets SIN mencionar tecnologías específicas

FORMATO DE FECHAS:
- Convierte las fechas ISO (2020-02-01) a formato "Feb 2020"
- Si no hay end date o es presente: usa "Present"
- Formato: "MMM YYYY – MMM YYYY" o "MMM YYYY – Present"

SKILLS:
- Usa EXACTAMENTE los nombres de las tecnologías del JSON
- Agrupa por la categoría proporcionada en el JSON
- Máximo 15 skills en total

EDUCATION & CERTS:
- Separa education (Educación) de certs (Certificación) basándote en el campo "type"
- Usa los nombres, organizaciones y años EXACTOS del JSON

PROFILE SUMMARY:
- Basa el resumen en las tecnologías más comunes en las experiencias
- Menciona años de experiencia calculados desde las fechas reales
- NO inventes especialidades que no estén respaldadas por las experiencias

WHY ME:
- Mapea requerimientos específicos del job description a experiencias reales
- Cita nombres de empresas y tecnologías reales del historial
- Si no hay match claro, sé honesto: "Experiencia relevante en [tecnologías reales]"

EJEMPLO DE CÓMO MANEJAR DATOS VACÍOS:

Entrada:
{
  "name": "GasBuddy — Fullstack Engineer",
  "company": "GasBuddy",
  "role": "Fullstack Engineer & Mobile Team Lead",
  "start": "2024-09-01",
  "end": "",
  "tech": ["React Native", "TypeScript", "CI/CD", "Mobx", "Android", "Swift", "Java", "iOS", "Git"],
  "responsibilities": "",
  "achievements": ""
}

Salida CORRECTA ✅:
{
  "company": "GasBuddy",
  "role": "Fullstack Engineer & Mobile Team Lead",
  "period": "Sep 2024 – Present",
  "context": "GasBuddy es una aplicación líder en USA y Canadá para encontrar estaciones de servicio y comparar precios de combustible en tiempo real.",
  "bullets": [
    "Liderazgo técnico del equipo mobile, definiendo arquitectura y mejores prácticas de desarrollo",
    "Implementación de features y mantenimiento de aplicaciones iOS y Android utilizando React Native y TypeScript",
    "Colaboración con equipos de backend y producto para integración de APIs y mejora de experiencia de usuario",
    "Optimización de rendimiento y experiencia de usuario en aplicaciones multiplataforma",
    "Stack: React Native, TypeScript, CI/CD, Mobx, Android (Java), iOS (Swift), Git"
  ]
}

Salida INCORRECTA ❌:
{
  "bullets": [
    "Lideré un equipo de 5 desarrolladores móviles", ❌ Número específico inventado
    "Implementé sistema de notificaciones push que aumentó engagement en 50%", ❌ Feature + métrica inventada
    "Optimicé rendimiento reduciendo tiempo de carga en 40%", ❌ Métrica específica inventada
    "Migré 200,000 usuarios a nueva arquitectura", ❌ Número inventado
  ]
}

===================================

DATOS DEL CANDIDATO:

JOB DESCRIPTION:
${args.jobDescription}

NOTAS ADICIONALES:
${args.notes || "Ninguna"}

PERFIL:
${JSON.stringify(args.profile, null, 2)}

EXPERIENCIAS (USA ESTOS DATOS EXACTOS):
${JSON.stringify(args.experiences, null, 2)}

SKILLS (USA ESTOS NOMBRES EXACTOS):
${JSON.stringify(args.skills, null, 2)}

EDUCACIÓN Y CERTIFICACIONES (USA ESTOS DATOS EXACTOS):
${JSON.stringify(args.education, null, 2)}

Devuelve SOLO el JSON, sin texto adicional antes o después.
`;
}

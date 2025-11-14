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
  const verbs = [
    "lead",
    "design",
    "implement",
    "optimize",
    "scale",
    "mentor",
    "payments",
    "performance",
    "maps",
    "security",
    "ci/cd",
    "react native",
    "typescript",
    "node",
    "aws",
    "graphql",
    "kubernetes",
    "docker",
    "microservices",
    "api",
    "mobile",
    "frontend",
    "backend",
    "fullstack",
  ];
  const respKW = verbs.filter((v) => jd.includes(v));
  const seniority =
    jd.includes("senior") || jd.includes("lead") ? "Senior" : undefined;
  const industry = ["fintech", "ecommerce", "health", "mobility", "retail"].find(
    (w) => jd.includes(w)
  );
  // tech la resolvemos más adelante intersectando con tus skills
  return { tech: [], respKW, seniority, industry };
}

export function simpleScoreSelect(opts: {
  exps: Array<{
    id: string;
    name: string;
    company: string;
    role: string;
    start?: string;
    end?: string;
    summary?: string;
    responsibilities?: string;
    achievements?: string;
    tech: string[];
    industry?: string;
    seniority?: string;
  }>;
  skills: Array<{ name: string; category?: string; synonyms?: string[] }>;
  edu: Array<{
    name: string;
    type: string;
    org?: string;
    year?: string;
    details?: string;
  }>;
  extract: Extracted;
  notes: string;
}) {
  const { exps, skills, edu, extract, notes } = opts;

  // tech from JD ∩ skills
  const jdTech = skills
    .filter((s) =>
      [s.name, ...(s.synonyms || [])].some((k) =>
        norm(notes + " ").includes(norm(k))
      )
    ) // notas pueden forzar tech
    .map((s) => s.name);

  const allJDTech = Array.from(new Set([...(extract.tech || []), ...jdTech]));

  const scored = exps.map((e) => {
    const techOverlap = e.tech.filter((t) =>
      allJDTech.some((j) => norm(j) === norm(t))
    ).length;
    const respOverlap = (extract.respKW || []).filter(
      (k) =>
        norm(e.responsibilities || "").includes(k) ||
        norm(e.achievements || "").includes(k)
    ).length;
    const industryMatch =
      extract.industry && e.industry && norm(extract.industry) === norm(e.industry)
        ? 1
        : 0;
    const seniorMatch =
      extract.seniority && e.seniority && extract.seniority === e.seniority
        ? 1
        : 0;
    const recency = e.end ? Date.parse(e.end) : Date.now();
    const bonus =
      notes && (notes.includes(e.name) || notes.includes(e.company)) ? 100 : 0;

    const score =
      0.45 * techOverlap +
      0.25 * respOverlap +
      0.1 * industryMatch +
      0.1 * seniorMatch +
      0.1 * (recency / 1e13) +
      bonus;
    return { ...e, score };
  });

  const topExps = scored.sort((a, b) => b.score - a.score).slice(0, 4);

  // skills por categoría (tomamos tech de topExps y cruzamos con DB skills)
  const setTech = new Set(topExps.flatMap((e) => e.tech));
  const selectedSkills = skills.filter((s) => setTech.has(s.name)).slice(0, 15);

  // educación + certs (filtros más robustos con normalización)
  const education = edu
    .filter((e) => {
      const t = norm(e.type);
      return t.includes("education") || t.includes("educaci") || t === "degree";
    })
    .sort((a, b) => (b.year || "").localeCompare(a.year || ""))
    .slice(0, 2); // Aumentado a 2 para incluir más educación relevante

  const certs = edu
    .filter((e) => {
      const t = norm(e.type);
      return t.includes("cert") || t.includes("certificate") || t === "course";
    })
    .slice(0, 4); // Aumentado a 4 certificaciones

  console.log(
    `📚 Selección de educación: ${education.length} education, ${certs.length} certs de ${edu.length} totales`
  );

  return {
    exps: topExps,
    skills: selectedSkills,
    edu: [...education, ...certs],
  };
}

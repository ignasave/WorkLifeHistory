import { Client } from "@notionhq/client";
import { ENV } from "./env";
import type { CVPayload } from "./schemas";

const notion = new Client({ auth: ENV.notionToken });

/** --- READERS --- */
export async function getProfile() {
  // Read from Profile database (first entry)
  const res = await notion.databases.query({
    database_id: ENV.profilePage,
    page_size: 1,
  });

  if (res.results.length === 0) {
    throw new Error("No profile found in Profile database");
  }

  const page = res.results[0] as any;
  const props = page.properties || {};

  const get = (k: string) => {
    // intenta Title / RichText / URL / Email
    const p = props[k];
    if (!p) return undefined;
    if (p.type === "title") return p.title?.[0]?.plain_text;
    if (p.type === "rich_text")
      return p.rich_text?.map((t: any) => t.plain_text).join(" ");
    if (p.type === "url") return p.url;
    if (p.type === "email") return p.email;
    return undefined;
  };

  return {
    fullName: get("Nombre") ?? get("FullName") ?? get("Name") ?? "",
    title: get("Título profesional") ?? get("Title") ?? get("Título") ?? "",
    location: get("Ubicación") ?? get("Location") ?? "",
    email: get("Email") ?? "",
    linkedin: get("LinkedIn") ?? "",
    github: get("GitHub") ?? "",
    portfolio: get("Portfolio") ?? get("Website") ?? "",
    summary: get("Resumen corto") ?? get("Summary") ?? get("Resumen") ?? "",
  };
}

export async function getExperiences() {
  // Try with different possible date field names
  let res;
  try {
    res = await notion.databases.query({
      database_id: ENV.dbExp,
      sorts: [{ property: "Start Date", direction: "descending" }],
      page_size: 100,
    });
  } catch (error: any) {
    // If "Start Date" doesn't exist, try alternatives
    try {
      res = await notion.databases.query({
        database_id: ENV.dbExp,
        sorts: [{ property: "Start", direction: "descending" }],
        page_size: 100,
      });
    } catch {
      // If no date field works, query without sorting
      res = await notion.databases.query({
        database_id: ENV.dbExp,
        page_size: 100,
      });
    }
  }
  return res.results.map((p: any) => {
    const props = p.properties;
    const title =
      props["Título del proyecto"]?.title?.[0]?.plain_text ??
      props["Name"]?.title?.[0]?.plain_text ??
      "";
    const company =
      props["Empresa / Cliente"]?.select?.name ??
      props["Company"]?.rich_text?.[0]?.plain_text ??
      props["Company"]?.select?.name ??
      props["Empresa"]?.rich_text?.[0]?.plain_text ??
      props["Empresa"]?.select?.name ??
      "";
    const role =
      props["Rol oficial"]?.select?.name ??
      props["Role"]?.select?.name ??
      props["Rol"]?.select?.name ??
      "";
    const start =
      props["Start Date"]?.date?.start ??
      props["Start"]?.date?.start ??
      props["Inicio"]?.date?.start ??
      props["Desde"]?.date?.start ??
      "";
    const end =
      props["End Date"]?.date?.end ??
      props["End Date"]?.date?.start ??
      props["End"]?.date?.end ??
      props["End"]?.date?.start ??
      props["Fin"]?.date?.end ??
      props["Fin"]?.date?.start ??
      props["Hasta"]?.date?.end ??
      props["Hasta"]?.date?.start ??
      "";
    const summary =
      props["Summary"]?.rich_text?.map((t: any) => t.plain_text).join(" ") ??
      props["Resumen"]?.rich_text?.map((t: any) => t.plain_text).join(" ") ??
      "";
    const responsibilities =
      props["Responsibilities"]?.rich_text
        ?.map((t: any) => t.plain_text)
        .join("\n") ??
      props["Responsabilidades"]?.rich_text
        ?.map((t: any) => t.plain_text)
        .join("\n") ??
      "";
    const achievements =
      props["Achievements"]?.rich_text
        ?.map((t: any) => t.plain_text)
        .join("\n") ??
      props["Logros"]?.rich_text
        ?.map((t: any) => t.plain_text)
        .join("\n") ??
      "";
    const tech =
      (props["Tecnologías"]?.multi_select ?? props["Tech"]?.multi_select ?? []).map(
        (s: any) => s.name
      );
    const industry =
      props["Industria"]?.select?.name ?? props["Industry"]?.select?.name ?? "";
    const seniority =
      props["Senioridad"]?.select?.name ?? props["Seniority"]?.select?.name ?? "";
    return {
      id: p.id,
      name: title,
      company,
      role,
      start,
      end,
      summary,
      responsibilities,
      achievements,
      tech,
      industry,
      seniority,
    };
  });
}

/** Helper to derive skills from experiences when no Skills DB exists */
export function deriveSkillsFromExperiences(
  exps: Array<{ tech: string[] }>
): Array<{ name: string; category: string; synonyms: string[] }> {
  const set = new Set<string>();
  exps.forEach((e) => e.tech.forEach((t) => t && set.add(t)));

  // mapeo simple de categorías por palabra clave (ajustalo a gusto)
  const categorize = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes("react") || n.includes("rn")) return "Mobile/Frontend";
    if (n.includes("android") || n.includes("ios") || n.includes("swift") || n.includes("kotlin"))
      return "Mobile";
    if (n.includes("node") || n.includes("nest") || n.includes("express"))
      return "Backend";
    if (
      n.includes("aws") ||
      n.includes("gcp") ||
      n.includes("azure") ||
      n.includes("cloud")
    )
      return "Cloud";
    if (
      n.includes("ci") ||
      n.includes("jest") ||
      n.includes("testing") ||
      n.includes("cypress")
    )
      return "Tooling/QA";
    if (n.includes("typescript") || n.includes("javascript") || n.includes("python"))
      return "Languages";
    if (n.includes("docker") || n.includes("kubernetes") || n.includes("k8s"))
      return "DevOps";
    if (n.includes("graphql") || n.includes("rest") || n.includes("api"))
      return "APIs";
    if (n.includes("postgres") || n.includes("mongo") || n.includes("sql"))
      return "Databases";
    return "Other";
  };

  return Array.from(set).map((name) => ({
    name,
    category: categorize(name),
    synonyms: [] as string[],
  }));
}

export async function getSkills() {
  // Si no hay DB de skills configurada, devolvemos array vacío
  if (!ENV.dbSkills) return [];

  const res = await notion.databases.query({
    database_id: ENV.dbSkills,
    page_size: 200,
  });
  return res.results.map((p: any) => {
    const props = p.properties;
    const name = props["Name"]?.title?.[0]?.plain_text ?? "";
    const category = props["Category"]?.select?.name ?? "";
    const synonyms =
      props["Synonyms"]?.rich_text?.map((t: any) => t.plain_text).join(",") ??
      "";
    const syns = synonyms
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
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

    // Extract year from End Date if Year field doesn't exist
    const endDate = props["End Date"]?.date?.end ?? props["End Date"]?.date?.start;
    const yearFromDate = endDate ? new Date(endDate).getFullYear().toString() : "";

    return {
      name:
        props["Nombre"]?.title?.[0]?.plain_text ??
        props["Name"]?.title?.[0]?.plain_text ??
        "",
      type:
        props["Tipo"]?.select?.name ??
        props["Type"]?.select?.name ??
        "",
      org:
        props["Institución / Proveedor"]?.rich_text?.[0]?.plain_text ??
        props["Org"]?.rich_text?.[0]?.plain_text ??
        props["Organización"]?.rich_text?.[0]?.plain_text ??
        props["Institución"]?.rich_text?.[0]?.plain_text ??
        "",
      year:
        props["Year"]?.number
          ? String(props["Year"]?.number)
          : props["Año"]?.number
            ? String(props["Año"]?.number)
            : yearFromDate,
      details:
        props["Programa / Título"]?.rich_text?.[0]?.plain_text ??
        props["Details"]?.rich_text?.map((t: any) => t.plain_text).join(" ") ??
        props["Detalles"]?.rich_text?.map((t: any) => t.plain_text).join(" ") ??
        "",
    };
  });
}

/** --- WRITER --- */
export async function createCVPage(args: {
  payload: CVPayload;
  profile: any;
}) {
  const { payload, profile } = args;
  const title = `CV – ${profile?.fullName || "Candidate"} – ${new Date().toISOString().slice(0, 10)}`;

  // Note: Notion requires a valid parent (page or database) to create pages
  // If you want to organize CVs, create a page in Notion called "CVs Generated"
  // and set NOTION_CV_PARENT_PAGE_ID in your .env file
  const parentId = ENV.cvParentPage;

  if (!parentId) {
    throw new Error(
      "NOTION_CV_PARENT_PAGE_ID not set. Please create a page in Notion to store your CVs and add its ID to .env"
    );
  }

  const page = await notion.pages.create({
    parent: { page_id: parentId },
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
                  ...payload.experiences.flatMap((e, idx) => [
                    ...(idx > 0 ? [divider()] : []), // Add divider between experiences
                    h3(`${e.company}`),
                    paragraph(
                      e.period
                        ? `**${e.role}** · ${e.period}`
                        : `**${e.role}**`
                    ),
                    ...(e.context ? [paragraph(`_${e.context}_`)] : []),
                    ...e.bullets.map((b) => bullet(b)),
                  ]),
                  h2("📚 Education & Certifications"),
                  ...payload.education.map((ed) =>
                    bullet(
                      `${ed.title}${ed.org ? `, ${ed.org}` : ""}${ed.year ? ` — ${ed.year}` : ""}`
                    )
                  ),
                  ...payload.certs.map((c) =>
                    bullet(
                      `${c.name}${c.org ? `, ${c.org}` : ""}${c.year ? ` — ${c.year}` : ""}`
                    )
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
                  ...(profile.email
                    ? [bullet(`Email: ${profile.email}`)]
                    : []),
                  ...(profile.linkedin
                    ? [bullet(`LinkedIn: ${profile.linkedin}`)]
                    : []),
                  ...(profile.github
                    ? [bullet(`GitHub: ${profile.github}`)]
                    : []),
                  ...(profile.portfolio
                    ? [bullet(`Portfolio: ${profile.portfolio}`)]
                    : []),

                  h2("🛠 Skills"),
                  ...Object.entries(payload.skillsByCategory).flatMap(
                    ([cat, items]) => [
                      paragraph(`**${cat}**`),
                      bullet(items.join(", ")),
                    ]
                  ),
                ],
              },
            },
          ],
        },
      } as any,
    ],
  });

  // @ts-ignore
  return page?.url as string;
}

/** ---- Block helpers ---- */
const txt = (content: string) => ({ type: "text", text: { content } });

// Helper to parse simple markdown formatting (**bold**, _italic_)
const parseMarkdown = (content: string) => {
  const parts: any[] = [];
  let remaining = content;

  // Simple regex to find **bold** and _italic_
  const boldRegex = /\*\*(.*?)\*\*/g;
  const italicRegex = /_(.*?)_/g;

  // First, replace bold
  remaining = remaining.replace(boldRegex, (match, text) => {
    return `[[BOLD:${text}]]`;
  });

  // Then, replace italic
  remaining = remaining.replace(italicRegex, (match, text) => {
    return `[[ITALIC:${text}]]`;
  });

  // Now parse the result
  const segments = remaining.split(/(\[\[(?:BOLD|ITALIC):.*?\]\])/g);

  for (const segment of segments) {
    if (segment.startsWith("[[BOLD:")) {
      const text = segment.slice(7, -2);
      parts.push({ type: "text", text: { content: text }, annotations: { bold: true } });
    } else if (segment.startsWith("[[ITALIC:")) {
      const text = segment.slice(9, -2);
      parts.push({ type: "text", text: { content: text }, annotations: { italic: true } });
    } else if (segment) {
      parts.push({ type: "text", text: { content: segment } });
    }
  }

  return parts.length > 0 ? parts : [txt(content)];
};

const paragraph = (content: string) => ({
  object: "block",
  type: "paragraph",
  paragraph: { rich_text: parseMarkdown(content) },
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
  callout: {
    rich_text: [txt(content)],
    icon: { type: "emoji", emoji: icon },
  },
});
const divider = () => ({
  object: "block",
  type: "divider",
  divider: {},
});

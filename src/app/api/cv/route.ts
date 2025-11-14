import { NextRequest, NextResponse } from "next/server";
import { IngestInputSchema, CVPayloadSchema, ExperienceBlockSchema } from "@/lib/schemas";
import {
  getProfile,
  getExperiences,
  getSkills,
  getEdu,
  createCVPage,
  deriveSkillsFromExperiences,
} from "@/lib/notion";
import { callOpenAI } from "@/lib/openai";
import { simpleExtract, simpleScoreSelect } from "@/lib/match";
import { fetchAndStrip } from "@/lib/scrape";
import {
  buildProfilePrompt,
  buildExperiencePrompt,
  buildSkillsPrompt,
  buildEducationPrompt,
  buildWhyMePrompt,
} from "@/lib/prompts";
import { validateEnv } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    // Validate environment variables
    validateEnv();

    const input = IngestInputSchema.parse(await req.json());

    const jobDescription =
      input.jobDescription ||
      (input.jobLink ? await fetchAndStrip(input.jobLink) : "");

    if (!jobDescription || jobDescription.length < 30) {
      return NextResponse.json(
        { error: "jobDescription insuficiente" },
        { status: 400 }
      );
    }

    const [profile, exps, skillsFromDB, edu] = await Promise.all([
      getProfile(),
      getExperiences(),
      getSkills(),
      getEdu(),
    ]);

    // Si no hay skills de la DB, las derivamos de las experiencias
    const skills = skillsFromDB.length
      ? skillsFromDB
      : deriveSkillsFromExperiences(exps);

    const extract = simpleExtract(jobDescription);
    const selection = simpleScoreSelect({
      exps,
      skills,
      edu,
      extract,
      notes: input.notes,
    });

    // Log selected data for debugging
    console.log("=== SELECTED DATA FOR CV ===");
    console.log("Profile:", JSON.stringify(profile, null, 2));
    console.log("Selected Experiences:", JSON.stringify(selection.exps, null, 2));
    console.log("Selected Skills:", JSON.stringify(selection.skills, null, 2));
    console.log("Selected Education:", JSON.stringify(selection.edu, null, 2));
    console.log("===========================");

    // NUEVO FLUJO: Llamadas separadas por sección para mejor contexto
    console.log("🔄 Generando CV con llamadas separadas por sección...");

    // 1. Generar Profile Summary
    console.log("📝 Generando profile summary...");
    const profilePrompt = buildProfilePrompt({
      jobDescription,
      language: input.language,
      experiences: selection.exps,
      profile,
    });
    const profileSummaryRaw = await callOpenAI(profilePrompt);
    console.log("🔍 Profile raw response:", profileSummaryRaw);

    // Parse if it's JSON, otherwise use as-is
    let profileSummary = profileSummaryRaw.replace(/^["']|["']$/g, "").trim();
    try {
      const parsed = JSON.parse(profileSummaryRaw);
      console.log("📦 Profile parsed as JSON:", parsed);
      profileSummary = parsed.summary || parsed.profile || JSON.stringify(parsed);
      console.log("✅ Profile final text:", profileSummary);
    } catch (e) {
      console.log("📝 Profile is not JSON, using as-is");
      // Not JSON, use as-is
    }

    // 2. Generar cada experiencia (una llamada por proyecto)
    console.log(`💼 Generando ${selection.exps.length} experiencias...`);
    const experiencesPromises = selection.exps.map(async (exp) => {
      const expPrompt = buildExperiencePrompt({
        jobDescription,
        language: input.language,
        experience: exp,
      });
      const expRaw = await callOpenAI(expPrompt);
      return ExperienceBlockSchema.parse(JSON.parse(expRaw));
    });
    const experiences = await Promise.all(experiencesPromises);

    // 3. Generar Skills por categoría
    console.log("🛠 Generando skills...");
    const skillsPrompt = buildSkillsPrompt({
      language: input.language,
      skills: selection.skills,
    });
    const skillsRaw = await callOpenAI(skillsPrompt);
    const skillsByCategory = JSON.parse(skillsRaw);

    // 4. Generar Education & Certs
    console.log("📚 Generando educación y certificaciones...");
    const eduPrompt = buildEducationPrompt({
      language: input.language,
      education: selection.edu,
    });
    const eduRaw = await callOpenAI(eduPrompt);
    const { education, certs } = JSON.parse(eduRaw);

    // 5. Generar Why Me
    console.log("💡 Generando why me...");
    const whyMePrompt = buildWhyMePrompt({
      jobDescription,
      language: input.language,
      experiences: selection.exps,
      skills: selection.skills,
    });
    const whyMeRaw = await callOpenAI(whyMePrompt);
    console.log("🔍 WhyMe raw response:", whyMeRaw);

    // Parse if it's JSON, otherwise use as-is
    let whyMe = whyMeRaw.replace(/^["']|["']$/g, "").trim();
    try {
      const parsed = JSON.parse(whyMeRaw);
      console.log("📦 WhyMe parsed as JSON:", parsed);
      whyMe = parsed.fit_paragraph || parsed.paragraph || parsed.whyMe || parsed.why || JSON.stringify(parsed);
      console.log("✅ WhyMe final text:", whyMe);
    } catch (e) {
      console.log("📝 WhyMe is not JSON, using as-is");
      // Not JSON, use as-is
    }

    // 6. Ensamblar el payload final
    const payload = CVPayloadSchema.parse({
      profile: profileSummary.trim(),
      experiences,
      skillsByCategory,
      education: education || [],
      certs: certs || [],
      whyMe: whyMe.trim(),
      links: [], // Links se muestran en Contact, no necesitamos duplicar
    });

    console.log("✅ CV generado exitosamente");

    const notionPageUrl = await createCVPage({ payload, profile });

    return NextResponse.json({
      success: true,
      notionPageUrl,
      payload,
    });
  } catch (error: any) {
    console.error("Error generating CV:", error);
    return NextResponse.json(
      {
        error: "Failed to generate CV",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

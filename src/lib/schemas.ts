import { z } from "zod";

// Input schema for the API
export const IngestInputSchema = z.object({
  jobLink: z.string().url().optional(),
  jobDescription: z.string().optional(),
  language: z.enum(["es", "en"]).default("en"),
  notes: z.string().default(""),
});

export type IngestInput = z.infer<typeof IngestInputSchema>;

// CV Payload schemas
export const ExperienceBlockSchema = z.object({
  company: z.string(),
  role: z.string(),
  period: z.string(), // "MMM YYYY – Present" or "MMM YYYY – MMM YYYY"
  context: z.string().optional(),
  bullets: z.array(z.string()),
});

export const EduEntrySchema = z.object({
  title: z.string(),
  org: z.string().optional(),
  year: z.string().optional(),
});

export const CertEntrySchema = z.object({
  name: z.string(),
  org: z.string().optional(),
  year: z.string().optional(),
});

export const LinkSchema = z.object({
  label: z.string(),
  url: z.string().url(),
});

export const CVPayloadSchema = z.object({
  profile: z.string(),
  experiences: z.array(ExperienceBlockSchema),
  skillsByCategory: z.record(z.string(), z.array(z.string())),
  education: z.array(EduEntrySchema),
  certs: z.array(CertEntrySchema),
  whyMe: z.string(),
  links: z.array(LinkSchema).optional(),
});

export type CVPayload = z.infer<typeof CVPayloadSchema>;
export type ExperienceBlock = z.infer<typeof ExperienceBlockSchema>;
export type EduEntry = z.infer<typeof EduEntrySchema>;
export type CertEntry = z.infer<typeof CertEntrySchema>;

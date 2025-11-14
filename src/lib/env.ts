// Environment configuration with validation
export const ENV = {
  openaiKey: process.env.OPENAI_API_KEY || "",
  notionToken: process.env.NOTION_TOKEN || "",
  profilePage: process.env.NOTION_PROFILE_PAGE_ID || "",
  dbExp: process.env.NOTION_DB_EXPERIENCES || "",
  dbSkills: process.env.NOTION_DB_SKILLS || "", // Optional: will derive from experiences if not provided
  dbEdu: process.env.NOTION_DB_EDU || "",
  cvParentPage: process.env.NOTION_CV_PARENT_PAGE_ID || "", // Page where generated CVs will be created
} as const;

// Validation function to ensure all required env vars are set
export function validateEnv() {
  const missing: string[] = [];

  if (!ENV.openaiKey) missing.push("OPENAI_API_KEY");
  if (!ENV.notionToken) missing.push("NOTION_TOKEN");
  if (!ENV.profilePage) missing.push("NOTION_PROFILE_PAGE_ID");
  if (!ENV.dbExp) missing.push("NOTION_DB_EXPERIENCES");
  // dbSkills is optional - will derive from experiences if not provided
  if (!ENV.dbEdu) missing.push("NOTION_DB_EDU");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
      `Please check your .env file.`
    );
  }
}

import { Client } from "@notionhq/client";
import dotenv from "dotenv";

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function debugDatabase(dbId, name) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 Database: ${name}`);
  console.log(`   ID: ${dbId}`);
  console.log("=".repeat(60));

  try {
    // Get database metadata
    const db = await notion.databases.retrieve({ database_id: dbId });

    console.log("\n🔑 Available Properties:");
    const props = db.properties;

    for (const [key, value] of Object.entries(props)) {
      console.log(`   - "${key}" (${value.type})`);
    }

    // Get first entry as example
    const query = await notion.databases.query({
      database_id: dbId,
      page_size: 1,
    });

    if (query.results.length > 0) {
      console.log("\n📄 Sample Entry:");
      const entry = query.results[0];
      const entryProps = entry.properties;

      for (const [key, value] of Object.entries(entryProps)) {
        let displayValue = "—";

        if (value.type === "title" && value.title?.[0]) {
          displayValue = value.title[0].plain_text;
        } else if (value.type === "rich_text" && value.rich_text?.[0]) {
          displayValue = value.rich_text.map(t => t.plain_text).join(" ");
        } else if (value.type === "select") {
          displayValue = value.select?.name ?? "—";
        } else if (value.type === "multi_select") {
          displayValue = value.multi_select?.map(s => s.name).join(", ") || "—";
        } else if (value.type === "date") {
          displayValue = value.date?.start ?? "—";
        } else if (value.type === "number") {
          displayValue = value.number ?? "—";
        } else if (value.type === "url") {
          displayValue = value.url ?? "—";
        } else if (value.type === "email") {
          displayValue = value.email ?? "—";
        }

        console.log(`   - ${key}: ${displayValue}`);
      }
    } else {
      console.log("\n⚠️  No entries found in this database");
    }
  } catch (error) {
    console.error(`\n❌ Error accessing database: ${error.message}`);
  }
}

async function main() {
  console.log("\n🔍 Notion Database Schema Debug Tool");
  console.log("=====================================\n");

  const databases = [
    { id: process.env.NOTION_PROFILE_PAGE_ID, name: "Profile" },
    { id: process.env.NOTION_DB_EXPERIENCES, name: "Experiences" },
    { id: process.env.NOTION_DB_EDU, name: "Education/Certifications" },
  ];

  if (process.env.NOTION_DB_SKILLS) {
    databases.push({ id: process.env.NOTION_DB_SKILLS, name: "Skills (Optional)" });
  }

  for (const db of databases) {
    if (!db.id) {
      console.log(`\n⚠️  Skipping ${db.name}: No ID in .env`);
      continue;
    }
    await debugDatabase(db.id, db.name);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Debug complete!");
  console.log("=".repeat(60) + "\n");
}

main().catch(console.error);

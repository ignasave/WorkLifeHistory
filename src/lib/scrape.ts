export async function fetchAndStrip(url: string): Promise<string> {
  if (!url) return "";

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "cv-one-shot/1.0" },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();

    // limpieza muy básica; para producción conviene Playwright/cheerio y whitelists.
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return text.slice(0, 20000); // límite sano
  } catch (error) {
    console.error("Error fetching job description:", error);
    throw new Error(`Failed to scrape job URL: ${error}`);
  }
}

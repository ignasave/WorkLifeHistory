"use client";

import { useState } from "react";

export default function Home() {
  const [jobLink, setJobLink] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [language, setLanguage] = useState<"en" | "es">("en");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobLink: jobLink || undefined,
          jobDescription: jobDescription || undefined,
          language,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate CV");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h1>🎯 CV Generator</h1>
      <p>Generate a tailored CV from your Notion databases using AI</p>

      <form onSubmit={handleSubmit} style={{ marginTop: "2rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="jobLink" style={{ display: "block", marginBottom: "0.5rem" }}>
            Job Link (optional)
          </label>
          <input
            id="jobLink"
            type="url"
            value={jobLink}
            onChange={(e) => setJobLink(e.target.value)}
            placeholder="https://company.com/jobs/123"
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="jobDescription" style={{ display: "block", marginBottom: "0.5rem" }}>
            Job Description (or paste it here)
          </label>
          <textarea
            id="jobDescription"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
            rows={10}
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontFamily: "monospace",
            }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="language" style={{ display: "block", marginBottom: "0.5rem" }}>
            Language
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as "en" | "es")}
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="notes" style={{ display: "block", marginBottom: "0.5rem" }}>
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., 'emphasize React Native and payments experience'"
            rows={3}
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading || (!jobLink && !jobDescription)}
          style={{
            padding: "0.75rem 2rem",
            fontSize: "1rem",
            backgroundColor: loading ? "#ccc" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Generating..." : "Generate CV"}
        </button>
      </form>

      {error && (
        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "4px",
            color: "#c00",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            backgroundColor: "#efe",
            border: "1px solid #cfc",
            borderRadius: "4px",
          }}
        >
          <h2>✅ CV Generated Successfully!</h2>
          <p>
            <a
              href={result.notionPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#0070f3", textDecoration: "underline" }}
            >
              View CV in Notion
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

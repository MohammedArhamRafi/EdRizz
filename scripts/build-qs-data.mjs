import { readFile, writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const sourceFile = path.join(
  "data",
  "2026 QS World University Rankings 1.3 (For qs.com).xlsx - Sheet1.csv",
);
const outputFile = path.join("public", "qs-rankings-2026.json");

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseRankValue(rank) {
  const match = String(rank).match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}

function regionFromQs(region) {
  const normalized = String(region || "").toLowerCase();
  if (normalized.includes("america")) return "North America";
  if (normalized.includes("europe")) return "Europe";
  if (normalized.includes("asia")) return "Asia";
  if (normalized.includes("oceania")) return "Oceania";
  if (normalized.includes("africa")) return "Africa";
  return region || "Global";
}

const csv = await readFile(sourceFile, "utf8");
const lines = csv.split(/\r?\n/).filter(Boolean);
const headerIndex = lines.findIndex((line) => {
  const lower = line.toLowerCase();
  return lower.includes("rank") && lower.includes("name") && lower.includes("overall score");
});

if (headerIndex === -1) {
  throw new Error("Could not find QS CSV header row.");
}

const headers = parseCsvLine(lines[headerIndex]);
const rows = lines.slice(headerIndex + 1).map(parseCsvLine);

const universities = rows
  .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])))
  .filter((row) => row.Rank && row.Name)
  .map((row) => ({
    name: row.Name,
    country: row["Country/Territory"],
    region: regionFromQs(row.Region),
    rank: parseRankValue(row.Rank),
    rankDisplay: row.Rank,
    previousRank: row["Previous Rank"],
    score: Number(row["Overall SCORE"]) || 0,
    tuition: "See university site",
    acceptance: "Varies",
    studentMix: row.Status || "QS ranked institution",
    size: row.Size,
    focus: row.Focus,
    research: row.Research,
    academicReputation: Number(row["AR SCORE"]) || 0,
    employerReputation: Number(row["ER SCORE"]) || 0,
    facultyStudent: Number(row["FSR SCORE"]) || 0,
    citationsPerFaculty: Number(row["CPF SCORE"]) || 0,
    internationalFaculty: Number(row["IFR SCORE"]) || 0,
    internationalStudents: Number(row["ISR SCORE"]) || 0,
    sustainability: Number(row["SUS SCORE"]) || 0,
    interests: [
      "All interests",
      row.Focus === "FO" ? "Specialist" : "Comprehensive",
      row.Research === "VH" ? "Research intensive" : "Teaching focused",
    ],
  }))
  .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(universities, null, 2)}\n`);

console.log(`Wrote ${universities.length} QS 2026 universities to ${outputFile}`);

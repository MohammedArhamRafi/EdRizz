import { getBackendMode, requestBackend } from "./backendClient.js";
import { FALLBACK_UNIVERSITY_SOURCES } from "./demoSeedData.js";
import { inferApplicationPlatform } from "./platformInference.js";

const QS_RANKINGS_URL = "/qs-rankings-2026.json";
let rankingsCache = null;

export const universityService = {
  async searchUniversities(query = "", filters = {}) {
    const normalizedQuery = normalize(query);
    const level = filters.degreeLevel || filters.level || "undergraduate";

    try {
      if (getBackendMode() === "api") {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.set(key, value);
        });
        const data = await requestBackend(`/universities/search?${params.toString()}`);
        return {
          results: (data.results || data || []).map((item) => normalizeBackendUniversity(item, level)),
          source: "backend",
          total: data.total || data.results?.length || data.length || 0,
        };
      }

      const rankings = await loadRankings();
      const enriched = rankings.map((row) => normalizeRankingUniversity(row, level));
      const fallback = FALLBACK_UNIVERSITY_SOURCES.map((item) => normalizeFallbackUniversity(item, level));
      const merged = mergeByName([...fallback, ...enriched]);
      const results = merged
        .filter((item) => matchesUniversitySearch(item, normalizedQuery, filters))
        .slice(0, 80);

      return {
        results,
        source: "local-rankings",
        total: results.length,
      };
    } catch (error) {
      const results = FALLBACK_UNIVERSITY_SOURCES
        .filter((item) => matchesUniversitySearch(item, normalizedQuery, filters))
        .map((item) => normalizeFallbackUniversity(item, level));
      return {
        results,
        source: "fallback",
        total: results.length,
        error: error.message,
      };
    }
  },
};

async function loadRankings() {
  if (rankingsCache) return rankingsCache;
  const response = await fetch(QS_RANKINGS_URL);
  if (!response.ok) throw new Error("Could not load university data source.");
  rankingsCache = await response.json();
  return rankingsCache;
}

function normalizeFallbackUniversity(item, level) {
  const platformInference = inferApplicationPlatform({
    universityName: item.name,
    country: item.country,
    regionOrState: item.region || item.state || item.province || item.city,
    degreeLevel: level,
    applicationType: item.applicationType,
    backendPlatform: item.platformConfidenceLevel === "Verified" ? item.platform : undefined,
    sourceConfidence: item.platformConfidenceLevel,
  });
  return {
    ...item,
    level,
    platform: platformInference.platform,
    platformConfidenceLevel: platformInference.confidenceLevel,
    platformSource: platformInference.source,
    platformReason: item.platformReason || platformInference.reason,
    platformAlternatives: item.platformAlternatives || platformInference.alternatives,
    dataSource: "demoFallback",
  };
}

function normalizeBackendUniversity(item, level) {
  const platformInference = inferApplicationPlatform({
    universityName: item.name,
    country: item.country,
    regionOrState: item.region || item.state || item.province,
    degreeLevel: level,
    applicationType: item.applicationType,
    backendPlatform: item.applicationPlatform || item.platform,
    sourceConfidence: item.platformConfidenceLevel || item.confidenceLevel,
  });
  return {
    key: item.id || slug(item.name),
    name: item.name,
    aliases: item.aliases || [item.name],
    country: item.country,
    city: item.city,
    region: item.region || item.state || item.province,
    rank: item.rank,
    website: item.website,
    admissionsUrl: item.admissionsUrl || item.website,
    programs: item.programs || [],
    defaultProgram: item.defaultProgram || item.programName || inferProgramName(item, level),
    level,
    platform: platformInference.platform,
    platformConfidenceLevel: platformInference.confidenceLevel,
    platformSource: platformInference.source,
    platformReason: platformInference.reason,
    platformAlternatives: platformInference.alternatives,
    confidenceLevel: item.confidenceLevel || "Verified",
    sourceName: item.sourceName || "Backend university data",
    sourceUrl: item.sourceUrl || item.admissionsUrl || item.website,
    notes: item.notes || "Loaded from the configured backend.",
    directEssays: item.directEssays || item.essays || [],
    dataSource: "backend",
  };
}

function normalizeRankingUniversity(row, level) {
  const country = normalizeCountry(row.country);
  const platformInference = inferApplicationPlatform({
    universityName: row.name,
    country,
    regionOrState: row.region || row.state || row.province || row.city,
    degreeLevel: level,
  });
  return {
    key: `qs-${slug(row.name)}`,
    name: row.name,
    aliases: [row.name],
    country,
    city: row.city || "",
    region: row.region,
    rank: row.rank,
    score: row.score || row.overallScore,
    website: row.website,
    admissionsUrl: row.website,
    programs: [],
    defaultProgram: inferProgramName(row, level),
    level,
    platform: platformInference.platform,
    platformConfidenceLevel: platformInference.confidenceLevel,
    platformSource: platformInference.source,
    platformReason: platformInference.reason,
    platformAlternatives: platformInference.alternatives,
    confidenceLevel: "AIExtracted",
    sourceName: "QS 2026 data source",
    sourceUrl: row.website || "",
    notes: "University search result from the project data source. Program-specific requirements need verification.",
    dataSource: "local-rankings",
  };
}

function inferProgramName(item, level) {
  const major = item.programName || item.major || "Computer Science";
  return level === "graduate" ? `${major} program` : `Undergraduate ${major}`;
}

function matchesUniversitySearch(item, query, filters) {
  const haystack = normalize([
    item.name,
    item.country,
    item.city,
    item.region,
    item.defaultProgram,
    item.platform,
    item.level,
    ...(item.programs || []),
  ].join(" "));

  const queryMatch = !query || haystack.includes(query);
  const countryMatch = !filters.country || normalize(item.country).includes(normalize(filters.country));
  const cityMatch = !filters.city || normalize(item.city).includes(normalize(filters.city));
  const programMatch = !filters.programName || normalize(item.defaultProgram).includes(normalize(filters.programName));
  const levelMatch = !filters.degreeLevel || normalize(item.level).includes(normalize(filters.degreeLevel));
  const platformMatch = !filters.platform || filters.platform === "Auto" || item.platform === filters.platform;
  const intakeMatch = !filters.intake || normalize(filters.intake).length > 0;
  return queryMatch && countryMatch && cityMatch && programMatch && levelMatch && platformMatch && intakeMatch;
}

function mergeByName(items) {
  const map = new Map();
  items.forEach((item) => {
    const key = normalize(item.name);
    const existing = map.get(key);
    map.set(key, existing ? { ...item, ...existing, rank: existing.rank || item.rank, score: existing.score || item.score } : item);
  });
  return [...map.values()];
}

function normalizeCountry(country = "") {
  if (country === "United States of America") return "United States";
  if (country === "UAE") return "UAE";
  return country;
}

function slug(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalize(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

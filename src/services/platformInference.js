const ONTARIO_UNIVERSITIES = [
  "university of toronto",
  "university of waterloo",
  "mcmaster university",
  "western university",
  "queen's university",
  "queens university",
  "york university",
  "university of ottawa",
  "toronto metropolitan university",
  "toronto met",
];

const US_COMMON_APP_UNIVERSITIES = [
  "harvard",
  "yale",
  "princeton",
  "stanford",
  "columbia",
  "brown",
  "cornell",
  "dartmouth",
  "university of pennsylvania",
  "duke",
  "northwestern",
  "university of chicago",
  "new york university",
  "nyu",
  "boston university",
  "northeastern",
  "university of southern california",
  "usc",
  "university of michigan",
  "university of virginia",
  "georgia institute of technology",
  "georgia tech",
  "case western",
  "emory",
  "vanderbilt",
];

const US_DIRECT_UNIVERSITIES = [
  "massachusetts institute of technology",
  "mit",
  "georgetown",
  "university of california",
  "uc berkeley",
  "ucla",
  "university of texas",
];

const NSW_ACT_UAC_UNIVERSITIES = [
  "university of sydney",
  "unsw",
  "university of new south wales",
  "university of technology sydney",
  "uts",
  "macquarie university",
  "australian national university",
  "anu",
];

const UAE_DIRECT_UNIVERSITIES = [
  "nyu abu dhabi",
  "khalifa university",
  "united arab emirates university",
  "uaeu",
  "american university of sharjah",
  "university of sharjah",
  "heriot watt dubai",
];

const SINGAPORE_DIRECT_UNIVERSITIES = [
  "national university of singapore",
  "nus",
  "nanyang technological university",
  "ntu",
  "singapore management university",
  "smu",
  "singapore university of technology and design",
  "sutd",
];

const EUROPEAN_COUNTRIES_WITH_UNREPRESENTED_SYSTEMS = [
  "france",
  "germany",
  "netherlands",
  "italy",
  "spain",
  "sweden",
  "norway",
  "denmark",
  "finland",
  "belgium",
  "switzerland",
  "austria",
  "ireland",
  "portugal",
  "poland",
  "czech republic",
];

export function inferApplicationPlatform({
  universityName = "",
  country = "",
  regionOrState = "",
  degreeLevel = "undergraduate",
  applicationType = "",
  backendPlatform,
  sourceConfidence,
} = {}) {
  const sourcePlatform = normalizePlatform(backendPlatform);
  if (sourcePlatform && sourcePlatform !== "Auto" && sourcePlatform !== "NeedsVerification") {
    return {
      platform: sourcePlatform,
      confidenceLevel: sourceConfidence || "Verified",
      source: "source",
      reason: "Verified from source.",
      alternatives: platformAlternatives(sourcePlatform),
    };
  }

  const name = normalize(universityName);
  const place = normalize(country);
  const region = normalize(regionOrState);
  const level = normalize(degreeLevel);
  const appType = normalize(applicationType);
  const undergraduate = level.includes("undergraduate") || level.includes("bachelor") || !level;
  const postgraduate = level.includes("graduate") || level.includes("postgraduate") || level.includes("master") || level.includes("phd");

  if (place.includes("united kingdom") || place === "uk") {
    if (undergraduate && !appType.includes("conservatoire")) {
      return platformResult("UCAS", "PlatformDefault", "UK undergraduate applications usually use UCAS.", ["DirectPortal", "NeedsVerification"]);
    }
    if (postgraduate) {
      return platformResult("DirectPortal", "PlatformDefault", "UK postgraduate applications usually apply directly through the university.", ["NeedsVerification"]);
    }
    return uncertain("Specialist UK application routes need confirmation.", ["UCAS", "DirectPortal"]);
  }

  if (place.includes("united states") || place === "usa" || place === "us") {
    if (matchesAny(name, US_DIRECT_UNIVERSITIES)) {
      return platformResult("DirectPortal", "PlatformDefault", "This US university is commonly associated with its own application route.", ["CommonApp", "Coalition", "NeedsVerification"]);
    }
    if (matchesAny(name, US_COMMON_APP_UNIVERSITIES)) {
      return platformResult("CommonApp", "PlatformDefault", "This US university commonly accepts the Common App; verify direct or Coalition options if relevant.", ["Coalition", "DirectPortal", "NeedsVerification"]);
    }
    return uncertain("US universities may use Common App, Coalition, or direct portals depending on the institution.", ["CommonApp", "Coalition", "DirectPortal"]);
  }

  if (place.includes("canada")) {
    if (region.includes("ontario") || matchesAny(name, ONTARIO_UNIVERSITIES)) {
      return platformResult("OUAC", "PlatformDefault", "Ontario undergraduate applications usually use OUAC.", ["DirectPortal", "NeedsVerification"]);
    }
    if (region) {
      return platformResult("DirectPortal", "PlatformDefault", "Canadian universities outside Ontario usually use direct university portals unless source data says otherwise.", ["NeedsVerification"]);
    }
    return uncertain("Canadian province is unknown, so the application platform needs confirmation.", ["DirectPortal", "OUAC"]);
  }

  if (place.includes("australia")) {
    if (region.includes("new south wales") || region.includes("act") || region.includes("australian capital territory") || matchesAny(name, NSW_ACT_UAC_UNIVERSITIES)) {
      return platformResult("UAC", "PlatformDefault", "NSW and ACT undergraduate applications often use UAC.", ["DirectPortal", "NeedsVerification"]);
    }
    return uncertain("This Australian admissions centre may not be represented in EdRizz yet.", ["DirectPortal", "Other"]);
  }

  if (place.includes("new zealand")) {
    return platformResult("DirectPortal", "PlatformDefault", "New Zealand universities usually use direct application portals; StudyLink is not the university application platform.", ["NeedsVerification"]);
  }

  if (place.includes("united arab emirates") || place.includes("uae") || place.includes("emirates") || matchesAny(name, UAE_DIRECT_UNIVERSITIES)) {
    return platformResult("DirectPortal", "PlatformDefault", "UAE university applications usually use direct university portals unless source data says otherwise.", ["CommonApp", "NeedsVerification"]);
  }

  if (place.includes("singapore") || matchesAny(name, SINGAPORE_DIRECT_UNIVERSITIES)) {
    return platformResult("DirectPortal", "PlatformDefault", "Singapore universities usually use direct application portals.", ["NeedsVerification"]);
  }

  if (EUROPEAN_COUNTRIES_WITH_UNREPRESENTED_SYSTEMS.some((countryName) => place.includes(countryName))) {
    return uncertain("This country may use a national or university-specific platform that needs confirmation.", ["DirectPortal", "Other"]);
  }

  return uncertain("Application platform could not be confidently inferred.", ["DirectPortal", "Other"]);
}

function platformResult(platform, confidenceLevel, reason, alternatives) {
  return {
    platform,
    confidenceLevel,
    source: "inferred",
    reason,
    alternatives,
  };
}

function uncertain(reason, alternatives) {
  return {
    platform: "NeedsVerification",
    confidenceLevel: "NeedsVerification",
    source: "uncertain",
    reason: reason || "Application platform could not be confidently inferred.",
    alternatives,
  };
}

function platformAlternatives(platform) {
  const defaults = {
    UCAS: ["DirectPortal", "NeedsVerification"],
    CommonApp: ["Coalition", "DirectPortal", "NeedsVerification"],
    OUAC: ["DirectPortal", "NeedsVerification"],
    DirectPortal: ["NeedsVerification"],
    UAC: ["DirectPortal", "NeedsVerification"],
  };
  return defaults[platform] || ["DirectPortal", "NeedsVerification"];
}

function matchesAny(value, candidates) {
  return candidates.some((candidate) => value.includes(normalize(candidate)));
}

function normalizePlatform(platform) {
  const value = String(platform || "").replace(/\s+/g, "");
  const aliases = {
    CommonApplication: "CommonApp",
    CommonApp: "CommonApp",
    Direct: "DirectPortal",
    DirectPortal: "DirectPortal",
    DirectUniversityPortal: "DirectPortal",
    NeedsVerification: "NeedsVerification",
    Needsverification: "NeedsVerification",
  };
  return aliases[value] || value;
}

function normalize(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

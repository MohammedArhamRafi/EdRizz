/**
 * QS World University Rankings Data Loader
 * Loads and processes CSV data from QS rankings files
 */

// File mappings for QS rankings - URL encoded for spaces
const QS_FILES = {
    2024: 'data/2024%20QS%20World%20University%20Rankings%201.2%20(For%20qs.com).xlsx%20-%20PUBLISHED.csv',
    2025: 'data/2025%20QS%20World%20University%20Rankings%202.2%20(For%20qs.com).xlsx%20-%20PUBLISHED.csv',
    2026: 'data/2026%20QS%20World%20University%20Rankings%201.3%20(For%20qs.com).xlsx%20-%20Sheet1.csv'
};

// Subject-specific rankings
const QS_SUBJECT_FILES = {
    2024: {
        'arts': 'data/2024%20QS%20WUR%20by%20Subject%20-%20Public%20Results%20(for%20qs.com)%20(1)_42.xlsx%20-%20Arts%20%26%20Humanities.csv',
        'engineering': 'data/2024%20QS%20WUR%20by%20Subject%20-%20Public%20Results%20(for%20qs.com)%20(1)_42.xlsx%20-%20Engineering%20%26%20Technology.csv',
        'medicine': 'data/2024%20QS%20WUR%20by%20Subject%20-%20Public%20Results%20(for%20qs.com)%20(1)_42.xlsx%20-%20Life%20Sciences%20%26%20Medicine.csv',
        'sciences': 'data/2024%20QS%20WUR%20by%20Subject%20-%20Public%20Results%20(for%20qs.com)%20(1)_42.xlsx%20-%20Natural%20Sciences.csv'
    },
    2025: {
        'arts': 'data/2025%20QS%20WUR%20by%20Subject%20-%20Public%20Results%20V1.1.2%20(for%20qs.com)%202_6.xlsx%20-%20Arts%20%26%20Humanities.csv',
        'engineering': 'data/2025%20QS%20WUR%20by%20Subject%20-%20Public%20Results%20V1.1.2%20(for%20qs.com)%202_6.xlsx%20-%20Engineering%20%26%20Technology.csv',
        'medicine': 'data/2025%20QS%20WUR%20by%20Subject%20-%20Public%20Results%20V1.1.2%20(for%20qs.com)%202_6.xlsx%20-%20Life%20Sciences%20%26%20Medicine.csv',
        'sciences': 'data/2025%20QS%20WUR%20by%20Subject%20-%20Public%20Results%20V1.1.2%20(for%20qs.com)%202_6.xlsx%20-%20Natural%20Sciences.csv'
    },
    2026: {} // No subject rankings for 2026 yet
};

/**
 * Parse CSV text to array of objects
 * Handles quoted fields with commas
 */
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    
    // Find the header row - look for specific column names
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const lowerLine = lines[i].toLowerCase();
        // Look for rows that have multiple key columns
        const hasRank = lowerLine.includes('rank');
        const hasName = lowerLine.includes('name') || lowerLine.includes('institution');
        const hasCountry = lowerLine.includes('country') || lowerLine.includes('location');
        const hasScore = lowerLine.includes('score');
        
        if (hasRank && hasName && (hasCountry || hasScore)) {
            headerRowIndex = i;
            console.log(`Found header row at line ${i}: ${lines[i].substring(0, 100)}`);
            break;
        }
    }
    
    if (headerRowIndex === -1) {
        console.error('Could not find header row in CSV');
        console.log('First 10 lines:', lines.slice(0, 10));
        return [];
    }
    
    // Parse CSV line handling quoted fields
    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }
    
    const headers = parseCSVLine(lines[headerRowIndex]);
    const data = [];
    
    console.log('CSV Headers:', headers);
    
    // Start from the row after headers
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = parseCSVLine(lines[i]);
        const row = {};
        
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        
        // Only include rows with valid rank and institution name
        const rankField = row['Rank'] || row['RANK'] || row['rank display'];
        const nameField = row['Name'] || row['Institution'] || row['institution'];
        
        // Skip if rank or name is empty or is a header value
        if (!rankField || !nameField || rankField === 'Rank' || rankField === 'RANK' || nameField === 'Name' || nameField === 'Institution') {
            continue;
        }
        
        data.push(row);
    }
    
    console.log(`Parsed ${data.length} rows from CSV`);
    if (data.length > 0) {
        console.log('Sample row:', data[0]);
    }
    return data;
}

/**
 * Load QS rankings data for a specific year
 */
async function loadRankingsForYear(year) {
    try {
        const filePath = QS_FILES[year];
        console.log(`Attempting to load year ${year} from: ${filePath}`);
        
        if (!filePath) {
            console.error(`No file mapping for year ${year}`);
            return [];
        }
        
        const response = await fetch(filePath);
        console.log(`Fetch response for ${year}:`, response.status, response.statusText);
        
        if (!response.ok) {
            console.error(`Failed to fetch ${year}: ${response.status} ${response.statusText}`);
            throw new Error(`Failed to load rankings for ${year}: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log(`Loaded CSV text for ${year}, length: ${csvText.length} characters`);
        
        const data = parseCSV(csvText);
        console.log(`Parsed ${data.length} universities for year ${year}`);
        
        if (data.length === 0) {
            console.warn(`No data parsed for year ${year}`);
            return [];
        }
        
        // Transform to standardized format
        const transformed = data.map(row => {
            // Handle different column name variations
            const rank = row['Rank'] || row['RANK'] || row['rank display'];
            const prevRank = row['Previous Rank'] || row['rank display2'] || '';
            const name = row['Name'] || row['Institution'] || row['institution'];
            
            // Country field varies by year:
            // 2024: location code (e.g., "US") or location (e.g., "United States")
            // 2025: location code (e.g., "United States") - NOT the "location" field which is region
            // 2026: Country/Territory (e.g., "United States of America")
            let country = row['Country/Territory'] || row['location code'] || row['Location'] || row['location'];
            
            // If country is a region (Americas, Europe, etc.), try to get from location code
            if (country && (country === 'Americas' || country === 'Europe' || country === 'Asia' || country === 'Africa' || country === 'Oceania')) {
                country = row['location code'] || country;
            }
            
            return {
                rank: rank,
                previousRank: prevRank,
                name: name,
                country: country,
                overallScore: parseFloat(row['Overall SCORE'] || row['Overall Score'] || 0),
                academicReputation: parseFloat(row['AR SCORE'] || row['ar score'] || 0),
                employerReputation: parseFloat(row['ER SCORE'] || row['er score'] || 0),
                facultyStudent: parseFloat(row['FSR SCORE'] || row['fsr score'] || 0),
                citationsPerFaculty: parseFloat(row['CPF SCORE'] || row['cpf score'] || 0),
                internationalFaculty: parseFloat(row['IFR SCORE'] || row['ifr score'] || 0),
                internationalStudents: parseFloat(row['ISR SCORE'] || row['isr score'] || 0),
                size: row['Size'] || row['size'] || 'N/A',
                focus: row['Focus'] || row['focus'] || 'N/A',
                research: row['Research'] || row['research'] || 'N/A',
                year: year
            };
        });
        
        console.log(`Transformed ${transformed.length} universities for year ${year}`);
        console.log('Sample university:', transformed[0]);
        
        return transformed;
    } catch (error) {
        console.error(`Error loading rankings for ${year}:`, error);
        console.error('Error stack:', error.stack);
        return [];
    }
}

/**
 * Load all available QS rankings data
 */
async function loadAllRankings() {
    const years = [2024, 2025, 2026];
    const rankings = {};
    
    for (const year of years) {
        rankings[year] = await loadRankingsForYear(year);
    }
    
    return rankings;
}

/**
 * Get ranking trend for a specific university
 */
function getUniversityTrend(universityName, allRankings) {
    const trend = [];
    
    for (const year in allRankings) {
        const university = allRankings[year].find(
            u => u.name.toLowerCase().includes(universityName.toLowerCase())
        );
        
        if (university) {
            trend.push({
                year: parseInt(year),
                rank: university.rank,
                score: university.overallScore || university.score || 0,
                previousRank: university.previousRank
            });
        }
    }
    
    return trend.sort((a, b) => a.year - b.year);
}

/**
 * Calculate ranking change
 */
function getRankingChange(currentRank, previousRank) {
    if (!previousRank || previousRank === '=' || previousRank === '-') {
        return { change: 0, direction: 'same', text: 'New' };
    }
    
    const current = parseInt(currentRank);
    const previous = parseInt(previousRank);
    
    if (isNaN(current) || isNaN(previous)) {
        return { change: 0, direction: 'same', text: '-' };
    }
    
    const change = previous - current; // Positive means improved (lower rank number)
    
    if (change > 0) {
        return { change, direction: 'up', text: `↑ ${change}` };
    } else if (change < 0) {
        return { change: Math.abs(change), direction: 'down', text: `↓ ${Math.abs(change)}` };
    } else {
        return { change: 0, direction: 'same', text: '=' };
    }
}

/**
 * Filter universities by country
 */
function filterByCountry(rankings, country) {
    if (!country) return rankings;
    
    const searchCountry = country.toLowerCase();
    
    return rankings.filter(u => {
        const uCountry = (u.country || '').toLowerCase();
        // Match full country name or partial match
        return uCountry.includes(searchCountry) || searchCountry.includes(uCountry);
    });
}

/**
 * Filter universities by ranking range
 */
function filterByRankingRange(rankings, range) {
    if (!range) return rankings;
    
    const ranges = {
        'top10': [1, 10],
        'top50': [1, 50],
        'top100': [1, 100],
        'top200': [1, 200],
        'top500': [1, 500]
    };
    
    const [min, max] = ranges[range] || [1, 10000];
    
    return rankings.filter(u => {
        const rank = parseInt(u.rank);
        return rank >= min && rank <= max;
    });
}

/**
 * Search universities by name
 */
function searchUniversities(rankings, searchTerm) {
    if (!searchTerm) return rankings;
    
    const term = searchTerm.toLowerCase();
    return rankings.filter(
        u => u.name.toLowerCase().includes(term) ||
             u.country.toLowerCase().includes(term)
    );
}

/**
 * Get top N universities
 */
function getTopUniversities(rankings, n = 10) {
    return rankings.slice(0, n);
}

/**
 * Compare two universities across years
 */
function compareUniversities(uni1, uni2, allRankings) {
    return {
        university1: {
            name: uni1,
            trend: getUniversityTrend(uni1, allRankings)
        },
        university2: {
            name: uni2,
            trend: getUniversityTrend(uni2, allRankings)
        }
    };
}


/**
 * Load subject-specific rankings for a year and major
 */
async function loadSubjectRankings(year, major) {
    try {
        const subjectFiles = QS_SUBJECT_FILES[year];
        if (!subjectFiles || !subjectFiles[major]) {
            console.log(`No subject rankings available for ${major} in ${year}`);
            return [];
        }
        
        const filePath = subjectFiles[major];
        console.log(`Loading subject rankings: ${year} - ${major} from ${filePath}`);
        
        const response = await fetch(filePath);
        if (!response.ok) {
            console.error(`Failed to fetch subject rankings: ${response.status}`);
            return [];
        }
        
        const csvText = await response.text();
        const lines = csvText.split('\n');
        
        // Find header row (contains "Institution" and "Score")
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(20, lines.length); i++) {
            const lowerLine = lines[i].toLowerCase();
            // Look for row with Institution, Score, and either Country or Location
            if (lowerLine.includes('institution') && 
                lowerLine.includes('score') && 
                (lowerLine.includes('country') || lowerLine.includes('location'))) {
                headerRowIndex = i;
                console.log(`Found subject header at line ${i}: ${lines[i].substring(0, 100)}`);
                break;
            }
        }
        
        if (headerRowIndex === -1) {
            console.error('Could not find header row in subject CSV');
            return [];
        }
        
        // Parse CSV line handling quoted fields
        function parseCSVLine(line) {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        }
        
        const headers = parseCSVLine(lines[headerRowIndex]);
        const data = [];
        
        console.log('Subject CSV Headers:', headers);
        
        // Parse data rows
        for (let i = headerRowIndex + 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const values = parseCSVLine(lines[i]);
            const row = {};
            
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            
            // Get rank and institution
            const rank = row['2024'] || row['2025'] || row['2026'] || '';
            const institution = row['Institution'] || '';
            const country = row['Country / Territory'] || row['Location'] || '';
            
            if (rank && institution && rank !== '2024' && rank !== '2025' && rank !== '2026') {
                data.push({
                    rank: rank.trim(),
                    name: institution.trim(),
                    country: country.trim(),
                    score: parseFloat(row['Score']) || 0,
                    academic: parseFloat(row['Academic']) || 0,
                    employer: parseFloat(row['Employer']) || 0,
                    citations: parseFloat(row['Citations']) || 0,
                    year: year,
                    major: major
                });
            }
        }
        
        console.log(`Loaded ${data.length} subject rankings for ${major} in ${year}`);
        return data;
        
    } catch (error) {
        console.error(`Error loading subject rankings for ${major} in ${year}:`, error);
        return [];
    }
}

/**
 * Load all rankings including subject-specific ones
 */
async function loadAllRankingsWithSubjects() {
    const years = [2024, 2025, 2026];
    const rankings = {};
    
    for (const year of years) {
        rankings[year] = await loadRankingsForYear(year);
    }
    
    return rankings;
}

/**
 * Load entry requirements data
 */
let entryRequirementsCache = null;

async function loadEntryRequirements() {
    // Return cached data if already loaded
    if (entryRequirementsCache) {
        return entryRequirementsCache;
    }
    
    try {
        const response = await fetch('data/qs_indicative_entry_requirements.csv');
        if (!response.ok) {
            console.error('Failed to load entry requirements');
            return {};
        }
        
        const csvText = await response.text();
        const lines = csvText.split('\n');
        
        // Parse CSV line handling quoted fields
        function parseCSVLine(line) {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        }
        
        // First line is header
        const headers = parseCSVLine(lines[0]);
        const requirementsMap = {};
        
        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const values = parseCSVLine(lines[i]);
            const row = {};
            
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            
            const institution = row['institution']?.trim();
            const subjectArea = row['subject_area']?.trim();
            
            if (institution && subjectArea) {
                // Create a key combining institution and subject
                const key = `${institution.toLowerCase()}|${subjectArea.toLowerCase()}`;
                
                // Only store if this entry has higher IB recommended score than existing
                const newIB = parseInt(row['ib_recommended']) || 0;
                
                if (!requirementsMap[key] || newIB > (parseInt(requirementsMap[key].ibRecommended) || 0)) {
                    requirementsMap[key] = {
                        institution: institution,
                        country: row['country'],
                        subjectArea: subjectArea,
                        ibMin: row['ib_min'],
                        ibRecommended: row['ib_recommended'],
                        aLevels: row['a_levels'],
                        satRecommended: row['sat_recommended'],
                        actRecommended: row['act_recommended'],
                        additionalTests: row['additional_tests']
                    };
                }
            }
        }
        
        entryRequirementsCache = requirementsMap;
        console.log(`Loaded ${Object.keys(requirementsMap).length} entry requirement records`);
        return requirementsMap;
        
    } catch (error) {
        console.error('Error loading entry requirements:', error);
        return {};
    }
}

/**
 * Get entry requirements for a specific university and subject
 */
async function getEntryRequirements(universityName, subjectArea = 'Engineering & Technology') {
    const requirements = await loadEntryRequirements();
    
    // Try exact match first
    const key = `${universityName.toLowerCase()}|${subjectArea.toLowerCase()}`;
    if (requirements[key]) {
        return requirements[key];
    }
    
    // Try partial match on university name - collect all matches
    const matches = [];
    for (const [reqKey, reqData] of Object.entries(requirements)) {
        const [instName, subject] = reqKey.split('|');
        if (instName.includes(universityName.toLowerCase()) && subject === subjectArea.toLowerCase()) {
            matches.push(reqData);
        }
    }
    
    // If we have matches, return the one with highest recommended IB score
    if (matches.length > 0) {
        matches.sort((a, b) => {
            const ibA = parseInt(a.ibRecommended) || 0;
            const ibB = parseInt(b.ibRecommended) || 0;
            return ibB - ibA; // Descending order
        });
        return matches[0];
    }
    
    // Try just university name match (any subject) - also prioritize highest scores
    const anySubjectMatches = [];
    for (const [reqKey, reqData] of Object.entries(requirements)) {
        const [instName] = reqKey.split('|');
        if (instName.includes(universityName.toLowerCase())) {
            anySubjectMatches.push(reqData);
        }
    }
    
    if (anySubjectMatches.length > 0) {
        anySubjectMatches.sort((a, b) => {
            const ibA = parseInt(a.ibRecommended) || 0;
            const ibB = parseInt(b.ibRecommended) || 0;
            return ibB - ibA;
        });
        return anySubjectMatches[0];
    }
    
    return null;
}

/**
 * Estimate entry requirements based on QS ranking
 */
function estimateEntryRequirements(rank, subjectArea = 'Engineering & Technology') {
    const rankNum = parseInt(rank);
    
    if (isNaN(rankNum)) {
        return null;
    }
    
    // Estimate based on ranking tiers
    if (rankNum <= 10) {
        // Top 10 universities
        return {
            institution: 'Estimated',
            subjectArea: subjectArea,
            ibMin: '38',
            ibRecommended: '40',
            aLevels: 'A*A*A',
            satRecommended: '1500+',
            actRecommended: '33+',
            additionalTests: '',
            isEstimated: true
        };
    } else if (rankNum <= 50) {
        // Top 50 universities
        return {
            institution: 'Estimated',
            subjectArea: subjectArea,
            ibMin: '34',
            ibRecommended: '38',
            aLevels: 'A*AA',
            satRecommended: '1400+',
            actRecommended: '30+',
            additionalTests: '',
            isEstimated: true
        };
    } else if (rankNum <= 100) {
        // Top 100 universities
        return {
            institution: 'Estimated',
            subjectArea: subjectArea,
            ibMin: '32',
            ibRecommended: '36',
            aLevels: 'AAA',
            satRecommended: '1300+',
            actRecommended: '27+',
            additionalTests: '',
            isEstimated: true
        };
    } else if (rankNum <= 200) {
        // Top 200 universities
        return {
            institution: 'Estimated',
            subjectArea: subjectArea,
            ibMin: '30',
            ibRecommended: '34',
            aLevels: 'ABB',
            satRecommended: '1250+',
            actRecommended: '26+',
            additionalTests: '',
            isEstimated: true
        };
    } else {
        // Below 200
        return {
            institution: 'Estimated',
            subjectArea: subjectArea,
            ibMin: '28',
            ibRecommended: '32',
            aLevels: 'BBB',
            satRecommended: '1200+',
            actRecommended: '25+',
            additionalTests: '',
            isEstimated: true
        };
    }
}

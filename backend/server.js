// backend/server.js

// Import necessary modules using ES Module syntax
import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Pool setup
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    client.query('SELECT NOW()', (err, result) => {
        release();
        if (err) {
            return console.error('Error executing query', err.stack);
        }
        console.log('Successfully connected to PostgreSQL:', result.rows[0].now);
    });
});

// AbuseIPDB API Key
const ABUSEIPDB_API_KEY = process.env.ABUSEIPDB_API_KEY;

/**
 * Fetches threat intelligence from AbuseIPDB.
 * Implements basic rate limit handling for AbuseIPDB's free tier.
 * @param {string} ip The IP address to query.
 * @returns {Promise<object | null>} Threat data from AbuseIPDB, or null if error/no data.
 */
async function fetchAbuseIPDBThreatIntelligence(ip) {
    if (!ABUSEIPDB_API_KEY) {
        console.warn('ABUSEIPDB_API_KEY is not set in .env. Skipping AbuseIPDB lookup.');
        return null;
    }

    try {
        const abuseIpDbUrl = `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90&verbose`;
        const abuseIpDbResponse = await fetch(abuseIpDbUrl, {
            method: 'GET',
            headers: {
                'Key': ABUSEIPDB_API_KEY,
                'Accept': 'application/json'
            }
        });

        if (abuseIpDbResponse.status === 429) {
            const retryAfter = abuseIpDbResponse.headers.get('Retry-After') || '60';
            const waitTime = (parseInt(retryAfter) + 5) * 1000;
            console.warn(`AbuseIPDB Rate Limit Exceeded for ${ip}. Retrying in ${waitTime / 1000} seconds.`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return fetchAbuseIPDBThreatIntelligence(ip); // Retry
        }

        if (!abuseIpDbResponse.ok) {
            const errorText = await abuseIpDbResponse.text();
            console.error(`AbuseIPDB API error for ${ip}: ${abuseIpDbResponse.status} ${abuseIpDbResponse.statusText} - ${errorText}`);
            return null;
        }

        const abuseIpDbData = await abuseIpDbResponse.json();
        const abuseData = abuseIpDbData.data;

        if (abuseData) {
            // Ensure reports and categories are handled safely at the source
            const categories = (abuseData.reports && Array.isArray(abuseData.reports))
                               ? abuseData.reports
                                   .map(r => r.categories)
                                   .flat()
                                   .filter(cat => cat && typeof cat.categoryName === 'string') // Filter out non-objects or objects without categoryName string
                                   .map(cat => cat.categoryName)
                               : [];

            return {
                source: 'AbuseIPDB',
                abuseConfidenceScore: abuseData.abuseConfidenceScore,
                totalReports: abuseData.totalReports,
                categories: categories, // Pass the safely derived categories
                lastReportedAt: abuseData.lastReportedAt,
                isWhitelisted: abuseData.isWhitelisted
            };
        }
        return null; // No data found for this IP in AbuseIPDB
    } catch (error) {
        console.error(`Error fetching AbuseIPDB intelligence for ${ip}:`, error);
        return null;
    }
}

/**
 * Fetches geographical and ISP data from ip-api.com.
 * @param {string} ip The IP address to query.
 * @returns {Promise<object | null>} Geo-IP data from ip-api.com, or null if error/no data.
 */
async function fetchGeoIpData(ip) {
    try {
        const ipApiUrl = `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query,proxy,hosting`;
        const geoResponse = await fetch(ipApiUrl);
        const geoIpData = await geoResponse.json();
        return geoIpData;
    } catch (error) {
        console.error(`Error fetching geo-IP data for ${ip}:`, error);
        return null;
    }
}


/**
 * Derives the full IPAnalysisResult object from raw ip-api.com data and actual threat data.
 * This function now uses real data from AbuseIPDB for threat assessment.
 * @param {string} ip The IP address being analyzed.
 * @param {object} geoIpData The raw geo-IP data (from ip-api.com or cache).
 * @param {object | null} abuseIpDbData The actual threat data from AbuseIPDB, or null if not available.
 * @returns {IPAnalysisResult} The complete IP analysis result object.
 */
const deriveIPAnalysisResult = (ip, geoIpData, abuseIpDbData) => {
    let status = 'safe';
    let threatLevel = 'low';
    let threatType = 'none';
    let confidence = 0; // Will be directly from AbuseIPDB's score
    let reputation = 100; // Will be derived from AbuseIPDB's score

    const details = {
        malware: false,
        phishing: false,
        spam: false,
        botnet: false,
        proxy: geoIpData.proxy || false, // From ip-api.com
        tor: geoIpData.query === 'Tor', // From ip-api.com
        categories: [] // Initialize categories as an empty array
    };

    // 1. Handle ip-api.com status (for basic geo-IP errors)
    if (geoIpData.status === 'fail') {
        status = 'error';
        threatLevel = 'unknown';
        threatType = geoIpData.message || 'Geo-IP API Error';
        confidence = 0;
        reputation = 0;
    } else {
        // 2. Prioritize AbuseIPDB data for realistic threat assessment
        if (abuseIpDbData) {
            confidence = abuseIpDbData.abuseConfidenceScore || 0;
            reputation = 100 - confidence; // Simple inverse mapping: higher confidence = lower reputation

            if (abuseIpDbData.isWhitelisted) {
                status = 'safe';
                threatLevel = 'low';
                threatType = 'whitelisted';
                confidence = 0;
                reputation = 100;
            } else if (confidence >= 90) {
                status = 'malicious';
                threatLevel = 'critical';
            } else if (confidence >= 70) {
                status = 'malicious';
                threatLevel = 'high';
            } else if (confidence >= 40) {
                status = 'suspicious';
                threatLevel = 'medium';
            } else if (confidence > 0) { // Any confidence score > 0 indicates some level of report
                status = 'suspicious';
                threatLevel = 'low';
            }

            // Store AbuseIPDB categories in details for caching and potential future use
            // Ensure categories from abuseIpDbData is an array
            if (abuseIpDbData.categories && Array.isArray(abuseIpDbData.categories)) {
                details.categories = abuseIpDbData.categories;
            }

            // Derive threatType from AbuseIPDB categories (most specific first)
            // Ensure details.categories is an array with length > 0 before processing
            if (details.categories.length > 0) {
                const categories = details.categories
                                   .filter(c => typeof c === 'string') // Filter out any non-string elements
                                   .map(c => c.toLowerCase());

                if (categories.includes('malware')) {
                    threatType = 'malware';
                    details.malware = true;
                } else if (categories.includes('phishing')) {
                    threatType = 'phishing';
                    details.phishing = true;
                } else if (categories.includes('spam')) {
                    threatType = 'spam';
                    details.spam = true;
                } else if (categories.includes('botnet')) {
                    threatType = 'botnet';
                    details.botnet = true;
                } else if (categories.includes('proxy')) {
                    threatType = 'proxy';
                    details.proxy = true;
                } else if (categories.includes('tor exit node')) {
                    threatType = 'tor';
                    details.tor = true;
                } else {
                    // Fallback for other reported categories if no specific mapping
                    // Ensure categories[0] exists before calling toLowerCase and replace
                    threatType = categories[0] ? categories[0].replace(/\s/g, '_') : 'unknown_category';
                }
            } else if (confidence > 0 && threatType === 'none') {
                // If confidence > 0 but no specific category, mark as generic suspicious
                threatType = 'generic_suspicious';
            }

            // Update lastSeen from AbuseIPDB if available
            if (abuseIpDbData.lastReportedAt) {
                details.lastSeen = new Date(abuseIpDbData.lastReportedAt).toISOString();
            }

        } else {
            // 3. Fallback if AbuseIPDB data is not available (e.g., API key missing, error, or no reports)
            // Still use ip-api.com proxy/hosting flags for basic suspicious check
            if (geoIpData.proxy || geoIpData.hosting) {
                status = 'suspicious';
                threatLevel = 'medium';
                threatType = geoIpData.proxy ? 'proxy' : 'hosting';
                confidence = 50; // Lower confidence as it's a less direct indicator
                reputation = 50;
            }
            // If no TI data and no ip-api.com flags, it remains 'safe' with default values
        }
    }


    return {
        ip: ip,
        status: status,
        threatLevel: threatLevel,
        threatType: threatType,
        location: `${geoIpData.city || 'Unknown'}, ${geoIpData.country || 'Unknown'}`,
        isp: geoIpData.isp || 'Unknown',
        confidence: confidence,
        details: details, // Use the updated details object
        lastSeen: details.lastSeen || (geoIpData.query_time ? new Date(geoIpData.query_time).toISOString() : new Date().toISOString()),
        reputation: reputation
    };
};

// API Endpoint for IP analysis
app.post('/api/analyze-ips', async (req, res) => {
    const { ipAddresses } = req.body;

    if (!ipAddresses || !Array.isArray(ipAddresses) || ipAddresses.length === 0) {
        return res.status(400).json({ error: 'Please provide an array of IP addresses.' });
    }

    const results = [];

    for (const ip of ipAddresses) {
        try {
            let cachedData = null;
            let geoIpData = null;
            let abuseIpDbData = null;

            // 1. Check the single cache table for ALL data
            const cacheResult = await pool.query(
                `SELECT ip_address, country, region, city, isp, org, timezone, lat, lon, query_time,
                        status, threat_level, threat_type, confidence, details, last_seen, reputation, threat_cached_at
                 FROM ip_cache WHERE ip_address = $1`,
                [ip]
            );

            const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
            let shouldFetchGeoIp = true;
            let shouldFetchThreat = true;

            if (cacheResult.rows.length > 0) {
                cachedData = cacheResult.rows[0];
                console.log(`IP ${ip} found in cache.`);

                // Reconstruct geoIpData from cache for deriveIPAnalysisResult
                geoIpData = {
                    status: 'success', // Assume success if geo-IP was cached
                    country: cachedData.country,
                    regionName: cachedData.region,
                    city: cachedData.city,
                    isp: cachedData.isp,
                    org: cachedData.org,
                    timezone: cachedData.timezone,
                    lat: cachedData.lat,
                    lon: cachedData.lon,
                    // Reconstruct ip-api.com specific fields for deriveIPAnalysisResult
                    proxy: cachedData.details ? cachedData.details.proxy : false,
                    hosting: false, // ip-api.com hosting not directly cached, might need to re-derive or store
                    query: cachedData.details ? (cachedData.details.tor ? 'Tor' : ip) : ip, // Reconstruct query for Tor check
                    query_time: cachedData.query_time
                };
                shouldFetchGeoIp = false; // Geo-IP data is in cache

                // Check freshness of threat data
                const threatCacheAgeMs = Date.now() - new Date(cachedData.threat_cached_at || 0).getTime();
                if (cachedData.threat_cached_at && threatCacheAgeMs < TWENTY_FOUR_HOURS_MS) {
                    // Threat data is fresh, use it
                    abuseIpDbData = {
                        source: 'Cached',
                        abuseConfidenceScore: cachedData.confidence,
                        categories: cachedData.details ? cachedData.details.categories : [], // Ensure this is an array
                        lastReportedAt: cachedData.last_seen,
                        isWhitelisted: cachedData.threat_type === 'whitelisted' // Reconstruct from threat_type
                    };
                    shouldFetchThreat = false; // Threat data is fresh in cache
                }
            }

            // Fetch missing or stale data
            if (shouldFetchGeoIp) {
                console.log(`IP ${ip} geo-IP data not in cache, fetching from ip-api.com...`);
                geoIpData = await fetchGeoIpData(ip);
                if (!geoIpData || geoIpData.status === 'fail') {
                    console.error(`ip-api.com failed for ${ip}: ${geoIpData ? geoIpData.message : 'Unknown error'}`);
                    results.push({
                        ip,
                        status: 'error',
                        threatLevel: 'unknown',
                        threatType: geoIpData ? geoIpData.message || 'Geo-IP API error' : 'Geo-IP API error',
                        location: 'Unknown',
                        isp: 'Unknown',
                        confidence: 0,
                        details: { malware: false, phishing: false, spam: false, botnet: false, proxy: false, tor: false },
                        lastSeen: null,
                        reputation: 0
                    });
                    continue; // Skip further processing for this IP if geo-IP failed
                }
            }

            if (shouldFetchThreat) {
                console.log(`IP ${ip} threat data not in cache or stale, fetching AbuseIPDB...`);
                abuseIpDbData = await fetchAbuseIPDBThreatIntelligence(ip);
            }

            // Derive final IPAnalysisResult
            const analysisResult = deriveIPAnalysisResult(ip, geoIpData, abuseIpDbData);
            results.push(analysisResult);

            // Store or update combined data in the single cache table
            await pool.query(
                `INSERT INTO ip_cache (ip_address, country, region, city, isp, org, timezone, lat, lon,
                                        status, threat_level, threat_type, confidence, details, last_seen, reputation)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                 ON CONFLICT (ip_address) DO UPDATE SET
                    country = EXCLUDED.country,
                    region = EXCLUDED.region,
                    city = EXCLUDED.city,
                    isp = EXCLUDED.isp,
                    org = EXCLUDED.org,
                    timezone = EXCLUDED.timezone,
                    lat = EXCLUDED.lat,
                    lon = EXCLUDED.lon,
                    query_time = CURRENT_TIMESTAMP, -- Update geo-IP timestamp on any update
                    status = EXCLUDED.status,
                    threat_level = EXCLUDED.threat_level,
                    threat_type = EXCLUDED.threat_type,
                    confidence = EXCLUDED.confidence,
                    details = EXCLUDED.details,
                    last_seen = EXCLUDED.last_seen,
                    reputation = EXCLUDED.reputation,
                    threat_cached_at = CURRENT_TIMESTAMP`, //-- Always update threat_cached_at on update
                [
                    ip,
                    geoIpData.country,
                    geoIpData.regionName,
                    geoIpData.city,
                    geoIpData.isp,
                    geoIpData.org,
                    geoIpData.timezone,
                    geoIpData.lat,
                    geoIpData.lon,
                    analysisResult.status,
                    analysisResult.threatLevel,
                    analysisResult.threatType,
                    analysisResult.confidence,
                    analysisResult.details, // Store the full details object
                    analysisResult.lastSeen,
                    analysisResult.reputation
                ]
            );
            console.log(`IP ${ip} data cached/updated in ip_cache.`);

        } catch (error) {
            console.error(`Error processing IP ${ip}:`, error);
            results.push({
                ip,
                status: 'error',
                threatLevel: 'unknown',
                threatType: 'Backend processing error',
                location: 'Unknown',
                isp: 'Unknown',
                confidence: 0,
                details: { malware: false, phishing: false, spam: false, botnet: false, proxy: false, tor: false },
                lastSeen: null,
                reputation: 0
            });
        }
    }

    res.json(results);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});

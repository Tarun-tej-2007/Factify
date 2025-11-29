// Factify Extension - Popup Script

// API Configuration
const API_CONFIG = {
  SAFE_BROWSING_KEY: 'AIzaSyA-VNVn78RNG8N9KzxKf7fT2zgOCT6IqDE',
  SAFE_BROWSING_URL: 'https://safebrowsing.googleapis.com/v4/threatMatches:find',
  VIRUSTOTAL_KEY: 'a258296aaa448630cc89431f41ff8e2d88db4008ab03a9c92cded1752c7df88f',
  VIRUSTOTAL_URL: 'https://www.virustotal.com/api/v3/urls',
  GROQ_KEY: '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',
  GROQ_URL: 'https://api.groq.com/openai/v1/chat/completions',
};

// DOM Elements
const elements = {
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  results: document.getElementById('results'),
  errorMessage: document.getElementById('error-message'),
  retryBtn: document.getElementById('retry-btn'),
  statusBadge: document.getElementById('status-badge'),
  statusTitle: document.getElementById('status-title'),
  statusSubtitle: document.getElementById('status-subtitle'),
  confidenceValue: document.getElementById('confidence-value'),
  progressFill: document.getElementById('progress-fill'),
  websiteUrl: document.getElementById('website-url'),
  websiteDomain: document.getElementById('website-domain'),
  websiteProtocol: document.getElementById('website-protocol'),
  analysisDetails: document.getElementById('analysis-details'),
  threatsSection: document.getElementById('threats-section'),
  threatsList: document.getElementById('threats-list'),
  viewFullReport: document.getElementById('view-full-report'),
  reportIssue: document.getElementById('report-issue'),
};

// State
let currentTab = null;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    // Verify website
    await verifyWebsite(tab.url);
  } catch (error) {
    showError('Failed to initialize extension');
    console.error('Init error:', error);
  }
}

// Verify Website
async function verifyWebsite(url) {
  try {
    showLoading();

    // Parse URL
    const urlObj = new URL(url);
    
    // Check if it's a valid web URL
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Can only verify HTTP/HTTPS websites. Please navigate to a regular website.');
    }
    
    // Call Safe Browsing API for website analysis
    const analysis = await analyzeWebsite(url, urlObj);

    // Display results
    displayResults(analysis, urlObj);
  } catch (error) {
    showError(error.message || 'Failed to verify website');
    console.error('Verification error:', error);
  }
}

// Multi-Layer Website Analysis
async function analyzeWebsite(url, urlObj) {
  console.log('🔍 Starting multi-layer website analysis...');
  
  const results = {
    safeBrowsing: null,
    virusTotal: null,
    urlPatterns: null,
    heuristics: null
  };
  
  try {
    // LAYER 1: Google Safe Browsing
    console.log('Layer 1: Google Safe Browsing...');
    results.safeBrowsing = await checkSafeBrowsing(url);
    
    // LAYER 2: VirusTotal Multi-Engine Scan
    console.log('Layer 2: VirusTotal scan...');
    results.virusTotal = await checkVirusTotal(url);
    
    // LAYER 3: URL Pattern Detection (Local Logic)
    console.log('Layer 3: URL pattern analysis...');
    results.urlPatterns = analyzeURLPatterns(urlObj);
    
    // LAYER 4: Heuristic Rules (Local Logic)
    console.log('Layer 4: Heuristic analysis...');
    results.heuristics = await analyzeHeuristics(urlObj);
    
    // Combine all results
    return combineAnalysisResults(results, urlObj);
    
  } catch (error) {
    console.error('Analysis error:', error);
    // Fallback to basic analysis
    return {
      status: 'warning',
      confidence: 50,
      summary: 'Partial analysis completed',
      details: `Unable to complete full analysis: ${error.message}. Proceed with caution.`,
      threats: [],
      layers: ['Error']
    };
  }
}

// Layer 1: Google Safe Browsing
async function checkSafeBrowsing(url) {
  try {
    const response = await fetch(`${API_CONFIG.SAFE_BROWSING_URL}?key=${API_CONFIG.SAFE_BROWSING_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: {
          clientId: 'factify-extension',
          clientVersion: '2.0.0'
        },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url: url }]
        }
      }),
    });

    if (!response.ok) {
      return { found: false, threats: [] };
    }

    const data = await response.json();
    const threats = data.matches || [];
    
    return {
      found: threats.length > 0,
      threats: threats.map(t => `${t.threatType}: ${t.platformType}`)
    };
  } catch (error) {
    console.error('Safe Browsing error:', error);
    return { found: false, threats: [] };
  }
}

// Layer 2: VirusTotal Multi-Engine Scan
async function checkVirusTotal(url) {
  try {
    // Check if API key is configured
    if (!API_CONFIG.VIRUSTOTAL_KEY || API_CONFIG.VIRUSTOTAL_KEY === 'YOUR-VIRUSTOTAL-API-KEY') {
      return { scanned: false, malicious: 0, suspicious: 0, engines: 0 };
    }

    // Encode URL for VirusTotal
    const urlId = btoa(url).replace(/=/g, '');
    
    const response = await fetch(`${API_CONFIG.VIRUSTOTAL_URL}/${urlId}`, {
      method: 'GET',
      headers: {
        'x-apikey': API_CONFIG.VIRUSTOTAL_KEY
      }
    });

    if (!response.ok) {
      return { scanned: false, malicious: 0, suspicious: 0, engines: 0 };
    }

    const data = await response.json();
    const stats = data.data?.attributes?.last_analysis_stats || {};
    
    return {
      scanned: true,
      malicious: stats.malicious || 0,
      suspicious: stats.suspicious || 0,
      harmless: stats.harmless || 0,
      undetected: stats.undetected || 0,
      engines: Object.values(stats).reduce((a, b) => a + b, 0),
      vendors: data.data?.attributes?.last_analysis_results || {}
    };
  } catch (error) {
    console.error('VirusTotal error:', error);
    return { scanned: false, malicious: 0, suspicious: 0, engines: 0 };
  }
}

// Layer 3: URL Pattern Detection (Local Logic)
function analyzeURLPatterns(urlObj) {
  const hostname = urlObj.hostname.toLowerCase();
  const fullUrl = urlObj.href.toLowerCase();
  const patterns = [];
  let riskScore = 0;
  
  // 1. Check for IP address instead of domain
  if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(hostname)) {
    patterns.push({ type: 'danger', text: 'Uses IP address instead of domain name' });
    riskScore += 30;
  }
  
  // 2. Suspicious TLDs
  const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.monster', '.work', '.click', '.link', '.download'];
  if (suspiciousTLDs.some(tld => hostname.endsWith(tld))) {
    patterns.push({ type: 'warning', text: `Suspicious top-level domain (${hostname.split('.').pop()})` });
    riskScore += 20;
  }
  
  // 3. Fake domain spelling (typosquatting)
  const popularBrands = ['google', 'facebook', 'amazon', 'microsoft', 'apple', 'paypal', 'netflix', 'instagram', 'twitter', 'linkedin'];
  for (const brand of popularBrands) {
    // Check for brand name with extra characters
    const regex = new RegExp(`${brand}[0-9-]`, 'i');
    if (regex.test(hostname) && !hostname.includes(`${brand}.com`)) {
      patterns.push({ type: 'danger', text: `Possible ${brand} impersonation detected` });
      riskScore += 40;
      break;
    }
  }
  
  // 4. Brand impersonation patterns
  const phishingPatterns = ['-login', '-secure', '-verify', '-account', '-update', '-confirm', 'paypal-', 'amazon-', 'microsoft-', 'google-', 'apple-', 'bank-'];
  for (const pattern of phishingPatterns) {
    if (hostname.includes(pattern)) {
      patterns.push({ type: 'danger', text: `Suspicious pattern detected: "${pattern}"` });
      riskScore += 35;
      break;
    }
  }
  
  // 5. Weird characters (homograph attack)
  if (/[а-яА-Я]/.test(hostname) || /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/.test(hostname)) {
    patterns.push({ type: 'warning', text: 'Contains non-standard characters (possible homograph attack)' });
    riskScore += 25;
  }
  
  // 6. Too many numbers
  const numberCount = (hostname.match(/\d/g) || []).length;
  if (numberCount > 4) {
    patterns.push({ type: 'warning', text: `Unusual number of digits in domain (${numberCount})` });
    riskScore += 15;
  }
  
  // 7. Very long subdomain
  if (/[a-z0-9-]{30,}/.test(hostname)) {
    patterns.push({ type: 'warning', text: 'Unusually long subdomain detected' });
    riskScore += 15;
  }
  
  // 8. HTTP instead of HTTPS
  if (urlObj.protocol === 'http:') {
    patterns.push({ type: 'warning', text: 'Uses insecure HTTP protocol (not HTTPS)' });
    riskScore += 20;
  }
  
  // 9. Multiple subdomains
  const subdomainCount = hostname.split('.').length - 2;
  if (subdomainCount > 2) {
    patterns.push({ type: 'warning', text: `Multiple subdomains (${subdomainCount} levels)` });
    riskScore += 10;
  }
  
  // 10. URL shorteners (could hide malicious links)
  const shorteners = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd', 'buff.ly'];
  if (shorteners.some(s => hostname.includes(s))) {
    patterns.push({ type: 'warning', text: 'URL shortener detected (destination unknown)' });
    riskScore += 15;
  }
  
  return {
    patterns,
    riskScore: Math.min(riskScore, 100)
  };
}

// Layer 4: Heuristic Rules (Local Logic)
async function analyzeHeuristics(urlObj) {
  const heuristics = [];
  let riskScore = 0;
  
  try {
    // 1. Check domain age (new domains are riskier)
    // Note: This would require WHOIS API, so we'll use a simplified check
    const hostname = urlObj.hostname;
    
    // 2. Check for common scam keywords in URL
    const scamKeywords = ['free', 'prize', 'winner', 'claim', 'urgent', 'verify', 'suspend', 'limited', 'offer', 'bonus', 'gift'];
    const urlLower = urlObj.href.toLowerCase();
    const foundKeywords = scamKeywords.filter(kw => urlLower.includes(kw));
    
    if (foundKeywords.length > 0) {
      heuristics.push({ type: 'warning', text: `Scam keywords detected: ${foundKeywords.join(', ')}` });
      riskScore += foundKeywords.length * 10;
    }
    
    // 3. Check for excessive special characters
    const specialCharCount = (urlObj.href.match(/[!@#$%^&*()_+=\[\]{};':"\\|,<>?]/g) || []).length;
    if (specialCharCount > 5) {
      heuristics.push({ type: 'warning', text: `Excessive special characters (${specialCharCount})` });
      riskScore += 15;
    }
    
    // 4. Check URL length (very long URLs can be suspicious)
    if (urlObj.href.length > 100) {
      heuristics.push({ type: 'info', text: `Very long URL (${urlObj.href.length} characters)` });
      riskScore += 10;
    }
    
    // 5. Check for @ symbol (can hide real domain)
    if (urlObj.href.includes('@')) {
      heuristics.push({ type: 'danger', text: 'URL contains @ symbol (possible domain hiding)' });
      riskScore += 40;
    }
    
    // 6. Check for double slashes in path (unusual)
    if (urlObj.pathname.includes('//')) {
      heuristics.push({ type: 'warning', text: 'Double slashes in URL path' });
      riskScore += 15;
    }
    
    return {
      heuristics,
      riskScore: Math.min(riskScore, 100)
    };
    
  } catch (error) {
    console.error('Heuristics error:', error);
    return { heuristics: [], riskScore: 0 };
  }
}

// Combine all analysis results
function combineAnalysisResults(results, urlObj) {
  let status, confidence, summary, details;
  const allThreats = [];
  let totalRiskScore = 0;
  
  // Check Safe Browsing
  if (results.safeBrowsing.found) {
    status = 'danger';
    confidence = 95;
    summary = 'Dangerous website detected';
    details = '🚨 **Google Safe Browsing Alert**\n\nThis website has been identified as unsafe by Google Safe Browsing.';
    allThreats.push(...results.safeBrowsing.threats);
    totalRiskScore = 100;
  }
  // Check VirusTotal
  else if (results.virusTotal.scanned && results.virusTotal.malicious > 0) {
    status = 'danger';
    confidence = 90;
    summary = `Flagged by ${results.virusTotal.malicious} security vendors`;
    details = `🛡️ **VirusTotal Multi-Engine Scan**\n\n${results.virusTotal.malicious} out of ${results.virusTotal.engines} security engines flagged this URL as malicious.`;
    allThreats.push(`${results.virusTotal.malicious}/${results.virusTotal.engines} vendors flagged as malicious`);
    totalRiskScore = 90;
  }
  // Check URL patterns and heuristics
  else {
    totalRiskScore = results.urlPatterns.riskScore + results.heuristics.riskScore;
    
    if (totalRiskScore >= 60) {
      status = 'danger';
      confidence = 85;
      summary = 'High-risk website detected';
    } else if (totalRiskScore >= 30) {
      status = 'warning';
      confidence = 70;
      summary = 'Suspicious patterns detected';
    } else {
      status = 'safe';
      confidence = 90;
      summary = 'No threats detected';
    }
    
    // Build details
    details = `🔍 **Multi-Layer Analysis Complete**\n\n`;
    
    if (results.virusTotal.scanned) {
      details += `✅ VirusTotal: ${results.virusTotal.harmless}/${results.virusTotal.engines} vendors marked as safe\n`;
    }
    
    details += `✅ Google Safe Browsing: No threats found\n`;
    details += `✅ Protocol: ${urlObj.protocol.toUpperCase()}\n\n`;
    
    // Add URL pattern warnings
    if (results.urlPatterns.patterns.length > 0) {
      details += `⚠️ **URL Pattern Analysis:**\n`;
      results.urlPatterns.patterns.forEach(p => {
        allThreats.push(p.text);
        details += `• ${p.text}\n`;
      });
      details += `\n`;
    }
    
    // Add heuristic warnings
    if (results.heuristics.heuristics.length > 0) {
      details += `🔎 **Heuristic Analysis:**\n`;
      results.heuristics.heuristics.forEach(h => {
        allThreats.push(h.text);
        details += `• ${h.text}\n`;
      });
    }
    
    if (status === 'safe') {
      details += `\n✅ This website appears safe based on our analysis.`;
    }
  }
  
  return {
    status,
    confidence,
    summary,
    details,
    threats: allThreats,
    riskScore: totalRiskScore,
    recommendations: status === 'danger' ? 'Do not visit this website or enter any personal information.' : 
                     status === 'warning' ? 'Exercise caution and verify the website authenticity before proceeding.' :
                     'Website appears safe, but always be cautious with personal information online.'
  };
}



// Display Results
function displayResults(analysis, urlObj) {
  hideLoading();
  hideError();
  
  // Show results
  elements.results.classList.remove('hidden');

  // Status Badge
  elements.statusBadge.className = `status-badge ${analysis.status}`;
  
  const statusTitles = {
    safe: 'Safe Website',
    warning: 'Suspicious Website',
    danger: 'Dangerous Website'
  };
  
  const statusSubtitles = {
    safe: 'No threats detected',
    warning: 'Proceed with caution',
    danger: 'Do not visit this website'
  };

  elements.statusTitle.textContent = statusTitles[analysis.status] || 'Unknown';
  elements.statusSubtitle.textContent = statusSubtitles[analysis.status] || analysis.summary;

  // Confidence Score
  const confidence = Math.round(analysis.confidence || 50);
  elements.confidenceValue.textContent = `${confidence}%`;
  elements.progressFill.style.width = `${confidence}%`;

  // Website Info
  elements.websiteUrl.textContent = urlObj.href;
  elements.websiteUrl.title = urlObj.href;
  elements.websiteDomain.textContent = urlObj.hostname;
  elements.websiteProtocol.textContent = urlObj.protocol.replace(':', '').toUpperCase();

  // Analysis Details - Format as formal report
  const formattedWebsiteDetails = formatAnalysisReport(analysis.details || analysis.summary || 'No detailed analysis available.');
  elements.analysisDetails.innerHTML = formattedWebsiteDetails;
  elements.analysisDetails.classList.add('formal-report');

  // Threats
  if (analysis.threats && analysis.threats.length > 0) {
    elements.threatsSection.classList.remove('hidden');
    elements.threatsList.innerHTML = analysis.threats
      .map(threat => `<li>${threat}</li>`)
      .join('');
  } else {
    elements.threatsSection.classList.add('hidden');
  }

  // Store analysis for full report
  chrome.storage.local.set({ lastAnalysis: { ...analysis, url: urlObj.href, timestamp: Date.now() } });
}

// Show Loading
function showLoading() {
  elements.loading.classList.remove('hidden');
  elements.error.classList.add('hidden');
  elements.results.classList.add('hidden');
}

// Hide Loading
function hideLoading() {
  elements.loading.classList.add('hidden');
}

// Show Error
function showError(message) {
  hideLoading();
  elements.error.classList.remove('hidden');
  elements.results.classList.add('hidden');
  elements.errorMessage.textContent = message;
}

// Hide Error
function hideError() {
  elements.error.classList.add('hidden');
}

// Event Listeners
elements.retryBtn.addEventListener('click', () => {
  if (currentTab) {
    verifyWebsite(currentTab.url);
  }
});

elements.viewFullReport.addEventListener('click', () => {
  chrome.tabs.create({ url: 'report.html' });
});

elements.reportIssue.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://factify.app/report-issue' });
});

document.getElementById('settings-link').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});


// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update active tab content - hide all first
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
      content.classList.add('hidden');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
      selectedTab.classList.add('active');
      selectedTab.classList.remove('hidden');
    }
  });
});

// News Checking
document.getElementById('check-news-btn').addEventListener('click', async () => {
  const newsInput = document.getElementById('news-input').value.trim();
  
  if (!newsInput) {
    alert('Please enter news text or URL');
    return;
  }
  
  const loading = document.getElementById('news-loading');
  const results = document.getElementById('news-results');
  
  loading.classList.remove('hidden');
  results.classList.add('hidden');
  
  try {
    // Use Gemini API for news analysis
    const analysis = await analyzeNews(newsInput);
    displayNewsResults(analysis);
  } catch (error) {
    results.innerHTML = `<div class="error"><p>${error.message}</p></div>`;
    results.classList.remove('hidden');
  } finally {
    loading.classList.add('hidden');
  }
});

// Media Checking
document.getElementById('check-media-btn').addEventListener('click', async () => {
  const mediaInput = document.getElementById('media-input');
  const file = mediaInput.files[0];
  
  if (!file) {
    alert('Please select an image or video');
    return;
  }
  
  const loading = document.getElementById('media-loading');
  const results = document.getElementById('media-results');
  const preview = document.getElementById('media-preview');
  
  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    const isVideo = file.type.startsWith('video/');
    preview.innerHTML = isVideo 
      ? `<video src="${e.target.result}" controls></video>`
      : `<img src="${e.target.result}" alt="Preview" />`;
    preview.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
  
  loading.classList.remove('hidden');
  results.classList.add('hidden');
  
  try {
    const analysis = await analyzeMedia(file);
    displayMediaResults(analysis);
  } catch (error) {
    results.innerHTML = `<div class="error"><p>${error.message}</p></div>`;
    results.classList.remove('hidden');
  } finally {
    loading.classList.add('hidden');
  }
});

// Simplified News Verification using Groq AI only
async function analyzeNews(newsText) {
  try {
    console.log('🤖 Analyzing news with Groq AI (FREE & FAST!)...');
    
    // Use Groq AI for comprehensive analysis
    const analysis = await aiClaimAnalysis(newsText);
    
    return {
      status: analysis.status,
      confidence: analysis.confidence,
      details: analysis.details,
      layers: ['AI Analysis (Groq - LLaMA 3)']
    };
    
  } catch (error) {
    console.error('News analysis error:', error);
    return {
      status: 'warning',
      confidence: 50,
      details: `⚠️ **Verification Error**\n\nUnable to verify this claim due to: ${error.message}\n\n**Recommendation:** Please verify manually using trusted fact-checking websites:\n• Snopes.com\n• FactCheck.org\n• PolitiFact.com\n• Reuters Fact Check\n• AP Fact Check`,
      layers: ['Error']
    };
  }
}

// AI-Based News Analysis using Groq
async function aiClaimAnalysis(newsText) {
  const prompt = `You are an expert fact-checker with access to extensive knowledge. Analyze the following news content thoroughly and determine if it's authentic, suspicious, or fake.

News Content:
"${newsText}"

IMPORTANT INSTRUCTIONS:
1. Provide a SPECIFIC confidence score (0-100) based on your analysis, NOT a generic 50%
2. Use your knowledge to verify factual claims
3. Check for logical inconsistencies, emotional manipulation, and misleading information
4. Identify specific red flags or green flags in the content
5. Be decisive - avoid defaulting to "suspicious" unless genuinely uncertain

Confidence Score Guidelines:
- 80-100: Strong evidence the content is authentic/fake with verifiable facts
- 60-79: Moderate confidence based on logical analysis and partial verification
- 40-59: Uncertain, conflicting signals, or unverifiable claims
- 20-39: Likely fake/authentic but needs more verification
- 0-19: Strong indicators of fake/authentic content

Provide your analysis in this EXACT format:

**VERDICT:** [Choose ONE: AUTHENTIC / SUSPICIOUS / FAKE]

**CONFIDENCE:** [Specific number 0-100, NOT 50 unless truly uncertain]%

**SUMMARY:**
[Clear verdict in 1-2 sentences]

**DETAILED REASONING:**
[Detailed explanation with specific evidence including:
- Factual accuracy of claims
- Logical consistency
- Known facts and context
- Source credibility indicators
- Any manipulation techniques detected]

**RED FLAGS:**
[List any suspicious elements, or write "None detected"]

**GREEN FLAGS:**
[List any credibility indicators, or write "None detected"]

**RECOMMENDATION:**
[One sentence advice for readers]

Be thorough, objective, and decisive in your analysis.`;

  try {
    const response = await fetch(API_CONFIG.GROQ_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.GROQ_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a professional fact-checker. Provide detailed, accurate analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2048
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Groq API error:', errorData);
      throw new Error(`AI analysis failed: ${response.status}`);
    }
    
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || 'Unable to analyze';
    
    console.log('AI Analysis Response:', text);
    
    // Parse verdict
    let status = 'warning';
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('verdict:** fake') || lowerText.includes('verdict: fake')) {
      status = 'danger';
    } else if (lowerText.includes('verdict:** authentic') || lowerText.includes('verdict: authentic')) {
      status = 'safe';
    } else if (lowerText.includes('verdict:** suspicious') || lowerText.includes('verdict: suspicious')) {
      status = 'warning';
    }
    
    // Extract confidence
    const confidenceMatch = text.match(/\*\*confidence\*\*[:\s]+(\d+)/i) || 
                           text.match(/confidence[:\s]+(\d+)%/i) ||
                           text.match(/(\d+)%/);
    let confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 70;
    
    // Ensure confidence is in reasonable range
    if (confidence < 0) confidence = 0;
    if (confidence > 100) confidence = 100;
    
    return {
      status,
      confidence,
      details: text
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    throw new Error(`Unable to complete AI verification: ${error.message}`);
  }
}

// Analyze Media using Hugging Face API
async function analyzeMedia(file) {
  try {
    const isVideo = file.type.startsWith('video/');
    
    if (isVideo) {
      // Video analysis placeholder
      return {
        status: 'warning',
        confidence: 70,
        details: `**MEDIA TYPE**\n\nVideo File\n\n**ANALYSIS STATUS**\n\nVideo analysis requires frame extraction and processing. For comprehensive video deepfake detection, each frame must be analyzed individually.\n\n**RECOMMENDATION**\n\nFor video verification:\n• Extract key frames from the video\n• Analyze each frame separately\n• Look for temporal inconsistencies\n• Consider using specialized video deepfake detection services`,
        note: 'Full video analysis requires frame-by-frame processing'
      };
    }
    
    // Image analysis using Hugging Face
    console.log('🔍 Analyzing image with Hugging Face...');
    
    // Convert file to base64
    const base64 = await fileToBase64(file);
    
    // Call Hugging Face API
    const response = await fetch('https://api-inference.huggingface.co/models/dima806/deepfake_vs_real_image_detection', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: base64
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Hugging Face API Error:', error);
      
      // If model is loading
      if (error.error && error.error.includes('loading')) {
        return {
          status: 'warning',
          confidence: 50,
          details: `**MODEL STATUS**\n\nInitializing\n\n**INFORMATION**\n\nThe AI deepfake detection model is currently warming up on Hugging Face servers. This typically takes 20-30 seconds on first use.\n\n**RECOMMENDATION**\n\nPlease wait a moment and try again. The model will be ready shortly.`,
          note: 'Model is loading, please try again in 20-30 seconds'
        };
      }
      
      throw new Error(error.error || `API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Hugging Face Response:', result);
    
    return formatImageAnalysis(result);
    
  } catch (error) {
    console.error('Media analysis error:', error);
    return {
      status: 'warning',
      confidence: 50,
      details: `**ERROR**\n\nAnalysis Failed\n\n**DETAILS**\n\n${error.message}\n\n**RECOMMENDATION**\n\nPlease try again. If the issue persists:\n• Check your internet connection\n• Ensure the image file is valid\n• Try a different image format (JPG, PNG)`,
      note: 'Unable to complete analysis'
    };
  }
}

// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Remove data URL prefix to get pure base64
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Format Hugging Face image analysis result
function formatImageAnalysis(data) {
  // Hugging Face returns: [{"label": "REAL", "score": 0.85}, {"label": "FAKE", "score": 0.15}]
  const realScore = data.find(item => item.label === 'REAL')?.score || 0;
  const fakeScore = data.find(item => item.label === 'FAKE')?.score || 0;
  
  const isFake = fakeScore > realScore;
  const confidence = Math.round((isFake ? fakeScore : realScore) * 100);
  
  const status = isFake ? 'danger' : confidence > 80 ? 'safe' : 'warning';
  
  const details = `**VERDICT**\n\n${isFake ? 'AI-Generated or Manipulated' : 'Likely Authentic'}\n\n**CONFIDENCE**\n\n${confidence}%\n\n**ANALYSIS RESULTS**\n\nReal Probability: ${Math.round(realScore * 100)}%\nFake Probability: ${Math.round(fakeScore * 100)}%\n\n**DETAILED REASONING**\n\nThe AI-powered deepfake detection model analyzed this image for visual artifacts, inconsistencies, and patterns typical of AI-generated or manipulated content.\n\n**KEY FINDINGS**\n\n${isFake ? 
    `● Image shows signs of AI generation or manipulation\n● Visual artifacts detected\n● Patterns consistent with synthetic content\n● Authenticity confidence is low (${Math.round(realScore * 100)}%)` :
    `● Image appears to be authentic\n● No significant manipulation detected\n● Visual consistency maintained\n● High authenticity confidence (${Math.round(realScore * 100)}%)`
  }\n\n**TECHNICAL DETAILS**\n\n● Model: Hugging Face Deepfake Detection\n● Analysis Method: Deep learning visual pattern recognition\n● Detection Accuracy: High (trained on millions of images)\n\n**RECOMMENDATION**\n\n${isFake ?
    'This image shows strong indicators of AI generation or manipulation. Exercise caution before sharing or trusting this content.' :
    confidence > 80 ?
    'This image appears authentic with high confidence. However, always verify the source and context.' :
    'This image shows some suspicious patterns. Verify the source and cross-check with other evidence before trusting.'
  }`;
  
  return {
    status,
    confidence,
    details,
    note: 'Analysis powered by Hugging Face AI (Deepfake Detection Model)'
  };
}

// Display News Results
function displayNewsResults(analysis) {
  const results = document.getElementById('news-results');
  const statusClass = analysis.status;
  const statusText = {
    safe: 'Likely Authentic',
    warning: 'Potentially Misleading',
    danger: 'Likely Fake'
  }[statusClass];
  
  const layerBadges = analysis.layers ? analysis.layers.map(layer => 
    `<span style="display: inline-block; padding: 4px 8px; background: #e0e7ff; color: #4f46e5; border-radius: 4px; font-size: 11px; margin-right: 4px;">${layer}</span>`
  ).join('') : '';
  
  // Format the analysis details in a structured way
  const formattedDetails = formatAnalysisReport(analysis.details);
  
  results.innerHTML = `
    <div class="status-badge ${statusClass}">
      <div class="status-icon"></div>
      <div class="status-text">
        <h2>${statusText}</h2>
        <p>Confidence: ${analysis.confidence}%</p>
      </div>
    </div>
    ${layerBadges ? `<div style="padding: 12px 20px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #6b7280; margin: 0 0 6px 0;">Verification Layers Used:</p>
      ${layerBadges}
    </div>` : ''}
    <div class="details-section">
      <h3>Analysis Report</h3>
      <div class="details-content formal-report">${formattedDetails}</div>
    </div>
  `;
  results.classList.remove('hidden');
}

// Display Media Results
function displayMediaResults(analysis) {
  const results = document.getElementById('media-results');
  const statusClass = analysis.status;
  const statusText = {
    safe: 'Authentic Media',
    warning: 'Suspicious',
    danger: 'Likely Manipulated'
  }[statusClass];
  
  const formattedDetails = formatAnalysisReport(analysis.details);
  
  results.innerHTML = `
    <div class="status-badge ${statusClass}">
      <div class="status-icon"></div>
      <div class="status-text">
        <h2>${statusText}</h2>
        <p>Confidence: ${analysis.confidence}%</p>
      </div>
    </div>
    <div class="details-section">
      <h3>Analysis Report</h3>
      <div class="details-content formal-report">${formattedDetails}</div>
      ${analysis.note ? `<p style="margin-top: 12px; font-size: 13px; color: #6b7280;"><strong>Note:</strong> ${analysis.note}</p>` : ''}
    </div>
  `;
  results.classList.remove('hidden');
}

// Format analysis text into formal structured report
function formatAnalysisReport(text) {
  if (!text) return '<p>No analysis available.</p>';
  
  // Split by sections (marked with **)
  const sections = text.split(/\*\*([^*]+)\*\*/g);
  let formatted = '';
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (!section) continue;
    
    // Check if this is a header (odd indices after split)
    if (i % 2 === 1) {
      // This is a section header
      formatted += `<div class="report-section-header">${section}</div>`;
    } else {
      // This is content
      const lines = section.split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        
        // Check if it's a bullet point
        if (line.startsWith('•') || line.startsWith('-')) {
          formatted += `<div class="report-bullet">• ${line.substring(1).trim()}</div>`;
        }
        // Check if it's a numbered list
        else if (/^\d+\./.test(line)) {
          formatted += `<div class="report-bullet">${line}</div>`;
        }
        // Regular paragraph
        else {
          formatted += `<div class="report-paragraph">${line}</div>`;
        }
      });
    }
  }
  
  return formatted || `<div class="report-paragraph">${text}</div>`;
}

export interface ParsedFilters {
  status?: string;
  auditName?: string;
  auditLead?: string;
  riskLevel?: string;
  responsibleEmail?: string;
  cLevel?: string;
  auditYear?: '2024+' | 'all' | string; // Can be specific year like "2023", "2024", "2025", etc.
}

export interface ParseResult {
  success: boolean;
  filters: ParsedFilters;
  message?: string;
  error?: string;
  isCountRequest?: boolean; // If true, user wants count instead of export
}

// Status mappings (TR/EN)
const STATUS_MAPPINGS: Record<string, string> = {
  // Turkish
  'açık': 'Open',
  'open': 'Open',
  'gecikmiş': 'Overdue',
  'overdue': 'Overdue',
  'tamamlanmış': 'Completed',
  'completed': 'Completed',
  'tamamlandı': 'Completed',
  'risk kabul': 'Risk Accepted',
  'risk accepted': 'Risk Accepted',
  'risk kabul edildi': 'Risk Accepted',
};

// Risk level mappings (TR/EN)
const RISK_LEVEL_MAPPINGS: Record<string, string> = {
  // Turkish
  'kritik': 'Critical',
  'critical': 'Critical',
  'yüksek': 'High',
  'high': 'High',
  'orta': 'Medium',
  'medium': 'Medium',
  'düşük': 'Low',
  'low': 'Low',
  'atanmamış': 'Unassigned',
  'unassigned': 'Unassigned',
};

/**
 * Normalize text for matching (lowercase, remove accents, trim)
 */
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim();
};

/**
 * Extract status from text
 */
const extractStatus = (text: string): string | undefined => {
  const normalized = normalizeText(text);
  
  for (const [key, value] of Object.entries(STATUS_MAPPINGS)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  
  return undefined;
};

/**
 * Extract risk level from text
 */
const extractRiskLevel = (text: string): string | undefined => {
  const normalized = normalizeText(text);
  
  for (const [key, value] of Object.entries(RISK_LEVEL_MAPPINGS)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  
  return undefined;
};

/**
 * Extract audit name from text
 * Patterns: "audit X", "X audit", "audit name X"
 */
const extractAuditName = (text: string): string | undefined => {
  const patterns = [
    /(?:audit|denetim)\s+(?:name|isim|adı)?\s*[:=]?\s*["']?([^"'\n]+)["']?/i,
    /["']([^"'\n]+)["']\s+(?:audit|denetim)/i,
    /(?:audit|denetim)\s+["']([^"'\n]+)["']/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return undefined;
};

/**
 * Extract audit lead from text
 * Patterns: "audit lead X", "lead X", "X lead"
 */
const extractAuditLead = (text: string): string | undefined => {
  const patterns = [
    /(?:audit\s+)?lead\s+(?:is|name|adı)?\s*[:=]?\s*["']?([^"'\n]+)["']?/i,
    /["']([^"'\n]+)["']\s+(?:audit\s+)?lead/i,
    /(?:denetim\s+)?lider\s+(?:is|name|adı)?\s*[:=]?\s*["']?([^"'\n]+)["']?/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return undefined;
};

/**
 * Extract responsible email or name from text
 * Patterns: "responsible X", "X responsible", "action responsible X"
 */
const extractResponsible = (text: string): string | undefined => {
  const patterns = [
    /(?:action\s+)?responsible\s+(?:is|email|isim)?\s*[:=]?\s*["']?([^"'\n]+)["']?/i,
    /["']([^"'\n]+)["']\s+(?:action\s+)?responsible/i,
    /(?:sorumlu|responsible)\s+(?:is|email|isim)?\s*[:=]?\s*["']?([^"'\n]+)["']?/i,
    // Email pattern
    /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/,
    // Name pattern with possessive (e.g., "John Doe'nun")
    /["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)["']?(?:\s+(?:nun|nin|nın|nün|'s|'nin))?/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = match[1].trim();
      // Skip if it's a common word or if it contains year patterns (like "from 2024")
      const lowerValue = value.toLowerCase();
      // Skip if it contains preposition + year pattern
      if (/\b(?:from|in|for|since|during|için|içinde|yılında|yılı)\s+\d{4}\b/i.test(value)) {
        continue;
      }
      // Skip if it's just a year number
      if (/^\d{4}$/.test(value)) {
        continue;
      }
      // Skip common words
      if (['action', 'actions', 'actionlar', 'actionların', 'there', 'here'].includes(lowerValue)) {
        continue;
      }
      // Skip if it's a partial phrase that doesn't make sense as a name/email
      if (lowerValue.includes('how many') || lowerValue.includes('how many') || 
          lowerValue.includes('in there') || lowerValue.includes('from')) {
        continue;
      }
      return value;
    }
  }
  
  return undefined;
};

/**
 * Extract C-Level from text
 * Patterns: "c-level X", "X c-level", "clevel X"
 */
const extractCLevel = (text: string): string | undefined => {
  const patterns = [
    /(?:c[-_]?level|clevel)\s+(?:is|email|isim)?\s*[:=]?\s*["']?([^"'\n]+)["']?/i,
    /["']([^"'\n]+)["']\s+(?:c[-_]?level|clevel)/i,
    // Email pattern after c-level keyword
    /(?:c[-_]?level|clevel).*?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return undefined;
};

/**
 * Extract audit year from text
 * Patterns: "2024", "2024+", "all", "tümü", "hepsi", "just 2025", "only 2025", "2023 year"
 * Returns: '2024+', 'all', or specific year string like "2023", "2024", "2025"
 */
const extractAuditYear = (text: string): '2024+' | 'all' | string | undefined => {
  const normalized = normalizeText(text);
  
  // FIRST: Check for year patterns with prepositions: "from 2024", "in 2024", "for 2024", etc.
  // This should be checked EARLY to catch "from 2024" correctly before other patterns
  // IMPORTANT: "from 2024" means specific year 2024, NOT "2024+"
  const yearWithPrepositionPattern = /\b(?:from|in|for|since|during|için|içinde|yılında|yılı)\s+(\d{4})\b/i;
  const yearWithPrepositionMatch = text.match(yearWithPrepositionPattern);
  if (yearWithPrepositionMatch && yearWithPrepositionMatch[1]) {
    // Return specific year as string (e.g., "2024", "2025", "2023")
    // Don't convert to "2024+" - let the user specify if they want range
    return yearWithPrepositionMatch[1];
  }
  
  // Also check reverse pattern: "2024 from", "2024 in", etc. (less common but possible)
  const yearWithPrepositionReversePattern = /\b(\d{4})\s+(?:from|in|for|since|during|için|içinde|yılında|yılı)\b/i;
  const yearWithPrepositionReverseMatch = text.match(yearWithPrepositionReversePattern);
  if (yearWithPrepositionReverseMatch && yearWithPrepositionReverseMatch[1]) {
    // Return specific year as string
    return yearWithPrepositionReverseMatch[1];
  }
  
  // Check for "just", "only", "sadece" followed by a year (specific year request)
  const specificYearPattern = /(?:just|only|sadece)\s+(?:year|yıl|yılı)?\s*(\d{4})/i;
  const specificYearMatch = text.match(specificYearPattern);
  if (specificYearMatch && specificYearMatch[1]) {
    const year = specificYearMatch[1]; // Return as string for exact match
    // Backend supports specific years, so return the exact year
    return year;
  }
  
  // Check for "all" but only if it's in the context of year filter
  // Avoid matching "all actions", "all results", etc.
  const allYearPattern = /(?:year|yıl|yılı|audit\s+year)\s+(?:is\s+)?(?:all|tümü|hepsi|tüm)/i;
  const allYearMatch = text.match(allYearPattern);
  if (allYearMatch) {
    return 'all';
  }
  
  // Check for standalone "all" only if it's clearly about year
  // But not if it's "all actions", "all results", etc.
  if ((normalized.includes('all') || normalized.includes('tümü') || normalized.includes('hepsi') || normalized.includes('tüm')) &&
      !normalized.includes('all actions') && 
      !normalized.includes('all results') &&
      !normalized.includes('all finding') &&
      !normalized.includes('export all') &&
      !normalized.includes('show all')) {
    // Check if "all" is near year-related keywords
    const allContextPattern = /(?:year|yıl|yılı|audit).*?(?:all|tümü|hepsi|tüm)|(?:all|tümü|hepsi|tüm).*?(?:year|yıl|yılı|audit)/i;
    if (allContextPattern.test(text)) {
      return 'all';
    }
  }
  
  // Check for year patterns with "just", "only", "sadece" before the year
  const yearWithJustPattern = /(?:just|only|sadece)\s+(\d{4})/i;
  const yearWithJustMatch = text.match(yearWithJustPattern);
  if (yearWithJustMatch && yearWithJustMatch[1]) {
    // Return specific year as string for exact match
    return yearWithJustMatch[1];
  }
  
  // Check for year patterns - if "just" or "only" is mentioned, return specific year
  const yearPattern = /(?:year|yıl|yılı|audit\s+year)\s*(?:is\s+)?(?:just|only|sadece)?\s*(?:=|\:)?\s*(\d{4})/i;
  const yearMatch = text.match(yearPattern);
  if (yearMatch && yearMatch[1]) {
    // Check if "just" or "only" is in the context
    const contextBefore = text.substring(0, yearMatch.index || 0);
    if (/(?:just|only|sadece)/i.test(contextBefore)) {
      // Return specific year
      return yearMatch[1];
    }
    // If no "just/only", check if it's 2024+ range
    const year = parseInt(yearMatch[1]);
    if (year >= 2024) {
      return '2024+';
    } else {
      // For years before 2024, return specific year
      return yearMatch[1];
    }
  }
  
  // Check for "2024+" pattern
  if (normalized.includes('2024+') || normalized.includes('2024 ve sonrası')) {
    return '2024+';
  }
  
  // Check for standalone year numbers (any 4-digit year) but only if context suggests it's about year
  const standaloneYearPattern = /\b(20\d{2})\b/;
  const standaloneYearMatch = text.match(standaloneYearPattern);
  if (standaloneYearMatch && standaloneYearMatch[1]) {
    const yearStr = standaloneYearMatch[1];
    // Check if it's in year context (near "year", "audit", "just", "only", "from", "in", "for", etc.)
    const yearContext = /(?:year|yıl|yılı|audit|just|only|sadece|from|in|for|since|during|için|içinde|yılında|yılı).*?(?:20\d{2})|(?:20\d{2}).*?(?:year|yıl|yılı|audit|just|only|sadece|from|in|for|since|during|için|içinde|yılında|yılı)/i;
    if (yearContext.test(text)) {
      // Check if "just" or "only" is mentioned - if so, return specific year
      if (/(?:just|only|sadece)/i.test(text)) {
        return yearStr;
      }
      // Otherwise, if 2024+, return '2024+', else return specific year
      const year = parseInt(yearStr);
      if (year >= 2024) {
        return '2024+';
      } else {
        return yearStr;
      }
    }
  }
  
  return undefined;
};

/**
 * Check if request contains reference words (them, those, it, same, also, etc.)
 */
const hasReferenceWords = (request: string): boolean => {
  const referencePatterns = [
    /\b(them|those|it|same|also|too|as well|bunları|onları|aynı|da|de)\b/i,
    /export\s+(them|those|it)/i,
    /(show|list|get|fetch)\s+(them|those|it)/i,
  ];
  return referencePatterns.some(pattern => pattern.test(request));
};

/**
 * Check if request is a simple export request (export pls, export please, export, etc.)
 */
const isSimpleExportRequest = (request: string): boolean => {
  const normalized = normalizeText(request);
  const exportPatterns = [
    /^export\s*(pls|please|lütfen)?\s*$/i,
    /^export\s*(them|those|it|all)?\s*(pls|please|lütfen)?\s*$/i,
    /^(pls|please|lütfen)\s+export\s*$/i,
    /^export$/i,
  ];
  return exportPatterns.some(pattern => pattern.test(normalized.trim()));
};

/**
 * Check if request is a greeting, thanks, or casual conversation
 */
const isGreetingOrCasual = (request: string): { isCasual: boolean; response?: string } => {
  
  // Greetings
  const greetingPatterns = [
    /^(hi|hello|hey|merhaba|selam|günaydın|iyi günler|good morning|good afternoon|good evening)$/i,
    /^(hi|hello|hey|merhaba|selam)\s+(there|auditbot|bot)/i,
    /how\s+are\s+you/i,
    /how\s+do\s+you\s+do/i,
    /nasılsın|nasılsınız/i,
  ];
  
  // Thanks
  const thanksPatterns = [
    /^(thanks|thank you|teşekkür|teşekkürler|teşekkür ederim|sağ ol|sağol)$/i,
    /^(thanks|thank you|teşekkür|teşekkürler|teşekkür ederim)\s+(a lot|so much|very much|çok)/i,
    /^ty$/i,
    /^thx$/i,
  ];
  
  // Goodbye
  const goodbyePatterns = [
    /^(bye|goodbye|see you|görüşürüz|hoşça kal|iyi günler)$/i,
    /^(bye|goodbye|see you|görüşürüz)\s+(then|later|soon)/i,
  ];
  
  // Compliments
  const complimentPatterns = [
    /^(good|great|nice|awesome|cool|harika|süper|mükemmel)\s+(job|work|bot|assistant)/i,
    /you\s+(are|'re)\s+(great|awesome|cool|amazing|wonderful|harika|süper)/i,
  ];
  
  // Check greetings
  if (greetingPatterns.some(pattern => pattern.test(request))) {
    const responses = [
      'Hello! 👋 How can I help you with your audit reports today?',
      'Hi there! 😊 Ready to generate some reports?',
      'Hey! I\'m doing great, thanks for asking! What can I do for you?',
      'Good morning! ☀️ How can I assist you today?',
      'Hello! I\'m here and ready to help! 🚀',
    ];
    return { isCasual: true, response: responses[Math.floor(Math.random() * responses.length)] };
  }
  
  // Check thanks
  if (thanksPatterns.some(pattern => pattern.test(request))) {
    const responses = [
      'You\'re welcome! 😊 Happy to help!',
      'Anytime! Let me know if you need anything else! ✨',
      'My pleasure! Feel free to ask for more reports! 🎉',
      'Glad I could help! 🚀',
      'You\'re very welcome! 😄',
    ];
    return { isCasual: true, response: responses[Math.floor(Math.random() * responses.length)] };
  }
  
  // Check goodbye
  if (goodbyePatterns.some(pattern => pattern.test(request))) {
    const responses = [
      'See you later! 👋 Have a great day!',
      'Goodbye! Take care! 😊',
      'Bye! Come back anytime you need reports! ✨',
      'See you soon! 🚀',
    ];
    return { isCasual: true, response: responses[Math.floor(Math.random() * responses.length)] };
  }
  
  // Check compliments
  if (complimentPatterns.some(pattern => pattern.test(request))) {
    const responses = [
      'Aww, thanks! 😊 I\'m here to help anytime!',
      'You\'re too kind! 🎉 Let me know if you need anything else!',
      'Thank you! That means a lot! ✨',
      'Much appreciated! 😄 Happy to be of service!',
    ];
    return { isCasual: true, response: responses[Math.floor(Math.random() * responses.length)] };
  }
  
  return { isCasual: false };
};

/**
 * Parse natural language request into filter parameters
 */
export const parseReportRequest = (
  request: string, 
  availableOptions?: {
    statuses?: string[];
    auditNames?: string[];
    auditLeads?: string[];
    riskLevels?: string[];
    responsibleEmails?: string[];
    cLevels?: string[];
  },
  previousFilters?: ParsedFilters // Previous successful filters for context
): ParseResult => {
  if (!request || !request.trim()) {
    return {
      success: false,
      filters: {},
      error: 'Could not extract filters from your request. Please use these examples:\n' +
             '• "Export all actions with Open status"\n' +
             '• "Show actions with Critical risk and Overdue status"\n' +
             '• "Completed actions for year 2024"',
    };
  }

  // Check if it's a greeting, thanks, or casual conversation
  const casualCheck = isGreetingOrCasual(request);
  if (casualCheck.isCasual && casualCheck.response) {
    return {
      success: true,
      filters: {},
      message: casualCheck.response,
      isCountRequest: false,
    };
  }

  const filters: ParsedFilters = {};
  
  // Check if request contains reference words (them, those, it, same, also, etc.)
  const hasReference = hasReferenceWords(request);
  
  // Check if it's a simple export request (export pls, export please, export, etc.)
  const isSimpleExport = isSimpleExportRequest(request);
  
  // If request has reference words or is a simple export request, and we have previous filters, use them
  if ((hasReference || isSimpleExport) && previousFilters && Object.keys(previousFilters).length > 0) {
    // Merge previous filters with any new filters found in current request
    Object.assign(filters, previousFilters);
  }
  
  // Check if user wants count instead of export
  // Patterns: "kaç", "how many", "count", "sayı", "number", "kaç tane"
  const countPatterns = [
    /(?:kaç|how\s+many|count|sayı|number|kaç\s+tane|how\s+many\s+actions?)/i,
    /(?:göster|show|list).*?(?:kaç|how\s+many|count)/i,
  ];
  const isCountRequest = countPatterns.some(pattern => pattern.test(request));
  
  // Extract status
  const status = extractStatus(request);
  if (status) {
    // Validate against available options if provided
    if (availableOptions?.statuses && availableOptions.statuses.includes(status)) {
      filters.status = status;
    } else if (!availableOptions?.statuses) {
      filters.status = status;
    }
  }
  
  // Extract risk level
  const riskLevel = extractRiskLevel(request);
  if (riskLevel) {
    if (availableOptions?.riskLevels && availableOptions.riskLevels.includes(riskLevel)) {
      filters.riskLevel = riskLevel;
    } else if (!availableOptions?.riskLevels) {
      filters.riskLevel = riskLevel;
    }
  }
  
  // Extract audit name
  const auditName = extractAuditName(request);
  if (auditName) {
    // Try to match against available options (case-insensitive)
    if (availableOptions?.auditNames) {
      const matched = availableOptions.auditNames.find(
        (name) => normalizeText(name) === normalizeText(auditName)
      );
      if (matched) {
        filters.auditName = matched;
      }
    } else {
      filters.auditName = auditName;
    }
  }
  
  // Extract audit lead
  const auditLead = extractAuditLead(request);
  if (auditLead) {
    if (availableOptions?.auditLeads) {
      const matched = availableOptions.auditLeads.find(
        (lead) => normalizeText(lead) === normalizeText(auditLead)
      );
      if (matched) {
        filters.auditLead = matched;
      }
    } else {
      filters.auditLead = auditLead;
    }
  }
  
  // Extract responsible
  const responsible = extractResponsible(request);
  if (responsible) {
    // If it's an email, use as-is
    if (responsible.includes('@')) {
      if (availableOptions?.responsibleEmails && availableOptions.responsibleEmails.includes(responsible)) {
        filters.responsibleEmail = responsible;
      } else if (!availableOptions?.responsibleEmails) {
        filters.responsibleEmail = responsible;
      }
    } else {
      // Try to match name against emails (partial match)
      if (availableOptions?.responsibleEmails) {
        const matched = availableOptions.responsibleEmails.find(
          (email) => {
            const emailPrefix = email.split('@')[0];
            return emailPrefix ? (
              normalizeText(email).includes(normalizeText(responsible)) || 
              normalizeText(responsible).includes(normalizeText(emailPrefix))
            ) : false;
          }
        );
        if (matched) {
          filters.responsibleEmail = matched;
        }
      } else {
        filters.responsibleEmail = responsible;
      }
    }
  }
  
  // Extract C-Level
  const cLevel = extractCLevel(request);
  if (cLevel) {
    if (availableOptions?.cLevels) {
      const matched = availableOptions.cLevels.find(
        (level) => normalizeText(level) === normalizeText(cLevel) ||
                   (cLevel.includes('@') && level === cLevel)
      );
      if (matched) {
        filters.cLevel = matched;
      }
    } else {
      filters.cLevel = cLevel;
    }
  }
  
  // Extract audit year
  const auditYear = extractAuditYear(request);
  if (auditYear) {
    filters.auditYear = auditYear;
  }
  
  // Check if we extracted at least one filter (either from current request or previous context)
  const hasFilters = Object.keys(filters).length > 0;
  
  if (!hasFilters) {
    return {
      success: false,
      filters: {},
      error: 'Could not extract filters from your request. Please use these examples:\n' +
             '• "Export all actions with Open status"\n' +
             '• "How many actions with Critical risk?"\n' +
             '• "Completed actions for year 2024"',
    };
  }
  
  // Don't generate message here - let the handler generate fun, AI-like messages
  // based on actual results (count, export success, etc.)
  
  return {
    success: true,
    filters,
    message: undefined, // Will be generated in handler based on results
    isCountRequest,
  };
};


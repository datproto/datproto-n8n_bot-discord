/**
 * Scrape Command Analysis Functions
 * URL and content analysis utilities
 */

const { logger } = require('../../lib/logging');
const { extractDomain } = require('./utils');

/**
 * Estimate content type based on URL
 * @param {string} url - URL to analyze
 * @returns {string} Estimated content type
 */
function estimateContentType(url) {
    const domain = extractDomain(url);
    const path = url.toLowerCase();
    
    // Check for common patterns
    if (domain.includes('github.com')) return 'code_repository';
    if (domain.includes('stackoverflow.com')) return 'qa_forum';
    if (domain.includes('wikipedia.org')) return 'encyclopedia';
    if (domain.includes('reddit.com')) return 'social_media';
    if (domain.includes('twitter.com') || domain.includes('x.com')) return 'social_media';
    if (domain.includes('linkedin.com')) return 'professional_network';
    if (domain.includes('medium.com') || domain.includes('blog')) return 'blog';
    if (domain.includes('news') || domain.includes('cnn.com') || domain.includes('bbc.com')) return 'news';
    
    // Check URL patterns
    if (path.includes('/blog/') || path.includes('/article/')) return 'blog';
    if (path.includes('/docs/') || path.includes('/documentation/')) return 'documentation';
    if (path.includes('/api/') || path.includes('/swagger/')) return 'api_docs';
    if (path.includes('/product/') || path.includes('/shop/')) return 'ecommerce';
    
    return 'general_web';
}

/**
 * Analyze extraction request complexity
 * @param {string} extractionRequest - The extraction request to analyze
 * @returns {Object} Analysis results
 */
function analyzeExtractionComplexity(extractionRequest) {
    const request = extractionRequest.toLowerCase();
    let score = 0;
    const factors = [];
    
    // Simple extraction patterns
    if (request.includes('title') || request.includes('heading') || request.includes('text')) {
        score += 1;
        factors.push('basic_text');
    }
    
    // Moderate complexity patterns
    if (request.includes('table') || request.includes('list') || request.includes('link')) {
        score += 2;
        factors.push('structured_data');
    }
    
    // Complex extraction patterns
    const complexPatterns = [
        'javascript', 'dynamic', 'interactive', 'form', 'button',
        'nested', 'deep', 'related', 'analysis', 'pattern'
    ];
    if (complexPatterns.some(pattern => request.includes(pattern))) {
        score += 3;
        factors.push('complex_extraction');
    }
    
    // Multiple data types
    const dataTypes = ['text', 'image', 'link', 'table', 'list', 'form'];
    const mentionedTypes = dataTypes.filter(type => request.includes(type));
    if (mentionedTypes.length > 2) {
        score += 2;
        factors.push('multiple_types');
    }
    
    return {
        score,
        factors,
        mentionedTypes
    };
}

/**
 * Assess URL accessibility and processing requirements
 * @param {string} url - URL to assess
 * @returns {Object} Accessibility assessment
 */
function assessUrlAccessibility(url) {
    const domain = extractDomain(url);
    const path = url.toLowerCase();
    
    const assessment = {
        isPublic: true,
        requiresAuth: false,
        riskLevel: 'low',
        warnings: [],
        processingHints: {}
    };
    
    // Check for authentication requirements
    if (path.includes('/login/') || path.includes('/auth/') || path.includes('/signin/')) {
        assessment.requiresAuth = true;
        assessment.riskLevel = 'medium';
        assessment.warnings.push('URL may require authentication');
        assessment.processingHints.needsAuth = true;
    }
    
    // Check for paywall indicators
    if (domain.includes('paywall') || path.includes('/premium/') || path.includes('/subscription/')) {
        assessment.isPublic = false;
        assessment.riskLevel = 'high';
        assessment.warnings.push('URL may be behind a paywall');
        assessment.processingHints.paywall = true;
    }
    
    // Check for rate-limited sites
    const rateLimitedDomains = ['twitter.com', 'x.com', 'instagram.com', 'facebook.com'];
    if (rateLimitedDomains.some(d => domain.includes(d))) {
        assessment.riskLevel = 'medium';
        assessment.warnings.push('Site may have strict rate limiting');
        assessment.processingHints.rateLimited = true;
    }
    
    // JavaScript-heavy sites
    const jsSites = ['social_media', 'ecommerce'];
    const contentType = estimateContentType(url);
    if (jsSites.includes(contentType)) {
        assessment.processingHints.needsJavaScript = true;
    }
    
    return assessment;
}

/**
 * Determine site-specific processing characteristics
 * @param {string} url - URL to analyze
 * @returns {Object} Site characteristics
 */
function determineSiteCharacteristics(url) {
    const domain = extractDomain(url);
    const contentType = estimateContentType(url);
    
    const characteristics = {
        loadSpeed: 'normal',
        reliability: 'medium',
        complexity: 'moderate',
        specialHandling: []
    };
    
    // Government and academic sites (often slower)
    const slowDomains = [
        'government', '.gov', 'archive.org', 'academic', '.edu',
        'library', 'research'
    ];
    if (slowDomains.some(pattern => domain.includes(pattern))) {
        characteristics.loadSpeed = 'slow';
        characteristics.reliability = 'high';
        characteristics.specialHandling.push('extended_timeout');
    }
    
    // Reliable, well-structured sites
    const reliableDomains = ['wikipedia.org', 'github.com', 'stackoverflow.com'];
    if (reliableDomains.some(d => domain.includes(d))) {
        characteristics.reliability = 'high';
        characteristics.complexity = 'simple';
        characteristics.specialHandling.push('aggressive_retry');
    }
    
    // Social media and dynamic sites
    const dynamicSites = ['social_media', 'ecommerce'];
    if (dynamicSites.includes(contentType)) {
        characteristics.complexity = 'complex';
        characteristics.specialHandling.push('javascript_rendering', 'wait_for_load');
    }
    
    // News sites (often have ads and dynamic content)
    if (contentType === 'news') {
        characteristics.complexity = 'moderate';
        characteristics.specialHandling.push('ad_blocker', 'content_filtering');
    }
    
    return characteristics;
}

module.exports = {
    estimateContentType,
    analyzeExtractionComplexity,
    assessUrlAccessibility,
    determineSiteCharacteristics
};

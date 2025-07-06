/**
 * Scrape Command Processing Logic
 * Advanced processing hints and strategy determination
 */

const { logger } = require('../../lib/logging');
const { extractDomain } = require('./utils');
const { 
    estimateContentType, 
    analyzeExtractionComplexity, 
    assessUrlAccessibility,
    determineSiteCharacteristics 
} = require('./analysis');

/**
 * Determine processing priority based on extraction request complexity
 * @param {string} extractionRequest - The extraction request to analyze
 * @returns {string} Priority level: 'low', 'medium', 'high'
 */
function determinePriority(extractionRequest) {
    const request = extractionRequest.toLowerCase();
    let priority = 'medium'; // default
    
    // High priority indicators
    const highPriorityPatterns = [
        'urgent', 'asap', 'quickly', 'fast', 'emergency', 'critical',
        'real-time', 'live', 'breaking', 'latest'
    ];
    
    // Low priority indicators
    const lowPriorityPatterns = [
        'archive', 'historical', 'old', 'background', 'batch',
        'bulk', 'when convenient', 'no rush'
    ];
    
    if (highPriorityPatterns.some(pattern => request.includes(pattern))) {
        priority = 'high';
    } else if (lowPriorityPatterns.some(pattern => request.includes(pattern))) {
        priority = 'low';
    }
    
    logger.debug('Determined processing priority', { 
        extractionRequest: extractionRequest.substring(0, 100),
        priority 
    });
    
    return priority;
}

/**
 * Estimate processing complexity based on URL and extraction requirements
 * @param {string} url - Target URL
 * @param {string} extractionRequest - What needs to be extracted
 * @returns {string} Complexity level: 'simple', 'moderate', 'complex'
 */
function estimateComplexity(url, extractionRequest) {
    const contentType = estimateContentType(url);
    const extractionAnalysis = analyzeExtractionComplexity(extractionRequest);
    
    let complexityScore = 0;
    
    // Content type complexity
    const contentComplexity = {
        'general_web': 1,
        'blog': 1,
        'news': 1,
        'documentation': 2,
        'ecommerce': 2,
        'social_media': 3,
        'code_repository': 3,
        'api_docs': 2,
        'qa_forum': 2,
        'professional_network': 3,
        'encyclopedia': 1
    };
    
    complexityScore += contentComplexity[contentType] || 2;
    complexityScore += extractionAnalysis.score;
    
    // Determine final complexity
    let complexity;
    if (complexityScore <= 3) {
        complexity = 'simple';
    } else if (complexityScore <= 6) {
        complexity = 'moderate';
    } else {
        complexity = 'complex';
    }
    
    logger.debug('Estimated processing complexity', {
        url: extractDomain(url),
        contentType,
        complexityScore,
        complexity,
        extractionFactors: extractionAnalysis.factors
    });
    
    return complexity;
}

/**
 * Suggest appropriate timeout based on URL and complexity
 * @param {string} url - Target URL
 * @param {string} extractionRequest - Extraction requirements
 * @returns {number} Suggested timeout in milliseconds
 */
function suggestTimeout(url, extractionRequest) {
    const baseTimeout = 30000; // 30 seconds
    const complexity = estimateComplexity(url, extractionRequest);
    const siteCharacteristics = determineSiteCharacteristics(url);
    
    let timeoutMultiplier = 1;
    
    // Complexity-based adjustments
    switch (complexity) {
        case 'simple':
            timeoutMultiplier = 0.8;
            break;
        case 'moderate':
            timeoutMultiplier = 1.2;
            break;
        case 'complex':
            timeoutMultiplier = 2.0;
            break;
    }
    
    // Site characteristics adjustments
    switch (siteCharacteristics.loadSpeed) {
        case 'slow':
            timeoutMultiplier += 0.5;
            break;
        case 'fast':
            timeoutMultiplier -= 0.2;
            break;
    }
    
    const suggestedTimeout = Math.round(baseTimeout * timeoutMultiplier);
    
    logger.debug('Suggested timeout', {
        domain: extractDomain(url),
        complexity,
        loadSpeed: siteCharacteristics.loadSpeed,
        multiplier: timeoutMultiplier,
        suggestedTimeout
    });
    
    return Math.min(suggestedTimeout, 120000); // Cap at 2 minutes
}

/**
 * Determine retry strategy based on URL characteristics
 * @param {string} url - Target URL
 * @returns {Object} Retry strategy configuration
 */
function determineRetryStrategy(url) {
    const siteCharacteristics = determineSiteCharacteristics(url);
    const accessibility = assessUrlAccessibility(url);
    
    const strategy = {
        maxRetries: 3,
        backoffType: 'exponential',
        initialDelay: 1000,
        maxDelay: 10000,
        retryableErrors: ['timeout', 'connection', '5xx'],
        skipRetryErrors: ['4xx', 'auth', 'paywall']
    };
    
    // Adjust based on site characteristics
    if (accessibility.riskLevel === 'high') {
        strategy.maxRetries = 1;
        strategy.initialDelay = 2000;
    }
    
    // Use site characteristics for strategy
    if (siteCharacteristics.specialHandling.includes('aggressive_retry')) {
        strategy.maxRetries = 5;
        strategy.initialDelay = 500;
    }
    
    if (accessibility.processingHints.rateLimited) {
        strategy.maxRetries = 2;
        strategy.backoffType = 'linear';
        strategy.initialDelay = 5000;
        strategy.retryableErrors.push('rate_limit');
    }
    
    logger.debug('Determined retry strategy', {
        domain: extractDomain(url),
        riskLevel: accessibility.riskLevel,
        reliability: siteCharacteristics.reliability,
        strategy
    });
    
    return strategy;
}

/**
 * Generate processing recommendations for N8N workflow
 * @param {string} url - Target URL
 * @param {string} extractionRequest - Extraction requirements
 * @returns {Object} Processing recommendations
 */
function generateProcessingRecommendations(url, extractionRequest) {
    const contentType = estimateContentType(url);
    const complexity = estimateComplexity(url, extractionRequest);
    const accessibility = assessUrlAccessibility(url);
    const siteCharacteristics = determineSiteCharacteristics(url);
    
    const recommendations = {
        useJavaScript: false,
        waitForLoad: false,
        userAgent: 'bot',
        respectRobots: true,
        cacheResponse: false,
        validateContent: true
    };
    
    // Use processing hints from accessibility analysis
    if (accessibility.processingHints.needsJavaScript || 
        siteCharacteristics.specialHandling.includes('javascript_rendering')) {
        recommendations.useJavaScript = true;
        recommendations.waitForLoad = true;
    }
    
    // Sites requiring human-like behavior
    if (accessibility.riskLevel === 'medium' || accessibility.riskLevel === 'high') {
        recommendations.userAgent = 'browser';
        recommendations.waitForLoad = true;
    }
    
    // Cacheable content
    const cacheableTypes = ['documentation', 'encyclopedia', 'blog'];
    if (cacheableTypes.includes(contentType) && complexity === 'simple') {
        recommendations.cacheResponse = true;
    }
    
    return recommendations;
}

module.exports = {
    determinePriority,
    estimateComplexity,
    suggestTimeout,
    determineRetryStrategy,
    generateProcessingRecommendations
};

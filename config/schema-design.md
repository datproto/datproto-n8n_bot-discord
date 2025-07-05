# Configuration Schema Design

## Overview
This document defines the schema and structure for the Discord N8N Bot configuration system.

## Configuration Structure

### Main Configuration Object
```javascript
{
  "endpoints": {
    "scrape": {
      "url": "string (required)",
      "timeout": "number (default: 30000)",
      "retries": "number (default: 3)",
      "priority": "number (default: 1)",
      "enabled": "boolean (default: true)"
    },
    "analyze": {
      "url": "string (required)", 
      "timeout": "number (default: 30000)",
      "retries": "number (default: 3)",
      "priority": "number (default: 1)",
      "enabled": "boolean (default: true)"
    },
    "monitor": {
      "url": "string (required)",
      "timeout": "number (default: 30000)", 
      "retries": "number (default: 3)",
      "priority": "number (default: 1)",
      "enabled": "boolean (default: true)"
    },
    "notify": {
      "url": "string (required)",
      "timeout": "number (default: 30000)",
      "retries": "number (default: 3)", 
      "priority": "number (default: 1)",
      "enabled": "boolean (default: true)"
    }
  },
  "environments": {
    "development": {
      "overrides": "object (optional)",
      "logLevel": "string (default: 'debug')",
      "healthCheckInterval": "number (default: 30000)"
    },
    "staging": {
      "overrides": "object (optional)",
      "logLevel": "string (default: 'info')",
      "healthCheckInterval": "number (default: 60000)"
    },
    "production": {
      "overrides": "object (optional)",
      "logLevel": "string (default: 'error')",
      "healthCheckInterval": "number (default: 300000)"
    }
  },
  "global": {
    "rateLimiting": {
      "perUser": "number (default: 10)",
      "global": "number (default: 100)",
      "windowMs": "number (default: 60000)"
    },
    "queue": {
      "maxSize": "number (default: 1000)",
      "concurrency": "number (default: 5)"
    },
    "monitoring": {
      "enabled": "boolean (default: true)",
      "metricsRetention": "number (default: 86400000)"
    }
  }
}
```

## Schema Rules

### Required Fields
- `endpoints.<command>.url` - Must be valid HTTP/HTTPS URL
- Environment must be one of: 'development', 'staging', 'production'

### Default Values
- `timeout`: 30000ms (30 seconds)
- `retries`: 3 attempts
- `priority`: 1 (higher numbers = higher priority)
- `enabled`: true

### Validation Rules
1. **URL Validation**: All endpoint URLs must be valid HTTP/HTTPS URLs
2. **Timeout Range**: 1000ms ≤ timeout ≤ 300000ms (5 minutes max)
3. **Retry Range**: 0 ≤ retries ≤ 10
4. **Priority Range**: 1 ≤ priority ≤ 10
5. **Rate Limiting**: All rate limit values must be positive integers
6. **Queue Size**: 1 ≤ maxSize ≤ 10000

### Environment Override Behavior
Environment-specific overrides merge with base configuration:
1. Load base configuration from endpoints.json
2. Apply environment-specific overrides
3. Apply environment variables (highest priority)

### Environment Variable Mapping
- `N8N_<COMMAND>_URL` → `endpoints.<command>.url`
- `N8N_<COMMAND>_TIMEOUT` → `endpoints.<command>.timeout`
- `RATE_LIMIT_PER_USER` → `global.rateLimiting.perUser`
- `LOG_LEVEL` → `environments.<env>.logLevel`

## File Structure
```
config/
├── schema.js           # Joi validation schemas
├── endpoints.json      # Base endpoint configurations
├── environment.js      # Environment detection and loading
└── defaults.js         # Default configuration values
```

## Configuration Loading Order (Priority)
1. **Defaults** (lowest priority)
2. **Base Configuration** (endpoints.json)
3. **Environment Overrides** (environments section)
4. **Environment Variables** (highest priority)

## Hot-Reloading Support
- Watch `endpoints.json` for changes
- Re-validate on reload
- Emit configuration change events
- Graceful fallback on validation errors

## Error Handling
- Invalid configurations should log errors and use fallbacks
- Missing required fields should prevent startup
- Runtime validation errors should be logged but not crash the application

## Security Considerations
- URLs should be validated to prevent SSRF attacks
- Sensitive data should come from environment variables only
- Configuration files should not contain secrets

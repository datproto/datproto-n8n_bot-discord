const { BaseError } = require('./base');

/**
 * Discord Error
 * For Discord API and interaction-related errors
 */
class DiscordError extends BaseError {
  constructor(message, interactionId = null, details = {}) {
    super(message, 'DISCORD_ERROR', 400, { interactionId, ...details });
  }

  static commandNotFound(commandName) {
    return new DiscordError(
      `Discord command not found: ${commandName}`,
      null,
      { commandName, type: 'command_not_found' }
    );
  }

  static interactionFailed(interactionId, originalError) {
    return new DiscordError(
      `Discord interaction failed: ${originalError.message}`,
      interactionId,
      { originalError: originalError.message, type: 'interaction_failed' }
    );
  }

  static permissionDenied(interactionId, requiredPermission) {
    return new DiscordError(
      `Insufficient permissions: ${requiredPermission} required`,
      interactionId,
      { requiredPermission, type: 'permission_denied' }
    );
  }

  static rateLimited(interactionId, retryAfter) {
    return new DiscordError(
      `Discord API rate limited, retry after ${retryAfter}ms`,
      interactionId,
      { retryAfter, type: 'rate_limited' }
    );
  }

  static channelNotAccessible(interactionId, channelId) {
    return new DiscordError(
      `Cannot access Discord channel: ${channelId}`,
      interactionId,
      { channelId, type: 'channel_not_accessible' }
    );
  }
}

/**
 * Circuit Breaker Error
 * For circuit breaker-related errors
 */
class CircuitBreakerError extends BaseError {
  constructor(message, service = null, details = {}) {
    super(message, 'CIRCUIT_BREAKER_ERROR', 503, { service, ...details });
  }

  static circuitOpen(service, failures) {
    return new CircuitBreakerError(
      `Circuit breaker open for service: ${service}`,
      service,
      { failures, type: 'circuit_open' }
    );
  }

  static circuitHalfOpen(service) {
    return new CircuitBreakerError(
      `Circuit breaker half-open for service: ${service}`,
      service,
      { type: 'circuit_half_open' }
    );
  }

  static serviceUnavailable(service) {
    return new CircuitBreakerError(
      `Service unavailable: ${service}`,
      service,
      { type: 'service_unavailable' }
    );
  }
}

/**
 * Rate Limit Error
 * For rate limiting and throttling errors
 */
class RateLimitError extends BaseError {
  constructor(message, limit = null, details = {}) {
    super(message, 'RATE_LIMIT_ERROR', 429, { limit, ...details });
  }

  static requestLimitExceeded(limit, window) {
    return new RateLimitError(
      `Request limit exceeded: ${limit} requests per ${window}`,
      limit,
      { window, type: 'request_limit_exceeded' }
    );
  }

  static concurrencyLimitExceeded(limit) {
    return new RateLimitError(
      `Concurrent request limit exceeded: ${limit}`,
      limit,
      { type: 'concurrency_limit_exceeded' }
    );
  }

  static quotaExceeded(quota, period) {
    return new RateLimitError(
      `Quota exceeded: ${quota} for period ${period}`,
      quota,
      { period, type: 'quota_exceeded' }
    );
  }
}

/**
 * Service Error
 * For general service-level errors
 */
class ServiceError extends BaseError {
  constructor(message, service = null, details = {}) {
    super(message, 'SERVICE_ERROR', 500, { service, ...details });
  }

  static initializationFailed(service, originalError) {
    return new ServiceError(
      `Service initialization failed: ${service}`,
      service,
      { originalError: originalError.message, type: 'initialization_failed' }
    );
  }

  static healthCheckFailed(service, endpoint) {
    return new ServiceError(
      `Health check failed for service: ${service}`,
      service,
      { endpoint, type: 'health_check_failed' }
    );
  }

  static dependencyUnavailable(service, dependency) {
    return new ServiceError(
      `Dependency unavailable for service ${service}: ${dependency}`,
      service,
      { dependency, type: 'dependency_unavailable' }
    );
  }

  static shutdownTimeout(service, timeout) {
    return new ServiceError(
      `Service shutdown timeout: ${service} (${timeout}ms)`,
      service,
      { timeout, type: 'shutdown_timeout' }
    );
  }
}

/**
 * Authentication Error
 * For authentication and authorization errors
 */
class AuthError extends BaseError {
  constructor(message, userId = null, details = {}) {
    super(message, 'AUTH_ERROR', 401, { userId, ...details });
  }

  static tokenInvalid() {
    return new AuthError(
      'Invalid authentication token',
      null,
      { type: 'token_invalid' }
    );
  }

  static tokenExpired(userId) {
    return new AuthError(
      'Authentication token expired',
      userId,
      { type: 'token_expired' }
    );
  }

  static insufficientPermissions(userId, requiredRole) {
    return new AuthError(
      `Insufficient permissions: ${requiredRole} required`,
      userId,
      { requiredRole, type: 'insufficient_permissions' }
    );
  }
}

module.exports = {
  DiscordError,
  CircuitBreakerError,
  RateLimitError,
  ServiceError,
  AuthError
};

// serviceHealth.ts

/**
 * Interface representing the health status of a service.
 */
interface ServiceHealth {
  isHealthy: boolean;
  failureCount: number;
  lastCheck: number;
  cooldownUntil: number;
}

/**
 * ServiceHealthMonitor is a singleton that tracks the health of various services.
 * It monitors failures and enforces a cooldown period if a service exceeds a defined failure threshold.
 */
export class ServiceHealthMonitor {
  private static instance: ServiceHealthMonitor;
  private healthMap: Map<string, ServiceHealth>;

  // Maximum number of consecutive failures before marking a service as unhealthy.
  private readonly maxFailures = 3;
  // Cooldown period (in milliseconds) after which the service health is re-evaluated.
  private readonly cooldownPeriod = 60000; // 1 minute
  // Time threshold (in milliseconds) to consider a service health check as fresh.
  private readonly healthyThreshold = 300000; // 5 minutes

  /**
   * Private constructor for singleton pattern.
   */
  private constructor() {
    this.healthMap = new Map();
  }

  /**
   * Returns the singleton instance of ServiceHealthMonitor.
   */
  static getInstance(): ServiceHealthMonitor {
    if (!ServiceHealthMonitor.instance) {
      ServiceHealthMonitor.instance = new ServiceHealthMonitor();
    }
    return ServiceHealthMonitor.instance;
  }

  /**
   * Checks if the specified service is healthy.
   * Resets the health status if the cooldown period or threshold has passed.
   *
   * @param serviceName - The name of the service to check.
   * @returns True if the service is healthy; otherwise, false.
   */
  isHealthy(serviceName: string): boolean {
    const now = Date.now();
    const health = this.getServiceHealth(serviceName);

    // Reset the service's health if the cooldown period has passed.
    if (health.cooldownUntil > 0 && now > health.cooldownUntil) {
      health.isHealthy = true;
      health.failureCount = 0;
      health.cooldownUntil = 0;
    }

    // Reset the service's health if the last check is too old.
    if (now - health.lastCheck > this.healthyThreshold) {
      health.isHealthy = true;
      health.failureCount = 0;
    }

    return health.isHealthy;
  }

  /**
   * Reports a successful operation for a service, resetting its failure count and cooldown.
   *
   * @param serviceName - The name of the service.
   */
  reportSuccess(serviceName: string): void {
    const health = this.getServiceHealth(serviceName);
    health.isHealthy = true;
    health.failureCount = 0;
    health.lastCheck = Date.now();
    health.cooldownUntil = 0;
  }

  /**
   * Reports a failure for a service. If the number of failures exceeds the maximum threshold,
   * the service is marked as unhealthy and placed in a cooldown period.
   *
   * @param serviceName - The name of the service.
   */
  reportFailure(serviceName: string): void {
    const health = this.getServiceHealth(serviceName);
    health.failureCount++;
    health.lastCheck = Date.now();

    if (health.failureCount >= this.maxFailures) {
      health.isHealthy = false;
      health.cooldownUntil = Date.now() + this.cooldownPeriod;
    }
  }

  /**
   * Retrieves the current health status of a service.
   * If the service is not already tracked, it is initialized as healthy.
   *
   * @param serviceName - The name of the service.
   * @returns The ServiceHealth object for the service.
   */
  private getServiceHealth(serviceName: string): ServiceHealth {
    if (!this.healthMap.has(serviceName)) {
      this.healthMap.set(serviceName, {
        isHealthy: true,
        failureCount: 0,
        lastCheck: Date.now(),
        cooldownUntil: 0,
      });
    }
    return this.healthMap.get(serviceName)!;
  }
}

interface InstanceHealth {
  isHealthy: boolean;
  lastCheck: number;
  consecutiveFailures: number;
  lastFailure: number;
}

const instanceHealthMap = new Map<string, InstanceHealth>();

const HEALTH_CHECK_EXPIRY = 5 * 60 * 1000; // 5 minutes
const COOLDOWN_PERIOD = 30 * 1000; // 30 seconds

export function updateInstanceHealth(instance: string, isSuccessful: boolean): void {
  const currentHealth = instanceHealthMap.get(instance) || {
    isHealthy: true,
    lastCheck: Date.now(),
    consecutiveFailures: 0,
    lastFailure: 0
  };

  if (isSuccessful) {
    instanceHealthMap.set(instance, {
      isHealthy: true,
      lastCheck: Date.now(),
      consecutiveFailures: 0,
      lastFailure: currentHealth.lastFailure
    });
  } else {
    const now = Date.now();
    const timeSinceLastFailure = now - currentHealth.lastFailure;

    // If we're in cooldown period, don't increment failures
    if (timeSinceLastFailure < COOLDOWN_PERIOD) {
      return;
    }

    const consecutiveFailures = currentHealth.consecutiveFailures + 1;
    instanceHealthMap.set(instance, {
      isHealthy: consecutiveFailures < 2, // Allow one retry
      lastCheck: now,
      consecutiveFailures,
      lastFailure: now
    });
  }
}

export async function getHealthyInstances(): Promise<string[]> {
  const now = Date.now();
  
  // Clear expired health checks
  for (const [instance, health] of instanceHealthMap.entries()) {
    if (now - health.lastCheck > HEALTH_CHECK_EXPIRY) {
      instanceHealthMap.delete(instance);
    }
  }

  return Array.from(instanceHealthMap.entries())
    .filter(([_, health]) => health.isHealthy)
    .map(([instance]) => instance);
}

// Reset instance health periodically
setInterval(() => {
  const now = Date.now();
  for (const [instance, health] of instanceHealthMap.entries()) {
    // Reset instances that haven't been checked recently
    if (now - health.lastCheck > HEALTH_CHECK_EXPIRY) {
      instanceHealthMap.delete(instance);
    }
    // Reset failed instances after cooldown
    else if (!health.isHealthy && now - health.lastFailure > COOLDOWN_PERIOD) {
      instanceHealthMap.set(instance, {
        ...health,
        isHealthy: true,
        consecutiveFailures: 0
      });
    }
  }
}, HEALTH_CHECK_EXPIRY);
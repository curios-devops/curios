interface InstanceHealth {
  isHealthy: boolean;
  lastCheck: number;
  consecutiveFailures: number;
}

const instanceHealthMap = new Map<string, InstanceHealth>();

const MAX_CONSECUTIVE_FAILURES = 3;
const HEALTH_CHECK_EXPIRY = 5 * 60 * 1000; // 5 minutes

export function updateInstanceHealth(instance: string, isSuccessful: boolean): void {
  const currentHealth = instanceHealthMap.get(instance) || {
    isHealthy: true,
    lastCheck: Date.now(),
    consecutiveFailures: 0,
  };

  if (isSuccessful) {
    instanceHealthMap.set(instance, {
      isHealthy: true,
      lastCheck: Date.now(),
      consecutiveFailures: 0,
    });
  } else {
    const consecutiveFailures = currentHealth.consecutiveFailures + 1;
    instanceHealthMap.set(instance, {
      isHealthy: consecutiveFailures < MAX_CONSECUTIVE_FAILURES,
      lastCheck: Date.now(),
      consecutiveFailures,
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
  instanceHealthMap.clear();
}, HEALTH_CHECK_EXPIRY);
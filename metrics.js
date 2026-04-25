// Metrics — this is your proof for ILF
// Every transaction gets logged here

const metrics = {
  totalRequests: 0,
  totalPaymentsConfirmed: 0,
  totalExecutions: 0,
  totalLatencyMs: 0,
  log: []
};

export function recordCall(latencyMs) {
  metrics.totalRequests++;
  metrics.totalExecutions++;
  metrics.totalLatencyMs += latencyMs;
  metrics.log.push({
    timestamp: new Date().toISOString(),
    type: 'execution',
    latencyMs
  });
}

export function recordPayment() {
  metrics.totalPaymentsConfirmed++;
  metrics.log.push({
    timestamp: new Date().toISOString(),
    type: 'payment_confirmed'
  });
}

export function getMetrics() {
  return {
    totalRequests: metrics.totalRequests,
    totalPaymentsConfirmed: metrics.totalPaymentsConfirmed,
    totalExecutions: metrics.totalExecutions,
    averageLatencyMs: metrics.totalExecutions > 0
      ? Math.round(metrics.totalLatencyMs / metrics.totalExecutions)
      : 0,
    summary: `${metrics.totalPaymentsConfirmed} real-time payments gated ${metrics.totalExecutions} executions`,
    log: metrics.log
  };
}

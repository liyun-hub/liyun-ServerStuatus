export type MetricsSnapshot = {
  nodeId: string;
  cpuUsage: number;
  memoryUsed: number;
  memoryTotal: number;
  memoryUsage: number;
  diskUsed: number;
  diskTotal: number;
  diskUsage: number;
  netRxRate: number;
  netTxRate: number;
  netRxTotal: number;
  netTxTotal: number;
  timestamp: number;
};

export type Node = {
  id: string;
  hostname: string;
  os: string;
  platform: string;
  platformVersion: string;
  kernel: string;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  totalMemory: number;
  totalDisk: number;
  ip: string;
  createdAt: number;
  updatedAt: number;
  lastSeenAt: number;
};

export type NodeSummary = Node & {
  latest?: MetricsSnapshot;
  online: boolean;
};

export type AlertRule = {
  id: number;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  consecutive: number;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type AlertEvent = {
  id: number;
  ruleId: number;
  ruleName: string;
  nodeId: string;
  status: "firing" | "resolved";
  value: number;
  message: string;
  createdAt: number;
};

/**
 * BrainInterfaces.ts - Core Brain System Interfaces
 * 🧠 Fundamental interfaces for the MaestroBrain ecosystem
 * Part of Maestro.ai Brain System
 */

// =============================================================================
// 🧠 CORE BRAIN MODULE INTERFACES
// =============================================================================

/**
 * Base interface that all Brain modules must implement
 */
export interface BrainModule {
  name: string;
  version: string;
  initialized: boolean;
  initialize(): Promise<void>;
  getStatus(): BrainModuleStatus;
}

/**
 * Status information for Brain modules
 */
export interface BrainModuleStatus {
  initialized: boolean;
  healthy: boolean;
  metrics: Record<string, any>;
}

/**
 * Core Brain system state
 */
export interface BrainState {
  isActive: boolean;
  mode: "learning" | "processing" | "idle" | "error";
  lastUpdate: Date;
  sessionId: string;
  uptime: number;
}

/**
 * Brain system event
 */
export interface BrainEvent {
  id: string;
  type: string;
  source: string;
  target?: string;
  timestamp: Date;
  priority: "low" | "medium" | "high" | "critical";
  data: any;
  metadata?: Record<string, any>;
}

/**
 * Intelligence processing request
 */
export interface IntelligenceRequest {
  id?: string;
  type: "analyze" | "generate" | "learn" | "recommend" | "process";
  audioData?: ArrayBuffer;
  context?: any;
  options?: IntelligenceOptions;
  priority?: "low" | "normal" | "high" | "urgent";
  timestamp?: number;
}

/**
 * Intelligence processing options
 */
export interface IntelligenceOptions {
  includeGuitar?: boolean;
  includeVocals?: boolean;
  includeComposition?: boolean;
  includeHarmony?: boolean;
  realTimeMode?: boolean;
  detailedAnalysis?: boolean;
  recordSession?: boolean;
  timeout?: number;
}

/**
 * Intelligence processing response
 */
export interface IntelligenceResponse {
  success: boolean;
  requestId: string;
  timestamp: Date;
  processingTime: number;
  results: IntelligenceResults;
  metadata: IntelligenceMetadata;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Intelligence processing results
 */
export interface IntelligenceResults {
  analysis?: any;
  generated?: any;
  recommendations?: string[];
  learned?: any;
  processed?: any;
  confidence?: number;
}

/**
 * Intelligence processing metadata
 */
export interface IntelligenceMetadata {
  requestId: string;
  processingTime: number;
  moduleVersions: Record<string, string>;
  dataSize?: number;
  algorithmUsed?: string;
  qualityScore?: number;
}

// =============================================================================
// 🔧 BRAIN CONFIGURATION INTERFACES
// =============================================================================

/**
 * Global Brain configuration
 */
export interface BrainConfig {
  modules: ModuleConfig[];
  connections: BrainConnection[];
  globalSettings: GlobalSettings;
  performance: PerformanceConfig;
  security: SecurityConfig;
}

/**
 * Individual module configuration
 */
export interface ModuleConfig {
  id: string;
  name: string;
  enabled: boolean;
  settings: Record<string, any>;
  dependencies: string[];
  resources: ResourceLimits;
  initializationOrder?: number;
}

/**
 * Resource limits for modules
 */
export interface ResourceLimits {
  maxMemory?: number; // MB
  maxCpu?: number; // percentage
  timeout?: number; // seconds
  maxConcurrentOperations?: number;
}

/**
 * Brain connection configuration
 */
export interface BrainConnection {
  from: string;
  to: string;
  type: "data" | "control" | "feedback" | "sync";
  active: boolean;
  latency?: number;
  bandwidth?: number;
  encryption?: boolean;
}

/**
 * Global Brain settings
 */
export interface GlobalSettings {
  logLevel: "debug" | "info" | "warn" | "error";
  maxConcurrentAnalyses: number;
  audioBufferSize: number;
  sampleRate: number;
  enableTelemetry: boolean;
  enableCaching: boolean;
  cacheSize: number;
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  enableParallelProcessing: boolean;
  maxWorkerThreads: number;
  memoryLimit: number;
  gcInterval: number;
  enableProfiling: boolean;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  enableAuthentication: boolean;
  enableEncryption: boolean;
  allowedOrigins: string[];
  rateLimitRequests: number;
  rateLimitWindow: number;
}

// =============================================================================
// 🔍 BRAIN MONITORING INTERFACES
// =============================================================================

/**
 * Performance metrics for Brain modules
 */
export interface PerformanceMetrics {
  moduleId: string;
  cpuUsage: number; // 0-100
  memoryUsage: number; // MB
  responseTime: number; // ms
  throughput: number; // operations/second
  errorRate: number; // 0-1
  timestamp: number;
  customMetrics?: Record<string, number>;
}

/**
 * Health check results
 */
export interface HealthCheck {
  moduleId: string;
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  checks: HealthCheckItem[];
  lastCheck: number;
  nextCheck?: number;
}

/**
 * Individual health check item
 */
export interface HealthCheckItem {
  name: string;
  status: "pass" | "fail" | "warn";
  message?: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * System status overview
 */
export interface SystemStatus {
  isInitialized: boolean;
  sessionId: string;
  activeAnalyses: number;
  uptime: number;
  componentsStatus: Record<string, ComponentStatus>;
  performance: SystemPerformance;
  errors: SystemError[];
}

/**
 * Component status
 */
export interface ComponentStatus {
  name: string;
  status: "ready" | "initializing" | "error" | "disabled";
  lastUpdate: number;
  errorCount: number;
  metrics?: PerformanceMetrics;
}

/**
 * System performance overview
 */
export interface SystemPerformance {
  totalMemoryUsage: number;
  totalCpuUsage: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  cacheHitRate: number;
  networkLatency: number;
}

// =============================================================================
// 🚨 ERROR HANDLING INTERFACES
// =============================================================================

/**
 * Brain system error
 */
export interface BrainError {
  id: string;
  moduleId: string;
  type: "system" | "analysis" | "communication" | "validation" | "timeout";
  code: string;
  message: string;
  stack?: string;
  context?: any;
  timestamp: number;
  severity: "low" | "medium" | "high" | "critical";
  recovered?: boolean;
}

/**
 * System error
 */
export interface SystemError {
  id: string;
  type: string;
  message: string;
  timestamp: number;
  severity: "low" | "medium" | "high" | "critical";
  moduleId?: string;
  context?: any;
}

/**
 * Error report
 */
export interface ErrorReport {
  errors: BrainError[];
  summary: ErrorSummary;
  period: TimePeriod;
  recommendations: string[];
}

/**
 * Error summary statistics
 */
export interface ErrorSummary {
  total: number;
  byModule: Record<string, number>;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  averagePerHour: number;
  recoveryRate: number;
}

/**
 * Time period definition
 */
export interface TimePeriod {
  start: number;
  end: number;
  duration: number;
}

// =============================================================================
// 🔄 LIFECYCLE INTERFACES
// =============================================================================

/**
 * Module lifecycle hooks
 */
export interface ModuleLifecycle {
  onInitialize?(config: ModuleConfig): Promise<void>;
  onStart?(): Promise<void>;
  onStop?(): Promise<void>;
  onDestroy?(): Promise<void>;
  onConfigChange?(newConfig: ModuleConfig): Promise<void>;
  onHealthCheck?(): Promise<HealthCheckItem[]>;
}

/**
 * Brain lifecycle events
 */
export interface LifecycleEvent {
  phase: "initialize" | "start" | "stop" | "destroy" | "error";
  moduleId: string;
  timestamp: number;
  success: boolean;
  duration: number;
  error?: BrainError;
}

// =============================================================================
// 🔌 PLUGIN INTERFACES
// =============================================================================

/**
 * Brain plugin interface
 */
export interface BrainPlugin extends BrainModule {
  pluginType: "analyzer" | "generator" | "processor" | "enhancer";
  supportedFormats?: string[];
  capabilities: string[];
  install(): Promise<void>;
  uninstall(): Promise<void>;
  configure(config: Record<string, any>): Promise<void>;
}

/**
 * Plugin manifest
 */
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  pluginType: string;
  capabilities: string[];
  dependencies: PluginDependency[];
  configuration: PluginConfigSchema;
}

/**
 * Plugin dependency
 */
export interface PluginDependency {
  name: string;
  version: string;
  optional: boolean;
}

/**
 * Plugin configuration schema
 */
export interface PluginConfigSchema {
  [key: string]: {
    type: "string" | "number" | "boolean" | "object" | "array";
    required: boolean;
    default?: any;
    description?: string;
    validation?: any;
  };
}

// =============================================================================
// 🎯 UTILITY TYPES
// =============================================================================

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Required fields type
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Optional fields type
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * Async function type
 */
export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;

/**
 * Event handler type
 */
export type EventHandler<T = any> = (event: T) => void | Promise<void>;

/**
 * Module factory type
 */
export type ModuleFactory<T extends BrainModule> = (config?: ModuleConfig) => T;

/**
 * CoordinationInterfaces.ts - System Coordination Interfaces
 * 🤝 Interfaces for system coordination, communication, and integration
 * Part of Maestro.ai Brain System
 */

// =============================================================================
// 🌐 COMMUNICATION INTERFACES
// =============================================================================

/**
 * Inter-module brain message
 */
export interface BrainMessage {
  id: string;
  from: string;
  to: string | string[];
  type:
    | "command"
    | "query"
    | "response"
    | "notification"
    | "event"
    | "heartbeat";
  payload: any;
  timestamp: number;
  priority: "low" | "normal" | "high" | "urgent";
  correlationId?: string;
  replyTo?: string;
  ttl?: number; // time to live in milliseconds
}

/**
 * Message routing information
 */
export interface MessageRoute {
  source: string;
  destination: string[];
  middleware: string[];
  encryption: boolean;
  compression: boolean;
  reliable: boolean;
}

/**
 * Communication channel configuration
 */
export interface CommunicationChannel {
  id: string;
  name: string;
  type: "internal" | "external" | "bridge";
  protocol: "websocket" | "http" | "ipc" | "tcp" | "custom";
  endpoint: string;
  authentication: ChannelAuthentication;
  rateLimiting: RateLimitConfig;
  encryption: EncryptionConfig;
  retryPolicy: RetryPolicy;
}

/**
 * Channel authentication
 */
export interface ChannelAuthentication {
  type: "none" | "api-key" | "jwt" | "oauth" | "certificate";
  credentials?: Record<string, any>;
  refreshable: boolean;
  expiresAt?: number;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
  backoffStrategy: "linear" | "exponential" | "fixed";
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  enabled: boolean;
  algorithm: string;
  keyRotation: boolean;
  rotationInterval: number;
}

/**
 * Retry policy
 */
export interface RetryPolicy {
  enabled: boolean;
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

// =============================================================================
// 🔄 EVENT SYSTEM INTERFACES
// =============================================================================

/**
 * System event
 */
export interface SystemEvent {
  id: string;
  type: string;
  source: string;
  target?: string;
  timestamp: Date;
  priority: "low" | "medium" | "high" | "critical";
  data: any;
  metadata?: EventMetadata;
  tags?: string[];
}

/**
 * Event metadata
 */
export interface EventMetadata {
  version: string;
  schema: string;
  correlationId?: string;
  causationId?: string;
  user?: string;
  sessionId?: string;
  traceId?: string;
  contextData?: Record<string, any>;
}

/**
 * Event handler configuration
 */
export interface EventHandler {
  id: string;
  name: string;
  eventTypes: string[];
  handler: (event: SystemEvent) => Promise<void>;
  priority: number;
  enabled: boolean;
  filter?: EventFilter;
  transform?: EventTransform;
}

/**
 * Event filter
 */
export interface EventFilter {
  conditions: FilterCondition[];
  operator: "AND" | "OR";
}

/**
 * Filter condition
 */
export interface FilterCondition {
  field: string;
  operator:
    | "equals"
    | "contains"
    | "startsWith"
    | "endsWith"
    | "regex"
    | "gt"
    | "lt"
    | "gte"
    | "lte";
  value: any;
  caseSensitive?: boolean;
}

/**
 * Event transform
 */
export interface EventTransform {
  mapping: Record<string, string>;
  enrichment?: Record<string, any>;
  validation?: ValidationRule[];
}

/**
 * Validation rule
 */
export interface ValidationRule {
  field: string;
  required: boolean;
  type: "string" | "number" | "boolean" | "object" | "array";
  format?: string;
  min?: number;
  max?: number;
  pattern?: string;
}

/**
 * Event subscription
 */
export interface EventSubscription {
  id: string;
  subscriberId: string;
  eventTypes: string[];
  callback: (event: SystemEvent) => void;
  filter?: EventFilter;
  active: boolean;
  createdAt: number;
  lastTriggered?: number;
}

/**
 * Event bus configuration
 */
export interface EventBusConfig {
  maxListeners: number;
  enableHistory: boolean;
  historySize: number;
  enableMetrics: boolean;
  enableTracing: boolean;
  deadLetterQueue: boolean;
  retryPolicy: RetryPolicy;
}

// =============================================================================
// 🤖 EXTERNAL INTEGRATION INTERFACES
// =============================================================================

/**
 * External module definition
 */
export interface ExternalModule {
  id: string;
  name: string;
  type: "cipher" | "maestro" | "ava" | "third-party" | "plugin";
  version: string;
  apiVersion: string;
  endpoints: string[];
  capabilities: string[];
  authentication?: ModuleAuthentication;
  lastContact: number;
  status: "connected" | "disconnected" | "error" | "authenticating";
  metadata?: Record<string, any>;
}

/**
 * Module authentication
 */
export interface ModuleAuthentication {
  type: "none" | "api-key" | "oauth" | "jwt" | "mutual-tls";
  credentials?: any;
  refreshToken?: string;
  expiresAt?: number;
}

/**
 * Integration message
 */
export interface IntegrationMessage {
  from: ExternalModule;
  to: string;
  type: "request" | "response" | "event" | "heartbeat";
  payload: any;
  timestamp: number;
  correlationId?: string;
  requestId?: string;
}

/**
 * Integration configuration
 */
export interface IntegrationConfig {
  moduleId: string;
  enabled: boolean;
  settings: Record<string, any>;
  endpoints: IntegrationEndpoint[];
  synchronization: SyncConfig;
  errorHandling: ErrorHandlingConfig;
  monitoring: MonitoringConfig;
}

/**
 * Integration endpoint
 */
export interface IntegrationEndpoint {
  name: string;
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "WebSocket";
  headers?: Record<string, string>;
  timeout: number;
  retryPolicy: RetryPolicy;
  circuitBreaker: CircuitBreakerConfig;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  fallbackEnabled: boolean;
}

/**
 * Synchronization configuration
 */
export interface SyncConfig {
  enabled: boolean;
  mode: "real-time" | "batch" | "scheduled";
  interval?: number; // for scheduled sync
  batchSize?: number; // for batch sync
  conflictResolution: "client-wins" | "server-wins" | "timestamp" | "manual";
  syncDirection: "bidirectional" | "push" | "pull";
}

/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
  retryFailedRequests: boolean;
  maxRetries: number;
  backoffStrategy: "linear" | "exponential" | "fixed";
  deadLetterQueue: boolean;
  alertOnError: boolean;
  escalationThreshold: number;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enableMetrics: boolean;
  enableTracing: boolean;
  enableLogging: boolean;
  metricsInterval: number;
  healthCheckInterval: number;
  performanceThresholds: PerformanceThresholds;
}

/**
 * Performance thresholds
 */
export interface PerformanceThresholds {
  responseTime: number; // ms
  throughput: number; // requests/second
  errorRate: number; // percentage
  availability: number; // percentage
}

// =============================================================================
// 🔄 ORCHESTRATION INTERFACES
// =============================================================================

/**
 * Orchestration workflow
 */
export interface OrchestrationWorkflow {
  id: string;
  name: string;
  description: string;
  version: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  variables: WorkflowVariable[];
  errorHandling: WorkflowErrorHandling;
  timeout?: number;
  retryPolicy?: RetryPolicy;
}

/**
 * Workflow step
 */
export interface WorkflowStep {
  id: string;
  name: string;
  type: "action" | "condition" | "loop" | "parallel" | "delay";
  action?: WorkflowAction;
  condition?: WorkflowCondition;
  loop?: WorkflowLoop;
  parallel?: WorkflowStep[];
  delay?: number;
  dependencies: string[]; // step IDs this depends on
  onSuccess?: string; // next step ID
  onFailure?: string; // failure step ID
}

/**
 * Workflow action
 */
export interface WorkflowAction {
  type: "module-call" | "http-request" | "transformation" | "validation";
  target: string; // module ID or endpoint
  method?: string;
  parameters: Record<string, any>;
  transform?: WorkflowTransform;
  validation?: ValidationRule[];
}

/**
 * Workflow condition
 */
export interface WorkflowCondition {
  expression: string; // JavaScript expression
  variables: string[];
  truePath: string; // step ID for true
  falsePath: string; // step ID for false
}

/**
 * Workflow loop
 */
export interface WorkflowLoop {
  type: "for" | "while" | "forEach";
  condition?: string; // for while loops
  collection?: string; // for forEach loops
  maxIterations: number;
  steps: WorkflowStep[];
}

/**
 * Workflow trigger
 */
export interface WorkflowTrigger {
  type: "event" | "schedule" | "manual" | "webhook";
  eventTypes?: string[];
  schedule?: ScheduleConfig;
  webhook?: WebhookConfig;
  enabled: boolean;
}

/**
 * Schedule configuration
 */
export interface ScheduleConfig {
  cron: string;
  timezone: string;
  enabled: boolean;
  startDate?: number;
  endDate?: number;
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  url: string;
  secret?: string;
  headers?: Record<string, string>;
  validation?: WebhookValidation;
}

/**
 * Webhook validation
 */
export interface WebhookValidation {
  signatureHeader: string;
  algorithm: string;
  encoding: "hex" | "base64";
}

/**
 * Workflow variable
 */
export interface WorkflowVariable {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  defaultValue?: any;
  required: boolean;
  description?: string;
}

/**
 * Workflow error handling
 */
export interface WorkflowErrorHandling {
  strategy: "fail-fast" | "continue" | "retry" | "compensate";
  maxRetries?: number;
  retryDelay?: number;
  compensationSteps?: WorkflowStep[];
  alertOnError: boolean;
}

/**
 * Workflow transform
 */
export interface WorkflowTransform {
  input: Record<string, string>; // input mapping
  output: Record<string, string>; // output mapping
  script?: string; // transformation script
}

/**
 * Workflow execution
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startTime: number;
  endTime?: number;
  currentStep?: string;
  variables: Record<string, any>;
  stepResults: Record<string, any>;
  errors: WorkflowError[];
  metrics: ExecutionMetrics;
}

/**
 * Workflow error
 */
export interface WorkflowError {
  stepId: string;
  errorType: string;
  message: string;
  timestamp: number;
  retryCount: number;
  fatal: boolean;
}

/**
 * Execution metrics
 */
export interface ExecutionMetrics {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  duration: number;
  averageStepDuration: number;
}

// =============================================================================
// 🔄 COLLABORATION INTERFACES
// =============================================================================

/**
 * Collaboration session
 */
export interface CollaborationSession {
  id: string;
  name: string;
  participants: SessionParticipant[];
  type: "jam" | "lesson" | "composition" | "performance" | "practice";
  status: "waiting" | "active" | "paused" | "ended";
  settings: SessionSettings;
  created: number;
  lastActivity: number;
  metadata?: Record<string, any>;
}

/**
 * Session participant
 */
export interface SessionParticipant {
  userId: string;
  name: string;
  role: "host" | "participant" | "observer";
  instrument: string;
  status: "active" | "inactive" | "disconnected";
  permissions: ParticipantPermissions;
  audioEnabled: boolean;
  videoEnabled: boolean;
  latency: number;
  lastSeen: number;
}

/**
 * Participant permissions
 */
export interface ParticipantPermissions {
  canControlSession: boolean;
  canChangeSettings: boolean;
  canInviteOthers: boolean;
  canRecordSession: boolean;
  canShareScreen: boolean;
  canUseBrainFeatures: boolean;
}

/**
 * Session settings
 */
export interface SessionSettings {
  key: string;
  tempo: number;
  timeSignature: string;
  genre: string;
  instruments: string[];
  maxParticipants: number;
  isPublic: boolean;
  recordSession: boolean;
  enableChat: boolean;
  enableVideoChat: boolean;
  clickTrack: boolean;
  synchronizePlayback: boolean;
}

/**
 * Real-time synchronization
 */
export interface RealtimeSync {
  sessionId: string;
  timestamp: number;
  syncPoint: SyncPoint;
  participants: ParticipantSync[];
  latencyCompensation: LatencyCompensation;
}

/**
 * Synchronization point
 */
export interface SyncPoint {
  measure: number;
  beat: number;
  subdivision: number;
  tempo: number;
  globalTime: number;
}

/**
 * Participant synchronization
 */
export interface ParticipantSync {
  userId: string;
  localTime: number;
  serverTime: number;
  latency: number;
  drift: number;
  synchronized: boolean;
}

/**
 * Latency compensation
 */
export interface LatencyCompensation {
  enabled: boolean;
  averageLatency: number;
  maxCompensation: number;
  adaptiveCompensation: boolean;
  bufferSize: number;
}

// =============================================================================
// 🔧 COORDINATION UTILITIES
// =============================================================================

/**
 * Service discovery
 */
export interface ServiceDiscovery {
  services: RegisteredService[];
  healthChecks: ServiceHealthCheck[];
  loadBalancing: LoadBalancingConfig;
}

/**
 * Registered service
 */
export interface RegisteredService {
  id: string;
  name: string;
  version: string;
  endpoints: ServiceEndpoint[];
  healthCheckUrl: string;
  tags: string[];
  metadata: Record<string, any>;
  registeredAt: number;
  lastHeartbeat: number;
}

/**
 * Service endpoint
 */
export interface ServiceEndpoint {
  protocol: string;
  host: string;
  port: number;
  path: string;
  weight: number;
  enabled: boolean;
}

/**
 * Service health check
 */
export interface ServiceHealthCheck {
  serviceId: string;
  status: "healthy" | "unhealthy" | "warning";
  lastCheck: number;
  responseTime: number;
  consecutiveFailures: number;
  details?: Record<string, any>;
}

/**
 * Load balancing configuration
 */
export interface LoadBalancingConfig {
  strategy: "round-robin" | "weighted" | "least-connections" | "random";
  healthCheckEnabled: boolean;
  failoverEnabled: boolean;
  stickySession: boolean;
  circuitBreaker: CircuitBreakerConfig;
}

/**
 * Coordination metrics
 */
export interface CoordinationMetrics {
  messagesSent: number;
  messagesReceived: number;
  averageLatency: number;
  failedMessages: number;
  activeConnections: number;
  throughput: number; // messages per second
  errorRate: number;
  uptime: number;
}

/**
 * Coordination status
 */
export interface CoordinationStatus {
  coordinatorId: string;
  status: "active" | "standby" | "error";
  connectedModules: string[];
  activeWorkflows: number;
  queuedMessages: number;
  metrics: CoordinationMetrics;
  lastUpdate: number;
}

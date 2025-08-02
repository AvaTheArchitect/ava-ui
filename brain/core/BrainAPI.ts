/**
 * 🌐 BrainAPI - External Brain API Interface
 * =========================================
 * Standardized API for external systems to interact with MaestroBrain
 */
import { generateId } from "../shared/utils";
import {
  IntelligenceEngine,
  IntelligenceRequest,
  IntelligenceResponse,
  IntelligenceMetrics,
} from "./IntelligenceEngine";
import { SystemOrchestrator, SystemEvent } from "./SystemOrchestrator";

// TODO: Import these from brain/shared/types.ts when available
// For now, using the actual structure from IntelligenceEngine
export interface FullAnalysis {
  id: string;
  timestamp: Date;
  audioFeatures?: any;
  musicalElements?: any;
  recommendations?: string[];
  [key: string]: any; // Allow additional properties from the real type
}

export interface SystemStatus {
  isInitialized: boolean;
  sessionId: string;
  activeAnalyses: number;
  uptime: number;
  componentsStatus: Record<string, string>;
}

export interface UserProfile {
  skill_level: "beginner" | "intermediate" | "advanced";
  instruments: string[];
  practice_goals: string[];
  preferences: Record<string, any>;
}

// Using actual structure from IntelligenceEngine
export interface MusicalSuggestions {
  chords?: string[];
  melody?: string[];
  tabs?: string;
  exercises?: string[];
}

// =============================================================================
// 🏷️ BRAIN API INTERFACES
// =============================================================================

export interface APIRequest {
  id?: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  endpoint: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  auth?: {
    type: "api_key" | "jwt" | "session" | "cipher_extension";
    token?: string;
    sessionId?: string;
  };
  metadata?: {
    clientId?: string;
    userAgent?: string;
    requestTime?: Date;
    priority?: "low" | "medium" | "high";
  };
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    requestId: string;
    timestamp: Date;
    processingTime: number;
    version: string;
    rateLimit?: {
      remaining: number;
      resetTime: Date;
    };
  };
}

export interface WebSocketMessage {
  type:
    | "analysis_update"
    | "system_status"
    | "real_time_feedback"
    | "error"
    | "ping"
    | "pong";
  data?: any;
  timestamp: Date;
  clientId?: string;
}

export interface APIClient {
  id: string;
  type:
    | "web_app"
    | "mobile_app"
    | "cipher_extension"
    | "external_service"
    | "developer_tool";
  name: string;
  version: string;
  permissions: string[];
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    currentUsage: number;
    resetTime: Date;
  };
  lastActivity: Date;
  isActive: boolean;
}

export interface APIEndpoint {
  path: string;
  method: string;
  description: string;
  requiredPermissions: string[];
  rateLimit?: number;
  cacheable?: boolean;
  realTime?: boolean;
}

// =============================================================================
// 🌐 BRAIN API CLASS
// =============================================================================

export class BrainAPI {
  private intelligenceEngine: IntelligenceEngine;
  private systemOrchestrator: SystemOrchestrator;

  private isInitialized: boolean = false;
  private clients: Map<string, APIClient> = new Map();
  private activeConnections: Map<string, WebSocket> = new Map();
  private requestLog: Map<string, APIRequest> = new Map();
  private endpoints: APIEndpoint[] = [];
  private version: string = "1.0.0";

  constructor() {
    console.log("🌐 BrainAPI initializing...");

    this.intelligenceEngine = new IntelligenceEngine();
    this.systemOrchestrator = new SystemOrchestrator();

    this.setupEndpoints();
  }

  /**
   * 🚀 Initialize the Brain API
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("⚠️ BrainAPI already initialized");
      return;
    }

    console.log("🌐 Initializing Brain API...");

    try {
      // Initialize core systems
      await Promise.all([
        this.intelligenceEngine.initialize(),
        this.systemOrchestrator.initialize(),
      ]);

      this.isInitialized = true;
      console.log("✅ BrainAPI fully initialized");
    } catch (error) {
      console.error("❌ BrainAPI initialization failed:", error);
      throw error;
    }
  }

  /**
   * 🔗 Process API request
   */
  async processRequest(request: APIRequest): Promise<APIResponse> {
    const requestId = request.id || generateId("req");
    const startTime = Date.now();

    console.log(
      `🔗 Processing API request: ${request.method} ${request.endpoint} (${requestId})`
    );

    try {
      // Validate request
      const validation = await this.validateRequest(request);
      if (!validation.valid) {
        return this.createErrorResponse(
          requestId,
          "VALIDATION_ERROR",
          validation.message || "Validation failed",
          startTime
        );
      }

      // Check rate limits
      const rateLimitCheck = await this.checkRateLimit(request);
      if (!rateLimitCheck.allowed) {
        return this.createErrorResponse(
          requestId,
          "RATE_LIMIT_EXCEEDED",
          "Rate limit exceeded",
          startTime
        );
      }

      // Route to appropriate handler
      const response = await this.routeRequest(request, requestId);

      // Log request
      this.logRequest(request, response);

      return response;
    } catch (error) {
      console.error(`❌ API request failed: ${requestId}`, error);
      return this.createErrorResponse(
        requestId,
        "INTERNAL_ERROR",
        error instanceof Error ? error.message : "Unknown error",
        startTime
      );
    }
  }

  /**
   * 🎵 Music Analysis API
   */
  async analyzeMusic(
    audioData: ArrayBuffer,
    options: any = {},
    clientId?: string
  ): Promise<APIResponse<FullAnalysis>> {
    const request: IntelligenceRequest = {
      type: "analyze",
      audioData,
      context: options.context,
      options: {
        includeGuitar: options.includeGuitar ?? true,
        includeVocals: options.includeVocals ?? true,
        includeComposition: options.includeComposition ?? true,
        realTimeMode: options.realTimeMode ?? false,
        detailedAnalysis: options.detailedAnalysis ?? true,
      },
    };

    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const response = await this.intelligenceEngine.processRequest(request);

      // Check if analysis exists
      if (!response.results.analysis) {
        throw new Error(
          "Analysis result not returned from intelligence engine"
        );
      }

      // Broadcast to real-time clients if enabled
      if (options.realTimeMode && clientId) {
        this.broadcastToClient(clientId, {
          type: "analysis_update",
          data: response.results.analysis,
          timestamp: new Date(),
        });
      }

      return {
        success: true,
        data: response.results.analysis,
        metadata: {
          requestId,
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: this.version,
        },
      };
    } catch (error) {
      return this.createErrorResponse(
        requestId,
        "ANALYSIS_ERROR",
        error instanceof Error ? error.message : "Music analysis failed",
        startTime
      );
    }
  }

  /**
   * 🎼 Musical Suggestions API
   */
  async generateSuggestions(
    context: any = {},
    clientId?: string
  ): Promise<APIResponse<MusicalSuggestions>> {
    const request: IntelligenceRequest = {
      type: "generate",
      context,
      options: {
        includeComposition: true,
      },
    };

    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const response = await this.intelligenceEngine.processRequest(request);

      // Check if suggestions exist
      if (!response.results.generated) {
        throw new Error(
          "Generated suggestions not returned from intelligence engine"
        );
      }

      return {
        success: true,
        data: response.results.generated,
        metadata: {
          requestId,
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: this.version,
        },
      };
    } catch (error) {
      return this.createErrorResponse(
        requestId,
        "GENERATION_ERROR",
        error instanceof Error ? error.message : "Suggestion generation failed",
        startTime
      );
    }
  }

  /**
   * 🎓 Personalized Learning API
   */
  async getPersonalizedRecommendations(
    userProfile?: UserProfile,
    clientId?: string
  ): Promise<APIResponse<string[]>> {
    const request: IntelligenceRequest = {
      type: "recommend",
      context: { userProfile },
      options: {},
    };

    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      const response = await this.intelligenceEngine.processRequest(request);

      return {
        success: true,
        data: response.results.recommendations || [],
        metadata: {
          requestId,
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: this.version,
        },
      };
    } catch (error) {
      return this.createErrorResponse(
        requestId,
        "RECOMMENDATION_ERROR",
        "Recommendation generation failed",
        startTime
      );
    }
  }

  /**
   * 📊 System Status API
   */
  async getSystemStatus(
    clientId?: string
  ): Promise<APIResponse<SystemStatus & { api: any }>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Get system metrics from intelligence engine
      const systemMetrics = this.intelligenceEngine.getSystemMetrics();

      // Get orchestration status
      const orchestrationStatus =
        this.systemOrchestrator.getOrchestrationStatus();

      const status = {
        isInitialized: this.isInitialized,
        sessionId: requestId,
        activeAnalyses: 0, // Would be retrieved from actual system
        uptime: Date.now() - startTime,
        componentsStatus: {
          intelligenceEngine: "ready",
          systemOrchestrator: "ready",
          brainAPI: "ready",
        },
        api: {
          version: this.version,
          activeClients: this.clients.size,
          activeConnections: this.activeConnections.size,
          totalRequests: this.requestLog.size,
          orchestration: orchestrationStatus,
        },
      };

      return {
        success: true,
        data: status,
        metadata: {
          requestId,
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
          version: this.version,
        },
      };
    } catch (error) {
      return this.createErrorResponse(
        requestId,
        "STATUS_ERROR",
        "Status retrieval failed",
        startTime
      );
    }
  }

  /**
   * 📡 WebSocket connection management
   */
  async handleWebSocketConnection(
    clientId: string,
    websocket: WebSocket
  ): Promise<void> {
    console.log(`📡 New WebSocket connection: ${clientId}`);

    this.activeConnections.set(clientId, websocket);

    websocket.onmessage = (event) => {
      this.handleWebSocketMessage(clientId, JSON.parse(event.data));
    };

    websocket.onclose = () => {
      console.log(`📡 WebSocket disconnected: ${clientId}`);
      this.activeConnections.delete(clientId);
    };

    websocket.onerror = (error) => {
      console.error(`📡 WebSocket error for ${clientId}:`, error);
      this.activeConnections.delete(clientId);
    };

    // Send welcome message
    this.sendWebSocketMessage(clientId, {
      type: "ping",
      data: { message: "Connected to MaestroBrain API", version: this.version },
      timestamp: new Date(),
    });
  }

  /**
   * 📱 Client registration
   */
  async registerClient(
    clientInfo: Omit<APIClient, "id" | "lastActivity" | "isActive">
  ): Promise<APIResponse<{ clientId: string; apiKey: string }>> {
    const clientId = this.generateClientId();
    const apiKey = this.generateAPIKey(clientId);

    const client: APIClient = {
      ...clientInfo,
      id: clientId,
      lastActivity: new Date(),
      isActive: true,
      rateLimit: {
        ...clientInfo.rateLimit,
        currentUsage: 0,
        resetTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      },
    };

    this.clients.set(clientId, client);

    console.log(`📱 Client registered: ${client.name} (${clientId})`);

    return {
      success: true,
      data: { clientId, apiKey },
      metadata: {
        requestId: this.generateRequestId(),
        timestamp: new Date(),
        processingTime: 0,
        version: this.version,
      },
    };
  }

  /**
   * 📋 Get API documentation
   */
  getAPIDocumentation(): APIResponse<{
    version: string;
    endpoints: APIEndpoint[];
    authentication: any;
    examples: any;
  }> {
    return {
      success: true,
      data: {
        version: this.version,
        endpoints: this.endpoints,
        authentication: {
          types: ["api_key", "jwt", "session", "cipher_extension"],
          description: "Multiple authentication methods supported",
        },
        examples: {
          analyzeMusic: {
            endpoint: "/api/v1/analyze",
            method: "POST",
            body: {
              audioData: "base64_encoded_audio",
              options: { includeGuitar: true },
            },
          },
          getRecommendations: {
            endpoint: "/api/v1/recommendations",
            method: "GET",
            query: { skill_level: "intermediate" },
          },
        },
      },
      metadata: {
        requestId: this.generateRequestId(),
        timestamp: new Date(),
        processingTime: 0,
        version: this.version,
      },
    };
  }

  // =============================================================================
  // 🛠️ PRIVATE API METHODS
  // =============================================================================

  private setupEndpoints(): void {
    this.endpoints = [
      {
        path: "/api/v1/analyze",
        method: "POST",
        description: "Analyze music audio with AI",
        requiredPermissions: ["music.analyze"],
        rateLimit: 30,
        realTime: true,
      },
      {
        path: "/api/v1/generate",
        method: "POST",
        description: "Generate musical suggestions",
        requiredPermissions: ["music.generate"],
        rateLimit: 60,
      },
      {
        path: "/api/v1/recommendations",
        method: "GET",
        description: "Get personalized recommendations",
        requiredPermissions: ["user.recommendations"],
        rateLimit: 100,
        cacheable: true,
      },
      {
        path: "/api/v1/status",
        method: "GET",
        description: "Get system status",
        requiredPermissions: ["system.status"],
        rateLimit: 200,
        cacheable: true,
      },
      {
        path: "/api/v1/learn",
        method: "POST",
        description: "Submit learning data",
        requiredPermissions: ["user.learn"],
        rateLimit: 50,
      },
      {
        path: "/ws/v1/realtime",
        method: "WebSocket",
        description: "Real-time updates and analysis",
        requiredPermissions: ["realtime.connect"],
        realTime: true,
      },
    ];
  }

  private async validateRequest(
    request: APIRequest
  ): Promise<{ valid: boolean; message?: string }> {
    // Basic validation
    if (!request.method || !request.endpoint) {
      return {
        valid: false,
        message: "Missing required fields: method, endpoint",
      };
    }

    // Find endpoint
    const endpoint = this.endpoints.find(
      (ep) => ep.path === request.endpoint && ep.method === request.method
    );

    if (!endpoint) {
      return { valid: false, message: "Endpoint not found" };
    }

    // Check authentication if required
    if (endpoint.requiredPermissions.length > 0 && !request.auth) {
      return { valid: false, message: "Authentication required" };
    }

    return { valid: true };
  }

  private async checkRateLimit(
    request: APIRequest
  ): Promise<{ allowed: boolean; remaining?: number }> {
    const clientId = request.auth?.sessionId || "anonymous";
    const client = this.clients.get(clientId);

    if (!client) {
      // Anonymous users get basic rate limiting
      return { allowed: true, remaining: 100 };
    }

    // Check if rate limit reset time has passed
    if (Date.now() > client.rateLimit.resetTime.getTime()) {
      client.rateLimit.currentUsage = 0;
      client.rateLimit.resetTime = new Date(Date.now() + 60 * 60 * 1000); // Reset to 1 hour from now
    }

    const remaining =
      client.rateLimit.requestsPerHour - client.rateLimit.currentUsage;

    if (remaining <= 0) {
      return { allowed: false, remaining: 0 };
    }

    client.rateLimit.currentUsage++;
    return { allowed: true, remaining: remaining - 1 };
  }

  private async routeRequest(
    request: APIRequest,
    requestId: string
  ): Promise<APIResponse> {
    const startTime = Date.now();

    switch (request.endpoint) {
      case "/api/v1/analyze":
        if (request.body?.audioData) {
          // Convert base64 to ArrayBuffer if needed
          const audioData = this.processAudioData(request.body.audioData);
          return this.analyzeMusic(
            audioData,
            request.body.options || {},
            request.auth?.sessionId
          );
        }
        return this.createErrorResponse(
          requestId,
          "MISSING_AUDIO_DATA",
          "Audio data required",
          startTime
        );

      case "/api/v1/generate":
        return this.generateSuggestions(
          request.body || {},
          request.auth?.sessionId
        );

      case "/api/v1/recommendations":
        const userProfile =
          request.body?.userProfile ||
          this.buildUserProfileFromQuery(request.query);
        return this.getPersonalizedRecommendations(
          userProfile,
          request.auth?.sessionId
        );

      case "/api/v1/status":
        return this.getSystemStatus(request.auth?.sessionId);

      case "/api/v1/docs":
        return this.getAPIDocumentation();

      default:
        return this.createErrorResponse(
          requestId,
          "UNKNOWN_ENDPOINT",
          "Endpoint not found",
          startTime
        );
    }
  }

  private handleWebSocketMessage(
    clientId: string,
    message: WebSocketMessage
  ): void {
    console.log(`📡 WebSocket message from ${clientId}:`, message.type);

    switch (message.type) {
      case "ping":
        this.sendWebSocketMessage(clientId, {
          type: "pong",
          data: { timestamp: new Date() },
          timestamp: new Date(),
        });
        break;

      case "real_time_feedback":
        // Handle real-time analysis requests
        if (message.data?.audioData) {
          this.analyzeMusic(
            message.data.audioData,
            { realTimeMode: true },
            clientId
          );
        }
        break;
    }
  }

  private sendWebSocketMessage(
    clientId: string,
    message: WebSocketMessage
  ): void {
    const connection = this.activeConnections.get(clientId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify(message));
    }
  }

  private broadcastToClient(clientId: string, message: WebSocketMessage): void {
    this.sendWebSocketMessage(clientId, message);
  }

  private createErrorResponse(
    requestId: string,
    code: string,
    message: string,
    startTime: number
  ): APIResponse {
    return {
      success: false,
      error: { code, message },
      metadata: {
        requestId,
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
        version: this.version,
      },
    };
  }

  private logRequest(request: APIRequest, response: APIResponse): void {
    const requestId = response.metadata.requestId;
    this.requestLog.set(requestId, request);

    // Keep only last 1000 requests
    if (this.requestLog.size > 1000) {
      const firstKey = this.requestLog.keys().next().value;
      if (firstKey !== undefined) {
        this.requestLog.delete(firstKey);
      }
    }
  }

  private processAudioData(audioData: string): ArrayBuffer {
    // Convert base64 string to ArrayBuffer
    if (typeof audioData === "string") {
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }
    return audioData;
  }

  private buildUserProfileFromQuery(
    query?: Record<string, string>
  ): UserProfile | undefined {
    if (!query) return undefined;

    return {
      skill_level: (query.skill_level as any) || "intermediate",
      instruments: query.instruments
        ? query.instruments.split(",")
        : ["guitar"],
      practice_goals: query.practice_goals
        ? query.practice_goals.split(",")
        : [],
      preferences: query,
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;
  }

  private generateAPIKey(clientId: string): string {
    return `mk_${clientId}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

export default BrainAPI;

// brain/shared/typeHelpers.ts - Type Manipulation Utilities
import { SystemEvent } from "../core/SystemOrchestrator";
import { generateId } from "./utils";
import {
  AudioFeatures,
  UserProfile,
  // ... any other MaestroBrain types you use
} from "../../MaestroBrain";
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type BrainSystem =
  | "intelligence"
  | "orchestrator"
  | "api"
  | "coordinator";

export const createEvent = <T extends SystemEvent>(
  type: string,
  source: string,
  data: any
): T => {
  return {
    id: generateId("event"),
    type,
    source,
    timestamp: new Date(),
    priority: "medium",
    data,
  } as T;
};

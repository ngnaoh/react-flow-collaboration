import type { XYPosition } from "@xyflow/react";

export interface AwarenessUser {
  id: string;
  name: string;
  color: string;
  cursor: XYPosition | null;
  online: boolean;
}

export interface AwarenessState {
  user: AwarenessUser;
}

export type AwarenessStates = Map<number, AwarenessState>;

export type AwarenessUpdate = {
  added: string[];
  updated: string[];
  removed: string[];
};

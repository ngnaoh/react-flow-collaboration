/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { Awareness } from "y-protocols/awareness";
import { Edge, Node } from "@xyflow/react";

export const yDoc = new Y.Doc();
export const yNodes = yDoc.getArray<Node>("nodes"); // For storing node data
export const yEdges = yDoc.getArray<Edge>("edges"); // For storing edge data

// For Undo/Redo
export const undoManager = new Y.UndoManager([yNodes, yEdges]);

// Setup WebRTC provider
// Replace 'your-collaboration-room' with a unique room name
export const provider = new WebrtcProvider(
  "deca-collaboration-room-name",
  yDoc,
  {
    signaling: ["wss://signaling.yjs.dev"], // Default public signaling server
  }
);

export const awareness: Awareness = provider.awareness;

// Optional: Log Yjs document changes for debugging
yDoc.on("update", (update: Uint8Array, origin: any) => {
  console.log("Yjs Doc Updated:", Y.decodeUpdate(update), "Origin:", origin);
});

awareness.on("change", (changes: any) => {
  console.log("Awareness changed:", changes);
  console.log(
    "Connected users:",
    Array.from(awareness.getStates().values()).map((state: any) => state.user)
  );
});

export const connect = () => {
  if (!provider.connected) {
    provider.connect();
  }
};

export const disconnect = () => {
  provider.disconnect();
};

// Example: Expose a function to add a node to the Yjs array
export const addYNode = (node: Node) => {
  yNodes.push([node]);
};

// Example: Expose a function to update a node in the Yjs array
export const updateYNodePosition = (
  nodeId: string,
  position: { x: number; y: number }
) => {
  const nodeIndex = yNodes.toArray().findIndex((n) => n.id === nodeId);
  if (nodeIndex > -1) {
    const existingNode = yNodes.get(nodeIndex);
    yNodes.delete(nodeIndex, 1); // Yjs array updates require delete then insert for objects usually
    yNodes.insert(nodeIndex, [{ ...existingNode, position }]);
  }
};

export const deleteYNode = (nodeId: string) => {
  const nodeIndex = yNodes.toArray().findIndex((n) => n.id === nodeId);
  if (nodeIndex > -1) {
    yNodes.delete(nodeIndex, 1);
  }
};

export const addYEdge = (edge: Edge) => {
  yEdges.push([edge]);
};

export const deleteYEdge = (edgeId: string) => {
  const edgeIndex = yEdges.toArray().findIndex((e) => e.id === edgeId);
  if (edgeIndex > -1) {
    yEdges.delete(edgeIndex, 1);
  }
};

import { useEffect, useState, useCallback, useRef } from "react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type NodeChange,
  type EdgeChange,
  type ReactFlowInstance,
  type NodeRemoveChange,
  type NodeAddChange,
  type NodeMouseHandler,
  type NodeSelectionChange,
} from "@xyflow/react";
import { Awareness } from "y-protocols/awareness";
import type {
  AwarenessStates,
  AwarenessUpdate,
  AwarenessUser,
} from "../types/awareness";
import { createCursorNode, getCursorId } from "../utils";
import type { UserSelected } from "../types/flow";

const ydoc = new Y.Doc();
const signalingServers = ["ws://localhost:4444"];

// Primary WebRTC provider for peer-to-peer collaboration
const provider = new WebrtcProvider("demo-collaboration-room", ydoc, {
  signaling: signalingServers,
});

// Add WebSocket connection to server for data monitoring
let wsConnection: WebSocket | null = null;

const connectToServer = () => {
  try {
    wsConnection = new WebSocket("ws://localhost:4444/demo-collaboration-room");

    wsConnection.onopen = () => {
      console.log("🔌 Connected to server for data monitoring");

      // Send initial document state to server
      const state = Y.encodeStateAsUpdate(ydoc);
      if (state.length > 0) {
        wsConnection?.send(state);
      }
    };

    wsConnection.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Apply updates from server
        Y.applyUpdate(ydoc, new Uint8Array(event.data));
      }
    };

    wsConnection.onclose = () => {
      console.log("🔴 Disconnected from server");
      // Reconnect after 5 seconds
      setTimeout(connectToServer, 5000);
    };

    wsConnection.onerror = (error) => {
      console.log("❌ Server connection error:", error);
    };

    // Send document updates to server
    const updateHandler = (update: Uint8Array, origin: unknown) => {
      if (
        wsConnection?.readyState === WebSocket.OPEN &&
        origin !== wsConnection
      ) {
        wsConnection.send(update);
      }
    };

    ydoc.on("update", updateHandler);

    return () => {
      ydoc.off("update", updateHandler);
      wsConnection?.close();
    };
  } catch (error) {
    console.log("⚠️ Could not connect to server for monitoring:", error);
    return () => {};
  }
};

provider.on("peers", (...rest) => {
  console.log("👥 Peers connected:", rest);
});

provider.on("status", ({ connected }) => {
  const currentUser = awareness.getLocalState()?.user;
  if (currentUser) {
    awareness.setLocalStateField("user", {
      ...currentUser,
      online: connected,
    });
  }
});

export const yNodes: Y.Map<Node> = ydoc.getMap<Node>("nodes");
export const yEdges: Y.Map<Edge> = ydoc.getMap<Edge>("edges");
export const yCursorNodes: Y.Map<Node> = ydoc.getMap<Node>("cursorNodes");
export const yUsersSelected: Y.Map<UserSelected> =
  ydoc.getMap<UserSelected>("usersSelected");

export const awareness: Awareness = provider.awareness;

export const clientID = ydoc.clientID;
export const userColor =
  "#" + Math.floor(Math.random() * 16777215).toString(16);

awareness.setLocalStateField("user", {
  id: clientID,
  name: `User ${clientID}`,
  color: userColor,
  cursor: null,
});

export const undoManager = new Y.UndoManager([yNodes, yEdges], {
  trackedOrigins: new Set(["undoManager"]),
});

const useYjsStore = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [usersSelected, setUsersSelected] = useState<Map<string, UserSelected>>(
    new Map()
  );
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const reactFlowNodeChangesSelectRef = useRef<NodeSelectionChange[]>([]);
  const reactFlowNodeChangesRef = useRef<NodeChange<Node>[]>([]);
  const reactFlowEdgeChangesRef = useRef<EdgeChange<Edge>[]>([]);

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    reactFlowNodeChangesRef.current = changes;
    const changesSelect: NodeSelectionChange[] = [];
    const cursorChanges: NodeChange<Node>[] = [];
    const nodeChanges: NodeChange<Node>[] = [];
    const captureChanges: NodeChange<Node>[] = [];
    changes.forEach((change) => {
      if ("id" in change && change.id?.startsWith("cursor-")) {
        cursorChanges.push(change);
        return;
      }
      if ("item" in change && change.item.type === "cursor") {
        cursorChanges.push(change);
        return;
      }
      if (
        change.type === "add" ||
        change.type === "remove" ||
        change.type === "position"
      ) {
        captureChanges.push(change);
        return;
      } else {
        nodeChanges.push(change);
      }
    });
    // if (cursorChanges.length > 0) {
    //   ydoc.transact(() => {
    //     cursorChanges.forEach((change) => {
    //       switch (change.type) {
    //         case "remove":
    //           yNodes.delete(change.id);
    //           break;
    //         case "add":
    //           yNodes.set(change.item.id, change.item);
    //           break;
    //         case "position": {
    //           reactFlowNodeChangesRef.current.push(change);
    //           const node = yNodes.get(change.id);
    //           if (node && change.position) {
    //             node.position = change.position;
    //             yNodes.set(node.id, node);
    //           }
    //           break;
    //         }
    //       }
    //     });
    //   });
    // }
    ydoc.transact(() => {
      changes.forEach((change) => {
        switch (change.type) {
          case "remove":
            yNodes.delete(change.id);
            break;
          case "add":
            yNodes.set(change.item.id, change.item);
            break;
          case "position": {
            reactFlowNodeChangesRef.current.push(change);
            const node = yNodes.get(change.id);
            if (node && change.position) {
              node.position = change.position;
              yNodes.set(node.id, node);
            }
            break;
          }
          case "dimensions": {
            reactFlowNodeChangesRef.current.push(change);
            const node = yNodes.get(change.id);
            if (node) {
              node.measured = change.dimensions;
              yNodes.set(node.id, node);
            }
            break;
          }
          case "select": {
            reactFlowNodeChangesRef.current.push(change);
            changesSelect.push(change);
            const node = yNodes.get(change.id);
            if (node) {
              node.selected = change.selected;
              // if (change.selected) {
              //   yUsersSelected.set(clientID, {
              //     nodeIds: [node.id],
              //     color: userColor,
              //   });
              // }
              yNodes.set(node.id, node);
            }
            break;
          }
          case "replace": {
            reactFlowNodeChangesRef.current.push(change);
            yNodes.set(change.id, change.item);
            break;
          }
          default:
            break;
        }
      });
    }, "undoManager");
    if (changesSelect.length > 0) {
      reactFlowNodeChangesSelectRef.current = changesSelect;
      yUsersSelected.set(clientID.toString(), {
        nodeIds: changesSelect.map((change) => change.id),
        color: userColor,
      });
      // console.log(
      //   "yUsersSelected",
      //   changes,
      //   changesSelect,
      //   Array.from(yUsersSelected.entries())
      // );
    }
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    ydoc.transact(() => {
      changes.forEach((change) => {
        switch (change.type) {
          case "remove":
            yEdges.delete(change.id);
            break;
          case "add":
            yEdges.set(change.item.id, change.item);
            break;
          case "replace":
            reactFlowEdgeChangesRef.current.push(change);
            yEdges.set(change.id, change.item);
            break;
          case "select": {
            reactFlowEdgeChangesRef.current.push(change);
            const edge = yEdges.get(change.id);
            if (edge) {
              edge.selected = change.selected;
              yEdges.set(edge.id, edge);
            }
            break;
          }
          default:
            break;
        }
      });
    }, "undoManager");
  }, []);

  const onConnect: OnConnect = useCallback((connection) => {
    const currentEdges = Array.from(yEdges.values());
    onEdgesChange([
      {
        type: "add",
        item: addEdge(connection, currentEdges)[currentEdges.length],
      },
    ]);
  }, []);

  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    console.log("onNodeClick", event, node);
    // yUsersSelected.set(clientID, {
    //   nodeIds: [node.id],
    //   color: userColor,
    // });
  }, []);

  // Combine regular nodes with cursor nodes
  // useEffect(() => {

  // }, [awarenessStates, onNodesChange]);

  useEffect(() => {
    // Connect to server for data monitoring
    const cleanup = connectToServer();

    const syncNodes = () => {
      // console.log("syncNodes", reactFlowNodeChangesRef.current);
      const nds = Array.from(yNodes.values());
      setNodes(applyNodeChanges(reactFlowNodeChangesRef.current, nds));
    };

    const syncEdges = () => {
      // console.log("syncEdges", reactFlowEdgeChangesRef.current);
      const eds = Array.from(yEdges.values());
      setEdges(applyEdgeChanges(reactFlowEdgeChangesRef.current, eds));
    };

    const syncUsersSelected = () => {
      // yUsersSelected.clear();
      setUsersSelected(yUsersSelected as unknown as Map<string, UserSelected>);
    };

    const handleAwarenessUpdate = (awarenessUpdate: AwarenessUpdate) => {
      const currentNodes = Array.from(yNodes.values());
      const awarenessStates = awareness.getStates() as AwarenessStates;
      const cursorNodes = currentNodes.filter((node) => node.type === "cursor");
      const addChanges: NodeAddChange[] = [];
      const removeChanges: NodeRemoveChange[] = [];

      // Remove cursor nodes that don't exist in awareness states
      cursorNodes.forEach((cursorNode) => {
        const nodeId = cursorNode.id;
        const userId = nodeId.split("-")[1]; // Extract user ID from cursor node ID
        if (!awarenessStates.has(Number(userId))) {
          removeChanges.push({
            type: "remove",
            id: nodeId,
          });
        }
      });

      if (awarenessUpdate.added.length > 0) {
        awarenessUpdate.added.map((id) => {
          if (!yNodes.has(getCursorId(id))) {
            addChanges.push({
              type: "add",
              item: createCursorNode(
                awarenessStates.get(Number(id))?.user as AwarenessUser
              ),
            });
          }
          return null;
        });
      }

      onNodesChange([...removeChanges, ...addChanges]);
    };

    yNodes.observeDeep(syncNodes);
    yEdges.observeDeep(syncEdges);
    yUsersSelected.observeDeep(syncUsersSelected);
    awareness.on("update", handleAwarenessUpdate);

    // Initial sync
    syncNodes();
    syncEdges();
    syncUsersSelected();

    return () => {
      cleanup();
      yNodes.unobserveDeep(syncNodes);
      yEdges.unobserveDeep(syncEdges);
      yUsersSelected.unobserveDeep(syncUsersSelected);
      awareness.off("update", handleAwarenessUpdate);
    };
  }, [onNodesChange]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      awareness.destroy();
      yUsersSelected.delete(clientID.toString());
      wsConnection?.close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "z" && (event.ctrlKey || event.metaKey)) {
        undoManager.undo();
      }
      if (
        event.key === "z" &&
        event.shiftKey &&
        (event.ctrlKey || event.metaKey)
      ) {
        undoManager.redo();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  console.log("usersSelected", usersSelected);

  return {
    nodes,
    edges,
    reactFlowInstanceRef,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
  };
};

export default useYjsStore;

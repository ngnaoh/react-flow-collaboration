import React, { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import useYjsStore, {
  awareness,
  clientID,
  undoManager,
} from "../hooks/useYjsStore";
import CustomNode from "./CustomNode";
import CustomEdge from "./CustomEdge";
import CursorNode from "./CursorNode";
import type { AwarenessUser } from "../types/awareness";
import { createCursorNode, getCursorId } from "../utils";
import { SidebarPanel, TitlePanel, ActionsPanel, StatusPanel } from "./panels";

// Add CSS animations
const customStyles = `
  @keyframes dash {
    to {
      stroke-dashoffset: -10;
    }
  }
  
  .react-flow__handle {
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  
  .react-flow__node:hover .react-flow__handle {
    opacity: 1;
  }
  
  .react-flow__node.selected .react-flow__handle {
    opacity: 1;
  }

  /* Cursor nodes should have highest z-index */
  .react-flow__node[data-id^="cursor-"] {
    z-index: 9999 !important;
    background: transparent !important;
    pointer-events: none !important;
  }

  /* Ensure cursor nodes are always on top of other nodes */
  .react-flow__nodes .react-flow__node[data-id^="cursor-"] {
    z-index: 9999 !important;
  }
`;

// Register custom node and edge types
const nodeTypes = {
  custom: CustomNode,
  cursor: CursorNode,
};
const edgeTypes = {
  default: CustomEdge,
  smoothstep: CustomEdge,
  step: CustomEdge,
  straight: CustomEdge,
};

// Inject styles
if (typeof document !== "undefined") {
  const styleElement = document.createElement("style");
  styleElement.textContent = customStyles;
  document.head.appendChild(styleElement);
}

const FlowInstance: React.FC = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    reactFlowInstanceRef,
  } = useYjsStore();

  const { screenToFlowPosition, getNodes } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow/type");
      const styleStr = event.dataTransfer.getData(
        "application/reactflow/style"
      );
      const style = styleStr ? JSON.parse(styleStr) : {};

      if (!type || typeof type !== "string") {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNodeId = `${type}-${Date.now()}`;

      const newNode: Node = {
        id: newNodeId,
        type,
        position,
        data: {
          label: `${type.charAt(0).toUpperCase()}${type.slice(1)} Node`,
          style,
        },
      };

      onNodesChange([{ type: "add", item: newNode }]);
    },
    [screenToFlowPosition, onNodesChange]
  );

  const onPaneMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const { x, y } = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const currentUser = awareness.getLocalState()?.user as AwarenessUser;
      awareness.setLocalStateField("user", {
        ...currentUser,
        cursor: { x, y },
      });
      const cursorNode = getNodes().find(
        (n) => n.id === getCursorId(currentUser?.id)
      );
      if (cursorNode) {
        onNodesChange([
          {
            type: "position",
            id: cursorNode.id,
            position: { x, y },
          },
        ]);
      } else {
        onNodesChange([
          {
            type: "add",
            item: createCursorNode(currentUser),
          },
        ]);
      }
    },
    [screenToFlowPosition, getNodes, onNodesChange]
  );

  const onSidebarDragStart = useCallback(
    (
      event: React.DragEvent<HTMLDivElement>,
      nodeType: string,
      nodeStyle: React.CSSProperties
    ) => {
      event.dataTransfer.setData("application/reactflow/type", nodeType);
      event.dataTransfer.setData(
        "application/reactflow/style",
        JSON.stringify(nodeStyle)
      );
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const isOnline = useMemo(() => {
    return awareness.getLocalState()?.user?.online;
  }, [awareness.getLocalState()?.user?.online]);

  const connectedUsers = useMemo(() => {
    return awareness.getStates().size;
  }, [awareness.getStates().size]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
      }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={(rfi) => {
          reactFlowInstanceRef.current = rfi;
        }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onPaneMouseMove={onPaneMouseMove}
        onDragOver={onDragOver}
        onDrop={onDrop}
        defaultEdgeOptions={{
          type: "default",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#b1b1b7",
          },
          style: {
            strokeWidth: 2,
          },
        }}
        multiSelectionKeyCode={["Meta", "Control"]}
        connectionLineStyle={{ strokeWidth: 3, stroke: "#ff6cb6" }}
        fitView>
        <Controls />
        <Background gap={20} size={1} />

        {/* Panel Components */}
        <SidebarPanel onDragStart={onSidebarDragStart} />
        <TitlePanel />
        <ActionsPanel />
        <StatusPanel
          isOnline={isOnline}
          clientID={clientID}
          connectedUsers={connectedUsers}
        />
      </ReactFlow>
    </div>
  );
};

const CollaborativeFlow: React.FC = () => {
  return (
    <ReactFlowProvider>
      <div
        style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          overflow: "hidden",
          background: "#fafafa",
        }}>
        <FlowInstance />
      </div>
    </ReactFlowProvider>
  );
};

export default CollaborativeFlow;

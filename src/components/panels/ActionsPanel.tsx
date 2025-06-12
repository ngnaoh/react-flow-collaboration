import React, { useCallback } from "react";
import { Panel } from "@xyflow/react";
import { undoManager } from "../../hooks/useYjsStore";

const ActionsPanel: React.FC = () => {
  const handleUndo = useCallback(() => {
    undoManager.undo();
  }, []);

  const handleRedo = useCallback(() => {
    undoManager.redo();
  }, []);

  return (
    <Panel
      position="top-right"
      style={{ background: "transparent", border: "none" }}>
      <div
        style={{
          display: "flex",
          gap: "8px",
          background: "white",
          padding: "8px 12px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          border: "1px solid #e0e0e0",
        }}>
        <button
          onClick={handleUndo}
          style={{
            background: "#f5f5f5",
            border: "1px solid #ddd",
            borderRadius: "4px",
            padding: "4px 12px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "bold",
            color: "#555",
          }}>
          Undo
        </button>
        <button
          onClick={handleRedo}
          style={{
            background: "#f5f5f5",
            border: "1px solid #ddd",
            borderRadius: "4px",
            padding: "4px 12px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "bold",
            color: "#555",
          }}>
          Redo
        </button>
      </div>
    </Panel>
  );
};

export default ActionsPanel;

import React from "react";
import { Panel } from "@xyflow/react";

const TitlePanel: React.FC = () => {
  return (
    <Panel
      position="top-center"
      style={{
        background: "transparent",
        border: "none",
        marginTop: "10px",
      }}>
      <div
        style={{
          background: "white",
          padding: "8px 16px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          border: "1px solid #e0e0e0",
        }}>
        <h2 style={{ margin: 0, fontSize: "16px", color: "#333" }}>
          Collaborative Flow Editor
        </h2>
      </div>
    </Panel>
  );
};

export default TitlePanel;

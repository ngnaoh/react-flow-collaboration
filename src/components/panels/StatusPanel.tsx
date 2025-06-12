import React from "react";
import { Panel } from "@xyflow/react";

interface StatusPanelProps {
  isOnline: boolean;
  clientID: number;
  connectedUsers: number;
}

const StatusPanel: React.FC<StatusPanelProps> = ({
  isOnline,
  clientID,
  connectedUsers,
}) => {
  return (
    <Panel
      position="bottom-center"
      style={{
        background: "transparent",
        border: "none",
        marginBottom: "10px",
      }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          background: "white",
          padding: "8px 12px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          border: "1px solid #e0e0e0",
          minWidth: "160px",
        }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: isOnline ? "#4caf50" : "#ff5722",
              boxShadow: isOnline ? "0 0 8px #4caf50" : "0 0 8px #ff5722",
            }}
          />
          <span
            style={{
              fontSize: "12px",
              color: "#555",
              fontWeight: "bold",
            }}>
            {isOnline ? "Connected" : "Offline"}
          </span>
          <span
            style={{
              fontSize: "12px",
              color: "#555",
              fontWeight: "bold",
            }}>
            {clientID}
          </span>
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "#777",
          }}>
          {connectedUsers} {connectedUsers === 1 ? "user" : "users"} online
        </div>
      </div>
    </Panel>
  );
};

export default StatusPanel;

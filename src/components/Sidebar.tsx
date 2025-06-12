import React from "react";

const nodeTypes = [
  { type: "input", label: "Input Node", style: { background: "#6ede87" } },
  { type: "default", label: "Default Node", style: { background: "#ff9a6c" } },
  { type: "output", label: "Output Node", style: { background: "#6c97ff" } },
  { type: "custom", label: "Custom Node", style: { background: "#ff6cb6" } },
];

interface SidebarProps {
  onDragStart: (
    event: React.DragEvent<HTMLDivElement>,
    nodeType: string,
    style: React.CSSProperties
  ) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onDragStart }) => {
  return (
    <div
      className="sidebar"
      style={{
        width: "180px",
        padding: "10px",
        background: "white",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        border: "1px solid #e0e0e0",
      }}>
      <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#555" }}>
        Node Types
      </h3>
      <div className="node-types">
        {nodeTypes.map((node) => (
          <div
            key={node.type}
            className="draggable-node"
            draggable
            onDragStart={(e) => onDragStart(e, node.type, node.style)}
            style={{
              padding: "8px",
              margin: "6px 0",
              borderRadius: "4px",
              cursor: "grab",
              ...node.style,
              color: "#fff",
              textAlign: "center",
              fontWeight: "bold",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              fontSize: "12px",
            }}>
            {node.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;

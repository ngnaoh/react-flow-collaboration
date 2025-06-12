import React from "react";
import { Panel } from "@xyflow/react";
import Sidebar from "../Sidebar";

interface SidebarPanelProps {
  onDragStart: (
    event: React.DragEvent<HTMLDivElement>,
    nodeType: string,
    nodeStyle: React.CSSProperties
  ) => void;
}

const SidebarPanel: React.FC<SidebarPanelProps> = ({ onDragStart }) => {
  return (
    <Panel
      position="top-left"
      style={{ background: "transparent", border: "none" }}>
      <Sidebar onDragStart={onDragStart} />
    </Panel>
  );
};

export default SidebarPanel;

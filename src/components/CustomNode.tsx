import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { clientID, userColor, yUsersSelected } from "../hooks/useYjsStore";

// Define the expected data shape for our custom node
interface CustomNodeProps {
  data: {
    usersSelected: {
      id: string;
      color: string;
    }[];
    label: string;
    style?: {
      background?: string;
    };
  };
  selected?: boolean;
}

const CustomNode = memo(({ data, selected }: CustomNodeProps) => {
  // const borderColor = useMemo(() => {
  //   return data.usersSelected?.some((user) => user.id === clientID.toString())
  //     ? data.usersSelected[0].color
  //     : "#000";
  // }, [data.usersSelected]);

  // console.log("selected", .get(clientID.toString()));

  const nodeStyle = {
    padding: "12px 16px",
    background: data.style?.background || "#ff6cb6",
    color: "#fff",
    borderRadius: "8px",
    outline: selected
      ? `2px solid ${userColor}`
      : "1px solid rgba(255,255,255,0.3)",
    boxShadow: selected
      ? `0 0 0 2px #000, 0 4px 12px rgba(0,0,0,0.2)`
      : "0 2px 8px rgba(0,0,0,0.1)",
    minWidth: "120px",
    textAlign: "center" as const,
    fontWeight: "bold",
    fontSize: "14px",
    position: "relative" as const,
    transition: "all 0.2s ease",
  };

  const handleStyle = {
    width: "4px",
    height: "4px",
    background: "#fff",
    border: "2px solid #333",
    borderRadius: "50%",
  };

  return (
    <div style={nodeStyle}>
      {/* Top handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{
          ...handleStyle,
          top: "-6px",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />

      {/* Left handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{
          ...handleStyle,
          left: "-6px",
          top: "50%",
          transform: "translateY(-50%)",
        }}
      />

      {/* Right handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          ...handleStyle,
          right: "-6px",
          top: "50%",
          transform: "translateY(-50%)",
        }}
      />

      {/* Bottom handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          ...handleStyle,
          bottom: "-6px",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />

      <div>{data.label}</div>
    </div>
  );
});

CustomNode.displayName = "CustomNode";

export default CustomNode;

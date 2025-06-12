import React, { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { awareness } from "../hooks/useYjsStore";

interface CursorNodeProps extends NodeProps {
  data: {
    userId: string;
    userName: string;
    style: {
      color: string;
    };
  };
}

const CursorNode = memo(({ data }: CursorNodeProps) => {
  const cursorStyle: React.CSSProperties = {
    width: "24px",
    height: "24px",
    position: "relative",
    pointerEvents: "none",
    zIndex: 9999,
    background: "transparent",
    display:
      data.userId === awareness.getLocalState()?.user?.id ? "none" : "block",
  };

  return (
    <div style={cursorStyle}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill={data.style.color}
        xmlns="http://www.w3.org/2000/svg"
        style={{ zIndex: 9999 }}>
        <path
          d="M6.32161 3.383L21.9996 12.245L13.1376 13.137L15.1136 21.093L6.32161 3.383Z"
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});

CursorNode.displayName = "CursorNode";

export default CursorNode;

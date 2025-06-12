import type { AwarenessStates, AwarenessUser } from "../types/awareness";
import type { Node } from "@xyflow/react";

export const createCursorNode = (user: AwarenessUser): Node => {
  return {
    id: getCursorId(user.id),
    type: "cursor",
    position: user.cursor ?? { x: 0, y: 0 },
    data: {
      userId: user.id,
      userName: user.name ?? `User ${user.id}`,
      style: {
        color: user.color ?? "#000000",
      },
    },
    draggable: false,
    selectable: false,
    deletable: false,
    connectable: false,
  };
};

export const getCursorId = (id: string) => `cursor-${id}`;

export const createCursorNodes = (awarenessStates: AwarenessStates) => {
  return Array.from(awarenessStates.values()).map((state) =>
    createCursorNode(state.user)
  );
};

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/_core/hooks/useAuth";

interface UserPresence {
  userId: string;
  userName: string;
  resourceType: "candidate" | "job" | "document";
  resourceId: string;
  timestamp: number;
}

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function usePresence(
  resourceType: "candidate" | "job" | "document",
  resourceId: string
) {
  const { user } = useAuth();
  const [presentUsers, setPresentUsers] = useState<UserPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user || !resourceId) return;

    const socket = getSocket();

    const handleConnect = () => {
      setIsConnected(true);
      console.log("[Presence] Connected to WebSocket");

      // Join the resource room
      socket.emit("join-resource", {
        userId: user.id.toString(),
        userName: user.name,
        resourceType,
        resourceId,
      });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      console.log("[Presence] Disconnected from WebSocket");
    };

    const handlePresenceUpdate = (users: UserPresence[]) => {
      setPresentUsers(users);
    };

    const handleUserJoined = (presence: UserPresence) => {
      setPresentUsers((prev) => {
        const filtered = prev.filter((p) => p.userId !== presence.userId);
        return [...filtered, presence];
      });
    };

    const handleUserLeft = (data: { userId: string }) => {
      setPresentUsers((prev) => prev.filter((p) => p.userId !== data.userId));
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("presence-update", handlePresenceUpdate);
    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.emit("leave-resource", {
        userId: user.id.toString(),
        resourceType,
        resourceId,
      });

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("presence-update", handlePresenceUpdate);
      socket.off("user-joined", handleUserJoined);
      socket.off("user-left", handleUserLeft);
    };
  }, [user, resourceType, resourceId]);

  const broadcastTyping = (field: string) => {
    if (!user) return;
    const socket = getSocket();
    socket.emit("typing", {
      userId: user.id.toString(),
      userName: user.name,
      resourceType,
      resourceId,
      field,
    });
  };

  const broadcastFieldUpdate = (field: string, value: any) => {
    if (!user) return;
    const socket = getSocket();
    socket.emit("field-update", {
      userId: user.id.toString(),
      userName: user.name,
      resourceType,
      resourceId,
      field,
      value,
    });
  };

  const broadcastStatusChange = (oldStatus: string, newStatus: string) => {
    if (!user) return;
    const socket = getSocket();
    socket.emit("status-change", {
      userId: user.id.toString(),
      userName: user.name,
      resourceType,
      resourceId,
      oldStatus,
      newStatus,
    });
  };

  // Filter out current user from presence list
  const otherUsers = presentUsers.filter(
    (p) => p.userId !== user?.id.toString()
  );

  return {
    presentUsers: otherUsers,
    isConnected,
    broadcastTyping,
    broadcastFieldUpdate,
    broadcastStatusChange,
  };
}

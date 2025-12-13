import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";

interface UserPresence {
  userId: string;
  userName: string;
  resourceType: "candidate" | "job" | "document";
  resourceId: string;
  timestamp: number;
}

const presenceMap = new Map<string, UserPresence[]>();

export function initializeWebSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Join a resource room (candidate, job, document)
    socket.on(
      "join-resource",
      (data: {
        userId: string;
        userName: string;
        resourceType: "candidate" | "job" | "document";
        resourceId: string;
      }) => {
        const roomId = `${data.resourceType}:${data.resourceId}`;
        socket.join(roomId);

        // Track presence
        const presence: UserPresence = {
          userId: data.userId,
          userName: data.userName,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          timestamp: Date.now(),
        };

        const existingPresence = presenceMap.get(roomId) || [];
        const updatedPresence = [
          ...existingPresence.filter((p) => p.userId !== data.userId),
          presence,
        ];
        presenceMap.set(roomId, updatedPresence);

        // Notify others in the room
        socket.to(roomId).emit("user-joined", presence);

        // Send current presence list to the new user
        socket.emit("presence-update", updatedPresence);

        console.log(
          `[WebSocket] ${data.userName} joined ${roomId}, ${updatedPresence.length} users present`
        );
      }
    );

    // Leave a resource room
    socket.on(
      "leave-resource",
      (data: {
        userId: string;
        resourceType: "candidate" | "job" | "document";
        resourceId: string;
      }) => {
        const roomId = `${data.resourceType}:${data.resourceId}`;
        socket.leave(roomId);

        // Remove from presence
        const existingPresence = presenceMap.get(roomId) || [];
        const updatedPresence = existingPresence.filter(
          (p) => p.userId !== data.userId
        );

        if (updatedPresence.length > 0) {
          presenceMap.set(roomId, updatedPresence);
        } else {
          presenceMap.delete(roomId);
        }

        // Notify others
        socket.to(roomId).emit("user-left", { userId: data.userId });

        console.log(`[WebSocket] User ${data.userId} left ${roomId}`);
      }
    );

    // Broadcast typing indicator
    socket.on(
      "typing",
      (data: {
        userId: string;
        userName: string;
        resourceType: string;
        resourceId: string;
        field: string;
      }) => {
        const roomId = `${data.resourceType}:${data.resourceId}`;
        socket.to(roomId).emit("user-typing", data);
      }
    );

    // Broadcast field update
    socket.on(
      "field-update",
      (data: {
        userId: string;
        userName: string;
        resourceType: string;
        resourceId: string;
        field: string;
        value: any;
      }) => {
        const roomId = `${data.resourceType}:${data.resourceId}`;
        socket.to(roomId).emit("field-updated", data);
      }
    );

    // Broadcast status change
    socket.on(
      "status-change",
      (data: {
        userId: string;
        userName: string;
        resourceType: string;
        resourceId: string;
        oldStatus: string;
        newStatus: string;
      }) => {
        const roomId = `${data.resourceType}:${data.resourceId}`;
        io.to(roomId).emit("status-changed", data);
      }
    );

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);

      // Clean up presence for all rooms this socket was in
      presenceMap.forEach((presences, roomId) => {
        const updatedPresence = presences.filter(
          (p) => p.timestamp > Date.now() - 30000 // Remove stale presence (30s)
        );

        if (updatedPresence.length > 0) {
          presenceMap.set(roomId, updatedPresence);
        } else {
          presenceMap.delete(roomId);
        }
      });
    });
  });

  // Cleanup stale presence every minute
  setInterval(() => {
    const now = Date.now();
    presenceMap.forEach((presences, roomId) => {
      const updatedPresence = presences.filter(
        (p) => now - p.timestamp < 60000 // 1 minute timeout
      );

      if (updatedPresence.length > 0) {
        presenceMap.set(roomId, updatedPresence);
      } else {
        presenceMap.delete(roomId);
      }
    });
  }, 60000);

  console.log("[WebSocket] Server initialized");

  return io;
}

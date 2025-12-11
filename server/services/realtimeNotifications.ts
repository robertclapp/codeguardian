import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

let io: SocketIOServer | null = null;

export interface NotificationPayload {
  type: "document_uploaded" | "reference_completed" | "participant_milestone" | "approval_needed" | "general";
  title: string;
  message: string;
  userId?: number;
  data?: any;
  timestamp: Date;
}

/**
 * Initialize Socket.IO server
 */
export function initializeSocketIO(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // Configure based on your needs
      methods: ["GET", "POST"],
    },
    path: "/api/socket.io",
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join user-specific room
    socket.on("join", (userId: number) => {
      socket.join(`user:${userId}`);
      console.log(`[Socket.IO] User ${userId} joined their room`);
    });

    // Join admin room
    socket.on("join_admin", () => {
      socket.join("admin");
      console.log(`[Socket.IO] Admin joined admin room`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  console.log("[Socket.IO] Real-time notification system initialized");
  return io;
}

/**
 * Send notification to specific user
 */
export function sendNotificationToUser(userId: number, notification: NotificationPayload) {
  if (!io) {
    console.warn("[Socket.IO] Socket.IO not initialized");
    return false;
  }

  io.to(`user:${userId}`).emit("notification", {
    ...notification,
    timestamp: new Date(),
  });

  console.log(`[Socket.IO] Notification sent to user ${userId}: ${notification.title}`);
  return true;
}

/**
 * Send notification to all admins
 */
export function sendNotificationToAdmins(notification: NotificationPayload) {
  if (!io) {
    console.warn("[Socket.IO] Socket.IO not initialized");
    return false;
  }

  io.to("admin").emit("notification", {
    ...notification,
    timestamp: new Date(),
  });

  console.log(`[Socket.IO] Notification sent to admins: ${notification.title}`);
  return true;
}

/**
 * Broadcast notification to all connected clients
 */
export function broadcastNotification(notification: NotificationPayload) {
  if (!io) {
    console.warn("[Socket.IO] Socket.IO not initialized");
    return false;
  }

  io.emit("notification", {
    ...notification,
    timestamp: new Date(),
  });

  console.log(`[Socket.IO] Broadcast notification: ${notification.title}`);
  return true;
}

/**
 * Notify about document upload
 */
export function notifyDocumentUploaded(userId: number, documentName: string, participantName: string) {
  sendNotificationToAdmins({
    type: "document_uploaded",
    title: "New Document Uploaded",
    message: `${participantName} uploaded ${documentName}`,
    userId,
    data: { documentName, participantName },
    timestamp: new Date(),
  });
}

/**
 * Notify about reference check completion
 */
export function notifyReferenceCheckCompleted(candidateId: number, candidateName: string, referenceName: string) {
  sendNotificationToAdmins({
    type: "reference_completed",
    title: "Reference Check Completed",
    message: `${referenceName} completed reference check for ${candidateName}`,
    data: { candidateId, candidateName, referenceName },
    timestamp: new Date(),
  });
}

/**
 * Notify about participant milestone
 */
export function notifyParticipantMilestone(participantId: number, participantName: string, milestone: string) {
  sendNotificationToAdmins({
    type: "participant_milestone",
    title: "Participant Milestone Reached",
    message: `${participantName} reached milestone: ${milestone}`,
    data: { participantId, participantName, milestone },
    timestamp: new Date(),
  });
}

/**
 * Notify about approval needed
 */
export function notifyApprovalNeeded(documentId: number, documentName: string, participantName: string) {
  sendNotificationToAdmins({
    type: "approval_needed",
    title: "Approval Needed",
    message: `${documentName} from ${participantName} needs approval`,
    data: { documentId, documentName, participantName },
    timestamp: new Date(),
  });
}

export function getSocketIOInstance() {
  return io;
}

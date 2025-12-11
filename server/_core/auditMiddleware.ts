import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";
import * as db from "../db";

/**
 * Audit Middleware
 * 
 * Automatically captures all create/update/delete operations with:
 * - Before/after snapshots for data changes
 * - User attribution and timestamps
 * - Field-level change tracking
 * 
 * Usage: Add .use(auditMiddleware) to any procedure that modifies data
 */

interface AuditContext {
  action: "create" | "update" | "delete";
  tableName: string;
  recordId: number;
  beforeSnapshot?: any;
  afterSnapshot?: any;
}

/**
 * Helper to calculate field-level changes between before and after snapshots
 */
function calculateChanges(before: any, after: any): Record<string, { from: any; to: any }> {
  const changes: Record<string, { from: any; to: any }> = {};
  
  if (!before && after) {
    // Create operation - all fields are new
    Object.keys(after).forEach((key) => {
      changes[key] = { from: null, to: after[key] };
    });
    return changes;
  }
  
  if (before && !after) {
    // Delete operation - all fields removed
    Object.keys(before).forEach((key) => {
      changes[key] = { from: before[key], to: null };
    });
    return changes;
  }
  
  // Update operation - find changed fields
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  allKeys.forEach((key) => {
    const beforeValue = before?.[key];
    const afterValue = after?.[key];
    
    // Skip if values are the same
    if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) {
      return;
    }
    
    changes[key] = { from: beforeValue, to: afterValue };
  });
  
  return changes;
}

/**
 * Audit middleware that can be attached to mutations
 * 
 * Example usage in routers:
 * ```typescript
 * updateCandidate: protectedProcedure
 *   .use(auditMiddleware)
 *   .input(...)
 *   .mutation(async ({ ctx, input }) => {
 *     // Capture before snapshot
 *     const before = await db.getCandidateById(input.id);
 *     
 *     // Perform update
 *     await db.updateCandidate(input.id, input.updates);
 *     
 *     // Capture after snapshot
 *     const after = await db.getCandidateById(input.id);
 *     
 *     // Store audit context for middleware
 *     ctx.audit = {
 *       action: "update",
 *       tableName: "candidates",
 *       recordId: input.id,
 *       beforeSnapshot: before,
 *       afterSnapshot: after,
 *     };
 *     
 *     return after;
 *   });
 * ```
 */
export const auditMiddleware = async (opts: { ctx: TrpcContext; next: any }) => {
  const { ctx, next } = opts;
  // Execute the procedure
  const result = await next({ ctx });
  
  // Check if audit context was set
  const auditCtx = (ctx as any).audit as AuditContext | undefined;
  
  if (auditCtx && ctx.user) {
    // Calculate field-level changes
    const changes = calculateChanges(auditCtx.beforeSnapshot, auditCtx.afterSnapshot);
    
    // Only log if there are actual changes (or it's a create/delete)
    if (Object.keys(changes).length > 0 || auditCtx.action === "create" || auditCtx.action === "delete") {
      try {
        await db.createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name || ctx.user.email || "Unknown",
          action: auditCtx.action,
          tableName: auditCtx.tableName,
          recordId: auditCtx.recordId,
          beforeSnapshot: auditCtx.beforeSnapshot ? JSON.stringify(auditCtx.beforeSnapshot) : undefined,
          afterSnapshot: auditCtx.afterSnapshot ? JSON.stringify(auditCtx.afterSnapshot) : undefined,
          changes: JSON.stringify(changes),
          ipAddress: (ctx.req as any).ip || (ctx.req as any).connection?.remoteAddress || undefined,
          userAgent: ctx.req.headers["user-agent"] || undefined,
        });
      } catch (error) {
        // Log error but don't fail the mutation
        console.error("Failed to create audit log:", error);
      }
    }
  }
  
  return result;
};

/**
 * Helper function to set audit context in a procedure
 * 
 * @param ctx - The tRPC context
 * @param auditData - The audit context data
 */
export function setAuditContext(ctx: any, auditData: AuditContext) {
  ctx.audit = auditData;
}

/**
 * Convenience wrapper for create operations
 */
export function auditCreate(ctx: any, tableName: string, recordId: number, afterSnapshot: any) {
  setAuditContext(ctx, {
    action: "create",
    tableName,
    recordId,
    afterSnapshot,
  });
}

/**
 * Convenience wrapper for update operations
 */
export function auditUpdate(
  ctx: any,
  tableName: string,
  recordId: number,
  beforeSnapshot: any,
  afterSnapshot: any
) {
  setAuditContext(ctx, {
    action: "update",
    tableName,
    recordId,
    beforeSnapshot,
    afterSnapshot,
  });
}

/**
 * Convenience wrapper for delete operations
 */
export function auditDelete(ctx: any, tableName: string, recordId: number, beforeSnapshot: any) {
  setAuditContext(ctx, {
    action: "delete",
    tableName,
    recordId,
    beforeSnapshot,
  });
}

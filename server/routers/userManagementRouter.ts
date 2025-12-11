import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const userManagementRouter = router({
  /**
   * Get all users
   */
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    // Only admins can view all users
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    return db.getAllUsers();
  }),

  /**
   * Update user role
   */
  updateUserRole: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["admin", "user"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only admins can update roles
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      // Prevent users from demoting themselves
      if (input.userId === ctx.user.id && input.role === "user") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot demote yourself from admin role",
        });
      }

      await db.updateUser(input.userId, { role: input.role });

      // Log the role change
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name || "Unknown",
        action: "update",
        tableName: "users",
        recordId: input.userId,
        changes: { role: input.role },
      });

      return { success: true };
    }),

  /**
   * Get user activity logs
   */
  getUserActivityLogs: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        limit: z.number().optional().default(100),
      })
    )
    .query(async ({ input, ctx }) => {
      // Admins can view all logs, users can only view their own
      if (input.userId && input.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot view other users' activity" });
      }

      const userId = input.userId || ctx.user.id;
      return db.getUserActivityLogs(userId, input.limit);
    }),

  /**
   * Get all activity logs (admin only)
   */
  getAllActivityLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(500),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      return db.getAllUserActivityLogs(input.limit);
    }),
});

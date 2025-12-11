import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const auditRouter = router({
  /**
   * Get audit logs with optional filtering
   */
  getAuditLogs: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        tableName: z.string().optional(),
        recordId: z.number().optional(),
        action: z.enum(["create", "update", "delete"]).optional(),
        limit: z.number().optional().default(500),
      })
    )
    .query(async ({ input, ctx }) => {
      // Only admins can view audit logs
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      return db.getAuditLogs(input);
    }),
});

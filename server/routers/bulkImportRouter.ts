import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { importParticipants, generateCSVTemplate } from "../services/bulkImport";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

export const bulkImportRouter = router({
  /**
   * Import participants from CSV content
   */
  importParticipants: adminProcedure
    .input(
      z.object({
        csvContent: z.string().min(1, "CSV content is required"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const summary = await importParticipants(input.csvContent);
        return summary;
      } catch (error: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Failed to import participants",
        });
      }
    }),

  /**
   * Get CSV template
   */
  getTemplate: adminProcedure.query(() => {
    return {
      content: generateCSVTemplate(),
      filename: "participant_import_template.csv",
    };
  }),
});

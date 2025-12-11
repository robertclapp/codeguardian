import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as backup from "../services/backupAndExport";

export const backupRouter = router({
  /**
   * Export participants
   */
  exportParticipants: protectedProcedure
    .input(
      z.object({
        format: z.enum(["csv", "json"]).optional().default("csv"),
      })
    )
    .query(async ({ input }) => {
      const data = await backup.exportParticipants({ format: input.format });
      return { data, format: input.format };
    }),

  /**
   * Export documents
   */
  exportDocuments: protectedProcedure
    .input(
      z.object({
        format: z.enum(["csv", "json"]).optional().default("csv"),
      })
    )
    .query(async ({ input }) => {
      const data = await backup.exportDocuments({ format: input.format });
      return { data, format: input.format };
    }),

  /**
   * Export jobs
   */
  exportJobs: protectedProcedure
    .input(
      z.object({
        format: z.enum(["csv", "json"]).optional().default("csv"),
      })
    )
    .query(async ({ input }) => {
      const data = await backup.exportJobs({ format: input.format });
      return { data, format: input.format };
    }),

  /**
   * Export programs
   */
  exportPrograms: protectedProcedure
    .input(
      z.object({
        format: z.enum(["csv", "json"]).optional().default("csv"),
      })
    )
    .query(async ({ input }) => {
      const data = await backup.exportPrograms({ format: input.format });
      return { data, format: input.format };
    }),

  /**
   * Export candidates
   */
  exportCandidates: protectedProcedure
    .input(
      z.object({
        format: z.enum(["csv", "json"]).optional().default("csv"),
      })
    )
    .query(async ({ input }) => {
      const data = await backup.exportCandidates({ format: input.format });
      return { data, format: input.format };
    }),

  /**
   * Create database backup
   */
  createBackup: protectedProcedure.mutation(async () => {
    return backup.createDatabaseBackup();
  }),

  /**
   * List available backups
   */
  listBackups: protectedProcedure.query(async () => {
    return backup.listBackups();
  }),

  /**
   * Restore from backup
   */
  restoreBackup: protectedProcedure
    .input(
      z.object({
        backupUrl: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      return backup.restoreFromBackup(input.backupUrl);
    }),

  /**
   * Get backup statistics
   */
  getStats: protectedProcedure.query(async () => {
    return backup.getBackupStats();
  }),
});

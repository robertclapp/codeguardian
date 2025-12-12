import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { CSVMigrationService, CANDIDATE_FIELDS, JOB_FIELDS } from "../_core/csvMigrationService";
import * as db from "../db";

export const csvMigrationRouter = router({
  // Get available fields for mapping
  getTargetFields: protectedProcedure
    .input(z.object({ type: z.enum(['candidates', 'jobs']) }))
    .query(({ input }) => {
      return input.type === 'candidates' ? CANDIDATE_FIELDS : JOB_FIELDS;
    }),

  // Parse CSV and detect columns
  parseCSV: protectedProcedure
    .input(z.object({ fileContent: z.string() }))
    .mutation(({ input }) => {
      return CSVMigrationService.parseCSV(input.fileContent);
    }),

  // Preview import with validation
  previewImport: protectedProcedure
    .input(
      z.object({
        fileContent: z.string(),
        type: z.enum(['candidates', 'jobs']),
        mapping: z.array(
          z.object({
            csvColumn: z.string(),
            targetField: z.string(),
          })
        ),
      })
    )
    .mutation(({ input }) => {
      const targetFields = input.type === 'candidates' ? CANDIDATE_FIELDS : JOB_FIELDS;
      return CSVMigrationService.previewImport(input.fileContent, input.mapping, targetFields);
    }),

  // Execute import
  executeImport: protectedProcedure
    .input(
      z.object({
        fileContent: z.string(),
        fileName: z.string(),
        type: z.enum(['candidates', 'jobs']),
        mapping: z.array(
          z.object({
            csvColumn: z.string(),
            targetField: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const targetFields = input.type === 'candidates' ? CANDIDATE_FIELDS : JOB_FIELDS;
      const { rows } = CSVMigrationService.parseCSV(input.fileContent);

      let successCount = 0;
      let failCount = 0;
      const errors: any[] = [];
      const rollbackId = `rollback_${Date.now()}`;

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const rowErrors = CSVMigrationService.validateRow(rows[i], input.mapping, targetFields, i + 1);

        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
          failCount++;
          continue;
        }

        try {
          const transformed = CSVMigrationService.transformRow(rows[i], input.mapping);

          if (input.type === 'candidates') {
            await db.createCandidate({
              ...transformed,
              stage: transformed.stage || 'new',
              source: 'CSV Import',
            });
          } else {
            await db.createJob({
              ...transformed,
              status: transformed.status || 'draft',
              postedBy: ctx.user.id,
            });
          }

          successCount++;
        } catch (error) {
          errors.push({
            row: i + 1,
            field: 'general',
            value: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          failCount++;
        }
      }

      // Record import history
      await db.createImportHistory({
        importType: input.type,
        fileName: input.fileName,
        totalRows: rows.length,
        successfulRows: successCount,
        failedRows: failCount,
        errors: JSON.stringify(errors),
        rollbackId,
        importedBy: ctx.user.id,
      });

      return {
        success: true,
        imported: successCount,
        failed: failCount,
        errors,
        rollbackId,
      };
    }),

  // Get import history
  getImportHistory: protectedProcedure.query(async () => {
    return await db.getImportHistory();
  }),
});

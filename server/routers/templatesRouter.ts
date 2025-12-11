import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { storagePut } from "../storage";

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

export const templatesRouter = router({
  /**
   * Get all active templates
   */
  getAll: publicProcedure.query(async () => {
    return await db.getAllTemplates();
  }),

  /**
   * Get template by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const template = await db.getTemplateById(input.id);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }
      return template;
    }),

  /**
   * Get templates by category
   */
  getByCategory: publicProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ input }) => {
      return await db.getTemplatesByCategory(input.category);
    }),

  /**
   * Download template (increments download count)
   */
  download: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const template = await db.getTemplateById(input.id);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      // Increment download count
      await db.incrementTemplateDownloadCount(input.id);

      return {
        id: template.id,
        name: template.name,
        fileUrl: template.fileUrl,
        mimeType: template.mimeType,
      };
    }),

  /**
   * Create new template (admin only)
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        category: z.enum(["tax-forms", "employment", "financial", "legal", "program-specific", "other"]),
        fileContent: z.string(), // Base64 encoded
        fileName: z.string(),
        mimeType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Decode base64 and upload to S3
      const buffer = Buffer.from(input.fileContent, "base64");
      const fileKey = `templates/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      // Create template record
      const templateId = await db.createTemplate({
        name: input.name,
        description: input.description || null,
        category: input.category,
        fileUrl: url,
        fileKey,
        fileSize: buffer.length,
        mimeType: input.mimeType,
        createdBy: ctx.user.id,
      });

      return {
        id: templateId,
        name: input.name,
        fileUrl: url,
      };
    }),

  /**
   * Update template (admin only)
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.enum(["tax-forms", "employment", "financial", "legal", "program-specific", "other"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await db.updateTemplate(id, updates);
      return { success: true };
    }),

  /**
   * Delete template (admin only - soft delete)
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteTemplate(input.id);
      return { success: true };
    }),

  /**
   * Get template categories
   */
  getCategories: publicProcedure.query(() => {
    return [
      { value: "tax-forms", label: "Tax Forms", description: "W-4, W-9, 1099, etc." },
      { value: "employment", label: "Employment", description: "I-9, direct deposit, etc." },
      { value: "financial", label: "Financial", description: "Budget worksheets, financial plans" },
      { value: "legal", label: "Legal", description: "Consent forms, agreements" },
      { value: "program-specific", label: "Program Specific", description: "Custom program forms" },
      { value: "other", label: "Other", description: "Miscellaneous templates" },
    ];
  }),
});

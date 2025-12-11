import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";

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

export const emailTemplatesRouter = router({
  /**
   * Get all email templates
   */
  getAll: adminProcedure.query(async () => {
    return await db.getEmailTemplates();
  }),

  /**
   * Get email template by ID
   */
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const template = await db.getEmailTemplateById(input.id);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email template not found",
        });
      }
      return template;
    }),

  /**
   * Get email templates by type
   */
  getByType: adminProcedure
    .input(z.object({ type: z.enum(["notification", "reminder", "reference_check", "compliance", "custom"]) }))
    .query(async ({ input }) => {
      const templates = await db.getEmailTemplates();
      return templates.filter((t: any) => t.type === input.type);
    }),

  /**
   * Create email template
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        type: z.enum(["notification", "reminder", "reference_check", "compliance", "custom"]),
        subject: z.string(),
        htmlBody: z.string(),
        textBody: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const templateId = await db.createEmailTemplate({
        name: input.name,
        description: input.description,
        type: input.type,
        subject: input.subject,
        htmlBody: input.htmlBody,
        textBody: input.textBody,
        variables: [
          "firstName",
          "lastName",
          "email",
          "programName",
          "stageName",
          "documentName",
          "jobTitle",
          "companyName",
          "dueDate",
        ],
        createdBy: ctx.user.id,
      });

      return { id: templateId, name: input.name };
    }),

  /**
   * Update email template
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        type: z.enum(["notification", "reminder", "reference_check", "compliance", "custom"]).optional(),
        subject: z.string().optional(),
        htmlBody: z.string().optional(),
        textBody: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await db.updateEmailTemplate(id, updates);
      return { success: true };
    }),

  /**
   * Delete email template (soft delete)
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteEmailTemplate(input.id);
      return { success: true };
    }),

  /**
   * Set default template for a type
   */
  setDefault: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const template = await db.getEmailTemplateById(input.id);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email template not found",
        });
      }

      // Clear existing default for this type
      const allTemplates = await db.getEmailTemplates();
      for (const t of allTemplates) {
        if ((t as any).type === template.type && (t as any).isDefault === 1) {
          await db.updateEmailTemplate(t.id, { isDefault: 0 });
        }
      }

      // Set new default
      await db.updateEmailTemplate(input.id, { isDefault: 1 });
      return { success: true };
    }),
});

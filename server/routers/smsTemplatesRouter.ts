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

export const smsTemplatesRouter = router({
  /**
   * Get all SMS templates
   */
  getAll: adminProcedure.query(async () => {
    return await db.getSmsTemplates();
  }),

  /**
   * Get SMS template by ID
   */
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const template = await db.getSmsTemplateById(input.id);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "SMS template not found",
        });
      }
      return template;
    }),

  /**
   * Get SMS templates by type
   */
  getByType: adminProcedure
    .input(z.object({ type: z.enum(["notification", "reminder", "reference_check", "custom"]) }))
    .query(async ({ input }) => {
      const templates = await db.getSmsTemplates();
      return templates.filter((t: any) => t.type === input.type);
    }),

  /**
   * Create SMS template
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        type: z.enum(["notification", "reminder", "reference_check", "custom"]),
        body: z.string().max(1600),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const templateId = await db.createSmsTemplate({
        name: input.name,
        description: input.description,
        type: input.type,
        body: input.body,
        variables: [
          "firstName",
          "lastName",
          "email",
          "programName",
          "stageName",
          "documentName",
          "dueDate",
        ],
        createdBy: ctx.user.id,
      });

      return { id: templateId, name: input.name };
    }),

  /**
   * Update SMS template
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        type: z.enum(["notification", "reminder", "reference_check", "custom"]).optional(),
        body: z.string().max(1600).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await db.updateSmsTemplate(id, updates);
      return { success: true };
    }),

  /**
   * Delete SMS template (soft delete)
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteSmsTemplate(input.id);
      return { success: true };
    }),

  /**
   * Set default template for a type
   */
  setDefault: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const template = await db.getSmsTemplateById(input.id);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "SMS template not found",
        });
      }

      // Clear existing default for this type
      const allTemplates = await db.getSmsTemplates();
      for (const t of allTemplates) {
        if ((t as any).type === template.type && (t as any).isDefault === 1) {
          await db.updateSmsTemplate(t.id, { isDefault: 0 });
        }
      }

      // Set new default
      await db.updateSmsTemplate(input.id, { isDefault: 1 });
      return { success: true };
    }),
});

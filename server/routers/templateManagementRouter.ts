import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const templateManagementRouter = router({
  // ============================================
  // Email Templates
  // ============================================

  /**
   * Get all email templates
   */
  getEmailTemplates: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    return db.getEmailTemplates();
  }),

  /**
   * Get email template by ID
   */
  getEmailTemplateById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      return db.getEmailTemplateById(input.id);
    }),

  /**
   * Create email template
   */
  createEmailTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        type: z.enum(["notification", "reminder", "reference_check", "compliance", "custom"]),
        subject: z.string(),
        htmlBody: z.string(),
        textBody: z.string().optional(),
        variables: z.array(z.string()).optional(),
        isActive: z.number().optional(),
        isDefault: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      await db.createEmailTemplate({
        ...input,
        createdBy: ctx.user.id,
      });

      // Log the creation
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name || "Unknown",
        action: "create",
        tableName: "emailTemplates",
        recordId: 0, // Will be updated with actual ID
        afterSnapshot: input,
      });

      return { success: true };
    }),

  /**
   * Update email template
   */
  updateEmailTemplate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        subject: z.string().optional(),
        htmlBody: z.string().optional(),
        textBody: z.string().optional(),
        variables: z.array(z.string()).optional(),
        isActive: z.number().optional(),
        isDefault: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const before = await db.getEmailTemplateById(input.id);
      
      await db.updateEmailTemplate(input.id, input);

      // Log the update
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name || "Unknown",
        action: "update",
        tableName: "emailTemplates",
        recordId: input.id,
        beforeSnapshot: before,
        afterSnapshot: input,
        changes: input,
      });

      return { success: true };
    }),

  /**
   * Delete email template
   */
  deleteEmailTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const before = await db.getEmailTemplateById(input.id);

      await db.deleteEmailTemplate(input.id);

      // Log the deletion
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name || "Unknown",
        action: "delete",
        tableName: "emailTemplates",
        recordId: input.id,
        beforeSnapshot: before,
      });

      return { success: true };
    }),

  // ============================================
  // SMS Templates
  // ============================================

  /**
   * Get all SMS templates
   */
  getSmsTemplates: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    return db.getSmsTemplates();
  }),

  /**
   * Get SMS template by ID
   */
  getSmsTemplateById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      return db.getSmsTemplateById(input.id);
    }),

  /**
   * Create SMS template
   */
  createSmsTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        type: z.enum(["notification", "reminder", "reference_check", "custom"]),
        body: z.string().max(1600),
        variables: z.array(z.string()).optional(),
        isActive: z.number().optional(),
        isDefault: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      await db.createSmsTemplate({
        ...input,
        createdBy: ctx.user.id,
      });

      return { success: true };
    }),

  /**
   * Update SMS template
   */
  updateSmsTemplate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        body: z.string().max(1600).optional(),
        variables: z.array(z.string()).optional(),
        isActive: z.number().optional(),
        isDefault: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      await db.updateSmsTemplate(input.id, input);

      return { success: true };
    }),

  /**
   * Delete SMS template
   */
  deleteSmsTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      await db.deleteSmsTemplate(input.id);

      return { success: true };
    }),
});

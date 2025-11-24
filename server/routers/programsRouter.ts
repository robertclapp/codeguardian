import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createProgram,
  getProgramById,
  listPrograms,
  updateProgram,
  deleteProgram,
  createPipelineStage,
  getProgramStages,
  updatePipelineStage,
  deletePipelineStage,
  createStageRequirement,
  getStageRequirements,
  updateStageRequirement,
  deleteStageRequirement,
} from "../db";

/**
 * Programs router - Manage organizational programs and their onboarding pipelines
 */
export const programsRouter = router({
  /**
   * List all programs
   */
  list: protectedProcedure.query(async () => {
    return await listPrograms();
  }),

  /**
   * Get a single program by ID with its stages
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async ({ input }) => {
      const program = await getProgramById(input.id);
      if (!program) {
        throw new Error("Program not found");
      }
      const stages = await getProgramStages(input.id);
      return {
        ...program,
        stages,
      };
    }),

  /**
   * Create a new program
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await createProgram({
        name: input.name,
        description: input.description,
        createdBy: ctx.user.id,
      });
    }),

  /**
   * Update an existing program
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, isActive, ...rest } = input;
      const updates = {
        ...rest,
        ...(isActive !== undefined && { isActive: isActive ? 1 : 0 }),
      };
      return await updateProgram(id, updates);
    }),

  /**
   * Delete a program
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await deleteProgram(input.id);
      return { success: true };
    }),

  /**
   * Pipeline stages management
   */
  stages: router({
    /**
     * Get all stages for a program
     */
    list: protectedProcedure
      .input(
        z.object({
          programId: z.number(),
        })
      )
      .query(async ({ input }) => {
        return await getProgramStages(input.programId);
      }),

    /**
     * Create a new pipeline stage
     */
    create: protectedProcedure
      .input(
        z.object({
          programId: z.number(),
          name: z.string().min(1),
          description: z.string().optional(),
          order: z.number(),
          autoAdvance: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await createPipelineStage({
          programId: input.programId,
          name: input.name,
          description: input.description,
          order: input.order,
          autoAdvance: input.autoAdvance ? 1 : 0,
        });
      }),

    /**
     * Update a pipeline stage
     */
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          order: z.number().optional(),
          autoAdvance: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, autoAdvance, ...rest } = input;
        const updates = {
          ...rest,
          ...(autoAdvance !== undefined && { autoAdvance: autoAdvance ? 1 : 0 }),
        };
        return await updatePipelineStage(id, updates);
      }),

    /**
     * Delete a pipeline stage
     */
    delete: protectedProcedure
      .input(
        z.object({
          id: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        await deletePipelineStage(input.id);
        return { success: true };
      }),
  }),

  /**
   * Stage requirements management
   */
  requirements: router({
    /**
     * Get all requirements for a stage
     */
    list: protectedProcedure
      .input(
        z.object({
          stageId: z.number(),
        })
      )
      .query(async ({ input }) => {
        return await getStageRequirements(input.stageId);
      }),

    /**
     * Create a new stage requirement
     */
    create: protectedProcedure
      .input(
        z.object({
          stageId: z.number(),
          name: z.string().min(1),
          description: z.string().optional(),
          type: z.enum(["document", "training", "approval", "task"]),
          isRequired: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await createStageRequirement({
          stageId: input.stageId,
          name: input.name,
          description: input.description,
          type: input.type,
          isRequired: input.isRequired !== false ? 1 : 0,
        });
      }),

    /**
     * Update a stage requirement
     */
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          type: z.enum(["document", "training", "approval", "task"]).optional(),
          isRequired: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, isRequired, ...rest } = input;
        const updates = {
          ...rest,
          ...(isRequired !== undefined && { isRequired: isRequired ? 1 : 0 }),
        };
        return await updateStageRequirement(id, updates);
      }),

    /**
     * Delete a stage requirement
     */
    delete: protectedProcedure
      .input(
        z.object({
          id: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        await deleteStageRequirement(input.id);
        return { success: true };
      }),
  }),
});

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createProgram,
  getProgramById,
  listPrograms,
  updateProgram,
  deleteProgram,
  createPipelineStage,
  getProgramStages,
  getPipelineStageById,
  updatePipelineStage,
  deletePipelineStage,
  createStageRequirement,
  getStageRequirements,
  getStageRequirementById,
  updateStageRequirement,
  deleteStageRequirement,
} from "../db";
import { ErrorMessages } from "../errors";
import { requireAuthorization, requireModifyPermission, requireDeletePermission } from "../authorization";
import { sanitizeProgramData, validateId } from "../validation";

/**
 * Programs router - Manage organizational programs and their onboarding pipelines
 */
export const programsRouter = router({
  /**
   * List all programs
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      const programs = await listPrograms();
      // Filter to only show programs user has access to
      return programs.filter(p => p.createdBy === ctx.user.id || ctx.user.role === 'admin');
    } catch (error) {
      console.error("Program list error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ErrorMessages.SERVER.DATABASE_ERROR,
      });
    }
  }),

  /**
   * Get a single program by ID with its stages
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.number().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        validateId(input.id, "Program ID");

        const program = await getProgramById(input.id);
        if (!program) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorMessages.NOT_FOUND.PROGRAM,
          });
        }

        requireAuthorization(ctx.user, program.createdBy, "program");

        const stages = await getProgramStages(input.id);
        return {
          ...program,
          stages,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Program retrieval error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorMessages.SERVER.DATABASE_ERROR,
        });
      }
    }),

  /**
   * Create a new program
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const sanitized = sanitizeProgramData({
          name: input.name,
          description: input.description,
        });

        return await createProgram({
          ...sanitized,
          createdBy: ctx.user.id,
        });
      } catch (error) {
        console.error("Program creation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorMessages.SERVER.DATABASE_ERROR,
        });
      }
    }),

  /**
   * Update an existing program
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().positive(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, isActive, ...rest } = input;
        validateId(id, "Program ID");

        const program = await getProgramById(id);
        if (!program) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorMessages.NOT_FOUND.PROGRAM,
          });
        }

        requireModifyPermission(ctx.user, program.createdBy, "program");

        let updates: Record<string, unknown> = {};

        if (rest.name || rest.description) {
          const sanitized = sanitizeProgramData({
            name: rest.name || "",
            description: rest.description,
          });
          if (rest.name) updates.name = sanitized.name;
          if (rest.description !== undefined) updates.description = sanitized.description;
        }

        if (isActive !== undefined) {
          updates.isActive = isActive ? 1 : 0;
        }

        return await updateProgram(id, updates);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Program update error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorMessages.SERVER.DATABASE_ERROR,
        });
      }
    }),

  /**
   * Delete a program
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        validateId(input.id, "Program ID");

        const program = await getProgramById(input.id);
        if (!program) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorMessages.NOT_FOUND.PROGRAM,
          });
        }

        requireDeletePermission(ctx.user, program.createdBy, "program");

        await deleteProgram(input.id);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Program deletion error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorMessages.SERVER.DATABASE_ERROR,
        });
      }
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
          programId: z.number().positive(),
        })
      )
      .query(async ({ ctx, input }) => {
        try {
          validateId(input.programId, "Program ID");

          const program = await getProgramById(input.programId);
          if (!program) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: ErrorMessages.NOT_FOUND.PROGRAM,
            });
          }

          requireAuthorization(ctx.user, program.createdBy, "program");

          return await getProgramStages(input.programId);
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Stage list error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ErrorMessages.SERVER.DATABASE_ERROR,
          });
        }
      }),

    /**
     * Create a new pipeline stage
     */
    create: protectedProcedure
      .input(
        z.object({
          programId: z.number().positive(),
          name: z.string().min(1).max(200),
          description: z.string().max(1000).optional(),
          order: z.number().nonnegative(),
          autoAdvance: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          validateId(input.programId, "Program ID");

          const program = await getProgramById(input.programId);
          if (!program) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: ErrorMessages.NOT_FOUND.PROGRAM,
            });
          }

          requireModifyPermission(ctx.user, program.createdBy, "program");

          const sanitized = sanitizeProgramData({
            name: input.name,
            description: input.description,
          });

          return await createPipelineStage({
            programId: input.programId,
            name: sanitized.name!,
            description: sanitized.description,
            order: input.order,
            autoAdvance: input.autoAdvance ? 1 : 0,
          });
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Stage creation error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ErrorMessages.SERVER.DATABASE_ERROR,
          });
        }
      }),

    /**
     * Update a pipeline stage
     */
    update: protectedProcedure
      .input(
        z.object({
          id: z.number().positive(),
          name: z.string().min(1).max(200).optional(),
          description: z.string().max(1000).optional(),
          order: z.number().nonnegative().optional(),
          autoAdvance: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const { id, autoAdvance, ...rest } = input;
          validateId(id, "Stage ID");

          // Get stage and verify program ownership
          const stage = await getPipelineStageById(id);
          if (!stage) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Pipeline stage not found",
            });
          }

          const program = await getProgramById(stage.programId);
          if (!program) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: ErrorMessages.NOT_FOUND.PROGRAM,
            });
          }

          requireModifyPermission(ctx.user, program.createdBy, "program");

          let updates: Record<string, unknown> = {};

          if (rest.name || rest.description) {
            const sanitized = sanitizeProgramData({
              name: rest.name || "",
              description: rest.description,
            });
            if (rest.name) updates.name = sanitized.name;
            if (rest.description !== undefined) updates.description = sanitized.description;
          }

          if (rest.order !== undefined) updates.order = rest.order;
          if (autoAdvance !== undefined) updates.autoAdvance = autoAdvance ? 1 : 0;

          return await updatePipelineStage(id, updates);
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Stage update error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ErrorMessages.SERVER.DATABASE_ERROR,
          });
        }
      }),

    /**
     * Delete a pipeline stage
     */
    delete: protectedProcedure
      .input(
        z.object({
          id: z.number().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          validateId(input.id, "Stage ID");

          const stage = await getPipelineStageById(input.id);
          if (!stage) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Pipeline stage not found",
            });
          }

          const program = await getProgramById(stage.programId);
          if (!program) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: ErrorMessages.NOT_FOUND.PROGRAM,
            });
          }

          requireDeletePermission(ctx.user, program.createdBy, "program");

          await deletePipelineStage(input.id);
          return { success: true };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Stage deletion error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ErrorMessages.SERVER.DATABASE_ERROR,
          });
        }
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
          stageId: z.number().positive(),
        })
      )
      .query(async ({ ctx, input }) => {
        try {
          validateId(input.stageId, "Stage ID");

          const stage = await getPipelineStageById(input.stageId);
          if (!stage) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Pipeline stage not found",
            });
          }

          const program = await getProgramById(stage.programId);
          if (!program) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: ErrorMessages.NOT_FOUND.PROGRAM,
            });
          }

          requireAuthorization(ctx.user, program.createdBy, "program");

          return await getStageRequirements(input.stageId);
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Requirements list error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ErrorMessages.SERVER.DATABASE_ERROR,
          });
        }
      }),

    /**
     * Create a new stage requirement
     */
    create: protectedProcedure
      .input(
        z.object({
          stageId: z.number().positive(),
          name: z.string().min(1).max(200),
          description: z.string().max(1000).optional(),
          type: z.enum(["document", "training", "approval", "task"]),
          isRequired: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          validateId(input.stageId, "Stage ID");

          const stage = await getPipelineStageById(input.stageId);
          if (!stage) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Pipeline stage not found",
            });
          }

          const program = await getProgramById(stage.programId);
          if (!program) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: ErrorMessages.NOT_FOUND.PROGRAM,
            });
          }

          requireModifyPermission(ctx.user, program.createdBy, "program");

          const sanitized = sanitizeProgramData({
            name: input.name,
            description: input.description,
          });

          return await createStageRequirement({
            stageId: input.stageId,
            name: sanitized.name!,
            description: sanitized.description,
            type: input.type,
            isRequired: input.isRequired !== false ? 1 : 0,
          });
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Requirement creation error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ErrorMessages.SERVER.DATABASE_ERROR,
          });
        }
      }),

    /**
     * Update a stage requirement
     */
    update: protectedProcedure
      .input(
        z.object({
          id: z.number().positive(),
          name: z.string().min(1).max(200).optional(),
          description: z.string().max(1000).optional(),
          type: z.enum(["document", "training", "approval", "task"]).optional(),
          isRequired: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const { id, isRequired, ...rest } = input;
          validateId(id, "Requirement ID");

          const requirement = await getStageRequirementById(id);
          if (!requirement) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Stage requirement not found",
            });
          }

          const stage = await getPipelineStageById(requirement.stageId);
          if (!stage) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Pipeline stage not found",
            });
          }

          const program = await getProgramById(stage.programId);
          if (!program) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: ErrorMessages.NOT_FOUND.PROGRAM,
            });
          }

          requireModifyPermission(ctx.user, program.createdBy, "program");

          let updates: Record<string, unknown> = {};

          if (rest.name || rest.description) {
            const sanitized = sanitizeProgramData({
              name: rest.name || "",
              description: rest.description,
            });
            if (rest.name) updates.name = sanitized.name;
            if (rest.description !== undefined) updates.description = sanitized.description;
          }

          if (rest.type) updates.type = rest.type;
          if (isRequired !== undefined) updates.isRequired = isRequired ? 1 : 0;

          return await updateStageRequirement(id, updates);
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Requirement update error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ErrorMessages.SERVER.DATABASE_ERROR,
          });
        }
      }),

    /**
     * Delete a stage requirement
     */
    delete: protectedProcedure
      .input(
        z.object({
          id: z.number().positive(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          validateId(input.id, "Requirement ID");

          const requirement = await getStageRequirementById(input.id);
          if (!requirement) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Stage requirement not found",
            });
          }

          const stage = await getPipelineStageById(requirement.stageId);
          if (!stage) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Pipeline stage not found",
            });
          }

          const program = await getProgramById(stage.programId);
          if (!program) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: ErrorMessages.NOT_FOUND.PROGRAM,
            });
          }

          requireDeletePermission(ctx.user, program.createdBy, "program");

          await deleteStageRequirement(input.id);
          return { success: true };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Requirement deletion error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ErrorMessages.SERVER.DATABASE_ERROR,
          });
        }
      }),
  }),

  /**
   * Get progress statistics for participants across programs
   */
  getProgressStats: protectedProcedure
    .input(
      z.object({
        programId: z.number().positive().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // For MVP, return empty data structure
        // TODO: Implement actual database queries when participant tracking is fully built
        // This will query participantProgress table and calculate statistics
        return {
          totalParticipants: 0,
          totalPrograms: 0,
          activeCount: 0,
          completedCount: 0,
          stalledCount: 0,
          bottlenecks: [],
          participants: [],
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Progress stats error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorMessages.SERVER.DATABASE_ERROR,
        });
      }
    }),
});

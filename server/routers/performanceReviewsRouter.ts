import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { performanceReviews, reviewCycles, goals, peerReviewRequests, performanceImprovementPlans } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const performanceReviewsRouter = router({
  /**
   * Create a new review cycle
   */
  createReviewCycle: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        reviewType: z.enum(["annual", "quarterly", "probation", "custom"]),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [cycle] = await db.getDb().insert(reviewCycles).values({
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        reviewType: input.reviewType,
        description: input.description,
        createdBy: ctx.user.id,
      });

      return { id: cycle.insertId };
    }),

  /**
   * List all review cycles
   */
  listReviewCycles: protectedProcedure.query(async () => {
    const cycles = await db.getDb().query.reviewCycles.findMany({
      orderBy: [desc(reviewCycles.createdAt)],
    });

    return cycles;
  }),

  /**
   * Create a performance review
   */
  createReview: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        reviewCycleId: z.number().optional(),
        reviewType: z.enum(["self", "manager", "peer", "360"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [review] = await db.getDb().insert(performanceReviews).values({
        employeeId: input.employeeId,
        reviewerId: ctx.user.id,
        reviewCycleId: input.reviewCycleId,
        reviewType: input.reviewType,
        status: "draft",
      });

      return { id: review.insertId };
    }),

  /**
   * Submit a performance review
   */
  submitReview: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        overallRating: z.number().min(1).max(5),
        strengths: z.string(),
        areasForImprovement: z.string(),
        goals: z.array(z.object({
          title: z.string(),
          description: z.string(),
          targetDate: z.string(),
        })),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db.getDb()
        .update(performanceReviews)
        .set({
          overallRating: input.overallRating,
          strengths: input.strengths,
          areasForImprovement: input.areasForImprovement,
          goals: JSON.stringify(input.goals),
          comments: input.comments,
          status: "submitted",
          submittedAt: new Date(),
        })
        .where(eq(performanceReviews.id, input.id));

      return { success: true };
    }),

  /**
   * List reviews for an employee
   */
  listEmployeeReviews: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const reviews = await db.getDb().query.performanceReviews.findMany({
        where: eq(performanceReviews.employeeId, input.employeeId),
        orderBy: [desc(performanceReviews.createdAt)],
      });

      return reviews.map((review) => ({
        ...review,
        goals: review.goals ? JSON.parse(review.goals as string) : [],
      }));
    }),

  /**
   * Create a goal
   */
  createGoal: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        category: z.enum(["performance", "development", "project", "okr"]),
        targetDate: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [goal] = await db.getDb().insert(goals).values({
        employeeId: input.employeeId,
        title: input.title,
        description: input.description,
        category: input.category,
        targetDate: input.targetDate,
        priority: input.priority,
        createdBy: ctx.user.id,
      });

      return { id: goal.insertId };
    }),

  /**
   * Update goal progress
   */
  updateGoalProgress: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        progress: z.number().min(0).max(100),
        status: z.enum(["not_started", "in_progress", "completed", "cancelled"]),
      })
    )
    .mutation(async ({ input }) => {
      await db.getDb()
        .update(goals)
        .set({
          progress: input.progress,
          status: input.status,
        })
        .where(eq(goals.id, input.id));

      return { success: true };
    }),

  /**
   * List goals for an employee
   */
  listEmployeeGoals: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const employeeGoals = await db.getDb().query.goals.findMany({
        where: eq(goals.employeeId, input.employeeId),
        orderBy: [desc(goals.createdAt)],
      });

      return employeeGoals;
    }),

  /**
   * Request peer review
   */
  requestPeerReview: protectedProcedure
    .input(
      z.object({
        reviewId: z.number(),
        reviewerId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [request] = await db.getDb().insert(peerReviewRequests).values({
        reviewId: input.reviewId,
        requesterId: ctx.user.id,
        reviewerId: input.reviewerId,
        status: "pending",
      });

      return { id: request.insertId };
    }),

  /**
   * List pending peer review requests
   */
  listPendingPeerReviews: protectedProcedure.query(async ({ ctx }) => {
    const requests = await db.getDb().query.peerReviewRequests.findMany({
      where: and(
        eq(peerReviewRequests.reviewerId, ctx.user.id),
        eq(peerReviewRequests.status, "pending")
      ),
    });

    return requests;
  }),

  /**
   * Create performance improvement plan
   */
  createPIP: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        title: z.string(),
        description: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        goals: z.array(z.object({
          title: z.string(),
          description: z.string(),
          targetDate: z.string(),
        })),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [pip] = await db.getDb().insert(performanceImprovementPlans).values({
        employeeId: input.employeeId,
        managerId: ctx.user.id,
        title: input.title,
        description: input.description,
        startDate: input.startDate,
        endDate: input.endDate,
        goals: JSON.stringify(input.goals),
        status: "active",
      });

      return { id: pip.insertId };
    }),

  /**
   * List PIPs for an employee
   */
  listEmployeePIPs: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const pips = await db.getDb().query.performanceImprovementPlans.findMany({
        where: eq(performanceImprovementPlans.employeeId, input.employeeId),
        orderBy: [desc(performanceImprovementPlans.createdAt)],
      });

      return pips.map((pip) => ({
        ...pip,
        goals: pip.goals ? JSON.parse(pip.goals as string) : [],
      }));
    }),

  /**
   * Get review statistics
   */
  getReviewStats: protectedProcedure.query(async () => {
    const allReviews = await db.getDb().query.performanceReviews.findMany();
    const allGoals = await db.getDb().query.goals.findMany();

    const stats = {
      totalReviews: allReviews.length,
      completedReviews: allReviews.filter((r) => r.status === "completed").length,
      pendingReviews: allReviews.filter((r) => r.status === "draft" || r.status === "submitted").length,
      averageRating: allReviews.filter((r) => r.overallRating).reduce((sum, r) => sum + (r.overallRating || 0), 0) / allReviews.filter((r) => r.overallRating).length || 0,
      totalGoals: allGoals.length,
      completedGoals: allGoals.filter((g) => g.status === "completed").length,
      inProgressGoals: allGoals.filter((g) => g.status === "in_progress").length,
    };

    return stats;
  }),
});

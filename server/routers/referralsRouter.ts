import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { referrals } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Generate unique referral code
 */
function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const referralsRouter = router({
  /**
   * Create a new referral
   */
  create: protectedProcedure
    .input(
      z.object({
        candidateName: z.string(),
        candidateEmail: z.string().email(),
        candidatePhone: z.string().optional(),
        jobId: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const referralCode = generateReferralCode();

      const [referral] = await db.insert(referrals).values({
        referralCode,
        referrerId: ctx.user.id,
        candidateName: input.candidateName,
        candidateEmail: input.candidateEmail,
        candidatePhone: input.candidatePhone,
        jobId: input.jobId,
        notes: input.notes,
        status: "pending",
        bonusAmount: 1000, // Default $1000 bonus
      });

      return {
        id: referral.insertId,
        referralCode,
      };
    }),

  /**
   * Get referral by code
   */
  getByCode: protectedProcedure
    .input(
      z.object({
        code: z.string(),
      })
    )
    .query(async ({ input }) => {
      const referral = await db.query.referrals.findFirst({
        where: eq(referrals.referralCode, input.code),
      });

      return referral;
    }),

  /**
   * List user's referrals
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userReferrals = await db.query.referrals.findMany({
      where: eq(referrals.referrerId, ctx.user.id),
      orderBy: [desc(referrals.createdAt)],
    });

    return userReferrals;
  }),

  /**
   * Update referral status
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "applied", "screening", "interview", "offer", "hired", "rejected"]),
        candidateId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(referrals)
        .set({
          status: input.status,
          candidateId: input.candidateId,
        })
        .where(eq(referrals.id, input.id));

      return { success: true };
    }),

  /**
   * Pay referral bonus
   */
  payBonus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const referral = await db.query.referrals.findFirst({
        where: eq(referrals.id, input.id),
      });

      if (!referral) {
        throw new Error("Referral not found");
      }

      if (referral.status !== "hired") {
        throw new Error("Can only pay bonus for hired candidates");
      }

      await db
        .update(referrals)
        .set({
          bonusPaid: referral.bonusAmount,
          bonusPaidAt: new Date(),
        })
        .where(eq(referrals.id, input.id));

      return { success: true, amount: referral.bonusAmount };
    }),

  /**
   * Get referral statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userReferrals = await db.query.referrals.findMany({
      where: eq(referrals.referrerId, ctx.user.id),
    });

    const stats = {
      total: userReferrals.length,
      pending: userReferrals.filter((r) => r.status === "pending").length,
      applied: userReferrals.filter((r) => r.status === "applied").length,
      screening: userReferrals.filter((r) => r.status === "screening").length,
      interview: userReferrals.filter((r) => r.status === "interview").length,
      offer: userReferrals.filter((r) => r.status === "offer").length,
      hired: userReferrals.filter((r) => r.status === "hired").length,
      rejected: userReferrals.filter((r) => r.status === "rejected").length,
      totalBonusEarned: userReferrals.reduce((sum, r) => sum + (r.bonusPaid || 0), 0),
      pendingBonus: userReferrals
        .filter((r) => r.status === "hired" && !r.bonusPaid)
        .reduce((sum, r) => sum + (r.bonusAmount || 0), 0),
    };

    return stats;
  }),

  /**
   * Get leaderboard
   */
  getLeaderboard: protectedProcedure.query(async () => {
    const allReferrals = await db.query.referrals.findMany();

    // Group by referrer and calculate stats
    const referrerStats = new Map<number, {
      referrerId: number;
      totalReferrals: number;
      hiredCount: number;
      totalEarned: number;
    }>();

    for (const referral of allReferrals) {
      const existing = referrerStats.get(referral.referrerId) || {
        referrerId: referral.referrerId,
        totalReferrals: 0,
        hiredCount: 0,
        totalEarned: 0,
      };

      existing.totalReferrals++;
      if (referral.status === "hired") {
        existing.hiredCount++;
      }
      existing.totalEarned += referral.bonusPaid || 0;

      referrerStats.set(referral.referrerId, existing);
    }

    // Convert to array and sort by total earned
    const leaderboard = Array.from(referrerStats.values())
      .sort((a, b) => b.totalEarned - a.totalEarned)
      .slice(0, 10);

    return leaderboard;
  }),
});

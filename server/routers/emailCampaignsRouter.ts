import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { emailCampaigns, emailCampaignSteps, emailCampaignEnrollments, emailCampaignLogs, candidates } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Email Campaigns Router
 * Manages automated drip campaigns for candidate nurturing
 */
export const emailCampaignsRouter = router({
  // List all campaigns
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const campaigns = await db
      .select()
      .from(emailCampaigns)
      .orderBy(desc(emailCampaigns.createdAt));
    
    // Get step counts for each campaign
    const campaignsWithSteps = await Promise.all(
      campaigns.map(async (campaign) => {
        const steps = await db
          .select()
          .from(emailCampaignSteps)
          .where(eq(emailCampaignSteps.campaignId, campaign.id));
        
        const enrollments = await db
          .select()
          .from(emailCampaignEnrollments)
          .where(eq(emailCampaignEnrollments.campaignId, campaign.id));
        
        return {
          ...campaign,
          stepCount: steps.length,
          enrollmentCount: enrollments.length,
          activeEnrollments: enrollments.filter(e => e.status === "active").length,
        };
      })
    );
    
    return campaignsWithSteps;
  }),

  // Get campaign by ID with steps
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [campaign] = await db
        .select()
        .from(emailCampaigns)
        .where(eq(emailCampaigns.id, input.id));
      
      if (!campaign) return null;
      
      const steps = await db
        .select()
        .from(emailCampaignSteps)
        .where(eq(emailCampaignSteps.campaignId, input.id))
        .orderBy(emailCampaignSteps.stepOrder);
      
      return { ...campaign, steps };
    }),

  // Create new campaign
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      triggerType: z.enum(["pipeline_stage_change", "time_based", "manual"]),
      triggerStage: z.string().optional(),
      steps: z.array(z.object({
        subject: z.string().min(1),
        body: z.string().min(1),
        delayDays: z.number().default(0),
        delayHours: z.number().default(0),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      const [campaign] = await db.insert(emailCampaigns).values({
        name: input.name,
        description: input.description || null,
        triggerType: input.triggerType,
        triggerStage: input.triggerStage || null,
        createdBy: ctx.user.openId,
        isActive: true,
      });
      
      const campaignId = Number(campaign.insertId);
      
      // Insert steps
      for (let i = 0; i < input.steps.length; i++) {
        const step = input.steps[i];
        await db.insert(emailCampaignSteps).values({
          campaignId,
          stepOrder: i + 1,
          subject: step.subject,
          body: step.body,
          delayDays: step.delayDays,
          delayHours: step.delayHours,
        });
      }
      
      return { id: campaignId };
    }),

  // Update campaign
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1),
      description: z.string().optional(),
      triggerType: z.enum(["pipeline_stage_change", "time_based", "manual"]),
      triggerStage: z.string().optional(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      await db.update(emailCampaigns)
        .set({
          name: input.name,
          description: input.description || null,
          triggerType: input.triggerType,
          triggerStage: input.triggerStage || null,
          isActive: input.isActive,
        })
        .where(eq(emailCampaigns.id, input.id));
      
      return { success: true };
    }),

  // Toggle campaign active status
  toggleActive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      const [campaign] = await db
        .select()
        .from(emailCampaigns)
        .where(eq(emailCampaigns.id, input.id));
      
      if (!campaign) throw new Error("Campaign not found");
      
      await db.update(emailCampaigns)
        .set({ isActive: !campaign.isActive })
        .where(eq(emailCampaigns.id, input.id));
      
      return { isActive: !campaign.isActive };
    }),

  // Delete campaign
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      // Delete steps first
      await db.delete(emailCampaignSteps)
        .where(eq(emailCampaignSteps.campaignId, input.id));
      
      // Delete enrollments
      await db.delete(emailCampaignEnrollments)
        .where(eq(emailCampaignEnrollments.campaignId, input.id));
      
      // Delete campaign
      await db.delete(emailCampaigns)
        .where(eq(emailCampaigns.id, input.id));
      
      return { success: true };
    }),

  // Manually enroll candidate in campaign
  enrollCandidate: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      candidateId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      // Check if already enrolled
      const [existing] = await db
        .select()
        .from(emailCampaignEnrollments)
        .where(and(
          eq(emailCampaignEnrollments.campaignId, input.campaignId),
          eq(emailCampaignEnrollments.candidateId, input.candidateId)
        ));
      
      if (existing) {
        throw new Error("Candidate is already enrolled in this campaign");
      }
      
      await db.insert(emailCampaignEnrollments).values({
        campaignId: input.campaignId,
        candidateId: input.candidateId,
        currentStep: 1,
        status: "active",
      });
      
      return { success: true };
    }),

  // Get campaign stats
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    
    const allCampaigns = await db.select().from(emailCampaigns);
    const allEnrollments = await db.select().from(emailCampaignEnrollments);
    const allLogs = await db.select().from(emailCampaignLogs);
    
    return {
      totalCampaigns: allCampaigns.length,
      activeCampaigns: allCampaigns.filter(c => c.isActive).length,
      totalEnrollments: allEnrollments.length,
      activeEnrollments: allEnrollments.filter(e => e.status === "active").length,
      emailsSent: allLogs.length,
      emailsOpened: allLogs.filter(l => l.openedAt).length,
      emailsClicked: allLogs.filter(l => l.clickedAt).length,
    };
  }),

  // Get default campaign templates
  getTemplates: publicProcedure.query(() => {
    return [
      {
        id: "welcome",
        name: "Welcome Series",
        description: "Introduce candidates to your company and culture",
        triggerType: "pipeline_stage_change",
        triggerStage: "applied",
        steps: [
          {
            subject: "Welcome to {{companyName}}!",
            body: "Dear {{candidateName}},\n\nThank you for applying to {{jobTitle}}. We're excited to review your application!\n\nHere's what happens next:\n1. Our team will review your application\n2. If selected, we'll reach out for an initial conversation\n3. You'll meet with the hiring team\n\nBest regards,\n{{companyName}} Team",
            delayDays: 0,
            delayHours: 1,
          },
          {
            subject: "Learn more about us",
            body: "Hi {{candidateName}},\n\nWe wanted to share more about what makes {{companyName}} special.\n\n[Company culture information]\n\nWe look forward to potentially working together!\n\nBest,\n{{companyName}} Team",
            delayDays: 2,
            delayHours: 0,
          },
        ],
      },
      {
        id: "interview_prep",
        name: "Interview Preparation",
        description: "Help candidates prepare for their interview",
        triggerType: "pipeline_stage_change",
        triggerStage: "interview",
        steps: [
          {
            subject: "Preparing for your interview at {{companyName}}",
            body: "Hi {{candidateName}},\n\nCongratulations on moving to the interview stage for {{jobTitle}}!\n\nHere are some tips to prepare:\n- Research our company and mission\n- Review the job description\n- Prepare questions for us\n\nGood luck!\n{{companyName}} Team",
            delayDays: 0,
            delayHours: 2,
          },
          {
            subject: "Interview reminder",
            body: "Hi {{candidateName}},\n\nJust a friendly reminder about your upcoming interview.\n\nPlease arrive 10 minutes early and bring:\n- Photo ID\n- Any relevant portfolio materials\n\nSee you soon!\n{{companyName}} Team",
            delayDays: 1,
            delayHours: 0,
          },
        ],
      },
      {
        id: "onboarding",
        name: "Onboarding Welcome",
        description: "Welcome new hires and prepare them for day one",
        triggerType: "pipeline_stage_change",
        triggerStage: "hired",
        steps: [
          {
            subject: "Welcome to the team, {{candidateName}}!",
            body: "Dear {{candidateName}},\n\nWe're thrilled to welcome you to {{companyName}}!\n\nYour start date is approaching, and we want to make sure you're ready.\n\nPlease complete the following before your first day:\n- Sign your offer letter\n- Complete background check forms\n- Review the employee handbook\n\nWelcome aboard!\n{{companyName}} Team",
            delayDays: 0,
            delayHours: 0,
          },
          {
            subject: "Getting ready for day one",
            body: "Hi {{candidateName}},\n\nYour first day is coming up! Here's what to expect:\n\n- Arrive at [time] at [location]\n- Bring your ID and completed paperwork\n- You'll meet with HR and your manager\n- Lunch will be provided\n\nWe can't wait to have you on the team!\n{{companyName}} Team",
            delayDays: 3,
            delayHours: 0,
          },
        ],
      },
    ];
  }),
});

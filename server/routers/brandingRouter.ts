import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { brandingSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "../storage";

/**
 * Branding Settings Router
 * Manages career site branding customization
 */
export const brandingRouter = router({
  // Get branding settings for a company
  get: publicProcedure
    .input(z.object({ companyId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const companyId = input?.companyId || 1; // Default to company 1 for public access
      
      const [settings] = await db
        .select()
        .from(brandingSettings)
        .where(eq(brandingSettings.companyId, companyId))
        .limit(1);
      
      if (!settings) {
        // Return default branding
        return {
          id: 0,
          companyId,
          logoUrl: null,
          faviconUrl: null,
          heroImageUrl: null,
          primaryColor: "#3B82F6",
          secondaryColor: "#1E40AF",
          accentColor: "#10B981",
          backgroundColor: "#FFFFFF",
          textColor: "#1F2937",
          headingFont: "Inter",
          bodyFont: "Inter",
          organizationName: "Our Organization",
          tagline: "Building a Better Future Together",
          description: "We are a nonprofit organization dedicated to making a positive impact in our community.",
          mission: "Our mission is to empower individuals and strengthen communities through innovative programs and compassionate service.",
          contactEmail: null,
          contactPhone: null,
          address: null,
          websiteUrl: null,
          linkedinUrl: null,
          twitterUrl: null,
          facebookUrl: null,
          instagramUrl: null,
          showMission: 1,
          showBenefits: 1,
          showTeamSection: 0,
          customCss: null,
          benefits: [
            "Competitive salary and benefits",
            "Flexible work arrangements",
            "Professional development opportunities",
            "Meaningful work with community impact"
          ],
        };
      }
      
      return settings;
    }),

  // Update branding settings
  update: protectedProcedure
    .input(z.object({
      // Visual Identity
      logoUrl: z.string().nullable().optional(),
      faviconUrl: z.string().nullable().optional(),
      heroImageUrl: z.string().nullable().optional(),
      
      // Colors
      primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      
      // Typography
      headingFont: z.string().max(100).optional(),
      bodyFont: z.string().max(100).optional(),
      
      // Organization Info
      organizationName: z.string().max(255).optional(),
      tagline: z.string().max(255).optional(),
      description: z.string().optional(),
      mission: z.string().optional(),
      
      // Contact
      contactEmail: z.string().email().nullable().optional(),
      contactPhone: z.string().max(50).nullable().optional(),
      address: z.string().nullable().optional(),
      
      // Social Media
      websiteUrl: z.string().url().nullable().optional(),
      linkedinUrl: z.string().url().nullable().optional(),
      twitterUrl: z.string().url().nullable().optional(),
      facebookUrl: z.string().url().nullable().optional(),
      instagramUrl: z.string().url().nullable().optional(),
      
      // Settings
      showMission: z.number().min(0).max(1).optional(),
      showBenefits: z.number().min(0).max(1).optional(),
      showTeamSection: z.number().min(0).max(1).optional(),
      customCss: z.string().nullable().optional(),
      benefits: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const companyId = ctx.user?.companyId || 1;
      
      // Check if settings exist
      const [existing] = await db
        .select()
        .from(brandingSettings)
        .where(eq(brandingSettings.companyId, companyId))
        .limit(1);
      
      if (existing) {
        // Update existing
        await db
          .update(brandingSettings)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(brandingSettings.companyId, companyId));
      } else {
        // Create new
        await db.insert(brandingSettings).values({
          companyId,
          ...input,
        });
      }
      
      return { success: true };
    }),

  // Upload logo
  uploadLogo: protectedProcedure
    .input(z.object({
      fileData: z.string(), // Base64 encoded
      fileName: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const companyId = ctx.user?.companyId || 1;
      
      // Decode base64
      const buffer = Buffer.from(input.fileData, "base64");
      
      // Generate unique filename
      const ext = input.fileName.split(".").pop() || "png";
      const key = `branding/${companyId}/logo-${Date.now()}.${ext}`;
      
      // Upload to S3
      const { url } = await storagePut(key, buffer, input.mimeType);
      
      // Update branding settings
      const [existing] = await db
        .select()
        .from(brandingSettings)
        .where(eq(brandingSettings.companyId, companyId))
        .limit(1);
      
      if (existing) {
        await db
          .update(brandingSettings)
          .set({ logoUrl: url, updatedAt: new Date() })
          .where(eq(brandingSettings.companyId, companyId));
      } else {
        await db.insert(brandingSettings).values({
          companyId,
          logoUrl: url,
        });
      }
      
      return { url };
    }),

  // Upload hero image
  uploadHeroImage: protectedProcedure
    .input(z.object({
      fileData: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const companyId = ctx.user?.companyId || 1;
      
      const buffer = Buffer.from(input.fileData, "base64");
      const ext = input.fileName.split(".").pop() || "jpg";
      const key = `branding/${companyId}/hero-${Date.now()}.${ext}`;
      
      const { url } = await storagePut(key, buffer, input.mimeType);
      
      const [existing] = await db
        .select()
        .from(brandingSettings)
        .where(eq(brandingSettings.companyId, companyId))
        .limit(1);
      
      if (existing) {
        await db
          .update(brandingSettings)
          .set({ heroImageUrl: url, updatedAt: new Date() })
          .where(eq(brandingSettings.companyId, companyId));
      } else {
        await db.insert(brandingSettings).values({
          companyId,
          heroImageUrl: url,
        });
      }
      
      return { url };
    }),

  // Get available fonts
  getFonts: publicProcedure.query(() => {
    return [
      { name: "Inter", value: "Inter" },
      { name: "Roboto", value: "Roboto" },
      { name: "Open Sans", value: "Open Sans" },
      { name: "Lato", value: "Lato" },
      { name: "Montserrat", value: "Montserrat" },
      { name: "Poppins", value: "Poppins" },
      { name: "Source Sans Pro", value: "Source Sans Pro" },
      { name: "Nunito", value: "Nunito" },
      { name: "Playfair Display", value: "Playfair Display" },
      { name: "Merriweather", value: "Merriweather" },
      { name: "Georgia", value: "Georgia" },
      { name: "Times New Roman", value: "Times New Roman" },
    ];
  }),

  // Get color presets
  getColorPresets: publicProcedure.query(() => {
    return [
      {
        name: "Professional Blue",
        primary: "#3B82F6",
        secondary: "#1E40AF",
        accent: "#10B981",
      },
      {
        name: "Nonprofit Green",
        primary: "#059669",
        secondary: "#047857",
        accent: "#F59E0B",
      },
      {
        name: "Warm Orange",
        primary: "#EA580C",
        secondary: "#C2410C",
        accent: "#0EA5E9",
      },
      {
        name: "Royal Purple",
        primary: "#7C3AED",
        secondary: "#5B21B6",
        accent: "#EC4899",
      },
      {
        name: "Teal Trust",
        primary: "#0D9488",
        secondary: "#0F766E",
        accent: "#F97316",
      },
      {
        name: "Classic Red",
        primary: "#DC2626",
        secondary: "#B91C1C",
        accent: "#2563EB",
      },
    ];
  }),
});

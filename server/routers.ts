import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { documentsRouter } from "./routers/documentsRouter";
import { jobsRouter } from "./routers/jobsRouter";
import { candidatesRouter } from "./routers/candidatesRouter";
import { aiRouter } from "./routers/aiRouter";
import { assistantRouter } from "./routers/assistantRouter";
import { programsRouter } from "./routers/programsRouter";
import { complianceRouter } from "./routers/complianceRouter";
import { remindersRouter } from "./routers/remindersRouter";
import { bulkImportRouter } from "./routers/bulkImportRouter";
import { participantPortalRouter } from "./routers/participantPortalRouter";
import { smsRouter } from "./routers/smsRouter";
import { templatesRouter } from "./routers/templatesRouter";
import { analyticsRouter } from "./routers/analyticsRouter";
import { calendarRouter } from "./routers/calendarRouter";
import { ocrRouter } from "./routers/ocrRouter";
import { videoTutorialsRouter } from "./routers/videoTutorialsRouter";
import { referenceChecksRouter } from "./routers/referenceChecksRouter";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Feature routers
  jobs: jobsRouter,
  candidates: candidatesRouter,
  programs: programsRouter,
  ai: aiRouter,
  assistant: assistantRouter,
  documents: documentsRouter,
  compliance: complianceRouter,
  reminders: remindersRouter,
  bulkImport: bulkImportRouter,
  participantPortal: participantPortalRouter,
  sms: smsRouter,
  templates: templatesRouter,
  analytics: analyticsRouter,
  calendar: calendarRouter,
  ocr: ocrRouter,
  videoTutorials: videoTutorialsRouter,
  referenceChecks: referenceChecksRouter,
});

export type AppRouter = typeof appRouter;

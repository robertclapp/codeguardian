import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Programs from "./pages/Programs";
import PipelineStages from "./pages/PipelineStages";
import StageRequirements from "./pages/StageRequirements";
import CreateJob from "./pages/CreateJob";
import Documents from "./pages/Documents";
import DocumentApproval from "./pages/DocumentApproval";
import Progress from "./pages/Progress";
import Compliance from "./pages/Compliance";
import ReminderSettings from "./pages/ReminderSettings";
import BulkImport from "./pages/BulkImport";
import ParticipantPortal from "./pages/ParticipantPortal";
import SMSSettings from "./pages/SMSSettings";
import Templates from "./pages/Templates";
import Analytics from "./pages/Analytics";
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./pages/UserManagement";
import AuditLogs from "./pages/AuditLogs";
import TemplateEditor from "./pages/TemplateEditor";
import CandidatePortal from "./pages/CandidatePortal";
import DocumentAutoReview from "./pages/DocumentAutoReview";
import EmployerPortal from "./pages/EmployerPortal";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";
import SMSNotifications from "./pages/SMSNotifications";
import BulkOperations from "./pages/BulkOperations";
import ReportingDashboard from "./pages/ReportingDashboard";
import SkillsAssessment from "./pages/SkillsAssessment";
import BackgroundCheck from "./pages/BackgroundCheck";
import DataMigration from "./pages/DataMigration";
import { WebhookSettings } from "./pages/WebhookSettings";
import VideoTutorials from "./pages/VideoTutorials";
import AdvancedSearch from "./pages/AdvancedSearch";
import CommunicationTesting from "./pages/CommunicationTesting";
import SwipeDemo from "./pages/SwipeDemo";
import EmailTemplates from "./pages/EmailTemplates";
import InterviewScheduler from "./pages/InterviewScheduler";
import CandidatePipeline from "./pages/CandidatePipeline";
import AutomatedWorkflows from "./pages/AutomatedWorkflows";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import CollaborationDemo from "@/pages/CollaborationDemo";
// Temporarily disabled - need to fix email service integration
// import VideoInterviewScheduling from "@/pages/VideoInterviewScheduling";
// import OfferLetters from "@/pages/OfferLetters";
import SkillsGapAnalysis from "./pages/SkillsGapAnalysis";
import Careers from "./pages/Careers";
import EmailCampaigns from "./pages/EmailCampaigns";
import ESignatures from "@/pages/ESignatures";
import BrandingSettings from "@/pages/BrandingSettings";
import PerformanceReviews from "./pages/PerformanceReviews";
import PublicJobBoard from "./pages/PublicJobBoard";
import Referrals from "@/pages/Referrals";
import AIInterviewAssistant from "./pages/AIInterviewAssistant";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { PushNotificationPrompt } from "./components/PushNotificationPrompt";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/jobs"} component={Jobs} />
      <Route path={"/programs"} component={Programs} />
      <Route path={"/programs/:id/stages"} component={PipelineStages} />
      <Route path={"/programs/:programId/stages/:stageId/requirements"} component={StageRequirements} />
      <Route path={"/create-job"} component={CreateJob} />
      <Route path={"/documents"} component={Documents} />
      <Route path={"/documents/approval"} component={DocumentApproval} />
      <Route path={"/progress"} component={Progress} />
      <Route path={"/compliance"} component={Compliance} />
      <Route path={"/settings/reminders"} component={ReminderSettings} />
      <Route path={"/bulk-import"} component={BulkImport} />
      <Route path={"/participant-portal"} component={ParticipantPortal} />
      <Route path={"/settings/sms"} component={SMSSettings} />
      <Route path={"/templates"} component={Templates} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/admin" component={AdminDashboard} />
        <Route path="/users" component={UserManagement} />
        <Route path="/audit" component={AuditLogs} />
        <Route path="/template-editor" component={TemplateEditor} />
      <Route path="/candidate-portal" component={CandidatePortal} />
      <Route path="/document-auto-review" component={DocumentAutoReview} />
      <Route path="/employer-portal" component={EmployerPortal} />
      <Route path="/advanced-analytics" component={AdvancedAnalytics} />
      <Route path="/sms-notifications" component={SMSNotifications} />
      <Route path="/bulk-operations" component={BulkOperations} />
      <Route path="/reporting" component={ReportingDashboard} />
      <Route path="/skills-assessment" component={SkillsAssessment} />
      <Route path="/background-check" component={BackgroundCheck} />
      <Route path="/data-migration" component={DataMigration} />
      <Route path="/webhook-settings" component={WebhookSettings} />
      <Route path="/video-tutorials" component={VideoTutorials} />
      <Route path="/advanced-search" component={AdvancedSearch} />
        <Route path="/swipe-demo" component={SwipeDemo} />
        <Route path="/email-templates" component={EmailTemplates} />
        <Route path="/interview-scheduler" component={InterviewScheduler} />
        <Route path="/candidate-pipeline" component={CandidatePipeline} />
        <Route path="/automated-workflows" component={AutomatedWorkflows} />
        <Route path="/analytics-dashboard" component={AnalyticsDashboard} />
      <Route path="/collaboration-demo" element={<CollaborationDemo />} />
            {/* Temporarily disabled - need to fix email service integration */}
            {/* <Route path="/video-interview-scheduling" element={<VideoInterviewScheduling />} /> */}
            {/* <Route path="/offer-letters" element={<OfferLetters />} /> */}
             <Route path="/skills-gap" element={<SkillsGapAnalysis />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/email-campaigns" element={<EmailCampaigns />} />
           <Route path="/e-signatures" component={ESignatures} />
              <Route path="/branding" component={BrandingSettings} />
        <Route path="/performance-reviews" element={<PerformanceReviews />} />
        <Route path="/job-board" element={<PublicJobBoard />} />
            <Route path="/referrals" element={<Referrals />} />
        <Route path="/ai-interview" component={AIInterviewAssistant} />
        <Route path="/communication-testing" component={CommunicationTesting} />
        <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <OfflineIndicator />
          <Router />
          <PWAInstallPrompt />
          <PushNotificationPrompt />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

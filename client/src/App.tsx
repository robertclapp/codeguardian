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
import CommunicationTesting from "./pages/CommunicationTesting";

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
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

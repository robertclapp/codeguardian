import { useState, useEffect } from "react";
import Joyride, { Step, CallBackProps, STATUS, EVENTS } from "react-joyride";

/**
 * Onboarding Tutorial Component
 * 
 * Interactive tutorial overlay that guides new admins through:
 * - Creating their first job posting
 * - Adding a candidate
 * - Setting up an onboarding program
 * 
 * Uses react-joyride for step-by-step guided tours
 */

interface OnboardingTutorialProps {
  onComplete?: () => void;
}

export default function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Check if user has completed onboarding
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem("hasCompletedOnboarding");
    if (!hasCompletedOnboarding) {
      // Start tutorial after a short delay
      setTimeout(() => setRun(true), 1000);
    }
  }, []);

  const steps: Step[] = [
    {
      target: "body",
      content: (
        <div>
          <h2 className="text-xl font-bold mb-2">Welcome to Your AI-Powered HR Platform!</h2>
          <p className="mb-2">
            Let's take a quick tour to help you get started. This will only take a minute.
          </p>
          <p className="text-sm text-muted-foreground">
            You can skip this tutorial anytime by clicking "Skip" or pressing ESC.
          </p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[href="/create-job"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">Create Your First Job Posting</h3>
          <p>
            Click here to create a new job posting. Our AI will help you write compelling job
            descriptions in seconds!
          </p>
        </div>
      ),
      placement: "right",
    },
    {
      target: '[href="/programs"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">Set Up Onboarding Programs</h3>
          <p>
            Create customized onboarding programs with configurable stages and requirements for
            different training programs.
          </p>
        </div>
      ),
      placement: "right",
    },
    {
      target: '[href="/documents"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">Manage Documents</h3>
          <p>
            Upload, review, and approve participant documents. Our OCR system can automatically
            extract data from I-9 and W-4 forms.
          </p>
        </div>
      ),
      placement: "right",
    },
    {
      target: '[href="/progress"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">Track Participant Progress</h3>
          <p>
            Monitor participant progress through onboarding stages, identify bottlenecks, and see
            completion statistics.
          </p>
        </div>
      ),
      placement: "right",
    },
    {
      target: '[href="/compliance"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">Compliance Reporting</h3>
          <p>
            Generate compliance reports for state requirements, track training hours, and export
            data to CSV for funders.
          </p>
        </div>
      ),
      placement: "right",
    },
    {
      target: '[href="/analytics"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">Program Analytics</h3>
          <p>
            View completion trends, time-to-completion metrics, bottleneck analysis, and
            satisfaction scores.
          </p>
        </div>
      ),
      placement: "right",
    },
    {
      target: '[href="/admin"]',
      content: (
        <div>
          <h3 className="font-bold mb-2">Admin Dashboard</h3>
          <p>
            Monitor system health, view job scheduler status, manage users, and access audit logs
            from the admin dashboard.
          </p>
        </div>
      ),
      placement: "right",
    },
    {
      target: "body",
      content: (
        <div>
          <h2 className="text-xl font-bold mb-2">You're All Set!</h2>
          <p className="mb-2">
            You now know the basics of navigating your HR platform. Here are some next steps:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Create your first job posting using the AI job description generator</li>
            <li>Set up an onboarding program with custom stages</li>
            <li>Configure email and SMS notifications in Settings</li>
            <li>Import participants using the bulk CSV import feature</li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            You can always restart this tutorial from the Help menu.
          </p>
        </div>
      ),
      placement: "center",
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      // Mark onboarding as complete
      localStorage.setItem("hasCompletedOnboarding", "true");
      setRun(false);
      onComplete?.();
    } else if (type === EVENTS.STEP_AFTER) {
      setStepIndex(index + 1);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "#2563eb", // Blue color matching the app theme
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "8px",
          padding: "20px",
        },
        tooltipContent: {
          padding: "10px 0",
        },
        buttonNext: {
          backgroundColor: "#2563eb",
          borderRadius: "6px",
          padding: "8px 16px",
        },
        buttonBack: {
          color: "#64748b",
          marginRight: "8px",
        },
        buttonSkip: {
          color: "#64748b",
        },
      }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip Tutorial",
      }}
    />
  );
}

/**
 * Helper function to restart the onboarding tutorial
 * Can be called from a Help menu or settings page
 */
export function restartOnboarding() {
  localStorage.removeItem("hasCompletedOnboarding");
  window.location.reload();
}

# Testing Guide: Accessible HR Platform

**Purpose:** Ensure reliability, accessibility, and correctness of the platform  
**Framework:** Vitest for unit and integration tests  
**Coverage Goal:** 80% code coverage minimum

---

## Testing Philosophy

This platform serves nonprofit organizations supporting people with disabilities. Testing must ensure not only functional correctness but also accessibility compliance and data integrity. Every feature that impacts participant data or organizational compliance requires comprehensive test coverage.

---

## Test Structure

Tests are organized by domain and type, following the project structure.

### Directory Organization

```
server/
  ├── auth.logout.test.ts          # Authentication tests
  ├── routers/
  │   ├── jobs.test.ts              # Job management tests
  │   ├── candidates.test.ts        # Candidate management tests
  │   ├── ai.test.ts                # AI services tests
  │   └── assistant.test.ts         # AI assistant tests
  └── db.test.ts                    # Database helper tests

client/
  └── src/
      ├── components/
      │   └── __tests__/
      │       ├── DashboardLayout.test.tsx
      │       └── AIChatBox.test.tsx
      └── pages/
          └── __tests__/
              ├── Home.test.tsx
              ├── Dashboard.test.tsx
              └── Jobs.test.tsx
```

---

## Running Tests

### All Tests

```bash
pnpm test
```

### Watch Mode (for development)

```bash
pnpm test --watch
```

### Coverage Report

```bash
pnpm test --coverage
```

### Specific Test File

```bash
pnpm test server/routers/jobs.test.ts
```

---

## Writing Backend Tests

Backend tests verify tRPC procedures, database operations, and business logic.

### Example: Job Creation Test

```typescript
import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("jobs.create", () => {
  // Create authenticated context for protected procedures
  function createAuthContext(): TrpcContext {
    return {
      user: {
        id: 1,
        openId: "test-user",
        email: "test@example.com",
        name: "Test User",
        loginMethod: "manus",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
  }

  it("creates a job with valid data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const job = await caller.jobs.create({
      title: "Peer Support Specialist",
      description: "Support individuals with disabilities",
      location: "Central PA",
      employmentType: "Full-time",
      status: "open",
    });

    expect(job).toMatchObject({
      title: "Peer Support Specialist",
      description: "Support individuals with disabilities",
      location: "Central PA",
      employmentType: "Full-time",
      status: "open",
    });
    expect(job.id).toBeGreaterThan(0);
    expect(job.createdAt).toBeInstanceOf(Date);
  });

  it("requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.jobs.create({
        title: "Test Job",
        description: "Test",
      })
    ).rejects.toThrow("UNAUTHORIZED");
  });

  it("validates required fields", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.jobs.create({
        title: "",
        description: "Test",
      })
    ).rejects.toThrow();
  });
});
```

### Example: Candidate Scoring Test

```typescript
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";

// Mock the LLM invocation
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          score: 85,
          insights: "Strong match for the position",
          strengths: ["Relevant experience", "Good communication skills"],
          concerns: ["Limited technical background"]
        })
      }
    }]
  })
}));

describe("ai.scoreCandidate", () => {
  it("returns AI-generated score and insights", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create a job and candidate
    const job = await caller.jobs.create({
      title: "Test Position",
      description: "Test description",
    });

    const candidate = await caller.candidates.submitApplication({
      jobId: job.id,
      name: "Test Candidate",
      email: "candidate@example.com",
    });

    // Score the candidate
    const result = await caller.ai.scoreCandidate({
      candidateId: candidate.id,
    });

    expect(result.score).toBe(85);
    expect(result.insights).toContain("Strong match");
    expect(result.strengths).toHaveLength(2);
    expect(result.concerns).toHaveLength(1);
  });
});
```

---

## Writing Frontend Tests

Frontend tests verify component rendering, user interactions, and accessibility.

### Example: Dashboard Component Test

```typescript
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Dashboard from "@/pages/Dashboard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the tRPC hooks
vi.mock("@/lib/trpc", () => ({
  trpc: {
    jobs: {
      list: {
        useQuery: () => ({
          data: [
            {
              id: 1,
              title: "Test Job",
              status: "open",
              createdAt: new Date(),
            },
          ],
          isLoading: false,
        }),
      },
    },
  },
}));

describe("Dashboard", () => {
  it("renders welcome message", () => {
    const queryClient = new QueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
  });

  it("displays job statistics", () => {
    const queryClient = new QueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    expect(screen.getByText("Total Jobs")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
```

---

## Accessibility Testing

Accessibility is critical for this platform. Every component must be tested for WCAG compliance.

### Automated Accessibility Tests

```typescript
import { describe, it } from "vitest";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import Dashboard from "@/pages/Dashboard";

expect.extend(toHaveNoViolations);

describe("Dashboard Accessibility", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(<Dashboard />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("supports keyboard navigation", () => {
    render(<Dashboard />);
    
    // Tab through interactive elements
    const firstButton = screen.getAllByRole("button")[0];
    firstButton?.focus();
    expect(document.activeElement).toBe(firstButton);
  });

  it("has proper ARIA labels", () => {
    render(<Dashboard />);
    
    const navigation = screen.getByRole("navigation");
    expect(navigation).toHaveAttribute("aria-label");
  });
});
```

### Manual Accessibility Checklist

For each new component or page, verify:

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA standards (4.5:1 for normal text)
- [ ] All images have alt text
- [ ] Forms have proper labels
- [ ] Error messages are associated with form fields
- [ ] Dynamic content changes are announced to screen readers
- [ ] Headings follow logical hierarchy (h1 → h2 → h3)
- [ ] Tables have proper headers
- [ ] Links have descriptive text (not "click here")

---

## Integration Tests

Integration tests verify that multiple components work together correctly.

### Example: Complete Application Flow

```typescript
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Complete Application Flow", () => {
  it("allows candidate to apply and get scored", async () => {
    const adminCtx = createAuthContext();
    const adminCaller = appRouter.createCaller(adminCtx);

    // Admin creates a job
    const job = await adminCaller.jobs.create({
      title: "Peer Support Specialist",
      description: "Support individuals with disabilities",
      requirements: "Lived experience with disability",
    });

    // Public user submits application
    const publicCtx: TrpcContext = {
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const publicCaller = appRouter.createCaller(publicCtx);

    const candidate = await publicCaller.candidates.submitApplication({
      jobId: job.id,
      name: "Jane Doe",
      email: "jane@example.com",
      coverLetter: "I have personal experience...",
    });

    expect(candidate.stage).toBe("applied");

    // Admin scores the candidate
    const score = await adminCaller.ai.scoreCandidate({
      candidateId: candidate.id,
    });

    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);

    // Admin moves candidate to next stage
    const updated = await adminCaller.candidates.updateStage({
      id: candidate.id,
      stage: "phone_screen",
    });

    expect(updated.stage).toBe("phone_screen");

    // Admin adds a note
    const note = await adminCaller.candidates.addNote({
      candidateId: candidate.id,
      content: "Great interview, moving forward",
    });

    expect(note.content).toContain("Great interview");
  });
});
```

---

## Database Tests

Test database operations to ensure data integrity.

### Example: Database Helper Test

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createJob, getJobById, updateJob, deleteJob } from "./db";

describe("Job Database Operations", () => {
  let testJobId: number;

  beforeEach(async () => {
    // Create test data
    const job = await createJob({
      title: "Test Job",
      description: "Test Description",
    });
    testJobId = job.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testJobId) {
      await deleteJob(testJobId);
    }
  });

  it("retrieves job by ID", async () => {
    const job = await getJobById(testJobId);
    expect(job).toBeDefined();
    expect(job?.title).toBe("Test Job");
  });

  it("updates job fields", async () => {
    await updateJob(testJobId, {
      title: "Updated Title",
    });

    const job = await getJobById(testJobId);
    expect(job?.title).toBe("Updated Title");
  });

  it("handles non-existent job", async () => {
    const job = await getJobById(999999);
    expect(job).toBeUndefined();
  });
});
```

---

## Mocking External Services

Mock external services to avoid dependencies in tests.

### Mocking AI Services

```typescript
import { vi } from "vitest";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockImplementation(async ({ messages }) => {
    // Return mock response based on input
    const userMessage = messages[messages.length - 1].content;
    
    if (userMessage.includes("job description")) {
      return {
        choices: [{
          message: {
            content: JSON.stringify({
              description: "Mock job description",
              requirements: "Mock requirements",
              responsibilities: "Mock responsibilities",
            })
          }
        }]
      };
    }
    
    return {
      choices: [{
        message: {
          content: "Mock AI response"
        }
      }]
    };
  }),
}));
```

### Mocking File Storage

```typescript
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: "https://mock-storage.com/file.pdf",
    key: "mock-key",
  }),
  storageGet: vi.fn().mockResolvedValue({
    url: "https://mock-storage.com/file.pdf",
    key: "mock-key",
  }),
}));
```

---

## Test Data Management

Use factories to create consistent test data.

### Test Data Factory

```typescript
// test/factories.ts
export function createTestUser(overrides = {}) {
  return {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

export function createTestJob(overrides = {}) {
  return {
    title: "Test Job",
    description: "Test Description",
    location: "Test Location",
    employmentType: "Full-time",
    status: "open" as const,
    ...overrides,
  };
}

export function createTestCandidate(jobId: number, overrides = {}) {
  return {
    jobId,
    name: "Test Candidate",
    email: "candidate@example.com",
    phone: "555-0100",
    ...overrides,
  };
}
```

---

## Continuous Integration

Tests run automatically on every push and pull request via GitHub Actions.

### CI Configuration

See `.github/workflows/ci.yml` for the complete CI pipeline configuration.

**CI Steps:**
1. Install dependencies
2. Run TypeScript type checking
3. Run linting
4. Run all tests with coverage
5. Upload coverage reports
6. Run security scans
7. Run accessibility tests

### Coverage Requirements

Pull requests must maintain or improve code coverage. The CI pipeline fails if coverage drops below 80%.

---

## Best Practices

### Test Naming

Use descriptive test names that explain what is being tested and the expected outcome.

**Good:**
```typescript
it("creates a job with valid data and returns the job with an ID")
it("requires authentication for protected procedures")
it("validates email format in candidate applications")
```

**Bad:**
```typescript
it("works")
it("test job creation")
it("should pass")
```

### Test Independence

Each test should be independent and not rely on other tests.

**Good:**
```typescript
describe("jobs", () => {
  it("creates a job", async () => {
    const job = await createJob({ title: "Test" });
    expect(job.id).toBeDefined();
  });

  it("updates a job", async () => {
    const job = await createJob({ title: "Test" });
    const updated = await updateJob(job.id, { title: "Updated" });
    expect(updated.title).toBe("Updated");
  });
});
```

**Bad:**
```typescript
describe("jobs", () => {
  let jobId: number;

  it("creates a job", async () => {
    const job = await createJob({ title: "Test" });
    jobId = job.id; // Don't share state between tests
  });

  it("updates a job", async () => {
    const updated = await updateJob(jobId, { title: "Updated" });
    expect(updated.title).toBe("Updated");
  });
});
```

### Arrange-Act-Assert Pattern

Structure tests clearly with setup, execution, and verification.

```typescript
it("scores a candidate", async () => {
  // Arrange
  const job = await createJob({ title: "Test Job" });
  const candidate = await createCandidate(job.id);
  
  // Act
  const score = await scoreCandidate(candidate.id);
  
  // Assert
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);
});
```

---

## Troubleshooting Tests

### Common Issues

**Tests fail in CI but pass locally:**
- Check for timezone differences (use UTC in tests)
- Verify environment variables are set in CI
- Look for race conditions or timing issues

**Database tests fail:**
- Ensure test database is properly configured
- Check that migrations have run
- Verify test data cleanup is working

**Frontend tests fail:**
- Mock all external dependencies
- Check for missing providers (QueryClient, Router, etc.)
- Verify component imports are correct

---

## Future Testing Enhancements

### Planned Additions

- **End-to-end tests** using Playwright for full user flows
- **Performance tests** to ensure page load times meet accessibility standards
- **Load tests** to verify system handles expected concurrent users
- **Visual regression tests** to catch unintended UI changes
- **Contract tests** for API integrations

---

**Document Version:** 1.0  
**Last Updated:** November 2025  
**Author:** Manus AI

# AI-Powered HR Platform - Development TODO

## Phase 1: Database Schema & Core Backend
- [x] Design and implement complete database schema (companies, jobs, candidates, notes, pipeline_stages)
- [ ] Add vector column support for AI embeddings (deferred - will use text matching for MVP)
- [x] Create database query helpers in server/db.ts
- [x] Push schema to database with pnpm db:push

## Phase 2: Core ATS Features
- [x] Job management API (create, read, update, delete, list)
- [x] Candidate management API (apply, list, update pipeline stage)
- [x] Company management API (simplified for MVP)
- [x] Notes system for candidate feedback
- [x] Pipeline stage management
- [x] File upload for resumes (S3 integration)

## Phase 3: AI-Powered Features
- [x] Smart Job Description Generator (OpenAI integration)
- [ ] Resume parsing service (deferred - manual upload for MVP)
- [x] Intelligent Candidate Matching (LLM-based analysis)
- [x] Batch candidate scoring endpoint
- [x] AI-powered candidate insights

## Phase 4: Conversational AI Assistant
- [x] AI chat endpoint with context awareness
- [x] Context-aware responses about platform features
- [x] Help with job creation and candidate management
- [x] Troubleshooting assistance
- [x] Suggested questions based on context
- [x] Feature-specific help content

## Phase 5: Frontend UI
- [x] Landing page with feature showcase
- [x] Dashboard layout with sidebar navigation
- [x] Jobs list page
- [x] Dashboard home page
- [ ] Jobs list and job detail pages
- [ ] Job creation wizard with AI assistance
- [ ] Candidate pipeline (drag-and-drop interface)
- [ ] Candidate detail view with resume viewer
- [ ] Notes interface for team collaboration
- [ ] AI chat interface component
- [ ] Analytics dashboard (basic metrics)
- [ ] Settings page

## Phase 6: Testing & Quality Assurance
- [ ] Unit tests for database queries
- [ ] Integration tests for tRPC procedures
- [ ] AI feature tests (mocked LLM responses)
- [ ] Frontend component tests
- [ ] E2E tests for critical user flows
- [ ] Performance testing for candidate matching

## Phase 7: CI/CD & Deployment
- [ ] GitHub Actions workflow for automated testing
- [ ] Vercel deployment configuration
- [ ] Environment variable documentation
- [ ] Database migration strategy
- [ ] Monitoring and error tracking setup

## Phase 8: Documentation
- [ ] API documentation
- [ ] User guide
- [ ] Deployment guide
- [ ] Contributing guidelines
- [ ] Marketing strategy document

## Out of Scope (Post-MVP)
- [ ] Full HRIS features (onboarding, time-off, benefits)
- [ ] Payroll integration
- [ ] Advanced performance management
- [ ] Mobile native apps
- [ ] Internationalization (i18n)
- [ ] Advanced workflow automation builder
- [ ] Integration marketplace

## Nonprofit & Accessibility Updates
- [ ] Update branding for nonprofit focus (remove competitive positioning)
- [ ] Add WCAG 2.1 AA compliance features
- [ ] Implement keyboard navigation throughout
- [ ] Add screen reader optimization
- [ ] Create video interview/consent alternative to written applications
- [ ] Add voice-to-text for application forms
- [ ] Implement high contrast mode
- [ ] Add configurable font sizes
- [ ] Create flexible workflow configuration system
- [ ] Add customizable application forms
- [ ] Implement multi-language support
- [ ] Add assistive technology compatibility testing

## Documentation
- [x] Deployment guide for nonprofit budget constraints
- [x] Accessibility configuration guide (included in deployment guide)
- [x] Workflow customization documentation (included in deployment guide)
- [x] Grant writing support materials
- [x] Nonprofit outreach strategy
- [x] API documentation for integrations
- [x] Testing guide and best practices
- [x] CI/CD pipeline configuration

## Configurable Pipeline System
- [x] Add programs table (base org + additional programs)
- [x] Add pipeline_stages table (custom stages per program)
- [x] Add stage_requirements table (documents, training, compliance per stage)
- [x] Add participant_progress table (track individuals through stages)
- [x] Add documents table for uploaded files
- [x] Add requirement_completions table for tracking
- [x] Create programs API (CRUD operations)
- [x] Create pipeline stages API
- [x] Create requirements tracking API
- [x] Create document management API
- [x] Create participant progress tracking API
- [x] Build program management UI
- [x] Build stage template editor (pipeline stages UI)
- [x] Implement requirement checklist system (stage requirements UI)
- [x] Add Programs menu item to dashboard navigation
- [ ] Add progress tracking dashboard
- [ ] Create compliance reporting
- [ ] Implement automated stage progression rules
- [ ] Add notification system for stage transitions

## Code Review & Refactoring
- [x] Review all backend routers for error handling
- [x] Review database queries for optimization
- [x] Check for SQL injection vulnerabilities
- [x] Review frontend components for accessibility
- [x] Check for memory leaks and performance issues
- [x] Validate input sanitization
- [x] Review authentication and authorization logic
- [x] Check for race conditions in mutations
- [x] Refactor duplicate code into reusable functions
- [x] Add comprehensive error messages
- [x] Review TypeScript types for correctness
- [x] Check for unused imports and dead code
- [x] Document all findings in CODE_REVIEW_FINDINGS.md

## Production-Grade Refactoring Tasks

### Security Hardening
- [ ] Add input validation to all database functions
- [x] Implement authorization checks in jobsRouter (7 procedures)
- [x] Implement authorization checks in candidatesRouter (7 procedures)
- [x] Implement authorization checks in programsRouter (12 procedures)
- [x] Implement authorization checks in aiRouter (4 procedures)
- [x] Implement authorization checks in assistantRouter (3 procedures)
- [x] All 33 backend procedures now have comprehensive security
- [x] Fix race condition in company creation
- [x] Remove hardcoded company ID
- [x] Add HTML sanitization for user inputs
- [x] Add file upload validation (size, type)
- [x] Add duplicate application prevention
- [ ] Implement rate limiting on public endpoints
- [ ] Add environment variable validation
- [ ] Configure CORS properly
- [ ] Add Content Security Policy headers
- [ ] Implement proper session management

### Performance Optimization
- [x] Add database indexes to all frequently queried fields
  - [x] programs: createdBy, isActive
  - [x] pipelineStages: programId, order
  - [x] stageRequirements: stageId
  - [x] documents: candidateId, requirementId, status
  - [x] participantProgress: candidateId, programId, status
  - [x] requirementCompletions: participantProgressId, requirementId
  - [x] companies: createdBy
  - [x] jobs: companyId, status, createdBy, postedAt
  - [x] candidates: jobId, email, pipelineStage, matchScore, appliedAt
  - [x] notes: candidateId, userId
- [ ] Optimize job stats query with aggregation
- [ ] Configure database connection pooling
- [ ] Implement route-based code splitting
- [ ] Add React.memo for expensive components
- [ ] Optimize bundle size
- [ ] Add caching for frequently accessed data
- [ ] Implement pagination for large lists

### Accessibility Compliance (WCAG 2.1 AA)
- [ ] Add ARIA labels to all icon buttons
- [ ] Implement keyboard navigation
- [ ] Fix color contrast issues
- [ ] Add focus indicators
- [ ] Add skip navigation links
- [ ] Ensure form labels are properly associated
- [ ] Add screen reader announcements for dynamic content
- [ ] Test with screen readers (NVDA/JAWS)

### Code Quality Improvements
- [ ] Add comprehensive error handling to all mutations
- [ ] Standardize error messages
- [ ] Extract dialog components to reduce duplication
- [ ] Replace magic numbers with named constants
- [ ] Add JSDoc comments to all public functions
- [ ] Fix memory leak in DashboardLayout
- [ ] Implement optimistic updates for all mutations
- [ ] Add loading skeletons instead of text
- [ ] Enable TypeScript strict mode
- [ ] Remove unused imports and dead code

### Testing Infrastructure
- [ ] Set up Vitest test environment
- [ ] Write tests for all tRPC procedures
- [ ] Write tests for database query functions
- [ ] Write tests for authentication/authorization
- [ ] Write tests for file upload functionality
- [ ] Write frontend component tests
- [ ] Write integration tests
- [ ] Achieve 70%+ code coverage
- [ ] Add test coverage reporting
- [ ] Add pre-commit hooks for tests

## Feature Roadmap Development
- [ ] Document current feature set
- [ ] Identify UX friction points
- [ ] Plan performance optimizations
- [ ] Design accessibility enhancements
- [ ] Create phased implementation plan

## Job Creation Wizard
- [ ] Create multi-step wizard component
- [ ] Step 1: Basic job information
- [ ] Step 2: AI job description generator
- [ ] Step 3: Requirements and qualifications
- [ ] Step 4: Accessibility checklist
- [ ] Step 5: Preview and publish
- [ ] Save draft functionality
- [ ] AI assistance throughout wizard
- [ ] Accessibility validation
- [ ] Link jobs to programs for program-specific hiring

## Document Management
- [ ] Document upload API with S3 integration
- [ ] Document requirements per pipeline stage
- [ ] Upload tracking and status
- [ ] Automated reminders for missing documents
- [ ] Document viewer component
- [ ] Document approval workflow
- [ ] Compliance document templates

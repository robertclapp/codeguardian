/**
 * Skills Assessment Service
 * Integrates with third-party skills testing platforms
 */

export interface AssessmentProvider {
  id: string;
  name: string;
  apiKey?: string;
  baseURL: string;
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  provider: string;
}

export interface AssessmentInvitation {
  candidateId: number;
  assessmentId: string;
  invitationLink: string;
  expiresAt: Date;
  status: 'pending' | 'completed' | 'expired';
}

export interface AssessmentResult {
  candidateId: number;
  assessmentId: string;
  score: number; // 0-100
  percentile?: number;
  completedAt: Date;
  details: {
    category: string;
    score: number;
  }[];
}

/**
 * Mock Indeed Assessments API integration
 * In production, this would use the actual Indeed API
 */
export class IndeedAssessmentsService {
  private apiKey: string;
  private baseURL = 'https://api.indeed.com/assessments/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getAvailableAssessments(): Promise<Assessment[]> {
    // Mock data - in production, fetch from Indeed API
    return [
      {
        id: 'indeed-customer-service',
        title: 'Customer Service Skills',
        description: 'Evaluate customer service aptitude and communication skills',
        category: 'Customer Service',
        duration: 15,
        difficulty: 'intermediate',
        provider: 'Indeed',
      },
      {
        id: 'indeed-data-entry',
        title: 'Data Entry Speed & Accuracy',
        description: 'Measure typing speed and accuracy for data entry roles',
        category: 'Administrative',
        duration: 10,
        difficulty: 'beginner',
        provider: 'Indeed',
      },
      {
        id: 'indeed-basic-math',
        title: 'Basic Math Skills',
        description: 'Test fundamental arithmetic and problem-solving abilities',
        category: 'Math',
        duration: 20,
        difficulty: 'beginner',
        provider: 'Indeed',
      },
    ];
  }

  async sendInvitation(
    candidateEmail: string,
    candidateName: string,
    assessmentId: string
  ): Promise<AssessmentInvitation> {
    // Mock implementation - in production, call Indeed API
    const invitationLink = `https://assessments.indeed.com/invite/${Math.random().toString(36).substring(7)}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    return {
      candidateId: 0, // Will be set by caller
      assessmentId,
      invitationLink,
      expiresAt,
      status: 'pending',
    };
  }

  async getResults(invitationId: string): Promise<AssessmentResult | null> {
    // Mock implementation - in production, fetch from Indeed API
    // Return null if not completed yet
    return null;
  }
}

/**
 * Mock Criteria Corp API integration
 * In production, this would use the actual Criteria API
 */
export class CriteriaCorpService {
  private apiKey: string;
  private baseURL = 'https://api.criteriacorp.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getAvailableAssessments(): Promise<Assessment[]> {
    // Mock data - in production, fetch from Criteria API
    return [
      {
        id: 'criteria-ccat',
        title: 'Criteria Cognitive Aptitude Test (CCAT)',
        description: 'Measure problem-solving abilities, learning capacity, and critical thinking',
        category: 'Cognitive',
        duration: 15,
        difficulty: 'advanced',
        provider: 'Criteria',
      },
      {
        id: 'criteria-ucat',
        title: 'Universally Cognitive Aptitude Test (UCAT)',
        description: 'Shorter version of CCAT for quick cognitive screening',
        category: 'Cognitive',
        duration: 10,
        difficulty: 'intermediate',
        provider: 'Criteria',
      },
      {
        id: 'criteria-personality',
        title: 'Personality & Behavioral Assessment',
        description: 'Evaluate workplace personality traits and behavioral tendencies',
        category: 'Personality',
        duration: 20,
        difficulty: 'beginner',
        provider: 'Criteria',
      },
    ];
  }

  async sendInvitation(
    candidateEmail: string,
    candidateName: string,
    assessmentId: string
  ): Promise<AssessmentInvitation> {
    // Mock implementation - in production, call Criteria API
    const invitationLink = `https://app.criteriacorp.com/assessment/${Math.random().toString(36).substring(7)}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // 14 days expiry

    return {
      candidateId: 0,
      assessmentId,
      invitationLink,
      expiresAt,
      status: 'pending',
    };
  }

  async getResults(invitationId: string): Promise<AssessmentResult | null> {
    // Mock implementation - in production, fetch from Criteria API
    return null;
  }
}

/**
 * Unified Skills Assessment Service
 */
export class SkillsAssessmentService {
  private indeedService?: IndeedAssessmentsService;
  private criteriaService?: CriteriaCorpService;

  constructor(config: {
    indeedApiKey?: string;
    criteriaApiKey?: string;
  }) {
    if (config.indeedApiKey) {
      this.indeedService = new IndeedAssessmentsService(config.indeedApiKey);
    }
    if (config.criteriaApiKey) {
      this.criteriaService = new CriteriaCorpService(config.criteriaApiKey);
    }
  }

  async getAllAssessments(): Promise<Assessment[]> {
    const assessments: Assessment[] = [];

    if (this.indeedService) {
      const indeedAssessments = await this.indeedService.getAvailableAssessments();
      assessments.push(...indeedAssessments);
    }

    if (this.criteriaService) {
      const criteriaAssessments = await this.criteriaService.getAvailableAssessments();
      assessments.push(...criteriaAssessments);
    }

    return assessments;
  }

  async sendInvitation(
    candidateEmail: string,
    candidateName: string,
    assessmentId: string,
    provider: string
  ): Promise<AssessmentInvitation> {
    if (provider === 'Indeed' && this.indeedService) {
      return this.indeedService.sendInvitation(candidateEmail, candidateName, assessmentId);
    } else if (provider === 'Criteria' && this.criteriaService) {
      return this.criteriaService.sendInvitation(candidateEmail, candidateName, assessmentId);
    }

    throw new Error(`Provider ${provider} not configured`);
  }

  /**
   * Calculate AI match score enhancement based on assessment results
   */
  calculateMatchScoreBoost(assessmentResults: AssessmentResult[]): number {
    if (assessmentResults.length === 0) return 0;

    const avgScore = assessmentResults.reduce((sum, r) => sum + r.score, 0) / assessmentResults.length;

    // Boost match score by up to 15 points based on assessment performance
    // 90+ score = +15 points
    // 80-89 = +10 points
    // 70-79 = +5 points
    // <70 = 0 points

    if (avgScore >= 90) return 15;
    if (avgScore >= 80) return 10;
    if (avgScore >= 70) return 5;
    return 0;
  }
}

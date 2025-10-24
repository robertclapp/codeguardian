/**
 * CodeGuardian JavaScript SDK
 * Official JavaScript/TypeScript client library for CodeGuardian API
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

/**
 * Severity levels for code issues
 */
const Severity = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
};

/**
 * CodeGuardian API Error Classes
 */
class CodeGuardianError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CodeGuardianError';
    }
}

class AuthenticationError extends CodeGuardianError {
    constructor(message = 'Invalid API key') {
        super(message);
        this.name = 'AuthenticationError';
    }
}

class RateLimitError extends CodeGuardianError {
    constructor(message = 'Rate limit exceeded') {
        super(message);
        this.name = 'RateLimitError';
    }
}

class AnalysisError extends CodeGuardianError {
    constructor(message = 'Analysis failed') {
        super(message);
        this.name = 'AnalysisError';
    }
}

/**
 * Data classes for API responses
 */
class CodeIssue {
    constructor({
        lineNumber,
        column,
        severity,
        category,
        message,
        suggestion = null,
        fix = null
    }) {
        this.lineNumber = lineNumber;
        this.column = column;
        this.severity = severity;
        this.category = category;
        this.message = message;
        this.suggestion = suggestion;
        this.fix = fix;
    }
}

class AnalysisResult {
    constructor({
        overallScore,
        securityScore,
        performanceScore,
        maintainabilityScore,
        issues,
        suggestions,
        analysisTime
    }) {
        this.overallScore = overallScore;
        this.securityScore = securityScore;
        this.performanceScore = performanceScore;
        this.maintainabilityScore = maintainabilityScore;
        this.issues = issues;
        this.suggestions = suggestions;
        this.analysisTime = analysisTime;
    }
}

class ExplanationResult {
    constructor({
        description,
        suggestions,
        reasoning,
        examples = []
    }) {
        this.description = description;
        this.suggestions = suggestions;
        this.reasoning = reasoning;
        this.examples = examples;
    }
}

/**
 * CodeGuardian API Client
 * 
 * Provides access to CodeGuardian's AI-powered code analysis and mentorship features.
 * 
 * @example
 * const client = new CodeGuardianClient({ apiKey: 'your-api-key' });
 * const result = await client.analyzeCode("console.log('hello world')", { language: 'javascript' });
 * console.log(`Score: ${result.overallScore}/100`);
 */
class CodeGuardianClient {
    /**
     * Initialize CodeGuardian client
     * 
     * @param {Object} options - Configuration options
     * @param {string} options.apiKey - Your CodeGuardian API key
     * @param {string} [options.apiUrl='https://codeguardian-api.onrender.com'] - API base URL
     * @param {number} [options.timeout=30000] - Request timeout in milliseconds
     * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
     */
    constructor({
        apiKey,
        apiUrl = 'https://codeguardian-api.onrender.com',
        timeout = 30000,
        maxRetries = 3
    }) {
        this.apiKey = apiKey;
        this.apiUrl = apiUrl.replace(/\/$/, '');
        this.timeout = timeout;
        this.maxRetries = maxRetries;

        this.client = axios.create({
            baseURL: this.apiUrl,
            timeout: this.timeout,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'CodeGuardian-JavaScript-SDK/1.0.0'
            }
        });

        this._setupInterceptors();
    }

    /**
     * Set up axios interceptors for error handling and retries
     * @private
     */
    _setupInterceptors() {
        this.client.interceptors.response.use(
            response => response,
            async error => {
                const { response, config } = error;

                if (response?.status === 401) {
                    throw new AuthenticationError();
                } else if (response?.status === 429) {
                    // Retry with exponential backoff for rate limits
                    if (!config._retryCount) config._retryCount = 0;
                    
                    if (config._retryCount < this.maxRetries) {
                        config._retryCount++;
                        const delay = Math.pow(2, config._retryCount) * 1000;
                        await this._sleep(delay);
                        return this.client(config);
                    }
                    
                    throw new RateLimitError();
                } else if (response?.status >= 400) {
                    throw new CodeGuardianError(`API error: ${response.status}`);
                }

                // Retry for network errors
                if (!config._retryCount) config._retryCount = 0;
                
                if (config._retryCount < this.maxRetries) {
                    config._retryCount++;
                    await this._sleep(1000);
                    return this.client(config);
                }

                throw new CodeGuardianError(`Request failed: ${error.message}`);
            }
        );
    }

    /**
     * Sleep for specified milliseconds
     * @private
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Analyze code for issues, security vulnerabilities, and improvements
     * 
     * @param {string} code - Source code to analyze
     * @param {Object} [options={}] - Analysis options
     * @param {string} [options.language='javascript'] - Programming language
     * @param {string} [options.filename] - Optional filename for context
     * @param {boolean} [options.mentorship=true] - Enable AI mentorship explanations
     * @param {boolean} [options.securityFocus=true] - Focus on security vulnerabilities
     * @returns {Promise<AnalysisResult>} Analysis results
     * 
     * @throws {AnalysisError} If analysis fails
     * @throws {AuthenticationError} If API key is invalid
     * @throws {RateLimitError} If rate limit is exceeded
     */
    async analyzeCode(code, options = {}) {
        const {
            language = 'javascript',
            filename = null,
            mentorship = true,
            securityFocus = true,
            ...additionalOptions
        } = options;

        const payload = {
            code,
            language,
            fileName: filename,
            options: {
                mentorship,
                securityFocus,
                ...additionalOptions
            }
        };

        const startTime = Date.now();
        
        try {
            const response = await this.client.post('/api/reviews/analyze', payload);
            const analysisTime = Date.now() - startTime;
            
            return this._parseAnalysisResult(response.data, analysisTime);
        } catch (error) {
            if (error instanceof CodeGuardianError) {
                throw error;
            }
            throw new AnalysisError(`Analysis failed: ${error.message}`);
        }
    }

    /**
     * Analyze a code file
     * 
     * @param {string} filePath - Path to the code file
     * @param {Object} [options={}] - Analysis options
     * @param {string} [options.language] - Programming language (auto-detected if not provided)
     * @returns {Promise<AnalysisResult>} Analysis results
     */
    async analyzeFile(filePath, options = {}) {
        try {
            const code = await fs.readFile(filePath, 'utf8');
            const language = options.language || this._detectLanguage(filePath);
            
            return this.analyzeCode(code, {
                ...options,
                language,
                filename: filePath
            });
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`File not found: ${filePath}`);
            }
            throw error;
        }
    }

    /**
     * Analyze all code files in a directory
     * 
     * @param {string} directoryPath - Path to the directory
     * @param {Object} [options={}] - Analysis options
     * @param {boolean} [options.recursive=true] - Analyze subdirectories recursively
     * @param {string[]} [options.filePatterns] - File patterns to include
     * @returns {Promise<Object>} Dictionary mapping file paths to analysis results
     */
    async analyzeDirectory(directoryPath, options = {}) {
        const {
            recursive = true,
            filePatterns = [
                '**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx',
                '**/*.py', '**/*.java', '**/*.cpp', '**/*.c',
                '**/*.cs', '**/*.go', '**/*.rs', '**/*.php', '**/*.rb'
            ],
            ...analysisOptions
        } = options;

        const globOptions = {
            cwd: directoryPath,
            absolute: true,
            ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
        };

        if (!recursive) {
            globOptions.depth = 1;
        }

        const results = {};
        
        for (const pattern of filePatterns) {
            const files = glob.sync(pattern, globOptions);
            
            for (const filePath of files) {
                try {
                    const result = await this.analyzeFile(filePath, analysisOptions);
                    results[filePath] = result;
                } catch (error) {
                    console.error(`Error analyzing ${filePath}:`, error.message);
                }
            }
        }

        return results;
    }

    /**
     * Get AI explanation and mentorship for code
     * 
     * @param {string} code - Source code to explain
     * @param {Object} [options={}] - Explanation options
     * @param {string} [options.language='javascript'] - Programming language
     * @param {string} [options.mentorshipLevel='detailed'] - Level of detail
     * @returns {Promise<ExplanationResult>} Explanation results
     */
    async explainCode(code, options = {}) {
        const {
            language = 'javascript',
            mentorshipLevel = 'detailed'
        } = options;

        const payload = {
            code,
            language,
            mentorshipLevel
        };

        try {
            const response = await this.client.post('/api/reviews/explain', payload);
            
            return new ExplanationResult({
                description: response.data.description || '',
                suggestions: response.data.suggestions || '',
                reasoning: response.data.reasoning || '',
                examples: response.data.examples || []
            });
        } catch (error) {
            throw new CodeGuardianError(`Explanation failed: ${error.message}`);
        }
    }

    /**
     * Get improvement suggestions for code
     * 
     * @param {string} code - Source code
     * @param {Object} [options={}] - Options
     * @param {string} [options.language='javascript'] - Programming language
     * @param {string} [options.context] - Additional context for suggestions
     * @returns {Promise<string[]>} List of improvement suggestions
     */
    async getSuggestions(code, options = {}) {
        const {
            language = 'javascript',
            context = null
        } = options;

        const payload = {
            code,
            language,
            context
        };

        try {
            const response = await this.client.post('/api/reviews/suggestions', payload);
            return response.data.suggestions || [];
        } catch (error) {
            throw new CodeGuardianError(`Failed to get suggestions: ${error.message}`);
        }
    }

    /**
     * Check code for security vulnerabilities
     * 
     * @param {string} code - Source code to check
     * @param {Object} [options={}] - Options
     * @param {string} [options.language='javascript'] - Programming language
     * @returns {Promise<CodeIssue[]>} List of security issues found
     */
    async checkSecurity(code, options = {}) {
        const { language = 'javascript' } = options;
        
        const result = await this.analyzeCode(code, {
            language,
            securityFocus: true,
            mentorship: false
        });

        // Filter for security-related issues
        return result.issues.filter(issue => 
            issue.category.toLowerCase().includes('security')
        );
    }

    /**
     * Analyze multiple code samples concurrently
     * 
     * @param {Array} codeSamples - Array of {code, language, options} objects
     * @returns {Promise<AnalysisResult[]>} Array of analysis results
     */
    async analyzeMultiple(codeSamples) {
        const promises = codeSamples.map(sample => 
            this.analyzeCode(sample.code, {
                language: sample.language || 'javascript',
                ...sample.options
            })
        );

        return Promise.all(promises);
    }

    /**
     * Get user profile information
     * 
     * @returns {Promise<Object>} User profile data
     */
    async getUserProfile() {
        try {
            const response = await this.client.get('/api/auth/profile');
            return response.data;
        } catch (error) {
            throw new CodeGuardianError(`Failed to get user profile: ${error.message}`);
        }
    }

    /**
     * Get API usage statistics
     * 
     * @returns {Promise<Object>} Usage statistics
     */
    async getUsageStats() {
        try {
            const response = await this.client.get('/api/reviews/stats');
            return response.data;
        } catch (error) {
            throw new CodeGuardianError(`Failed to get usage stats: ${error.message}`);
        }
    }

    /**
     * Test API connection
     * 
     * @returns {Promise<boolean>} True if connection is successful
     */
    async testConnection() {
        try {
            const response = await this.client.get('/health');
            return response.data.status === 'healthy';
        } catch (error) {
            return false;
        }
    }

    /**
     * Parse API response into AnalysisResult
     * @private
     */
    _parseAnalysisResult(response, analysisTime) {
        const comments = response.comments || [];
        const issues = comments.map(comment => new CodeIssue({
            lineNumber: comment.line_number || 0,
            column: comment.column || 0,
            severity: comment.severity || 'low',
            category: comment.category || 'general',
            message: comment.message || '',
            suggestion: comment.suggestion,
            fix: comment.fix
        }));

        return new AnalysisResult({
            overallScore: response.overall_score || 0,
            securityScore: response.security_score || 0,
            performanceScore: response.performance_score || 0,
            maintainabilityScore: response.maintainability_score || 0,
            issues,
            suggestions: response.suggestions || [],
            analysisTime
        });
    }

    /**
     * Detect programming language from file extension
     * @private
     */
    _detectLanguage(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const extensionMap = {
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.go': 'go',
            '.rs': 'rust',
            '.php': 'php',
            '.rb': 'ruby'
        };
        return extensionMap[ext] || 'text';
    }
}

/**
 * Convenience functions for quick analysis
 */

/**
 * Quick analysis function
 * 
 * @param {string} code - Source code to analyze
 * @param {string} apiKey - API key
 * @param {Object} [options={}] - Analysis options
 * @returns {Promise<AnalysisResult>} Analysis results
 */
async function analyzeCode(code, apiKey, options = {}) {
    const client = new CodeGuardianClient({ apiKey });
    return client.analyzeCode(code, options);
}

/**
 * Quick file analysis function
 * 
 * @param {string} filePath - Path to file
 * @param {string} apiKey - API key
 * @param {Object} [options={}] - Analysis options
 * @returns {Promise<AnalysisResult>} Analysis results
 */
async function analyzeFile(filePath, apiKey, options = {}) {
    const client = new CodeGuardianClient({ apiKey });
    return client.analyzeFile(filePath, options);
}

/**
 * Quick code explanation function
 * 
 * @param {string} code - Source code to explain
 * @param {string} apiKey - API key
 * @param {Object} [options={}] - Explanation options
 * @returns {Promise<ExplanationResult>} Explanation results
 */
async function explainCode(code, apiKey, options = {}) {
    const client = new CodeGuardianClient({ apiKey });
    return client.explainCode(code, options);
}

// Export classes and functions
module.exports = {
    CodeGuardianClient,
    CodeIssue,
    AnalysisResult,
    ExplanationResult,
    Severity,
    CodeGuardianError,
    AuthenticationError,
    RateLimitError,
    AnalysisError,
    analyzeCode,
    analyzeFile,
    explainCode
};

// Example usage
if (require.main === module) {
    async function example() {
        const apiKey = 'your-api-key-here';
        const client = new CodeGuardianClient({ apiKey });

        // Test connection
        const connected = await client.testConnection();
        if (connected) {
            console.log('✅ Connected to CodeGuardian API');
        } else {
            console.log('❌ Connection failed');
            return;
        }

        // Analyze some code
        const code = `
function unsafeFunction(userInput) {
    eval(userInput); // Security vulnerability!
    return "done";
}
        `;

        try {
            const result = await client.analyzeCode(code, { language: 'javascript' });

            console.log(`Overall Score: ${result.overallScore}/100`);
            console.log(`Security Score: ${result.securityScore}/100`);
            console.log(`Issues Found: ${result.issues.length}`);

            result.issues.forEach(issue => {
                console.log(`  Line ${issue.lineNumber}: ${issue.message}`);
                if (issue.suggestion) {
                    console.log(`    Suggestion: ${issue.suggestion}`);
                }
            });

            // Get explanation
            const explanation = await client.explainCode(code);
            console.log(`\nExplanation: ${explanation.description}`);
            console.log(`Suggestions: ${explanation.suggestions}`);

        } catch (error) {
            console.error('Error:', error.message);
        }
    }

    example();
}


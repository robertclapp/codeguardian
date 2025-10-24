/**
 * CodeGuardian GitHub Integration
 * Adds AI-powered code review capabilities to GitHub
 */

class GitHubCodeGuardian {
    constructor() {
        this.apiUrl = 'https://codeguardian-api.onrender.com';
        this.apiKey = '';
        this.isAnalyzing = false;
        this.analysisCache = new Map();
        this.init();
    }

    async init() {
        // Load settings from storage
        const settings = await this.getSettings();
        this.apiKey = settings.apiKey || '';
        
        if (!this.apiKey) {
            this.showSetupNotification();
            return;
        }

        // Initialize based on current page
        this.initializePage();
        
        // Listen for navigation changes (GitHub is SPA)
        this.observeNavigation();
    }

    async getSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['apiKey', 'apiUrl', 'realTimeAnalysis'], (result) => {
                resolve(result);
            });
        });
    }

    initializePage() {
        const url = window.location.href;
        
        if (url.includes('/pull/')) {
            this.initializePullRequest();
        } else if (url.includes('/blob/') || url.includes('/edit/')) {
            this.initializeFileView();
        } else if (url.includes('/compare/')) {
            this.initializeCompare();
        }
    }

    initializePullRequest() {
        console.log('Initializing CodeGuardian for Pull Request');
        
        // Add CodeGuardian button to PR toolbar
        this.addPRAnalysisButton();
        
        // Add analysis to file diffs
        this.enhanceFileDiffs();
        
        // Add overall PR analysis
        this.addPRSummary();
    }

    initializeFileView() {
        console.log('Initializing CodeGuardian for File View');
        
        // Add analysis button to file toolbar
        this.addFileAnalysisButton();
        
        // Add line-by-line analysis
        this.enhanceCodeLines();
    }

    initializeCompare() {
        console.log('Initializing CodeGuardian for Compare View');
        
        // Add analysis for compare view
        this.enhanceCompareView();
    }

    addPRAnalysisButton() {
        const toolbar = document.querySelector('.pr-toolbar');
        if (!toolbar || toolbar.querySelector('.codeguardian-pr-button')) return;

        const button = this.createButton('Analyze with CodeGuardian', 'codeguardian-pr-button');
        button.addEventListener('click', () => this.analyzePullRequest());
        
        toolbar.appendChild(button);
    }

    addFileAnalysisButton() {
        const toolbar = document.querySelector('.file-header .file-actions');
        if (!toolbar || toolbar.querySelector('.codeguardian-file-button')) return;

        const button = this.createButton('CodeGuardian Analysis', 'codeguardian-file-button');
        button.addEventListener('click', () => this.analyzeCurrentFile());
        
        toolbar.appendChild(button);
    }

    createButton(text, className) {
        const button = document.createElement('button');
        button.className = `btn btn-sm ${className}`;
        button.innerHTML = `
            <svg class="octicon" width="16" height="16" viewBox="0 0 16 16">
                <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14.5c-3.58 0-6.5-2.92-6.5-6.5S4.42 1.5 8 1.5s6.5 2.92 6.5 6.5-2.92 6.5-6.5 6.5z"/>
                <path fill="currentColor" d="M8 4c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1s1-.45 1-1V5c0-.55-.45-1-1-1zm0 6c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
            </svg>
            ${text}
        `;
        return button;
    }

    async analyzePullRequest() {
        if (this.isAnalyzing) return;
        
        this.isAnalyzing = true;
        this.showAnalysisProgress('Analyzing pull request...');
        
        try {
            // Get PR files
            const files = await this.getPRFiles();
            const results = [];
            
            for (const file of files) {
                const analysis = await this.analyzeCode(file.content, file.filename);
                results.push({ file: file.filename, analysis });
            }
            
            this.displayPRAnalysis(results);
            this.hideAnalysisProgress();
            
        } catch (error) {
            console.error('PR analysis failed:', error);
            this.showError('Analysis failed. Please check your API key and connection.');
        } finally {
            this.isAnalyzing = false;
        }
    }

    async analyzeCurrentFile() {
        if (this.isAnalyzing) return;
        
        this.isAnalyzing = true;
        this.showAnalysisProgress('Analyzing file...');
        
        try {
            const codeElement = document.querySelector('.blob-code-content') || 
                              document.querySelector('.CodeMirror-code');
            
            if (!codeElement) {
                throw new Error('Could not find code content');
            }
            
            const code = this.extractCodeFromElement(codeElement);
            const filename = this.getCurrentFilename();
            
            const analysis = await this.analyzeCode(code, filename);
            this.displayFileAnalysis(analysis, filename);
            this.hideAnalysisProgress();
            
        } catch (error) {
            console.error('File analysis failed:', error);
            this.showError('Analysis failed. Please check your API key and connection.');
        } finally {
            this.isAnalyzing = false;
        }
    }

    async analyzeCode(code, filename) {
        const language = this.detectLanguage(filename);
        
        const response = await fetch(`${this.apiUrl}/api/reviews/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                code: code,
                language: language,
                fileName: filename,
                options: {
                    mentorship: true,
                    securityFocus: true,
                    github: true
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        return await response.json();
    }

    displayPRAnalysis(results) {
        // Remove existing analysis
        const existing = document.querySelector('.codeguardian-pr-analysis');
        if (existing) existing.remove();
        
        const container = document.createElement('div');
        container.className = 'codeguardian-pr-analysis';
        container.innerHTML = this.generatePRAnalysisHTML(results);
        
        // Insert after PR description
        const prBody = document.querySelector('.comment-body');
        if (prBody) {
            prBody.parentNode.insertBefore(container, prBody.nextSibling);
        }
        
        // Add click handlers for file navigation
        container.querySelectorAll('.codeguardian-file-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.scrollToFile(link.dataset.filename);
            });
        });
    }

    displayFileAnalysis(analysis, filename) {
        // Remove existing analysis
        const existing = document.querySelector('.codeguardian-file-analysis');
        if (existing) existing.remove();
        
        const container = document.createElement('div');
        container.className = 'codeguardian-file-analysis';
        container.innerHTML = this.generateFileAnalysisHTML(analysis, filename);
        
        // Insert after file header
        const fileHeader = document.querySelector('.file-header');
        if (fileHeader) {
            fileHeader.parentNode.insertBefore(container, fileHeader.nextSibling);
        }
        
        // Add line annotations
        this.addLineAnnotations(analysis.comments || []);
    }

    addLineAnnotations(comments) {
        comments.forEach(comment => {
            const lineNumber = comment.line_number;
            const lineElement = document.querySelector(`[data-line-number="${lineNumber}"]`);
            
            if (lineElement) {
                const annotation = document.createElement('div');
                annotation.className = `codeguardian-annotation severity-${comment.severity}`;
                annotation.innerHTML = `
                    <div class="annotation-icon">⚠️</div>
                    <div class="annotation-content">
                        <div class="annotation-message">${comment.message}</div>
                        ${comment.suggestion ? `<div class="annotation-suggestion">${comment.suggestion}</div>` : ''}
                    </div>
                `;
                
                lineElement.appendChild(annotation);
            }
        });
    }

    generatePRAnalysisHTML(results) {
        const totalIssues = results.reduce((sum, r) => sum + (r.analysis.comments?.length || 0), 0);
        const avgScore = results.reduce((sum, r) => sum + (r.analysis.overall_score || 0), 0) / results.length;
        
        return `
            <div class="codeguardian-summary">
                <h3>🛡️ CodeGuardian Analysis Summary</h3>
                <div class="summary-stats">
                    <div class="stat">
                        <span class="stat-label">Files Analyzed:</span>
                        <span class="stat-value">${results.length}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Total Issues:</span>
                        <span class="stat-value ${totalIssues > 0 ? 'issues-found' : 'no-issues'}">${totalIssues}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Average Score:</span>
                        <span class="stat-value score-${this.getScoreClass(avgScore)}">${Math.round(avgScore)}/100</span>
                    </div>
                </div>
                
                <div class="file-results">
                    ${results.map(result => `
                        <div class="file-result">
                            <div class="file-header">
                                <a href="#" class="codeguardian-file-link" data-filename="${result.file}">
                                    📄 ${result.file}
                                </a>
                                <span class="file-score score-${this.getScoreClass(result.analysis.overall_score || 0)}">
                                    ${result.analysis.overall_score || 0}/100
                                </span>
                            </div>
                            ${(result.analysis.comments || []).length > 0 ? `
                                <div class="file-issues">
                                    ${result.analysis.comments.slice(0, 3).map(comment => `
                                        <div class="issue severity-${comment.severity}">
                                            <span class="issue-line">Line ${comment.line_number}:</span>
                                            <span class="issue-message">${comment.message}</span>
                                        </div>
                                    `).join('')}
                                    ${result.analysis.comments.length > 3 ? `
                                        <div class="more-issues">+${result.analysis.comments.length - 3} more issues</div>
                                    ` : ''}
                                </div>
                            ` : '<div class="no-issues">✅ No issues found</div>'}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateFileAnalysisHTML(analysis, filename) {
        const comments = analysis.comments || [];
        const score = analysis.overall_score || 0;
        
        return `
            <div class="codeguardian-file-summary">
                <h4>🛡️ CodeGuardian Analysis for ${filename}</h4>
                <div class="analysis-metrics">
                    <div class="metric">
                        <span class="metric-label">Overall Score:</span>
                        <span class="metric-value score-${this.getScoreClass(score)}">${score}/100</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Issues Found:</span>
                        <span class="metric-value ${comments.length > 0 ? 'issues-found' : 'no-issues'}">${comments.length}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Security Score:</span>
                        <span class="metric-value score-${this.getScoreClass(analysis.security_score || 0)}">${analysis.security_score || 0}/100</span>
                    </div>
                </div>
                
                ${comments.length > 0 ? `
                    <div class="issues-summary">
                        <h5>Issues Summary:</h5>
                        ${comments.map(comment => `
                            <div class="issue-summary severity-${comment.severity}">
                                <span class="issue-line">Line ${comment.line_number}:</span>
                                <span class="issue-category">[${comment.category}]</span>
                                <span class="issue-message">${comment.message}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : '<div class="no-issues-message">✅ No issues found in this file!</div>'}
            </div>
        `;
    }

    getScoreClass(score) {
        if (score >= 80) return 'good';
        if (score >= 60) return 'medium';
        return 'poor';
    }

    showAnalysisProgress(message) {
        const progress = document.createElement('div');
        progress.className = 'codeguardian-progress';
        progress.innerHTML = `
            <div class="progress-content">
                <div class="spinner"></div>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(progress);
    }

    hideAnalysisProgress() {
        const progress = document.querySelector('.codeguardian-progress');
        if (progress) progress.remove();
    }

    showError(message) {
        this.hideAnalysisProgress();
        
        const error = document.createElement('div');
        error.className = 'codeguardian-error';
        error.innerHTML = `
            <div class="error-content">
                <span class="error-icon">❌</span>
                <span>${message}</span>
                <button class="error-close">×</button>
            </div>
        `;
        
        document.body.appendChild(error);
        
        error.querySelector('.error-close').addEventListener('click', () => {
            error.remove();
        });
        
        setTimeout(() => {
            if (error.parentNode) error.remove();
        }, 5000);
    }

    showSetupNotification() {
        const notification = document.createElement('div');
        notification.className = 'codeguardian-setup-notification';
        notification.innerHTML = `
            <div class="setup-content">
                <span class="setup-icon">🛡️</span>
                <span>CodeGuardian is installed! Click to configure your API key.</span>
                <button class="setup-configure">Configure</button>
                <button class="setup-close">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        notification.querySelector('.setup-configure').addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
        
        notification.querySelector('.setup-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    observeNavigation() {
        // GitHub uses pushState for navigation
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function() {
            originalPushState.apply(history, arguments);
            setTimeout(() => this.initializePage(), 100);
        }.bind(this);
        
        history.replaceState = function() {
            originalReplaceState.apply(history, arguments);
            setTimeout(() => this.initializePage(), 100);
        }.bind(this);
        
        window.addEventListener('popstate', () => {
            setTimeout(() => this.initializePage(), 100);
        });
    }

    async getPRFiles() {
        // This would need to be implemented based on GitHub's API or DOM parsing
        // For now, return empty array
        return [];
    }

    extractCodeFromElement(element) {
        // Extract code from GitHub's code display elements
        if (element.classList.contains('CodeMirror-code')) {
            return element.textContent;
        }
        
        // For blob view
        const lines = element.querySelectorAll('.blob-code-inner');
        return Array.from(lines).map(line => line.textContent).join('\n');
    }

    getCurrentFilename() {
        const breadcrumb = document.querySelector('.breadcrumb');
        if (breadcrumb) {
            return breadcrumb.textContent.trim().split('/').pop();
        }
        
        const title = document.querySelector('.file-header .file-info');
        if (title) {
            return title.textContent.trim();
        }
        
        return 'unknown.txt';
    }

    detectLanguage(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const langMap = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'cs': 'csharp',
            'go': 'go',
            'rs': 'rust',
            'php': 'php',
            'rb': 'ruby'
        };
        return langMap[ext] || 'text';
    }

    scrollToFile(filename) {
        const fileElement = document.querySelector(`[data-path="${filename}"]`);
        if (fileElement) {
            fileElement.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new GitHubCodeGuardian();
    });
} else {
    new GitHubCodeGuardian();
}


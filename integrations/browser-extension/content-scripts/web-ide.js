/**
 * CodeGuardian Web IDE Integration
 * Adds AI-powered code review capabilities to web-based IDEs
 */

class WebIDECodeGuardian {
    constructor() {
        this.apiUrl = 'https://codeguardian-api.onrender.com';
        this.apiKey = '';
        this.isAnalyzing = false;
        this.supportedIDEs = {
            'codepen.io': 'CodePen',
            'codesandbox.io': 'CodeSandbox',
            'replit.com': 'Replit',
            'stackblitz.com': 'StackBlitz',
            'gitpod.io': 'Gitpod',
            'vscode.dev': 'VS Code Web',
            'github.dev': 'GitHub Codespaces'
        };
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

        // Detect current IDE and initialize
        this.currentIDE = this.detectIDE();
        if (this.currentIDE) {
            console.log(`CodeGuardian: Initializing for ${this.supportedIDEs[this.currentIDE]}`);
            this.initializeIDE();
        }
    }

    async getSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['apiKey', 'apiUrl', 'realTimeAnalysis'], (result) => {
                resolve(result);
            });
        });
    }

    detectIDE() {
        const hostname = window.location.hostname;
        return Object.keys(this.supportedIDEs).find(ide => hostname.includes(ide));
    }

    initializeIDE() {
        switch (this.currentIDE) {
            case 'codepen.io':
                this.initializeCodePen();
                break;
            case 'codesandbox.io':
                this.initializeCodeSandbox();
                break;
            case 'replit.com':
                this.initializeReplit();
                break;
            case 'stackblitz.com':
                this.initializeStackBlitz();
                break;
            case 'gitpod.io':
                this.initializeGitpod();
                break;
            case 'vscode.dev':
            case 'github.dev':
                this.initializeVSCodeWeb();
                break;
        }

        // Add universal features
        this.addFloatingButton();
        this.setupKeyboardShortcuts();
    }

    initializeCodePen() {
        console.log('Initializing CodeGuardian for CodePen');
        
        // Add analysis button to CodePen toolbar
        this.addCodePenButton();
        
        // Monitor code changes
        this.observeCodePenChanges();
    }

    initializeCodeSandbox() {
        console.log('Initializing CodeGuardian for CodeSandbox');
        
        // Add analysis button to CodeSandbox
        this.addCodeSandboxButton();
        
        // Monitor file changes
        this.observeCodeSandboxChanges();
    }

    initializeReplit() {
        console.log('Initializing CodeGuardian for Replit');
        
        // Add analysis button to Replit
        this.addReplitButton();
        
        // Monitor code changes
        this.observeReplitChanges();
    }

    initializeStackBlitz() {
        console.log('Initializing CodeGuardian for StackBlitz');
        
        // Add analysis button to StackBlitz
        this.addStackBlitzButton();
        
        // Monitor file changes
        this.observeStackBlitzChanges();
    }

    initializeGitpod() {
        console.log('Initializing CodeGuardian for Gitpod');
        
        // Gitpod uses VS Code interface
        this.initializeVSCodeWeb();
    }

    initializeVSCodeWeb() {
        console.log('Initializing CodeGuardian for VS Code Web');
        
        // Add command palette integration
        this.addVSCodeWebCommands();
        
        // Monitor editor changes
        this.observeVSCodeWebChanges();
    }

    addCodePenButton() {
        const toolbar = document.querySelector('.editor-actions-right');
        if (!toolbar || toolbar.querySelector('.codeguardian-button')) return;

        const button = this.createButton('Analyze', 'codeguardian-codepen-button');
        button.addEventListener('click', () => this.analyzeCodePenCode());
        toolbar.appendChild(button);
    }

    addCodeSandboxButton() {
        const toolbar = document.querySelector('[data-testid="top-navigation"]');
        if (!toolbar || toolbar.querySelector('.codeguardian-button')) return;

        const button = this.createButton('CodeGuardian', 'codeguardian-codesandbox-button');
        button.addEventListener('click', () => this.analyzeCodeSandboxCode());
        toolbar.appendChild(button);
    }

    addReplitButton() {
        const toolbar = document.querySelector('.workspace-header-actions');
        if (!toolbar || toolbar.querySelector('.codeguardian-button')) return;

        const button = this.createButton('Analyze', 'codeguardian-replit-button');
        button.addEventListener('click', () => this.analyzeReplitCode());
        toolbar.appendChild(button);
    }

    addStackBlitzButton() {
        const toolbar = document.querySelector('.editor-toolbar');
        if (!toolbar || toolbar.querySelector('.codeguardian-button')) return;

        const button = this.createButton('CodeGuardian', 'codeguardian-stackblitz-button');
        button.addEventListener('click', () => this.analyzeStackBlitzCode());
        toolbar.appendChild(button);
    }

    addVSCodeWebCommands() {
        // For VS Code Web, we inject commands into the command palette
        this.injectVSCodeCommands();
    }

    addFloatingButton() {
        // Add a floating action button for universal access
        const floatingButton = document.createElement('div');
        floatingButton.className = 'codeguardian-floating-button';
        floatingButton.innerHTML = `
            <div class="floating-button-content">
                <span class="button-icon">🛡️</span>
                <span class="button-text">CodeGuardian</span>
            </div>
        `;
        
        floatingButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 50px;
            padding: 12px 20px;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        floatingButton.addEventListener('click', () => this.showAnalysisMenu());
        floatingButton.addEventListener('mouseenter', () => {
            floatingButton.style.transform = 'scale(1.05)';
            floatingButton.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)';
        });
        floatingButton.addEventListener('mouseleave', () => {
            floatingButton.style.transform = 'scale(1)';
            floatingButton.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
        });

        document.body.appendChild(floatingButton);
    }

    createButton(text, className) {
        const button = document.createElement('button');
        button.className = `codeguardian-button ${className}`;
        button.innerHTML = `
            <span class="button-icon">🛡️</span>
            <span class="button-text">${text}</span>
        `;
        
        button.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
            margin-left: 8px;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-1px)';
            button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = 'none';
        });

        return button;
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + A for analysis
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                this.analyzeCurrentCode();
            }
            
            // Ctrl/Cmd + Shift + E for explanation
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
                e.preventDefault();
                this.explainCurrentCode();
            }
        });
    }

    showAnalysisMenu() {
        // Remove existing menu
        const existingMenu = document.querySelector('.codeguardian-analysis-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const menu = document.createElement('div');
        menu.className = 'codeguardian-analysis-menu';
        menu.innerHTML = `
            <div class="menu-header">
                <span class="menu-icon">🛡️</span>
                <span class="menu-title">CodeGuardian</span>
                <button class="menu-close">×</button>
            </div>
            <div class="menu-content">
                <button class="menu-item" data-action="analyze">
                    <span class="item-icon">🔍</span>
                    <span class="item-text">Analyze Code</span>
                    <span class="item-shortcut">Ctrl+Shift+A</span>
                </button>
                <button class="menu-item" data-action="explain">
                    <span class="item-icon">🎓</span>
                    <span class="item-text">Explain Code</span>
                    <span class="item-shortcut">Ctrl+Shift+E</span>
                </button>
                <button class="menu-item" data-action="security">
                    <span class="item-icon">🔒</span>
                    <span class="item-text">Security Check</span>
                </button>
                <button class="menu-item" data-action="suggestions">
                    <span class="item-icon">💡</span>
                    <span class="item-text">Get Suggestions</span>
                </button>
            </div>
        `;

        menu.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            z-index: 10001;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            min-width: 280px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
            animation: slideUp 0.3s ease;
        `;

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .codeguardian-analysis-menu .menu-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 16px;
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
            }
            .codeguardian-analysis-menu .menu-close {
                margin-left: auto;
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
            }
            .codeguardian-analysis-menu .menu-close:hover {
                background: rgba(255,255,255,0.2);
            }
            .codeguardian-analysis-menu .menu-content {
                padding: 8px;
            }
            .codeguardian-analysis-menu .menu-item {
                width: 100%;
                background: none;
                border: none;
                padding: 12px 16px;
                display: flex;
                align-items: center;
                gap: 12px;
                cursor: pointer;
                border-radius: 8px;
                font-size: 14px;
                transition: background 0.2s ease;
            }
            .codeguardian-analysis-menu .menu-item:hover {
                background: #f5f5f5;
            }
            .codeguardian-analysis-menu .item-shortcut {
                margin-left: auto;
                font-size: 12px;
                color: #666;
                background: #f0f0f0;
                padding: 2px 6px;
                border-radius: 4px;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(menu);

        // Add event listeners
        menu.querySelector('.menu-close').addEventListener('click', () => menu.remove());
        
        menu.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                menu.remove();
                this.handleMenuAction(action);
            });
        });

        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!menu.contains(e.target) && !e.target.closest('.codeguardian-floating-button')) {
                    menu.remove();
                }
            }, { once: true });
        }, 100);
    }

    handleMenuAction(action) {
        switch (action) {
            case 'analyze':
                this.analyzeCurrentCode();
                break;
            case 'explain':
                this.explainCurrentCode();
                break;
            case 'security':
                this.checkSecurity();
                break;
            case 'suggestions':
                this.getSuggestions();
                break;
        }
    }

    async analyzeCurrentCode() {
        const code = this.getCurrentCode();
        if (!code) {
            this.showNotification('No code found to analyze', 'warning');
            return;
        }

        this.showAnalysisProgress('Analyzing code...');
        
        try {
            const analysis = await this.analyzeCode(code);
            this.displayAnalysisResults(analysis, code);
        } catch (error) {
            this.showNotification('Analysis failed. Please check your connection.', 'error');
        } finally {
            this.hideAnalysisProgress();
        }
    }

    async explainCurrentCode() {
        const code = this.getCurrentCode();
        if (!code) {
            this.showNotification('No code found to explain', 'warning');
            return;
        }

        this.showAnalysisProgress('Getting explanation...');
        
        try {
            const explanation = await this.explainCode(code);
            this.displayExplanation(explanation, code);
        } catch (error) {
            this.showNotification('Explanation failed. Please check your connection.', 'error');
        } finally {
            this.hideAnalysisProgress();
        }
    }

    getCurrentCode() {
        // Try different methods to get current code based on IDE
        let code = '';

        // CodePen
        if (this.currentIDE === 'codepen.io') {
            const editor = document.querySelector('.CodeMirror');
            if (editor && editor.CodeMirror) {
                code = editor.CodeMirror.getValue();
            }
        }
        
        // CodeSandbox
        else if (this.currentIDE === 'codesandbox.io') {
            const editor = document.querySelector('.monaco-editor textarea');
            if (editor) {
                code = editor.value;
            }
        }
        
        // Replit
        else if (this.currentIDE === 'replit.com') {
            const editor = document.querySelector('.monaco-editor textarea');
            if (editor) {
                code = editor.value;
            }
        }
        
        // StackBlitz
        else if (this.currentIDE === 'stackblitz.com') {
            const editor = document.querySelector('.monaco-editor textarea');
            if (editor) {
                code = editor.value;
            }
        }
        
        // VS Code Web / GitHub Codespaces
        else if (this.currentIDE === 'vscode.dev' || this.currentIDE === 'github.dev') {
            const editor = document.querySelector('.monaco-editor textarea');
            if (editor) {
                code = editor.value;
            }
        }

        // Fallback: try to get selected text or visible code
        if (!code) {
            const selection = window.getSelection().toString();
            if (selection) {
                code = selection;
            } else {
                // Try to find any code element
                const codeElements = document.querySelectorAll('code, pre, .CodeMirror-line, .monaco-editor');
                if (codeElements.length > 0) {
                    code = Array.from(codeElements).map(el => el.textContent).join('\n');
                }
            }
        }

        return code.trim();
    }

    async analyzeCode(code) {
        const language = this.detectLanguage(code);
        
        const response = await fetch(`${this.apiUrl}/api/reviews/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                code: code,
                language: language,
                options: {
                    mentorship: true,
                    securityFocus: true,
                    webIDE: true
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        return await response.json();
    }

    async explainCode(code) {
        const language = this.detectLanguage(code);
        
        const response = await fetch(`${this.apiUrl}/api/reviews/explain`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                code: code,
                language: language,
                mentorshipLevel: 'detailed'
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        return await response.json();
    }

    detectLanguage(code) {
        // Simple language detection based on code patterns
        if (code.includes('function') && code.includes('{')) return 'javascript';
        if (code.includes('def ') && code.includes(':')) return 'python';
        if (code.includes('class ') && code.includes('public')) return 'java';
        if (code.includes('#include') || code.includes('int main')) return 'cpp';
        if (code.includes('<html>') || code.includes('<div>')) return 'html';
        if (code.includes('body {') || code.includes('.class')) return 'css';
        
        return 'javascript'; // default
    }

    displayAnalysisResults(analysis, code) {
        this.showResultsModal('Analysis Results', this.generateAnalysisHTML(analysis, code));
    }

    displayExplanation(explanation, code) {
        this.showResultsModal('Code Explanation', this.generateExplanationHTML(explanation, code));
    }

    generateAnalysisHTML(analysis, code) {
        const comments = analysis.comments || [];
        const score = analysis.overall_score || 0;
        
        return `
            <div class="analysis-results">
                <div class="results-header">
                    <div class="score-display">
                        <div class="score-circle ${this.getScoreClass(score)}">
                            <span class="score-number">${score}</span>
                            <span class="score-label">/100</span>
                        </div>
                        <div class="score-details">
                            <div class="score-item">
                                <span class="label">Security:</span>
                                <span class="value">${analysis.security_score || 0}/100</span>
                            </div>
                            <div class="score-item">
                                <span class="label">Issues:</span>
                                <span class="value">${comments.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${comments.length > 0 ? `
                    <div class="issues-section">
                        <h3>Issues Found:</h3>
                        ${comments.map(comment => `
                            <div class="issue-item severity-${comment.severity}">
                                <div class="issue-header">
                                    <span class="issue-severity">${comment.severity.toUpperCase()}</span>
                                    <span class="issue-category">[${comment.category}]</span>
                                    <span class="issue-line">Line ${comment.line_number}</span>
                                </div>
                                <div class="issue-message">${comment.message}</div>
                                ${comment.suggestion ? `
                                    <div class="issue-suggestion">
                                        <strong>💡 Suggestion:</strong> ${comment.suggestion}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : '<div class="no-issues">✅ No issues found! Great job!</div>'}
            </div>
        `;
    }

    generateExplanationHTML(explanation, code) {
        return `
            <div class="explanation-results">
                <div class="code-preview">
                    <h3>Code:</h3>
                    <pre><code>${code.substring(0, 200)}${code.length > 200 ? '...' : ''}</code></pre>
                </div>
                
                <div class="explanation-content">
                    <div class="explanation-section">
                        <h3>🔍 What this code does:</h3>
                        <p>${explanation.description || 'No description available'}</p>
                    </div>
                    
                    ${explanation.suggestions ? `
                        <div class="explanation-section">
                            <h3>💡 Suggestions:</h3>
                            <p>${explanation.suggestions}</p>
                        </div>
                    ` : ''}
                    
                    ${explanation.reasoning ? `
                        <div class="explanation-section">
                            <h3>🎯 Why this matters:</h3>
                            <p>${explanation.reasoning}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    showResultsModal(title, content) {
        // Remove existing modal
        const existingModal = document.querySelector('.codeguardian-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.className = 'codeguardian-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

        // Add modal styles
        const style = document.createElement('style');
        style.textContent = `
            .codeguardian-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10002;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .codeguardian-modal .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
            }
            .codeguardian-modal .modal-content {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: 12px;
                max-width: 800px;
                max-height: 80vh;
                width: 90%;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            .codeguardian-modal .modal-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .codeguardian-modal .modal-header h2 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }
            .codeguardian-modal .modal-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
            }
            .codeguardian-modal .modal-close:hover {
                background: rgba(255,255,255,0.2);
            }
            .codeguardian-modal .modal-body {
                padding: 20px;
                max-height: 60vh;
                overflow-y: auto;
            }
            .codeguardian-modal .score-circle {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                margin-right: 20px;
            }
            .codeguardian-modal .score-circle.good { background: #4CAF50; color: white; }
            .codeguardian-modal .score-circle.medium { background: #FF9800; color: white; }
            .codeguardian-modal .score-circle.poor { background: #F44336; color: white; }
            .codeguardian-modal .issue-item {
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 12px;
            }
            .codeguardian-modal .issue-item.severity-high { border-left: 4px solid #F44336; }
            .codeguardian-modal .issue-item.severity-medium { border-left: 4px solid #FF9800; }
            .codeguardian-modal .issue-item.severity-low { border-left: 4px solid #2196F3; }
        `;
        document.head.appendChild(style);

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('.modal-overlay').addEventListener('click', () => modal.remove());
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
        
        progress.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10003;
            background: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        document.body.appendChild(progress);
    }

    hideAnalysisProgress() {
        const progress = document.querySelector('.codeguardian-progress');
        if (progress) progress.remove();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `codeguardian-notification ${type}`;
        notification.textContent = message;
        
        const colors = {
            info: '#2196F3',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#F44336'
        };

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10003;
            background: ${colors[type]};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            max-width: 300px;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    showSetupNotification() {
        this.showNotification('CodeGuardian: Please configure your API key in the extension settings', 'warning');
    }

    // Observation methods for different IDEs
    observeCodePenChanges() {
        // Monitor CodePen editor changes
        const observer = new MutationObserver(() => {
            // Handle real-time analysis if enabled
        });
        
        const editorContainer = document.querySelector('#editor-container');
        if (editorContainer) {
            observer.observe(editorContainer, { childList: true, subtree: true });
        }
    }

    observeCodeSandboxChanges() {
        // Monitor CodeSandbox file changes
        const observer = new MutationObserver(() => {
            // Handle real-time analysis if enabled
        });
        
        const editorContainer = document.querySelector('[data-testid="editor"]');
        if (editorContainer) {
            observer.observe(editorContainer, { childList: true, subtree: true });
        }
    }

    observeReplitChanges() {
        // Monitor Replit editor changes
        const observer = new MutationObserver(() => {
            // Handle real-time analysis if enabled
        });
        
        const editorContainer = document.querySelector('.workspace-content');
        if (editorContainer) {
            observer.observe(editorContainer, { childList: true, subtree: true });
        }
    }

    observeStackBlitzChanges() {
        // Monitor StackBlitz editor changes
        const observer = new MutationObserver(() => {
            // Handle real-time analysis if enabled
        });
        
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            observer.observe(editorContainer, { childList: true, subtree: true });
        }
    }

    observeVSCodeWebChanges() {
        // Monitor VS Code Web editor changes
        const observer = new MutationObserver(() => {
            // Handle real-time analysis if enabled
        });
        
        const editorContainer = document.querySelector('.monaco-editor');
        if (editorContainer) {
            observer.observe(editorContainer, { childList: true, subtree: true });
        }
    }

    injectVSCodeCommands() {
        // Inject CodeGuardian commands into VS Code Web command palette
        // This would require more complex integration with VS Code's command system
        console.log('VS Code Web command injection not yet implemented');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new WebIDECodeGuardian();
    });
} else {
    new WebIDECodeGuardian();
}


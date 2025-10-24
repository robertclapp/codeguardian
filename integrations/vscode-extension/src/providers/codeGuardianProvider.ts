/**
 * CodeGuardian Provider
 * Handles communication with CodeGuardian API
 */

import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';
import { ConfigurationManager } from '../managers/configurationManager';

export interface CodeIssue {
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    category: string;
    suggestion?: string;
    fix?: {
        replacement: string;
        description: string;
    };
}

export interface AnalysisResult {
    issues: CodeIssue[];
    overallScore: number;
    securityScore: number;
    performanceScore: number;
    maintainabilityScore: number;
    suggestions: string[];
}

export interface ExplanationResult {
    description: string;
    suggestions: string;
    reasoning: string;
    examples?: string[];
}

export class CodeGuardianProvider {
    private apiClient: AxiosInstance;
    private configManager: ConfigurationManager;

    constructor(configManager: ConfigurationManager) {
        this.configManager = configManager;
        this.apiClient = axios.create({
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'CodeGuardian-VSCode/1.0.0'
            }
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        // Request interceptor to add auth and base URL
        this.apiClient.interceptors.request.use((config) => {
            const apiUrl = this.configManager.getApiUrl();
            const apiKey = this.configManager.getApiKey();

            config.baseURL = apiUrl;
            
            if (apiKey) {
                config.headers.Authorization = `Bearer ${apiKey}`;
            }

            return config;
        });

        // Response interceptor for error handling
        this.apiClient.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    vscode.window.showErrorMessage(
                        'CodeGuardian: Invalid API key. Please check your configuration.'
                    );
                } else if (error.response?.status === 429) {
                    vscode.window.showWarningMessage(
                        'CodeGuardian: Rate limit exceeded. Please try again later.'
                    );
                } else if (error.code === 'ECONNREFUSED') {
                    vscode.window.showErrorMessage(
                        'CodeGuardian: Cannot connect to API. Please check your network connection.'
                    );
                }
                return Promise.reject(error);
            }
        );
    }

    async analyzeDocument(document: vscode.TextDocument): Promise<AnalysisResult> {
        const content = document.getText();
        const language = document.languageId;
        const fileName = document.fileName;

        try {
            const response = await this.apiClient.post('/api/reviews/analyze', {
                code: content,
                language: language,
                fileName: fileName,
                options: {
                    mentorship: this.configManager.getMentorshipMode(),
                    securityFocus: this.configManager.getSecurityFocus(),
                    realTime: true
                }
            });

            return this.transformAnalysisResponse(response.data);
        } catch (error) {
            console.error('Analysis failed:', error);
            throw new Error(`Analysis failed: ${error}`);
        }
    }

    async analyzeSelection(
        document: vscode.TextDocument, 
        selection: vscode.Selection
    ): Promise<AnalysisResult> {
        const selectedText = document.getText(selection);
        const language = document.languageId;

        try {
            const response = await this.apiClient.post('/api/reviews/analyze', {
                code: selectedText,
                language: language,
                options: {
                    mentorship: this.configManager.getMentorshipMode(),
                    securityFocus: this.configManager.getSecurityFocus(),
                    partial: true
                }
            });

            const result = this.transformAnalysisResponse(response.data);
            
            // Adjust line numbers for selection
            result.issues = result.issues.map(issue => ({
                ...issue,
                line: issue.line + selection.start.line,
                endLine: issue.endLine + selection.start.line
            }));

            return result;
        } catch (error) {
            console.error('Selection analysis failed:', error);
            throw new Error(`Selection analysis failed: ${error}`);
        }
    }

    async explainCode(code: string, language?: string): Promise<ExplanationResult> {
        try {
            const response = await this.apiClient.post('/api/reviews/explain', {
                code: code,
                language: language,
                mentorshipLevel: 'detailed'
            });

            return {
                description: response.data.description || 'No description available',
                suggestions: response.data.suggestions || 'No suggestions available',
                reasoning: response.data.reasoning || 'No reasoning provided',
                examples: response.data.examples || []
            };
        } catch (error) {
            console.error('Code explanation failed:', error);
            throw new Error(`Code explanation failed: ${error}`);
        }
    }

    async getSuggestions(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<CodeIssue[]> {
        const line = document.lineAt(position.line);
        const context = this.getContextAroundPosition(document, position, 5);

        try {
            const response = await this.apiClient.post('/api/reviews/suggestions', {
                code: context,
                language: document.languageId,
                line: position.line + 1,
                column: position.character
            });

            return this.transformIssues(response.data.suggestions || []);
        } catch (error) {
            console.error('Failed to get suggestions:', error);
            return [];
        }
    }

    async applyFix(
        document: vscode.TextDocument,
        fix: CodeIssue['fix']
    ): Promise<boolean> {
        if (!fix) return false;

        try {
            const edit = new vscode.WorkspaceEdit();
            const range = new vscode.Range(
                fix.line - 1, fix.column,
                fix.endLine - 1, fix.endColumn
            );
            
            edit.replace(document.uri, range, fix.replacement);
            const success = await vscode.workspace.applyEdit(edit);

            if (success) {
                // Log the fix application
                await this.apiClient.post('/api/reviews/fix-applied', {
                    fileName: document.fileName,
                    fix: fix,
                    timestamp: new Date().toISOString()
                });
            }

            return success;
        } catch (error) {
            console.error('Failed to apply fix:', error);
            return false;
        }
    }

    async getWorkspaceStats(): Promise<any> {
        try {
            const response = await this.apiClient.get('/api/reviews/stats');
            return response.data;
        } catch (error) {
            console.error('Failed to get workspace stats:', error);
            return null;
        }
    }

    private transformAnalysisResponse(data: any): AnalysisResult {
        return {
            issues: this.transformIssues(data.comments || []),
            overallScore: data.overall_score || 0,
            securityScore: data.security_score || 0,
            performanceScore: data.performance_score || 0,
            maintainabilityScore: data.maintainability_score || 0,
            suggestions: data.suggestions || []
        };
    }

    private transformIssues(comments: any[]): CodeIssue[] {
        return comments.map(comment => ({
            line: comment.line_number || 1,
            column: comment.column || 0,
            endLine: comment.end_line || comment.line_number || 1,
            endColumn: comment.end_column || comment.column + 10 || 10,
            severity: this.mapSeverity(comment.severity),
            message: comment.message || 'No message provided',
            category: comment.category || 'general',
            suggestion: comment.suggestion,
            fix: comment.fix ? {
                replacement: comment.fix.replacement,
                description: comment.fix.description
            } : undefined
        }));
    }

    private mapSeverity(severity: string): 'error' | 'warning' | 'info' {
        switch (severity?.toLowerCase()) {
            case 'high':
            case 'critical':
            case 'error':
                return 'error';
            case 'medium':
            case 'warning':
                return 'warning';
            case 'low':
            case 'info':
            default:
                return 'info';
        }
    }

    private getContextAroundPosition(
        document: vscode.TextDocument,
        position: vscode.Position,
        lineCount: number
    ): string {
        const startLine = Math.max(0, position.line - lineCount);
        const endLine = Math.min(document.lineCount - 1, position.line + lineCount);
        
        const range = new vscode.Range(startLine, 0, endLine, 0);
        return document.getText(range);
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await this.apiClient.get('/health');
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    async getUserProfile(): Promise<any> {
        try {
            const response = await this.apiClient.get('/api/auth/profile');
            return response.data;
        } catch (error) {
            return null;
        }
    }
}


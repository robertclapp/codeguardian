/**
 * CodeGuardian VS Code Extension
 * Provides real-time AI-powered code analysis and mentorship
 */

import * as vscode from 'vscode';
import { CodeGuardianProvider } from './providers/codeGuardianProvider';
import { DiagnosticsProvider } from './providers/diagnosticsProvider';
import { CodeActionProvider } from './providers/codeActionProvider';
import { HoverProvider } from './providers/hoverProvider';
import { TreeDataProvider } from './providers/treeDataProvider';
import { StatusBarManager } from './managers/statusBarManager';
import { ConfigurationManager } from './managers/configurationManager';
import { WebSocketManager } from './managers/webSocketManager';

let codeGuardianProvider: CodeGuardianProvider;
let diagnosticsProvider: DiagnosticsProvider;
let statusBarManager: StatusBarManager;
let webSocketManager: WebSocketManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('CodeGuardian extension is now active!');

    // Initialize managers
    const configManager = new ConfigurationManager();
    statusBarManager = new StatusBarManager();
    webSocketManager = new WebSocketManager(configManager);
    
    // Initialize providers
    codeGuardianProvider = new CodeGuardianProvider(configManager);
    diagnosticsProvider = new DiagnosticsProvider();
    
    // Register providers
    const codeActionProvider = new CodeActionProvider(codeGuardianProvider);
    const hoverProvider = new HoverProvider(codeGuardianProvider);
    const treeDataProvider = new TreeDataProvider(codeGuardianProvider);

    // Register commands
    registerCommands(context);
    
    // Register providers with VS Code
    registerProviders(context, codeActionProvider, hoverProvider, treeDataProvider);
    
    // Set up event listeners
    setupEventListeners(context);
    
    // Initialize status bar
    statusBarManager.initialize();
    
    // Show welcome message
    showWelcomeMessage(context);
}

function registerCommands(context: vscode.ExtensionContext) {
    // Analyze current file
    const analyzeFileCommand = vscode.commands.registerCommand(
        'codeguardian.analyzeFile',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found');
                return;
            }
            
            statusBarManager.setAnalyzing(true);
            try {
                const analysis = await codeGuardianProvider.analyzeDocument(editor.document);
                diagnosticsProvider.updateDiagnostics(editor.document.uri, analysis.issues);
                
                vscode.window.showInformationMessage(
                    `Analysis complete: ${analysis.issues.length} issues found`
                );
            } catch (error) {
                vscode.window.showErrorMessage(`Analysis failed: ${error}`);
            } finally {
                statusBarManager.setAnalyzing(false);
            }
        }
    );

    // Analyze workspace
    const analyzeWorkspaceCommand = vscode.commands.registerCommand(
        'codeguardian.analyzeWorkspace',
        async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showWarningMessage('No workspace folder found');
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing workspace...',
                cancellable: true
            }, async (progress, token) => {
                const files = await vscode.workspace.findFiles('**/*.{js,ts,py,java,cpp,cs,go,rs,php,rb}');
                let completed = 0;
                
                for (const file of files) {
                    if (token.isCancellationRequested) {
                        break;
                    }
                    
                    const document = await vscode.workspace.openTextDocument(file);
                    const analysis = await codeGuardianProvider.analyzeDocument(document);
                    diagnosticsProvider.updateDiagnostics(file, analysis.issues);
                    
                    completed++;
                    progress.report({
                        increment: (100 / files.length),
                        message: `${completed}/${files.length} files analyzed`
                    });
                }
            });
        }
    );

    // Apply fix
    const applyFixCommand = vscode.commands.registerCommand(
        'codeguardian.applyFix',
        async (fix: any) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;

            const edit = new vscode.WorkspaceEdit();
            const range = new vscode.Range(
                fix.line - 1, fix.column,
                fix.endLine - 1, fix.endColumn
            );
            edit.replace(editor.document.uri, range, fix.replacement);
            
            await vscode.workspace.applyEdit(edit);
            vscode.window.showInformationMessage('Fix applied successfully!');
        }
    );

    // Explain issue (Mentorship mode)
    const explainIssueCommand = vscode.commands.registerCommand(
        'codeguardian.explainIssue',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;

            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            
            if (!selectedText) {
                vscode.window.showWarningMessage('Please select code to explain');
                return;
            }

            try {
                const explanation = await codeGuardianProvider.explainCode(selectedText);
                
                // Show explanation in a webview panel
                const panel = vscode.window.createWebviewPanel(
                    'codeGuardianExplanation',
                    'CodeGuardian Mentorship',
                    vscode.ViewColumn.Beside,
                    { enableScripts: true }
                );

                panel.webview.html = getExplanationWebviewContent(explanation);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to get explanation: ${error}`);
            }
        }
    );

    // Toggle real-time analysis
    const toggleRealTimeCommand = vscode.commands.registerCommand(
        'codeguardian.toggleRealTime',
        () => {
            const config = vscode.workspace.getConfiguration('codeguardian');
            const current = config.get('realTimeAnalysis', true);
            config.update('realTimeAnalysis', !current, vscode.ConfigurationTarget.Global);
            
            vscode.window.showInformationMessage(
                `Real-time analysis ${!current ? 'enabled' : 'disabled'}`
            );
        }
    );

    // Show dashboard
    const showDashboardCommand = vscode.commands.registerCommand(
        'codeguardian.showDashboard',
        () => {
            const panel = vscode.window.createWebviewPanel(
                'codeGuardianDashboard',
                'CodeGuardian Dashboard',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            panel.webview.html = getDashboardWebviewContent();
        }
    );

    // Configure settings
    const configureCommand = vscode.commands.registerCommand(
        'codeguardian.configure',
        () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'codeguardian');
        }
    );

    // Add all commands to context
    context.subscriptions.push(
        analyzeFileCommand,
        analyzeWorkspaceCommand,
        applyFixCommand,
        explainIssueCommand,
        toggleRealTimeCommand,
        showDashboardCommand,
        configureCommand
    );
}

function registerProviders(
    context: vscode.ExtensionContext,
    codeActionProvider: CodeActionProvider,
    hoverProvider: HoverProvider,
    treeDataProvider: TreeDataProvider
) {
    // Register code action provider
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { scheme: 'file' },
            codeActionProvider
        )
    );

    // Register hover provider
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(
            { scheme: 'file' },
            hoverProvider
        )
    );

    // Register tree data provider
    vscode.window.registerTreeDataProvider('codeguardianView', treeDataProvider);

    // Register diagnostics collection
    context.subscriptions.push(diagnosticsProvider.diagnosticCollection);
}

function setupEventListeners(context: vscode.ExtensionContext) {
    // Real-time analysis on document change
    const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(
        async (event) => {
            const config = vscode.workspace.getConfiguration('codeguardian');
            if (!config.get('realTimeAnalysis', true)) return;

            const delay = config.get('analysisDelay', 2000);
            
            // Debounce analysis
            setTimeout(async () => {
                try {
                    const analysis = await codeGuardianProvider.analyzeDocument(event.document);
                    diagnosticsProvider.updateDiagnostics(event.document.uri, analysis.issues);
                } catch (error) {
                    console.error('Real-time analysis failed:', error);
                }
            }, delay);
        }
    );

    // Clear diagnostics when document is closed
    const onDidCloseTextDocument = vscode.workspace.onDidCloseTextDocument(
        (document) => {
            diagnosticsProvider.clearDiagnostics(document.uri);
        }
    );

    // Update status bar on active editor change
    const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(
        (editor) => {
            statusBarManager.updateForEditor(editor);
        }
    );

    context.subscriptions.push(
        onDidChangeTextDocument,
        onDidCloseTextDocument,
        onDidChangeActiveTextEditor
    );
}

function showWelcomeMessage(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('codeguardian');
    const apiKey = config.get('apiKey', '');
    
    if (!apiKey) {
        vscode.window.showInformationMessage(
            'Welcome to CodeGuardian! Please configure your API key to get started.',
            'Configure'
        ).then(selection => {
            if (selection === 'Configure') {
                vscode.commands.executeCommand('codeguardian.configure');
            }
        });
    }
}

function getExplanationWebviewContent(explanation: any): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CodeGuardian Mentorship</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                padding: 20px;
            }
            .explanation {
                background: var(--vscode-editor-inactiveSelectionBackground);
                padding: 15px;
                border-radius: 5px;
                margin: 10px 0;
            }
            .suggestion {
                background: var(--vscode-textCodeBlock-background);
                padding: 10px;
                border-radius: 3px;
                margin: 10px 0;
                border-left: 3px solid var(--vscode-textLink-foreground);
            }
            code {
                background: var(--vscode-textCodeBlock-background);
                padding: 2px 4px;
                border-radius: 3px;
            }
        </style>
    </head>
    <body>
        <h2>🎓 CodeGuardian Mentorship</h2>
        <div class="explanation">
            <h3>What this code does:</h3>
            <p>${explanation.description}</p>
        </div>
        <div class="suggestion">
            <h3>💡 Improvement suggestions:</h3>
            <p>${explanation.suggestions}</p>
        </div>
        <div class="explanation">
            <h3>🔍 Why this matters:</h3>
            <p>${explanation.reasoning}</p>
        </div>
    </body>
    </html>`;
}

function getDashboardWebviewContent(): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CodeGuardian Dashboard</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
                padding: 20px;
            }
            .metric {
                background: var(--vscode-editor-inactiveSelectionBackground);
                padding: 15px;
                border-radius: 5px;
                margin: 10px 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .metric-value {
                font-size: 24px;
                font-weight: bold;
                color: var(--vscode-textLink-foreground);
            }
        </style>
    </head>
    <body>
        <h2>📊 CodeGuardian Dashboard</h2>
        <div class="metric">
            <span>Files Analyzed</span>
            <span class="metric-value">42</span>
        </div>
        <div class="metric">
            <span>Issues Found</span>
            <span class="metric-value">15</span>
        </div>
        <div class="metric">
            <span>Fixes Applied</span>
            <span class="metric-value">8</span>
        </div>
        <div class="metric">
            <span>Security Score</span>
            <span class="metric-value">85%</span>
        </div>
    </body>
    </html>`;
}

export function deactivate() {
    if (webSocketManager) {
        webSocketManager.disconnect();
    }
    console.log('CodeGuardian extension deactivated');
}


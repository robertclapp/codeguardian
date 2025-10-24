#!/usr/bin/env python3
"""
CodeGuardian CLI Tool
Enhanced command-line interface for CodeGuardian code analysis
"""

import os
import sys
import json
import argparse
import requests
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional
import time
from datetime import datetime
import yaml
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.syntax import Syntax
from rich.markdown import Markdown

console = Console()

class CodeGuardianCLI:
    def __init__(self):
        self.config_file = Path.home() / '.codeguardian' / 'config.yaml'
        self.config = self.load_config()
        self.api_url = self.config.get('api_url', 'https://codeguardian-api.onrender.com')
        self.api_key = self.config.get('api_key', '')
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'CodeGuardian-CLI/1.0.0'
        })

    def load_config(self) -> Dict[str, Any]:
        """Load configuration from file"""
        if self.config_file.exists():
            with open(self.config_file, 'r') as f:
                return yaml.safe_load(f) or {}
        return {}

    def save_config(self):
        """Save configuration to file"""
        self.config_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_file, 'w') as f:
            yaml.dump(self.config, f, default_flow_style=False)

    def configure(self, api_url: str = None, api_key: str = None):
        """Configure CLI settings"""
        if api_url:
            self.config['api_url'] = api_url
            self.api_url = api_url
        
        if api_key:
            self.config['api_key'] = api_key
            self.api_key = api_key
            self.session.headers.update({'Authorization': f'Bearer {api_key}'})
        
        if not api_url and not api_key:
            # Interactive configuration
            console.print("[bold blue]CodeGuardian CLI Configuration[/bold blue]")
            
            current_url = self.config.get('api_url', 'https://codeguardian-api.onrender.com')
            new_url = console.input(f"API URL [{current_url}]: ").strip()
            if new_url:
                self.config['api_url'] = new_url
                self.api_url = new_url
            
            current_key = self.config.get('api_key', '')
            masked_key = f"{current_key[:8]}..." if current_key else "Not set"
            new_key = console.input(f"API Key [{masked_key}]: ").strip()
            if new_key:
                self.config['api_key'] = new_key
                self.api_key = new_key
                self.session.headers.update({'Authorization': f'Bearer {new_key}'})
        
        self.save_config()
        console.print("[green]✓[/green] Configuration saved!")
        
        # Test connection
        if self.test_connection():
            console.print("[green]✓[/green] Connection successful!")
        else:
            console.print("[red]✗[/red] Connection failed. Please check your settings.")

    def test_connection(self) -> bool:
        """Test connection to CodeGuardian API"""
        try:
            response = self.session.get(f"{self.api_url}/health", timeout=10)
            return response.status_code == 200
        except Exception:
            return False

    def analyze_file(self, file_path: str, output_format: str = 'table') -> Dict[str, Any]:
        """Analyze a single file"""
        file_path = Path(file_path)
        
        if not file_path.exists():
            console.print(f"[red]Error:[/red] File {file_path} not found")
            return {}
        
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        language = self.detect_language(file_path)
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task(f"Analyzing {file_path.name}...", total=None)
            
            try:
                response = self.session.post(f"{self.api_url}/api/reviews/analyze", json={
                    'code': content,
                    'language': language,
                    'fileName': str(file_path),
                    'options': {
                        'mentorship': True,
                        'securityFocus': True,
                        'cli': True
                    }
                }, timeout=60)
                
                if response.status_code == 200:
                    result = response.json()
                    progress.update(task, completed=True)
                    self.display_analysis_result(result, file_path, output_format)
                    return result
                else:
                    console.print(f"[red]Error:[/red] API returned {response.status_code}")
                    return {}
                    
            except Exception as e:
                console.print(f"[red]Error:[/red] {str(e)}")
                return {}

    def analyze_directory(self, directory: str, recursive: bool = True, 
                         output_format: str = 'table') -> Dict[str, Any]:
        """Analyze all files in a directory"""
        directory = Path(directory)
        
        if not directory.exists():
            console.print(f"[red]Error:[/red] Directory {directory} not found")
            return {}
        
        # Find all code files
        patterns = ['*.py', '*.js', '*.ts', '*.java', '*.cpp', '*.c', '*.cs', 
                   '*.go', '*.rs', '*.php', '*.rb', '*.jsx', '*.tsx']
        
        files = []
        for pattern in patterns:
            if recursive:
                files.extend(directory.rglob(pattern))
            else:
                files.extend(directory.glob(pattern))
        
        if not files:
            console.print("[yellow]No code files found in directory[/yellow]")
            return {}
        
        console.print(f"Found {len(files)} files to analyze")
        
        results = {}
        total_issues = 0
        
        with Progress(console=console) as progress:
            task = progress.add_task("Analyzing files...", total=len(files))
            
            for file_path in files:
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    language = self.detect_language(file_path)
                    
                    response = self.session.post(f"{self.api_url}/api/reviews/analyze", json={
                        'code': content,
                        'language': language,
                        'fileName': str(file_path),
                        'options': {
                            'mentorship': False,  # Disable for batch processing
                            'securityFocus': True,
                            'cli': True
                        }
                    }, timeout=30)
                    
                    if response.status_code == 200:
                        result = response.json()
                        results[str(file_path)] = result
                        total_issues += len(result.get('comments', []))
                    
                    progress.update(task, advance=1)
                    
                except Exception as e:
                    console.print(f"[red]Error analyzing {file_path}:[/red] {str(e)}")
                    progress.update(task, advance=1)
        
        # Display summary
        self.display_directory_summary(results, total_issues, output_format)
        return results

    def watch_directory(self, directory: str):
        """Watch directory for changes and analyze automatically"""
        try:
            import watchdog
            from watchdog.observers import Observer
            from watchdog.events import FileSystemEventHandler
        except ImportError:
            console.print("[red]Error:[/red] watchdog package required for watch mode")
            console.print("Install with: pip install watchdog")
            return
        
        class CodeChangeHandler(FileSystemEventHandler):
            def __init__(self, cli_instance):
                self.cli = cli_instance
                self.last_analysis = {}
            
            def on_modified(self, event):
                if event.is_directory:
                    return
                
                file_path = Path(event.src_path)
                if file_path.suffix in ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.php', '.rb']:
                    # Debounce: only analyze if file hasn't been analyzed in last 2 seconds
                    now = time.time()
                    if file_path in self.last_analysis and now - self.last_analysis[file_path] < 2:
                        return
                    
                    self.last_analysis[file_path] = now
                    console.print(f"\n[blue]File changed:[/blue] {file_path}")
                    self.cli.analyze_file(str(file_path), 'compact')
        
        console.print(f"[green]Watching directory:[/green] {directory}")
        console.print("Press Ctrl+C to stop watching")
        
        event_handler = CodeChangeHandler(self)
        observer = Observer()
        observer.schedule(event_handler, directory, recursive=True)
        observer.start()
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            observer.stop()
            console.print("\n[yellow]Stopped watching[/yellow]")
        observer.join()

    def git_hook_install(self, hook_type: str = 'pre-commit'):
        """Install git hook for automatic analysis"""
        git_dir = Path('.git')
        if not git_dir.exists():
            console.print("[red]Error:[/red] Not a git repository")
            return
        
        hooks_dir = git_dir / 'hooks'
        hooks_dir.mkdir(exist_ok=True)
        
        hook_file = hooks_dir / hook_type
        
        hook_script = f"""#!/bin/bash
# CodeGuardian {hook_type} hook
echo "Running CodeGuardian analysis..."

# Get list of changed files
if [ "{hook_type}" = "pre-commit" ]; then
    files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(py|js|ts|java|cpp|c|cs|go|rs|php|rb)$')
else
    files=$(git diff --name-only HEAD~1 | grep -E '\\.(py|js|ts|java|cpp|c|cs|go|rs|php|rb)$')
fi

if [ -z "$files" ]; then
    echo "No code files to analyze"
    exit 0
fi

# Analyze each file
for file in $files; do
    if [ -f "$file" ]; then
        echo "Analyzing $file..."
        codeguardian analyze "$file" --format json --quiet
        if [ $? -ne 0 ]; then
            echo "CodeGuardian analysis failed for $file"
            exit 1
        fi
    fi
done

echo "CodeGuardian analysis completed successfully"
"""
        
        with open(hook_file, 'w') as f:
            f.write(hook_script)
        
        # Make executable
        os.chmod(hook_file, 0o755)
        
        console.print(f"[green]✓[/green] {hook_type} hook installed successfully")
        console.print(f"Hook location: {hook_file}")

    def explain_code(self, code: str = None, file_path: str = None):
        """Get AI explanation for code"""
        if file_path:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                code = f.read()
        
        if not code:
            console.print("[red]Error:[/red] No code provided")
            return
        
        try:
            response = self.session.post(f"{self.api_url}/api/reviews/explain", json={
                'code': code,
                'mentorshipLevel': 'detailed'
            }, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                self.display_explanation(result)
            else:
                console.print(f"[red]Error:[/red] API returned {response.status_code}")
                
        except Exception as e:
            console.print(f"[red]Error:[/red] {str(e)}")

    def display_analysis_result(self, result: Dict[str, Any], file_path: Path, 
                               output_format: str):
        """Display analysis results"""
        comments = result.get('comments', [])
        
        if output_format == 'json':
            console.print(json.dumps(result, indent=2))
            return
        
        if output_format == 'compact':
            if comments:
                console.print(f"[red]{len(comments)} issues found in {file_path.name}[/red]")
            else:
                console.print(f"[green]✓ No issues found in {file_path.name}[/green]")
            return
        
        # Table format (default)
        console.print(f"\n[bold blue]Analysis Results for {file_path}[/bold blue]")
        
        if not comments:
            console.print("[green]✓ No issues found![/green]")
            return
        
        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("Line", style="dim", width=6)
        table.add_column("Severity", width=10)
        table.add_column("Category", width=12)
        table.add_column("Message", width=50)
        table.add_column("Suggestion", width=30)
        
        for comment in comments:
            severity_color = {
                'high': 'red',
                'medium': 'yellow',
                'low': 'blue'
            }.get(comment.get('severity', 'low'), 'blue')
            
            table.add_row(
                str(comment.get('line_number', 'N/A')),
                f"[{severity_color}]{comment.get('severity', 'low').upper()}[/{severity_color}]",
                comment.get('category', 'general'),
                comment.get('message', 'No message'),
                comment.get('suggestion', 'No suggestion')[:30] + "..." if len(comment.get('suggestion', '')) > 30 else comment.get('suggestion', '')
            )
        
        console.print(table)
        
        # Display scores
        scores_panel = Panel(
            f"Overall: {result.get('overall_score', 0)}/100 | "
            f"Security: {result.get('security_score', 0)}/100 | "
            f"Performance: {result.get('performance_score', 0)}/100",
            title="Scores",
            border_style="blue"
        )
        console.print(scores_panel)

    def display_directory_summary(self, results: Dict[str, Any], total_issues: int, 
                                 output_format: str):
        """Display directory analysis summary"""
        if output_format == 'json':
            console.print(json.dumps(results, indent=2))
            return
        
        console.print(f"\n[bold blue]Directory Analysis Summary[/bold blue]")
        console.print(f"Files analyzed: {len(results)}")
        console.print(f"Total issues: {total_issues}")
        
        if total_issues == 0:
            console.print("[green]✓ No issues found in any files![/green]")
            return
        
        # Show files with most issues
        file_issues = [(file, len(data.get('comments', []))) for file, data in results.items()]
        file_issues.sort(key=lambda x: x[1], reverse=True)
        
        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("File", width=40)
        table.add_column("Issues", width=10)
        table.add_column("Score", width=10)
        
        for file, issue_count in file_issues[:10]:  # Top 10
            if issue_count > 0:
                score = results[file].get('overall_score', 0)
                score_color = 'green' if score >= 80 else 'yellow' if score >= 60 else 'red'
                table.add_row(
                    Path(file).name,
                    str(issue_count),
                    f"[{score_color}]{score}/100[/{score_color}]"
                )
        
        console.print(table)

    def display_explanation(self, result: Dict[str, Any]):
        """Display code explanation"""
        console.print("\n[bold blue]🎓 CodeGuardian Mentorship[/bold blue]")
        
        if 'description' in result:
            console.print(Panel(
                result['description'],
                title="What this code does",
                border_style="blue"
            ))
        
        if 'suggestions' in result:
            console.print(Panel(
                result['suggestions'],
                title="💡 Improvement suggestions",
                border_style="green"
            ))
        
        if 'reasoning' in result:
            console.print(Panel(
                result['reasoning'],
                title="🔍 Why this matters",
                border_style="yellow"
            ))

    def detect_language(self, file_path: Path) -> str:
        """Detect programming language from file extension"""
        extension_map = {
            '.py': 'python',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.go': 'go',
            '.rs': 'rust',
            '.php': 'php',
            '.rb': 'ruby'
        }
        return extension_map.get(file_path.suffix.lower(), 'text')

def main():
    parser = argparse.ArgumentParser(description='CodeGuardian CLI - AI-powered code analysis')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Configure command
    config_parser = subparsers.add_parser('configure', help='Configure CLI settings')
    config_parser.add_argument('--api-url', help='API URL')
    config_parser.add_argument('--api-key', help='API key')
    
    # Analyze command
    analyze_parser = subparsers.add_parser('analyze', help='Analyze code files')
    analyze_parser.add_argument('path', help='File or directory to analyze')
    analyze_parser.add_argument('--recursive', '-r', action='store_true', help='Analyze directories recursively')
    analyze_parser.add_argument('--format', choices=['table', 'json', 'compact'], default='table', help='Output format')
    analyze_parser.add_argument('--quiet', '-q', action='store_true', help='Minimal output')
    
    # Watch command
    watch_parser = subparsers.add_parser('watch', help='Watch directory for changes')
    watch_parser.add_argument('directory', help='Directory to watch')
    
    # Git hook command
    hook_parser = subparsers.add_parser('git-hook', help='Install git hooks')
    hook_parser.add_argument('--type', choices=['pre-commit', 'pre-push'], default='pre-commit', help='Hook type')
    
    # Explain command
    explain_parser = subparsers.add_parser('explain', help='Get AI explanation for code')
    explain_parser.add_argument('--file', help='File to explain')
    explain_parser.add_argument('--code', help='Code snippet to explain')
    
    # Test command
    test_parser = subparsers.add_parser('test', help='Test API connection')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    cli = CodeGuardianCLI()
    
    if args.command == 'configure':
        cli.configure(args.api_url, args.api_key)
    
    elif args.command == 'analyze':
        path = Path(args.path)
        if path.is_file():
            cli.analyze_file(str(path), args.format)
        elif path.is_dir():
            cli.analyze_directory(str(path), args.recursive, args.format)
        else:
            console.print(f"[red]Error:[/red] {path} not found")
    
    elif args.command == 'watch':
        cli.watch_directory(args.directory)
    
    elif args.command == 'git-hook':
        cli.git_hook_install(args.type)
    
    elif args.command == 'explain':
        cli.explain_code(args.code, args.file)
    
    elif args.command == 'test':
        if cli.test_connection():
            console.print("[green]✓[/green] Connection successful!")
        else:
            console.print("[red]✗[/red] Connection failed!")

if __name__ == '__main__':
    main()


"""
CodeGuardian Slack Bot
Provides team collaboration and code review notifications via Slack
"""

import os
import json
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from slack_bolt import App
from slack_bolt.adapter.flask import SlackRequestHandler

# Initialize Flask app
flask_app = Flask(__name__)

# Initialize Slack app
slack_app = App(
    token=os.environ.get("SLACK_BOT_TOKEN"),
    signing_secret=os.environ.get("SLACK_SIGNING_SECRET")
)

# Slack request handler
handler = SlackRequestHandler(slack_app)

# CodeGuardian API configuration
CODEGUARDIAN_API_URL = os.environ.get("CODEGUARDIAN_API_URL", "https://codeguardian-api.onrender.com")
CODEGUARDIAN_API_KEY = os.environ.get("CODEGUARDIAN_API_KEY")

class CodeGuardianSlackBot:
    def __init__(self):
        self.client = WebClient(token=os.environ.get("SLACK_BOT_TOKEN"))
        self.api_headers = {
            'Authorization': f'Bearer {CODEGUARDIAN_API_KEY}',
            'Content-Type': 'application/json'
        }

    def analyze_code_snippet(self, code, language='python'):
        """Analyze code snippet using CodeGuardian API"""
        try:
            response = requests.post(
                f"{CODEGUARDIAN_API_URL}/api/reviews/analyze",
                headers=self.api_headers,
                json={
                    'code': code,
                    'language': language,
                    'options': {
                        'mentorship': True,
                        'securityFocus': True,
                        'slack': True
                    }
                },
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return None
                
        except Exception as e:
            print(f"Error analyzing code: {e}")
            return None

    def explain_code(self, code, language='python'):
        """Get AI explanation for code"""
        try:
            response = requests.post(
                f"{CODEGUARDIAN_API_URL}/api/reviews/explain",
                headers=self.api_headers,
                json={
                    'code': code,
                    'language': language,
                    'mentorshipLevel': 'detailed'
                },
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return None
                
        except Exception as e:
            print(f"Error explaining code: {e}")
            return None

    def get_team_stats(self, team_id=None):
        """Get team statistics from CodeGuardian"""
        try:
            params = {'team_id': team_id} if team_id else {}
            response = requests.get(
                f"{CODEGUARDIAN_API_URL}/api/reviews/team-stats",
                headers=self.api_headers,
                params=params,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return None
                
        except Exception as e:
            print(f"Error getting team stats: {e}")
            return None

    def format_analysis_message(self, analysis, code_snippet):
        """Format analysis results for Slack"""
        if not analysis:
            return {
                "text": "❌ Analysis failed. Please check the code and try again.",
                "response_type": "ephemeral"
            }

        comments = analysis.get('comments', [])
        overall_score = analysis.get('overall_score', 0)
        security_score = analysis.get('security_score', 0)

        # Determine emoji based on score
        if overall_score >= 80:
            score_emoji = "🟢"
        elif overall_score >= 60:
            score_emoji = "🟡"
        else:
            score_emoji = "🔴"

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{score_emoji} CodeGuardian Analysis Results"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Overall Score:* {overall_score}/100"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Security Score:* {security_score}/100"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Issues Found:* {len(comments)}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Analysis Time:* {datetime.now().strftime('%H:%M:%S')}"
                    }
                ]
            }
        ]

        # Add code snippet
        if len(code_snippet) < 500:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Analyzed Code:*\n```\n{code_snippet}\n```"
                }
            })

        # Add issues if any
        if comments:
            issues_text = ""
            for i, comment in enumerate(comments[:5]):  # Limit to 5 issues
                severity_emoji = {
                    'high': '🔴',
                    'medium': '🟡',
                    'low': '🔵'
                }.get(comment.get('severity', 'low'), '🔵')
                
                issues_text += f"{severity_emoji} *Line {comment.get('line_number', 'N/A')}:* {comment.get('message', 'No message')}\n"
                
                if comment.get('suggestion'):
                    issues_text += f"   💡 *Suggestion:* {comment.get('suggestion')}\n"
                
                issues_text += "\n"

            if len(comments) > 5:
                issues_text += f"... and {len(comments) - 5} more issues\n"

            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Issues Found:*\n{issues_text}"
                }
            })
        else:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "✅ *No issues found!* Great job!"
                }
            })

        return {
            "blocks": blocks,
            "response_type": "in_channel"
        }

    def format_explanation_message(self, explanation, code_snippet):
        """Format code explanation for Slack"""
        if not explanation:
            return {
                "text": "❌ Explanation failed. Please check the code and try again.",
                "response_type": "ephemeral"
            }

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "🎓 CodeGuardian Mentorship"
                }
            }
        ]

        # Add code snippet
        if len(code_snippet) < 300:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Code:*\n```\n{code_snippet}\n```"
                }
            })

        # Add explanation
        if explanation.get('description'):
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*What this code does:*\n{explanation['description']}"
                }
            })

        if explanation.get('suggestions'):
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*💡 Improvement suggestions:*\n{explanation['suggestions']}"
                }
            })

        if explanation.get('reasoning'):
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*🔍 Why this matters:*\n{explanation['reasoning']}"
                }
            })

        return {
            "blocks": blocks,
            "response_type": "in_channel"
        }

    def format_stats_message(self, stats):
        """Format team statistics for Slack"""
        if not stats:
            return {
                "text": "❌ Could not retrieve team statistics.",
                "response_type": "ephemeral"
            }

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "📊 Team CodeGuardian Statistics"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Files Analyzed:* {stats.get('files_analyzed', 0)}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Total Issues:* {stats.get('total_issues', 0)}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Issues Resolved:* {stats.get('issues_resolved', 0)}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Average Score:* {stats.get('average_score', 0)}/100"
                    }
                ]
            }
        ]

        # Add top contributors if available
        if stats.get('top_contributors'):
            contributors_text = ""
            for contributor in stats['top_contributors'][:5]:
                contributors_text += f"• {contributor.get('name', 'Unknown')}: {contributor.get('score', 0)}/100\n"
            
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*🏆 Top Contributors:*\n{contributors_text}"
                }
            })

        return {
            "blocks": blocks,
            "response_type": "in_channel"
        }

# Initialize bot instance
bot = CodeGuardianSlackBot()

# Slash command handlers
@slack_app.command("/codeguardian-analyze")
def handle_analyze_command(ack, respond, command):
    ack()
    
    text = command['text'].strip()
    if not text:
        respond({
            "text": "Please provide code to analyze. Usage: `/codeguardian-analyze <code>`",
            "response_type": "ephemeral"
        })
        return

    # Extract language if specified
    language = 'python'  # default
    if text.startswith('```'):
        lines = text.split('\n')
        if len(lines) > 0 and lines[0].startswith('```'):
            lang_hint = lines[0][3:].strip()
            if lang_hint:
                language = lang_hint
            text = '\n'.join(lines[1:-1]) if lines[-1] == '```' else '\n'.join(lines[1:])

    analysis = bot.analyze_code_snippet(text, language)
    response = bot.format_analysis_message(analysis, text)
    respond(response)

@slack_app.command("/codeguardian-explain")
def handle_explain_command(ack, respond, command):
    ack()
    
    text = command['text'].strip()
    if not text:
        respond({
            "text": "Please provide code to explain. Usage: `/codeguardian-explain <code>`",
            "response_type": "ephemeral"
        })
        return

    # Extract language if specified
    language = 'python'  # default
    if text.startswith('```'):
        lines = text.split('\n')
        if len(lines) > 0 and lines[0].startswith('```'):
            lang_hint = lines[0][3:].strip()
            if lang_hint:
                language = lang_hint
            text = '\n'.join(lines[1:-1]) if lines[-1] == '```' else '\n'.join(lines[1:])

    explanation = bot.explain_code(text, language)
    response = bot.format_explanation_message(explanation, text)
    respond(response)

@slack_app.command("/codeguardian-stats")
def handle_stats_command(ack, respond, command):
    ack()
    
    stats = bot.get_team_stats()
    response = bot.format_stats_message(stats)
    respond(response)

@slack_app.command("/codeguardian-help")
def handle_help_command(ack, respond, command):
    ack()
    
    help_text = """
🛡️ *CodeGuardian Slack Bot Commands*

• `/codeguardian-analyze <code>` - Analyze code for issues and get suggestions
• `/codeguardian-explain <code>` - Get AI explanation and mentorship for code
• `/codeguardian-stats` - View team code quality statistics
• `/codeguardian-help` - Show this help message

*Examples:*
```
/codeguardian-analyze 
```python
def unsafe_function(user_input):
    exec(user_input)
```

/codeguardian-explain
```javascript
const result = array.reduce((acc, item) => acc + item, 0);
```
```

*Tips:*
• Use code blocks with language hints for better analysis
• The bot works with Python, JavaScript, TypeScript, Java, C++, and more
• Analysis results are shared with the channel, explanations can be private
    """
    
    respond({
        "text": help_text,
        "response_type": "ephemeral"
    })

# Event handlers
@slack_app.event("message")
def handle_message_events(body, logger):
    # Handle direct mentions and code snippets
    event = body["event"]
    
    # Skip bot messages
    if event.get("bot_id"):
        return
    
    # Check if bot is mentioned
    if "codeguardian" in event.get("text", "").lower():
        # Look for code blocks in the message
        text = event.get("text", "")
        if "```" in text:
            # Extract code block
            start = text.find("```")
            end = text.find("```", start + 3)
            if end != -1:
                code_block = text[start+3:end].strip()
                if code_block:
                    # Analyze the code
                    analysis = bot.analyze_code_snippet(code_block)
                    response = bot.format_analysis_message(analysis, code_block)
                    
                    # Send response to channel
                    try:
                        bot.client.chat_postMessage(
                            channel=event["channel"],
                            **response
                        )
                    except SlackApiError as e:
                        logger.error(f"Error posting message: {e}")

# Flask routes
@flask_app.route("/slack/events", methods=["POST"])
def slack_events():
    return handler.handle(request)

@flask_app.route("/webhook/github", methods=["POST"])
def github_webhook():
    """Handle GitHub webhook for PR analysis"""
    data = request.json
    
    if data.get("action") == "opened" and "pull_request" in data:
        pr = data["pull_request"]
        
        # Send notification to configured Slack channel
        message = {
            "text": f"🔍 New PR opened: {pr['title']}",
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "🔍 New Pull Request"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*{pr['title']}*\n{pr['html_url']}"
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "Analyze with CodeGuardian"
                            },
                            "value": pr['html_url'],
                            "action_id": "analyze_pr"
                        }
                    ]
                }
            ]
        }
        
        # Send to default channel (configure via environment variable)
        channel = os.environ.get("SLACK_DEFAULT_CHANNEL", "#code-reviews")
        try:
            bot.client.chat_postMessage(channel=channel, **message)
        except SlackApiError as e:
            print(f"Error sending GitHub webhook message: {e}")
    
    return jsonify({"status": "ok"})

@flask_app.route("/health")
def health():
    return jsonify({"status": "healthy", "service": "codeguardian-slack-bot"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    flask_app.run(host="0.0.0.0", port=port, debug=False)


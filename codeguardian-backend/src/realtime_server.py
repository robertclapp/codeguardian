"""
Real-time WebSocket Server for CodeGuardian
Provides live code analysis using Manus latest features
"""

import asyncio
import json
import logging
import os
from datetime import datetime
from typing import Dict, Set, Any

import websockets
import redis.asyncio as redis
from websockets.server import WebSocketServerProtocol

from services.manus_ai_service import ManusAIService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RealTimeAnalysisServer:
    """Real-time code analysis server with WebSocket support"""
    
    def __init__(self):
        self.clients: Set[WebSocketServerProtocol] = set()
        self.client_sessions: Dict[str, Dict[str, Any]] = {}
        self.ai_service = ManusAIService()
        
        # Redis for session management and caching
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.redis = redis.from_url(redis_url)
        
        # Real-time analysis configuration
        self.analysis_debounce_ms = 500  # Wait 500ms after typing stops
        self.max_analysis_length = 10000  # Limit code length for real-time
        self.supported_languages = [
            'javascript', 'typescript', 'python', 'java', 'go', 
            'rust', 'cpp', 'c', 'php', 'ruby', 'swift', 'kotlin'
        ]
    
    async def register_client(self, websocket: WebSocketServerProtocol, session_id: str):
        """Register a new client connection"""
        self.clients.add(websocket)
        self.client_sessions[session_id] = {
            'websocket': websocket,
            'last_analysis': None,
            'analysis_count': 0,
            'connected_at': datetime.utcnow(),
            'language': 'javascript',
            'real_time_enabled': True
        }
        
        # Store session in Redis
        await self.redis.hset(
            f"session:{session_id}",
            mapping={
                'connected_at': datetime.utcnow().isoformat(),
                'status': 'active'
            }
        )
        
        logger.info(f"Client {session_id} connected. Total clients: {len(self.clients)}")
        
        # Send welcome message
        await self.send_to_client(websocket, {
            'type': 'connection',
            'status': 'connected',
            'session_id': session_id,
            'features': {
                'real_time_analysis': True,
                'multi_model_support': True,
                'mcp_integration': True,
                'supported_languages': self.supported_languages
            }
        })
    
    async def unregister_client(self, websocket: WebSocketServerProtocol, session_id: str):
        """Unregister a client connection"""
        self.clients.discard(websocket)
        if session_id in self.client_sessions:
            del self.client_sessions[session_id]
        
        # Update session in Redis
        await self.redis.hset(
            f"session:{session_id}",
            mapping={'status': 'disconnected', 'disconnected_at': datetime.utcnow().isoformat()}
        )
        
        logger.info(f"Client {session_id} disconnected. Total clients: {len(self.clients)}")
    
    async def send_to_client(self, websocket: WebSocketServerProtocol, message: Dict[str, Any]):
        """Send message to a specific client"""
        try:
            await websocket.send(json.dumps(message))
        except websockets.exceptions.ConnectionClosed:
            logger.warning("Attempted to send to closed connection")
        except Exception as e:
            logger.error(f"Error sending message: {e}")
    
    async def broadcast_to_team(self, team_id: str, message: Dict[str, Any]):
        """Broadcast message to all clients in a team"""
        team_clients = []
        for session_id, session in self.client_sessions.items():
            session_team = await self.redis.hget(f"session:{session_id}", 'team_id')
            if session_team and session_team.decode() == team_id:
                team_clients.append(session['websocket'])
        
        if team_clients:
            await asyncio.gather(
                *[self.send_to_client(client, message) for client in team_clients],
                return_exceptions=True
            )
    
    async def handle_real_time_analysis(self, websocket: WebSocketServerProtocol, session_id: str, data: Dict[str, Any]):
        """Handle real-time code analysis request"""
        try:
            code = data.get('code', '')
            language = data.get('language', 'javascript')
            cursor_position = data.get('cursor_position', 0)
            
            # Validate input
            if len(code) > self.max_analysis_length:
                await self.send_to_client(websocket, {
                    'type': 'error',
                    'message': f'Code too long for real-time analysis (max {self.max_analysis_length} chars)'
                })
                return
            
            if language not in self.supported_languages:
                await self.send_to_client(websocket, {
                    'type': 'error',
                    'message': f'Language {language} not supported for real-time analysis'
                })
                return
            
            # Update session
            session = self.client_sessions.get(session_id)
            if session:
                session['language'] = language
                session['analysis_count'] += 1
            
            # Send analysis started notification
            await self.send_to_client(websocket, {
                'type': 'analysis_started',
                'timestamp': datetime.utcnow().isoformat()
            })
            
            # Perform real-time analysis
            analysis_options = {
                'model': 'gpt-4.1-nano',  # Fast model for real-time
                'real_time_mode': True,
                'focus_area': 'current_context',
                'cursor_position': cursor_position,
                'quick_suggestions': True,
                'max_suggestions': 3
            }
            
            analysis_result = await self.ai_service.analyze_code_advanced(
                code, language, analysis_options
            )
            
            # Process results for real-time display
            real_time_response = await self.process_real_time_results(
                analysis_result, cursor_position, code
            )
            
            # Cache results
            await self.redis.setex(
                f"analysis:{session_id}:latest",
                300,  # 5 minutes TTL
                json.dumps(real_time_response)
            )
            
            # Send results
            await self.send_to_client(websocket, {
                'type': 'analysis_complete',
                'data': real_time_response,
                'timestamp': datetime.utcnow().isoformat(),
                'session_id': session_id
            })
            
        except Exception as e:
            logger.error(f"Real-time analysis error: {e}")
            await self.send_to_client(websocket, {
                'type': 'analysis_error',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            })
    
    async def process_real_time_results(self, analysis_result: Dict[str, Any], cursor_position: int, code: str) -> Dict[str, Any]:
        """Process analysis results for real-time display"""
        
        # Filter suggestions relevant to current context
        relevant_suggestions = []
        code_lines = code.split('\n')
        current_line = len(code[:cursor_position].split('\n'))
        
        for comment in analysis_result.get('comments', []):
            line_num = comment.get('line_number', 0)
            # Include suggestions within 5 lines of cursor
            if abs(line_num - current_line) <= 5:
                relevant_suggestions.append({
                    'type': comment.get('category', 'suggestion'),
                    'message': comment.get('message', ''),
                    'line': line_num,
                    'severity': comment.get('severity', 'low'),
                    'auto_fix': comment.get('auto_fix'),
                    'confidence': comment.get('confidence', 0)
                })
        
        # Sort by relevance (proximity to cursor + severity)
        relevant_suggestions.sort(key=lambda x: (
            abs(x['line'] - current_line),
            {'high': 0, 'medium': 1, 'low': 2}.get(x['severity'], 2)
        ))
        
        return {
            'suggestions': relevant_suggestions[:3],  # Top 3 most relevant
            'overall_health': analysis_result.get('overall_score', 0),
            'quick_stats': {
                'syntax_valid': len([s for s in relevant_suggestions if s['type'] == 'syntax']) == 0,
                'security_issues': len([s for s in relevant_suggestions if s['type'] == 'security']),
                'performance_hints': len([s for s in relevant_suggestions if s['type'] == 'performance'])
            },
            'model_used': analysis_result.get('model_used', 'gpt-4.1-nano'),
            'processing_time': analysis_result.get('processing_time', 'fast')
        }
    
    async def handle_team_collaboration(self, websocket: WebSocketServerProtocol, session_id: str, data: Dict[str, Any]):
        """Handle team collaboration features"""
        try:
            action = data.get('action')
            team_id = data.get('team_id')
            
            if not team_id:
                await self.send_to_client(websocket, {
                    'type': 'error',
                    'message': 'Team ID required for collaboration features'
                })
                return
            
            # Store team association
            await self.redis.hset(f"session:{session_id}", 'team_id', team_id)
            
            if action == 'join_team':
                await self.broadcast_to_team(team_id, {
                    'type': 'team_member_joined',
                    'session_id': session_id,
                    'timestamp': datetime.utcnow().isoformat()
                })
                
            elif action == 'share_analysis':
                analysis_data = data.get('analysis_data')
                await self.broadcast_to_team(team_id, {
                    'type': 'shared_analysis',
                    'data': analysis_data,
                    'from_session': session_id,
                    'timestamp': datetime.utcnow().isoformat()
                })
                
            elif action == 'request_review':
                code = data.get('code', '')
                language = data.get('language', 'javascript')
                
                await self.broadcast_to_team(team_id, {
                    'type': 'review_request',
                    'code': code,
                    'language': language,
                    'from_session': session_id,
                    'timestamp': datetime.utcnow().isoformat()
                })
        
        except Exception as e:
            logger.error(f"Team collaboration error: {e}")
            await self.send_to_client(websocket, {
                'type': 'collaboration_error',
                'error': str(e)
            })
    
    async def handle_settings_update(self, websocket: WebSocketServerProtocol, session_id: str, data: Dict[str, Any]):
        """Handle client settings updates"""
        try:
            settings = data.get('settings', {})
            session = self.client_sessions.get(session_id)
            
            if session:
                # Update session settings
                if 'real_time_enabled' in settings:
                    session['real_time_enabled'] = settings['real_time_enabled']
                
                if 'language' in settings:
                    session['language'] = settings['language']
                
                # Store in Redis
                await self.redis.hset(
                    f"session:{session_id}",
                    mapping=settings
                )
                
                await self.send_to_client(websocket, {
                    'type': 'settings_updated',
                    'settings': settings,
                    'timestamp': datetime.utcnow().isoformat()
                })
        
        except Exception as e:
            logger.error(f"Settings update error: {e}")
            await self.send_to_client(websocket, {
                'type': 'settings_error',
                'error': str(e)
            })
    
    async def handle_client_message(self, websocket: WebSocketServerProtocol, session_id: str, message: str):
        """Handle incoming client messages"""
        try:
            data = json.loads(message)
            message_type = data.get('type')
            
            if message_type == 'real_time_analysis':
                await self.handle_real_time_analysis(websocket, session_id, data)
            
            elif message_type == 'team_collaboration':
                await self.handle_team_collaboration(websocket, session_id, data)
            
            elif message_type == 'settings_update':
                await self.handle_settings_update(websocket, session_id, data)
            
            elif message_type == 'ping':
                await self.send_to_client(websocket, {
                    'type': 'pong',
                    'timestamp': datetime.utcnow().isoformat()
                })
            
            else:
                await self.send_to_client(websocket, {
                    'type': 'error',
                    'message': f'Unknown message type: {message_type}'
                })
        
        except json.JSONDecodeError:
            await self.send_to_client(websocket, {
                'type': 'error',
                'message': 'Invalid JSON message'
            })
        except Exception as e:
            logger.error(f"Message handling error: {e}")
            await self.send_to_client(websocket, {
                'type': 'error',
                'message': 'Internal server error'
            })
    
    async def client_handler(self, websocket: WebSocketServerProtocol, path: str):
        """Handle individual client connections"""
        session_id = None
        try:
            # Extract session ID from path or generate new one
            if path.startswith('/ws/'):
                session_id = path.split('/')[-1]
            else:
                session_id = f"session_{datetime.utcnow().timestamp()}"
            
            await self.register_client(websocket, session_id)
            
            async for message in websocket:
                await self.handle_client_message(websocket, session_id, message)
        
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client {session_id} connection closed")
        except Exception as e:
            logger.error(f"Client handler error: {e}")
        finally:
            if session_id:
                await self.unregister_client(websocket, session_id)
    
    async def start_server(self, host: str = "0.0.0.0", port: int = 8080):
        """Start the WebSocket server"""
        logger.info(f"Starting CodeGuardian Real-time Server on {host}:{port}")
        
        # Health check endpoint
        async def health_check(path, request_headers):
            if path == "/health":
                return 200, [], b"OK"
        
        server = await websockets.serve(
            self.client_handler,
            host,
            port,
            process_request=health_check,
            ping_interval=30,
            ping_timeout=10,
            max_size=1024*1024,  # 1MB max message size
            compression="deflate"
        )
        
        logger.info("Real-time server started successfully")
        return server

# Global server instance
server_instance = RealTimeAnalysisServer()

async def main():
    """Main entry point"""
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('WEBSOCKET_PORT', '8080'))
    
    server = await server_instance.start_server(host, port)
    
    try:
        await server.wait_closed()
    except KeyboardInterrupt:
        logger.info("Server shutting down...")
        server.close()
        await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())


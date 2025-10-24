import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Brain, 
  Zap, 
  Shield, 
  Users, 
  TrendingUp, 
  BookOpen, 
  Cpu, 
  Database,
  GitBranch,
  Sparkles,
  Rocket,
  Target
} from 'lucide-react';

const ManusFeaturesPanel = ({ analysisResult, onFeatureSelect }) => {
  const [activeFeature, setActiveFeature] = useState('multi-model');
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);
  const [teamMode, setTeamMode] = useState(false);

  const manusFeatures = {
    'multi-model': {
      icon: Brain,
      title: 'Multi-Model AI Analysis',
      description: 'Leverages multiple AI models for comprehensive insights',
      status: analysisResult?.manus_features?.multi_model_support ? 'active' : 'available',
      models: ['GPT-4.1 Mini', 'GPT-4.1 Nano', 'Gemini 2.5 Flash'],
      benefits: [
        'Higher accuracy through consensus',
        'Different perspectives on code quality',
        'Reduced false positives'
      ]
    },
    'real-time': {
      icon: Zap,
      title: 'Real-Time Analysis',
      description: 'Live code analysis as you type with instant feedback',
      status: realTimeEnabled ? 'active' : 'available',
      features: [
        'Instant syntax checking',
        'Live security scanning',
        'Performance hints while coding'
      ]
    },
    'mcp-integration': {
      icon: Database,
      title: 'MCP Integration',
      description: 'Model Context Protocol for enhanced capabilities',
      status: analysisResult?.mcp_enhanced ? 'active' : 'available',
      servers: [
        { name: 'Notion', purpose: 'Documentation insights' },
        { name: 'Vercel', purpose: 'Deployment optimization' },
        { name: 'Prisma', purpose: 'Database analysis' },
        { name: 'Supabase', purpose: 'Backend automation' }
      ]
    },
    'security-deep': {
      icon: Shield,
      title: 'Advanced Security',
      description: 'Deep security analysis with threat detection',
      status: analysisResult?.advanced_security ? 'active' : 'available',
      capabilities: [
        'Vulnerability pattern detection',
        'Dependency risk analysis',
        'Data flow security review',
        'Authentication pattern audit'
      ]
    },
    'team-collaboration': {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Enhanced features for team development',
      status: teamMode ? 'active' : 'available',
      features: [
        'Code review complexity assessment',
        'Knowledge sharing opportunities',
        'Pair programming suggestions',
        'Team style consistency checks'
      ]
    },
    'performance-profiling': {
      icon: TrendingUp,
      title: 'Performance Profiling',
      description: 'Advanced performance analysis and optimization',
      status: analysisResult?.profiling_suggestions ? 'active' : 'available',
      tools: [
        'Bottleneck identification',
        'Profiling tool recommendations',
        'Benchmark suggestions',
        'Scalability analysis'
      ]
    }
  };

  const ModelComparison = () => (
    <div className="space-y-4">
      <h4 className="font-semibold">Model Performance Comparison</h4>
      {analysisResult?.multi_model_insights && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Primary Model</CardTitle>
              <Badge variant="outline">
                {analysisResult.multi_model_insights.primary_model}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Accuracy</span>
                  <span>94%</span>
                </div>
                <Progress value={94} className="h-2" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Secondary Model</CardTitle>
              <Badge variant="outline">
                {analysisResult.multi_model_insights.secondary_model}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Speed</span>
                  <span>Fast</span>
                </div>
                <Progress value={87} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {analysisResult?.multi_model_insights?.consensus_issues && (
        <Alert>
          <Target className="h-4 w-4" />
          <AlertDescription>
            {analysisResult.multi_model_insights.consensus_issues.length} issues confirmed by multiple models
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const RealTimeControls = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">Real-Time Analysis</h4>
          <p className="text-sm text-muted-foreground">
            Enable live code analysis while typing
          </p>
        </div>
        <Button
          variant={realTimeEnabled ? "default" : "outline"}
          onClick={() => setRealTimeEnabled(!realTimeEnabled)}
        >
          {realTimeEnabled ? 'Enabled' : 'Enable'}
        </Button>
      </div>
      
      {realTimeEnabled && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-sm">Live analysis active</span>
            <Badge variant="secondary">GPT-4.1 Nano</Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="font-semibold text-green-700">Syntax</div>
              <div className="text-green-600">✓ Valid</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 rounded">
              <div className="font-semibold text-yellow-700">Security</div>
              <div className="text-yellow-600">⚠ 1 Issue</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="font-semibold text-blue-700">Performance</div>
              <div className="text-blue-600">→ Optimizing</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const MCPStatus = () => (
    <div className="space-y-4">
      <h4 className="font-semibold">MCP Server Status</h4>
      <div className="grid grid-cols-2 gap-3">
        {manusFeatures['mcp-integration'].servers.map((server, index) => (
          <div key={index} className="flex items-center space-x-2 p-2 border rounded">
            <div className={`w-2 h-2 rounded-full ${
              analysisResult?.mcp_enhanced ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{server.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {server.purpose}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {analysisResult?.documentation_suggestions && (
        <Alert>
          <BookOpen className="h-4 w-4" />
          <AlertDescription>
            Documentation insights available from Notion MCP
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const SecurityInsights = () => (
    <div className="space-y-4">
      <h4 className="font-semibold">Advanced Security Analysis</h4>
      
      {analysisResult?.advanced_security && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Vulnerability Scan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {analysisResult.advanced_security.vulnerability_patterns?.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Issues found</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Dependency Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {analysisResult.advanced_security.dependency_risks?.risky_dependencies?.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">At-risk packages</div>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium">Security Score Breakdown</div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Authentication</span>
                <span>85%</span>
              </div>
              <Progress value={85} className="h-1" />
              
              <div className="flex justify-between text-xs">
                <span>Data Handling</span>
                <span>92%</span>
              </div>
              <Progress value={92} className="h-1" />
              
              <div className="flex justify-between text-xs">
                <span>Dependencies</span>
                <span>78%</span>
              </div>
              <Progress value={78} className="h-1" />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const TeamCollaboration = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">Team Mode</h4>
          <p className="text-sm text-muted-foreground">
            Enhanced collaboration features
          </p>
        </div>
        <Button
          variant={teamMode ? "default" : "outline"}
          onClick={() => setTeamMode(!teamMode)}
        >
          {teamMode ? 'Active' : 'Activate'}
        </Button>
      </div>
      
      {teamMode && analysisResult?.collaboration_insights && (
        <div className="space-y-3">
          <div className="p-3 bg-blue-50 rounded">
            <div className="text-sm font-medium text-blue-900">Review Complexity</div>
            <div className="text-xs text-blue-700">
              Estimated review time: {analysisResult.collaboration_insights.review_complexity?.review_time_estimate || '10-15 minutes'}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium">Team Insights</div>
            <div className="text-xs space-y-1">
              <div>• Code style consistency: {analysisResult.collaboration_insights.code_style_consistency?.consistency_score || 85}%</div>
              <div>• Documentation coverage: {analysisResult.collaboration_insights.documentation_coverage?.documentation_score || 70}%</div>
              <div>• Complexity score: {analysisResult.collaboration_insights.review_complexity?.complexity_score || 60}/100</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const PerformanceProfiling = () => (
    <div className="space-y-4">
      <h4 className="font-semibold">Performance Analysis</h4>
      
      {analysisResult?.profiling_suggestions && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 border rounded">
              <Cpu className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-xs font-medium">CPU</div>
              <div className="text-xs text-muted-foreground">Optimized</div>
            </div>
            <div className="text-center p-2 border rounded">
              <Database className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <div className="text-xs font-medium">Memory</div>
              <div className="text-xs text-muted-foreground">Efficient</div>
            </div>
            <div className="text-center p-2 border rounded">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
              <div className="text-xs font-medium">I/O</div>
              <div className="text-xs text-muted-foreground">Review</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium">Recommended Tools</div>
            <div className="flex flex-wrap gap-1">
              {analysisResult.profiling_suggestions.recommended_tools?.map((tool, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tool}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const FeatureCard = ({ featureKey, feature }) => {
    const Icon = feature.icon;
    const isActive = feature.status === 'active';
    
    return (
      <Card 
        className={`cursor-pointer transition-all ${
          activeFeature === featureKey ? 'ring-2 ring-primary' : ''
        } ${isActive ? 'border-green-200 bg-green-50' : ''}`}
        onClick={() => setActiveFeature(featureKey)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Icon className={`h-4 w-4 ${isActive ? 'text-green-600' : 'text-gray-600'}`} />
              <CardTitle className="text-sm">{feature.title}</CardTitle>
            </div>
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? 'Active' : 'Available'}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            {feature.description}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Manus Header */}
      <div className="flex items-center space-x-2 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
        <Sparkles className="h-5 w-5 text-purple-600" />
        <div>
          <h3 className="font-semibold text-purple-900">Manus Enhanced Features</h3>
          <p className="text-sm text-purple-700">
            Powered by latest AI models and MCP integration
          </p>
        </div>
        <Badge variant="outline" className="ml-auto">
          v2.0
        </Badge>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(manusFeatures).map(([key, feature]) => (
          <FeatureCard key={key} featureKey={key} feature={feature} />
        ))}
      </div>

      {/* Feature Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {React.createElement(manusFeatures[activeFeature].icon, { className: "h-4 w-4" })}
            <span>{manusFeatures[activeFeature].title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="controls">Controls</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {manusFeatures[activeFeature].description}
              </p>
              
              {activeFeature === 'multi-model' && <ModelComparison />}
              {activeFeature === 'mcp-integration' && <MCPStatus />}
              {activeFeature === 'security-deep' && <SecurityInsights />}
              {activeFeature === 'team-collaboration' && <TeamCollaboration />}
              {activeFeature === 'performance-profiling' && <PerformanceProfiling />}
            </TabsContent>
            
            <TabsContent value="details" className="space-y-4">
              <div className="space-y-3">
                {manusFeatures[activeFeature].benefits && (
                  <div>
                    <h5 className="font-medium mb-2">Benefits</h5>
                    <ul className="text-sm space-y-1">
                      {manusFeatures[activeFeature].benefits.map((benefit, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <div className="w-1 h-1 bg-green-500 rounded-full" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {manusFeatures[activeFeature].capabilities && (
                  <div>
                    <h5 className="font-medium mb-2">Capabilities</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {manusFeatures[activeFeature].capabilities.map((capability, index) => (
                        <Badge key={index} variant="outline" className="text-xs justify-start">
                          {capability}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="controls" className="space-y-4">
              {activeFeature === 'real-time' && <RealTimeControls />}
              {activeFeature === 'team-collaboration' && <TeamCollaboration />}
              
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  onClick={() => onFeatureSelect?.(activeFeature)}
                  disabled={manusFeatures[activeFeature].status === 'active'}
                >
                  <Rocket className="h-3 w-3 mr-1" />
                  {manusFeatures[activeFeature].status === 'active' ? 'Active' : 'Activate'}
                </Button>
                
                <Button size="sm" variant="outline">
                  Learn More
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {analysisResult?.manus_features && (
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded">
            <div className="text-lg font-bold text-blue-700">
              {analysisResult.multi_model_insights?.consensus_issues?.length || 0}
            </div>
            <div className="text-xs text-blue-600">Consensus Issues</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded">
            <div className="text-lg font-bold text-green-700">
              {analysisResult.mcp_enhanced ? '4' : '0'}
            </div>
            <div className="text-xs text-green-600">MCP Servers</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded">
            <div className="text-lg font-bold text-purple-700">
              {analysisResult.security_score || 0}
            </div>
            <div className="text-xs text-purple-600">Security Score</div>
          </div>
          
          <div className="text-center p-3 bg-yellow-50 rounded">
            <div className="text-lg font-bold text-yellow-700">
              {analysisResult.performance_score || 0}
            </div>
            <div className="text-xs text-yellow-600">Performance</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManusFeaturesPanel;


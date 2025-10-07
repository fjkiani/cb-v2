import React, { useState, useEffect } from 'react';
import {
  Users,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Bot,
  Activity,
  Settings,
  Shield,
  Zap,
  Eye,
  Power,
  MessageSquare,
  BarChart3,
  UserCog
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { BACKEND_CONFIG } from '../../services/backend/config';

interface SystemOverview {
  metrics: {
    users: {
      total: number;
      free: number;
      pro: number;
      enterprise: number;
      newThisMonth: number;
    };
    usage: {
      totalQueries: number;
      totalLimits: number;
      utilizationRate: number;
    };
    revenue: {
      monthly: number;
      annual: number;
      averageRevenuePerUser: number;
    };
    system: {
      status: string;
      uptime: string;
      responseTime: string;
      errorRate: string;
    };
  };
  alerts: Alert[];
  timestamp: string;
}

interface Alert {
  type: 'ERROR' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  count?: number;
}

interface Agent {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ERROR';
  autonomy: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  lastAction?: string;
  decisionCount: number;
  memorySize: number;
  capabilities: string[];
}

interface AgentSystemStatus {
  orchestrator: {
    isRunning: boolean;
    agentCount: number;
    messageQueueSize: number;
    decisionQueueSize: number;
    stats: {
      messagesProcessed: number;
      decisionsMade: number;
      agentsCoordinated: number;
      humanOverrides: number;
      errors: number;
    };
  };
  agents: Agent[];
  systemHealth: {
    status: string;
    score: number;
    activeAgents: number;
    errorAgents: number;
    totalAgents: number;
  };
  timestamp: string;
}

export const AdminDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'users' | 'analytics' | 'settings'>('overview');
  const [systemOverview, setSystemOverview] = useState<SystemOverview | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentSystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.subscription_tier !== 'enterprise') {
      setError('Admin access required. Please upgrade to Enterprise tier.');
      setLoading(false);
      return;
    }

    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [profile]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load system overview
      const overviewResponse = await fetch(`${BACKEND_CONFIG.BASE_URL}/api/admin/overview`, {
        headers: {
          'Authorization': `Bearer ${(await getAuthToken())}`,
          'Content-Type': 'application/json'
        }
      });

      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json();
        setSystemOverview(overviewData);
      }

      // Load agent status
      const agentResponse = await fetch(`${BACKEND_CONFIG.BASE_URL}/api/agents/status`, {
        headers: {
          'Authorization': `Bearer ${(await getAuthToken())}`,
          'Content-Type': 'application/json'
        }
      });

      if (agentResponse.ok) {
        const agentData = await agentResponse.json();
        setAgentStatus(agentData);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getAuthToken = async (): Promise<string> => {
    // Get auth token from Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!
    );

    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
      case 'ACTIVE':
        return 'text-green-600 bg-green-100';
      case 'WARNING':
      case 'PAUSED':
        return 'text-yellow-600 bg-yellow-100';
      case 'CRITICAL':
      case 'ERROR':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'ERROR':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Eye className="w-5 h-5 text-blue-500" />;
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {systemOverview?.metrics.users.total || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CreditCard className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">MRR</p>
              <p className="text-2xl font-bold text-gray-900">
                ${systemOverview?.metrics.revenue.monthly || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Usage Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {systemOverview?.metrics.usage.utilizationRate || 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Bot className="w-8 h-8 text-indigo-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Agents</p>
              <p className="text-2xl font-bold text-gray-900">
                {agentStatus?.systemHealth.activeAgents || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Health & Agents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Status</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(systemOverview?.metrics.system.status || 'UNKNOWN')}`}>
                {systemOverview?.metrics.system.status || 'UNKNOWN'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Uptime</span>
              <span className="text-sm font-medium">{systemOverview?.metrics.system.uptime || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Response Time</span>
              <span className="text-sm font-medium">{systemOverview?.metrics.system.responseTime || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Error Rate</span>
              <span className="text-sm font-medium">{systemOverview?.metrics.system.errorRate || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Agent Status</h3>
          <div className="space-y-3">
            {agentStatus?.agents.map((agent) => (
              <div key={agent.id} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{agent.name}</span>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                    {agent.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {agent.confidence.toFixed(2)}%
                  </span>
                </div>
              </div>
            )) || (
              <p className="text-sm text-gray-500">No agents registered</p>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Alerts</h3>
        <div className="space-y-3">
          {systemOverview?.alerts.map((alert, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              {getAlertIcon(alert.type)}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    alert.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                    alert.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {alert.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
              </div>
            </div>
          )) || (
            <p className="text-sm text-gray-500">No alerts at this time</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderAgentsTab = () => (
    <div className="space-y-6">
      {/* Agent Control Panel */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Agent Control Center</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agentStatus?.agents.map((agent) => (
            <div key={agent.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{agent.name}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                  {agent.status}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Autonomy:</span>
                  <span className="font-medium">{agent.autonomy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Confidence:</span>
                  <span className="font-medium">{(agent.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Decisions:</span>
                  <span className="font-medium">{agent.decisionCount}</span>
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                <button className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600">
                  Start
                </button>
                <button className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">
                  Stop
                </button>
                <button className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
                  Message
                </button>
              </div>
            </div>
          )) || (
            <p className="text-gray-500">No agents registered</p>
          )}
        </div>
      </div>

      {/* Agent Performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Agent Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {agentStatus?.orchestrator.stats.decisionsMade || 0}
            </div>
            <div className="text-sm text-gray-600">Decisions Made</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {agentStatus?.orchestrator.stats.messagesProcessed || 0}
            </div>
            <div className="text-sm text-gray-600">Messages Processed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {agentStatus?.systemHealth.score || 0}%
            </div>
            <div className="text-sm text-gray-600">System Health</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsersTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">User Management</h3>
        <p className="text-gray-600">User management interface coming soon...</p>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Analytics Dashboard</h3>
        <p className="text-gray-600">Advanced analytics interface coming soon...</p>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Emergency Stop All Agents</span>
            <button className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600">
              Emergency Stop
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Human Approval Required</span>
            <input type="checkbox" className="rounded" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Debug Mode</span>
            <input type="checkbox" className="rounded" />
          </div>
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🤖 Agentic Admin Dashboard</h1>
              <p className="text-gray-600">AI-Powered SaaS Management</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Welcome back</p>
                <p className="font-medium text-gray-900">{user?.email}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                <UserCog className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'agents', label: 'AI Agents', icon: Bot },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'agents' && renderAgentsTab()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </div>
    </div>
  );
};

export default AdminDashboard;


import React, { useState } from 'react';
import { User, Settings, LogOut, CreditCard, BarChart3, Crown, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface UserProfileProps {
  onClose?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const { user, profile, signOut, loading } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'free':
        return <Zap className="w-4 h-4 text-blue-500" />;
      case 'pro':
        return <BarChart3 className="w-4 h-4 text-green-500" />;
      case 'enterprise':
        return <Crown className="w-4 h-4 text-purple-500" />;
      default:
        return <Zap className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pro':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'enterprise':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const usagePercentage = (profile.query_count / profile.query_limit) * 100;
  const remainingQueries = Math.max(0, profile.query_limit - profile.query_count);

  const handleSignOut = async () => {
    await signOut();
    onClose?.();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{user.email}</h3>
            <p className="text-sm text-gray-500">Member since {new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Subscription Tier */}
      <div className={`p-3 rounded-lg border mb-4 ${getTierColor(profile.subscription_tier)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getTierIcon(profile.subscription_tier)}
            <span className="font-medium capitalize">{profile.subscription_tier} Tier</span>
          </div>
          {profile.subscription_tier === 'free' && (
            <button className="text-xs bg-white px-2 py-1 rounded border hover:bg-gray-50 transition-colors">
              Upgrade
            </button>
          )}
        </div>
        <p className="text-xs mt-1 opacity-80">
          {profile.subscription_tier === 'free' && '10 queries/month • Upgrade for unlimited access'}
          {profile.subscription_tier === 'pro' && '500 queries/month • Advanced features'}
          {profile.subscription_tier === 'enterprise' && 'Unlimited queries • Premium support'}
        </p>
      </div>

      {/* Usage Stats */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">Monthly Usage</h4>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              usagePercentage > 90 ? 'bg-red-500' :
              usagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>

        {/* Usage Details */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">
            {profile.query_count} / {profile.query_limit} queries used
          </span>
          <span className={`font-medium ${
            usagePercentage > 90 ? 'text-red-600' :
            usagePercentage > 70 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {remainingQueries} remaining
          </span>
        </div>

        {/* Warning for low usage */}
        {usagePercentage > 80 && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            ⚠️ You're running low on queries. {profile.subscription_tier === 'free' ? 'Upgrade to Pro for more queries.' : 'Contact support for more information.'}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-center px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Settings className="w-4 h-4 mr-2" />
          Account Settings
        </button>

        {profile.subscription_tier !== 'enterprise' && (
          <button className="w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors">
            <CreditCard className="w-4 h-4 mr-2" />
            {profile.subscription_tier === 'free' ? 'Upgrade to Pro' : 'Upgrade to Enterprise'}
          </button>
        )}

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Preferences</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Email notifications</span>
              <input
                type="checkbox"
                checked={profile.preferences?.notificationSettings?.emailAlerts || false}
                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                readOnly
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Theme</span>
              <span className="text-sm text-gray-500 capitalize">
                {profile.preferences?.theme || 'dark'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


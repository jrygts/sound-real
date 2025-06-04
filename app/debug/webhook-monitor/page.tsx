'use client';

import { useState, useEffect } from 'react';

interface WebhookEvent {
  id: string;
  type: string;
  created: string;
  livemode: boolean;
  analysis: string[];
  data: any;
  previous_attributes?: any;
}

interface StripeAnalysis {
  total_events: number;
  event_types: string[];
  test_mode: boolean;
  subscription_updates: number;
  recent_invoice_payments: number;
  zero_amount_payments: number;
}

export default function WebhookMonitor() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [userId, setUserId] = useState('');
  const [hours, setHours] = useState(2);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [analysis, setAnalysis] = useState<StripeAnalysis | null>(null);
  const [error, setError] = useState<string>('');

  const fetchEvents = async () => {
    if (!userId) {
      setError('Please enter a user ID');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/debug/stripe-events?userId=${userId}&hours=${hours}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch events');
      }
      
      if (data.success) {
        setEvents(data.events || []);
        setUserInfo(data.user);
        setAnalysis(data.analysis);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setError(error.message);
      setEvents([]);
      setUserInfo(null);
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoRefresh && userId) {
      const interval = setInterval(fetchEvents, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, userId, hours]);

  const getEventBadgeColor = (eventType: string) => {
    if (eventType.includes('subscription.updated')) return 'bg-blue-100 text-blue-700';
    if (eventType.includes('payment_succeeded')) return 'bg-green-100 text-green-700';
    if (eventType.includes('invoice')) return 'bg-yellow-100 text-yellow-700';
    if (eventType.includes('customer')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getAnalysisBadgeColor = (analysis: string) => {
    if (analysis.includes('PLAN CHANGE')) return 'bg-orange-100 text-orange-700';
    if (analysis.includes('BILLING PERIOD')) return 'bg-blue-100 text-blue-700';
    if (analysis.includes('PAYMENT')) return 'bg-green-100 text-green-700';
    if (analysis.includes('STATUS')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🔬 Stripe Webhook Event Monitor</h1>
        <p className="text-gray-600">Real-time monitoring of Stripe events for billing diagnostics</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">User ID:</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter user ID to monitor"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hours to fetch:</label>
            <select
              value={hours}
              onChange={(e) => setHours(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>Last 1 hour</option>
              <option value={2}>Last 2 hours</option>
              <option value={6}>Last 6 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={72}>Last 3 days</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={fetchEvents}
              disabled={!userId || loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mr-3"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Loading...
                </div>
              ) : (
                'Fetch Events'
              )}
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto-refresh every 5 seconds</span>
          </label>
          
          {autoRefresh && (
            <div className="flex items-center text-green-600 text-sm">
              <div className="animate-pulse h-2 w-2 bg-green-500 rounded-full mr-2"></div>
              Live monitoring active
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-red-500 mr-2">❌</div>
            <div className="text-red-700">{error}</div>
          </div>
        </div>
      )}

      {userInfo && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">User Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Email:</span>
              <div className="text-gray-900">{userInfo.email}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Plan:</span>
              <div className="text-gray-900">{userInfo.plan_type}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Usage:</span>
              <div className="text-gray-900">{userInfo.words_used?.toLocaleString()} / {userInfo.words_limit?.toLocaleString()} words</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Customer ID:</span>
              <div className="text-gray-900 font-mono text-xs">{userInfo.stripe_customer_id}</div>
            </div>
          </div>
        </div>
      )}

      {analysis && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Event Analysis</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{analysis.total_events}</div>
              <div className="text-gray-600">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{analysis.subscription_updates}</div>
              <div className="text-gray-600">Subscription Updates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{analysis.recent_invoice_payments}</div>
              <div className="text-gray-600">Invoice Payments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{analysis.zero_amount_payments}</div>
              <div className="text-gray-600">$0 Payments</div>
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              analysis.test_mode ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
            }`}>
              {analysis.test_mode ? '🧪 TEST MODE' : '🔴 LIVE MODE'}
            </div>
            
            <div className="text-sm text-gray-600">
              Event types: {analysis.event_types.join(', ')}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Events ({events.length})</h2>
        
        {events.length === 0 && userId && !loading && !error && (
          <div className="text-center text-gray-600 py-12 bg-white rounded-lg border">
            <div className="text-4xl mb-4">📭</div>
            <p>No events found for this user in the selected time period.</p>
            <p className="text-sm mt-2">Try expanding the time range or check if the user ID is correct.</p>
          </div>
        )}

        {events.map((event) => (
          <div key={event.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-medium ${getEventBadgeColor(event.type)}`}>
                  {event.type}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  event.livemode ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {event.livemode ? 'LIVE' : 'TEST'}
                </span>
              </div>
              <span className="text-sm text-gray-500">{new Date(event.created).toLocaleString()}</span>
            </div>
            
            {event.analysis && event.analysis.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {event.analysis.map((item, idx) => (
                  <span key={idx} className={`px-2 py-1 rounded text-xs font-medium ${getAnalysisBadgeColor(item)}`}>
                    {item}
                  </span>
                ))}
              </div>
            )}
            
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 select-none">
                🔍 View Event Data & Previous Attributes
              </summary>
              <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Event Data:</h4>
                  <pre className="p-3 bg-gray-50 rounded text-xs overflow-auto max-h-64 border">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </div>
                {event.previous_attributes && Object.keys(event.previous_attributes).length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Previous Attributes:</h4>
                    <pre className="p-3 bg-gray-50 rounded text-xs overflow-auto max-h-64 border">
                      {JSON.stringify(event.previous_attributes, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          </div>
        ))}
      </div>
      
      {!userId && !loading && (
        <div className="text-center text-gray-600 py-12">
          <div className="text-4xl mb-4">🔬</div>
          <p>Enter a user ID above to start monitoring their Stripe events.</p>
          <p className="text-sm mt-2">This tool helps diagnose billing and webhook issues in real-time.</p>
        </div>
      )}
    </div>
  );
} 
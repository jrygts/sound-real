'use client';

import { useState } from 'react';

interface PlanAnalysis {
  success: boolean;
  user: any;
  current_state: any;
  proposed_change: any;
  billing_period: any;
  preview_invoice: any;
  analysis: any;
  errors: any;
  planName?: string;
}

export default function PlanTester() {
  const [userId, setUserId] = useState('');
  const [analysis, setAnalysis] = useState<PlanAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const testPlanChange = async (newPriceId: string, planName: string) => {
    if (!userId) {
      setError('Please enter a user ID');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/debug/plan-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          newPriceId,
          currentUsage: 'Test analysis'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to analyze ${planName} plan change`);
      }
      
      setAnalysis({ ...data, planName });
    } catch (error) {
      console.error('Failed to test plan change:', error);
      setError(error.message);
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const getPlanButtonColor = (planName: string) => {
    switch (planName) {
      case 'Basic': return 'bg-green-600 hover:bg-green-700';
      case 'Plus': return 'bg-blue-600 hover:bg-blue-700';
      case 'Ultra': return 'bg-purple-600 hover:bg-purple-700';
      default: return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    if (recommendation.includes('⚠️')) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    if (recommendation.includes('💰')) return 'text-blue-700 bg-blue-50 border-blue-200';
    if (recommendation.includes('💳')) return 'text-green-700 bg-green-50 border-green-200';
    return 'text-gray-700 bg-gray-50 border-gray-200';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🧪 Plan Change Tester</h1>
        <p className="text-gray-600">Analyze what happens when switching between subscription plans</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Configuration</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">User ID:</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter user ID to test"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => testPlanChange('price_1RWIGTR2giDQL8gT2b4fgQeD', 'Basic')}
            disabled={!userId || loading}
            className={`${getPlanButtonColor('Basic')} text-white px-6 py-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          >
            <div className="text-center">
              <div className="font-semibold">Test Switch to Basic</div>
              <div className="text-sm opacity-90">$6.99/month • 5,000 words</div>
            </div>
          </button>
          
          <button
            onClick={() => testPlanChange('price_1RWIH9R2giDQL8gTtQ0SIOlM', 'Plus')}
            disabled={!userId || loading}
            className={`${getPlanButtonColor('Plus')} text-white px-6 py-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          >
            <div className="text-center">
              <div className="font-semibold">Test Switch to Plus</div>
              <div className="text-sm opacity-90">$19.99/month • 15,000 words</div>
            </div>
          </button>
          
          <button
            onClick={() => testPlanChange('price_1RWIHvR2giDQL8gTI17qjZmD', 'Ultra')}
            disabled={!userId || loading}
            className={`${getPlanButtonColor('Ultra')} text-white px-6 py-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          >
            <div className="text-center">
              <div className="font-semibold">Test Switch to Ultra</div>
              <div className="text-sm opacity-90">$39.99/month • 35,000 words</div>
            </div>
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing plan change...</p>
          <p className="text-sm text-gray-500 mt-1">This may take a few seconds</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-red-500 mr-2">❌</div>
            <div className="text-red-700">{error}</div>
          </div>
        </div>
      )}

      {analysis && analysis.success && (
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">📊</span>
              Analysis: Switch to {analysis.planName}
            </h2>
            
            {/* User Information */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Current User State</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <div className="text-gray-900">{analysis.user?.email}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Current Plan:</span>
                  <div className="text-gray-900">{analysis.user?.current_plan}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Usage:</span>
                  <div className="text-gray-900">{analysis.user?.words_used?.toLocaleString()} / {analysis.user?.words_limit?.toLocaleString()} words</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Test Mode:</span>
                  <div className={`text-sm font-medium ${analysis.current_state?.test_mode ? 'text-yellow-600' : 'text-green-600'}`}>
                    {analysis.current_state?.test_mode ? '🧪 TEST' : '🔴 LIVE'}
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold mb-3 text-gray-700">Current State</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Plan:</span>
                    <span className="font-medium">{analysis.current_state?.current_plan_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price:</span>
                    <span className="font-medium">${(analysis.current_state?.current_amount || 0) / 100}/month</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Period Start:</span>
                    <span className="font-mono text-xs">{analysis.current_state?.current_period_start && new Date(analysis.current_state.current_period_start).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Period End:</span>
                    <span className="font-mono text-xs">{analysis.current_state?.current_period_end && new Date(analysis.current_state.current_period_end).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3 text-gray-700">Proposed Change</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>New Plan:</span>
                    <span className="font-medium">{analysis.proposed_change?.new_plan_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New Price:</span>
                    <span className="font-medium">${(analysis.proposed_change?.new_amount || 0) / 100}/month</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Difference:</span>
                    <span className={`font-medium ${
                      analysis.proposed_change?.price_difference > 0 ? 'text-green-600' : 
                      analysis.proposed_change?.price_difference < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {analysis.proposed_change?.price_difference_formatted}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>New Word Limit:</span>
                    <span className="font-medium">{analysis.proposed_change?.new_words_limit?.toLocaleString()} words</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Period Info */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2 text-blue-800">Billing Period Analysis</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Period Length:</span>
                  <div className="font-medium">{analysis.billing_period?.period_length_days} days</div>
                </div>
                <div>
                  <span className="text-blue-700">Time Elapsed:</span>
                  <div className="font-medium">{analysis.billing_period?.percent_elapsed}%</div>
                </div>
                <div>
                  <span className="text-blue-700">Days Remaining:</span>
                  <div className="font-medium">{analysis.billing_period?.days_remaining} days</div>
                </div>
                <div>
                  <span className="text-blue-700">Hours Remaining:</span>
                  <div className="font-medium">{analysis.billing_period?.time_remaining_hours} hours</div>
                </div>
              </div>
            </div>

            {/* Analysis Results */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Financial Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className={`p-3 rounded-lg ${
                  analysis.analysis?.is_upgrade ? 'bg-green-50 border border-green-200' :
                  analysis.analysis?.is_downgrade ? 'bg-red-50 border border-red-200' :
                  'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="font-medium">Change Type</div>
                  <div className={`${
                    analysis.analysis?.is_upgrade ? 'text-green-700' :
                    analysis.analysis?.is_downgrade ? 'text-red-700' :
                    'text-gray-700'
                  }`}>
                    {analysis.analysis?.is_upgrade ? '📈 Upgrade' :
                     analysis.analysis?.is_downgrade ? '📉 Downgrade' :
                     analysis.analysis?.is_same_price ? '↔️ Same Price' : '❓ Unknown'}
                  </div>
                </div>
                
                <div className={`p-3 rounded-lg ${
                  analysis.analysis?.will_charge_immediately ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'
                }`}>
                  <div className="font-medium">Immediate Charge</div>
                  <div className={analysis.analysis?.will_charge_immediately ? 'text-yellow-700' : 'text-green-700'}>
                    {analysis.analysis?.will_charge_immediately ? '💳 Yes' : '✅ No'}
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="font-medium">Usage Reset</div>
                  <div className="text-blue-700">
                    {analysis.analysis?.usage_reset_expected ? '🔄 Yes' : '✅ Preserved'}
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            {analysis.analysis?.recommendation && (
              <div className={`p-4 rounded-lg border ${getRecommendationColor(analysis.analysis.recommendation)}`}>
                <h3 className="font-semibold mb-2">Recommendation</h3>
                <p>{analysis.analysis.recommendation}</p>
                {analysis.analysis?.expected_behavior && (
                  <p className="mt-2 text-sm opacity-80">{analysis.analysis.expected_behavior}</p>
                )}
              </div>
            )}

            {/* Invoice Preview */}
            {analysis.preview_invoice && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">Invoice Preview</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-600">Amount Due:</span>
                      <div className="font-bold text-lg">{analysis.preview_invoice.amount_due_formatted}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Subtotal:</span>
                      <div className="font-medium">${(analysis.preview_invoice.subtotal || 0) / 100}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Tax:</span>
                      <div className="font-medium">${(analysis.preview_invoice.tax || 0) / 100}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <div className="font-medium">${(analysis.preview_invoice.total || 0) / 100}</div>
                    </div>
                  </div>
                  
                  {analysis.preview_invoice.lines && analysis.preview_invoice.lines.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Invoice Line Items:</h4>
                      <div className="space-y-2">
                        {analysis.preview_invoice.lines.map((line: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded">
                            <div>
                              <div className="font-medium">{line.description}</div>
                              {line.period && (
                                <div className="text-xs text-gray-500">
                                  {new Date(line.period.start).toLocaleDateString()} - {new Date(line.period.end).toLocaleDateString()}
                                </div>
                              )}
                              {line.proration && (
                                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded mt-1">
                                  Prorated
                                </span>
                              )}
                            </div>
                            <div className="font-medium">{line.amount_formatted}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Expected Webhook Events */}
            {analysis.analysis?.webhook_events_expected && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">Expected Webhook Events</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.analysis.webhook_events_expected.map((event: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-mono">
                      {event}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {analysis.errors?.preview_error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-2">Preview Error</h3>
                <p className="text-red-700 text-sm">{analysis.errors.preview_error}</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {!userId && !loading && (
        <div className="text-center text-gray-600 py-12 bg-white rounded-lg border">
          <div className="text-4xl mb-4">🧪</div>
          <p>Enter a user ID above to test plan change scenarios.</p>
          <p className="text-sm mt-2">This tool analyzes billing behavior without making actual changes.</p>
        </div>
      )}
    </div>
  );
} 
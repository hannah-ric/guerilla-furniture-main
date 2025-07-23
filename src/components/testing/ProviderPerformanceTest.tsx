import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { providerComparisonService, ProviderComparisonResult } from '@/services/api/providerComparison';
import { Loader2, Zap, DollarSign, Clock } from 'lucide-react';

export function ProviderPerformanceTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ProviderComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testMessages = [
    "I want to build a simple wooden coffee table",
    "Design a bookshelf that is 6 feet tall and 3 feet wide",
    "Create a dining table for 6 people using oak wood",
    "I need a desk with storage for a home office"
  ];

  const runPerformanceTest = async () => {
    setIsRunning(true);
    setError(null);
    
    try {
      const testMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
      const result = await providerComparisonService.compareProviders(
        testMessage,
        undefined,
        "You are Blueprint Buddy, a helpful AI assistant for furniture design."
      );
      
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Performance test failed');
    } finally {
      setIsRunning(false);
    }
  };

  const formatTime = (ms: number) => `${ms}ms`;
  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          AI Provider Performance Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runPerformanceTest} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Performance Test...
            </>
          ) : (
            'Run Performance Test'
          )}
        </Button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {results && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(results.results).map(([provider, result]: [string, any]) => (
                <Card key={provider} className={result.error ? 'border-red-200' : 'border-green-200'}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg capitalize">{provider}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {result.error ? (
                      <p className="text-red-600">Error: {result.error}</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Response Time: {formatTime(result.responseTime)}</span>
                        </div>
                        {result.cost && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span>Cost: {formatCost(result.cost)}</span>
                          </div>
                        )}
                        {result.usage && (
                          <div className="text-sm text-gray-600">
                            Tokens: {result.usage.total_tokens || (result.usage.input_tokens + result.usage.output_tokens)}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Total Test Time:</strong> {formatTime(results.totalTime)}</p>
                  {results.comparison.fastest && (
                    <p><strong>Fastest Provider:</strong> {results.comparison.fastest}</p>
                  )}
                  {results.comparison.cheapest && (
                    <p><strong>Most Cost-Effective:</strong> {results.comparison.cheapest}</p>
                  )}
                  {results.comparison.recommendations.length > 0 && (
                    <div>
                      <strong>Recommendations:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {results.comparison.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

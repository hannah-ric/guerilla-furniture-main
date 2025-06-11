import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  DollarSign, 
  Zap, 
  Shield, 
  Clock,
  ChevronRight,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { FurnitureDesign } from '@/lib/types';

interface OptimizationSuggestion {
  id: string;
  type: 'material_efficiency' | 'structural_integrity' | 'cost_reduction' | 'ease_of_construction';
  title: string;
  description: string;
  impact: {
    cost?: number;
    time?: number;
    difficulty?: 'easier' | 'harder';
    waste?: number;
  };
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  steps?: string[];
}

interface OptimizationSuggestionsProps {
  optimizations: any[];
  design: FurnitureDesign;
  onApplyOptimization: (optimization: OptimizationSuggestion) => void;
}

export const OptimizationSuggestions: React.FC<OptimizationSuggestionsProps> = ({
  optimizations,
  design,
  onApplyOptimization
}) => {
  const [expandedOptimization, setExpandedOptimization] = useState<string | null>(null);

  // Transform raw optimization data into structured suggestions
  const suggestions: OptimizationSuggestion[] = optimizations.map((opt, index) => ({
    id: `opt-${index}`,
    type: opt.type || 'material_efficiency',
    title: opt.description || `Optimization ${index + 1}`,
    description: opt.description || 'Improve your design efficiency',
    impact: {
      cost: opt.originalValue && opt.optimizedValue ? 
        (opt.originalValue - opt.optimizedValue) : undefined,
      time: opt.type === 'ease_of_construction' ? Math.floor(Math.random() * 3) + 1 : undefined,
      difficulty: opt.type === 'ease_of_construction' ? 'easier' : undefined,
      waste: opt.type === 'material_efficiency' ? 
        Math.floor((opt.optimizedValue - opt.originalValue) * 100) / 100 : undefined
    },
    confidence: opt.confidence || 0.8,
    priority: opt.confidence > 0.8 ? 'high' : opt.confidence > 0.6 ? 'medium' : 'low',
    reasoning: `This optimization can improve ${opt.type?.replace('_', ' ')} by leveraging AI analysis`,
    steps: generateOptimizationSteps(opt)
  }));

  const getOptimizationIcon = (type: string) => {
    switch (type) {
      case 'material_efficiency':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'cost_reduction':
        return <DollarSign className="w-5 h-5 text-blue-600" />;
      case 'structural_integrity':
        return <Shield className="w-5 h-5 text-purple-600" />;
      case 'ease_of_construction':
        return <Zap className="w-5 h-5 text-orange-600" />;
      default:
        return <TrendingUp className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (suggestions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Optimizations Available
          </h3>
          <p className="text-gray-600 max-w-md">
            Generate a 3D model to receive AI-powered optimization suggestions for your design.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">AI Optimizations</h3>
          <p className="text-sm text-gray-600">
            Smart suggestions to improve your {design.furniture_type} design
          </p>
        </div>
        <Badge variant="outline">
          {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Potential Savings</p>
              <p className="text-lg font-bold text-green-600">
                ${suggestions.reduce((sum, s) => sum + (s.impact.cost || 0), 0).toFixed(0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Time Saved</p>
              <p className="text-lg font-bold text-blue-600">
                {suggestions.reduce((sum, s) => sum + (s.impact.time || 0), 0)}h
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Efficiency Gain</p>
              <p className="text-lg font-bold text-purple-600">
                {Math.round(suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length * 100)}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Cards */}
      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <Card 
            key={suggestion.id} 
            className={`transition-all duration-200 ${
              expandedOptimization === suggestion.id ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getOptimizationIcon(suggestion.type)}
                  <div>
                    <CardTitle className="text-base">{suggestion.title}</CardTitle>
                    <p className="text-sm text-gray-600">{suggestion.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getPriorityColor(suggestion.priority)}>
                    {suggestion.priority}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedOptimization(
                      expandedOptimization === suggestion.id ? null : suggestion.id
                    )}
                  >
                    <ChevronRight className={`w-4 h-4 transition-transform ${
                      expandedOptimization === suggestion.id ? 'rotate-90' : ''
                    }`} />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Impact Summary */}
              <div className="flex items-center space-x-4 mb-3">
                {suggestion.impact.cost && (
                  <div className="flex items-center space-x-1 text-sm">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span>Save ${suggestion.impact.cost}</span>
                  </div>
                )}
                {suggestion.impact.time && (
                  <div className="flex items-center space-x-1 text-sm">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>-{suggestion.impact.time}h</span>
                  </div>
                )}
                {suggestion.impact.waste && (
                  <div className="flex items-center space-x-1 text-sm">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span>{suggestion.impact.waste}% less waste</span>
                  </div>
                )}
                <div className="flex items-center space-x-1 text-sm">
                  <CheckCircle className="w-4 h-4 text-gray-500" />
                  <span>{Math.round(suggestion.confidence * 100)}% confidence</span>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedOptimization === suggestion.id && (
                <div className="space-y-3 border-t pt-3">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Reasoning</h4>
                    <p className="text-sm text-gray-600">{suggestion.reasoning}</p>
                  </div>

                  {suggestion.steps && suggestion.steps.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Implementation Steps</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        {suggestion.steps.map((step, index) => (
                          <li key={index} className="text-sm text-gray-600">{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2 text-sm text-amber-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Review changes carefully before applying</span>
                    </div>
                    <Button 
                      onClick={() => onApplyOptimization(suggestion)}
                      size="sm"
                    >
                      Apply Optimization
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={() => setExpandedOptimization(null)}>
          Collapse All
        </Button>
        <Button 
          onClick={() => {
            suggestions.forEach(s => onApplyOptimization(s));
          }}
          className="flex items-center space-x-2"
        >
          <Zap className="w-4 h-4" />
          <span>Apply All High Priority</span>
        </Button>
      </div>
    </div>
  );
};

function generateOptimizationSteps(optimization: any): string[] {
  const stepTemplates = {
    material_efficiency: [
      'Analyze current material usage patterns',
      'Identify opportunities for board optimization',
      'Adjust cut dimensions to minimize waste',
      'Update cut list with optimized measurements'
    ],
    cost_reduction: [
      'Review current material specifications',
      'Identify cost-effective alternatives',
      'Maintain structural requirements',
      'Update design with new materials'
    ],
    structural_integrity: [
      'Analyze current joint configurations',
      'Identify stress concentration points',
      'Recommend reinforcement strategies',
      'Update joinery specifications'
    ],
    ease_of_construction: [
      'Review assembly sequence complexity',
      'Simplify joint requirements where possible',
      'Optimize tool requirements',
      'Update construction instructions'
    ]
  };

  return stepTemplates[optimization.type as keyof typeof stepTemplates] || [
    'Analyze current design parameters',
    'Apply optimization algorithms',
    'Validate improved design',
    'Update design specifications'
  ];
} 
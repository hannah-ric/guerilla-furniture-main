import React, { useState, useCallback, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Ruler, 
  Palette, 
  Wrench, 
  Zap, 
  RotateCw, 
  AlertTriangle,
  Info,
  Lock,
  Unlock
} from 'lucide-react';
import { FurnitureDesign } from '@/lib/types';
import { DIMENSIONS, MATERIALS } from '@/lib/constants';

interface ParametricControlPanelProps {
  design: FurnitureDesign;
  onParameterChange: (parameterName: string, newValue: any) => void;
  realTimeMode: boolean;
  isGenerating: boolean;
}

interface ParameterGroup {
  name: string;
  icon: React.ComponentType<any>;
  parameters: Parameter[];
}

interface Parameter {
  name: string;
  displayName: string;
  type: 'slider' | 'select' | 'input' | 'toggle';
  value: any;
  constraints: {
    min?: number;
    max?: number;
    step?: number;
    options?: string[];
    unit?: string;
  };
  locked?: boolean;
  dependsOn?: string[];
  impact: 'high' | 'medium' | 'low';
  description: string;
}

export const ParametricControlPanel: React.FC<ParametricControlPanelProps> = ({
  design,
  onParameterChange,
  realTimeMode,
  isGenerating
}) => {
  const [parameterGroups, setParameterGroups] = useState<ParameterGroup[]>([]);
  const [lockedParameters, setLockedParameters] = useState<Set<string>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    const groups = buildParameterGroups(design);
    setParameterGroups(groups);
  }, [design]);

  const buildParameterGroups = (design: FurnitureDesign): ParameterGroup[] => {
    const groups: ParameterGroup[] = [];

    // Dimensions Group
    if (design.dimensions) {
      groups.push({
        name: 'Dimensions',
        icon: Ruler,
        parameters: [
          {
            name: 'overall_width',
            displayName: 'Width',
            type: 'slider',
            value: design.dimensions.width,
            constraints: { 
              min: DIMENSIONS.MIN.WIDTH, 
              max: DIMENSIONS.MAX.WIDTH, 
              step: 0.5,
              unit: 'inches'
            },
            impact: 'high',
            description: 'Overall width of the furniture piece'
          },
          {
            name: 'overall_height',
            displayName: 'Height',
            type: 'slider',
            value: design.dimensions.height,
            constraints: { 
              min: DIMENSIONS.MIN.HEIGHT, 
              max: DIMENSIONS.MAX.HEIGHT, 
              step: 0.5,
              unit: 'inches'
            },
            impact: 'high',
            description: 'Overall height of the furniture piece'
          },
          {
            name: 'overall_depth',
            displayName: 'Depth',
            type: 'slider',
            value: design.dimensions.depth,
            constraints: { 
              min: DIMENSIONS.MIN.DEPTH, 
              max: DIMENSIONS.MAX.DEPTH, 
              step: 0.5,
              unit: 'inches'
            },
            impact: 'high',
            description: 'Overall depth of the furniture piece'
          }
        ]
      });
    }

    // Material Group
    if (design.materials && design.materials.length > 0) {
      const primaryMaterial = design.materials[0];
      groups.push({
        name: 'Materials',
        icon: Palette,
        parameters: [
          {
            name: 'primary_material',
            displayName: 'Primary Material',
            type: 'select',
            value: primaryMaterial.type,
            constraints: {
              options: ['pine', 'oak', 'maple', 'cherry', 'walnut', 'plywood', 'mdf']
            },
            impact: 'medium',
            description: 'Main material for construction'
          },
          // Additional material parameters could be added here
        ]
      });
    }

    // Construction Group
    if (design.joinery && design.joinery.length > 0) {
      groups.push({
        name: 'Construction',
        icon: Wrench,
        parameters: [
          {
            name: 'joinery_method',
            displayName: 'Primary Joinery',
            type: 'select',
              value: design.joinery[0].type,
            constraints: {
              options: ['pocket_screw', 'mortise_tenon', 'dowel', 'dado', 'biscuit', 'dovetail']
            },
            impact: 'high',
            description: 'Main method for joining components'
          },
          {
            name: 'edge_treatment',
            displayName: 'Edge Treatment',
            type: 'select',
            value: 'rounded',
            constraints: {
              options: ['square', 'rounded', 'beveled', 'chamfered']
            },
            impact: 'low',
            description: 'How edges are finished'
          },
          {
            name: 'reinforcement_level',
            displayName: 'Reinforcement',
            type: 'select',
            value: 'standard',
            constraints: {
              options: ['minimal', 'standard', 'heavy_duty']
            },
            impact: 'medium',
            description: 'Level of structural reinforcement'
          }
        ]
      });
    }

    // Style Group
    groups.push({
      name: 'Style',
      icon: Palette,
      parameters: [
        {
          name: 'design_style',
          displayName: 'Design Style',
          type: 'select',
          value: design.style || 'modern',
          constraints: {
            options: ['modern', 'traditional', 'rustic', 'industrial', 'minimalist', 'farmhouse']
          },
          impact: 'medium',
          description: 'Overall aesthetic style'
        },
        {
          name: 'leg_style',
          displayName: 'Leg Style',
          type: 'select',
          value: 'straight',
          constraints: {
            options: ['straight', 'tapered', 'turned', 'hairpin', 'trestle']
          },
          impact: 'medium',
          description: 'Style of legs or supports'
        },
        {
          name: 'corner_radius',
          displayName: 'Corner Radius',
          type: 'slider',
          value: 0.25,
          constraints: { min: 0, max: 2, step: 0.125, unit: 'inches' },
          impact: 'low',
          description: 'Roundness of corners'
        }
      ]
    });

    return groups;
  };

  const handleParameterChange = useCallback((parameterName: string, newValue: any) => {
    if (lockedParameters.has(parameterName)) {
      return;
    }

    if (realTimeMode) {
      onParameterChange(parameterName, newValue);
    } else {
      setPendingChanges(prev => new Map(prev.set(parameterName, newValue)));
    }
  }, [realTimeMode, onParameterChange, lockedParameters]);

  const applyPendingChanges = useCallback(() => {
    pendingChanges.forEach((value, parameterName) => {
      onParameterChange(parameterName, value);
    });
    setPendingChanges(new Map());
  }, [pendingChanges, onParameterChange]);

  const toggleParameterLock = useCallback((parameterName: string) => {
    setLockedParameters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parameterName)) {
        newSet.delete(parameterName);
      } else {
        newSet.add(parameterName);
      }
      return newSet;
    });
  }, []);

  const renderParameter = (parameter: Parameter) => {
    const isLocked = lockedParameters.has(parameter.name);
    const hasPendingChange = pendingChanges.has(parameter.name);
    const currentValue = hasPendingChange ? pendingChanges.get(parameter.name) : parameter.value;

    const getImpactColor = (impact: string) => {
      switch (impact) {
        case 'high': return 'text-red-600';
        case 'medium': return 'text-yellow-600';
        case 'low': return 'text-green-600';
        default: return 'text-gray-600';
      }
    };

    return (
      <Card key={parameter.name} className={`workshop-card ${isLocked ? 'opacity-50' : ''} ${hasPendingChange ? 'ring-2 ring-primary' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium font-serif text-foreground">
                {parameter.displayName}
              </label>
              <Badge variant="outline" className={getImpactColor(parameter.impact)}>
                {parameter.impact}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleParameterLock(parameter.name)}
              className="p-1"
            >
              {isLocked ? (
                <Lock className="w-4 h-4 text-gray-500" />
              ) : (
                <Unlock className="w-4 h-4 text-gray-400" />
              )}
            </Button>
          </div>

          <div className="space-y-2">
            {parameter.type === 'slider' && (
              <div className="space-y-2">
                <Slider
                  value={[currentValue]}
                  onValueChange={([value]) => handleParameterChange(parameter.name, value)}
                  min={parameter.constraints.min}
                  max={parameter.constraints.max}
                  step={parameter.constraints.step}
                  disabled={isLocked || isGenerating}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{parameter.constraints.min}{parameter.constraints.unit}</span>
                  <span className="font-medium">
                    {currentValue}{parameter.constraints.unit}
                  </span>
                  <span>{parameter.constraints.max}{parameter.constraints.unit}</span>
                </div>
              </div>
            )}

            {parameter.type === 'select' && (
              <Select
                value={currentValue}
                onValueChange={(value) => handleParameterChange(parameter.name, value)}
                disabled={isLocked || isGenerating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {parameter.constraints.options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {parameter.type === 'input' && (
              <Input
                type="number"
                value={currentValue}
                onChange={(e) => handleParameterChange(parameter.name, parseFloat(e.target.value))}
                disabled={isLocked || isGenerating}
                min={parameter.constraints.min}
                max={parameter.constraints.max}
                step={parameter.constraints.step}
              />
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-2 font-serif">{parameter.description}</p>

          {parameter.dependsOn && parameter.dependsOn.length > 0 && (
            <div className="mt-2 flex items-center space-x-1">
              <Info className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-blue-600">
                Affects: {parameter.dependsOn.join(', ')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with vintage tool aesthetic */}
      <div className="flex items-center justify-between p-4 bg-wood-pine bg-blend-overlay bg-card rounded-lg border border-border">
        <h3 className="text-lg font-heading font-medium text-foreground">Craftsman's Measurements</h3>
        <div className="flex items-center space-x-2">
          {!realTimeMode && pendingChanges.size > 0 && (
            <Button
              onClick={applyPendingChanges}
              disabled={isGenerating}
              className="text-xs bg-primary hover:bg-primary/90"
            >
              <Zap className="w-4 h-4 mr-1" />
              Apply Changes ({pendingChanges.size})
            </Button>
          )}
          <Badge variant={realTimeMode ? "default" : "secondary"} className="font-serif">
            {realTimeMode ? "Live Adjustments" : "Manual Mode"}
          </Badge>
        </div>
      </div>

      {/* Warning about dependencies */}
      {lockedParameters.size > 0 && (
        <div className="bg-wood-oak bg-blend-overlay bg-accent/20 border border-accent rounded-md p-3">
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 text-accent-foreground mr-2" />
            <span className="text-sm text-accent-foreground font-serif">
              {lockedParameters.size} parameter(s) locked. Changes to related parameters may be limited.
            </span>
          </div>
        </div>
      )}

      {/* Parameter Groups */}
      <Tabs defaultValue={parameterGroups[0]?.name.toLowerCase()} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          {parameterGroups.map((group) => {
            const IconComponent = group.icon;
            return (
              <TabsTrigger 
                key={group.name} 
                value={group.name.toLowerCase()}
                className="flex items-center space-x-1"
              >
                <IconComponent className="w-4 h-4" />
                <span className="hidden sm:inline">{group.name}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {parameterGroups.map((group) => (
          <TabsContent key={group.name} value={group.name.toLowerCase()}>
            <div className="grid grid-cols-1 gap-4">
              {group.parameters.map(renderParameter)}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Quick Actions */}
      <Card className="workshop-card">
        <CardHeader>
          <CardTitle className="text-sm font-heading">Workshop Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Reset to default values
              const defaultChanges = new Map();
              parameterGroups.forEach(group => {
                group.parameters.forEach(param => {
                  if (param.name === 'overall_width') defaultChanges.set(param.name, 36);
                  if (param.name === 'overall_height') defaultChanges.set(param.name, 30);
                  if (param.name === 'overall_depth') defaultChanges.set(param.name, 18);
                });
              });
              
              if (realTimeMode) {
                defaultChanges.forEach((value, name) => onParameterChange(name, value));
              } else {
                setPendingChanges(defaultChanges);
              }
            }}
            className="w-full text-xs"
            disabled={isGenerating}
          >
            <RotateCw className="w-4 h-4 mr-1" />
            Reset to Defaults
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Apply golden ratio proportions
              const width = design.dimensions?.width || 36;
              const goldenRatio = 1.618;
              const height = width / goldenRatio;
              const depth = height / goldenRatio;
              
              const proportionalChanges = new Map([
                ['overall_height', Math.round(height * 2) / 2],
                ['overall_depth', Math.round(depth * 2) / 2]
              ]);
              
              if (realTimeMode) {
                proportionalChanges.forEach((value, name) => onParameterChange(name, value));
              } else {
                setPendingChanges(prev => {
                  const newMap = new Map(prev);
                  proportionalChanges.forEach((value, name) => newMap.set(name, value));
                  return newMap;
                });
              }
            }}
            className="w-full text-xs"
            disabled={isGenerating}
          >
            Apply Golden Ratio
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLockedParameters(new Set())}
            className="w-full text-xs"
            disabled={lockedParameters.size === 0}
          >
            <Unlock className="w-4 h-4 mr-1" />
            Unlock All Parameters
          </Button>
        </CardContent>
      </Card>

      {/* Status */}
      {isGenerating && (
        <div className="bg-wood-pine bg-blend-overlay bg-primary/20 border border-primary rounded-md p-3">
          <div className="flex items-center">
            <RotateCw className="w-4 h-4 text-primary mr-2 animate-spin" />
            <span className="text-sm text-primary font-serif">
              Crafting 3D model with new measurements...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};  
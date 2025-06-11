import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Clock, 
  Wrench, 
  DollarSign,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { FurnitureDesign } from '@/lib/types';

interface BuildDocumentation {
  cutList: any[];
  hardwareList: any[];
  stepByStepInstructions: any[];
  materialOptimization: any;
  toolRequirements: string[];
  estimatedBuildTime: number;
  skillAssessment: any;
}

interface BuildPlanViewerProps {
  documentation: BuildDocumentation | null;
  design: FurnitureDesign;
  onExport: () => void;
}

export const BuildPlanViewer: React.FC<BuildPlanViewerProps> = ({
  documentation,
  design,
  onExport
}) => {
  if (!documentation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Build Plan Available
          </h3>
          <p className="text-gray-600 max-w-md">
            Complete your 3D model generation to create a comprehensive build plan.
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
          <h3 className="text-lg font-medium text-gray-900">Build Plan</h3>
          <p className="text-sm text-gray-600">
            Complete construction guide for {design.name}
          </p>
        </div>
        <Button onClick={onExport} className="flex items-center space-x-2">
          <Download className="w-4 h-4" />
          <span>Export Plan</span>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Build Time</p>
                <p className="text-lg font-bold">{documentation.estimatedBuildTime}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Wrench className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Tools Required</p>
                <p className="text-lg font-bold">{documentation.toolRequirements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="instructions">Instructions</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Skill Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Skill Assessment</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Required Skill Level:</span>
                  <Badge variant={
                    documentation.skillAssessment?.level === 'beginner' ? 'secondary' :
                    documentation.skillAssessment?.level === 'intermediate' ? 'default' : 'destructive'
                  }>
                    {documentation.skillAssessment?.level || 'Intermediate'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Complexity Score:</span>
                  <span className="font-medium">
                    {documentation.skillAssessment?.complexityScore || 7}/10
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Material Optimization */}
          {documentation.materialOptimization && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span>Material Optimization</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Waste Reduction:</span>
                    <span className="font-medium text-green-600">
                      {documentation.materialOptimization.wasteReduction || 15}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cost Savings:</span>
                    <span className="font-medium text-green-600">
                      ${documentation.materialOptimization.costSavings || 25}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          {/* Cut List */}
          <Card>
            <CardHeader>
              <CardTitle>Cut List</CardTitle>
            </CardHeader>
            <CardContent>
              {documentation.cutList.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2 text-sm font-medium border-b pb-2">
                    <span>Part</span>
                    <span>Quantity</span>
                    <span>Dimensions</span>
                    <span>Material</span>
                  </div>
                  {documentation.cutList.map((item, index) => (
                    <div key={index} className="grid grid-cols-4 gap-2 text-sm py-1">
                      <span>{item.name}</span>
                      <span>{item.quantity}</span>
                      <span>{item.dimensions}</span>
                      <span>{item.material}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No cut list available</p>
              )}
            </CardContent>
          </Card>

          {/* Hardware List */}
          <Card>
            <CardHeader>
              <CardTitle>Hardware List</CardTitle>
            </CardHeader>
            <CardContent>
              {documentation.hardwareList.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-sm font-medium border-b pb-2">
                    <span>Item</span>
                    <span>Quantity</span>
                    <span>Size/Type</span>
                  </div>
                  {documentation.hardwareList.map((item, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2 text-sm py-1">
                      <span>{item.name}</span>
                      <span>{item.quantity}</span>
                      <span>{item.size}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No hardware list available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instructions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Step-by-Step Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              {documentation.stepByStepInstructions.length > 0 ? (
                <div className="space-y-4">
                  {documentation.stepByStepInstructions.map((step, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <h4 className="font-medium">{step.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                      {step.tips && step.tips.length > 0 && (
                        <div className="bg-blue-50 p-2 rounded text-sm">
                          <strong>Tip:</strong> {step.tips[0]}
                        </div>
                      )}
                      {step.warnings && step.warnings.length > 0 && (
                        <div className="bg-yellow-50 p-2 rounded text-sm flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 text-yellow-600" />
                          <span><strong>Warning:</strong> {step.warnings[0]}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No instructions available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Required Tools</CardTitle>
            </CardHeader>
            <CardContent>
              {documentation.toolRequirements.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {documentation.toolRequirements.map((tool, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                      <Wrench className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">{tool}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No tool requirements available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 
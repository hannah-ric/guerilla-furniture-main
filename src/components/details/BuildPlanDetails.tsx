import React from 'react';
import { FurnitureDesign } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  design: FurnitureDesign | null;
}

export function BuildPlanDetails({ design }: Props) {
  if (!design || !design.furniture_type) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No design details available yet</p>
        <p className="text-sm mt-2">Complete your design to see build details</p>
      </div>
    );
  }

  const boardFeet = calculateBoardFeet(design);
  const cutList = generateCutList(design);
  const hardwareList = generateHardwareList(design);

  return (
    <div className="h-full overflow-auto">
      <Tabs defaultValue="overview" className="h-full">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="cutlist" className="flex-1">Cut List</TabsTrigger>
          <TabsTrigger value="hardware" className="flex-1">Hardware</TabsTrigger>
          <TabsTrigger value="assembly" className="flex-1">Assembly</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Design Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Type:</dt>
                  <dd className="font-medium capitalize">{design.furniture_type}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Name:</dt>
                  <dd className="font-medium">{design.name || 'Untitled Design'}</dd>
                </div>
                {design.difficulty_level && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Difficulty:</dt>
                    <dd className="font-medium capitalize">{design.difficulty_level}</dd>
                  </div>
                )}
                {design.estimated_build_time && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Build Time:</dt>
                    <dd className="font-medium">{design.estimated_build_time}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dimensions</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Width:</dt>
                  <dd className="font-medium">{design.dimensions?.width}"</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Height:</dt>
                  <dd className="font-medium">{design.dimensions?.height}"</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Depth:</dt>
                  <dd className="font-medium">{design.dimensions?.depth}"</dd>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <dt className="text-muted-foreground">Total Board Feet:</dt>
                  <dd className="font-medium">{boardFeet.toFixed(1)} bf</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Materials & Cost</CardTitle>
            </CardHeader>
            <CardContent>
              {design.materials?.length > 0 ? (
                <div className="space-y-3">
                  {design.materials.map((material, idx) => (
                    <div key={idx} className="border-b last:border-0 pb-2 last:pb-0">
                      <div className="font-medium">
                        {material.type}
                      </div>
                      {material.properties && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Workability: {material.properties.workability} • 
                          ${material.properties.cost_per_board_foot}/bf
                        </div>
                      )}
                    </div>
                  ))}
                  {design.estimated_cost && (
                    <div className="pt-2 border-t">
                      <div className="flex justify-between">
                        <span className="font-medium">Estimated Total:</span>
                        <span className="text-lg font-bold">${design.estimated_cost}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No materials specified</p>
              )}
            </CardContent>
          </Card>

          {design.joinery?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Joinery Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {design.joinery.map((joint, idx) => (
                    <li key={idx}>
                      <div className="font-medium">{joint.type}</div>
                      <div className="text-sm text-muted-foreground">
                        Strength: {joint.strength_rating} • 
                        Difficulty: {joint.difficulty}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cutlist" className="p-4">
          <Card>
            <CardHeader>
              <CardTitle>Cut List</CardTitle>
            </CardHeader>
            <CardContent>
              {cutList.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2 font-medium text-sm border-b pb-2">
                    <div>Part</div>
                    <div>Qty</div>
                    <div>Dimensions</div>
                    <div>Material</div>
                  </div>
                  {cutList.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2 text-sm py-1">
                      <div>{item.name}</div>
                      <div>{item.quantity}</div>
                      <div>{item.dimensions}</div>
                      <div>{item.material}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Cut list will be generated when design is complete</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hardware" className="p-4">
          <Card>
            <CardHeader>
              <CardTitle>Hardware List</CardTitle>
            </CardHeader>
            <CardContent>
              {hardwareList.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 font-medium text-sm border-b pb-2">
                    <div>Item</div>
                    <div>Quantity</div>
                    <div>Size/Type</div>
                  </div>
                  {hardwareList.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2 text-sm py-1">
                      <div>{item.name}</div>
                      <div>{item.quantity}</div>
                      <div>{item.size}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Hardware list will be generated based on joinery selection</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assembly" className="p-4">
          <Card>
            <CardHeader>
              <CardTitle>Assembly Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              {design.assembly_steps?.length > 0 ? (
                <ol className="space-y-4">
                  {design.assembly_steps.map((step, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium">{step.title}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {step.description}
                        </div>
                        {step.tips && step.tips.length > 0 && (
                          <div className="mt-2 text-sm text-blue-600">
                            💡 {step.tips[0]}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="text-muted-foreground space-y-2">
                  <p>Assembly instructions will be generated when your design is complete.</p>
                  <p className="text-sm">They will include:</p>
                  <ul className="text-sm list-disc list-inside mt-2 space-y-1">
                    <li>Step-by-step assembly sequence</li>
                    <li>Required tools for each step</li>
                    <li>Critical measurements to verify</li>
                    <li>Tips for avoiding common mistakes</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function calculateBoardFeet(design: FurnitureDesign): number {
  if (!design.dimensions) return 0;
  
  // Simplified calculation - in real app would be more detailed
  const { width, height, depth } = design.dimensions;
  const volume = (width * height * depth) / 144; // Convert to board feet
  
  // Add waste factor
  return volume * 1.15;
}

function generateCutList(design: FurnitureDesign): any[] {
  if (!design.dimensions || !design.furniture_type) return [];
  
  // Generate basic cut list based on furniture type
  const { width, height, depth } = design.dimensions;
  const material = design.materials?.[0]?.type || 'wood';
  
  switch (design.furniture_type) {
    case 'table': {
      return [
        { name: 'Tabletop', quantity: 1, dimensions: `${width}" × ${depth}" × 1.5"`, material },
        { name: 'Legs', quantity: 4, dimensions: `3.5" × 3.5" × ${height - 1.5}"`, material },
        { name: 'Aprons (long)', quantity: 2, dimensions: `${width - 7}" × 4" × 1"`, material },
        { name: 'Aprons (short)', quantity: 2, dimensions: `${depth - 7}" × 4" × 1"`, material }
      ];
    }
    case 'bookshelf': {
      const numShelves = Math.floor(height / 16);
      return [
        { name: 'Sides', quantity: 2, dimensions: `${depth}" × ${height}" × 0.75"`, material },
        { name: 'Shelves', quantity: numShelves + 1, dimensions: `${width - 1.5}" × ${depth}" × 0.75"`, material },
        { name: 'Back panel', quantity: 1, dimensions: `${width}" × ${height}" × 0.25"`, material: 'plywood' }
      ];
    }
    default:
      return [];
  }
}

function generateHardwareList(design: FurnitureDesign): any[] {
  if (!design.joinery?.length && !design.hardware?.length) return [];
  
  const hardware: any[] = [];
  
  // From explicit hardware list
  if (design.hardware) {
    design.hardware.forEach(h => {
      hardware.push({
        name: h.type,
        quantity: h.quantity,
        size: h.size
      });
    });
  }
  
  // Infer from joinery
  if (design.joinery) {
    design.joinery.forEach(joint => {
      if (joint.type.includes('screw') || joint.type.includes('pocket')) {
        hardware.push({
          name: 'Wood screws',
          quantity: 24,
          size: '2.5"'
        });
      }
      if (joint.type.includes('dowel')) {
        hardware.push({
          name: 'Dowels',
          quantity: 16,
          size: '3/8" × 2"'
        });
      }
    });
  }
  
  return hardware;
}
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  FileArchive, 
  Settings, 
  Palette, 
  Layers,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Enhanced3DExporter, ExportFormat, ExportOptions, ExportResult } from '@/services/3d/Enhanced3DExporter';
import { FurnitureDesign } from '@/lib/types';
import * as THREE from 'three';

interface ExportModalProps {
  design: FurnitureDesign;
  model: THREE.Group;
  trigger?: React.ReactNode;
}

export function ExportModal({ design, model, trigger }: ExportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exportOptions, setExportOptions] = useState<Partial<ExportOptions>>({
    format: 'gltf',
    quality: 'medium',
    includeTextures: true,
    includeAnimations: false,
    separateComponents: false,
    includeDimensions: true,
    colorMode: 'material',
    precision: 3,
    exportMetadata: {
      includeBuildPlan: true,
      includeCutList: true,
      includeAssemblyInstructions: true
    }
  });

  const exporter = new Enhanced3DExporter();

  const formatOptions: { value: ExportFormat; label: string; description: string; icon: string }[] = [
    { value: 'gltf', label: 'GLTF/GLB', description: 'Standard 3D format, compatible with most software', icon: '🎯' },
    { value: 'stl', label: 'STL', description: 'Perfect for 3D printing', icon: '🖨️' },
    { value: 'obj', label: 'OBJ', description: 'Universal format, widely supported', icon: '📦' },
    { value: 'svg', label: 'SVG', description: 'Cut patterns for CNC/laser cutting', icon: '✂️' },
    { value: 'pdf', label: 'PDF', description: 'Complete build documentation', icon: '📄' }
  ];

  const qualityOptions = [
    { value: 'low', label: 'Low', description: 'Faster export, smaller files' },
    { value: 'medium', label: 'Medium', description: 'Balanced quality and size' },
    { value: 'high', label: 'High', description: 'Better quality, larger files' },
    { value: 'production', label: 'Production', description: 'Maximum quality for manufacturing' }
  ];

  const colorModes = [
    { value: 'material', label: 'Material Colors', description: 'Use assigned material colors' },
    { value: 'part-color', label: 'Part Colors', description: 'Color-code individual parts' },
    { value: 'assembly-order', label: 'Assembly Order', description: 'Color by assembly sequence' }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exporter.exportDesign(model, design, exportOptions);
      setExportResult(result);
      
      // Automatically download the files
      await exporter.downloadFiles(result.files, `${design.name}_export`);
    } catch (error) {
      console.error('Export failed:', error);
      // Handle error state
    } finally {
      setIsExporting(false);
    }
  };

  const updateExportOptions = (updates: Partial<ExportOptions>) => {
    setExportOptions(prev => ({ ...prev, ...updates }));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Design
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Export {design.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="format" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="format">Format</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="format" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {formatOptions.map((format) => (
                <Card 
                  key={format.value}
                  className={`cursor-pointer transition-colors ${
                    exportOptions.format === format.value ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => updateExportOptions({ format: format.value })}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{format.icon}</span>
                      <div>
                        <h3 className="font-semibold">{format.label}</h3>
                        <p className="text-sm text-muted-foreground">{format.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="quality" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Export Quality</Label>
                <Select 
                  value={exportOptions.quality} 
                  onValueChange={(value) => updateExportOptions({ quality: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {qualityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-base font-semibold">Color Mode</Label>
                <Select 
                  value={exportOptions.colorMode} 
                  onValueChange={(value) => updateExportOptions({ colorMode: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorModes.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        <div>
                          <div className="font-medium">{mode.label}</div>
                          <div className="text-sm text-muted-foreground">{mode.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-base font-semibold">Precision (decimal places)</Label>
                <div className="mt-2">
                  <Slider
                    value={[exportOptions.precision || 3]}
                    onValueChange={([value]) => updateExportOptions({ precision: value })}
                    max={6}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>1</span>
                    <span>{exportOptions.precision}</span>
                    <span>6</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="options" className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  3D Options
                </h3>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="textures" 
                    checked={exportOptions.includeTextures}
                    onCheckedChange={(checked) => updateExportOptions({ includeTextures: !!checked })}
                  />
                  <Label htmlFor="textures">Include Textures</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="animations" 
                    checked={exportOptions.includeAnimations}
                    onCheckedChange={(checked) => updateExportOptions({ includeAnimations: !!checked })}
                  />
                  <Label htmlFor="animations">Include Animations</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="separate" 
                    checked={exportOptions.separateComponents}
                    onCheckedChange={(checked) => updateExportOptions({ separateComponents: !!checked })}
                  />
                  <Label htmlFor="separate">Separate Components</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="dimensions" 
                    checked={exportOptions.includeDimensions}
                    onCheckedChange={(checked) => updateExportOptions({ includeDimensions: !!checked })}
                  />
                  <Label htmlFor="dimensions">Include Dimensions</Label>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Documentation
                </h3>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="buildplan" 
                    checked={exportOptions.exportMetadata?.includeBuildPlan}
                    onCheckedChange={(checked) => updateExportOptions({ 
                      exportMetadata: { 
                        includeBuildPlan: !!checked,
                        includeCutList: exportOptions.exportMetadata?.includeCutList ?? true,
                        includeAssemblyInstructions: exportOptions.exportMetadata?.includeAssemblyInstructions ?? true
                      }
                    })}
                  />
                  <Label htmlFor="buildplan">Build Plan</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="cutlist" 
                    checked={exportOptions.exportMetadata?.includeCutList}
                    onCheckedChange={(checked) => updateExportOptions({ 
                      exportMetadata: { 
                        includeBuildPlan: exportOptions.exportMetadata?.includeBuildPlan ?? true,
                        includeCutList: !!checked,
                        includeAssemblyInstructions: exportOptions.exportMetadata?.includeAssemblyInstructions ?? true
                      }
                    })}
                  />
                  <Label htmlFor="cutlist">Cut List</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="assembly" 
                    checked={exportOptions.exportMetadata?.includeAssemblyInstructions}
                    onCheckedChange={(checked) => updateExportOptions({ 
                      exportMetadata: { 
                        includeBuildPlan: exportOptions.exportMetadata?.includeBuildPlan ?? true,
                        includeCutList: exportOptions.exportMetadata?.includeCutList ?? true,
                        includeAssemblyInstructions: !!checked
                      }
                    })}
                  />
                  <Label htmlFor="assembly">Assembly Instructions</Label>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {exportResult ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Export Completed Successfully!</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Export Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Files Generated:</span>
                        <Badge>{exportResult.files.length}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Size:</span>
                        <Badge variant="outline">{formatFileSize(exportResult.totalSize)}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Export Time:</span>
                        <Badge variant="outline">{exportResult.exportTime.toFixed(2)}ms</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Model Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Parts Count:</span>
                        <Badge>{exportResult.metadata.partCount}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Materials:</span>
                        <Badge variant="outline">{exportResult.metadata.materialCount}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Generated Files:</h4>
                  <div className="space-y-2">
                    {exportResult.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium">{file.name}</span>
                          <p className="text-sm text-muted-foreground">{file.description}</p>
                        </div>
                        <Badge variant="outline">{formatFileSize(file.size)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {exportResult.warnings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      Warnings
                    </h4>
                    <div className="space-y-1">
                      {exportResult.warnings.map((warning, index) => (
                        <p key={index} className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                          {warning}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Export preview will appear here after export completes.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {exportOptions.format?.toUpperCase()} • {exportOptions.quality} quality
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={isExporting}
              className="gap-2"
            >
              {isExporting ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export Design
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
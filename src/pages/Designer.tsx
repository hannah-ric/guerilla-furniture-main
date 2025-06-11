import React, { lazy, Suspense, useCallback, useMemo } from 'react';
import { useFurnitureDesign } from '@/hooks/useFurnitureDesign';
import { DesignChatInterface } from '@/components/chat/DesignChatInterface';
import { ValidationStatus } from '@/components/shared/ValidationStatus';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Save, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PerformanceMonitor } from '@/lib/performance';
import { UI } from '@/lib/constants';

// Lazy load heavy components
const FurnitureViewer = lazy(() => import('@/components/viewer/FurnitureViewer').then(module => ({ default: module.FurnitureViewer })));
const BuildPlanDetails = lazy(() => import('@/components/details/BuildPlanDetails').then(module => ({ default: module.BuildPlanDetails })));

// Loading fallback component
const TabLoading = React.memo(() => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
));

TabLoading.displayName = 'TabLoading';

// Header component
const DesignerHeader = React.memo(({ 
  designName, 
  designType,
  canExport,
  isExporting,
  onBack,
  onSave,
  onDownload 
}: {
  designName?: string;
  designType?: string;
  canExport: boolean;
  isExporting: boolean;
  onBack: () => void;
  onSave: () => void;
  onDownload: () => void;
}) => (
  <header className="border-b p-4 flex items-center justify-between">
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div>
        <h1 className="text-xl font-bold">Furniture Designer</h1>
        <p className="text-sm text-muted-foreground">
          {designName || designType || 'New Design'}
        </p>
      </div>
    </div>
    
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onDownload}
        disabled={!canExport || isExporting}
      >
        <Download className="h-4 w-4 mr-2" />
        {isExporting ? 'Exporting...' : 'Download PDF'}
      </Button>
      <Button
        size="sm"
        onClick={onSave}
        disabled={!canExport}
      >
        <Save className="h-4 w-4 mr-2" />
        Save
      </Button>
    </div>
  </header>
));

DesignerHeader.displayName = 'DesignerHeader';

export function Designer() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    messages, 
    design, 
    isLoading, 
    sendMessage, 
    validationResults,
    error,
    suggestions
  } = useFurnitureDesign();
  
  const [isExporting, setIsExporting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('3d');
  
  // Memoize expensive calculations
  const canExport = useMemo(() => {
    return !!(design?.dimensions && design?.furniture_type);
  }, [design?.dimensions, design?.furniture_type]);

  const defaultSuggestions = useMemo(() => [
    "Build a modern bookshelf for my living room",
    "I need a coffee table that fits in a small space",
    "Design a standing desk with cable management",
    "Create a dining table for 6 people"
  ], []);

  const handleSave = useCallback(async () => {
    PerformanceMonitor.mark('save-start');
    
    try {
      // TODO: Implement save functionality with Supabase
      console.log('Saving design:', design);
      toast({
        title: 'Save feature coming soon',
        description: 'This feature will be available in the next update.'
      });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: 'There was an error saving your design.',
        variant: 'destructive'
      });
    } finally {
      PerformanceMonitor.measure('save-complete', 'save-start');
    }
  }, [design, toast]);
  
  const handleDownload = useCallback(async () => {
    if (!canExport) {
      toast({
        title: 'Design incomplete',
        description: 'Please complete your design before exporting.',
        variant: 'destructive'
      });
      return;
    }

    setIsExporting(true);
    PerformanceMonitor.mark('export-start');
    
    try {
      const { PDFExporter } = await import('@/services/export/PDFExporter');
      const exporter = new PDFExporter();
      const pdfBlob = await exporter.exportDesign(design!);
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${design!.name || 'furniture-design'}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'PDF exported successfully',
        description: 'Your furniture plans have been downloaded.'
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'There was an error generating the PDF.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
      PerformanceMonitor.measure('export-complete', 'export-start');
    }
  }, [canExport, design, toast]);

  const handleBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Show error state if there's a critical error
  if (error && !messages.length) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={handleBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <DesignerHeader
        designName={design?.name}
        designType={design?.furniture_type}
        canExport={canExport}
        isExporting={isExporting}
        onBack={handleBack}
        onSave={handleSave}
        onDownload={handleDownload}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Section */}
        <div className="w-1/2 border-r flex flex-col">
          <DesignChatInterface
            messages={messages}
            onSendMessage={sendMessage}
            isLoading={isLoading}
            suggestions={suggestions.length > 0 ? suggestions : defaultSuggestions}
          />
        </div>
        
        {/* Preview Section */}
        <div className="w-1/2 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="3d">3D Preview</TabsTrigger>
              <TabsTrigger value="details">Build Details</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="3d" className="flex-1">
              <Suspense fallback={<TabLoading />}>
                <FurnitureViewer 
                  design={design}
                  showDimensions
                  enableAnimation
                />
              </Suspense>
            </TabsContent>
            
            <TabsContent value="details" className="flex-1 overflow-auto">
              <Suspense fallback={<TabLoading />}>
                <BuildPlanDetails design={design} />
              </Suspense>
            </TabsContent>
            
            <TabsContent value="validation" className="flex-1 overflow-auto p-4">
              <ValidationStatus results={validationResults} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
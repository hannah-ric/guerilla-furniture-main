import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
// Note: DXFExporter not available in Three.js standard distribution
import { FurnitureDesign } from '@/lib/types';
import { Logger } from '@/lib/logger';

export type ExportFormat = 'gltf' | 'stl' | 'obj' | 'svg' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  quality: 'low' | 'medium' | 'high' | 'production';
  includeTextures: boolean;
  includeAnimations: boolean;
  separateComponents: boolean;
  includeDimensions: boolean;
  colorMode: 'material' | 'part-color' | 'assembly-order';
  precision: number; // decimal places for dimensions
  exportMetadata: {
    includeBuildPlan: boolean;
    includeCutList: boolean;
    includeAssemblyInstructions: boolean;
  };
}

export interface ExportResult {
  files: ExportFile[];
  totalSize: number;
  exportTime: number;
  warnings: string[];
  metadata: {
    partCount: number;
    materialCount: number;
    boundingBox: THREE.Box3;
    exportDate: Date;
  };
}

export interface ExportFile {
  name: string;
  type: string;
  data: ArrayBuffer | string;
  size: number;
  description: string;
}

export class Enhanced3DExporter {
  private logger = Logger.createScoped('Enhanced3DExporter');
  private gltfExporter = new GLTFExporter();
  private stlExporter = new STLExporter();
  private objExporter = new OBJExporter();

  constructor() {
    this.logger.info('Enhanced 3D Exporter initialized');
  }

  async exportDesign(
    model: THREE.Group,
    design: FurnitureDesign,
    options: Partial<ExportOptions> = {}
  ): Promise<ExportResult> {
    const startTime = performance.now();
    const exportOptions = this.getDefaultOptions(options);
    
    this.logger.info(`Starting export in ${exportOptions.format} format`, { 
      quality: exportOptions.quality,
      separateComponents: exportOptions.separateComponents 
    });

    try {
      const files: ExportFile[] = [];
      const warnings: string[] = [];

      // Prepare model for export
      const exportModel = this.prepareModelForExport(model, exportOptions);
      
      // Generate main 3D file(s)
      const mainFiles = await this.generateMainFiles(exportModel, design, exportOptions);
      files.push(...mainFiles);

      // Generate supplementary files
      if (exportOptions.exportMetadata.includeBuildPlan) {
        const buildPlanFile = await this.generateBuildPlan(design, exportOptions);
        if (buildPlanFile) files.push(buildPlanFile);
      }

      if (exportOptions.exportMetadata.includeCutList) {
        const cutListFile = await this.generateCutList(design, exportOptions);
        if (cutListFile) files.push(cutListFile);
      }

      if (exportOptions.includeDimensions) {
        const dimensionFile = await this.generateDimensionDrawing(exportModel, design, exportOptions);
        if (dimensionFile) files.push(dimensionFile);
      }

      // Calculate metadata
      const boundingBox = new THREE.Box3().setFromObject(exportModel);
      const partCount = this.countParts(exportModel);
      const materialCount = this.countMaterials(exportModel);
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const exportTime = performance.now() - startTime;

      this.logger.info(`Export completed`, { 
        format: exportOptions.format,
        fileCount: files.length,
        totalSize: `${(totalSize / 1024 / 1024).toFixed(2)}MB`,
        exportTime: `${exportTime.toFixed(2)}ms`
      });

      return {
        files,
        totalSize,
        exportTime,
        warnings,
        metadata: {
          partCount,
          materialCount,
          boundingBox,
          exportDate: new Date()
        }
      };

    } catch (error) {
      this.logger.error('Export failed', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Export failed: ${errorMessage}`);
    }
  }

  private async generateMainFiles(
    model: THREE.Group,
    design: FurnitureDesign,
    options: ExportOptions
  ): Promise<ExportFile[]> {
    const files: ExportFile[] = [];

    switch (options.format) {
      case 'gltf':
        files.push(...await this.exportGLTF(model, design, options));
        break;
      case 'stl':
        files.push(...await this.exportSTL(model, design, options));
        break;
      case 'obj':
        files.push(...await this.exportOBJ(model, design, options));
        break;
      case 'svg':
        files.push(...await this.exportSVG(model, design, options));
        break;
    }

    return files;
  }

  private async exportGLTF(
    model: THREE.Group,
    design: FurnitureDesign,
    options: ExportOptions
  ): Promise<ExportFile[]> {
    const files: ExportFile[] = [];

    if (options.separateComponents && model.userData.parts) {
      // Export each component separately
      for (const [index, part] of model.userData.parts.entries()) {
        const partGroup = new THREE.Group();
        partGroup.add(part.clone());
        
        const gltfData = await this.exportSingleGLTF(partGroup, {
          binary: options.quality === 'production',
          embedImages: options.includeTextures,
          animations: false // Components don't have animations
        });

        files.push({
          name: `${design.name}_${part.userData.name || `part_${index + 1}`}.${options.quality === 'production' ? 'glb' : 'gltf'}`,
          type: options.quality === 'production' ? 'model/gltf-binary' : 'model/gltf+json',
          data: gltfData,
          size: gltfData.byteLength || new Blob([gltfData]).size,
          description: `Individual component: ${part.userData.name || `Part ${index + 1}`}`
        });
      }
    } else {
      // Export as single file
      const gltfData = await this.exportSingleGLTF(model, {
        binary: options.quality === 'production',
        embedImages: options.includeTextures,
        animations: options.includeAnimations
      });

      files.push({
        name: `${design.name}.${options.quality === 'production' ? 'glb' : 'gltf'}`,
        type: options.quality === 'production' ? 'model/gltf-binary' : 'model/gltf+json',
        data: gltfData,
        size: gltfData.byteLength || new Blob([gltfData]).size,
        description: 'Complete furniture assembly'
      });
    }

    return files;
  }

  private async exportSTL(
    model: THREE.Group,
    design: FurnitureDesign,
    options: ExportOptions
  ): Promise<ExportFile[]> {
    const files: ExportFile[] = [];

    if (options.separateComponents && model.userData.parts) {
      // Export each component separately for 3D printing
      for (const [index, part] of model.userData.parts.entries()) {
        const stlData = this.stlExporter.parse(part, { binary: options.quality === 'production' });
        const isArrayBuffer = stlData instanceof ArrayBuffer;
        const isString = typeof stlData === 'string';
        
        files.push({
          name: `${design.name}_${part.userData.name || `part_${index + 1}`}.stl`,
          type: 'application/sla',
          data: isArrayBuffer ? stlData : new TextEncoder().encode(isString ? stlData : ''),
          size: isArrayBuffer ? stlData.byteLength : (isString ? stlData.length : 0),
          description: `3D printable component: ${part.userData.name || `Part ${index + 1}`}`
        });
      }
    } else {
      // Export as single STL
      const stlData = this.stlExporter.parse(model, { binary: options.quality === 'production' });
      const isArrayBuffer = stlData instanceof ArrayBuffer;
      const isString = typeof stlData === 'string';
      
      files.push({
        name: `${design.name}.stl`,
        type: 'application/sla',
        data: isArrayBuffer ? stlData : new TextEncoder().encode(isString ? stlData : ''),
        size: isArrayBuffer ? stlData.byteLength : (isString ? stlData.length : 0),
        description: 'Complete furniture assembly for 3D printing'
      });
    }

    return files;
  }

  private async exportOBJ(
    model: THREE.Group,
    design: FurnitureDesign,
    options: ExportOptions
  ): Promise<ExportFile[]> {
    const files: ExportFile[] = [];

    // OBJ export - widely compatible format
    const objData = this.objExporter.parse(model);
    
    files.push({
      name: `${design.name}.obj`,
      type: 'application/object',
      data: new TextEncoder().encode(objData),
      size: objData.length,
      description: 'Wavefront OBJ format for universal 3D compatibility'
    });

    // Generate MTL file if materials are present
    const mtlData = this.generateMTLFile(model);
    if (mtlData) {
      files.push({
        name: `${design.name}.mtl`,
        type: 'application/material',
        data: new TextEncoder().encode(mtlData),
        size: mtlData.length,
        description: 'Material definitions for OBJ file'
      });
    }

    return files;
  }

  private async exportSVG(
    model: THREE.Group,
    design: FurnitureDesign,
    options: ExportOptions
  ): Promise<ExportFile[]> {
    const files: ExportFile[] = [];

    // Generate cut patterns for each component
    if (model.userData.parts) {
      for (const [index, part] of model.userData.parts.entries()) {
        const svgData = this.generateCutPattern(part, options);
        
        files.push({
          name: `${design.name}_${part.userData.name || `part_${index + 1}`}_pattern.svg`,
          type: 'image/svg+xml',
          data: new TextEncoder().encode(svgData),
          size: svgData.length,
          description: `Cut pattern for ${part.userData.name || `Part ${index + 1}`}`
        });
      }
    }

    return files;
  }

  private async exportSingleGLTF(model: THREE.Object3D, options: any): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      this.gltfExporter.parse(
        model,
        (result) => {
          if (options.binary) {
            resolve(result as ArrayBuffer);
          } else {
            const jsonString = JSON.stringify(result);
            const buffer = new TextEncoder().encode(jsonString);
            resolve(buffer.buffer);
          }
        },
        (error) => reject(error),
        options
      );
    });
  }

  private prepareModelForExport(model: THREE.Group, options: ExportOptions): THREE.Group {
    const exportModel = model.clone();
    
    // Apply color coding based on options
    if (options.colorMode === 'part-color') {
      this.applyPartColors(exportModel);
    } else if (options.colorMode === 'assembly-order') {
      this.applyAssemblyColors(exportModel);
    }

    // Optimize geometry based on quality setting
    this.optimizeGeometry(exportModel, options.quality);

    return exportModel;
  }

  private async generateBuildPlan(design: FurnitureDesign, options: ExportOptions): Promise<ExportFile | null> {
    const buildPlan = {
      design_name: design.name,
      furniture_type: design.furniture_type,
      dimensions: design.dimensions,
      materials: design.materials,
      cut_list: design.cut_list,
      assembly_steps: design.assembly_steps,
      estimated_time: design.estimated_build_time,
      difficulty: design.difficulty_level,
      export_date: new Date().toISOString(),
      export_format: options.format,
      export_quality: options.quality
    };

    const jsonData = JSON.stringify(buildPlan, null, 2);
    
    return {
      name: `${design.name}_build_plan.json`,
      type: 'application/json',
      data: new TextEncoder().encode(jsonData),
      size: jsonData.length,
      description: 'Complete build plan and specifications'
    };
  }

  private async generateCutList(design: FurnitureDesign, options: ExportOptions): Promise<ExportFile | null> {
    if (!design.cut_list?.length) return null;

    // Generate CSV format cut list
    const headers = ['Part Name', 'Quantity', 'Length', 'Width', 'Thickness', 'Material', 'Grain Direction', 'Notes'];
    const rows = design.cut_list.map(item => [
      item.part_name,
      item.quantity.toString(),
      item.dimensions.length.toFixed(options.precision),
      item.dimensions.width.toFixed(options.precision),
      item.dimensions.thickness.toFixed(options.precision),
      item.material.type,
      item.grain_direction || 'any',
      item.notes || ''
    ]);

    const csvData = [headers, ...rows].map(row => row.join(',')).join('\n');

    return {
      name: `${design.name}_cut_list.csv`,
      type: 'text/csv',
      data: new TextEncoder().encode(csvData),
      size: csvData.length,
      description: 'Detailed cut list for production'
    };
  }

  private async generateDimensionDrawing(
    model: THREE.Group,
    design: FurnitureDesign,
    options: ExportOptions
  ): Promise<ExportFile | null> {
    // Generate technical drawing with dimensions
    const drawingData = this.createDimensionDrawing(model, design, options);
    
    return {
      name: `${design.name}_dimensions.svg`,
      type: 'image/svg+xml',
      data: new TextEncoder().encode(drawingData),
      size: drawingData.length,
      description: 'Technical drawing with dimensions'
    };
  }

  private generateCutPattern(part: THREE.Object3D, options: ExportOptions): string {
    const boundingBox = new THREE.Box3().setFromObject(part);
    const size = boundingBox.getSize(new THREE.Vector3());
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size.x * 10}" height="${size.y * 10}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${size.x * 10}" height="${size.y * 10}" 
        fill="none" stroke="black" stroke-width="1"/>
  <text x="10" y="20" font-family="Arial" font-size="12">
    ${part.userData.name || 'Unnamed Part'}
  </text>
  <text x="10" y="35" font-family="Arial" font-size="10">
    ${size.x.toFixed(options.precision)}" × ${size.y.toFixed(options.precision)}"
  </text>
</svg>`;
  }

  private createDimensionDrawing(model: THREE.Group, design: FurnitureDesign, options: ExportOptions): string {
    const boundingBox = new THREE.Box3().setFromObject(model);
    const size = boundingBox.getSize(new THREE.Vector3());
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" 
            refX="0" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="black"/>
    </marker>
  </defs>
  
  <!-- Main outline -->
  <rect x="100" y="100" width="${size.x * 5}" height="${size.y * 5}" 
        fill="none" stroke="black" stroke-width="2"/>
  
  <!-- Width dimension -->
  <line x1="100" y1="80" x2="${100 + size.x * 5}" y2="80" 
        stroke="black" stroke-width="1" marker-end="url(#arrowhead)" marker-start="url(#arrowhead)"/>
  <text x="${100 + size.x * 2.5}" y="75" text-anchor="middle" font-family="Arial" font-size="12">
    ${size.x.toFixed(options.precision)}"
  </text>
  
  <!-- Title -->
  <text x="400" y="50" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">
    ${design.name} - Technical Drawing
  </text>
</svg>`;
  }

  private generateMTLFile(model: THREE.Group): string | null {
    const materials = new Set<string>();
    
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => materials.add(mat.name || 'default'));
        } else {
          materials.add(child.material.name || 'default');
        }
      }
    });

    if (materials.size === 0) return null;

    let mtlContent = '# Material file generated by Blueprint Buddy\n\n';
    
    materials.forEach(materialName => {
      mtlContent += `newmtl ${materialName}\n`;
      mtlContent += `Ka 0.200000 0.200000 0.200000\n`;
      mtlContent += `Kd 0.800000 0.800000 0.800000\n`;
      mtlContent += `Ks 1.000000 1.000000 1.000000\n`;
      mtlContent += `Ns 32.000000\n\n`;
    });

    return mtlContent;
  }

  private applyPartColors(model: THREE.Group): void {
    const colors = [
      0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 
      0xffeaa7, 0xdda0dd, 0x98fb98, 0xf4a261
    ];
    
    let colorIndex = 0;
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: colors[colorIndex % colors.length]
        });
        colorIndex++;
      }
    });
  }

  private applyAssemblyColors(model: THREE.Group): void {
    // Apply gradient colors based on assembly order
    const parts = model.userData.parts || [];
    
    parts.forEach((part: any, index: number) => {
      const hue = (index / parts.length) * 360;
      const color = new THREE.Color().setHSL(hue / 360, 0.7, 0.6);
      
      part.traverse((child: any) => {
        if (child instanceof THREE.Mesh) {
          child.material = new THREE.MeshStandardMaterial({ color });
        }
      });
    });
  }

  private optimizeGeometry(model: THREE.Group, quality: string): void {
    const decimationRatio = quality === 'low' ? 0.5 : quality === 'medium' ? 0.75 : 1.0;
    
    if (decimationRatio < 1.0) {
      model.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          // Simplified optimization - in production, use proper decimation algorithms
          const geometry = child.geometry;
          if (geometry.attributes.position) {
            const positions = geometry.attributes.position.array;
            // Simple vertex reduction logic would go here
          }
        }
      });
    }
  }

  private countParts(model: THREE.Group): number {
    return model.userData.parts ? model.userData.parts.length : 1;
  }

  private countMaterials(model: THREE.Group): number {
    const materials = new Set<string>();
    
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => materials.add(mat.uuid));
        } else {
          materials.add(child.material.uuid);
        }
      }
    });

    return materials.size;
  }

  private getDefaultOptions(options: Partial<ExportOptions>): ExportOptions {
    return {
      format: 'gltf',
      quality: 'medium',
      includeTextures: true,
      includeAnimations: true,
      separateComponents: false,
      includeDimensions: true,
      colorMode: 'material',
      precision: 3,
      exportMetadata: {
        includeBuildPlan: true,
        includeCutList: true,
        includeAssemblyInstructions: true
      },
      ...options
    };
  }

  async downloadFiles(files: ExportFile[], zipName?: string): Promise<void> {
    if (files.length === 1) {
      // Single file download
      const file = files[0];
      const blob = new Blob([file.data], { type: file.type });
      this.downloadBlob(blob, file.name);
    } else {
      // Multiple files - create ZIP
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      files.forEach(file => {
        zip.file(file.name, file.data);
      });
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      this.downloadBlob(zipBlob, zipName || 'furniture_export.zip');
    }
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
} 
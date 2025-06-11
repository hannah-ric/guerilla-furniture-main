/**
 * Advanced 3D Model Generator for Blueprint Buddy
 * 
 * This module orchestrates the generation of sophisticated, parametric 3D furniture models
 * with accurate dimensions, proper joinery visualization, material textures, and assembly details.
 */

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { FurnitureDesign } from '@/lib/types';
import { Logger } from '@/lib/logger';
import { FurnitureGeometryGenerator, FurniturePart } from './furnitureGeometry';
import { DIMENSIONS } from '@/lib/constants';

export interface Model3DResult {
  assembledModel: THREE.Group;
  explodedModel: THREE.Group;
  parts: FurniturePart[];
  boundingBox: THREE.Box3;
  cameraSettings: {
    position: THREE.Vector3;
    target: THREE.Vector3;
    fov: number;
  };
  animations?: THREE.AnimationClip[];
}

export class ModelGenerator {
  private logger = Logger.createScoped('ModelGenerator');
  private geometryGenerator: FurnitureGeometryGenerator;
  private scene: THREE.Scene;
  private exporter: GLTFExporter;

  constructor() {
    this.geometryGenerator = new FurnitureGeometryGenerator();
    this.scene = new THREE.Scene();
    this.exporter = new GLTFExporter();
  }

  /**
   * Generate complete 3D model with assembled and exploded views
   */
  async generateModel(design: FurnitureDesign): Promise<THREE.Group> {
    this.logger.info('Generating advanced 3D model', { 
      type: design.furniture_type,
      name: design.name 
    });
    
    try {
      // Generate the furniture geometry
      const modelData = this.geometryGenerator.generateFurnitureModel(design);
      
      // Add lighting helpers to the assembled model
      this.addModelHelpers(modelData.assembly);
      
      // Calculate optimal camera settings
      const cameraSettings = this.calculateCameraSettings(modelData.boundingBox);
      
      // Store model data as user data for later access
      modelData.assembly.userData = {
        design,
        parts: modelData.parts,
        explodedModel: modelData.exploded,
        boundingBox: modelData.boundingBox,
        cameraSettings
      };
      
      // Create assembly animation
      const animations = this.createAssemblyAnimation(modelData.parts, modelData.exploded);
      if (animations.length > 0) {
        modelData.assembly.userData.animations = animations;
      }
      
      this.logger.info('Model generated successfully', {
        partCount: modelData.parts.length,
        hasAnimations: animations.length > 0
      });
      
      return modelData.assembly;
      
    } catch (error) {
      this.logger.error('Model generation failed', error);
      
      // Return fallback simple model
      return this.createFallbackModel(design);
    }
  }

  /**
   * Export model to GLTF format
   */
  async exportToGLTF(model: THREE.Group): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      this.exporter.parse(
        model,
        (gltf: any) => {
          resolve(gltf as ArrayBuffer);
        },
        (error: any) => {
          this.logger.error('GLTF export failed', error);
          reject(error);
        },
        { binary: true }
      );
    });
  }

  /**
   * Generate cut list from model parts
   */
  generateCutList(parts: FurniturePart[]): any[] {
    const cutList: any[] = [];
    const scale = DIMENSIONS.INCH_TO_FEET;
    
    // Group parts by material and dimensions
    const groupedParts = new Map<string, any[]>();
    
    parts.forEach(part => {
      const dimensions = part.dimensions;
      const key = `${dimensions.width}_${dimensions.height}_${dimensions.depth}_${part.grainDirection}`;
      
      if (!groupedParts.has(key)) {
        groupedParts.set(key, []);
      }
      
      groupedParts.get(key)!.push(part);
    });
    
    // Create cut list entries
    groupedParts.forEach((parts, key) => {
      const firstPart = parts[0];
      const dims = firstPart.dimensions;
      
      cutList.push({
        id: `cut_${cutList.length + 1}`,
        part_name: parts.length > 1 ? `${firstPart.name} (×${parts.length})` : firstPart.name,
        quantity: parts.length,
        material: { type: 'wood' }, // This should come from the design
        dimensions: {
          length: Math.round(dims.width * scale * 100) / 100,
          width: Math.round(dims.depth * scale * 100) / 100,
          thickness: Math.round(dims.height * scale * 100) / 100
        },
        grain_direction: firstPart.grainDirection,
        notes: this.generatePartNotes(firstPart)
      });
    });
    
    return cutList;
  }

  /**
   * Generate hardware list from model
   */
  generateHardwareList(design: FurnitureDesign, parts: FurniturePart[]): any[] {
    const hardware: any[] = [];
    
    // Count joinery features to determine hardware needs
    let mortiseCount = 0;
    let dadoCount = 0;
    let dowelCount = 0;
    let pocketCount = 0;
    
    parts.forEach(part => {
      if (part.joineryFeatures) {
        part.joineryFeatures.forEach(feature => {
          switch (feature.type) {
            case 'mortise':
              mortiseCount++;
              break;
            case 'dado':
              dadoCount++;
              break;
            case 'dowel':
              dowelCount++;
              break;
            case 'pocket':
              pocketCount++;
              break;
          }
        });
      }
    });
    
    // Add appropriate hardware based on joinery
    if (pocketCount > 0) {
      hardware.push({
        type: 'screw',
        size: '2.5" pocket screws',
        quantity: pocketCount * 2,
        material: 'steel',
        finish: 'zinc',
        cost_per_unit: 0.15
      });
    }
    
    if (dowelCount > 0) {
      hardware.push({
        type: 'dowel',
        size: '3/8" × 2"',
        quantity: dowelCount,
        material: 'hardwood',
        finish: 'natural',
        cost_per_unit: 0.10
      });
    }
    
    // Add glue
    hardware.push({
      type: 'other',
      size: 'Wood glue (16 oz)',
      quantity: 1,
      material: 'PVA',
      finish: 'N/A',
      cost_per_unit: 8.00
    });
    
    // Add finishing supplies based on surface area
    const surfaceArea = this.calculateSurfaceArea(parts);
    const finishQuarts = Math.ceil(surfaceArea / 150); // 150 sq ft per quart
    
    hardware.push({
      type: 'other',
      size: 'Polyurethane finish (quart)',
      quantity: finishQuarts,
      material: 'polyurethane',
      finish: 'satin',
      cost_per_unit: 15.00
    });
    
    return hardware;
  }

  /**
   * Add helpers and indicators to the model
   */
  private addModelHelpers(model: THREE.Group): void {
    // Add coordinate axes helper in development
    if (import.meta.env.DEV) {
      const axesHelper = new THREE.AxesHelper(1);
      axesHelper.name = 'axes-helper';
      model.add(axesHelper);
    }
    
    // Add dimension labels (would be HTML overlays in practice)
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.part) {
        // Add dimension sprite or HTML label
      }
    });
  }

  /**
   * Calculate optimal camera settings for the model
   */
  private calculateCameraSettings(boundingBox: THREE.Box3): any {
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Calculate distance for camera to see entire model
    const fov = 50;
    const distance = maxDim * 2.5;
    
    // Position camera at a pleasant angle
    const position = new THREE.Vector3(
      center.x + distance * 0.7,
      center.y + distance * 0.7,
      center.z + distance * 0.7
    );
    
    return {
      position,
      target: center,
      fov
    };
  }

  /**
   * Create assembly animation showing how parts come together
   */
  private createAssemblyAnimation(
    parts: FurniturePart[], 
    explodedModel: THREE.Group
  ): THREE.AnimationClip[] {
    const clips: THREE.AnimationClip[] = [];
    const duration = 10; // 10 second animation
    
    // Create position tracks for each part
    const tracks: THREE.KeyframeTrack[] = [];
    
    parts.forEach((part, index) => {
      const mesh = explodedModel.getObjectByName(part.id) as THREE.Mesh;
      if (!mesh) return;
      
      // Create position track from exploded to assembled position
      const times = [0, duration];
      const values = [
        mesh.position.x, mesh.position.y, mesh.position.z, // Start (exploded)
        part.position.x, part.position.y, part.position.z   // End (assembled)
      ];
      
      const positionTrack = new THREE.VectorKeyframeTrack(
        `.${part.id}.position`,
        times,
        values
      );
      
      tracks.push(positionTrack);
      
      // Add rotation tracks if needed
      if (mesh.rotation.x !== part.rotation.x ||
          mesh.rotation.y !== part.rotation.y ||
          mesh.rotation.z !== part.rotation.z) {
        const rotationValues = [
          mesh.rotation.x, mesh.rotation.y, mesh.rotation.z,
          part.rotation.x, part.rotation.y, part.rotation.z
        ];
        
        const rotationTrack = new THREE.VectorKeyframeTrack(
          `.${part.id}.rotation`,
          times,
          rotationValues
        );
        
        tracks.push(rotationTrack);
      }
    });
    
    if (tracks.length > 0) {
      const clip = new THREE.AnimationClip('assembly', duration, tracks);
      clips.push(clip);
    }
    
    return clips;
  }

  /**
   * Generate notes for cut list parts
   */
  private generatePartNotes(part: FurniturePart): string {
    const notes: string[] = [];
    
    // Add joinery notes
    if (part.joineryFeatures && part.joineryFeatures.length > 0) {
      const joineryTypes = [...new Set(part.joineryFeatures.map(f => f.type))];
      notes.push(`Joinery: ${joineryTypes.join(', ')}`);
    }
    
    // Add grain direction note
    if (part.grainDirection !== 'none') {
      notes.push(`Grain: ${part.grainDirection}`);
    }
    
    // Add cut angle notes
    if (part.cutAngles) {
      if (part.cutAngles.start) {
        notes.push(`Start angle: ${part.cutAngles.start}°`);
      }
      if (part.cutAngles.end) {
        notes.push(`End angle: ${part.cutAngles.end}°`);
      }
    }
    
    return notes.join('; ');
  }

  /**
   * Calculate total surface area for finishing
   */
  private calculateSurfaceArea(parts: FurniturePart[]): number {
    let totalArea = 0;
    
    parts.forEach(part => {
      const dims = part.dimensions;
      // Calculate surface area of a box (all 6 faces)
      const area = 2 * (dims.width * dims.height + 
                       dims.width * dims.depth + 
                       dims.height * dims.depth);
      totalArea += area;
    });
    
    // Convert to square feet and add 10% for waste
    return (totalArea * 144) * 1.1; // Convert square inches to square feet
  }

  /**
   * Create simple fallback model if advanced generation fails
   */
  private createFallbackModel(design: FurnitureDesign): THREE.Group {
    const group = new THREE.Group();
    const { width, height, depth } = design.dimensions;
    const scale = 1 / DIMENSIONS.INCH_TO_FEET;
    
    // Simple box representation
    const geometry = new THREE.BoxGeometry(
      width * scale, 
      height * scale, 
      depth * scale
    );
    
    const material = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.8,
      metalness: 0.1
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = (height / 2) * scale;
    
    group.add(mesh);
    
    // Add a label
    const labelSprite = this.createLabelSprite(design.name || design.furniture_type);
    labelSprite.position.y = height * scale + 0.5;
    group.add(labelSprite);
    
    return group;
  }

  /**
   * Create text label sprite
   */
  private createLabelSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = '24px Arial';
    context.fillStyle = 'black';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    
    sprite.scale.set(2, 0.5, 1);
    
    return sprite;
  }

  /**
   * Upload model to storage (placeholder)
   */
  private async uploadModel(gltf: any): Promise<string> {
    // TODO: Implement Supabase storage upload
    this.logger.info('Model upload not implemented yet');
    return '/placeholder-model-url';
  }
}
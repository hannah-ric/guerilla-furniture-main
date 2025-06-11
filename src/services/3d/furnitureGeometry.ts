/**
 * Advanced Parametric Furniture Geometry Generation System
 * 
 * This module implements sophisticated 3D geometry generation for furniture
 * with accurate joinery, material thickness, grain direction, and assembly details.
 */

import * as THREE from 'three';
import { FurnitureDesign, JoineryMethod, Material } from '@/lib/types';
import { CSG } from '@/services/3d/csg';
import { DIMENSIONS, MATERIALS } from '@/lib/constants';

export interface FurniturePart {
  id: string;
  name: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  dimensions: { width: number; height: number; depth: number };
  grainDirection: 'horizontal' | 'vertical' | 'none';
  cutAngles?: { start?: number; end?: number };
  joineryFeatures?: JoineryFeature[];
}

export interface JoineryFeature {
  type: 'mortise' | 'tenon' | 'dado' | 'rabbet' | 'dovetail' | 'pocket' | 'dowel';
  position: THREE.Vector3;
  dimensions: THREE.Vector3;
  rotation: THREE.Euler;
  depth: number;
}

export interface AssemblyStep {
  parts: string[];
  description: string;
  explodedOffset: THREE.Vector3;
  rotationOffset?: THREE.Euler;
}

export class FurnitureGeometryGenerator {
  private parts: Map<string, FurniturePart> = new Map();
  private assemblySteps: AssemblyStep[] = [];
  private materialLibrary: Map<string, THREE.Material> = new Map();
  
  constructor() {
    this.initializeMaterialLibrary();
  }

  /**
   * Generate complete furniture model with all parts and joinery
   */
  generateFurnitureModel(design: FurnitureDesign): {
    parts: FurniturePart[];
    assembly: THREE.Group;
    exploded: THREE.Group;
    boundingBox: THREE.Box3;
  } {
    this.parts.clear();
    this.assemblySteps = [];

    switch (design.furniture_type) {
      case 'table':
        this.generateTableParts(design);
        break;
      case 'bookshelf':
        this.generateBookshelfParts(design);
        break;
      case 'chair':
        this.generateChairParts(design);
        break;
      case 'cabinet':
        this.generateCabinetParts(design);
        break;
      case 'desk':
        this.generateDeskParts(design);
        break;
      default:
        this.generateGenericBoxParts(design);
    }

    // Apply joinery features
    this.applyJoineryFeatures(design.joinery || []);

    // Create assembled and exploded views
    const assembly = this.createAssembledModel();
    const exploded = this.createExplodedModel();
    const boundingBox = new THREE.Box3().setFromObject(assembly);

    return {
      parts: Array.from(this.parts.values()),
      assembly,
      exploded,
      boundingBox
    };
  }

  /**
   * Generate table parts with proper joinery
   */
  private generateTableParts(design: FurnitureDesign): void {
    this.parts.clear();
    this.assemblySteps = [];
    
    const material = this.getMaterial(design.materials?.[0]?.type || 'pine');
    const dims = design.dimensions;
    const scale = 1 / DIMENSIONS.INCH_TO_FEET;

    // Tabletop - accounting for edge banding or breadboard ends
    const topThickness = 1.5;
    const topOverhang = 2; // inches on each side
    
    const tabletop = this.createBoardWithGrain(
      'tabletop',
      'Tabletop',
      (dims.width + topOverhang * 2) * scale,
      topThickness * scale,
      (dims.depth + topOverhang * 2) * scale,
      material,
      'horizontal'
    );
    
    tabletop.position.set(0, (dims.height - topThickness / 2) * scale, 0);
    this.parts.set('tabletop', tabletop);

    // Legs with mortises for aprons
    const legSize = 3.5; // Standard table leg size
    const legHeight = dims.height - topThickness;
    
    const legPositions = [
      { x: (dims.width / 2 - legSize / 2 - 2), z: (dims.depth / 2 - legSize / 2 - 2) },
      { x: -(dims.width / 2 - legSize / 2 - 2), z: (dims.depth / 2 - legSize / 2 - 2) },
      { x: (dims.width / 2 - legSize / 2 - 2), z: -(dims.depth / 2 - legSize / 2 - 2) },
      { x: -(dims.width / 2 - legSize / 2 - 2), z: -(dims.depth / 2 - legSize / 2 - 2) }
    ];

    legPositions.forEach((pos, index) => {
      const leg = this.createTableLeg(
        `leg_${index + 1}`,
        `Leg ${index + 1}`,
        legSize * scale,
        legHeight * scale,
        material
      );
      
      leg.position.set(pos.x * scale, (legHeight / 2) * scale, pos.z * scale);
      
      // Add mortises for aprons
      leg.joineryFeatures = [
        {
          type: 'mortise',
          position: new THREE.Vector3(0, (legHeight - 8) * scale, legSize * scale / 2),
          dimensions: new THREE.Vector3(1 * scale, 3 * scale, 0.75 * scale),
          rotation: new THREE.Euler(0, 0, 0),
          depth: 1.5 * scale
        },
        {
          type: 'mortise',
          position: new THREE.Vector3(legSize * scale / 2, (legHeight - 8) * scale, 0),
          dimensions: new THREE.Vector3(0.75 * scale, 3 * scale, 1 * scale),
          rotation: new THREE.Euler(0, Math.PI / 2, 0),
          depth: 1.5 * scale
        }
      ];
      
      this.parts.set(`leg_${index + 1}`, leg);
    });

    // Aprons with tenons
    const apronHeight = 4;
    const apronThickness = 1;
    const apronInset = legSize + 2;
    
    // Long aprons
    for (let i = 0; i < 2; i++) {
      const apron = this.createApron(
        `apron_long_${i + 1}`,
        `Long Apron ${i + 1}`,
        (dims.width - 2 * apronInset) * scale,
        apronHeight * scale,
        apronThickness * scale,
        material,
        true // has tenons
      );
      
      const z = i === 0 ? (dims.depth / 2 - apronInset) : -(dims.depth / 2 - apronInset);
      apron.position.set(0, (dims.height - topThickness - apronHeight / 2 - 1) * scale, z * scale);
      
      this.parts.set(`apron_long_${i + 1}`, apron);
    }
    
    // Short aprons
    for (let i = 0; i < 2; i++) {
      const apron = this.createApron(
        `apron_short_${i + 1}`,
        `Short Apron ${i + 1}`,
        (dims.depth - 2 * apronInset) * scale,
        apronHeight * scale,
        apronThickness * scale,
        material,
        true
      );
      
      const x = i === 0 ? (dims.width / 2 - apronInset) : -(dims.width / 2 - apronInset);
      apron.position.set(x * scale, (dims.height - topThickness - apronHeight / 2 - 1) * scale, 0);
      apron.rotation.y = Math.PI / 2;
      
      this.parts.set(`apron_short_${i + 1}`, apron);
    }

    // Add stretchers if table is large
    if (dims.width > 48 || dims.depth > 30) {
      this.addTableStretchers(dims, material);
    }

    // Assembly steps
    this.assemblySteps = [
      {
        parts: ['leg_1', 'leg_2', 'apron_short_1'],
        description: 'Attach first short apron between two legs',
        explodedOffset: new THREE.Vector3(0, 0.5, 0)
      },
      {
        parts: ['leg_3', 'leg_4', 'apron_short_2'],
        description: 'Attach second short apron between remaining legs',
        explodedOffset: new THREE.Vector3(0, 0.5, 0)
      },
      {
        parts: ['apron_long_1', 'apron_long_2'],
        description: 'Connect the two sub-assemblies with long aprons',
        explodedOffset: new THREE.Vector3(0, 0.5, 0)
      },
      {
        parts: ['tabletop'],
        description: 'Attach tabletop to base assembly',
        explodedOffset: new THREE.Vector3(0, 1, 0)
      }
    ];
  }

  /**
   * Generate bookshelf parts with dados and adjustable shelf holes
   */
  private generateBookshelfParts(design: FurnitureDesign): void {
    const dims = design.dimensions;
    const material = this.getMaterial(design.materials?.[0]?.type || 'pine');
    const scale = 1 / DIMENSIONS.INCH_TO_FEET;
    const thickness = 0.75;
    
    // Sides with dado joints and shelf pin holes
    const sides = ['left', 'right'];
    sides.forEach((side, index) => {
      const sidePanel = this.createBoardWithGrain(
        `side_${side}`,
        `${side.charAt(0).toUpperCase() + side.slice(1)} Side`,
        dims.depth * scale,
        dims.height * scale,
        thickness * scale,
        material,
        'vertical'
      );
      
      const x = side === 'left' ? -(dims.width / 2 - thickness / 2) : (dims.width / 2 - thickness / 2);
      sidePanel.position.set(x * scale, (dims.height / 2) * scale, 0);
      sidePanel.rotation.y = Math.PI / 2;
      
      // Add dados for fixed shelves
      const numShelves = Math.floor(dims.height / 16);
      const shelfSpacing = dims.height / (numShelves + 1);
      
      sidePanel.joineryFeatures = [];
      
      // Bottom dado
      sidePanel.joineryFeatures.push({
        type: 'dado',
        position: new THREE.Vector3(0, -(dims.height / 2 - thickness / 2) * scale, 0),
        dimensions: new THREE.Vector3(dims.depth * scale, thickness * scale, thickness * scale / 2),
        rotation: new THREE.Euler(0, 0, 0),
        depth: thickness * scale / 2
      });
      
      // Top dado
      sidePanel.joineryFeatures.push({
        type: 'dado',
        position: new THREE.Vector3(0, (dims.height / 2 - thickness / 2) * scale, 0),
        dimensions: new THREE.Vector3(dims.depth * scale, thickness * scale, thickness * scale / 2),
        rotation: new THREE.Euler(0, 0, 0),
        depth: thickness * scale / 2
      });
      
      // Shelf pin holes for adjustable shelves
      for (let i = 1; i < numShelves; i++) {
        const y = -(dims.height / 2) + shelfSpacing * i;
        for (let j = 0; j < 2; j++) {
          const z = j === 0 ? (dims.depth / 2 - 2) : -(dims.depth / 2 - 2);
          sidePanel.joineryFeatures.push({
            type: 'dowel',
            position: new THREE.Vector3(0, y * scale, z * scale),
            dimensions: new THREE.Vector3(0.25 * scale, 0.25 * scale, 0.25 * scale),
            rotation: new THREE.Euler(0, 0, 0),
            depth: 0.5 * scale
          });
        }
      }
      
      this.parts.set(`side_${side}`, sidePanel);
    });
    
    // Fixed shelves (top and bottom)
    ['bottom', 'top'].forEach((position) => {
      const shelf = this.createShelf(
        `shelf_${position}`,
        `${position.charAt(0).toUpperCase() + position.slice(1)} Shelf`,
        (dims.width - 2 * thickness) * scale,
        thickness * scale,
        dims.depth * scale,
        material,
        true // fixed shelf with rabbets
      );
      
      const y = position === 'bottom' ? thickness / 2 : dims.height - thickness / 2;
      shelf.position.set(0, y * scale, 0);
      
      this.parts.set(`shelf_${position}`, shelf);
    });
    
    // Adjustable shelves
    const numAdjustable = Math.floor(dims.height / 16) - 1;
    for (let i = 0; i < numAdjustable; i++) {
      const shelf = this.createShelf(
        `shelf_adjustable_${i + 1}`,
        `Adjustable Shelf ${i + 1}`,
        (dims.width - 2 * thickness - 0.125) * scale, // Slight clearance
        thickness * scale,
        (dims.depth - 0.25) * scale, // Clearance for easy insertion
        material,
        false // adjustable shelf, no rabbets
      );
      
      const y = thickness + (i + 1) * (dims.height - 2 * thickness) / (numAdjustable + 1);
      shelf.position.set(0, y * scale, 0);
      
      this.parts.set(`shelf_adjustable_${i + 1}`, shelf);
    }
    
    // Back panel (if specified)
    if (design.features?.includes('back_panel')) {
      const backPanel = this.createBoardWithGrain(
        'back_panel',
        'Back Panel',
        dims.width * scale,
        dims.height * scale,
        0.25 * scale,
        this.getMaterial('plywood'),
        'vertical'
      );
      
      backPanel.position.set(0, (dims.height / 2) * scale, -(dims.depth / 2 - 0.25 / 2) * scale);
      
      // Add rabbet joints to sides for back panel
      this.parts.forEach((part, key) => {
        if (key.startsWith('side_')) {
          part.joineryFeatures?.push({
            type: 'rabbet',
            position: new THREE.Vector3(0, 0, -(dims.depth / 2 - 0.25 / 2) * scale),
            dimensions: new THREE.Vector3(dims.height * scale, 0.25 * scale, 0.25 * scale),
            rotation: new THREE.Euler(0, 0, 0),
            depth: 0.25 * scale
          });
        }
      });
      
      this.parts.set('back_panel', backPanel);
    }
  }

  /**
   * Create a board with proper wood grain texture and direction
   */
  private createBoardWithGrain(
    id: string,
    name: string,
    width: number,
    height: number,
    depth: number,
    material: THREE.Material,
    grainDirection: 'horizontal' | 'vertical' | 'none'
  ): FurniturePart {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    
    // Apply UV mapping based on grain direction
    if (grainDirection !== 'none') {
      this.applyGrainUVMapping(geometry, grainDirection);
    }
    
    // Round edges slightly for realism
    const roundedGeometry = this.roundEdges(geometry, Math.min(width, height, depth) * 0.02);
    
    return {
      id,
      name,
      geometry: roundedGeometry,
      material,
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      dimensions: { width, height, depth },
      grainDirection,
      joineryFeatures: []
    };
  }

  /**
   * Create table leg with optional taper
   */
  private createTableLeg(
    id: string,
    name: string,
    size: number,
    height: number,
    material: THREE.Material
  ): FurniturePart {
    // Create tapered leg geometry
    const topSize = size;
    const bottomSize = size * 0.7; // Slight taper
    const taperStart = height * 0.3; // Taper starts 30% from bottom
    
    const shape = new THREE.Shape();
    shape.moveTo(-topSize / 2, -topSize / 2);
    shape.lineTo(topSize / 2, -topSize / 2);
    shape.lineTo(topSize / 2, topSize / 2);
    shape.lineTo(-topSize / 2, topSize / 2);
    shape.closePath();
    
    const extrudeSettings = {
      steps: 2,
      depth: height,
      bevelEnabled: true,
      bevelThickness: size * 0.02,
      bevelSize: size * 0.02,
      bevelSegments: 2
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -height / 2, 0);
    
    // Apply taper by scaling vertices
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i) + height / 2;
      if (y < taperStart) {
        const taperFactor = 1 - (1 - bottomSize / topSize) * (taperStart - y) / taperStart;
        positions.setX(i, positions.getX(i) * taperFactor);
        positions.setZ(i, positions.getZ(i) * taperFactor);
      }
    }
    
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    
    return {
      id,
      name,
      geometry,
      material,
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      dimensions: { width: size, height, depth: size },
      grainDirection: 'vertical',
      joineryFeatures: []
    };
  }

  /**
   * Create apron with tenons
   */
  private createApron(
    id: string,
    name: string,
    length: number,
    height: number,
    thickness: number,
    material: THREE.Material,
    hasTenons: boolean
  ): FurniturePart {
    let geometry: THREE.BufferGeometry;
    
    if (hasTenons) {
      // Create apron with tenons
      const tenonLength = 1.5 * (1 / DIMENSIONS.INCH_TO_FEET);
      const tenonHeight = height * 0.75;
      const tenonThickness = thickness / 3;
      
      // Main body
      const mainBody = new THREE.BoxGeometry(length - 2 * tenonLength, height, thickness);
      
      // Tenons
      const tenon1 = new THREE.BoxGeometry(tenonLength, tenonHeight, tenonThickness);
      tenon1.translate(-(length / 2 - tenonLength / 2), 0, 0);
      
      const tenon2 = new THREE.BoxGeometry(tenonLength, tenonHeight, tenonThickness);
      tenon2.translate(length / 2 - tenonLength / 2, 0, 0);
      
      // Combine geometries
      geometry = this.mergeGeometries([mainBody, tenon1, tenon2]);
    } else {
      geometry = new THREE.BoxGeometry(length, height, thickness);
    }
    
    // Round edges
    geometry = this.roundEdges(geometry, thickness * 0.1);
    
    return {
      id,
      name,
      geometry,
      material,
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      dimensions: { width: length, height, depth: thickness },
      grainDirection: 'horizontal',
      joineryFeatures: []
    };
  }

  /**
   * Create shelf with optional edge treatment
   */
  private createShelf(
    id: string,
    name: string,
    width: number,
    height: number,
    depth: number,
    material: THREE.Material,
    isFixed: boolean
  ): FurniturePart {
    let geometry: THREE.BufferGeometry = new THREE.BoxGeometry(width, height, depth);
    
    if (isFixed) {
      // Add rabbets for fixed shelf
      // This would involve CSG operations in a full implementation
    }
    
    // Add edge banding visualization
    const edgeBanding = this.createEdgeBanding(geometry as THREE.BoxGeometry);
    if (edgeBanding) {
      geometry = this.mergeGeometries([geometry, edgeBanding]);
    }
    
    return {
      id,
      name,
      geometry,
      material,
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      dimensions: { width, height, depth },
      grainDirection: 'horizontal',
      joineryFeatures: []
    };
  }

  /**
   * Apply joinery features using CSG operations
   */
  private applyJoineryFeatures(joineryMethods: JoineryMethod[]): void {
    this.parts.forEach((part) => {
      if (part.joineryFeatures && part.joineryFeatures.length > 0) {
        let modifiedGeometry = part.geometry;
        
        part.joineryFeatures.forEach((feature) => {
          // Apply CSG subtraction for mortises, dados, rabbets
          if (['mortise', 'dado', 'rabbet', 'pocket', 'dowel'].includes(feature.type)) {
            const position = feature.position.clone();
            const rotation = feature.rotation.clone();
            
            switch (feature.type) {
              case 'mortise':
                modifiedGeometry = CSG.createMortise(
                  modifiedGeometry,
                  feature.dimensions.x,
                  feature.dimensions.y,
                  feature.depth,
                  position,
                  rotation
                );
                break;
                
              case 'dado':
                modifiedGeometry = CSG.createDado(
                  modifiedGeometry,
                  feature.dimensions.x,
                  feature.depth,
                  feature.dimensions.z,
                  position,
                  rotation
                );
                break;
                
              case 'rabbet':
                modifiedGeometry = CSG.createRabbet(
                  modifiedGeometry,
                  feature.dimensions.x,
                  feature.depth,
                  feature.dimensions.z,
                  position,
                  rotation
                );
                break;
                
              case 'pocket':
                // Pocket holes at an angle
                modifiedGeometry = CSG.createPocketHole(
                  modifiedGeometry,
                  0.375, // 3/8" pocket hole
                  feature.depth,
                  position,
                  15 // 15 degree angle
                );
                break;
                
              case 'dowel':
                modifiedGeometry = CSG.createDowelHole(
                  modifiedGeometry,
                  feature.dimensions.x, // diameter
                  feature.depth,
                  position,
                  new THREE.Vector3(0, 1, 0) // vertical by default
                );
                break;
            }
          }
        });
        
        // Update part geometry
        part.geometry.dispose();
        part.geometry = modifiedGeometry;
      }
    });
  }

  /**
   * Create assembled model
   */
  private createAssembledModel(): THREE.Group {
    const group = new THREE.Group();
    
    this.parts.forEach((part) => {
      const mesh = new THREE.Mesh(part.geometry, part.material);
      mesh.position.copy(part.position);
      mesh.rotation.copy(part.rotation);
      mesh.name = part.id;
      
      // Add grain direction indicator
      if (part.grainDirection !== 'none') {
        const grainIndicator = this.createGrainDirectionIndicator(part);
        mesh.add(grainIndicator);
      }
      
      group.add(mesh);
    });
    
    return group;
  }

  /**
   * Create exploded view model
   */
  private createExplodedModel(): THREE.Group {
    const group = new THREE.Group();
    const explodeDistance = 0.5; // Base explosion distance
    
    this.parts.forEach((part) => {
      const mesh = new THREE.Mesh(part.geometry, part.material);
      mesh.position.copy(part.position);
      mesh.rotation.copy(part.rotation);
      
      // Apply explosion offset based on assembly steps
      const step = this.assemblySteps.find(s => s.parts.includes(part.id));
      if (step) {
        const offset = step.explodedOffset.clone().multiplyScalar(explodeDistance);
        mesh.position.add(offset);
        
        if (step.rotationOffset) {
          mesh.rotation.x += step.rotationOffset.x;
          mesh.rotation.y += step.rotationOffset.y;
          mesh.rotation.z += step.rotationOffset.z;
        }
      }
      
      mesh.name = part.id;
      group.add(mesh);
      
      // Add assembly lines
      if (step) {
        const line = this.createAssemblyLine(part.position, mesh.position);
        group.add(line);
      }
    });
    
    return group;
  }

  /**
   * Create grain direction indicator
   */
  private createGrainDirectionIndicator(part: FurniturePart): THREE.Object3D {
    const group = new THREE.Group();
    
    // Create arrow showing grain direction
    const arrowLength = Math.min(part.dimensions.width, part.dimensions.height) * 0.2;
    const arrowGeometry = new THREE.ConeGeometry(arrowLength * 0.1, arrowLength * 0.3, 4);
    const arrowMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x666666, 
      transparent: true, 
      opacity: 0.5 
    });
    
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    
    if (part.grainDirection === 'horizontal') {
      arrow.rotation.z = -Math.PI / 2;
      arrow.position.x = arrowLength * 0.15;
    } else {
      arrow.position.y = arrowLength * 0.15;
    }
    
    group.add(arrow);
    
    // Add grain lines
    const lineCount = 5;
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0x999999, 
      transparent: true, 
      opacity: 0.3 
    });
    
    for (let i = 0; i < lineCount; i++) {
      const points = [];
      
      if (part.grainDirection === 'horizontal') {
        const y = (i / (lineCount - 1) - 0.5) * part.dimensions.height * 0.8;
        points.push(new THREE.Vector3(-part.dimensions.width * 0.4, y, part.dimensions.depth * 0.501));
        points.push(new THREE.Vector3(part.dimensions.width * 0.4, y, part.dimensions.depth * 0.501));
      } else {
        const x = (i / (lineCount - 1) - 0.5) * part.dimensions.width * 0.8;
        points.push(new THREE.Vector3(x, -part.dimensions.height * 0.4, part.dimensions.depth * 0.501));
        points.push(new THREE.Vector3(x, part.dimensions.height * 0.4, part.dimensions.depth * 0.501));
      }
      
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      group.add(line);
    }
    
    return group;
  }

  /**
   * Create assembly line for exploded view
   */
  private createAssemblyLine(start: THREE.Vector3, end: THREE.Vector3): THREE.Line {
    const points = [start, end];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: 0x0066ff,
      dashSize: 0.1,
      gapSize: 0.05,
      transparent: true,
      opacity: 0.5
    });
    
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    
    return line;
  }

  /**
   * Initialize material library with realistic wood materials
   */
  private initializeMaterialLibrary(): void {
    // Pine material
    const pineTexture = this.createWoodTexture('pine', 0xDEB887);
    this.materialLibrary.set('pine', new THREE.MeshStandardMaterial({
      map: pineTexture,
      roughness: 0.8,
      metalness: 0,
      bumpScale: 0.002
    }));
    
    // Oak material
    const oakTexture = this.createWoodTexture('oak', 0xA0522D);
    this.materialLibrary.set('oak', new THREE.MeshStandardMaterial({
      map: oakTexture,
      roughness: 0.7,
      metalness: 0,
      bumpScale: 0.003
    }));
    
    // Maple material
    const mapleTexture = this.createWoodTexture('maple', 0xFFDEAD);
    this.materialLibrary.set('maple', new THREE.MeshStandardMaterial({
      map: mapleTexture,
      roughness: 0.6,
      metalness: 0,
      bumpScale: 0.001
    }));
    
    // Walnut material
    const walnutTexture = this.createWoodTexture('walnut', 0x654321);
    this.materialLibrary.set('walnut', new THREE.MeshStandardMaterial({
      map: walnutTexture,
      roughness: 0.7,
      metalness: 0,
      bumpScale: 0.004
    }));
    
    // Plywood material
    const plywoodTexture = this.createPlywoodTexture();
    this.materialLibrary.set('plywood', new THREE.MeshStandardMaterial({
      map: plywoodTexture,
      roughness: 0.9,
      metalness: 0
    }));
    
    // MDF material
    this.materialLibrary.set('mdf', new THREE.MeshStandardMaterial({
      color: 0xE8D7C3,
      roughness: 0.95,
      metalness: 0
    }));
  }

  /**
   * Create procedural wood texture
   */
  private createWoodTexture(woodType: string, baseColor: number): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d')!;
    
    // Base color
    const color = new THREE.Color(baseColor);
    context.fillStyle = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add wood grain pattern
    const grainCount = woodType === 'pine' ? 20 : woodType === 'oak' ? 30 : 25;
    const grainVariation = woodType === 'walnut' ? 0.3 : 0.2;
    
    context.strokeStyle = `rgba(0, 0, 0, 0.1)`;
    context.lineWidth = 1;
    
    for (let i = 0; i < grainCount; i++) {
      context.beginPath();
      
      const y = (i / grainCount) * canvas.height;
      context.moveTo(0, y);
      
      for (let x = 0; x < canvas.width; x += 10) {
        const variance = Math.sin(x * 0.01 + i) * grainVariation * 10;
        context.lineTo(x, y + variance);
      }
      
      context.stroke();
    }
    
    // Add knots for certain wood types
    if (woodType === 'pine' || woodType === 'oak') {
      const knotCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < knotCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 20 + 10;
        
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(0, 0, 0, 0.2)`;
        context.fill();
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    
    return texture;
  }

  /**
   * Create plywood edge texture
   */
  private createPlywoodTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;
    
    // Draw plywood layers
    const layers = 7;
    const layerHeight = canvas.height / layers;
    
    for (let i = 0; i < layers; i++) {
      const lightness = i % 2 === 0 ? 0.8 : 0.6;
      context.fillStyle = `hsl(30, 30%, ${lightness * 100}%)`;
      context.fillRect(0, i * layerHeight, canvas.width, layerHeight);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    
    return texture;
  }

  /**
   * Apply grain-aware UV mapping
   */
  private applyGrainUVMapping(geometry: THREE.BoxGeometry, grainDirection: 'horizontal' | 'vertical'): void {
    const uvAttribute = geometry.attributes.uv;
    const uvArray = uvAttribute.array as Float32Array;
    
    // Box geometry has 6 faces, 4 vertices per face, 2 UV coordinates per vertex
    // Face order: +X, -X, +Y, -Y, +Z, -Z
    
    if (grainDirection === 'horizontal') {
      // Grain runs along X axis
      for (let face = 0; face < 6; face++) {
        const baseIndex = face * 8; // 4 vertices * 2 coordinates
        
        if (face === 2 || face === 3) { // Top and bottom faces
          // Rotate UVs 90 degrees for top/bottom to align grain
          for (let i = 0; i < 4; i++) {
            const u = uvArray[baseIndex + i * 2];
            const v = uvArray[baseIndex + i * 2 + 1];
            uvArray[baseIndex + i * 2] = 1 - v;
            uvArray[baseIndex + i * 2 + 1] = u;
          }
        }
      }
    } else if (grainDirection === 'vertical') {
      // Grain runs along Y axis - default UV mapping works
      // No changes needed
    }
    
    uvAttribute.needsUpdate = true;
  }

  /**
   * Round edges of geometry for realism
   */
  private roundEdges(geometry: THREE.BufferGeometry, radius: number): THREE.BufferGeometry {
    // Use CSG roundEdges if available, otherwise create beveled geometry
    if (CSG.roundEdges) {
      return CSG.roundEdges(geometry, radius, 4);
    }
    
    // Fallback: Create a slightly beveled box
    if (geometry instanceof THREE.BoxGeometry) {
      const params = geometry.parameters;
      const width = params.width;
      const height = params.height;
      const depth = params.depth;
      
      // Create beveled box geometry
      const shape = new THREE.Shape();
      const r = Math.min(radius, width * 0.1, height * 0.1); // Limit radius
      
      // Create rounded rectangle
      shape.moveTo(-width/2 + r, -height/2);
      shape.lineTo(width/2 - r, -height/2);
      shape.quadraticCurveTo(width/2, -height/2, width/2, -height/2 + r);
      shape.lineTo(width/2, height/2 - r);
      shape.quadraticCurveTo(width/2, height/2, width/2 - r, height/2);
      shape.lineTo(-width/2 + r, height/2);
      shape.quadraticCurveTo(-width/2, height/2, -width/2, height/2 - r);
      shape.lineTo(-width/2, -height/2 + r);
      shape.quadraticCurveTo(-width/2, -height/2, -width/2 + r, -height/2);
      
      const extrudeSettings = {
        depth: depth,
        bevelEnabled: true,
        bevelThickness: radius * 0.5,
        bevelSize: radius * 0.5,
        bevelSegments: 2
      };
      
      const roundedGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      roundedGeometry.center();
      
      return roundedGeometry;
    }
    
    // Default: return original
    return geometry;
  }

  /**
   * Merge multiple geometries
   */
  private mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    if (geometries.length === 0) {
      return new THREE.BufferGeometry();
    }
    
    if (geometries.length === 1) {
      return geometries[0];
    }
    
    // Use CSG union to merge geometries
    let merged = geometries[0];
    
    for (let i = 1; i < geometries.length; i++) {
      merged = CSG.union(
        merged,
        geometries[i],
        new THREE.Vector3(0, 0, 0),
        new THREE.Euler(0, 0, 0)
      );
    }
    
    return merged;
  }

  /**
   * Create edge banding geometry
   */
  private createEdgeBanding(shelfGeometry: THREE.BoxGeometry): THREE.BufferGeometry | null {
    const params = shelfGeometry.parameters;
    const width = params.width;
    const height = params.height;
    const depth = params.depth;
    const bandingThickness = 0.04; // 1mm edge banding
    
    // Create edge banding strips
    const frontBanding = new THREE.BoxGeometry(width, height, bandingThickness);
    frontBanding.translate(0, 0, depth/2 + bandingThickness/2);
    
    // Apply wood grain texture differently for edge banding
    const bandingMaterial = this.getMaterial('oak'); // Contrasting material
    
    return frontBanding;
  }

  /**
   * Add table stretchers for stability
   */
  private addTableStretchers(dims: any, material: THREE.Material): void {
    const scale = 1 / DIMENSIONS.INCH_TO_FEET;
    const stretcherHeight = 3 * scale;
    const stretcherThickness = 1.5 * scale;
    const stretcherInset = 6 * scale;
    
    // H-stretcher configuration
    // Cross piece
    const crossStretcher = this.createBoardWithGrain(
      'stretcher_cross',
      'Cross Stretcher',
      (dims.width - 2 * stretcherInset) * scale,
      stretcherHeight,
      stretcherThickness,
      material,
      'horizontal'
    );
    
    crossStretcher.position.set(
      0,
      10 * scale, // 10 inches from floor
      0
    );
    
    this.parts.set('stretcher_cross', crossStretcher);
    
    // Side pieces
    for (let i = 0; i < 2; i++) {
      const sideStretcher = this.createBoardWithGrain(
        `stretcher_side_${i + 1}`,
        `Side Stretcher ${i + 1}`,
        (dims.depth - 2 * stretcherInset) * scale / 2,
        stretcherHeight,
        stretcherThickness,
        material,
        'horizontal'
      );
      
      const x = i === 0 ? -(dims.width / 4) : (dims.width / 4);
      sideStretcher.position.set(
        x * scale,
        10 * scale,
        0
      );
      sideStretcher.rotation.y = Math.PI / 2;
      
      // Add half-lap joints where stretchers meet
      sideStretcher.joineryFeatures = [{
        type: 'dado',
        position: new THREE.Vector3(0, 0, 0),
        dimensions: new THREE.Vector3(stretcherThickness, stretcherHeight / 2, stretcherThickness),
        rotation: new THREE.Euler(0, 0, 0),
        depth: stretcherHeight / 2
      }];
      
      this.parts.set(`stretcher_side_${i + 1}`, sideStretcher);
    }
  }

  /**
   * Get material for a given wood type
   */
  private getMaterial(woodType: string): THREE.Material {
    const woodTypes: Record<string, { color: number; roughness: number }> = {
      'pine': { color: 0xD4A76A, roughness: 0.8 },
      'oak': { color: 0x8B4513, roughness: 0.7 },
      'maple': { color: 0xE5D4A1, roughness: 0.6 },
      'walnut': { color: 0x5C4033, roughness: 0.6 },
      'cherry': { color: 0x8B4513, roughness: 0.6 },
      'plywood': { color: 0xDEB887, roughness: 0.9 }
    };
    
    const wood = woodTypes[woodType] || woodTypes['pine'];
    
    return new THREE.MeshStandardMaterial({
      color: wood.color,
      roughness: wood.roughness,
      metalness: 0.1,
      map: this.createWoodTexture(woodType, wood.color)
    });
  }

  /**
   * Additional furniture type generators would go here...
   */
  private generateChairParts(design: FurnitureDesign): void {
    // Implement chair with proper joinery, curved backs, etc.
  }

  private generateCabinetParts(design: FurnitureDesign): void {
    // Implement cabinet with doors, drawers, hardware
  }

  private generateDeskParts(design: FurnitureDesign): void {
    // Implement desk with drawers, cable management, etc.
  }

  private generateGenericBoxParts(design: FurnitureDesign): void {
    // Fallback for unknown furniture types
  }
} 
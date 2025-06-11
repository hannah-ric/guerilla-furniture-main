// services/knowledgeGraph/FurnitureKnowledgeGraph.ts
// Complete knowledge graph implementation for furniture design

import { 
    KnowledgeNode,
    ValidationResult,
    Dimensions,
    Material,
    MaterialProperties,
    JoineryType,
    FurnitureType,
    MaterialType,
    WoodSpecies,
    Joinery,
    Relationship,
    RelationshipType,
    FurnitureDesign,
    CompatibilityRule
  } from '@/lib/types';
  
  interface SpanTable {
    [thickness: string]: {
      [material: string]: number; // max span in inches
    };
  }
  
  interface JointStrengthTable {
    [jointType: string]: {
      [material: string]: {
        shear: number;  // pounds
        tension: number; // pounds
        compression: number; // pounds
      };
    };
  }
  
  /**
   * Central knowledge repository for furniture design
   * Contains engineering data, compatibility rules, and design patterns
   */
  export class FurnitureKnowledgeGraph {
    private static instance: FurnitureKnowledgeGraph;
    private nodes: Map<string, KnowledgeNode> = new Map();
    
    // Engineering tables
    private spanTables: Map<string, any>;
    private jointStrengthTable: JointStrengthTable;
    public materialProperties: Map<string, MaterialProperties>;
    
    // Compatibility matrices
    private materialJoineryCompatibility: Map<string, Set<string>>;
    private toolRequirements: Map<string, Set<string>>;
    
    // Design patterns
    private furnitureTemplates: Map<FurnitureType, any>;
    private furnitureTypes: Map<string, any>;
    private joineryMethods: Map<string, any>;
    
    private constructor() {
      this.spanTables = new Map();
      this.jointStrengthTable = {} as JointStrengthTable;
      this.materialProperties = new Map();
      this.materialJoineryCompatibility = new Map();
      this.toolRequirements = new Map();
      this.furnitureTemplates = new Map();
      this.furnitureTypes = new Map();
      this.joineryMethods = new Map();
      this.initializeMaterialProperties();
      this.initializeSpanTables();
      this.initializeJointStrengthTables();
      this.initializeCompatibilityMatrices();
      this.initializeFurnitureTemplates();
      this.buildKnowledgeGraph();
    }
  
    public static getInstance(): FurnitureKnowledgeGraph {
      if (!FurnitureKnowledgeGraph.instance) {
        FurnitureKnowledgeGraph.instance = new FurnitureKnowledgeGraph();
      }
      return FurnitureKnowledgeGraph.instance;
    }
  
    /**
     * Initialize material properties database
     */
    private initializeMaterialProperties() {
      const properties = new Map<string, MaterialProperties>();
      
      // Solid woods with complete properties
      properties.set('pine', {
        cost_per_board_foot: 4.5,
        workability: 'easy',
        durability: 'moderate',
        indoor_outdoor: 'indoor',
        hardness: 420,
        modulus_rupture: 8700,
        modulus_elasticity: 1200000,
        density: 25
      });

      properties.set('oak', {
        cost_per_board_foot: 8.5,
        workability: 'moderate',
        durability: 'high',
        indoor_outdoor: 'both',
        hardness: 1290,
        modulus_rupture: 14300,
        modulus_elasticity: 1780000,
        density: 44
      });

      properties.set('maple', {
        cost_per_board_foot: 10.0,
        workability: 'moderate',
        durability: 'high',
        indoor_outdoor: 'indoor',
        hardness: 1450,
        modulus_rupture: 15800,
        modulus_elasticity: 1830000,
        density: 43
      });

      properties.set('walnut', {
        cost_per_board_foot: 18.0,
        workability: 'easy',
        durability: 'high',
        indoor_outdoor: 'indoor',
        hardness: 1010,
        modulus_rupture: 14600,
        modulus_elasticity: 1680000,
        density: 38
      });

      properties.set('cherry', {
        cost_per_board_foot: 12.0,
        workability: 'easy',
        durability: 'high',
        indoor_outdoor: 'indoor',
        hardness: 950,
        modulus_rupture: 12300,
        modulus_elasticity: 1490000,
        density: 35
      });

      // Sheet goods
      properties.set('plywood', {
        cost_per_board_foot: 6.0,
        workability: 'easy',
        durability: 'moderate',
        indoor_outdoor: 'indoor',
        hardness: 500,
        modulus_rupture: 4500,
        modulus_elasticity: 900000,
        density: 35
      });

      properties.set('mdf', {
        cost_per_board_foot: 3.5,
        workability: 'easy',
        durability: 'low',
        indoor_outdoor: 'indoor',
        hardness: 200,
        modulus_rupture: 3500,
        modulus_elasticity: 400000,
        density: 45
      });

      this.materialProperties = properties;
    }
  
    /**
     * Initialize span tables for shelf sag calculations
     * Based on 35 lb/ft load and 1/8" deflection limit
     */
    private initializeSpanTables() {
      this.spanTables = new Map([
        ['oak_1x4', {
          max_span: 24,
          max_load: 50,
          unit: 'inches'
        }]
      ]);
    }
  
    /**
     * Initialize joint strength data
     */
    private initializeJointStrengthTables() {
      this.jointStrengthTable = {
        'mortise_tenon': {
          'pine': { shear: 1200, tension: 800, compression: 2000 },
          'oak_red': { shear: 1800, tension: 1200, compression: 3000 },
          'maple_hard': { shear: 2000, tension: 1400, compression: 3200 }
        },
        'dovetail': {
          'pine': { shear: 1000, tension: 600, compression: 1800 },
          'oak_red': { shear: 1500, tension: 900, compression: 2700 },
          'maple_hard': { shear: 1700, tension: 1000, compression: 2900 }
        },
        'dowel': {
          'pine': { shear: 600, tension: 400, compression: 1000 },
          'oak_red': { shear: 900, tension: 600, compression: 1500 },
          'maple_hard': { shear: 1000, tension: 700, compression: 1700 }
        },
        'pocket_hole': {
          'pine': { shear: 400, tension: 250, compression: 800 },
          'oak_red': { shear: 600, tension: 400, compression: 1200 },
          'maple_hard': { shear: 700, tension: 450, compression: 1300 },
          'plywood_birch': { shear: 500, tension: 300, compression: 900 }
        },
        'biscuit': {
          'pine': { shear: 300, tension: 200, compression: 600 },
          'oak_red': { shear: 450, tension: 300, compression: 900 },
          'plywood_birch': { shear: 400, tension: 250, compression: 800 }
        },
        'screw': {
          'pine': { shear: 200, tension: 150, compression: 400 },
          'oak_red': { shear: 300, tension: 225, compression: 600 },
          'mdf': { shear: 150, tension: 100, compression: 300 }
        }
      };
    }
  
    /**
     * Initialize compatibility rules
     */
    private initializeCompatibilityMatrices() {
      // Material-Joinery compatibility
      this.materialJoineryCompatibility = new Map([
        ['pine', new Set(['mortise_tenon', 'dovetail', 'dowel', 'pocket_hole', 'biscuit', 'screw'])],
        ['oak_red', new Set(['mortise_tenon', 'dovetail', 'dowel', 'pocket_hole', 'biscuit'])],
        ['maple_hard', new Set(['mortise_tenon', 'dovetail', 'dowel', 'pocket_hole'])],
        ['plywood_birch', new Set(['pocket_hole', 'biscuit', 'screw', 'dado', 'rabbet'])],
        ['mdf', new Set(['pocket_hole', 'screw', 'dado', 'rabbet'])]
      ]);
  
      // Tool requirements for joinery
      this.toolRequirements = new Map([
        ['mortise_tenon', new Set(['chisel', 'drill', 'saw', 'marking_gauge'])],
        ['dovetail', new Set(['dovetail_saw', 'chisel', 'marking_gauge'])],
        ['dowel', new Set(['drill', 'dowel_centers', 'saw'])],
        ['pocket_hole', new Set(['pocket_hole_jig', 'drill'])],
        ['biscuit', new Set(['biscuit_joiner', 'clamps'])],
        ['dado', new Set(['table_saw', 'router'])],
        ['rabbet', new Set(['table_saw', 'router'])],
        ['screw', new Set(['drill', 'screwdriver'])]
      ]);
    }
  
    /**
     * Initialize furniture design templates
     */
    private initializeFurnitureTemplates() {
      this.furnitureTemplates = new Map([
        ['bookshelf', {
          standard_dimensions: { width: 32, height: 72, depth: 12 },
          shelf_spacing: { min: 9, max: 16, typical: 12 },
          material_thickness: { shelves: 0.75, sides: 0.75, back: 0.25 },
          typical_joints: ['dado', 'screw', 'dowel'],
          load_per_shelf: 40, // pounds
          features: ['adjustable_shelves', 'back_panel', 'anti_tip']
        }],
        ['table', {
          standard_dimensions: { 
            dining: { width: 36, length: 72, height: 30 },
            coffee: { width: 24, length: 48, height: 17 },
            end: { width: 20, length: 20, height: 24 }
          },
          apron_setback: 3,
          leg_thickness: { min: 2, typical: 3 },
          typical_joints: ['mortise_tenon', 'dowel', 'pocket_hole'],
          features: ['leaves', 'drawers', 'lower_shelf']
        }],
        ['chair', {
          standard_dimensions: { 
            seat: { width: 18, depth: 16, height: 17 },
            back: { height_above_seat: 18, angle: 10 } // degrees
          },
          typical_joints: ['mortise_tenon', 'dowel'],
          load_capacity: 300, // pounds
          features: ['arms', 'cushion', 'rockers']
        }],
        ['nightstand', {
          standard_dimensions: { width: 20, height: 26, depth: 16 },
          drawer_height: { min: 4, max: 8 },
          typical_joints: ['dovetail', 'pocket_hole', 'biscuit'],
          features: ['drawer', 'shelf', 'cable_management']
        }]
      ]);
    }
  
    /**
     * Build the knowledge graph nodes and relationships
     */
    private buildKnowledgeGraph() {
      // Create material nodes
      for (const [materialId, props] of this.materialProperties) {
        this.nodes.set(materialId, {
          id: materialId,
          type: 'material',
          name: materialId.replace('_', ' '),
          properties: props,
          relationships: []
        });
      }
  
      // Create joinery nodes
      for (const jointType of Object.keys(this.jointStrengthTable)) {
        this.nodes.set(jointType, {
          id: jointType,
          type: 'joinery',
          name: jointType.replace('_', ' '),
          properties: this.jointStrengthTable[jointType],
          relationships: []
        });
      }
  
      // Build relationships
      this.buildMaterialJoineryRelationships();
      this.buildStrengthRelationships();
    }
  
    private buildMaterialJoineryRelationships() {
      for (const [material, joints] of this.materialJoineryCompatibility) {
        const materialNode = this.nodes.get(material);
        if (!materialNode) continue;
  
        for (const joint of joints) {
          const jointNode = this.nodes.get(joint);
          if (!jointNode) continue;
  
          // Material -> Joint relationship
          materialNode.relationships.push({
            type: 'compatible_with',
            target_id: joint,
            strength: 1.0,
            metadata: { reason: 'proven_compatibility' }
          });
  
          // Joint -> Material relationship
          jointNode.relationships.push({
            type: 'compatible_with',
            target_id: material,
            strength: 1.0,
            metadata: { reason: 'proven_compatibility' }
          });
        }
      }
    }
  
    private buildStrengthRelationships() {
      // Use material properties to build strength relationships
      for (const [material, props] of this.materialProperties.entries()) {
        if (props.modulus_rupture && props.modulus_rupture > 10000) {
          this.addRelationship(material, 'structural_furniture', 'suitable_for', 0.9);
        }
        
        if (props.workability === 'easy') {
          this.addRelationship(material, 'beginner_projects', 'suitable_for', 0.8);
        }
      }
    }
  
    // ========== Public API Methods ==========
  
    /**
     * Get maximum span for given material and thickness
     */
    getMaxSpan(material: string, thickness: number): number {
      const thicknessKey = thickness.toString();
      const spanTable = this.spanTables.get(thicknessKey);
      
      if (!spanTable) {
        // Interpolate if thickness not in table
        const thicknesses = Object.keys(this.spanTables)
          .map(t => parseFloat(t))
          .sort((a, b) => a - b);
        
        // Find surrounding thicknesses
        let lower = thicknesses[0];
        let upper = thicknesses[thicknesses.length - 1];
        
        for (let i = 0; i < thicknesses.length - 1; i++) {
          if (thickness >= thicknesses[i] && thickness <= thicknesses[i + 1]) {
            lower = thicknesses[i];
            upper = thicknesses[i + 1];
            break;
          }
        }
        
        // Linear interpolation
        const lowerSpan = this.spanTables.get(lower.toString())?.[material] || 24;
        const upperSpan = this.spanTables.get(upper.toString())?.[material] || 36;
        const ratio = (thickness - lower) / (upper - lower);
        
        return lowerSpan + (upperSpan - lowerSpan) * ratio;
      }
      
      return spanTable[material] || 24; // Default conservative span
    }
  
    /**
     * Calculate minimum thickness needed for a span
     */
    getMinThickness(material: string, span: number): number {
      for (const [thickness, spanTable] of Object.entries(this.spanTables)) {
        const maxSpan = spanTable[material];
        if (maxSpan && maxSpan >= span) {
          return parseFloat(thickness);
        }
      }
      return 2.0; // Maximum thickness if span too large
    }
  
    /**
     * Get compatible joinery methods for material
     */
    getCompatibleJoinery(material: string): JoineryType[] {
      const joints = this.materialJoineryCompatibility.get(material);
      return joints ? Array.from(joints) as JoineryType[] : ['screw'];
    }
  
    /**
     * Get required tools for joinery method
     */
    getRequiredTools(joinery: JoineryType): string[] {
      const tools = this.toolRequirements.get(joinery);
      return tools ? Array.from(tools) : ['drill', 'saw'];
    }
  
    /**
     * Calculate joint strength
     */
    getJointStrength(
      jointType: JoineryType, 
      material: string,
      loadType: 'shear' | 'tension' | 'compression' = 'shear'
    ): number {
      const jointData = this.jointStrengthTable[jointType];
      if (!jointData) return 100; // Conservative default
      
      const materialData = jointData[material];
      if (!materialData) {
        // Use pine as default if material not found
        return jointData['pine']?.[loadType] || 100;
      }
      
      return materialData[loadType];
    }
  
    /**
     * Get furniture template
     */
    getFurnitureTemplate(type: FurnitureType): any {
      return this.furnitureTemplates.get(type) || {
        standard_dimensions: { width: 24, height: 30, depth: 18 },
        typical_joints: ['screw', 'dowel']
      };
    }
  
    /**
     * Validate material choice for application
     */
    validateMaterial(
      material: string, 
      requirements: {
        span?: number;
        thickness?: number;
        environment?: 'indoor' | 'outdoor';
        load?: number;
      }
    ): ValidationResult {
      const props = this.materialProperties.get(material);
      
      if (!props) {
        return {
          isValid: false,
          issues: [`Unknown material: ${material}`],
          recommendations: ['Choose from available materials: ' + Array.from(this.materialProperties.keys()).join(', ')]
        };
      }

      const issues: string[] = [];
      const recommendations: string[] = [];
      
      // Check environment compatibility
      if (requirements.environment === 'outdoor' && props.indoor_outdoor === 'indoor') {
        issues.push(`${material} is not suitable for outdoor use`);
        recommendations.push('Consider cedar or teak for outdoor projects');
      }
      
      // Check span requirements
      if (requirements.span && requirements.thickness) {
        const maxSpan = this.getMaxSpan(material, requirements.thickness);
        if (requirements.span > maxSpan) {
          issues.push(`Span ${requirements.span}" exceeds maximum ${maxSpan}" for ${requirements.thickness}" thick ${material}`);
          recommendations.push('Increase thickness or add center support');
        }
      }
      
      // Check load requirements
      if (requirements.load && props.modulus_rupture) {
        const thickness = requirements.thickness || 0.75;
        const width = requirements.span || 12;
        
        // Simple stress calculation (load as distributed across span)
        const moment = (requirements.load * Math.pow(requirements.span || 12, 2)) / 8;
        const stress = (6 * moment) / (width * Math.pow(thickness, 2));
        
        if (stress > props.modulus_rupture * 0.4) { // 40% safety margin
          issues.push(`Load too high for material strength`);
          recommendations.push('Use stronger material or increase thickness');
        }
      }
      
      return {
        isValid: issues.filter(i => i.includes('exceeds') || i.includes('too high')).length === 0,
        issues,
        recommendations
      };
    }
  
    /**
     * Suggest alternative materials
     */
    suggestAlternatives(
      currentMaterial: string,
      criteria: {
        maxCost?: number;
        minStrength?: number;
        environment?: 'indoor' | 'outdoor';
        workability?: 'easy' | 'moderate' | 'difficult';
      }
    ): Array<{ material: string; score: number; reason: string }> {
      const alternatives: Array<{ material: string; score: number; reason: string }> = [];
      
      for (const [materialId, props] of this.materialProperties) {
        if (materialId === currentMaterial) continue;
        
        let score = 1.0;
        let reasons: string[] = [];
        
        // Cost criteria
        if (criteria.maxCost && props.cost_per_board_foot > criteria.maxCost) {
          continue; // Skip if too expensive
        }
        
        // Strength criteria
        if (criteria.minStrength && props.modulus_rupture && props.modulus_rupture < criteria.minStrength) {
          continue; // Skip if too weak
        }
        
        // Environment criteria
        if (criteria.environment && 
            criteria.environment === 'outdoor' && 
            props.indoor_outdoor === 'indoor') {
          continue; // Skip indoor-only materials for outdoor use
        }
        
        // Workability criteria
        if (criteria.workability === 'easy' && props.workability === 'difficult') {
          score *= 0.5;
          reasons.push('harder to work with');
        }
        
        // Bonus for better properties
        const currentProps = this.materialProperties.get(currentMaterial);
        if (currentProps) {
          if (props.modulus_rupture && currentProps.modulus_rupture && props.modulus_rupture > currentProps.modulus_rupture) {
            score *= 1.2;
            reasons.push('stronger');
          }
          if (props.cost_per_board_foot < currentProps.cost_per_board_foot) {
            score *= 1.1;
            reasons.push('more affordable');
          }
        }
        
        alternatives.push({
          material: materialId,
          score,
          reason: reasons.join(', ') || 'suitable alternative'
        });
      }
      
      // Sort by score
      alternatives.sort((a, b) => b.score - a.score);
      
      return alternatives.slice(0, 3); // Top 3 alternatives
    }
  
    /**
     * Get wood movement calculations
     */
    calculateWoodMovement(
      species: string,
      width: number,
      moistureChange: number = 6 // Default 6% moisture change
    ): { tangential: number; radial: number } {
      // Wood movement coefficients (simplified)
      const movementCoefficients = {
        pine: { tangential: 0.00263, radial: 0.00148 },
        oak_red: { tangential: 0.00369, radial: 0.00183 },
        maple_hard: { tangential: 0.00353, radial: 0.00165 },
        walnut: { tangential: 0.00274, radial: 0.00190 },
        cherry: { tangential: 0.00258, radial: 0.00126 }
      };
      
      const coefficients = movementCoefficients[species as keyof typeof movementCoefficients] || movementCoefficients.pine;
      
      return {
        tangential: width * coefficients.tangential * moistureChange,
        radial: width * coefficients.radial * moistureChange
      };
    }
  
    // ========== Helper Methods ==========
  
    private getAverageJointStrength(jointType: string): number {
      const jointData = this.jointStrengthTable[jointType];
      if (!jointData) return 0;
      
      let total = 0;
      let count = 0;
      
      for (const material of Object.values(jointData)) {
        total += material.shear + material.tension + material.compression;
        count += 3;
      }
      
      return count > 0 ? total / count : 0;
    }
  
    /**
     * Export knowledge graph for visualization
     */
    exportGraph(): { nodes: any[]; edges: any[] } {
      const nodes = Array.from(this.nodes.values()).map(node => ({
        id: node.id,
        label: node.name,
        type: node.type,
        properties: node.properties
      }));
      
      const edges: any[] = [];
      for (const node of this.nodes.values()) {
        for (const rel of node.relationships) {
          edges.push({
            source: node.id,
            target: rel.target_id,
            type: rel.type,
            weight: rel.strength
          });
        }
      }
      
      return { nodes, edges };
    }

    public validateDimensions(furnitureType: string, dimensions: Dimensions): ValidationResult {
      const type = this.furnitureTypes.get(furnitureType);
      if (!type) {
        return {
          isValid: false,
          issues: [`Unknown furniture type: ${furnitureType}`],
          recommendations: ['Please specify a valid furniture type']
        };
      }

      const issues: string[] = [];
      const { standard_dimensions, min_dimensions, max_dimensions } = type;

      if (dimensions.width < min_dimensions.width) {
        issues.push(`Width (${dimensions.width}") is below minimum (${min_dimensions.width}")`);
      }
      if (dimensions.width > max_dimensions.width) {
        issues.push(`Width (${dimensions.width}") exceeds maximum (${max_dimensions.width}")`);
      }

      // Similar checks for height and depth...

      return {
        isValid: issues.length === 0,
        issues,
        physics: {
          max_load: this.calculateMaxLoad(furnitureType, dimensions),
          safety_factor: 2.0
        },
        recommendations: issues.length > 0 ? ['Consider adjusting dimensions to meet standard requirements'] : []
      };
    }

    public getMaterialProperties(materialType: string): Material | null {
      const props = this.materialProperties.get(materialType);
      if (!props) return null;
      
      return {
        type: materialType,
        properties: props
      };
    }

    public getJoineryMethods(materialType: string): Joinery[] {
      const methods: Joinery[] = [];
      const compatible = this.materialJoineryCompatibility.get(materialType);
      
      if (compatible) {
        for (const joineryType of compatible) {
          methods.push({
            type: joineryType as JoineryType,
            difficulty: this.getJointDifficulty(joineryType),
            strength_rating: 'medium',
            materials_compatible: [materialType]
          });
        }
      }
      
      return methods;
    }

    private calculateMaxLoad(furnitureType: string, dimensions: Dimensions): number {
      // Simple calculation based on material properties and dimensions
      // In a real system, this would use more sophisticated engineering calculations
      const baseLoad = 50; // pounds
      const widthFactor = dimensions.width / 48; // normalized to 48 inches
      const depthFactor = dimensions.depth / 24; // normalized to 24 inches
      return Math.floor(baseLoad * widthFactor * depthFactor);
    }

    private getJointDifficulty(joineryType: string): string {
      const difficulties: Record<string, string> = {
        'screw': 'beginner',
        'pocket_hole': 'beginner',
        'dowel': 'intermediate',
        'biscuit': 'intermediate',
        'dado': 'intermediate',
        'mortise_tenon': 'advanced',
        'dovetail': 'advanced'
      };
      
      return difficulties[joineryType] || 'intermediate';
    }

    private addRelationship(fromId: string, toId: string, type: RelationshipType, strength: number): void {
      const fromNode = this.nodes.get(fromId);
      if (fromNode) {
        fromNode.relationships.push({
          type,
          target_id: toId,
          strength
        });
      }
    }
  }
  
  // Export singleton instance
  export const knowledgeGraph = FurnitureKnowledgeGraph.getInstance();
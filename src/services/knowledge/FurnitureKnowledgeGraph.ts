import { Logger } from '@/lib/logger';

export interface MaterialProperties {
  name: string;
  type: 'hardwood' | 'softwood' | 'engineered' | 'composite';
  density: number; // lb/ft³
  modulus_rupture: number; // psi
  modulus_elasticity: number; // psi
  hardness: number; // Janka rating
  cost_per_board_foot: { min: number; max: number };
  workability: 'easy' | 'moderate' | 'difficult';
  indoor_outdoor: 'indoor' | 'outdoor' | 'both';
  sustainability: 'high' | 'medium' | 'low';
}

export interface JoineryMethod {
  name: string;
  strength: number; // 1-10
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  tools_required: string[];
  material_compatible: string[];
  use_cases: string[];
  time_estimate: string;
}

export interface FurnitureTypeSpecs {
  type: string;
  standard_dimensions: {
    min: { width: number; height: number; depth: number };
    max: { width: number; height: number; depth: number };
    typical: { width: number; height: number; depth: number };
  };
  load_requirements: {
    distributed: number; // lbs/ft²
    concentrated: number; // lbs
  };
  common_materials: string[];
  recommended_joinery: string[];
}

export class FurnitureKnowledgeGraph {
  private logger = Logger.createScoped('KnowledgeGraph');
  private materials: Map<string, MaterialProperties>;
  private joineryMethods: Map<string, JoineryMethod>;
  private furnitureSpecs: Map<string, FurnitureTypeSpecs>;
  private spanTables: Map<string, any>;

  constructor() {
    this.materials = new Map();
    this.joineryMethods = new Map();
    this.furnitureSpecs = new Map();
    this.spanTables = new Map();
    
    this.initializeKnowledge();
  }

  private initializeKnowledge(): void {
    this.initializeMaterials();
    this.initializeJoineryMethods();
    this.initializeFurnitureSpecs();
    this.initializeSpanTables();
    
    this.logger.info('Knowledge graph initialized', {
      materials: this.materials.size,
      joineryMethods: this.joineryMethods.size,
      furnitureTypes: this.furnitureSpecs.size
    });
  }

  private initializeMaterials(): void {
    const materials: MaterialProperties[] = [
      {
        name: 'Pine',
        type: 'softwood',
        density: 35,
        modulus_rupture: 8600,
        modulus_elasticity: 1200000,
        hardness: 420,
        cost_per_board_foot: { min: 3, max: 5 },
        workability: 'easy',
        indoor_outdoor: 'indoor',
        sustainability: 'high'
      },
      {
        name: 'Oak (Red)',
        type: 'hardwood',
        density: 44,
        modulus_rupture: 14300,
        modulus_elasticity: 1820000,
        hardness: 1290,
        cost_per_board_foot: { min: 8, max: 12 },
        workability: 'moderate',
        indoor_outdoor: 'indoor',
        sustainability: 'medium'
      },
      {
        name: 'Maple (Hard)',
        type: 'hardwood',
        density: 44,
        modulus_rupture: 15800,
        modulus_elasticity: 1830000,
        hardness: 1450,
        cost_per_board_foot: { min: 10, max: 15 },
        workability: 'moderate',
        indoor_outdoor: 'indoor',
        sustainability: 'medium'
      },
      {
        name: 'Walnut',
        type: 'hardwood',
        density: 38,
        modulus_rupture: 14600,
        modulus_elasticity: 1680000,
        hardness: 1010,
        cost_per_board_foot: { min: 15, max: 25 },
        workability: 'moderate',
        indoor_outdoor: 'indoor',
        sustainability: 'low'
      },
      {
        name: 'Plywood (3/4")',
        type: 'engineered',
        density: 34,
        modulus_rupture: 5000,
        modulus_elasticity: 1500000,
        hardness: 0, // Not applicable
        cost_per_board_foot: { min: 2, max: 4 }, // Per sq ft
        workability: 'easy',
        indoor_outdoor: 'indoor',
        sustainability: 'medium'
      },
      {
        name: 'MDF',
        type: 'composite',
        density: 48,
        modulus_rupture: 4000,
        modulus_elasticity: 400000,
        hardness: 0, // Not applicable
        cost_per_board_foot: { min: 1.5, max: 3 }, // Per sq ft
        workability: 'easy',
        indoor_outdoor: 'indoor',
        sustainability: 'low'
      }
    ];

    materials.forEach(m => this.materials.set(m.name.toLowerCase(), m));
  }

  private initializeJoineryMethods(): void {
    const methods: JoineryMethod[] = [
      {
        name: 'Pocket Holes',
        strength: 7,
        difficulty: 'beginner',
        tools_required: ['pocket hole jig', 'drill', 'screws'],
        material_compatible: ['solid_wood', 'plywood', 'mdf'],
        use_cases: ['face frames', 'table aprons', 'cabinet boxes'],
        time_estimate: '5 min per joint'
      },
      {
        name: 'Dowels',
        strength: 6,
        difficulty: 'intermediate',
        tools_required: ['doweling jig', 'drill', 'dowels', 'glue'],
        material_compatible: ['solid_wood', 'plywood'],
        use_cases: ['edge joining', 'frame joints', 'shelf pins'],
        time_estimate: '10 min per joint'
      },
      {
        name: 'Mortise and Tenon',
        strength: 9,
        difficulty: 'advanced',
        tools_required: ['chisel', 'saw', 'router or mortiser'],
        material_compatible: ['solid_wood'],
        use_cases: ['table legs', 'chair joints', 'frame construction'],
        time_estimate: '30 min per joint'
      },
      {
        name: 'Dovetails',
        strength: 9,
        difficulty: 'expert',
        tools_required: ['dovetail saw', 'chisel', 'marking gauge'],
        material_compatible: ['solid_wood'],
        use_cases: ['drawer boxes', 'decorative corners', 'heirloom pieces'],
        time_estimate: '45 min per joint'
      },
      {
        name: 'Screws',
        strength: 5,
        difficulty: 'beginner',
        tools_required: ['drill', 'screws', 'pilot bit'],
        material_compatible: ['solid_wood', 'plywood', 'mdf'],
        use_cases: ['temporary joints', 'utility furniture', 'jigs'],
        time_estimate: '2 min per joint'
      },
      {
        name: 'Biscuits',
        strength: 6,
        difficulty: 'intermediate',
        tools_required: ['biscuit joiner', 'biscuits', 'glue'],
        material_compatible: ['solid_wood', 'plywood'],
        use_cases: ['panel glue-ups', 'mitered corners', 'edge joining'],
        time_estimate: '8 min per joint'
      }
    ];

    methods.forEach(m => this.joineryMethods.set(m.name.toLowerCase(), m));
  }

  private initializeFurnitureSpecs(): void {
    const specs: FurnitureTypeSpecs[] = [
      {
        type: 'table',
        standard_dimensions: {
          min: { width: 24, height: 26, depth: 24 },
          max: { width: 96, height: 32, depth: 48 },
          typical: { width: 60, height: 30, depth: 36 }
        },
        load_requirements: {
          distributed: 50, // lbs/ft²
          concentrated: 300 // lbs
        },
        common_materials: ['oak', 'maple', 'walnut', 'pine'],
        recommended_joinery: ['mortise and tenon', 'pocket holes', 'dowels']
      },
      {
        type: 'bookshelf',
        standard_dimensions: {
          min: { width: 24, height: 36, depth: 8 },
          max: { width: 48, height: 84, depth: 16 },
          typical: { width: 36, height: 72, depth: 12 }
        },
        load_requirements: {
          distributed: 25, // lbs/ft² per shelf
          concentrated: 50 // lbs per shelf
        },
        common_materials: ['pine', 'oak', 'plywood', 'mdf'],
        recommended_joinery: ['dado', 'dowels', 'screws', 'biscuits']
      },
      {
        type: 'chair',
        standard_dimensions: {
          min: { width: 16, height: 30, depth: 16 },
          max: { width: 24, height: 48, depth: 20 },
          typical: { width: 18, height: 36, depth: 18 }
        },
        load_requirements: {
          distributed: 0, // Not applicable
          concentrated: 300 // lbs
        },
        common_materials: ['oak', 'maple', 'walnut'],
        recommended_joinery: ['mortise and tenon', 'dowels']
      },
      {
        type: 'desk',
        standard_dimensions: {
          min: { width: 36, height: 28, depth: 20 },
          max: { width: 72, height: 32, depth: 36 },
          typical: { width: 48, height: 30, depth: 24 }
        },
        load_requirements: {
          distributed: 40, // lbs/ft²
          concentrated: 200 // lbs
        },
        common_materials: ['oak', 'maple', 'plywood', 'mdf'],
        recommended_joinery: ['pocket holes', 'dowels', 'screws']
      }
    ];

    specs.forEach(s => this.furnitureSpecs.set(s.type, s));
  }

  private initializeSpanTables(): void {
    // Simplified span tables for common scenarios
    // Maximum span in inches for different materials and loads
    this.spanTables.set('shelf_spans', {
      '3/4_plywood': {
        light_load: 32, // Books, decorative items
        medium_load: 24, // Heavy books
        heavy_load: 16 // Tools, equipment
      },
      '3/4_solid_wood': {
        light_load: 36,
        medium_load: 28,
        heavy_load: 20
      },
      '1_solid_wood': {
        light_load: 42,
        medium_load: 32,
        heavy_load: 24
      }
    });
  }

  // Public API methods
  getMaterial(name: string): MaterialProperties | undefined {
    return this.materials.get(name.toLowerCase());
  }

  getJoineryMethod(name: string): JoineryMethod | undefined {
    return this.joineryMethods.get(name.toLowerCase());
  }

  getFurnitureSpecs(type: string): FurnitureTypeSpecs | undefined {
    return this.furnitureSpecs.get(type.toLowerCase());
  }

  getMaxSpan(material: string, thickness: number, load: 'light' | 'medium' | 'heavy'): number {
    const spanTable = this.spanTables.get('shelf_spans');
    const key = `${thickness}_${material}`;
    return spanTable?.[key]?.[`${load}_load`] || 24; // Default to 24"
  }

  recommendMaterials(
    furnitureType: string,
    budget: 'low' | 'medium' | 'high',
    skill: 'beginner' | 'intermediate' | 'advanced'
  ): MaterialProperties[] {
    const specs = this.getFurnitureSpecs(furnitureType);
    if (!specs) return [];

    return Array.from(this.materials.values()).filter(material => {
      // Budget filter
      const avgCost = (material.cost_per_board_foot.min + material.cost_per_board_foot.max) / 2;
      const budgetMatch = 
        (budget === 'low' && avgCost <= 5) ||
        (budget === 'medium' && avgCost <= 12) ||
        (budget === 'high');

      // Skill filter
      const skillMatch = 
        (skill === 'beginner' && material.workability === 'easy') ||
        (skill === 'intermediate' && material.workability !== 'difficult') ||
        (skill === 'advanced');

      // Type compatibility
      const typeMatch = specs.common_materials.some(m => 
        material.name.toLowerCase().includes(m.toLowerCase())
      );

      return budgetMatch && skillMatch && (typeMatch || !specs.common_materials.length);
    });
  }

  recommendJoinery(
    furnitureType: string,
    skill: 'beginner' | 'intermediate' | 'advanced' | 'expert',
    materials: string[]
  ): JoineryMethod[] {
    const specs = this.getFurnitureSpecs(furnitureType);
    
    return Array.from(this.joineryMethods.values()).filter(method => {
      // Skill filter
      const skillLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
      const userSkillIndex = skillLevels.indexOf(skill);
      const methodSkillIndex = skillLevels.indexOf(method.difficulty);
      
      if (methodSkillIndex > userSkillIndex) return false;

      // Material compatibility
      const materialMatch = materials.some(mat => 
        method.material_compatible.includes(mat)
      );

      // Type recommendation
      const typeMatch = specs?.recommended_joinery.some(j => 
        method.name.toLowerCase().includes(j.toLowerCase())
      );

      return materialMatch && (typeMatch || !specs?.recommended_joinery.length);
    });
  }
}

// Export singleton instance
export const knowledgeGraph = new FurnitureKnowledgeGraph(); 
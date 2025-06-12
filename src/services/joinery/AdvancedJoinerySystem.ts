import * as THREE from 'three';
import { Logger } from '@/lib/logger';
import { FurnitureDesign } from '@/lib/types';

export type JoineryType = 
  | 'butt' | 'miter' | 'dado' | 'rabbet' | 'lap' | 'mortise_tenon' 
  | 'dovetail' | 'finger' | 'biscuit' | 'dowel' | 'domino'
  | 'pocket_screw' | 'spline' | 'japanese_joint' | 'compound_miter'
  | 'bridle' | 'half_blind_dovetail' | 'through_dovetail' | 'sliding_dovetail'
  | 'wedged_mortise_tenon' | 'drawbore' | 'scarf' | 'bird_mouth'
  | 'housed_joint' | 'bevel_shoulder' | 'compound_angle';

export interface JoineryMethod {
  type: JoineryType;
  name: string;
  description: string;
  strength_rating: number; // 1-10
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  required_tools: Tool[];
  setup_time: number; // minutes
  cutting_time: number; // minutes per joint
  accuracy_required: number; // 1-10, 10 being most precise
  wood_species_suitability: {
    softwood: boolean;
    hardwood: boolean;
    plywood: boolean;
    mdf: boolean;
  };
  applications: string[];
  visual_appeal: number; // 1-10
  reversible: boolean;
  load_bearing: {
    tension: number; // lbs
    compression: number; // lbs
    shear: number; // lbs
  };
  tolerances: {
    gap_tolerance: number; // inches
    angle_tolerance: number; // degrees
  };
  finishing_considerations: string[];
}

export interface Tool {
  name: string;
  type: 'hand' | 'power' | 'machine' | 'jig' | 'measuring';
  required: boolean;
  alternative?: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface JoineryImplementation {
  geometry: THREE.Group;
  cutting_sequence: CuttingStep[];
  assembly_sequence: AssemblyStep[];
  quality_checkpoints: QualityCheck[];
  common_mistakes: string[];
  troubleshooting: { issue: string; solution: string }[];
}

export interface CuttingStep {
  step_number: number;
  description: string;
  tool: string;
  setup_notes: string;
  safety_warnings: string[];
  precision_notes: string;
  estimated_time: number; // minutes
  blade_type?: string;
  feed_rate?: string;
  cutting_direction: string;
  measurements: {
    length?: number;
    width?: number;
    depth?: number;
    angle?: number;
  };
}

export interface AssemblyStep {
  step_number: number;
  description: string;
  dry_fit_required: boolean;
  glue_type?: string;
  clamp_pressure?: string;
  clamp_time?: number; // minutes
  alignment_method: string;
  special_techniques: string[];
}

export interface QualityCheck {
  checkpoint: string;
  measurement_method: string;
  tolerance: number;
  corrective_action: string;
}

export class AdvancedJoinerySystem {
  private logger = Logger.createScoped('AdvancedJoinerySystem');
  private joineryMethods: Map<JoineryType, JoineryMethod> = new Map();
  private implementations: Map<JoineryType, JoineryImplementation> = new Map();

  constructor() {
    this.initializeJoineryMethods();
    this.initializeImplementations();
  }

  private initializeJoineryMethods(): void {
    const methods: JoineryMethod[] = [
      {
        type: 'through_dovetail',
        name: 'Through Dovetail Joint',
        description: 'Classic interlocking joint with angled pins and tails, visible on both sides',
        strength_rating: 9,
        difficulty_level: 'expert',
        required_tools: [
          { name: 'Dovetail Saw', type: 'hand', required: true, skill_level: 'advanced' },
          { name: 'Dovetail Marker', type: 'measuring', required: true, skill_level: 'intermediate' },
          { name: 'Chisels (1/4", 1/2", 3/4")', type: 'hand', required: true, skill_level: 'advanced' },
          { name: 'Dovetail Jig', type: 'jig', required: false, alternative: 'Hand cut', skill_level: 'intermediate' },
          { name: 'Coping Saw', type: 'hand', required: true, skill_level: 'intermediate' }
        ],
        setup_time: 30,
        cutting_time: 45,
        accuracy_required: 10,
        wood_species_suitability: {
          softwood: false,
          hardwood: true,
          plywood: false,
          mdf: false
        },
        applications: ['Drawer boxes', 'Cabinet construction', 'Jewelry boxes', 'Fine furniture'],
        visual_appeal: 10,
        reversible: false,
        load_bearing: {
          tension: 800,
          compression: 1200,
          shear: 600
        },
        tolerances: {
          gap_tolerance: 0.002,
          angle_tolerance: 0.5
        },
        finishing_considerations: ['Requires careful sanding around joints', 'Showcases wood grain contrast']
      },
      {
        type: 'mortise_tenon',
        name: 'Mortise and Tenon Joint',
        description: 'Strong traditional joint with rectangular projection fitting into matching cavity',
        strength_rating: 9,
        difficulty_level: 'advanced',
        required_tools: [
          { name: 'Mortise Chisel Set', type: 'hand', required: true, skill_level: 'advanced' },
          { name: 'Tenon Saw', type: 'hand', required: true, skill_level: 'intermediate' },
          { name: 'Mortising Machine', type: 'machine', required: false, alternative: 'Hand chisel', skill_level: 'intermediate' },
          { name: 'Marking Gauge', type: 'measuring', required: true, skill_level: 'intermediate' }
        ],
        setup_time: 20,
        cutting_time: 35,
        accuracy_required: 9,
        wood_species_suitability: {
          softwood: true,
          hardwood: true,
          plywood: false,
          mdf: false
        },
        applications: ['Table legs to aprons', 'Chair construction', 'Frame joints', 'Traditional furniture'],
        visual_appeal: 7,
        reversible: false,
        load_bearing: {
          tension: 1000,
          compression: 1500,
          shear: 800
        },
        tolerances: {
          gap_tolerance: 0.005,
          angle_tolerance: 1.0
        },
        finishing_considerations: ['Invisible when assembled', 'Allows for wood movement']
      },
      {
        type: 'japanese_joint',
        name: 'Japanese Joinery',
        description: 'Complex interlocking joints using no metal fasteners, extremely precise',
        strength_rating: 10,
        difficulty_level: 'expert',
        required_tools: [
          { name: 'Japanese Saw (Dozuki)', type: 'hand', required: true, skill_level: 'expert' },
          { name: 'Japanese Chisels', type: 'hand', required: true, skill_level: 'expert' },
          { name: 'Marking Knife', type: 'measuring', required: true, skill_level: 'advanced' },
          { name: 'Wooden Mallet', type: 'hand', required: true, skill_level: 'intermediate' }
        ],
        setup_time: 60,
        cutting_time: 90,
        accuracy_required: 10,
        wood_species_suitability: {
          softwood: true,
          hardwood: true,
          plywood: false,
          mdf: false
        },
        applications: ['Traditional architecture', 'High-end furniture', 'Structural frameworks'],
        visual_appeal: 10,
        reversible: true,
        load_bearing: {
          tension: 1200,
          compression: 2000,
          shear: 1000
        },
        tolerances: {
          gap_tolerance: 0.001,
          angle_tolerance: 0.25
        },
        finishing_considerations: ['Showcases craftsmanship', 'No glue required', 'Allows disassembly']
      },
      {
        type: 'domino',
        name: 'Domino Joinery',
        description: 'Modern loose tenon system using oval-shaped tenons and precise mortises',
        strength_rating: 8,
        difficulty_level: 'intermediate',
        required_tools: [
          { name: 'Festool Domino Joiner', type: 'power', required: true, skill_level: 'intermediate' },
          { name: 'Domino Tenons', type: 'hand', required: true, skill_level: 'beginner' },
          { name: 'Clamps', type: 'hand', required: true, skill_level: 'beginner' }
        ],
        setup_time: 10,
        cutting_time: 5,
        accuracy_required: 7,
        wood_species_suitability: {
          softwood: true,
          hardwood: true,
          plywood: true,
          mdf: true
        },
        applications: ['Modern furniture', 'Cabinet face frames', 'Panel glue-ups', 'Quick assembly'],
        visual_appeal: 5,
        reversible: false,
        load_bearing: {
          tension: 600,
          compression: 800,
          shear: 500
        },
        tolerances: {
          gap_tolerance: 0.010,
          angle_tolerance: 2.0
        },
        finishing_considerations: ['Hidden when assembled', 'Fast and reliable', 'Professional results']
      },
      {
        type: 'finger',
        name: 'Finger Joint (Box Joint)',
        description: 'Interlocking rectangular projections, strong and decorative',
        strength_rating: 7,
        difficulty_level: 'intermediate',
        required_tools: [
          { name: 'Table Saw', type: 'machine', required: true, skill_level: 'intermediate' },
          { name: 'Box Joint Jig', type: 'jig', required: true, skill_level: 'intermediate' },
          { name: 'Dado Blade Set', type: 'machine', required: true, skill_level: 'intermediate' }
        ],
        setup_time: 25,
        cutting_time: 15,
        accuracy_required: 8,
        wood_species_suitability: {
          softwood: true,
          hardwood: true,
          plywood: true,
          mdf: false
        },
        applications: ['Box construction', 'Drawer boxes', 'Small cabinets', 'Craft projects'],
        visual_appeal: 8,
        reversible: false,
        load_bearing: {
          tension: 500,
          compression: 700,
          shear: 400
        },
        tolerances: {
          gap_tolerance: 0.003,
          angle_tolerance: 1.0
        },
        finishing_considerations: ['Creates attractive pattern', 'Easy to sand', 'Shows end grain']
      }
    ];

    methods.forEach(method => {
      this.joineryMethods.set(method.type, method);
    });

    this.logger.info(`Initialized ${methods.length} advanced joinery methods`);
  }

  private initializeImplementations(): void {
    // Through Dovetail Implementation
    this.implementations.set('through_dovetail', {
      geometry: this.createDovetailGeometry(),
      cutting_sequence: [
        {
          step_number: 1,
          description: 'Mark out dovetail angles on tail board',
          tool: 'Dovetail Marker',
          setup_notes: 'Use 1:8 ratio for hardwood, 1:6 for softwood',
          safety_warnings: ['Ensure sharp marking tools for clean lines'],
          precision_notes: 'Mark from face side consistently',
          estimated_time: 10,
          cutting_direction: 'Face to face',
          measurements: { angle: 82.5 }
        },
        {
          step_number: 2,
          description: 'Cut tail angles with dovetail saw',
          tool: 'Dovetail Saw',
          setup_notes: 'Cut on waste side of line, stay 1/32" proud',
          safety_warnings: ['Support work properly', 'Keep fingers clear of saw'],
          precision_notes: 'Maintain consistent angle throughout cut',
          estimated_time: 15,
          cutting_direction: 'Vertical cuts from face',
          measurements: { depth: 0.75 }
        },
        {
          step_number: 3,
          description: 'Remove waste between tails with coping saw',
          tool: 'Coping Saw',
          setup_notes: 'Leave material for final paring',
          safety_warnings: ['Secure workpiece in vise'],
          precision_notes: 'Stay well away from layout lines',
          estimated_time: 8,
          cutting_direction: 'Horizontal waste removal',
          measurements: {}
        },
        {
          step_number: 4,
          description: 'Pare tails to final dimension',
          tool: 'Sharp Chisel',
          setup_notes: 'Work from both faces to prevent tear-out',
          safety_warnings: ['Keep hands behind cutting edge', 'Use sharp chisels only'],
          precision_notes: 'Take light passes, check fit frequently',
          estimated_time: 12,
          cutting_direction: 'Perpendicular to grain',
          measurements: {}
        },
        {
          step_number: 5,
          description: 'Mark pins from completed tails',
          tool: 'Marking Knife',
          setup_notes: 'Clamp tail board precisely in position',
          safety_warnings: ['Ensure stable clamping'],
          precision_notes: 'Use sharp knife for clean transfer',
          estimated_time: 5,
          cutting_direction: 'Trace around tails',
          measurements: {}
        },
        {
          step_number: 6,
          description: 'Cut pin sockets with saw and chisel',
          tool: 'Dovetail Saw and Chisel',
          setup_notes: 'Cut slightly undersize, pare to fit',
          safety_warnings: ['Support work properly during cutting'],
          precision_notes: 'Test fit with tails frequently',
          estimated_time: 20,
          cutting_direction: 'Vertical then horizontal',
          measurements: {}
        }
      ],
      assembly_sequence: [
        {
          step_number: 1,
          description: 'Dry fit all joints',
          dry_fit_required: true,
          alignment_method: 'Hand pressure and light tapping',
          special_techniques: ['Check for gaps', 'Ensure square assembly']
        },
        {
          step_number: 2,
          description: 'Apply glue and assemble',
          dry_fit_required: false,
          glue_type: 'PVA or Hide Glue',
          clamp_pressure: 'Light to moderate',
          clamp_time: 120,
          alignment_method: 'Clamps and cauls',
          special_techniques: ['Work quickly with open time', 'Clean squeeze-out immediately']
        }
      ],
      quality_checkpoints: [
        {
          checkpoint: 'Tail angle accuracy',
          measurement_method: 'Sliding bevel',
          tolerance: 0.5,
          corrective_action: 'Re-cut or adjust with chisel'
        },
        {
          checkpoint: 'Joint tightness',
          measurement_method: 'Hand assembly force',
          tolerance: 1,
          corrective_action: 'Pare pins slightly'
        },
        {
          checkpoint: 'Square assembly',
          measurement_method: 'Diagonal measurement',
          tolerance: 0.030,
          corrective_action: 'Adjust clamping pressure'
        }
      ],
      common_mistakes: [
        'Cutting on the wrong side of layout lines',
        'Inconsistent saw angles',
        'Tear-out from dull tools',
        'Rushing the paring process'
      ],
      troubleshooting: [
        {
          issue: 'Gaps in joint',
          solution: 'Mix sawdust with glue to fill small gaps, re-cut for large gaps'
        },
        {
          issue: 'Joint too tight',
          solution: 'Carefully pare mating surfaces with sharp chisel'
        },
        {
          issue: 'Tear-out on edges',
          solution: 'Use backing board when cutting, keep tools sharp'
        }
      ]
    });

    // Mortise and Tenon Implementation
    this.implementations.set('mortise_tenon', {
      geometry: this.createMortiseTenonGeometry(),
      cutting_sequence: [
        {
          step_number: 1,
          description: 'Mark mortise location and dimensions',
          tool: 'Marking Gauge',
          setup_notes: 'Set gauge to 1/3 of stock thickness',
          safety_warnings: ['Ensure sharp gauge points'],
          precision_notes: 'Mark from same face consistently',
          estimated_time: 5,
          cutting_direction: 'Length and width layout',
          measurements: { length: 2.0, width: 0.5 }
        },
        {
          step_number: 2,
          description: 'Drill mortise to rough depth',
          tool: 'Drill Press',
          setup_notes: 'Use brad point bit slightly smaller than mortise width',
          safety_warnings: ['Secure workpiece properly', 'Use appropriate speed'],
          precision_notes: 'Drill series of overlapping holes',
          estimated_time: 8,
          blade_type: 'Brad point bit',
          cutting_direction: 'Vertical drilling',
          measurements: { depth: 1.5 }
        },
        {
          step_number: 3,
          description: 'Square up mortise with chisel',
          tool: 'Mortise Chisel',
          setup_notes: 'Work from both ends toward center',
          safety_warnings: ['Keep hands behind cutting edge', 'Use mallet, not hammer'],
          precision_notes: 'Check depth and square frequently',
          estimated_time: 15,
          cutting_direction: 'Perpendicular to grain',
          measurements: {}
        },
        {
          step_number: 4,
          description: 'Cut tenon cheeks on table saw',
          tool: 'Table Saw',
          setup_notes: 'Use tenoning jig or miter gauge',
          safety_warnings: ['Use proper guards', 'Feed consistently'],
          precision_notes: 'Test cut on scrap first',
          estimated_time: 10,
          blade_type: 'Combination blade',
          cutting_direction: 'Across the grain',
          measurements: { depth: 0.25 }
        },
        {
          step_number: 5,
          description: 'Cut tenon shoulders',
          tool: 'Miter Saw or Hand Saw',
          setup_notes: 'Use stop block for consistent length',
          safety_warnings: ['Support workpiece properly'],
          precision_notes: 'Cut slightly proud, pare to fit',
          estimated_time: 8,
          cutting_direction: 'Cross grain',
          measurements: {}
        }
      ],
      assembly_sequence: [
        {
          step_number: 1,
          description: 'Test fit tenon in mortise',
          dry_fit_required: true,
          alignment_method: 'Hand pressure',
          special_techniques: ['Should slide together with light resistance']
        },
        {
          step_number: 2,
          description: 'Apply glue and assemble',
          dry_fit_required: false,
          glue_type: 'PVA or Polyurethane',
          clamp_pressure: 'Moderate',
          clamp_time: 60,
          alignment_method: 'Clamps parallel to tenon',
          special_techniques: ['Ensure shoulders seat properly']
        }
      ],
      quality_checkpoints: [
        {
          checkpoint: 'Mortise square and clean',
          measurement_method: 'Square and visual inspection',
          tolerance: 0.5,
          corrective_action: 'Clean up with chisel'
        },
        {
          checkpoint: 'Tenon fit',
          measurement_method: 'Hand assembly',
          tolerance: 1,
          corrective_action: 'Pare tenon or enlarge mortise'
        }
      ],
      common_mistakes: [
        'Mortise not centered on stock',
        'Tenon shoulders not square',
        'Loose fit from overcutting'
      ],
      troubleshooting: [
        {
          issue: 'Tenon too loose',
          solution: 'Glue on thin shims or remake joint'
        },
        {
          issue: 'Mortise walls rough',
          solution: 'Clean up with sharp chisel, light sanding'
        }
      ]
    });

    this.logger.info('Initialized joinery implementations');
  }

  getJoineryMethod(type: JoineryType): JoineryMethod | null {
    return this.joineryMethods.get(type) || null;
  }

  getJoineryImplementation(type: JoineryType): JoineryImplementation | null {
    return this.implementations.get(type) || null;
  }

  getAllJoineryMethods(): JoineryMethod[] {
    return Array.from(this.joineryMethods.values());
  }

  recommendJoinery(
    application: string,
    skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert',
    strengthRequired: number,
    visualImportance: number,
    woodType: 'softwood' | 'hardwood' | 'plywood' | 'mdf'
  ): JoineryMethod[] {
    const methods = Array.from(this.joineryMethods.values());
    
    return methods
      .filter(method => {
        // Filter by skill level (allow equal or lower)
        const skillLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
        const userSkillIndex = skillLevels.indexOf(skillLevel);
        const methodSkillIndex = skillLevels.indexOf(method.difficulty_level);
        
        return methodSkillIndex <= userSkillIndex &&
               method.applications.some(app => app.toLowerCase().includes(application.toLowerCase())) &&
               method.strength_rating >= strengthRequired &&
               method.visual_appeal >= visualImportance &&
               method.wood_species_suitability[woodType];
      })
      .sort((a, b) => {
        // Sort by strength first, then by visual appeal
        if (a.strength_rating !== b.strength_rating) {
          return b.strength_rating - a.strength_rating;
        }
        return b.visual_appeal - a.visual_appeal;
      });
  }

  calculateJoineryTime(type: JoineryType, quantity: number): number {
    const method = this.joineryMethods.get(type);
    if (!method) return 0;
    
    return (method.setup_time + (method.cutting_time * quantity));
  }

  generateCuttingList(design: FurnitureDesign): any[] {
    // Analyze design and generate detailed cutting list with joinery considerations
    const cuttingList: any[] = [];
    
    // Check if design has joinery methods property (it might not exist)
    const joineryMethods = (design as any).joinery_methods;
    if (joineryMethods) {
      joineryMethods.forEach((jointMethod: any) => {
        const method = this.getJoineryMethod(jointMethod.type as JoineryType);
        if (method) {
          cuttingList.push({
            joint_type: method.name,
            preparation_time: method.setup_time,
            execution_time: method.cutting_time,
            tools_required: method.required_tools.map(tool => tool.name),
            precision_level: method.accuracy_required,
            special_notes: method.finishing_considerations
          });
        }
      });
    }
    
    return cuttingList;
  }

  private createDovetailGeometry(): THREE.Group {
    const group = new THREE.Group();
    
    // Create simplified dovetail visualization
    const tailGeometry = new THREE.BoxGeometry(1, 0.5, 0.75);
    const pinGeometry = new THREE.BoxGeometry(1, 0.5, 0.75);
    
    const material = new THREE.MeshStandardMaterial({ color: 0xD2B48C });
    
    const tail = new THREE.Mesh(tailGeometry, material);
    const pin = new THREE.Mesh(pinGeometry, material);
    
    tail.position.set(0, 0, 0);
    pin.position.set(1.2, 0, 0);
    
    group.add(tail, pin);
    group.userData = { jointType: 'through_dovetail' };
    
    return group;
  }

  private createMortiseTenonGeometry(): THREE.Group {
    const group = new THREE.Group();
    
    // Create simplified mortise and tenon visualization
    const mortiseGeometry = new THREE.BoxGeometry(2, 1, 1);
    const tenonGeometry = new THREE.BoxGeometry(0.5, 0.5, 1.5);
    
    const material = new THREE.MeshStandardMaterial({ color: 0xDEB887 });
    
    const mortise = new THREE.Mesh(mortiseGeometry, material);
    const tenon = new THREE.Mesh(tenonGeometry, material);
    
    mortise.position.set(0, 0, 0);
    tenon.position.set(1.5, 0, 0);
    
    group.add(mortise, tenon);
    group.userData = { jointType: 'mortise_tenon' };
    
    return group;
  }

  validateJoineryDesign(design: FurnitureDesign): {
    valid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const joineryMethods = (design as any).joinery_methods;
    if (!joineryMethods || joineryMethods.length === 0) {
      issues.push('No joinery methods specified');
      recommendations.push('Add appropriate joinery methods for structural integrity');
    }

    joineryMethods?.forEach((joint: any) => {
      const method = this.getJoineryMethod(joint.type as JoineryType);
      if (!method) {
        issues.push(`Unknown joinery method: ${joint.type}`);
        return;
      }

      // Check wood species compatibility
      if (design.materials && Array.isArray(design.materials) && design.materials.length > 0) {
        const primaryMaterial = design.materials[0];
        const woodType = this.categorizeWood(primaryMaterial.type);
        if (!method.wood_species_suitability[woodType]) {
          issues.push(`${method.name} not recommended for ${primaryMaterial.type}`);
          recommendations.push(`Consider alternative joinery for ${primaryMaterial.type}`);
        }
      }

      // Check difficulty vs expected skill level
      if (design.difficulty_level && this.getSkillLevelIndex(method.difficulty_level) > this.getSkillLevelIndex(design.difficulty_level)) {
        recommendations.push(`${method.name} may be too advanced for ${design.difficulty_level} level`);
      }
    });

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    };
  }

  private categorizeWood(woodType: string): 'softwood' | 'hardwood' | 'plywood' | 'mdf' {
    const softwoods = ['pine', 'fir', 'cedar', 'spruce', 'redwood'];
    const hardwoods = ['oak', 'maple', 'cherry', 'walnut', 'ash', 'birch'];
    
    const woodLower = woodType.toLowerCase();
    
    if (woodLower.includes('plywood')) return 'plywood';
    if (woodLower.includes('mdf')) return 'mdf';
    if (softwoods.some(sw => woodLower.includes(sw))) return 'softwood';
    if (hardwoods.some(hw => woodLower.includes(hw))) return 'hardwood';
    
    return 'hardwood'; // Default assumption
  }

  private getSkillLevelIndex(level: string): number {
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
    return levels.indexOf(level);
  }
}

// Global instance
export const advancedJoinerySystem = new AdvancedJoinerySystem(); 
// lib/types.ts
// Complete type definitions for Blueprint Buddy

// ============= Core Types =============

export interface User {
    id: string;
    email: string;
    name?: string;
    created_at: Date;
    preferences?: UserPreferences;
  }
  
  export interface UserPreferences {
    skill_level: 'beginner' | 'intermediate' | 'advanced';
    preferred_style?: FurnitureStyle;
    available_tools?: Tool[];
    workspace_size?: 'small' | 'medium' | 'large';
    budget_range?: 'low' | 'medium' | 'high';
  }
  
  // ============= Furniture Design Types =============
  
  export interface FurnitureDesign {
    id: string;
    user_id?: string;
    name: string;
    furniture_type: FurnitureType;
    description?: string;
    dimensions: Dimensions;
    materials: Material[];
    joinery: JoineryMethod[];
    hardware: Hardware[];
    features: string[];
    style?: FurnitureStyle;
    
    // Calculated properties
    cut_list: CutListItem[];
    bill_of_materials: BOMItem[];
    assembly_steps: AssemblyStep[];
    
    // Validation & metadata
    validation_status: ValidationStatus;
    estimated_cost: number;
    estimated_build_time: string;
    difficulty_level: DifficultyLevel;
    weight_estimate: number;
    
    // 3D Model
    model_3d?: Model3D;
    
    // Timestamps
    created_at: Date;
    updated_at: Date;
    
    // Additional fields for compatibility
    build_time?: string;
  }
  
  // BuildPlan is used by the Material Sourcing Agent
  export interface BuildPlan extends FurnitureDesign {
    projectName: string;
    instructions: Array<{
      content: string;
    }>;
  }
  
  export interface Dimensions {
    width: number;
    height: number;
    depth: number;
    unit: string;
  }
  
  export interface Material {
    type: string;
    properties: MaterialProperties;
    // Added for build plan requirements
    name?: string;
    quantity?: number;
    dimensions?: string;
    species?: string;
    // Added for MCP integration
    sourceResource?: any; // LumberResource | HardwareResource from MCP
    price?: {
      amount: number;
      currency: string;
      unit: string;
    };
    availability?: {
      in_stock: boolean;
      quantity: number;
      location?: string;
      lead_time?: string;
    };
  }
  
  export interface MaterialProperties {
  cost_per_board_foot: number;
  workability: 'easy' | 'moderate' | 'difficult';
  durability: string;
  indoor_outdoor?: 'indoor' | 'outdoor' | 'both';
  hardness?: number;
  modulus_rupture?: number;
  modulus_elasticity?: number;
  density?: number;
}
  
  export interface JoineryMethod {
    type: string;
    difficulty: string;
    strength_rating: string;
    materials_compatible: string[];
  }
  
  export interface Hardware {
    type: HardwareType;
    size: string;
    quantity: number;
    material: string;
    finish?: string;
    cost_per_unit: number;
  }
  
  export interface CutListItem {
    id: string;
    part_name: string;
    quantity: number;
    material: Material;
    dimensions: {
      length: number;
      width: number;
      thickness: number;
    };
    grain_direction?: 'length' | 'width';
    notes?: string;
  }
  
  export interface BOMItem {
    category: 'lumber' | 'hardware' | 'finish' | 'other';
    item: string;
    quantity: number;
    unit: string;
    unit_cost: number;
    total_cost: number;
    supplier?: string;
    url?: string;
  }
  
  export interface AssemblyStep {
    step_number: number;
    title: string;
    description: string;
    parts_needed: string[];
    tools_needed: Tool[];
    hardware_needed?: Hardware[];
    time_estimate: string;
    tips?: string[];
    warnings?: string[];
    image_url?: string;
  }
  
  export interface Model3D {
    url: string;
    format: '3mf' | 'gltf' | 'obj' | 'stl';
    assembled_view_url: string;
    exploded_view_url?: string;
    animations?: ModelAnimation[];
    generated_at: Date;
  }
  
  export interface ModelAnimation {
    name: string;
    description: string;
    duration_seconds: number;
    url: string;
  }
  
  // ============= Chat & AI Types =============
  
  export interface Message {
    id: string;
    content: string;
    role: 'user' | 'assistant' | 'system';
    timestamp: Date;
    intent?: IntentType;
    metadata?: MessageMetadata;
  }
  
  export interface MessageMetadata {
  agent_responses?: AgentResponse[];
  design_snapshot?: Partial<FurnitureDesign>;
  suggestions?: string[];
  validation_issues?: string[];
  isError?: boolean;
  errorCode?: string;
}
  
  export interface AgentResponse {
    success: boolean;
    data: any;
    confidence?: number;
    reasoning?: string;
    suggestions?: string[];
    validation_issues?: string[];
    next_steps?: string[];
  }
  
  // ============= Intent & Agent Types =============
  
  export enum IntentType {
    DESIGN_INITIATION = 'DESIGN_INITIATION',
    DIMENSION_SPECIFICATION = 'DIMENSION_SPECIFICATION',
    MATERIAL_SELECTION = 'MATERIAL_SELECTION',
    MATERIAL_SOURCING = 'MATERIAL_SOURCING',
    JOINERY_METHOD = 'JOINERY_METHOD',
    VALIDATION_CHECK = 'VALIDATION_CHECK',
    EXPORT_REQUEST = 'EXPORT_REQUEST',
    MODIFICATION_REQUEST = 'MODIFICATION_REQUEST',
    STYLE_AESTHETIC = 'STYLE_AESTHETIC',
    CONSTRAINT_SPECIFICATION = 'CONSTRAINT_SPECIFICATION',
    CLARIFICATION_NEEDED = 'CLARIFICATION_NEEDED'
  }
  
  export interface IntentResult {
    primary_intent: IntentType;
    secondary_intents: IntentType[];
    requires_clarification: boolean;
    clarification_prompts?: string[];
    confidence: number;
  }
  
  export interface IntentClassification {
    primary_intent: IntentType;
    secondary_intents: IntentType[];
    confidence: 'high' | 'medium' | 'low';
    entities: IntentEntities;
    requires_clarification: boolean;
    clarification_prompts?: string[];
    suggested_next_intents: IntentType[];
  }
  
  export interface IntentEntities {
    furniture_type?: FurnitureType;
    dimensions?: Array<{
      type: string;
      value: number;
      unit: string;
    }>;
    materials?: string[];
    style?: string;
    constraints?: string[];
    features?: string[];
  }
  
  // ============= Knowledge Graph Types =============
  
  export interface KnowledgeNode {
    id: string;
    type: 'material' | 'joinery' | 'tool' | 'technique' | 'style';
    name: string;
    properties: Record<string, any>;
    relationships: Relationship[];
  }
  
  export interface Relationship {
    type: RelationshipType;
    target_id: string;
    strength: number;      // 0-1
    metadata?: Record<string, any>;
  }
  
  export type RelationshipType = 
    | 'compatible_with'
    | 'requires'
    | 'enhances'
    | 'conflicts_with'
    | 'alternative_to'
    | 'commonly_used_with'
    | 'suitable_for';
  
  export interface CompatibilityRule {
    id: string;
    name: string;
    condition: (design: FurnitureDesign) => boolean;
    validate: (design: FurnitureDesign) => ValidationResult;
    auto_fix?: (design: FurnitureDesign) => FurnitureDesign;
  }
  
  export interface ValidationResult {
    isValid: boolean;
    issues: string[];
    physics?: PhysicsValidation;
    recommendations: string[];
  }
  
  export interface ValidationIssue {
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    affected_component?: string;
    fix_available: boolean;
  }
  
  // ============= Communication Types =============
  
  export interface AgentMessage {
    id: string;
    from_agent: string;
    to_agent: string;
    type: MessageType;
    payload: any;
    timestamp: Date;
    requires_response: boolean;
    timeout_ms?: number;
  }
  
  export type MessageType = 
    | 'query'
    | 'response'
    | 'broadcast'
    | 'update'
    | 'validation_request'
    | 'constraint_update';
  
  export interface SharedState {
    version: number;
    design: Partial<FurnitureDesign>;
    constraints: DesignConstraints;
    validation_results: Map<string, ValidationResult>;
    agent_decisions: Map<string, AgentDecision>;
    locked_properties: Set<string>;
    history: StateChange[];
    lastUpdated: Date;
  }
  
  export interface DesignConstraints {
    dimensional: DimensionalConstraints;
    material: MaterialConstraints;
    structural: StructuralConstraints;
    aesthetic: AestheticConstraints;
    budget: BudgetConstraints;
  }
  
  export interface DimensionalConstraints {
    max_width?: number;
    max_height?: number;
    max_depth?: number;
    min_width?: number;
    min_height?: number;
    min_depth?: number;
    space_available?: Dimensions;
  }
  
  export interface MaterialConstraints {
    allowed_types?: MaterialType[];
    excluded_types?: MaterialType[];
    max_thickness?: number;
    min_thickness?: number;
    sustainability_required?: boolean;
    indoor_outdoor?: 'indoor' | 'outdoor' | 'both';
  }
  
  export interface StructuralConstraints {
    min_load_capacity: number;    // kg
    max_weight?: number;          // kg
    min_safety_factor: number;    // typically 2-3
    stability_requirement: 'standard' | 'enhanced' | 'maximum';
  }
  
  export interface AestheticConstraints {
    style?: FurnitureStyle;
    color_palette?: string[];
    must_match?: string[];       // Other furniture to match
    finish_type?: FinishType;
  }
  
  export interface BudgetConstraints {
    max_material_cost?: number;
    max_hardware_cost?: number;
    max_total_cost?: number;
    preferred_cost_range?: 'low' | 'medium' | 'high';
  }
  
  export interface AgentDecision {
    agent_name: string;
    decision_type: string;
    value: any;
    reasoning: string;
    confidence: number;
    timestamp: Date;
    alternatives_considered?: any[];
  }
  
  export interface StateChange {
    agent: string;
    timestamp: Date;
    previous_value: any;
    new_value: any;
    property_path: string;
    reason?: string;
  }
  
  // ============= Enums =============
  
  export type FurnitureType = 
    | 'table'
    | 'chair'
    | 'bookshelf'
    | 'cabinet'
    | 'desk'
    | 'bed'
    | 'nightstand'
    | 'dresser'
    | 'bench'
    | 'shelf'
    | 'storage'
    | 'other';
  
  export type MaterialType = 
    | 'solid_wood'
    | 'plywood'
    | 'mdf'
    | 'particle_board'
    | 'metal'
    | 'glass'
    | 'other';
  
  export type WoodSpecies = 
    | 'pine'
    | 'oak'
    | 'maple'
    | 'walnut'
    | 'cherry'
    | 'birch'
    | 'cedar'
    | 'mahogany'
    | 'teak'
    | 'poplar'
    | 'ash'
    | 'other';
  
  export type MaterialGrade = 
    | 'select'
    | 'premium'
    | 'standard'
    | 'utility';
  
  export type JoineryType = 
    | 'mortise_tenon'
    | 'dovetail'
    | 'box_joint'
    | 'dowel'
    | 'biscuit'
    | 'pocket_hole'
    | 'screw'
    | 'nail'
    | 'glue'
    | 'floating_tenon'
    | 'spline'
    | 'rabbet'
    | 'dado';
  
  export type HardwareType = 
    | 'screw'
    | 'nail'
    | 'bolt'
    | 'hinge'
    | 'drawer_slide'
    | 'handle'
    | 'knob'
    | 'bracket'
    | 'connector'
    | 'other';
  
  export type Tool = 
    | 'saw'
    | 'drill'
    | 'sander'
    | 'router'
    | 'planer'
    | 'jointer'
    | 'table_saw'
    | 'miter_saw'
    | 'circular_saw'
    | 'jigsaw'
    | 'bandsaw'
    | 'chisel'
    | 'hammer'
    | 'screwdriver'
    | 'clamps'
    | 'measuring_tape'
    | 'square'
    | 'level'
    | 'pencil';
  
  export type FurnitureStyle = 
    | 'modern'
    | 'traditional'
    | 'rustic'
    | 'industrial'
    | 'scandinavian'
    | 'mid_century'
    | 'farmhouse'
    | 'minimalist'
    | 'contemporary'
    | 'craftsman'
    | 'shaker';
  
  export type FinishType = 
    | 'natural'
    | 'stained'
    | 'painted'
    | 'lacquered'
    | 'oiled'
    | 'waxed'
    | 'polyurethane'
    | 'shellac'
    | 'varnish';
  
  export type DifficultyLevel = 
    | 'beginner'
    | 'intermediate'
    | 'advanced'
    | 'expert';
  
  export type ValidationStatus = 
    | 'pending'
    | 'valid'
    | 'invalid'
    | 'needs_review';
  
  // ============= Utility Types =============
  
  export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
  };
  
  export type Result<T, E = Error> = 
    | { success: true; data: T }
    | { success: false; error: E };
  
  export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

  // ============= Agent Response Types =============
  
  export interface BaseAgentResponse {
    success: boolean;
    data: any;
    suggestions?: string[];
    validation_issues?: string[];
    next_steps?: string[];
    confidence?: number;
    processing_time_ms?: number;
  }

  export interface DimensionAgentResponse {
    measurements: Array<{
      component: string;
      dimension_type: 'height' | 'width' | 'depth' | 'thickness' | 'diameter';
      value: number;
      unit: string;
      converted_to_inches: number;
    }>;
    total_dimensions: {
      height?: number;
      width?: number;
      depth?: number;
      thickness?: number;
      diameter?: number;
    };
    material_requirements: {
      board_feet: number;
      sheet_goods_area?: number;
    };
    ergonomic_validation: {
      is_valid: boolean;
      issues: string[];
    };
  }

  export interface MaterialAgentResponse {
    primary_material: {
      name: string;
      type: string;
      properties: any;
      cost_estimate: number;
    };
    alternatives: Array<{
      name: string;
      reason: string;
      cost_estimate: number;
    }>;
    compatibility: {
      with_dimensions: boolean;
      with_environment: boolean;
      with_budget: boolean;
    };
  }

  export interface JoineryAgentResponse {
    primary_method: {
      name: string;
      strength: number;
      difficulty: string;
      tools: string[];
    };
    alternatives: Array<{
      name: string;
      strength: number;
      reason: string;
    }>;
    joint_locations: Array<{
      location: string;
      method: string;
      quantity: number;
    }>;
    hardware_needed: Array<{
      item: string;
      quantity: number;
      size: string;
    }>;
  }

  export interface ValidationAgentResponse {
    is_valid: boolean;
    physics: {
      stable: boolean;
      max_load: number;
      safety_factor: number;
      critical_points: string[];
    };
    material_strength: {
      adequate: boolean;
      utilization: number;
      warnings: string[];
    };
    joinery_strength: {
      sufficient: boolean;
      weakest_point: string;
      improvements: string[];
    };
    overall_score: number;
  }

  export type SpecificAgentResponse = 
    | DimensionAgentResponse
    | MaterialAgentResponse
    | JoineryAgentResponse
    | ValidationAgentResponse;

  export interface PhysicsValidation {
    max_load: number;
    safety_factor: number;
  }

  export interface Joinery {
    type: JoineryType;
    difficulty: string;
    strength_rating: string;
    materials_compatible: string[];
  }

  export interface DesignContext {
    furniture_type?: string;
    dimensions?: Dimensions;
    materials?: Material[];
    joinery?: Joinery[];
    validation?: ValidationResult;
    interactions: Array<{
      input: string;
      intent: IntentResult;
      timestamp: number;
    }>;
  }

  export interface OrchestratorResult {
    success: boolean;
    design: any;
    validation: ValidationResult;
    variations: any[];
    reasoning: any;
    responseText: string;
  }

  export interface SystemStatus {
    isInitialized: boolean;
    context: DesignContext;
    agents: string[];
  }
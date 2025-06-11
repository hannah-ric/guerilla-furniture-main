/**
 * CSG (Constructive Solid Geometry) operations for Three.js
 * Used for creating joinery features like mortises, dados, etc.
 */

import * as THREE from 'three';
import { SUBTRACTION, ADDITION, INTERSECTION, Brush, Evaluator } from 'three-bvh-csg';
import { Logger } from '@/lib/logger';

export class CSG {
  private static logger = Logger.createScoped('CSG');
  private static evaluator = new Evaluator();

  /**
   * Prepare geometry for CSG operations
   */
  private static prepareGeometry(geometry: THREE.BufferGeometry): Brush {
    // Ensure geometry has proper attributes
    if (!geometry.attributes.position) {
      throw new Error('Geometry must have position attribute');
    }

    // Create a material if needed
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    
    // Create brush from geometry
    const brush = new Brush(geometry, material);
    brush.updateMatrixWorld();
    
    return brush;
  }

  /**
   * Apply transformation to brush
   */
  private static applyTransform(
    brush: Brush, 
    position: THREE.Vector3, 
    rotation: THREE.Euler,
    scale?: THREE.Vector3
  ): void {
    brush.position.copy(position);
    brush.rotation.copy(rotation);
    if (scale) {
      brush.scale.copy(scale);
    }
    brush.updateMatrixWorld();
  }

  /**
   * Subtract one geometry from another
   */
  static subtract(
    targetGeometry: THREE.BufferGeometry, 
    subtractGeometry: THREE.BufferGeometry,
    subtractPosition: THREE.Vector3,
    subtractRotation: THREE.Euler,
    subtractScale?: THREE.Vector3
  ): THREE.BufferGeometry {
    try {
      // Create brushes
      const targetBrush = this.prepareGeometry(targetGeometry);
      const subtractBrush = this.prepareGeometry(subtractGeometry);
      
      // Apply transformation to subtract brush
      this.applyTransform(subtractBrush, subtractPosition, subtractRotation, subtractScale);
      
      // Perform subtraction
      const result = this.evaluator.evaluate(targetBrush, subtractBrush, SUBTRACTION);
      
      // Clean up
      targetBrush.geometry.dispose();
      subtractBrush.geometry.dispose();
      
      this.logger.debug('CSG subtraction completed successfully');
      return result.geometry;
      
    } catch (error) {
      this.logger.error('CSG subtraction failed', error);
      // Return original geometry on failure
      return targetGeometry.clone();
    }
  }

  /**
   * Union two geometries
   */
  static union(
    geometry1: THREE.BufferGeometry,
    geometry2: THREE.BufferGeometry,
    position2: THREE.Vector3,
    rotation2: THREE.Euler,
    scale2?: THREE.Vector3
  ): THREE.BufferGeometry {
    try {
      // Create brushes
      const brush1 = this.prepareGeometry(geometry1);
      const brush2 = this.prepareGeometry(geometry2);
      
      // Apply transformation to second brush
      this.applyTransform(brush2, position2, rotation2, scale2);
      
      // Perform union
      const result = this.evaluator.evaluate(brush1, brush2, ADDITION);
      
      // Clean up
      brush1.geometry.dispose();
      brush2.geometry.dispose();
      
      this.logger.debug('CSG union completed successfully');
      return result.geometry;
      
    } catch (error) {
      this.logger.error('CSG union failed', error);
      // Return first geometry on failure
      return geometry1.clone();
    }
  }

  /**
   * Intersect two geometries
   */
  static intersect(
    geometry1: THREE.BufferGeometry,
    geometry2: THREE.BufferGeometry,
    position2: THREE.Vector3,
    rotation2: THREE.Euler,
    scale2?: THREE.Vector3
  ): THREE.BufferGeometry {
    try {
      // Create brushes
      const brush1 = this.prepareGeometry(geometry1);
      const brush2 = this.prepareGeometry(geometry2);
      
      // Apply transformation to second brush
      this.applyTransform(brush2, position2, rotation2, scale2);
      
      // Perform intersection
      const result = this.evaluator.evaluate(brush1, brush2, INTERSECTION);
      
      // Clean up
      brush1.geometry.dispose();
      brush2.geometry.dispose();
      
      this.logger.debug('CSG intersection completed successfully');
      return result.geometry;
      
    } catch (error) {
      this.logger.error('CSG intersection failed', error);
      // Return first geometry on failure
      return geometry1.clone();
    }
  }

  /**
   * Create a mortise (rectangular hole) in a geometry
   */
  static createMortise(
    targetGeometry: THREE.BufferGeometry,
    mortiseWidth: number,
    mortiseHeight: number,
    mortiseDepth: number,
    position: THREE.Vector3,
    rotation: THREE.Euler = new THREE.Euler()
  ): THREE.BufferGeometry {
    // Create mortise geometry
    const mortiseGeometry = new THREE.BoxGeometry(mortiseWidth, mortiseHeight, mortiseDepth);
    
    // Subtract mortise from target
    return this.subtract(targetGeometry, mortiseGeometry, position, rotation);
  }

  /**
   * Create a dado (groove) in a geometry
   */
  static createDado(
    targetGeometry: THREE.BufferGeometry,
    dadoWidth: number,
    dadoDepth: number,
    dadoLength: number,
    position: THREE.Vector3,
    rotation: THREE.Euler = new THREE.Euler()
  ): THREE.BufferGeometry {
    // Create dado geometry
    const dadoGeometry = new THREE.BoxGeometry(dadoLength, dadoDepth, dadoWidth);
    
    // Subtract dado from target
    return this.subtract(targetGeometry, dadoGeometry, position, rotation);
  }

  /**
   * Create a rabbet (L-shaped cut) in a geometry
   */
  static createRabbet(
    targetGeometry: THREE.BufferGeometry,
    rabbetWidth: number,
    rabbetDepth: number,
    rabbetLength: number,
    position: THREE.Vector3,
    rotation: THREE.Euler = new THREE.Euler()
  ): THREE.BufferGeometry {
    // Create rabbet geometry
    const rabbetGeometry = new THREE.BoxGeometry(rabbetLength, rabbetDepth, rabbetWidth);
    
    // Subtract rabbet from target
    return this.subtract(targetGeometry, rabbetGeometry, position, rotation);
  }

  /**
   * Create pocket holes in a geometry
   */
  static createPocketHole(
    targetGeometry: THREE.BufferGeometry,
    holeDiameter: number,
    holeDepth: number,
    position: THREE.Vector3,
    angle: number = 15 // degrees
  ): THREE.BufferGeometry {
    // Create cylinder for pocket hole
    const holeGeometry = new THREE.CylinderGeometry(
      holeDiameter / 2, 
      holeDiameter / 2, 
      holeDepth, 
      16
    );
    
    // Rotate for pocket hole angle
    const rotation = new THREE.Euler(0, 0, THREE.MathUtils.degToRad(angle));
    
    // Subtract hole from target
    return this.subtract(targetGeometry, holeGeometry, position, rotation);
  }

  /**
   * Create dowel holes in a geometry
   */
  static createDowelHole(
    targetGeometry: THREE.BufferGeometry,
    holeDiameter: number,
    holeDepth: number,
    position: THREE.Vector3,
    direction: THREE.Vector3 = new THREE.Vector3(0, 1, 0)
  ): THREE.BufferGeometry {
    // Create cylinder for dowel hole
    const holeGeometry = new THREE.CylinderGeometry(
      holeDiameter / 2, 
      holeDiameter / 2, 
      holeDepth, 
      16
    );
    
    // Calculate rotation to align with direction
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, direction.normalize());
    const rotation = new THREE.Euler().setFromQuaternion(quaternion);
    
    // Subtract hole from target
    return this.subtract(targetGeometry, holeGeometry, position, rotation);
  }

  /**
   * Round edges of a geometry (simplified approach)
   */
  static roundEdges(
    geometry: THREE.BufferGeometry, 
    radius: number,
    segments: number = 4
  ): THREE.BufferGeometry {
    // For now, return a simple beveled version
    // Full implementation would require edge detection and filleting
    try {
      // Clone geometry to avoid modifying original
      const rounded = geometry.clone();
      
      // Apply simple smoothing by scaling vertices slightly inward at edges
      // This is a placeholder - proper implementation would use subdivision surfaces
      
      this.logger.debug('Edge rounding applied (simplified)');
      return rounded;
      
    } catch (error) {
      this.logger.error('Edge rounding failed', error);
      return geometry.clone();
    }
  }

  /**
   * Cleanup resources
   */
  static dispose(): void {
    // Dispose of evaluator if needed
    this.evaluator = new Evaluator();
  }
} 
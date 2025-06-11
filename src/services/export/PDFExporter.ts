import jsPDF from 'jspdf';
import { FurnitureDesign } from '@/lib/types';
import { Logger } from '@/lib/logger';

export class PDFExporter {
  private logger = Logger.createScoped('PDFExporter');
  private doc: jsPDF;
  private currentY: number;
  private readonly pageWidth = 210; // A4 width in mm
  private readonly pageHeight = 297; // A4 height in mm
  private readonly margin = 20;
  private readonly lineHeight = 7;

  constructor() {
    this.doc = new jsPDF();
    this.currentY = this.margin;
  }

  /**
   * Export furniture design to PDF
   */
  async exportDesign(design: FurnitureDesign): Promise<Blob> {
    this.logger.info('Generating PDF export', { 
      type: design.furniture_type,
      name: design.name 
    });

    try {
      // Reset document
      this.doc = new jsPDF();
      this.currentY = this.margin;

      // Title page
      this.addTitlePage(design);

      // Design specifications
      this.addNewPage();
      this.addDesignSpecifications(design);

      // Cut list
      this.addNewPage();
      this.addCutList(design);

      // Assembly instructions
      if (design.assembly_steps?.length) {
        this.addNewPage();
        this.addAssemblyInstructions(design);
      }

      // Hardware list
      if (design.hardware?.length) {
        this.addNewPage();
        this.addHardwareList(design);
      }

      // Generate blob
      const blob = this.doc.output('blob');
      
      this.logger.info('PDF generated successfully', { 
        pages: this.doc.getNumberOfPages() 
      });

      return blob;

    } catch (error) {
      this.logger.error('PDF generation failed', error);
      throw new Error('Failed to generate PDF');
    }
  }

  /**
   * Add title page
   */
  private addTitlePage(design: FurnitureDesign): void {
    // Title
    this.doc.setFontSize(28);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(design.name || 'Furniture Design', this.pageWidth / 2, 50, { 
      align: 'center' 
    });

    // Furniture type
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(
      this.formatFurnitureType(design.furniture_type), 
      this.pageWidth / 2, 
      65, 
      { align: 'center' }
    );

    // Generated date
    this.doc.setFontSize(12);
    this.doc.text(
      `Generated: ${new Date().toLocaleDateString()}`,
      this.pageWidth / 2,
      80,
      { align: 'center' }
    );

    // Summary box
    this.drawBox(30, 100, this.pageWidth - 60, 80);
    
    // Summary content
    this.currentY = 110;
    this.doc.setFontSize(11);
    
    this.addLabeledText('Dimensions', 
      `${design.dimensions.width}" W × ${design.dimensions.height}" H × ${design.dimensions.depth}" D`
    );
    
    if (design.materials?.length) {
      this.addLabeledText('Primary Material', 
        design.materials[0].type
      );
    }
    
    if (design.estimated_cost) {
      this.addLabeledText('Estimated Cost', `$${design.estimated_cost}`);
    }
    
    if (design.difficulty_level) {
      this.addLabeledText('Difficulty', 
        this.capitalize(design.difficulty_level)
      );
    }
    
    if (design.estimated_build_time) {
      this.addLabeledText('Build Time', design.estimated_build_time);
    }

    // Footer
    this.addFooter();
  }

  /**
   * Add design specifications
   */
  private addDesignSpecifications(design: FurnitureDesign): void {
    this.addHeader('Design Specifications');

    // Dimensions section
    this.addSectionTitle('Dimensions');
    this.addLabeledText('Overall Width', `${design.dimensions.width} inches`);
    this.addLabeledText('Overall Height', `${design.dimensions.height} inches`);
    this.addLabeledText('Overall Depth', `${design.dimensions.depth} inches`);
    
    const volume = (design.dimensions.width * design.dimensions.height * design.dimensions.depth) / 1728;
    this.addLabeledText('Volume', `${volume.toFixed(2)} cubic feet`);

    this.currentY += 10;

    // Materials section
    if (design.materials?.length) {
      this.addSectionTitle('Materials');
      design.materials.forEach((material, index) => {
        this.addLabeledText(
          `Material ${index + 1}`,
          material.type
        );
        
        if (material.properties) {
          const props = material.properties;
          this.doc.setFontSize(9);
          this.doc.text(
            `   Workability: ${props.workability} | Cost: $${props.cost_per_board_foot}/bf`,
            this.margin + 10,
            this.currentY
          );
          this.currentY += this.lineHeight * 0.8;
        }
      });
    }

    this.currentY += 10;

    // Joinery section
    if (design.joinery?.length) {
      this.addSectionTitle('Joinery Methods');
      design.joinery.forEach((joint) => {
        this.addLabeledText(
          joint.type,
          `Strength: ${joint.strength_rating} | Difficulty: ${joint.difficulty}`
        );
      });
    }

    this.addFooter();
  }

  /**
   * Add cut list
   */
  private addCutList(design: FurnitureDesign): void {
    this.addHeader('Cut List');

    if (!design.cut_list?.length) {
      this.doc.text('Cut list will be generated when design is finalized.', 
        this.margin, this.currentY);
      this.addFooter();
      return;
    }

    // Table headers
    const headers = ['Part Name', 'Qty', 'Dimensions (L×W×T)', 'Material', 'Notes'];
    const columnWidths = [50, 20, 50, 40, 30];
    
    this.drawTableHeaders(headers, columnWidths);

    // Table rows
    design.cut_list.forEach((item) => {
      const dims = item.dimensions;
      const dimensionText = `${dims.length}" × ${dims.width}" × ${dims.thickness}"`;
      
      const row = [
        item.part_name,
        item.quantity.toString(),
        dimensionText,
        item.material.type,
        item.notes || '-'
      ];
      
      this.drawTableRow(row, columnWidths);
    });

    // Total board feet calculation
    this.currentY += 10;
    const totalBoardFeet = this.calculateTotalBoardFeet(design.cut_list);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`Total Board Feet Required: ${totalBoardFeet.toFixed(2)} bf`, 
      this.margin, this.currentY);

    this.addFooter();
  }

  /**
   * Add assembly instructions
   */
  private addAssemblyInstructions(design: FurnitureDesign): void {
    this.addHeader('Assembly Instructions');

    if (!design.assembly_steps?.length) {
      this.doc.text('Assembly instructions not available.', 
        this.margin, this.currentY);
      this.addFooter();
      return;
    }

    design.assembly_steps.forEach((step, index) => {
      // Check if we need a new page
      if (this.currentY > this.pageHeight - 50) {
        this.addNewPage();
        this.addHeader('Assembly Instructions (continued)');
      }

      // Step number and title
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(12);
      this.doc.text(`Step ${step.step_number}: ${step.title}`, 
        this.margin, this.currentY);
      this.currentY += this.lineHeight;

      // Description
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(10);
      const descLines = this.doc.splitTextToSize(
        step.description, 
        this.pageWidth - 2 * this.margin
      );
      descLines.forEach((line: string) => {
        this.doc.text(line, this.margin + 5, this.currentY);
        this.currentY += this.lineHeight * 0.8;
      });

      // Parts needed
      if (step.parts_needed?.length) {
        this.doc.setFont('helvetica', 'italic');
        this.doc.text('Parts: ' + step.parts_needed.join(', '), 
          this.margin + 5, this.currentY);
        this.currentY += this.lineHeight * 0.8;
      }

      // Tools needed
      if (step.tools_needed?.length) {
        this.doc.text('Tools: ' + step.tools_needed.join(', '), 
          this.margin + 5, this.currentY);
        this.currentY += this.lineHeight * 0.8;
      }

      // Tips
      if (step.tips?.length) {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(0, 100, 0);
        step.tips.forEach(tip => {
          this.doc.text('💡 ' + tip, this.margin + 5, this.currentY);
          this.currentY += this.lineHeight * 0.8;
        });
        this.doc.setTextColor(0, 0, 0);
      }

      this.currentY += 10;
    });

    this.addFooter();
  }

  /**
   * Add hardware list
   */
  private addHardwareList(design: FurnitureDesign): void {
    this.addHeader('Hardware List');

    if (!design.hardware?.length) {
      this.doc.text('No hardware specified.', this.margin, this.currentY);
      this.addFooter();
      return;
    }

    // Table headers
    const headers = ['Item', 'Quantity', 'Size', 'Material', 'Est. Cost'];
    const columnWidths = [50, 30, 40, 40, 30];
    
    this.drawTableHeaders(headers, columnWidths);

    // Table rows
    let totalCost = 0;
    design.hardware.forEach((item) => {
      const itemCost = item.quantity * item.cost_per_unit;
      totalCost += itemCost;
      
      const row = [
        this.capitalize(item.type),
        item.quantity.toString(),
        item.size,
        item.material,
        `$${itemCost.toFixed(2)}`
      ];
      
      this.drawTableRow(row, columnWidths);
    });

    // Total cost
    this.currentY += 10;
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`Total Hardware Cost: $${totalCost.toFixed(2)}`, 
      this.margin, this.currentY);

    this.addFooter();
  }

  // Helper methods

  private addNewPage(): void {
    this.doc.addPage();
    this.currentY = this.margin;
  }

  private addHeader(title: string): void {
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(16);
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += this.lineHeight * 2;
    
    // Underline
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY - 5, 
      this.pageWidth - this.margin, this.currentY - 5);
    this.currentY += 5;
  }

  private addSectionTitle(title: string): void {
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += this.lineHeight;
  }

  private addLabeledText(label: string, value: string): void {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.text(`${label}: ${value}`, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
  }

  private addFooter(): void {
    const pageNumber = this.doc.getNumberOfPages();
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.text(
      `Page ${pageNumber} | Blueprint Buddy`, 
      this.pageWidth / 2, 
      this.pageHeight - 10, 
      { align: 'center' }
    );
  }

  private drawBox(x: number, y: number, width: number, height: number): void {
    this.doc.setDrawColor(200);
    this.doc.setLineWidth(0.5);
    this.doc.rect(x, y, width, height);
  }

  private drawTableHeaders(headers: string[], columnWidths: number[]): void {
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setFillColor(240, 240, 240);
    
    let x = this.margin;
    const y = this.currentY;
    const height = 8;
    
    // Draw header background
    this.doc.rect(x, y - 5, this.pageWidth - 2 * this.margin, height, 'F');
    
    // Draw header text
    headers.forEach((header, index) => {
      this.doc.text(header, x + 2, y);
      x += columnWidths[index];
    });
    
    this.currentY += height + 2;
  }

  private drawTableRow(data: string[], columnWidths: number[]): void {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    
    let x = this.margin;
    
    data.forEach((cell, index) => {
      const lines = this.doc.splitTextToSize(cell, columnWidths[index] - 4);
      lines.forEach((line: string) => {
        this.doc.text(line, x + 2, this.currentY);
      });
      x += columnWidths[index];
    });
    
    this.currentY += this.lineHeight;
  }

  private calculateTotalBoardFeet(cutList: any[]): number {
    return cutList.reduce((total, item) => {
      const bf = (item.dimensions.length * item.dimensions.width * 
                  item.dimensions.thickness * item.quantity) / 144;
      return total + bf;
    }, 0);
  }

  private formatFurnitureType(type: string): string {
    return type.split('_').map(word => this.capitalize(word)).join(' ');
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
} 
import { Logger } from '@/lib/logger';

export interface MaterialResource {
  id: string;
  name: string;
  type: 'lumber' | 'hardware' | 'tools' | 'finishes' | 'accessories';
  provider: string;
  sku: string;
  description: string;
  specifications: {
    dimensions?: {
      length: number;
      width: number;
      thickness: number;
      unit: 'inch' | 'cm';
    };
    material?: string;
    grade?: string;
    treatment?: string;
    color?: string;
    finish?: string;
  };
  pricing: {
    amount: number;
    currency: string;
    unit: 'piece' | 'linear_foot' | 'board_foot' | 'sheet' | 'gallon' | 'pound';
    quantity_breaks?: {
      min_quantity: number;
      price_per_unit: number;
    }[];
  };
  availability: {
    in_stock: boolean;
    quantity_available: number;
    location: string;
    estimated_delivery: string | null;
    pickup_available: boolean;
  };
  images: string[];
  category_path: string[];
  tags: string[];
  last_updated: string;
}

export interface PriceComparison {
  resource_id: string;
  providers: {
    provider_name: string;
    price: number;
    availability: boolean;
    delivery_time: string | null;
    shipping_cost: number;
    total_cost: number;
    rating: number;
    reviews_count: number;
    url: string;
  }[];
  best_deal: {
    provider: string;
    savings: number;
    reason: string;
  };
}

export interface ShoppingCart {
  id: string;
  items: ShoppingCartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  provider_carts: {
    provider: string;
    items: ShoppingCartItem[];
    subtotal: number;
    shipping: number;
    estimated_delivery: string;
  }[];
}

export interface ShoppingCartItem {
  resource_id: string;
  quantity: number;
  price_per_unit: number;
  line_total: number;
  provider: string;
  notes?: string;
}

export interface ProviderAPI {
  name: string;
  authenticate(): Promise<boolean>;
  searchProducts(query: string, filters?: Record<string, any>): Promise<MaterialResource[]>;
  getProduct(sku: string): Promise<MaterialResource | null>;
  checkAvailability(sku: string, location?: string): Promise<any>;
  getPricing(sku: string, quantity?: number): Promise<any>;
  getStoreLocations(zipCode: string, radius?: number): Promise<any[]>;
}

class HomeDepotAPI implements ProviderAPI {
  name = 'Home Depot';
  private apiKey: string;
  private baseUrl = 'https://api.homedepot.com/v1';
  private logger = Logger.createScoped('HomeDepotAPI');

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async authenticate(): Promise<boolean> {
    try {
      // Test API connection
      const response = await fetch(`${this.baseUrl}/products?keyword=test&limit=1`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch (error) {
      this.logger.error('Authentication failed', error);
      return false;
    }
  }

  async searchProducts(query: string, filters: Record<string, any> = {}): Promise<MaterialResource[]> {
    try {
      const params = new URLSearchParams({
        keyword: query,
        limit: '50',
        ...filters
      });

      const response = await fetch(`${this.baseUrl}/products?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      return this.mapHomeDepotProducts(data.products || []);
    } catch (error) {
      this.logger.error('Search failed', error);
      return [];
    }
  }

  async getProduct(sku: string): Promise<MaterialResource | null> {
    try {
      const response = await fetch(`${this.baseUrl}/products/${sku}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) return null;

      const product = await response.json();
      const mapped = this.mapHomeDepotProducts([product]);
      return mapped[0] || null;
    } catch (error) {
      this.logger.error('Get product failed', error);
      return null;
    }
  }

  async checkAvailability(sku: string, location = '90210'): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/products/${sku}/availability?zipCode=${location}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return await response.json();
    } catch (error) {
      this.logger.error('Availability check failed', error);
      return { available: false, quantity: 0 };
    }
  }

  async getPricing(sku: string, quantity = 1): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/products/${sku}/pricing?quantity=${quantity}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return await response.json();
    } catch (error) {
      this.logger.error('Pricing check failed', error);
      return { price: 0 };
    }
  }

  async getStoreLocations(zipCode: string, radius = 25): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/stores?zipCode=${zipCode}&radius=${radius}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      return data.stores || [];
    } catch (error) {
      this.logger.error('Store locations failed', error);
      return [];
    }
  }

  private mapHomeDepotProducts(products: any[]): MaterialResource[] {
    return products.map(product => ({
      id: `hd-${product.sku}`,
      name: product.title || product.name,
      type: this.categorizeProduct(product.category),
      provider: 'Home Depot',
      sku: product.sku,
      description: product.description || '',
      specifications: {
        dimensions: product.dimensions ? {
          length: parseFloat(product.dimensions.length) || 0,
          width: parseFloat(product.dimensions.width) || 0,
          thickness: parseFloat(product.dimensions.thickness) || 0,
          unit: 'inch' as const
        } : undefined,
        material: product.material,
        grade: product.grade,
        treatment: product.treatment,
        color: product.color,
        finish: product.finish
      },
      pricing: {
        amount: parseFloat(product.price?.regular) || 0,
        currency: 'USD',
        unit: this.determineUnit(product.category),
        quantity_breaks: product.pricing?.breaks?.map((b: any) => ({
          min_quantity: b.quantity,
          price_per_unit: b.price
        })) || []
      },
      availability: {
        in_stock: product.availability?.inStock || false,
        quantity_available: parseInt(product.availability?.quantity) || 0,
        location: product.availability?.location || 'Online',
        estimated_delivery: product.availability?.deliveryDate,
        pickup_available: product.availability?.pickupAvailable || false
      },
      images: product.images || [],
      category_path: product.breadcrumbs || [],
      tags: product.tags || [],
      last_updated: new Date().toISOString()
    }));
  }

  private categorizeProduct(category: string): MaterialResource['type'] {
    const categoryLower = category?.toLowerCase() || '';
    if (categoryLower.includes('lumber') || categoryLower.includes('wood')) return 'lumber';
    if (categoryLower.includes('hardware') || categoryLower.includes('screw') || categoryLower.includes('nail')) return 'hardware';
    if (categoryLower.includes('tool')) return 'tools';
    if (categoryLower.includes('stain') || categoryLower.includes('finish') || categoryLower.includes('paint')) return 'finishes';
    return 'accessories';
  }

  private determineUnit(category: string): MaterialResource['pricing']['unit'] {
    const categoryLower = category?.toLowerCase() || '';
    if (categoryLower.includes('lumber')) return 'board_foot';
    if (categoryLower.includes('paint') || categoryLower.includes('stain')) return 'gallon';
    if (categoryLower.includes('sheet') || categoryLower.includes('plywood')) return 'sheet';
    return 'piece';
  }
}

class LowesAPI implements ProviderAPI {
  name = 'Lowe\'s';
  private apiKey: string;
  private baseUrl = 'https://api.lowes.com/v1';
  private logger = Logger.createScoped('LowesAPI');

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async authenticate(): Promise<boolean> {
    // Similar implementation to Home Depot
    return true; // Placeholder
  }

  async searchProducts(query: string, filters: Record<string, any> = {}): Promise<MaterialResource[]> {
    // Similar implementation with Lowe's specific mapping
    return []; // Placeholder
  }

  async getProduct(sku: string): Promise<MaterialResource | null> {
    return null; // Placeholder
  }

  async checkAvailability(sku: string, location?: string): Promise<any> {
    return { available: false }; // Placeholder
  }

  async getPricing(sku: string, quantity?: number): Promise<any> {
    return { price: 0 }; // Placeholder
  }

  async getStoreLocations(zipCode: string, radius?: number): Promise<any[]> {
    return []; // Placeholder
  }
}

class LocalLumberYardAPI implements ProviderAPI {
  name = 'Local Lumber Yards';
  private logger = Logger.createScoped('LocalLumberYardAPI');

  async authenticate(): Promise<boolean> {
    return true; // Local suppliers often use different auth methods
  }

  async searchProducts(query: string, filters: Record<string, any> = {}): Promise<MaterialResource[]> {
    // Integration with local lumber yard networks
    return this.getLocalLumberProducts(query, filters);
  }

  async getProduct(sku: string): Promise<MaterialResource | null> {
    return null; // Placeholder
  }

  async checkAvailability(sku: string, location?: string): Promise<any> {
    return { available: true }; // Local yards typically have good availability
  }

  async getPricing(sku: string, quantity?: number): Promise<any> {
    return { price: 0 }; // Placeholder
  }

  async getStoreLocations(zipCode: string, radius?: number): Promise<any[]> {
    return this.getLocalYards(zipCode, radius);
  }

  private async getLocalLumberProducts(query: string, filters: Record<string, any>): Promise<MaterialResource[]> {
    // Simulate local lumber yard inventory
    const localProducts: MaterialResource[] = [
      {
        id: 'local-oak-1x8x10',
        name: 'Red Oak Board 1x8x10',
        type: 'lumber',
        provider: 'Johnson Lumber Co.',
        sku: 'ROB-1x8x10',
        description: 'Premium kiln-dried red oak board, perfect for furniture making',
        specifications: {
          dimensions: {
            length: 120,
            width: 7.25,
            thickness: 0.75,
            unit: 'inch'
          },
          material: 'Red Oak',
          grade: 'FAS (Firsts and Seconds)',
          treatment: 'Kiln Dried'
        },
        pricing: {
          amount: 45.99,
          currency: 'USD',
          unit: 'piece'
        },
        availability: {
          in_stock: true,
          quantity_available: 15,
          location: 'Johnson Lumber Co. - Main Yard',
          estimated_delivery: null,
          pickup_available: true
        },
        images: [],
        category_path: ['Lumber', 'Hardwood', 'Oak'],
        tags: ['premium', 'furniture-grade', 'kiln-dried'],
        last_updated: new Date().toISOString()
      }
    ];

    return localProducts.filter(product => 
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      product.specifications.material?.toLowerCase().includes(query.toLowerCase())
    );
  }

  private async getLocalYards(zipCode: string, radius: number = 25): Promise<any[]> {
    // Simulate local lumber yard directory
    return [
      {
        name: 'Johnson Lumber Co.',
        address: '123 Sawmill Rd, Woodville, ST 12345',
        phone: '(555) 123-4567',
        distance: 5.2,
        specialties: ['Hardwood', 'Custom Milling', 'Reclaimed Wood'],
        rating: 4.8,
        hours: 'Mon-Fri 7AM-6PM, Sat 8AM-4PM'
      }
    ];
  }
}

export class RealMaterialProviderService {
  private providers: Map<string, ProviderAPI> = new Map();
  private logger = Logger.createScoped('RealMaterialProviderService');
  private userLocation: string = '90210'; // Default, should be set by user

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize with API keys from environment
    const homeDepotKey = import.meta.env.VITE_HOME_DEPOT_API_KEY;
    const lowesKey = import.meta.env.VITE_LOWES_API_KEY;

    if (homeDepotKey) {
      this.providers.set('homedepot', new HomeDepotAPI(homeDepotKey));
    }

    if (lowesKey) {
      this.providers.set('lowes', new LowesAPI(lowesKey));
    }

    // Local lumber yards are always available
    this.providers.set('local', new LocalLumberYardAPI());

    this.logger.info(`Initialized ${this.providers.size} material providers`);
  }

  async searchMaterials(query: string, filters: Record<string, any> = {}): Promise<MaterialResource[]> {
    const results: MaterialResource[] = [];
    const searchPromises: Promise<MaterialResource[]>[] = [];

    for (const [name, provider] of this.providers) {
      searchPromises.push(
        provider.searchProducts(query, filters).catch(error => {
          this.logger.error(`Search failed for ${name}`, error);
          return [];
        })
      );
    }

    const providerResults = await Promise.allSettled(searchPromises);
    
    providerResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      }
    });

    return this.sortResults(results, query);
  }

  async comparePrices(materialSpecs: {
    type: string;
    dimensions?: any;
    material?: string;
    quantity: number;
  }): Promise<PriceComparison[]> {
    const searchQuery = this.buildSearchQuery(materialSpecs);
    const materials = await this.searchMaterials(searchQuery);
    
    const comparisons: PriceComparison[] = [];
    const groupedMaterials = this.groupSimilarMaterials(materials);

    for (const [groupKey, groupMaterials] of Object.entries(groupedMaterials)) {
      const providers = groupMaterials.map(material => ({
        provider_name: material.provider,
        price: material.pricing.amount,
        availability: material.availability.in_stock,
        delivery_time: material.availability.estimated_delivery,
        shipping_cost: this.estimateShipping(material),
        total_cost: material.pricing.amount + this.estimateShipping(material),
        rating: this.getProviderRating(material.provider),
        reviews_count: this.getProviderReviewCount(material.provider),
        url: this.buildProductUrl(material)
      }));

      const bestDeal = this.findBestDeal(providers);

      comparisons.push({
        resource_id: groupKey,
        providers,
        best_deal: bestDeal
      });
    }

    return comparisons;
  }

  async createShoppingCart(items: { material_id: string; quantity: number }[]): Promise<ShoppingCart> {
    const cartItems: ShoppingCartItem[] = [];
    const providerCarts = new Map<string, ShoppingCartItem[]>();

    for (const item of items) {
      const material = await this.getMaterialById(item.material_id);
      if (!material) continue;

      const cartItem: ShoppingCartItem = {
        resource_id: material.id,
        quantity: item.quantity,
        price_per_unit: material.pricing.amount,
        line_total: material.pricing.amount * item.quantity,
        provider: material.provider
      };

      cartItems.push(cartItem);

      if (!providerCarts.has(material.provider)) {
        providerCarts.set(material.provider, []);
      }
      providerCarts.get(material.provider)!.push(cartItem);
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.line_total, 0);
    const tax = subtotal * 0.08; // Estimate 8% tax
    const shipping = this.calculateShipping(cartItems);
    const total = subtotal + tax + shipping;

    return {
      id: `cart-${Date.now()}`,
      items: cartItems,
      subtotal,
      tax,
      shipping,
      total,
      provider_carts: Array.from(providerCarts.entries()).map(([provider, items]) => ({
        provider,
        items,
        subtotal: items.reduce((sum, item) => sum + item.line_total, 0),
        shipping: this.calculateShippingForProvider(provider, items),
        estimated_delivery: this.getEstimatedDelivery(provider)
      }))
    };
  }

  async getStoreLocations(zipCode?: string): Promise<any[]> {
    const location = zipCode || this.userLocation;
    const locations: any[] = [];

    for (const [name, provider] of this.providers) {
      try {
        const stores = await provider.getStoreLocations(location);
        locations.push(...stores.map(store => ({ ...store, provider: name })));
      } catch (error) {
        this.logger.error(`Store locations failed for ${name}`, error);
      }
    }

    return locations.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }

  setUserLocation(zipCode: string): void {
    this.userLocation = zipCode;
    this.logger.info(`User location updated to ${zipCode}`);
  }

  private async getMaterialById(id: string): Promise<MaterialResource | null> {
    // Extract provider and SKU from ID
    const [providerCode, sku] = id.split('-', 2);
    const provider = this.providers.get(providerCode);
    
    if (!provider || !sku) return null;

    return await provider.getProduct(sku);
  }

  private buildSearchQuery(specs: any): string {
    const parts = [];
    
    if (specs.material) parts.push(specs.material);
    if (specs.type) parts.push(specs.type);
    if (specs.dimensions) {
      if (specs.dimensions.thickness) parts.push(`${specs.dimensions.thickness}"`);
      if (specs.dimensions.width) parts.push(`${specs.dimensions.width}"`);
      if (specs.dimensions.length) parts.push(`${specs.dimensions.length}"`);
    }

    return parts.join(' ');
  }

  private sortResults(results: MaterialResource[], query: string): MaterialResource[] {
    const queryLower = query.toLowerCase();
    
    return results.sort((a, b) => {
      // Prioritize availability
      if (a.availability.in_stock && !b.availability.in_stock) return -1;
      if (!a.availability.in_stock && b.availability.in_stock) return 1;

      // Then by relevance to search query
      const aRelevance = this.calculateRelevance(a, queryLower);
      const bRelevance = this.calculateRelevance(b, queryLower);
      
      if (aRelevance !== bRelevance) return bRelevance - aRelevance;

      // Finally by price (lower first)
      return a.pricing.amount - b.pricing.amount;
    });
  }

  private calculateRelevance(material: MaterialResource, query: string): number {
    let score = 0;
    
    if (material.name.toLowerCase().includes(query)) score += 10;
    if (material.specifications.material?.toLowerCase().includes(query)) score += 8;
    if (material.description.toLowerCase().includes(query)) score += 5;
    if (material.tags.some(tag => tag.toLowerCase().includes(query))) score += 3;

    return score;
  }

  private groupSimilarMaterials(materials: MaterialResource[]): Record<string, MaterialResource[]> {
    const groups: Record<string, MaterialResource[]> = {};

    materials.forEach(material => {
      const key = this.generateGroupKey(material);
      if (!groups[key]) groups[key] = [];
      groups[key].push(material);
    });

    return groups;
  }

  private generateGroupKey(material: MaterialResource): string {
    const specs = material.specifications;
    return `${material.type}-${specs.material || 'unknown'}-${specs.dimensions?.thickness || 0}x${specs.dimensions?.width || 0}x${specs.dimensions?.length || 0}`;
  }

  private findBestDeal(providers: any[]): { provider: string; savings: number; reason: string } {
    if (providers.length === 0) {
      return { provider: '', savings: 0, reason: 'No providers available' };
    }

    const availableProviders = providers.filter(p => p.availability);
    if (availableProviders.length === 0) {
      return { provider: providers[0].provider_name, savings: 0, reason: 'Only option available' };
    }

    const cheapest = availableProviders.reduce((min, current) => 
      current.total_cost < min.total_cost ? current : min
    );

    const secondCheapest = availableProviders
      .filter(p => p.provider_name !== cheapest.provider_name)
      .reduce((min, current) => 
        current.total_cost < min.total_cost ? current : min, { total_cost: Infinity }
      );

    const savings = secondCheapest.total_cost === Infinity ? 0 : 
      secondCheapest.total_cost - cheapest.total_cost;

    return {
      provider: cheapest.provider_name,
      savings,
      reason: savings > 0 ? `Save $${savings.toFixed(2)} vs next best option` : 'Best available price'
    };
  }

  private estimateShipping(material: MaterialResource): number {
    // Simple shipping estimation logic
    if (material.type === 'lumber') return 25; // Heavy items
    if (material.type === 'hardware') return 5; // Light items
    return 15; // Default
  }

  private getProviderRating(provider: string): number {
    const ratings: Record<string, number> = {
      'Home Depot': 4.2,
      'Lowe\'s': 4.1,
      'Local': 4.7
    };
    return ratings[provider] || 4.0;
  }

  private getProviderReviewCount(provider: string): number {
    const counts: Record<string, number> = {
      'Home Depot': 125000,
      'Lowe\'s': 98000,
      'Local': 250
    };
    return counts[provider] || 1000;
  }

  private buildProductUrl(material: MaterialResource): string {
    const baseUrls: Record<string, string> = {
      'Home Depot': 'https://homedepot.com/p/',
      'Lowe\'s': 'https://lowes.com/pd/',
      'Local': '#'
    };
    
    const baseUrl = baseUrls[material.provider] || '#';
    return baseUrl + material.sku;
  }

  private calculateShipping(items: ShoppingCartItem[]): number {
    // Simple shipping calculation
    const totalWeight = items.reduce((sum, item) => sum + (item.quantity * 5), 0); // Estimate 5lbs per item
    if (totalWeight < 50) return 15;
    if (totalWeight < 200) return 35;
    return 75; // Heavy shipments
  }

  private calculateShippingForProvider(provider: string, items: ShoppingCartItem[]): number {
    return this.calculateShipping(items);
  }

  private getEstimatedDelivery(provider: string): string {
    const deliveryTimes: Record<string, string> = {
      'Home Depot': '3-5 business days',
      'Lowe\'s': '3-7 business days',
      'Local': 'Same day pickup available'
    };
    return deliveryTimes[provider] || '5-7 business days';
  }
}

// Global instance
export const realMaterialProviderService = new RealMaterialProviderService(); 
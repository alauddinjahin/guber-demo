
type BrandGroup = {
  canonical: string;
  members: Set<string>;
};


type BrandMatchResult = {
  assignedBrand: string | null;
  matchedBrands: string[];
};


// Constants for validation rules
const FRONT_PRIORITY_TERMS = new Set([
  'rich', 'rff', 'flex', 'ultra', 'gum', 'beauty', 
  'orto', 'free', '112', 'kin', 'happy'
]);

const FRONT_OR_SECOND_TERMS = new Set([
  'heel', 'contour', 'nero', 'rsv'
]);

const IGNORED_TERMS = new Set(['bio', 'neb']);



// Lithuanian character mappings, But I have implemented it optionally
const LITHUANIAN_CHAR_MAP: Record<string, string> = {
  'ą': 'a', 'č': 'c', 'ę': 'e', 'ė': 'e', 'į': 'i',
  'š': 's', 'ų': 'u', 'ū': 'u', 'ž': 'z', 'y': 'i',
  'Ą': 'A', 'Č': 'C', 'Ę': 'E', 'Ė': 'E', 'Į': 'I',
  'Š': 'S', 'Ų': 'U', 'Ū': 'U', 'Ž': 'Z', 'Y': 'I'
};

// Special brand normalizations
const SPECIAL_BRAND_MAPPINGS: Record<string, string> = {
  'babē': 'babe'
};

export class BrandDeduplicator {

  private brandGroups: Map<string, BrandGroup>;
  private canonicalMap: Record<string, string>;
  private brandPatternCache: Map<string, RegExp>;
  private normalizedTitleCache: Map<string, string>;
  private connections: any;

  constructor(connections: any) {
    this.connections = connections;
    this.brandGroups = new Map();
    this.canonicalMap = {};
    this.brandPatternCache = new Map();
    this.normalizedTitleCache = new Map();
    this.initializeBrandGraphAndMapping();
  }

  // brand relationships and build canonical mappings
  private initializeBrandGraphAndMapping(): void {
    const brandGraph = new Map<string, Set<string>>();

    // Build the connection graph from JSON file ( brandConnections.json )
    this.connections.forEach(({ manufacturer_p1, manufacturers_p2 }) => {
      const brand1 = this.normalizeBrand(manufacturer_p1);
      const brands2 = manufacturers_p2.split(';').map(b => this.normalizeBrand(b.trim()));

      if (!brandGraph.has(brand1)) {
        brandGraph.set(brand1, new Set());
      }

      brands2.forEach(brand2 => {

        if (!brandGraph.has(brand2)) {
          brandGraph.set(brand2, new Set());
        }

        brandGraph.get(brand1)!.add(brand2);
        brandGraph.get(brand2)!.add(brand1);
      });

    });

    // Find connected brand groups
    const visited = new Set<string>();
    
    for (const [brand] of brandGraph) {
      if (!visited.has(brand)) {
        const component = this.findConnectedComponent(brand, brandGraph, visited);
        this.createBrandGroup(component);
      }
    }
  }


  private normalizeBrand(brand: string): string {

    // Check cache first
    const cached = this.normalizedTitleCache.get(brand);
    if (cached) return cached;

    // Convert to lowercase and normalize Lithuanian chars
    let normalized = brand
      .split('')
      .map(c => LITHUANIAN_CHAR_MAP[c] || c)
      .join('')
      .toLowerCase();

    // Special brand mappings
    for (const [from, to] of Object.entries(SPECIAL_BRAND_MAPPINGS)) {
      normalized = normalized.replace(new RegExp(from, 'g'), to);
    }

    normalized = normalized
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    this.normalizedTitleCache.set(brand, normalized);
    return normalized;
  }


  
  // Find all brands connected to the starting brand using a Breadth First Search (BFS) Algorithm
  private findConnectedComponent(
    startBrand: string,
    graph: Map<string, Set<string>>,
    visited: Set<string>
  ): Set<string> {

    const queue = [startBrand]; // initiate quere here
    visited.add(startBrand);
    const component = new Set<string>([startBrand]);

    while (queue.length > 0) {

      const current = queue.shift()!; 
      
      for (const neighbor of graph.get(current) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          component.add(neighbor);
          queue.push(neighbor);
        }
      }

    }

    return component;
  }

  // Create a brand group and select canonical brand ( master representation for all variations )
  private createBrandGroup(component: Set<string>): void {
    const componentArray = Array.from(component);
    let canonical = null

    // Create the group
    const group: BrandGroup = {
      canonical,
      members: component
    };

    // Update mappings
    for (const member of component) {
      this.brandGroups.set(member, group);
      this.canonicalMap[member] = canonical;
    }
  }



   // Check if a brand is in our priority lists
  public isPriorityBrand(brand: string): boolean {
    const normalizedBrand = this.normalizeBrand(brand);
    const firstWord = normalizedBrand.split(/\s+/)[0];
    
    return FRONT_PRIORITY_TERMS.has(firstWord) || 
           FRONT_OR_SECOND_TERMS.has(firstWord);
  }



}
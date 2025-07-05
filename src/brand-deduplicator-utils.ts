
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

    try {
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
    catch (error) {
      const { message } = error;
      console.log(message ?? "Unable to mapping brands!");
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
    try {

      const componentArray = Array.from(component);
      let canonical = this.selectCanonicalBrandAndApplyRules(componentArray);

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

    } catch (error) {
      const { message } = error;
      console.log(message ?? "Unable to create brand's group!");
    }
  }



  // Check if a brand is in our priority lists
  public isPriorityBrand(brand: string): boolean {
    const normalizedBrand = this.normalizeBrand(brand);
    const firstWord = normalizedBrand.split(/\s+/)[0];

    return FRONT_PRIORITY_TERMS.has(firstWord) ||
      FRONT_OR_SECOND_TERMS.has(firstWord);
  }



  // Select canonical brand based on strict priority rules
  private selectCanonicalBrandAndApplyRules(brands: string[]): string {
    try {

      // rule 6: HAPPY needs to be matched capitalized
      const happyIndex = brands.findIndex(b => b === 'HAPPY');
      if (happyIndex >= 0) {
        return 'HAPPY';
      }

      // 3.5 rules: if >1 brands matched, prioritize matching beginning

      // Check for FRONT_PRIORITY_TERMS as first word (highest priority)
      const frontPriorityBrands = brands.filter(brand => {
        const firstWord = brand.split(/\s+/)[0].toLowerCase();
        return FRONT_PRIORITY_TERMS.has(firstWord);
      });


      // select the shortest one from the priority 
      if (frontPriorityBrands.length > 0) {
        return frontPriorityBrands.reduce((shortest, current) =>
          current.length < shortest.length ? current : shortest
        );
      }

      // Check for FRONT_OR_SECOND_TERMS (front or second priority)
      const frontOrSecondBrands = brands.filter(brand => {
        const words = brand.toLowerCase().split(/\s+/);
        return (words.length >= 1 && FRONT_OR_SECOND_TERMS.has(words[0])) ||
          (words.length >= 2 && FRONT_OR_SECOND_TERMS.has(words[1]));
      });

      if (frontOrSecondBrands.length > 0) {
        // select the shortest one from front or second priority brands
        return frontOrSecondBrands.reduce((shortest, current) =>
          current.length < shortest.length ? current : shortest
        );
      }

      // First try to find brands that aren't all uppercase and rest ones
      const nonUppercaseBrands = brands.filter(b => !b.match(/^[A-Z\s]+$/));
      if (nonUppercaseBrands.length > 0) {
        return nonUppercaseBrands.reduce((shortest, current) =>
          current.length < shortest.length ? current : shortest
        );
      }

      // Fallback: f/all if fails
      return brands[0];
    }
    catch (error) {
      console.log(error);
      return "N/A";
    }
  }







  // Check if brand appears as separate term in input with strict priority enforcement
  private isBrandMatch(input: string, brand: string): boolean {

    // rule 6: HAPPY must be capitalized
    if (brand === 'HAPPY' && !input.includes('HAPPY')) {
      return false;
    }

    const normalizedBrand = this.normalizeBrand(brand);
    const normalizedInput = this.normalizeBrand(input);

    // rule 2: Ignore BIO, NEB
    if (IGNORED_TERMS.has(normalizedBrand)) {
      return false;
    }

    // Get or create regex pattern for this brand
    if (!this.brandPatternCache.has(normalizedBrand)) {
      const escaped = normalizedBrand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      this.brandPatternCache.set(
        normalizedBrand,
        new RegExp(`\\b${escaped}\\b`)
      );
    }
    const pattern = this.brandPatternCache.get(normalizedBrand)!;



    // Check for separate term match
    if (!pattern.test(normalizedInput)) {
      return false;
    }

    // position rules based on priority
    const words = normalizedInput.split(/\s+/);
    const brandWords = normalizedBrand.split(/\s+/);
    const firstBrandWord = brandWords[0];


    // Check position requirements
    if (FRONT_PRIORITY_TERMS.has(firstBrandWord)) {
      // Must be first word
      return words[0] === firstBrandWord;
    } else if (FRONT_OR_SECOND_TERMS.has(firstBrandWord)) {
      // Must be first or second word
      return words[0] === firstBrandWord ||
        (words.length > 1 && words[1] === firstBrandWord);
    }

    // No position requirement for other brands
    return true;
  }




  // assign canonical brand with priority enforcement
  public assignBrandByProduct(productTitle: string): BrandMatchResult {

    if(!productTitle) return;

    const matchedBrands = new Set<string>();
    const normalizedTitle = this.normalizeBrand(productTitle);


    // Check in priority order: FRONT_PRIORITY_TERMS first
    for (const [brand] of this.brandGroups) {
      const normalizedBrand = this.normalizeBrand(brand);
      const firstWord = normalizedBrand.split(/\s+/)[0];

      if (FRONT_PRIORITY_TERMS.has(firstWord) &&
        this.isBrandMatch(productTitle, brand)) {
        const group = this.brandGroups.get(brand)!;
        matchedBrands.add(group.canonical);
      }
    }


    // Then check FRONT_OR_SECOND_TERMS 
    if (matchedBrands.size === 0) {
      for (const [brand] of this.brandGroups) {
        const normalizedBrand = this.normalizeBrand(brand);
        const firstWord = normalizedBrand.split(/\s+/)[0];

        if (FRONT_OR_SECOND_TERMS.has(firstWord) &&
          this.isBrandMatch(productTitle, brand)) {
          const group = this.brandGroups.get(brand)!;
          matchedBrands.add(group.canonical);
        }
      }
    }

    // Finally check all other brands if no priority matches found
    if (matchedBrands.size === 0) {
      for (const [brand] of this.brandGroups) {
        const normalizedBrand = this.normalizeBrand(brand);
        const firstWord = normalizedBrand.split(/\s+/)[0];

        if (!FRONT_PRIORITY_TERMS.has(firstWord) &&
          !FRONT_OR_SECOND_TERMS.has(firstWord) &&
          this.isBrandMatch(productTitle, brand)) {
          const group = this.brandGroups.get(brand)!;
          matchedBrands.add(group.canonical);
        }
      }
    }


    // rule 5: Prioritize earliest match if multiple found
    let assignedBrand: string | null = null;
    if (matchedBrands.size > 0) {
      let earliestPos = Infinity;

      for (const brand of matchedBrands) {
        const pos = normalizedTitle.indexOf(this.normalizeBrand(brand));
        if (pos >= 0 && pos < earliestPos) {
          earliestPos = pos;
          assignedBrand = brand;
        }
      }
    }

    return {
      assignedBrand,
      matchedBrands: Array.from(matchedBrands)
    };
  }

}
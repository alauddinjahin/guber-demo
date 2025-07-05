
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


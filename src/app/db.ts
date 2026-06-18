import { AffiliateProduct } from './types';

// Mock Supabase flat key-value store for affiliate payloads
const MOCK_DB: Record<string, AffiliateProduct> = {
  mod_type_hoop_weight: {
    id: 'tungsten-tape',
    name: 'High-Density Tungsten Tape',
    description: 'Pre-cut, lead-free tungsten adhesive strips. Designed for precise hoop modifications at 12, 3, or 9 o\'clock to increase swingweight and torsional stability.',
    price: '$14.99',
    url: 'https://tennis-warehouse.com/TungstenTape?aff=racketanalyzer',
    category: 'hoop'
  },
  mod_type_handle_weight: {
    id: 'leather-grip',
    name: 'Premium Tan Leather Grip',
    description: 'High-quality calfskin leather grip. Adds roughly 12-15g to the handle compared to synthetic grips, shifting the balance headlight while enhancing bevel bevel-feel.',
    price: '$22.00',
    url: 'https://tennis-warehouse.com/LeatherGrip?aff=racketanalyzer',
    category: 'handle'
  },
  mod_type_buttcap_weight: {
    id: 'tungsten-putty',
    name: 'High-Density Tungsten Putty',
    description: 'Moldable tungsten putty designed for insertion into the racquet trap door inside the butt cap. Ideal for adding tail weight to custom-match specs.',
    price: '$12.50',
    url: 'https://tennis-warehouse.com/TungstenPutty?aff=racketanalyzer',
    category: 'buttcap'
  }
};

/**
 * Mocks a fetch call to Supabase to retrieve affiliate payload links
 * using a flat key-value summary structure.
 */
export async function getAffiliatePayload(keys: string[]): Promise<Record<string, AffiliateProduct>> {
  // Simulate small network delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  const result: Record<string, AffiliateProduct> = {};
  for (const key of keys) {
    if (MOCK_DB[key]) {
      result[key] = MOCK_DB[key];
    }
  }
  return result;
}

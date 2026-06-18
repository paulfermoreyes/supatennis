export interface RacquetSpecs {
  weight: number; // in grams (e.g. 300)
  balance: number; // in cm from butt cap (e.g. 32.0)
  swingweight: number; // in kg·cm² (e.g. 300)
  length: number; // in inches (e.g. 27)
}

export interface MassModification {
  twelveOClock: number; // grams added at 12 o'clock
  threeOClock: number; // grams added at 3 o'clock
  nineOClock: number; // grams added at 9 o'clock
  handle: number; // grams added at handle
  buttCap: number; // grams added at butt cap
}

export interface AffiliateProduct {
  id: string;
  name: string;
  description: string;
  price: string;
  url: string;
  imageUrl?: string;
  category: 'hoop' | 'handle' | 'buttcap';
}

export interface ModificationImpact {
  specs: RacquetSpecs;
  addedWeight: number;
  balanceShift: number; // positive = shift towards head, negative = towards handle
  swingweightShift: number;
}

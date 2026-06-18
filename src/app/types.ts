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

export type PlayerClass = 'A' | 'B' | 'C' | 'D';
export type Gender = 'Male' | 'Female';
export type MatchStatus = 'Scheduled' | 'Postponed' | 'Completed';

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  class: PlayerClass;
}

export interface MatchLineDefinition {
  id: string;
  name: string;              // e.g. "Class B Male Singles #1"
  type: 'Singles' | 'Doubles';
  genderReq: 'Male' | 'Female' | 'Mixed';
  classReq?: PlayerClass;    // Required baseline class
}

export interface MatchFormat {
  id: string;
  name: string;              // e.g. "Club Custom (2S/4D)", "USTA 18+ (2S/3D)"
  description: string;
  lines: MatchLineDefinition[];
}

export interface LineupSlot {
  lineId: string;            // Links to MatchLineDefinition.id
  playerIds: string[];       // 1 item for Singles, 2 items for Doubles
}

export interface ScheduledMatch {
  id: string;
  team1: string;
  team2: string;
  date: string;              // ISO string or YYYY-MM-DD
  status: MatchStatus;
  formatId: string;          // Links to MatchFormat
  lineup: LineupSlot[];      // Player assignments
}


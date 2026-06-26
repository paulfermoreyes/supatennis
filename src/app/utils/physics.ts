import { RacquetSpecs, MassModification } from '../types';

export interface FinalSpecsResult {
  weight: number;
  balance: number;
  swingweight: number;
  addedMass: number;
  balanceShift: number;
  swingweightShift: number;
}

/**
 * Calculates new specifications based on added mass using Parallel Axis Theorem
 */
export function calculateFinalSpecs(
  baseline: RacquetSpecs,
  mods: MassModification,
  distances: Record<keyof MassModification, number>
): FinalSpecsResult {
  const { weight: W_orig, balance: B_orig, swingweight: SW_orig } = baseline;
  
  const addedMass =
    mods.twelveOClock +
    mods.threeOClock +
    mods.nineOClock +
    mods.handle +
    mods.buttCap;
    
  const newWeight = W_orig + addedMass;

  if (addedMass === 0) {
    return {
      weight: W_orig,
      balance: B_orig,
      swingweight: SW_orig,
      addedMass: 0,
      balanceShift: 0,
      swingweightShift: 0,
    };
  }

  // 1. Center of Mass (New Balance)
  const originalMoment = W_orig * B_orig;
  const addedMoment =
    mods.twelveOClock * distances.twelveOClock +
    mods.threeOClock * distances.threeOClock +
    mods.nineOClock * distances.nineOClock +
    mods.handle * distances.handle +
    mods.buttCap * distances.buttCap;

  const newBalance = (originalMoment + addedMoment) / newWeight;
  const balanceShift = newBalance - B_orig;

  // 2. New Swingweight (Parallel Axis Theorem around 10cm pivot)
  const PIVOT_POINT = 10.0; // cm from butt cap
  const swAddition =
    mods.twelveOClock * Math.pow(distances.twelveOClock - PIVOT_POINT, 2) +
    mods.threeOClock * Math.pow(distances.threeOClock - PIVOT_POINT, 2) +
    mods.nineOClock * Math.pow(distances.nineOClock - PIVOT_POINT, 2) +
    mods.handle * Math.pow(distances.handle - PIVOT_POINT, 2) +
    mods.buttCap * Math.pow(distances.buttCap - PIVOT_POINT, 2);

  // Convert mass from grams to kg for swingweight formula (g * cm^2 / 1000 = kg * cm^2)
  const swingweightShift = swAddition / 1000;
  const newSwingweight = SW_orig + swingweightShift;

  return {
    weight: newWeight,
    balance: Math.round(newBalance * 10) / 10,
    swingweight: Math.round(newSwingweight),
    addedMass,
    balanceShift: Math.round(balanceShift * 10) / 10,
    swingweightShift: Math.round(swingweightShift),
  };
}

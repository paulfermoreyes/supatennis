import { useState, useEffect, useMemo } from 'react';
import { RacquetSpecs, MassModification, AffiliateProduct } from '../types';
import { calculateFinalSpecs } from '../utils/physics';
import { getAffiliatePayload } from '../db';

const RACQUET_LENGTHS_CM = {
  27: 68.58,
  27.25: 69.22,
  27.5: 69.85,
  28: 71.12,
};

export function useRacquetCustomizer() {
  const [baselineSpecs, setBaselineSpecs] = useState<RacquetSpecs>({
    weight: 300,
    balance: 32.0,
    swingweight: 300,
    length: 27,
  });

  const [mods, setMods] = useState<MassModification>({
    twelveOClock: 0,
    threeOClock: 0,
    nineOClock: 0,
    handle: 0,
    buttCap: 0,
  });

  const [selectedHotspot, setSelectedHotspot] = useState<keyof MassModification | null>(null);
  const [affiliateProducts, setAffiliateProducts] = useState<Record<string, AffiliateProduct>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const lengthCm = useMemo(() => {
    const len = baselineSpecs.length as 27 | 27.25 | 27.5 | 28;
    return RACQUET_LENGTHS_CM[len] || RACQUET_LENGTHS_CM[27];
  }, [baselineSpecs.length]);

  const distances = useMemo(() => {
    return {
      twelveOClock: lengthCm - 0.5,     // Top of hoop
      threeOClock: lengthCm - 15.0,     // Right side of hoop
      nineOClock: lengthCm - 15.0,      // Left side of hoop
      handle: 10.0,                     // Mid-grip position
      buttCap: 1.0,                     // Butt cap trap door
    };
  }, [lengthCm]);

  const finalSpecs = useMemo(() => {
    return calculateFinalSpecs(baselineSpecs, mods, distances);
  }, [baselineSpecs, mods, distances]);

  const activeKeys = useMemo(() => {
    const keys: string[] = [];
    if (mods.twelveOClock > 0 || mods.threeOClock > 0 || mods.nineOClock > 0) {
      keys.push('mod_type_hoop_weight');
    }
    if (mods.handle > 0) {
      keys.push('mod_type_handle_weight');
    }
    if (mods.buttCap > 0) {
      keys.push('mod_type_buttcap_weight');
    }
    return keys;
  }, [mods]);

  useEffect(() => {
    if (activeKeys.length === 0) {
      setAffiliateProducts({});
      return;
    }
    setIsLoadingProducts(true);
    getAffiliatePayload(activeKeys).then((data) => {
      setAffiliateProducts(data);
      setIsLoadingProducts(false);
    });
  }, [activeKeys]);

  const handleAddMass = (key: keyof MassModification, amount: number) => {
    setMods(prev => ({
      ...prev,
      [key]: Math.max(0, prev[key] + amount)
    }));
  };

  const handleSetMass = (key: keyof MassModification, value: number) => {
    setMods(prev => ({
      ...prev,
      [key]: Math.max(0, isNaN(value) ? 0 : value)
    }));
  };

  const resetMods = () => {
    setMods({
      twelveOClock: 0,
      threeOClock: 0,
      nineOClock: 0,
      handle: 0,
      buttCap: 0,
    });
    setSelectedHotspot(null);
  };

  const resetAll = () => {
    resetMods();
    setBaselineSpecs({
      weight: 300,
      balance: 32.0,
      swingweight: 300,
      length: 27,
    });
  };

  return {
    baselineSpecs,
    setBaselineSpecs,
    mods,
    selectedHotspot,
    setSelectedHotspot,
    affiliateProducts,
    isLoadingProducts,
    lengthCm,
    distances,
    finalSpecs,
    handleAddMass,
    handleSetMass,
    resetMods,
    resetAll,
  };
}
export type UseRacquetCustomizerReturn = ReturnType<typeof useRacquetCustomizer>;

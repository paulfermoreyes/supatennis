'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Slider from '@radix-ui/react-slider';
import { 
  Scale, 
  TrendingUp, 
  Compass, 
  Wrench, 
  ExternalLink, 
  HelpCircle, 
  RotateCcw, 
  Info,
  Maximize2
} from 'lucide-react';
import { getAffiliatePayload } from './db';
import { RacquetSpecs, MassModification, AffiliateProduct } from './types';

// Constants for standard racquet lengths
const RACQUET_LENGTHS = [
  { label: '27.0" (Standard)', value: 27, cm: 68.58 },
  { label: '27.25" (Extended)', value: 27.25, cm: 69.22 },
  { label: '27.5" (Extended)', value: 27.5, cm: 69.85 },
  { label: '28.0" (Long)', value: 28, cm: 71.12 },
];

export default function SwingweightCalculator() {
  // --- Baseline Specifications State ---
  const [baselineSpecs, setBaselineSpecs] = useState<RacquetSpecs>({
    weight: 300,
    balance: 32.0,
    swingweight: 300,
    length: 27,
  });

  // --- Modifications State (mass added in grams) ---
  const [mods, setMods] = useState<MassModification>({
    twelveOClock: 0,
    threeOClock: 0,
    nineOClock: 0,
    handle: 0,
    buttCap: 0,
  });

  // --- UI/UX State ---
  const [selectedHotspot, setSelectedHotspot] = useState<keyof MassModification | null>(null);
  const [affiliateProducts, setAffiliateProducts] = useState<Record<string, AffiliateProduct>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // --- Dynamic Constants based on length ---
  const lengthObj = useMemo(() => {
    return RACQUET_LENGTHS.find(l => l.value === baselineSpecs.length) || RACQUET_LENGTHS[0];
  }, [baselineSpecs.length]);

  const racquetLengthCm = lengthObj.cm;

  // --- Hotspot Distances from Butt Cap (cm) ---
  const distances = useMemo(() => {
    return {
      twelveOClock: racquetLengthCm - 0.5,     // Top of hoop
      threeOClock: racquetLengthCm - 15.0,     // Right side of hoop
      nineOClock: racquetLengthCm - 15.0,      // Left side of hoop
      handle: 10.0,                            // Mid-grip position
      buttCap: 1.0,                            // Butt cap trap door
    };
  }, [racquetLengthCm]);

  // --- Physics Calculations Engine ---
  const finalSpecs = useMemo(() => {
    const { weight: W_orig, balance: B_orig, swingweight: SW_orig } = baselineSpecs;

    // 1. Total added mass
    const addedMass = mods.twelveOClock + mods.threeOClock + mods.nineOClock + mods.handle + mods.buttCap;
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

    // 2. Center of Mass (New Balance)
    // Sum of moments / Total mass
    const originalMoment = W_orig * B_orig;
    const addedMoment = 
      (mods.twelveOClock * distances.twelveOClock) +
      (mods.threeOClock * distances.threeOClock) +
      (mods.nineOClock * distances.nineOClock) +
      (mods.handle * distances.handle) +
      (mods.buttCap * distances.buttCap);

    const newBalance = (originalMoment + addedMoment) / newWeight;
    const balanceShift = newBalance - B_orig;

    // 3. New Swingweight using Parallel Axis Theorem (pivot point at 10cm from butt cap)
    // SW_new = SW_orig + sum( m_i * (d_i - 10)^2 ) / 1000
    const PIVOT_POINT = 10.0; // cm from butt cap
    const swAddition = 
      (mods.twelveOClock * Math.pow(distances.twelveOClock - PIVOT_POINT, 2)) +
      (mods.threeOClock * Math.pow(distances.threeOClock - PIVOT_POINT, 2)) +
      (mods.nineOClock * Math.pow(distances.nineOClock - PIVOT_POINT, 2)) +
      (mods.handle * Math.pow(distances.handle - PIVOT_POINT, 2)) +
      (mods.buttCap * Math.pow(distances.buttCap - PIVOT_POINT, 2));

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
  }, [baselineSpecs, mods, distances]);

  // --- Helper to convert cm balance to Points HL/HH ---
  const getPointsBalanceString = (balanceCm: number) => {
    const midpoint = racquetLengthCm / 2;
    const diff = midpoint - balanceCm;
    const points = Math.round(Math.abs(diff) / 0.3175); // 1 point = 1/8 inch = 0.3175 cm
    
    if (points === 0) return 'EB (Even Balance)';
    const direction = diff > 0 ? 'HL (Head Light)' : 'HH (Head Heavy)';
    return `${points} pts ${direction}`;
  };

  // --- Affiliate Database Key Fetcher ---
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

  // --- Modifiers Handlers ---
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

  return (
    <div className="flex-1 bg-white flex flex-col justify-between selection:bg-wimbledon-green-light selection:text-wimbledon-green">
      {/* Wimbledon Header */}
      <header className="border-t-[6px] border-wimbledon-green border-b border-gray-100 bg-white py-8 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-wimbledon-purple">The All England Customization Lab</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-wimbledon-green uppercase font-serif-display">
              Wimbledon <span className="italic font-medium text-wimbledon-purple">Customizer</span>
            </h1>
            <p className="text-gray-600 mt-2 text-md max-w-2xl leading-relaxed italic">
              A bespoke engineering platform to optimize static weight, swingweight, and balance utilizing the Parallel Axis Theorem.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowExplanation(!showExplanation)}
              className="text-xs flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 hover:border-wimbledon-purple text-gray-700 font-semibold rounded transition-all cursor-pointer bg-white"
            >
              <HelpCircle className="w-3.5 h-3.5 text-wimbledon-purple" />
              How It Works
            </button>
            <button 
              onClick={resetAll}
              className="text-xs flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 hover:border-wimbledon-green text-gray-700 font-semibold rounded transition-all cursor-pointer bg-white"
            >
              <RotateCcw className="w-3.5 h-3.5 text-wimbledon-green" />
              Reset All
            </button>
          </div>
        </div>
      </header>

      {/* Physics explanation panel */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-gray-200 bg-wimbledon-cream"
          >
            <div className="max-w-7xl mx-auto p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h4 className="font-bold text-wimbledon-green text-lg mb-2 flex items-center gap-2">
                  <Scale className="w-5 h-5" /> 1. Center of Mass
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  The balance point (CoM) is computed by finding the weighted average of the racquet's original moment and the moments of added mass:
                </p>
                <div className="bg-white p-3 border border-gray-100 rounded my-2 font-mono text-xs text-center">
                  B<sub>new</sub> = [ (W<sub>orig</sub> × B<sub>orig</sub>) + ∑(m<sub>i</sub> × d<sub>i</sub>) ] / W<sub>new</sub>
                </div>
                <p className="text-xs text-gray-500 italic">
                  Where B represents distance from the butt cap, and m is the added weight.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-wimbledon-purple text-lg mb-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" /> 2. Parallel Axis Theorem
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Swingweight is the moment of inertia around a pivot point 10cm from the butt cap. Adding mass adds swingweight relative to the squared distance from this pivot:
                </p>
                <div className="bg-white p-3 border border-gray-100 rounded my-2 font-mono text-xs text-center">
                  SW<sub>new</sub> = SW<sub>orig</sub> + ∑ [ m<sub>i</sub> × (d<sub>i</sub> - 10)² ] / 1000
                </div>
                <p className="text-xs text-gray-500 italic">
                  Weight added at 10cm has zero impact on swingweight, while weight at 12 o'clock has the maximum impact.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-wimbledon-gold text-lg mb-2 flex items-center gap-2">
                  <Compass className="w-5 h-5" /> 3. Points HL vs. HH
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  The tennis points system categorizes balance relative to the midpoint (13.5&quot; or 34.29cm for standard 27&quot;). Each point represents 1/8 of an inch (0.3175cm) headlight (HL) or headheavy (HH).
                </p>
                <div className="bg-white p-3 border border-gray-100 rounded my-2 font-mono text-xs text-center">
                  Points = |Midpoint - Balance| / 0.3175
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        
        {/* Left Column: Inputs & Specs (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          
          {/* Card: Racquet Length */}
          <div className="border border-gray-200 bg-white p-6 rounded-md shadow-sm">
            <h3 className="text-xl font-bold text-wimbledon-green mb-4 flex items-center gap-2">
              <Maximize2 className="w-5 h-5" /> Racquet Length
            </h3>
            <p className="text-xs text-gray-500 mb-3 italic">
              Racquet length changes the physical location of the hoop hotspots relative to the pivot point.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {RACQUET_LENGTHS.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setBaselineSpecs(prev => ({ ...prev, length: item.value }))}
                  className={`text-sm py-2 px-3 border rounded text-left transition-all cursor-pointer font-semibold ${
                    baselineSpecs.length === item.value 
                      ? 'border-wimbledon-green bg-wimbledon-green-light text-wimbledon-green' 
                      : 'border-gray-200 hover:border-gray-400 text-gray-700'
                  }`}
                >
                  <div className="font-bold">{item.label}</div>
                  <div className="text-xs opacity-75">{item.cm} cm</div>
                </button>
              ))}
            </div>
          </div>

          {/* Card: Baseline Specs */}
          <div className="border border-gray-200 bg-white p-6 rounded-md shadow-sm flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-wimbledon-green flex items-center gap-2">
                <Wrench className="w-5 h-5 text-wimbledon-purple" /> Baseline Specifications
              </h3>
              <span className="text-xs text-wimbledon-purple italic font-semibold">Unstrung Specs</span>
            </div>

            {/* Slider 1: Weight */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-baseline">
                <label className="text-sm font-bold text-gray-700">Static Weight</label>
                <div className="text-right">
                  <span className="text-lg font-bold text-wimbledon-green">{baselineSpecs.weight}</span>
                  <span className="text-xs text-gray-500 ml-1">grams</span>
                </div>
              </div>
              <Slider.Root 
                className="relative flex items-center select-none touch-none w-full h-5 cursor-pointer"
                value={[baselineSpecs.weight]}
                onValueChange={(val) => setBaselineSpecs(prev => ({ ...prev, weight: val[0] }))}
                min={240}
                max={360}
                step={1}
              >
                <Slider.Track className="bg-gray-100 relative grow rounded-full h-2 border border-gray-200">
                  <Slider.Range className="absolute bg-wimbledon-green rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white border border-wimbledon-green shadow rounded-full hover:scale-110 transition-transform focus:outline-none" aria-label="Static Weight" />
              </Slider.Root>
              <div className="flex justify-between text-2xs text-gray-400">
                <span>240g</span>
                <span>300g (Avg)</span>
                <span>360g</span>
              </div>
            </div>

            {/* Slider 2: Balance */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-baseline">
                <label className="text-sm font-bold text-gray-700">Balance Point</label>
                <div className="text-right">
                  <span className="text-lg font-bold text-wimbledon-green">{baselineSpecs.balance.toFixed(1)}</span>
                  <span className="text-xs text-gray-500 ml-1">cm</span>
                  <span className="text-xs text-wimbledon-purple italic ml-1">({getPointsBalanceString(baselineSpecs.balance)})</span>
                </div>
              </div>
              <Slider.Root 
                className="relative flex items-center select-none touch-none w-full h-5 cursor-pointer"
                value={[baselineSpecs.balance]}
                onValueChange={(val) => setBaselineSpecs(prev => ({ ...prev, balance: val[0] }))}
                min={28.0}
                max={38.0}
                step={0.1}
              >
                <Slider.Track className="bg-gray-100 relative grow rounded-full h-2 border border-gray-200">
                  <Slider.Range className="absolute bg-wimbledon-green rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white border border-wimbledon-green shadow rounded-full hover:scale-110 transition-transform focus:outline-none" aria-label="Balance Point" />
              </Slider.Root>
              <div className="flex justify-between text-2xs text-gray-400">
                <span>28.0cm (Very HL)</span>
                <span>33.0cm (EB)</span>
                <span>38.0cm (Very HH)</span>
              </div>
            </div>

            {/* Slider 3: Swingweight */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-baseline">
                <label className="text-sm font-bold text-gray-700">Swingweight</label>
                <div className="text-right">
                  <span className="text-lg font-bold text-wimbledon-green">{baselineSpecs.swingweight}</span>
                  <span className="text-xs text-gray-500 ml-1">kg·cm²</span>
                </div>
              </div>
              <Slider.Root 
                className="relative flex items-center select-none touch-none w-full h-5 cursor-pointer"
                value={[baselineSpecs.swingweight]}
                onValueChange={(val) => setBaselineSpecs(prev => ({ ...prev, swingweight: val[0] }))}
                min={250}
                max={360}
                step={1}
              >
                <Slider.Track className="bg-gray-100 relative grow rounded-full h-2 border border-gray-200">
                  <Slider.Range className="absolute bg-wimbledon-green rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white border border-wimbledon-green shadow rounded-full hover:scale-110 transition-transform focus:outline-none" aria-label="Swingweight" />
              </Slider.Root>
              <div className="flex justify-between text-2xs text-gray-400">
                <span>250 kg·cm²</span>
                <span>300 kg·cm²</span>
                <span>360 kg·cm²</span>
              </div>
            </div>
          </div>

          {/* Quick-Stats Comparison Dashboard */}
          <div className="border-2 border-wimbledon-purple bg-wimbledon-purple-light/20 p-6 rounded-md shadow-sm">
            <h4 className="text-md font-bold text-wimbledon-purple uppercase tracking-wider mb-4">Specs Comparison</h4>
            
            <div className="flex flex-col gap-3">
              {/* Row: Weight */}
              <div className="grid grid-cols-12 items-center border-b border-purple-100 pb-2">
                <span className="col-span-4 text-xs font-bold text-gray-600">Weight</span>
                <span className="col-span-3 text-sm text-gray-500">{baselineSpecs.weight}g</span>
                <span className="col-span-1 text-gray-300">→</span>
                <div className="col-span-4 text-right flex items-baseline justify-end gap-1">
                  <span className="text-lg font-bold text-wimbledon-green">{finalSpecs.weight}g</span>
                  {finalSpecs.addedMass > 0 && (
                    <span className="text-2xs text-wimbledon-green font-semibold">({`+${finalSpecs.addedMass}g`})</span>
                  )}
                </div>
              </div>

              {/* Row: Balance */}
              <div className="grid grid-cols-12 items-center border-b border-purple-100 pb-2">
                <span className="col-span-4 text-xs font-bold text-gray-600">Balance</span>
                <span className="col-span-3 text-sm text-gray-500">{baselineSpecs.balance.toFixed(1)}cm</span>
                <span className="col-span-1 text-gray-300">→</span>
                <div className="col-span-4 text-right flex flex-col items-end">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-wimbledon-green">{finalSpecs.balance.toFixed(1)}cm</span>
                    {finalSpecs.balanceShift !== 0 && (
                      <span className={`text-2xs font-semibold ${finalSpecs.balanceShift > 0 ? 'text-red-600' : 'text-wimbledon-green'}`}>
                        {finalSpecs.balanceShift > 0 ? `+${finalSpecs.balanceShift}cm` : `${finalSpecs.balanceShift}cm`}
                      </span>
                    )}
                  </div>
                  <span className="text-3xs text-wimbledon-purple italic font-semibold">({getPointsBalanceString(finalSpecs.balance)})</span>
                </div>
              </div>

              {/* Row: Swingweight */}
              <div className="grid grid-cols-12 items-center pb-2">
                <span className="col-span-4 text-xs font-bold text-gray-600">Swingweight</span>
                <span className="col-span-3 text-sm text-gray-500">{baselineSpecs.swingweight}</span>
                <span className="col-span-1 text-gray-300">→</span>
                <div className="col-span-4 text-right flex items-baseline justify-end gap-1">
                  <span className="text-lg font-bold text-wimbledon-green">{finalSpecs.swingweight}</span>
                  {finalSpecs.swingweightShift > 0 && (
                    <span className="text-2xs text-wimbledon-green font-semibold">({`+${finalSpecs.swingweightShift}`})</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visualizer & Lab controls (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          
          {/* The Modding Lab Card */}
          <div className="border border-gray-200 bg-white p-6 rounded-md shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-wimbledon-green flex items-center gap-2">
                <Wrench className="w-5 h-5 text-wimbledon-gold" /> The Modding Lab
              </h3>
              <span className="text-xs bg-wimbledon-green text-white font-bold py-1 px-2.5 rounded-full uppercase tracking-wider">
                Interactive CAD
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* SVG Racquet Visualizer (Left side of card) */}
              <div className="md:col-span-6 flex justify-center bg-wimbledon-cream border border-gray-100 rounded-md p-4 relative overflow-hidden h-[420px]">
                
                {/* SVG Drawing */}
                <svg viewBox="0 0 300 500" className="w-full h-full drop-shadow-sm">
                  {/* Grid background representing measurement lines */}
                  <line x1="50" y1="100" x2="250" y2="100" stroke="#eaeaea" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="50" y1="200" x2="250" y2="200" stroke="#eaeaea" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="50" y1="300" x2="250" y2="300" stroke="#eaeaea" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="50" y1="400" x2="250" y2="400" stroke="#eaeaea" strokeWidth="1" strokeDasharray="3,3" />
                  
                  {/* Pivot Axis Indicator Line (10cm from butt cap) */}
                  {/* For visual layout, butt cap is at y=450, 10cm pivot is scaled. Let's place it at y=400 */}
                  <line x1="20" y1="380" x2="280" y2="380" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="5,3" />
                  <text x="25" y="373" className="text-3xs font-bold text-wimbledon-purple uppercase font-sans">10cm Pivot Axis</text>

                  {/* Draw racquet frame */}
                  {/* Hoop (Oval) */}
                  <ellipse 
                    cx="150" 
                    cy="120" 
                    rx="55" 
                    ry="75" 
                    fill="none" 
                    stroke="#006633" 
                    strokeWidth="4" 
                    className="transition-all duration-300"
                  />

                  {/* String Pattern (Vertical) */}
                  {[-40, -30, -20, -10, 0, 10, 20, 30, 40].map((offset) => {
                    const cy = 120;
                    const rx = 55;
                    const ry = 75;
                    // Compute string intersection on ellipse
                    const x = 150 + offset;
                    // y = cy +- ry * sqrt(1 - (x-cx)^2 / rx^2)
                    const term = 1 - Math.pow(offset, 2) / Math.pow(rx, 2);
                    if (term < 0) return null;
                    const yOffset = ry * Math.sqrt(term);
                    return (
                      <line 
                        key={`v-${offset}`}
                        x1={x} 
                        y1={cy - yOffset} 
                        x2={x} 
                        y2={cy + yOffset} 
                        stroke="#e5e7eb" 
                        strokeWidth="1" 
                      />
                    );
                  })}
                  
                  {/* String Pattern (Horizontal) */}
                  {[-60, -45, -30, -15, 0, 15, 30, 45, 60].map((offset) => {
                    const cx = 150;
                    const rx = 55;
                    const ry = 75;
                    // Compute intersection
                    const y = 120 + offset;
                    const term = 1 - Math.pow(offset, 2) / Math.pow(ry, 2);
                    if (term < 0) return null;
                    const xOffset = rx * Math.sqrt(term);
                    return (
                      <line 
                        key={`h-${offset}`}
                        x1={cx - xOffset} 
                        y1={y} 
                        x2={cx + xOffset} 
                        y2={y} 
                        stroke="#e5e7eb" 
                        strokeWidth="1" 
                      />
                    );
                  })}

                  {/* Throat (Triangular structure) */}
                  <path 
                    d="M 112 180 C 120 220, 138 255, 138 270" 
                    fill="none" 
                    stroke="#006633" 
                    strokeWidth="4.5" 
                  />
                  <path 
                    d="M 188 180 C 180 220, 162 255, 162 270" 
                    fill="none" 
                    stroke="#006633" 
                    strokeWidth="4.5" 
                  />
                  
                  {/* Handle / Grip */}
                  <rect 
                    x="138" 
                    y="270" 
                    width="24" 
                    height="170" 
                    fill="#e6f2ec" 
                    stroke="#006633" 
                    strokeWidth="3.5" 
                  />

                  {/* Wrap lines representing leather grip */}
                  {[285, 300, 315, 330, 345, 360, 375, 390, 405, 420, 435].map((yVal, idx) => (
                    <line 
                      key={`grip-${idx}`}
                      x1="138" 
                      y1={yVal} 
                      x2="162" 
                      y2={yVal + 8} 
                      stroke="#006633" 
                      strokeWidth="1.5" 
                      opacity="0.4"
                    />
                  ))}

                  {/* Butt Cap */}
                  <rect 
                    x="135" 
                    y="440" 
                    width="30" 
                    height="12" 
                    rx="2"
                    fill="#462066" 
                    stroke="#462066" 
                    strokeWidth="1" 
                  />
                  <text x="150" y="448" textAnchor="middle" fill="#ffffff" className="font-sans text-[6px] font-bold">W</text>

                  {/* Dynamic Visual Lead Tape / Mass Indicators */}
                  {/* 12 O'Clock Added Weight Indicator */}
                  {mods.twelveOClock > 0 && (
                    <rect 
                      x="130" 
                      y="40" 
                      width="40" 
                      height="7" 
                      rx="1"
                      fill="#9ca3af" 
                      stroke="#4b5563"
                      strokeWidth="1"
                      className="animate-pulse"
                    />
                  )}
                  {/* 3 O'Clock Weight */}
                  {mods.threeOClock > 0 && (
                    <rect 
                      x="202" 
                      y="105" 
                      width="7" 
                      height="30" 
                      rx="1"
                      fill="#9ca3af" 
                      stroke="#4b5563"
                      strokeWidth="1"
                      className="animate-pulse"
                    />
                  )}
                  {/* 9 O'Clock Weight */}
                  {mods.nineOClock > 0 && (
                    <rect 
                      x="91" 
                      y="105" 
                      width="7" 
                      height="30" 
                      rx="1"
                      fill="#9ca3af" 
                      stroke="#4b5563"
                      strokeWidth="1"
                      className="animate-pulse"
                    />
                  )}
                  {/* Handle Weight Overlay */}
                  {mods.handle > 0 && (
                    <rect 
                      x="139" 
                      y="272" 
                      width="22" 
                      height="166" 
                      fill="#462066" 
                      fillOpacity="0.15" 
                      stroke="#462066"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                  )}
                  {/* Butt Cap Weight Putty */}
                  {mods.buttCap > 0 && (
                    <circle 
                      cx="150" 
                      cy="446" 
                      r="4" 
                      fill="#c49a45" 
                      className="animate-pulse"
                    />
                  )}

                  {/* Hotspots Interactive Circles overlay */}
                  {/* 12 O'Clock */}
                  <g 
                    className="cursor-pointer group"
                    onClick={() => setSelectedHotspot('twelveOClock')}
                  >
                    <circle 
                      cx="150" 
                      cy="45" 
                      r="12" 
                      fill={selectedHotspot === 'twelveOClock' ? '#462066' : 'transparent'} 
                      fillOpacity="0.2"
                    />
                    <circle 
                      cx="150" 
                      cy="45" 
                      r="6" 
                      fill={mods.twelveOClock > 0 ? '#ccff00' : '#006633'} 
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="group-hover:scale-125 transition-transform duration-200"
                    />
                  </g>

                  {/* 3 O'Clock */}
                  <g 
                    className="cursor-pointer group"
                    onClick={() => setSelectedHotspot('threeOClock')}
                  >
                    <circle 
                      cx="205" 
                      cy="120" 
                      r="12" 
                      fill={selectedHotspot === 'threeOClock' ? '#462066' : 'transparent'} 
                      fillOpacity="0.2"
                    />
                    <circle 
                      cx="205" 
                      cy="120" 
                      r="6" 
                      fill={mods.threeOClock > 0 ? '#ccff00' : '#006633'} 
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="group-hover:scale-125 transition-transform duration-200"
                    />
                  </g>

                  {/* 9 O'Clock */}
                  <g 
                    className="cursor-pointer group"
                    onClick={() => setSelectedHotspot('nineOClock')}
                  >
                    <circle 
                      cx="95" 
                      cy="120" 
                      r="12" 
                      fill={selectedHotspot === 'nineOClock' ? '#462066' : 'transparent'} 
                      fillOpacity="0.2"
                    />
                    <circle 
                      cx="95" 
                      cy="120" 
                      r="6" 
                      fill={mods.nineOClock > 0 ? '#ccff00' : '#006633'} 
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="group-hover:scale-125 transition-transform duration-200"
                    />
                  </g>

                  {/* Handle (Grip Center) */}
                  <g 
                    className="cursor-pointer group"
                    onClick={() => setSelectedHotspot('handle')}
                  >
                    <circle 
                      cx="150" 
                      cy="355" 
                      r="15" 
                      fill={selectedHotspot === 'handle' ? '#462066' : 'transparent'} 
                      fillOpacity="0.2"
                    />
                    <circle 
                      cx="150" 
                      cy="355" 
                      r="7" 
                      fill={mods.handle > 0 ? '#ccff00' : '#006633'} 
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="group-hover:scale-125 transition-transform duration-200"
                    />
                  </g>

                  {/* Butt Cap */}
                  <g 
                    className="cursor-pointer group"
                    onClick={() => setSelectedHotspot('buttCap')}
                  >
                    <circle 
                      cx="150" 
                      cy="446" 
                      r="12" 
                      fill={selectedHotspot === 'buttCap' ? '#462066' : 'transparent'} 
                      fillOpacity="0.2"
                    />
                    <circle 
                      cx="150" 
                      cy="446" 
                      r="6" 
                      fill={mods.buttCap > 0 ? '#ccff00' : '#462066'} 
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      className="group-hover:scale-125 transition-transform duration-200"
                    />
                  </g>
                </svg>

                {/* Inline SVG overlay hints */}
                <div className="absolute top-2 left-2 bg-white/90 border border-gray-100 rounded px-2 py-1 text-4xs font-bold uppercase tracking-wider text-gray-500 pointer-events-none select-none">
                  Click a node to add mass
                </div>
              </div>

              {/* Lab Controls & Spec editor (Right side of card) */}
              <div className="md:col-span-6 flex flex-col gap-5 self-start">
                <div>
                  <h4 className="text-sm uppercase tracking-wider font-bold text-gray-400">Selected Node</h4>
                  
                  {/* Selected Spot Details */}
                  {selectedHotspot ? (
                    <div className="mt-1.5 p-4 border border-wimbledon-purple-light bg-wimbledon-purple-light/20 rounded">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-md text-wimbledon-purple uppercase font-serif-display">
                          {selectedHotspot === 'twelveOClock' && '12 O\'clock (Hoop Top)'}
                          {selectedHotspot === 'threeOClock' && '3 O\'clock (Hoop Right)'}
                          {selectedHotspot === 'nineOClock' && '9 O\'clock (Hoop Left)'}
                          {selectedHotspot === 'handle' && 'Handle / Overgrip'}
                          {selectedHotspot === 'buttCap' && 'Butt Cap / silicone'}
                        </span>
                        <span className="text-[10px] bg-wimbledon-purple text-white px-2 py-0.5 rounded font-mono font-bold">
                          d = {distances[selectedHotspot].toFixed(1)} cm
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 mt-1 italic">
                        {selectedHotspot === 'twelveOClock' && 'Max swingweight addition. Shifts balance head heavy.'}
                        {selectedHotspot === 'threeOClock' && 'Increases swingweight and horizontal stability.'}
                        {selectedHotspot === 'nineOClock' && 'Increases swingweight and horizontal stability.'}
                        {selectedHotspot === 'handle' && 'Adds static weight with negligible swingweight impact.'}
                        {selectedHotspot === 'buttCap' && 'Shifts balance headlight. Minimal swingweight impact.'}
                      </p>

                      {/* Weight editor panel */}
                      <div className="mt-4 flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleAddMass(selectedHotspot, -1)}
                            className="w-10 h-10 border border-gray-300 rounded hover:border-gray-500 font-bold bg-white text-gray-800 text-lg transition-colors cursor-pointer"
                          >
                            -
                          </button>
                          
                          <div className="relative flex-1">
                            <input 
                              type="number"
                              value={mods[selectedHotspot] || ''}
                              onChange={(e) => handleSetMass(selectedHotspot, parseFloat(e.target.value))}
                              className="w-full h-10 border border-gray-300 text-center font-bold font-serif-display text-lg rounded focus:border-wimbledon-purple focus:outline-none bg-white text-gray-900"
                              placeholder="0"
                              min="0"
                              max="50"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">grams</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddMass(selectedHotspot, 1)}
                            className="w-10 h-10 border border-gray-300 rounded hover:border-gray-500 font-bold bg-white text-gray-800 text-lg transition-colors cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Incremental shortcut buttons */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {[1, 2, 5, 10].map((val) => (
                            <button
                              key={`quick-${val}`}
                              type="button"
                              onClick={() => handleAddMass(selectedHotspot, val)}
                              className="text-2xs font-semibold py-1.5 px-1 border border-gray-200 rounded hover:border-wimbledon-purple text-gray-700 transition-colors bg-white cursor-pointer"
                            >
                              +{val}g
                            </button>
                          ))}
                        </div>

                        {mods[selectedHotspot] > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetMass(selectedHotspot, 0)}
                            className="text-2xs font-bold text-red-600 underline hover:text-red-800 text-left mt-1 cursor-pointer bg-transparent border-0 self-start"
                          >
                            Clear mass from this node
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1.5 p-8 border border-dashed border-gray-200 rounded text-center">
                      <p className="text-sm text-gray-500 italic">
                        Select a node on the racquet SVG or click a quick-access button below to adjust specs.
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick Access Grid of Inputs */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-2xs uppercase tracking-wider font-bold text-gray-400">All Customization Zones</h4>
                  <div className="grid grid-cols-1 gap-2">
                    
                    {/* Row 12 O'Clock */}
                    <div 
                      onClick={() => setSelectedHotspot('twelveOClock')}
                      className={`flex items-center justify-between p-2.5 border rounded cursor-pointer transition-all ${
                        selectedHotspot === 'twelveOClock' ? 'border-wimbledon-purple bg-wimbledon-purple-light/10 font-bold' : 'border-gray-100 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-wimbledon-green"></span>
                        12 O'Clock (Top)
                      </span>
                      <div className="flex items-center gap-1 text-xs">
                        <span className={`px-2 py-0.5 rounded ${mods.twelveOClock > 0 ? 'bg-wimbledon-green text-white font-bold' : 'bg-gray-100 text-gray-500'}`}>
                          {mods.twelveOClock}g
                        </span>
                      </div>
                    </div>

                    {/* Row 3 & 9 O'Clock */}
                    <div 
                      onClick={() => setSelectedHotspot('threeOClock')}
                      className={`flex items-center justify-between p-2.5 border rounded cursor-pointer transition-all ${
                        selectedHotspot === 'threeOClock' || selectedHotspot === 'nineOClock' ? 'border-wimbledon-purple bg-wimbledon-purple-light/10 font-bold' : 'border-gray-100 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-wimbledon-green"></span>
                        3 & 9 O'Clock (Sides)
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-2xs text-gray-400">L: {mods.nineOClock}g / R: {mods.threeOClock}g</span>
                        <span className={`px-2 py-0.5 rounded ${(mods.threeOClock + mods.nineOClock) > 0 ? 'bg-wimbledon-green text-white font-bold' : 'bg-gray-100 text-gray-500'}`}>
                          {mods.threeOClock + mods.nineOClock}g
                        </span>
                      </div>
                    </div>

                    {/* Row Handle */}
                    <div 
                      onClick={() => setSelectedHotspot('handle')}
                      className={`flex items-center justify-between p-2.5 border rounded cursor-pointer transition-all ${
                        selectedHotspot === 'handle' ? 'border-wimbledon-purple bg-wimbledon-purple-light/10 font-bold' : 'border-gray-100 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-wimbledon-green"></span>
                        Handle (Grip)
                      </span>
                      <div className="flex items-center gap-1 text-xs">
                        <span className={`px-2 py-0.5 rounded ${mods.handle > 0 ? 'bg-wimbledon-green text-white font-bold' : 'bg-gray-100 text-gray-500'}`}>
                          {mods.handle}g
                        </span>
                      </div>
                    </div>

                    {/* Row Butt Cap */}
                    <div 
                      onClick={() => setSelectedHotspot('buttCap')}
                      className={`flex items-center justify-between p-2.5 border rounded cursor-pointer transition-all ${
                        selectedHotspot === 'buttCap' ? 'border-wimbledon-purple bg-wimbledon-purple-light/10 font-bold' : 'border-gray-100 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-wimbledon-purple"></span>
                        Butt Cap (Putty)
                      </span>
                      <div className="flex items-center gap-1 text-xs">
                        <span className={`px-2 py-0.5 rounded ${mods.buttCap > 0 ? 'bg-wimbledon-green text-white font-bold' : 'bg-gray-100 text-gray-500'}`}>
                          {mods.buttCap}g
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {finalSpecs.addedMass > 0 && (
                  <button
                    type="button"
                    onClick={resetMods}
                    className="text-xs flex items-center justify-center gap-1.5 py-2 px-3 border border-red-200 hover:border-red-500 text-red-600 font-bold rounded transition-all bg-white cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Added Mass Only
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Affiliate Products Panel (Hidden until weight is added) */}
      <AnimatePresence>
        {finalSpecs.addedMass > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="border-t border-gray-200 bg-wimbledon-cream py-12 px-6 md:px-12 mt-12"
          >
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-baseline justify-between mb-8 border-b border-gray-200 pb-4 gap-2">
                <div>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-wimbledon-green uppercase font-serif-display">
                    Gear Required <span className="italic font-medium text-wimbledon-purple">To Build This Spec</span>
                  </h3>
                  <p className="text-sm text-gray-600 mt-1.5 italic">
                    Matched equipment recommendations based on your customization selections above.
                  </p>
                </div>
                <div className="text-xs bg-white border border-gray-300 text-gray-500 font-bold py-1.5 px-3 rounded-full flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-wimbledon-purple" /> Affiliate Partner Links
                </div>
              </div>

              {isLoadingProducts ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wimbledon-green"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Object.values(affiliateProducts).map((product) => (
                    <motion.div
                      layout
                      key={product.id}
                      className="bg-white border border-gray-200 hover:border-wimbledon-purple p-6 rounded-md shadow-sm flex flex-col justify-between transition-all"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-2xs uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded bg-wimbledon-green-light text-wimbledon-green">
                            {product.category === 'hoop' && 'Hoop Modification'}
                            {product.category === 'handle' && 'Handle Weight'}
                            {product.category === 'buttcap' && 'Tail Weight'}
                          </span>
                          <span className="text-lg font-bold text-wimbledon-purple font-serif-display">{product.price}</span>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h4>
                        <p className="text-xs text-gray-600 leading-relaxed italic mb-4">{product.description}</p>
                      </div>
                      
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 flex items-center justify-center gap-1.5 bg-wimbledon-green hover:bg-wimbledon-green-hover text-white text-xs font-bold py-2.5 px-4 rounded transition-colors uppercase tracking-wider cursor-pointer"
                      >
                        Buy at Tennis Warehouse <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Wimbledon Footer */}
      <footer className="border-t border-gray-200 bg-white py-8 px-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-serif-body">
            &copy; 2026 Wimbledon Customizer Lab. All rights reserved. Physics equations verified for lawn tennis standards.
          </p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-wimbledon-green underline transition-colors">Affiliate Disclosure</a>
            <a href="#" className="hover:text-wimbledon-green underline transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-wimbledon-purple underline transition-colors">Contact Engineering</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

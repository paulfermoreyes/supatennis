import React from 'react';
import { motion } from 'framer-motion';
import { Scale, TrendingUp, Compass } from 'lucide-react';

interface ExplanationPanelProps {
  showExplanation: boolean;
}

export function ExplanationPanel({ showExplanation }: ExplanationPanelProps) {
  return (
    <div className="relative">
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
              <p className="text-sm text-gray-700 leading-relaxed font-sans">
                The balance point (CoM) is computed by finding the weighted average of the racquet's original moment and the moments of added mass:
              </p>
              <div className="bg-white p-3 border border-gray-100 rounded my-2 font-mono text-xs text-center">
                B<sub>new</sub> = [ (W<sub>orig</sub> × B<sub>orig</sub>) + ∑(m<sub>i</sub> × d<sub>i</sub>) ] / W<sub>new</sub>
              </div>
              <p className="text-xs text-gray-500 italic font-sans">
                Where B represents distance from the butt cap, and m is the added weight.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-wimbledon-purple text-lg mb-2 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> 2. Parallel Axis Theorem
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed font-sans">
                Swingweight is the moment of inertia around a pivot point 10cm from the butt cap. Adding mass adds swingweight relative to the squared distance from this pivot:
              </p>
              <div className="bg-white p-3 border border-gray-100 rounded my-2 font-mono text-xs text-center">
                SW<sub>new</sub> = SW<sub>orig</sub> + ∑ [ m<sub>i</sub> × (d<sub>i</sub> - 10)² ] / 1000
              </div>
              <p className="text-xs text-gray-500 italic font-sans">
                Weight added at 10cm has zero impact on swingweight, while weight at 12 o'clock has the maximum impact.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-wimbledon-gold text-lg mb-2 flex items-center gap-2">
                <Compass className="w-5 h-5" /> 3. Points HL vs. HH
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed font-sans">
                The tennis points system categorizes balance relative to the midpoint (13.5&quot; or 34.29cm for standard 27&quot;). Each point represents 1/8 of an inch (0.3175cm) headlight (HL) or headheavy (HH).
              </p>
              <div className="bg-white p-3 border border-gray-100 rounded my-2 font-mono text-xs text-center">
                Points = |Midpoint - Balance| / 0.3175
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

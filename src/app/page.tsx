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
  Maximize2,
  Calendar,
  UserPlus,
  Trash2,
  Edit,
  Plus,
  Users,
  Check,
  X,
  Sliders,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { getAffiliatePayload } from './db';
import { 
  RacquetSpecs, 
  MassModification, 
  AffiliateProduct,
  Player,
  MatchFormat,
  ScheduledMatch,
  LineupSlot,
  PlayerClass,
  Gender,
  MatchStatus
} from './types';
import { 
  DEFAULT_PLAYERS, 
  DEFAULT_MATCH_FORMATS, 
  DEFAULT_MATCHES, 
  createEmptyLineup 
} from './defaultData';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Constants for standard racquet lengths
const RACQUET_LENGTHS = [
  { label: '27.0" (Standard)', value: 27, cm: 68.58 },
  { label: '27.25" (Extended)', value: 27.25, cm: 69.22 },
  { label: '27.5" (Extended)', value: 27.5, cm: 69.85 },
  { label: '28.0" (Long)', value: 28, cm: 71.12 },
];

export default function SwingweightCalculator() {
  // --- Tab State ---
  const [activeTab, setActiveTab] = useState<'customizer' | 'planner'>('customizer');

  // ==========================================
  // --- Baseline Specifications State (Customizer) ---
  // ==========================================
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
  const [showExplanation, setShowExplanation] = useState(false);

  const lengthObj = useMemo(() => {
    return RACQUET_LENGTHS.find(l => l.value === baselineSpecs.length) || RACQUET_LENGTHS[0];
  }, [baselineSpecs.length]);

  const racquetLengthCm = lengthObj.cm;

  const distances = useMemo(() => {
    return {
      twelveOClock: racquetLengthCm - 0.5,     // Top of hoop
      threeOClock: racquetLengthCm - 15.0,     // Right side of hoop
      nineOClock: racquetLengthCm - 15.0,      // Left side of hoop
      handle: 10.0,                            // Mid-grip position
      buttCap: 1.0,                            // Butt cap trap door
    };
  }, [racquetLengthCm]);

  const finalSpecs = useMemo(() => {
    const { weight: W_orig, balance: B_orig, swingweight: SW_orig } = baselineSpecs;
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

    const originalMoment = W_orig * B_orig;
    const addedMoment = 
      (mods.twelveOClock * distances.twelveOClock) +
      (mods.threeOClock * distances.threeOClock) +
      (mods.nineOClock * distances.nineOClock) +
      (mods.handle * distances.handle) +
      (mods.buttCap * distances.buttCap);

    const newBalance = (originalMoment + addedMoment) / newWeight;
    const balanceShift = newBalance - B_orig;

    const PIVOT_POINT = 10.0; // cm from butt cap
    const swAddition = 
      (mods.twelveOClock * Math.pow(distances.twelveOClock - PIVOT_POINT, 2)) +
      (mods.threeOClock * Math.pow(distances.threeOClock - PIVOT_POINT, 2)) +
      (mods.nineOClock * Math.pow(distances.nineOClock - PIVOT_POINT, 2)) +
      (mods.handle * Math.pow(distances.handle - PIVOT_POINT, 2)) +
      (mods.buttCap * Math.pow(distances.buttCap - PIVOT_POINT, 2));

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

  const getPointsBalanceString = (balanceCm: number) => {
    const midpoint = racquetLengthCm / 2;
    const diff = midpoint - balanceCm;
    const points = Math.round(Math.abs(diff) / 0.3175); 
    
    if (points === 0) return 'EB (Even Balance)';
    const direction = diff > 0 ? 'HL (Head Light)' : 'HH (Head Heavy)';
    return `${points} pts ${direction}`;
  };

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

  // ==========================================
  // --- Tournament Match Planner State ---
  // ==========================================
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [roster, setRoster] = useState<Player[]>([]);
  const [matches, setMatches] = useState<ScheduledMatch[]>([]);
  const [activeMatchId, setActiveMatchId] = useState<string>('');
  
  // Roster inputs state
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerGender, setNewPlayerGender] = useState<Gender>('Male');
  const [newPlayerClass, setNewPlayerClass] = useState<PlayerClass>('B');
  
  // Roster editing state
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editPlayerGender, setEditPlayerGender] = useState<Gender>('Male');
  const [editPlayerClass, setEditPlayerClass] = useState<PlayerClass>('B');

  // Match scheduler inputs state
  const [newMatchTeam1, setNewMatchTeam1] = useState('');
  const [newMatchTeam2, setNewMatchTeam2] = useState('');
  const [newMatchDate, setNewMatchDate] = useState('2026-06-24T18:00');
  const [newMatchFormatId, setNewMatchFormatId] = useState('club-custom');
  const [showAddMatchForm, setShowAddMatchForm] = useState(false);

  // Budget Calculator state
  const [courtHourRate, setCourtHourRate] = useState(25);
  const [hoursPerMatch, setHoursPerMatch] = useState(4);

  // ==========================================
  // --- Database Cloud Sync Helpers ---
  // ==========================================
  const saveMatchToCloud = async (m: ScheduledMatch) => {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('matches').upsert({
        id: m.id,
        team1: m.team1,
        team2: m.team2,
        date: m.date,
        status: m.status,
        format_id: m.formatId,
        lineup: m.lineup
      });
    }
  };

  const deleteMatchFromCloud = async (id: string) => {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('matches').delete().eq('id', id);
    }
  };

  const savePlayerToCloud = async (p: Player) => {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('players').upsert({
        id: p.id,
        name: p.name,
        gender: p.gender,
        class: p.class
      });
    }
  };

  const deletePlayerFromCloud = async (id: string) => {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('players').delete().eq('id', id);
    }
  };

  // Load from Supabase (with localStorage fallback)
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      setIsCloudSynced(true);
      const client = supabase;

      const fetchRoster = async () => {
        const { data, error } = await client
          .from('players')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (!error && data) {
          if (data.length > 0) {
            setRoster(data.map(p => ({
              id: p.id,
              name: p.name,
              gender: p.gender as Gender,
              class: p.class as PlayerClass
            })));
          } else {
            // Preload Supabase with default roster if empty
            setRoster(DEFAULT_PLAYERS);
            await client.from('players').insert(DEFAULT_PLAYERS);
          }
        }
      };

      const fetchMatches = async () => {
        const { data, error } = await client
          .from('matches')
          .select('*')
          .order('created_at', { ascending: true });

        if (!error && data) {
          if (data.length > 0) {
            const parsedMatches: ScheduledMatch[] = data.map(m => ({
              id: m.id,
              team1: m.team1,
              team2: m.team2,
              date: m.date,
              status: m.status as MatchStatus,
              formatId: m.format_id,
              lineup: (typeof m.lineup === 'string' ? JSON.parse(m.lineup) : m.lineup) as LineupSlot[]
            }));
            setMatches(parsedMatches);
            setActiveMatchId(parsedMatches[0].id);
          } else {
            // Preload Supabase with default matches if empty
            setMatches(DEFAULT_MATCHES);
            setActiveMatchId(DEFAULT_MATCHES[0].id);
            await client.from('matches').insert(DEFAULT_MATCHES.map(m => ({
              id: m.id,
              team1: m.team1,
              team2: m.team2,
              date: m.date,
              status: m.status,
              format_id: m.formatId,
              lineup: m.lineup
            })));
          }
        }
      };

      fetchRoster();
      fetchMatches();
    } else {
      setIsCloudSynced(false);
      
      // Load from LocalStorage
      const savedRoster = localStorage.getItem('racket_roster');
      if (savedRoster) {
        try {
          setRoster(JSON.parse(savedRoster));
        } catch (e) {
          setRoster(DEFAULT_PLAYERS);
        }
      } else {
        setRoster(DEFAULT_PLAYERS);
      }

      const savedMatches = localStorage.getItem('racket_matches');
      if (savedMatches) {
        try {
          const parsed = JSON.parse(savedMatches);
          setMatches(parsed);
          if (parsed.length > 0) {
            setActiveMatchId(parsed[0].id);
          }
        } catch (e) {
          setMatches(DEFAULT_MATCHES);
          setActiveMatchId(DEFAULT_MATCHES[0].id);
        }
      } else {
        setMatches(DEFAULT_MATCHES);
        setActiveMatchId(DEFAULT_MATCHES[0].id);
      }
    }
  }, []);

  // Save to localStorage (fallback/dual-write)
  useEffect(() => {
    if (roster.length > 0) {
      localStorage.setItem('racket_roster', JSON.stringify(roster));
    }
  }, [roster]);

  useEffect(() => {
    if (matches.length > 0) {
      localStorage.setItem('racket_matches', JSON.stringify(matches));
    }
  }, [matches]);

  // Active match memo
  const activeMatch = useMemo(() => {
    return matches.find(m => m.id === activeMatchId) || matches[0];
  }, [matches, activeMatchId]);

  // Active match format memo
  const activeFormat = useMemo(() => {
    if (!activeMatch) return DEFAULT_MATCH_FORMATS[0];
    return DEFAULT_MATCH_FORMATS.find(f => f.id === activeMatch.formatId) || DEFAULT_MATCH_FORMATS[0];
  }, [activeMatch]);

  // ==========================================
  // --- Rule Validation Engine ---
  // ==========================================
  const lineupValidation = useMemo(() => {
    if (!activeMatch || !activeFormat) return { errors: [], playerCounts: {} };

    const errors: { lineId: string; type: 'error' | 'warning' | 'info'; message: string }[] = [];
    const playerCounts: Record<string, number> = {};

    activeMatch.lineup.forEach(slot => {
      slot.playerIds.forEach(pId => {
        if (pId) {
          playerCounts[pId] = (playerCounts[pId] || 0) + 1;
        }
      });
    });

    activeMatch.lineup.forEach(slot => {
      const lineDef = activeFormat.lines.find(l => l.id === slot.lineId);
      if (!lineDef) return;

      const players = slot.playerIds
        .map(pId => roster.find(p => p.id === pId))
        .filter(Boolean) as Player[];

      const seen = new Set<string>();
      slot.playerIds.forEach(pId => {
        if (pId) {
          if (seen.has(pId)) {
            errors.push({
              lineId: slot.lineId,
              type: 'error',
              message: `Duplicate: ${roster.find(p => p.id === pId)?.name} is added multiple times in this match.`
            });
          }
          seen.add(pId);
        }
      });

      if (lineDef.genderReq === 'Male') {
        players.forEach(p => {
          if (p.gender !== 'Male') {
            errors.push({
              lineId: slot.lineId,
              type: 'warning',
              message: `Gender Mismatch: ${p.name} is Female, but slot requires Male.`
            });
          }
        });
      } else if (lineDef.genderReq === 'Female') {
        players.forEach(p => {
          if (p.gender !== 'Female') {
            errors.push({
              lineId: slot.lineId,
              type: 'warning',
              message: `Gender Mismatch: ${p.name} is Male, but slot requires Female.`
            });
          }
        });
      } else if (lineDef.genderReq === 'Mixed') {
        if (players.length === 2) {
          const males = players.filter(p => p.gender === 'Male');
          const females = players.filter(p => p.gender === 'Female');
          if (males.length !== 1 || females.length !== 1) {
            errors.push({
              lineId: slot.lineId,
              type: 'warning',
              message: `Gender Mismatch: Mixed Doubles requires 1 Male and 1 Female player.`
            });
          }
        }
      }

      if (lineDef.classReq) {
        players.forEach(p => {
          if (p.class !== lineDef.classReq) {
            errors.push({
              lineId: slot.lineId,
              type: 'info',
              message: `Class Notice: ${p.name} is Class ${p.class}, slot expects Class ${lineDef.classReq}.`
            });
          }
        });
      }
    });

    Object.entries(playerCounts).forEach(([pId, count]) => {
      if (count > 2) {
        const p = roster.find(player => player.id === pId);
        errors.push({
          lineId: 'global',
          type: 'error',
          message: `Over-participation: ${p?.name || 'Player'} is in ${count} matches (max 2 matches).`
        });
      }
    });

    return { errors, playerCounts };
  }, [activeMatch, activeFormat, roster]);

  // ==========================================
  // --- Tournament & Roster Actions ---
  // ==========================================
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    const newPlayer: Player = {
      id: `p-${Date.now()}`,
      name: newPlayerName.trim(),
      gender: newPlayerGender,
      class: newPlayerClass
    };

    setRoster(prev => [...prev, newPlayer]);
    await savePlayerToCloud(newPlayer);
    setNewPlayerName('');
  };

  const startEditing = (p: Player) => {
    setEditingPlayerId(p.id);
    setEditPlayerName(p.name);
    setEditPlayerGender(p.gender);
    setEditPlayerClass(p.class);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPlayerName.trim() || !editingPlayerId) return;

    const updatedPlayer: Player = {
      id: editingPlayerId,
      name: editPlayerName.trim(),
      gender: editPlayerGender,
      class: editPlayerClass
    };

    setRoster(prev => prev.map(p => p.id === editingPlayerId ? updatedPlayer : p));
    await savePlayerToCloud(updatedPlayer);
    setEditingPlayerId(null);
  };

  const handleDeletePlayer = async (pId: string) => {
    setRoster(prev => prev.filter(p => p.id !== pId));
    await deletePlayerFromCloud(pId);
    
    // Clean up player assignments in all matches
    const updatedMatches = matches.map(m => {
      const updatedLineup = m.lineup.map(slot => ({
        ...slot,
        playerIds: slot.playerIds.map(id => id === pId ? '' : id)
      }));
      const updatedMatch = { ...m, lineup: updatedLineup };
      saveMatchToCloud(updatedMatch);
      return updatedMatch;
    });
    setMatches(updatedMatches);
  };

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatchTeam1.trim() || !newMatchTeam2.trim()) return;

    const format = DEFAULT_MATCH_FORMATS.find(f => f.id === newMatchFormatId) || DEFAULT_MATCH_FORMATS[0];
    const newMatch: ScheduledMatch = {
      id: `m-${Date.now()}`,
      team1: newMatchTeam1.trim(),
      team2: newMatchTeam2.trim(),
      date: newMatchDate,
      status: 'Scheduled',
      formatId: newMatchFormatId,
      lineup: createEmptyLineup(format)
    };

    setMatches(prev => [...prev, newMatch]);
    await saveMatchToCloud(newMatch);
    setActiveMatchId(newMatch.id);
    setNewMatchTeam1('');
    setNewMatchTeam2('');
    setShowAddMatchForm(false);
  };

  const handleDeleteMatch = async (mId: string) => {
    const remaining = matches.filter(m => m.id !== mId);
    setMatches(remaining);
    await deleteMatchFromCloud(mId);
    if (activeMatchId === mId && remaining.length > 0) {
      setActiveMatchId(remaining[0].id);
    }
  };

  const handleUpdateMatchStatus = async (mId: string, status: MatchStatus) => {
    const updatedMatches = matches.map(m => {
      if (m.id !== mId) return m;
      const updatedMatch = { ...m, status };
      saveMatchToCloud(updatedMatch);
      return updatedMatch;
    });
    setMatches(updatedMatches);
  };

  const handleRescheduleMatch = async (mId: string, dateStr: string) => {
    const updatedMatches = matches.map(m => {
      if (m.id !== mId) return m;
      const updatedMatch = { ...m, date: dateStr };
      saveMatchToCloud(updatedMatch);
      return updatedMatch;
    });
    setMatches(updatedMatches);
  };

  const handleFormatChange = async (mId: string, formatId: string) => {
    const targetFormat = DEFAULT_MATCH_FORMATS.find(f => f.id === formatId) || DEFAULT_MATCH_FORMATS[0];
    const updatedMatches = matches.map(m => {
      if (m.id !== mId) return m;
      const updatedMatch = {
        ...m,
        formatId,
        lineup: createEmptyLineup(targetFormat)
      };
      saveMatchToCloud(updatedMatch);
      return updatedMatch;
    });
    setMatches(updatedMatches);
  };

  const handleAssignPlayer = async (playerId: string, lineId: string, slotIndex: number) => {
    if (!activeMatchId) return;
    const updatedMatches = matches.map(m => {
      if (m.id !== activeMatchId) return m;
      const updatedLineup = m.lineup.map(slot => {
        if (slot.lineId !== lineId) return slot;
        const updatedPlayerIds = [...slot.playerIds];
        updatedPlayerIds[slotIndex] = playerId;
        return { ...slot, playerIds: updatedPlayerIds };
      });
      const updatedMatch = { ...m, lineup: updatedLineup };
      saveMatchToCloud(updatedMatch);
      return updatedMatch;
    });
    setMatches(updatedMatches);
  };

  const handleClearSlot = async (lineId: string, slotIndex: number) => {
    if (!activeMatchId) return;
    const updatedMatches = matches.map(m => {
      if (m.id !== activeMatchId) return m;
      const updatedLineup = m.lineup.map(slot => {
        if (slot.lineId !== lineId) return slot;
        const updatedPlayerIds = [...slot.playerIds];
        updatedPlayerIds[slotIndex] = '';
        return { ...slot, playerIds: updatedPlayerIds };
      });
      const updatedMatch = { ...m, lineup: updatedLineup };
      saveMatchToCloud(updatedMatch);
      return updatedMatch;
    });
    setMatches(updatedMatches);
  };

  const handleClearFullLineup = async () => {
    if (!activeMatchId || !activeFormat) return;
    const updatedMatches = matches.map(m => {
      if (m.id !== activeMatchId) return m;
      const updatedMatch = {
        ...m,
        lineup: createEmptyLineup(activeFormat)
      };
      saveMatchToCloud(updatedMatch);
      return updatedMatch;
    });
    setMatches(updatedMatches);
  };

  const handleDragStart = (e: React.DragEvent, playerId: string) => {
    e.dataTransfer.setData('text/plain', playerId);
  };

  const handleDrop = (e: React.DragEvent, lineId: string, slotIndex: number) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData('text/plain');
    if (playerId) {
      handleAssignPlayer(playerId, lineId, slotIndex);
    }
  };

  // ==========================================
  // --- Court / Budget Calculations ---
  // ==========================================
  const budgetSummary = useMemo(() => {
    const activeScheduledMatches = matches.filter(m => m.status !== 'Postponed').length;
    const totalCourtHours = activeScheduledMatches * hoursPerMatch;
    const totalCost = totalCourtHours * courtHourRate;
    const costPerPlayer = roster.length > 0 ? (totalCost / roster.length) : 0;
    
    return {
      activeScheduledMatches,
      totalCourtHours,
      totalCost,
      costPerPlayer
    };
  }, [matches, roster, courtHourRate, hoursPerMatch]);

  const formatMatchDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      if (isNaN(date.getTime())) return isoStr;
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return isoStr;
    }
  };

  // ==========================================
  // --- UI Renders ---
  // ==========================================
  const renderRacquetCustomizer = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 max-w-7xl mx-auto w-full p-6 md:p-12">
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
              
              <div className="md:col-span-6 flex justify-center bg-wimbledon-cream border border-gray-100 rounded-md p-4 relative overflow-hidden h-[420px]">
                
                <svg viewBox="0 0 300 500" className="w-full h-full drop-shadow-sm">
                  <line x1="50" y1="100" x2="250" y2="100" stroke="#eaeaea" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="50" y1="200" x2="250" y2="200" stroke="#eaeaea" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="50" y1="300" x2="250" y2="300" stroke="#eaeaea" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="50" y1="400" x2="250" y2="400" stroke="#eaeaea" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="20" y1="380" x2="280" y2="380" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="5,3" />
                  <text x="25" y="373" className="text-3xs font-bold text-wimbledon-purple uppercase font-sans">10cm Pivot Axis</text>

                  {/* Draw racquet frame */}
                  <ellipse cx="150" cy="120" rx="55" ry="75" fill="none" stroke="#006633" strokeWidth="4" className="transition-all duration-300" />

                  {/* String Pattern (Vertical) */}
                  {[-40, -30, -20, -10, 0, 10, 20, 30, 40].map((offset) => {
                    const cy = 120;
                    const rx = 55;
                    const ry = 75;
                    const x = 150 + offset;
                    const term = 1 - Math.pow(offset, 2) / Math.pow(rx, 2);
                    if (term < 0) return null;
                    const yOffset = ry * Math.sqrt(term);
                    return (
                      <line key={`v-${offset}`} x1={x} y1={cy - yOffset} x2={x} y2={cy + yOffset} stroke="#e5e7eb" strokeWidth="1" />
                    );
                  })}
                  
                  {/* String Pattern (Horizontal) */}
                  {[-60, -45, -30, -15, 0, 15, 30, 45, 60].map((offset) => {
                    const cx = 150;
                    const rx = 55;
                    const ry = 75;
                    const y = 120 + offset;
                    const term = 1 - Math.pow(offset, 2) / Math.pow(ry, 2);
                    if (term < 0) return null;
                    const xOffset = rx * Math.sqrt(term);
                    return (
                      <line key={`h-${offset}`} x1={cx - xOffset} y1={y} x2={cx + xOffset} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                    );
                  })}

                  <path d="M 112 180 C 120 220, 138 255, 138 270" fill="none" stroke="#006633" strokeWidth="4.5" />
                  <path d="M 188 180 C 180 220, 162 255, 162 270" fill="none" stroke="#006633" strokeWidth="4.5" />
                  
                  <rect x="138" y="270" width="24" height="170" fill="#e6f2ec" stroke="#006633" strokeWidth="3.5" />

                  {[285, 300, 315, 330, 345, 360, 375, 390, 405, 420, 435].map((yVal, idx) => (
                    <line key={`grip-${idx}`} x1="138" y1={yVal} x2="162" y2={yVal + 8} stroke="#006633" strokeWidth="1.5" opacity="0.4" />
                  ))}

                  <rect x="135" y="440" width="30" height="12" rx="2" fill="#462066" stroke="#462066" strokeWidth="1" />
                  <text x="150" y="448" textAnchor="middle" fill="#ffffff" className="font-sans text-[6px] font-bold">W</text>

                  {mods.twelveOClock > 0 && (
                    <rect x="130" y="40" width="40" height="7" rx="1" fill="#9ca3af" stroke="#4b5563" strokeWidth="1" className="animate-pulse" />
                  )}
                  {mods.threeOClock > 0 && (
                    <rect x="202" y="105" width="7" height="30" rx="1" fill="#9ca3af" stroke="#4b5563" strokeWidth="1" className="animate-pulse" />
                  )}
                  {mods.nineOClock > 0 && (
                    <rect x="91" y="105" width="7" height="30" rx="1" fill="#9ca3af" stroke="#4b5563" strokeWidth="1" className="animate-pulse" />
                  )}
                  {mods.handle > 0 && (
                    <rect x="139" y="272" width="22" height="166" fill="#462066" fillOpacity="0.15" stroke="#462066" strokeWidth="1" strokeDasharray="2,2" />
                  )}
                  {mods.buttCap > 0 && (
                    <circle cx="150" cy="446" r="4" fill="#c49a45" className="animate-pulse" />
                  )}

                  {/* Hotspots */}
                  <g className="cursor-pointer group" onClick={() => setSelectedHotspot('twelveOClock')}>
                    <circle cx="150" cy="45" r="12" fill={selectedHotspot === 'twelveOClock' ? '#462066' : 'transparent'} fillOpacity="0.2" />
                    <circle cx="150" cy="45" r="6" fill={mods.twelveOClock > 0 ? '#ccff00' : '#006633'} stroke="#ffffff" strokeWidth="1.5" className="group-hover:scale-125 transition-transform duration-200" />
                  </g>

                  <g className="cursor-pointer group" onClick={() => setSelectedHotspot('threeOClock')}>
                    <circle cx="205" cy="120" r="12" fill={selectedHotspot === 'threeOClock' ? '#462066' : 'transparent'} fillOpacity="0.2" />
                    <circle cx="205" cy="120" r="6" fill={mods.threeOClock > 0 ? '#ccff00' : '#006633'} stroke="#ffffff" strokeWidth="1.5" className="group-hover:scale-125 transition-transform duration-200" />
                  </g>

                  <g className="cursor-pointer group" onClick={() => setSelectedHotspot('nineOClock')}>
                    <circle cx="95" cy="120" r="12" fill={selectedHotspot === 'nineOClock' ? '#462066' : 'transparent'} fillOpacity="0.2" />
                    <circle cx="95" cy="120" r="6" fill={mods.nineOClock > 0 ? '#ccff00' : '#006633'} stroke="#ffffff" strokeWidth="1.5" className="group-hover:scale-125 transition-transform duration-200" />
                  </g>

                  <g className="cursor-pointer group" onClick={() => setSelectedHotspot('handle')}>
                    <circle cx="150" cy="355" r="15" fill={selectedHotspot === 'handle' ? '#462066' : 'transparent'} fillOpacity="0.2" />
                    <circle cx="150" cy="355" r="7" fill={mods.handle > 0 ? '#ccff00' : '#006633'} stroke="#ffffff" strokeWidth="1.5" className="group-hover:scale-125 transition-transform duration-200" />
                  </g>

                  <g className="cursor-pointer group" onClick={() => setSelectedHotspot('buttCap')}>
                    <circle cx="150" cy="446" r="12" fill={selectedHotspot === 'buttCap' ? '#462066' : 'transparent'} fillOpacity="0.2" />
                    <circle cx="150" cy="446" r="6" fill={mods.buttCap > 0 ? '#ccff00' : '#462066'} stroke="#ffffff" strokeWidth="1.5" className="group-hover:scale-125 transition-transform duration-200" />
                  </g>
                </svg>

                <div className="absolute top-2 left-2 bg-white/90 border border-gray-100 rounded px-2 py-1 text-4xs font-bold uppercase tracking-wider text-gray-500 pointer-events-none select-none">
                  Click a node to add mass
                </div>
              </div>

              {/* Lab Controls & Spec editor */}
              <div className="md:col-span-6 flex flex-col gap-5 self-start">
                <div>
                  <h4 className="text-sm uppercase tracking-wider font-bold text-gray-400">Selected Node</h4>
                  
                  {selectedHotspot ? (
                    <div className="mt-1.5 p-4 border border-wimbledon-purple-light bg-wimbledon-purple-light/20 rounded">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-md text-wimbledon-purple uppercase font-serif-display">
                          {selectedHotspot === 'twelveOClock' && '12 O\'clock (Hoop Top)'}
                          {selectedHotspot === 'threeOClock' && '3 O\'clock (Hoop Right)'}
                          {selectedHotspot === 'nineOClock' && '9 O\'clock (Hoop Left)'}
                          {selectedHotspot === 'handle' && 'Handle / Overgrip'}
                          {selectedHotspot === 'buttCap' && 'Butt Cap / Silicone'}
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
      </div>
    );
  };

  const renderMatchPlanner = () => {
    return (
      <div className="max-w-7xl mx-auto w-full p-6 md:p-12 flex flex-col gap-8">
        {/* Planner Header Stat Bar */}
        <div className="bg-wimbledon-cream border border-gray-200 p-6 rounded-md flex flex-wrap gap-6 items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-wimbledon-green text-white p-3 rounded-full">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-wimbledon-green font-serif-display uppercase">Tournament Match Planner</h2>
              <p className="text-xs text-gray-500">Manage schedules, roster participation, and calculate court budget.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 md:gap-8">
            <div className="border-r border-gray-200 pr-6">
              <div className="text-2xs uppercase tracking-wider text-gray-400 font-bold">Scheduled Matches</div>
              <div className="text-xl font-extrabold text-wimbledon-purple font-serif-display">
                {budgetSummary.activeScheduledMatches} <span className="text-xs font-semibold text-gray-400">lines</span>
              </div>
            </div>
            <div className="border-r border-gray-200 pr-6">
              <div className="text-2xs uppercase tracking-wider text-gray-400 font-bold">Court Booking</div>
              <div className="text-xl font-extrabold text-wimbledon-purple font-serif-display">
                {budgetSummary.totalCourtHours} <span className="text-xs font-semibold text-gray-400">hours</span>
              </div>
            </div>
            <div className="border-r border-gray-200 pr-6">
              <div className="text-2xs uppercase tracking-wider text-gray-400 font-bold">Total Cost</div>
              <div className="text-xl font-extrabold text-wimbledon-green font-serif-display">
                ${budgetSummary.totalCost}
              </div>
            </div>
            <div>
              <div className="text-2xs uppercase tracking-wider text-gray-400 font-bold">Cost / Player</div>
              <div className="text-xl font-extrabold text-wimbledon-green font-serif-display">
                ${budgetSummary.costPerPlayer.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Team Roster (3 cols) */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="border border-gray-200 bg-white p-5 rounded-md shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <h3 className="font-bold text-wimbledon-green text-md uppercase font-serif-display flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-wimbledon-purple" /> Team Roster ({roster.length})
                </h3>
              </div>

              {/* Add Player Form */}
              <form onSubmit={handleAddPlayer} className="flex flex-col gap-3 mb-6 bg-gray-50 p-3 rounded border border-gray-100">
                <div className="text-2xs uppercase tracking-wider font-extrabold text-gray-500">Add Roster Player</div>
                <input 
                  type="text"
                  placeholder="Player Name"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="w-full text-xs p-2 border border-gray-300 rounded focus:border-wimbledon-purple focus:outline-none bg-white text-gray-900"
                  required
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Gender</label>
                    <select
                      value={newPlayerGender}
                      onChange={(e) => setNewPlayerGender(e.target.value as Gender)}
                      className="w-full text-xs p-1.5 border border-gray-300 rounded bg-white text-gray-900"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Class</label>
                    <select
                      value={newPlayerClass}
                      onChange={(e) => setNewPlayerClass(e.target.value as PlayerClass)}
                      className="w-full text-xs p-1.5 border border-gray-300 rounded bg-white text-gray-950"
                    >
                      <option value="A">Class A</option>
                      <option value="B">Class B</option>
                      <option value="C">Class C</option>
                      <option value="D">Class D</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full text-xs bg-wimbledon-green hover:bg-wimbledon-green-hover text-white py-1.5 px-3 rounded font-bold transition-colors uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Player
                </button>
              </form>

              {/* Roster List */}
              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
                {roster.map((p) => {
                  const matchesPlaying = lineupValidation.playerCounts[p.id] || 0;
                  const isOverplayed = matchesPlaying > 2;

                  return (
                    <div 
                      key={p.id}
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, p.id)}
                      className={`p-2.5 border rounded flex flex-col gap-1 select-none transition-all ${
                        isOverplayed 
                          ? 'border-red-300 bg-red-50/20' 
                          : 'border-gray-100 hover:border-gray-300 bg-white hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${p.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'}`}></span>
                          {p.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditing(p)}
                            className="text-2xs text-gray-400 hover:text-wimbledon-purple font-semibold p-0.5 cursor-pointer bg-transparent border-0"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePlayer(p.id)}
                            className="text-2xs text-gray-400 hover:text-red-600 font-semibold p-0.5 cursor-pointer bg-transparent border-0"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-wimbledon-purple font-extrabold uppercase bg-wimbledon-purple-light/20 px-1.5 py-0.5 rounded">
                          Class {p.class}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">Playcount:</span>
                          <span className={`px-1.5 py-0.2 rounded-full font-bold ${
                            matchesPlaying === 0 ? 'bg-gray-100 text-gray-500' :
                            matchesPlaying === 1 ? 'bg-emerald-50 text-emerald-700' :
                            matchesPlaying === 2 ? 'bg-wimbledon-purple-light text-wimbledon-purple' :
                            'bg-red-100 text-red-700 font-extrabold'
                          }`}>
                            {matchesPlaying}/2
                          </span>
                        </div>
                      </div>

                      {editingPlayerId === p.id && (
                        <div className="mt-2 bg-gray-50 p-2 rounded border border-gray-200">
                          <div className="text-[10px] uppercase font-bold text-gray-500 mb-1.5">Edit Player</div>
                          <input 
                            type="text"
                            value={editPlayerName}
                            onChange={(e) => setEditPlayerName(e.target.value)}
                            className="w-full text-xs p-1 border border-gray-300 bg-white text-gray-900 rounded mb-1.5"
                          />
                          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                            <select
                              value={editPlayerGender}
                              onChange={(e) => setEditPlayerGender(e.target.value as Gender)}
                              className="text-2xs p-1 border border-gray-300 bg-white text-gray-900 rounded"
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                            <select
                              value={editPlayerClass}
                              onChange={(e) => setEditPlayerClass(e.target.value as PlayerClass)}
                              className="text-2xs p-1 border border-gray-300 bg-white text-gray-900 rounded"
                            >
                              <option value="A">Class A</option>
                              <option value="B">Class B</option>
                              <option value="C">Class C</option>
                              <option value="D">Class D</option>
                            </select>
                          </div>
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setEditingPlayerId(null)} className="text-[10px] px-2 py-0.5 border rounded text-gray-500 bg-white cursor-pointer">Cancel</button>
                            <button onClick={handleSaveEdit} className="text-[10px] px-2 py-0.5 bg-wimbledon-green text-white rounded font-bold cursor-pointer">Save</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-400 italic">
                💡 Drag and drop players from roster cards directly into the lineup slots.
              </div>
            </div>

            {/* Sub-Card: Settings / Budget inputs */}
            <div className="border border-gray-200 bg-white p-5 rounded-md shadow-sm">
              <h3 className="font-bold text-wimbledon-green text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-wimbledon-gold" /> Budget Settings
              </h3>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[10px] text-gray-500 font-bold block mb-1">COURT HOURLY RATE</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">$</span>
                    <input 
                      type="number"
                      value={courtHourRate}
                      onChange={(e) => setCourtHourRate(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-xs p-1.5 border border-gray-300 rounded bg-white text-gray-950 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 font-bold block mb-1">HOURS ALLOCATED / MATCH DAY</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      value={hoursPerMatch}
                      onChange={(e) => setHoursPerMatch(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full text-xs p-1.5 border border-gray-300 rounded bg-white text-gray-950 font-bold"
                    />
                    <span className="text-2xs text-gray-400 font-bold">hrs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column: Match Schedule (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="border border-gray-200 bg-white p-5 rounded-md shadow-sm">
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <h3 className="font-bold text-wimbledon-green text-md uppercase font-serif-display flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-wimbledon-purple" /> Match Schedules
                </h3>
                <button
                  onClick={() => setShowAddMatchForm(!showAddMatchForm)}
                  className="text-2xs bg-wimbledon-purple hover:bg-wimbledon-purple-hover text-white py-1 px-2 rounded-md font-bold transition-all uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Match
                </button>
              </div>

              {/* Add Match Form */}
              {showAddMatchForm && (
                <form onSubmit={handleAddMatch} className="flex flex-col gap-3 mb-6 bg-gray-50 p-4 rounded border border-gray-200">
                  <div className="text-xs font-bold text-wimbledon-purple uppercase">Schedule New Encounter</div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold block mb-0.5">TEAM 1 (HOME)</label>
                      <input 
                        type="text" 
                        value={newMatchTeam1} 
                        onChange={(e) => setNewMatchTeam1(e.target.value)}
                        className="w-full text-xs p-1.5 border border-gray-300 bg-white text-gray-900 rounded" 
                        placeholder="e.g. Team A"
                        required 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold block mb-0.5">TEAM 2 (AWAY)</label>
                      <input 
                        type="text" 
                        value={newMatchTeam2} 
                        onChange={(e) => setNewMatchTeam2(e.target.value)}
                        className="w-full text-xs p-1.5 border border-gray-300 bg-white text-gray-900 rounded" 
                        placeholder="e.g. Team B"
                        required 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 font-bold block mb-0.5">DATE & TIME</label>
                    <input 
                      type="datetime-local" 
                      value={newMatchDate}
                      onChange={(e) => setNewMatchDate(e.target.value)}
                      className="w-full text-xs p-1.5 border border-gray-300 bg-white text-gray-900 rounded" 
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 font-bold block mb-0.5">MATCH FORMAT</label>
                    <select
                      value={newMatchFormatId}
                      onChange={(e) => setNewMatchFormatId(e.target.value)}
                      className="w-full text-xs p-1.5 border border-gray-300 bg-white text-gray-950 rounded"
                    >
                      {DEFAULT_MATCH_FORMATS.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 justify-end mt-1">
                    <button 
                      type="button" 
                      onClick={() => setShowAddMatchForm(false)}
                      className="text-xs py-1.5 px-3 border border-gray-300 bg-white text-gray-600 rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="text-xs py-1.5 px-3 bg-wimbledon-green text-white rounded font-bold cursor-pointer"
                    >
                      Schedule
                    </button>
                  </div>
                </form>
              )}

              {/* Matches List */}
              <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-1">
                {matches.map((m) => {
                  const isSelected = activeMatchId === m.id;
                  const formatDef = DEFAULT_MATCH_FORMATS.find(f => f.id === m.formatId) || DEFAULT_MATCH_FORMATS[0];

                  return (
                    <div 
                      key={m.id}
                      className={`p-3.5 border rounded-md transition-all flex flex-col gap-2 ${
                        isSelected 
                          ? 'border-wimbledon-purple bg-wimbledon-purple-light/5 shadow-xs ring-1 ring-wimbledon-purple' 
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs uppercase tracking-wider font-extrabold text-wimbledon-green bg-wimbledon-green-light px-2 py-0.5 rounded">
                          {formatDef.name.split(' ')[0]} Format
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDeleteMatch(m.id)}
                            className="text-gray-400 hover:text-red-600 cursor-pointer p-0.5"
                            title="Delete Match"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Team vs Team Header */}
                      <div className="flex justify-between items-center py-1">
                        <span className="font-extrabold text-sm text-gray-800 font-serif-display uppercase">{m.team1}</span>
                        <span className="text-2xs font-extrabold text-wimbledon-gold px-2 py-0.5 rounded bg-wimbledon-cream border border-wimbledon-gold/30">VS</span>
                        <span className="font-extrabold text-sm text-gray-800 font-serif-display uppercase">{m.team2}</span>
                      </div>

                      {/* Date */}
                      <div className="flex items-center justify-between text-2xs border-t border-gray-100 pt-2 text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-wimbledon-purple" />
                          <span>{formatMatchDate(m.date)}</span>
                        </div>
                      </div>

                      {/* Status and Action Buttons */}
                      <div className="flex flex-col gap-2 mt-1.5">
                        <div className="grid grid-cols-2 gap-1.5">
                          {/* Reschedule Picker */}
                          <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-gray-400 uppercase">Reschedule</span>
                            <input 
                              type="datetime-local"
                              value={m.date}
                              onChange={(e) => handleRescheduleMatch(m.id, e.target.value)}
                              className="text-4xs p-1 border border-gray-200 bg-white text-gray-900 rounded font-sans"
                            />
                          </div>

                          {/* Status Select */}
                          <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-gray-400 uppercase">Status</span>
                            <select
                              value={m.status}
                              onChange={(e) => handleUpdateMatchStatus(m.id, e.target.value as MatchStatus)}
                              className="text-4xs p-1 border border-gray-200 bg-white text-gray-900 rounded font-sans font-bold"
                            >
                              <option value="Scheduled">Scheduled</option>
                              <option value="Postponed">Postponed</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 mt-1">
                          {/* Match Format Switcher */}
                          <select
                            value={m.formatId}
                            onChange={(e) => handleFormatChange(m.id, e.target.value)}
                            className="text-[9px] p-1 border border-gray-205 bg-white text-gray-950 rounded font-sans"
                          >
                            {DEFAULT_MATCH_FORMATS.map(f => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>

                          {/* Selection Button */}
                          <button
                            onClick={() => setActiveMatchId(m.id)}
                            className={`text-2xs font-extrabold py-1 px-2.5 rounded transition-all cursor-pointer text-center uppercase tracking-wider ${
                              isSelected 
                                ? 'bg-wimbledon-purple text-white' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Manage Lineup
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Lineup Builder & Validator (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {activeMatch ? (
              <div className="border border-gray-200 bg-white p-5 rounded-md shadow-sm">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                  <div>
                    <h3 className="font-bold text-wimbledon-green text-md uppercase font-serif-display">
                      Lineup: {activeMatch.team1} vs {activeMatch.team2}
                    </h3>
                    <p className="text-[10px] text-gray-500 italic mt-0.5">Format: {activeFormat.name}</p>
                  </div>
                  
                  <button
                    onClick={handleClearFullLineup}
                    className="text-3xs text-red-600 hover:text-red-800 underline font-bold uppercase cursor-pointer bg-transparent border-0"
                  >
                    Clear Lineup
                  </button>
                </div>

                {/* Global Warnings Panel */}
                {lineupValidation.errors.filter(e => e.lineId === 'global').length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex flex-col gap-1.5">
                    <div className="flex items-center gap-1 text-xs font-bold text-red-700 uppercase">
                      <AlertTriangle className="w-4 h-4 text-red-600" /> Roster Rule Violations
                    </div>
                    <ul className="list-disc list-inside text-3xs text-red-600 flex flex-col gap-0.5">
                      {lineupValidation.errors
                        .filter(e => e.lineId === 'global')
                        .map((err, i) => (
                          <li key={`glob-${i}`}>{err.message}</li>
                        ))
                      }
                    </ul>
                  </div>
                )}

                {/* Lineup Slots */}
                <div className="flex flex-col gap-3">
                  {activeFormat.lines.map((line) => {
                    const slotData = activeMatch.lineup.find(s => s.lineId === line.id) || { lineId: line.id, playerIds: [] };
                    const slotCount = line.type === 'Singles' ? 1 : 2;
                    const lineErrors = lineupValidation.errors.filter(e => e.lineId === line.id);

                    return (
                      <div 
                        key={line.id}
                        className={`p-3 border rounded-md transition-all flex flex-col gap-2 ${
                          lineErrors.some(e => e.type === 'error') ? 'border-red-300 bg-red-50/5' :
                          lineErrors.some(e => e.type === 'warning') ? 'border-amber-300 bg-amber-50/5' :
                          'border-gray-100 bg-gray-50/30'
                        }`}
                      >
                        {/* Line Definition Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                          <span className="text-xs font-extrabold text-gray-800 font-serif-display uppercase">
                            {line.name}
                          </span>
                          
                          <span className="text-[9px] uppercase tracking-wider font-bold text-wimbledon-purple bg-wimbledon-purple-light/20 px-1.5 py-0.2 rounded-full">
                            {line.genderReq} {line.classReq ? `(Class ${line.classReq})` : ''}
                          </span>
                        </div>

                        {/* Player Slots */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {Array.from({ length: slotCount }).map((_, idx) => {
                            const pId = slotData.playerIds[idx] || '';
                            const p = roster.find(player => player.id === pId);

                            return (
                              <div
                                key={`${line.id}-slot-${idx}`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, line.id, idx)}
                                className={`border border-dashed rounded p-2 text-center transition-all ${
                                  pId 
                                    ? 'border-wimbledon-green bg-white shadow-3xs' 
                                    : 'border-gray-300 hover:border-gray-400 bg-white/70 py-3.5'
                                }`}
                              >
                                {p ? (
                                  <div className="flex items-center justify-between gap-1 text-left">
                                    <div className="flex flex-col leading-none">
                                      <span className="text-xs font-bold text-gray-850 truncate max-w-[120px]">{p.name}</span>
                                      <span className="text-[9px] text-gray-450 uppercase font-semibold mt-0.5">
                                        {p.gender} • Class {p.class}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleClearSlot(line.id, idx)}
                                      className="text-gray-400 hover:text-red-600 bg-transparent border-0 cursor-pointer p-0.5"
                                      title="Remove Player"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-1.5 justify-center">
                                    <span className="text-[10px] text-gray-400 italic">Drag player or select</span>
                                    
                                    <select
                                      value={pId}
                                      onChange={(e) => handleAssignPlayer(e.target.value, line.id, idx)}
                                      className="text-[10px] p-1 border border-gray-200 bg-white text-gray-650 rounded w-full font-sans cursor-pointer"
                                    >
                                      <option value="">-- Choose Player --</option>
                                      {roster.map(pOpt => {
                                        const count = lineupValidation.playerCounts[pOpt.id] || 0;
                                        return (
                                          <option key={pOpt.id} value={pOpt.id}>
                                            {pOpt.name} (Class {pOpt.class}, {pOpt.gender}) [{count}/2]
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Line Specific Warnings */}
                        {lineErrors.map((err, i) => (
                          <div 
                            key={`err-${i}`}
                            className={`flex items-center gap-1 text-[9px] font-semibold p-1 rounded-sm mt-1 border ${
                              err.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
                              err.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                              'bg-blue-50 border-blue-100 text-blue-700'
                            }`}
                          >
                            <Info className="w-3 h-3 flex-shrink-0" />
                            <span>{err.message}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-gray-300 rounded-md p-8 text-center bg-gray-50">
                <p className="text-sm text-gray-500 italic">Please select or add a match in the schedule panel to edit lineups.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 bg-white flex flex-col justify-between selection:bg-wimbledon-green-light selection:text-wimbledon-green">
      
      {/* Wimbledon Header */}
      <header className="border-t-[6px] border-wimbledon-green border-b border-gray-100 bg-white pt-8 pb-4 px-6 md:px-12 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-wimbledon-purple font-sans">The All England Racket Lab</span>
              {isCloudSynced ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-sans">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Cloud Synced (Supabase)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-sans">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Local Mode (Offline)
                </span>
              )}
            </div>
            
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-wimbledon-green uppercase font-serif-display">
              Wimbledon <span className="italic font-medium text-wimbledon-purple">Lab</span>
            </h1>
            
            <p className="text-gray-600 mt-2 text-md max-w-2xl leading-relaxed italic">
              Bespoke racquet customization and tournament lineup planner platform for team matches.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-end">
            <button 
              onClick={() => setShowExplanation(!showExplanation)}
              className="text-xs flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 hover:border-wimbledon-purple text-gray-700 font-semibold rounded transition-all cursor-pointer bg-white"
            >
              <HelpCircle className="w-3.5 h-3.5 text-wimbledon-purple" />
              Physics Guides
            </button>
            <button 
              onClick={resetAll}
              className="text-xs flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 hover:border-wimbledon-green text-gray-700 font-semibold rounded transition-all cursor-pointer bg-white"
            >
              <RotateCcw className="w-3.5 h-3.5 text-wimbledon-green" />
              Reset Tuner
            </button>
          </div>
        </div>

        {/* Top-Level Tab Selectors */}
        <div className="max-w-7xl mx-auto mt-8 flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('customizer')}
            className={`py-3.5 px-6 font-serif-display text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'customizer'
                ? 'border-wimbledon-green text-wimbledon-green font-extrabold'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <Sliders className="w-4 h-4" /> Racquet Customizer
          </button>
          
          <button
            onClick={() => setActiveTab('planner')}
            className={`py-3.5 px-6 font-serif-display text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'planner'
                ? 'border-wimbledon-green text-wimbledon-green font-extrabold'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <Calendar className="w-4 h-4" /> Match & Lineup Planner
          </button>
        </div>
      </header>

      {/* Physics explanation panel (Shared) */}
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

      {/* Main content display based on Active Tab */}
      <main className="flex-1 bg-white">
        {activeTab === 'customizer' ? renderRacquetCustomizer() : renderMatchPlanner()}
      </main>

      {/* Affiliate Products Panel */}
      <AnimatePresence>
        {activeTab === 'customizer' && finalSpecs.addedMass > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="border-t border-gray-200 bg-wimbledon-cream py-12 px-6 md:px-12"
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

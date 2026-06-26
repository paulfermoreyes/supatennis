import { useState, useEffect, useMemo } from 'react';
import { Player, ScheduledMatch, LineupSlot, Gender, PlayerClass, MatchStatus, Tournament, User } from '../types';
import { DEFAULT_PLAYERS, DEFAULT_MATCH_FORMATS, DEFAULT_MATCHES, createEmptyLineup } from '../defaultData';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { validateLineup } from '../utils/validation';

interface UseMatchPlannerProps {
  currentUser: User | null;
  registeredUsers: User[];
}

export function useMatchPlanner({ currentUser, registeredUsers }: UseMatchPlannerProps) {
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTournamentId, setActiveTournamentId] = useState<string>('');
  
  const [roster, setRoster] = useState<Player[]>([]);
  const [matches, setMatches] = useState<ScheduledMatch[]>([]);
  const [activeMatchId, setActiveMatchId] = useState<string>('');

  // Tournament Form State
  const [newTournamentName, setNewTournamentName] = useState('');

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
  const [newMatchTeam1Rep, setNewMatchTeam1Rep] = useState('');
  const [newMatchTeam2Rep, setNewMatchTeam2Rep] = useState('');
  const [showAddMatchForm, setShowAddMatchForm] = useState(false);

  // Budget Calculator state
  const [courtHourRate, setCourtHourRate] = useState(300);
  const [hoursPerMatch, setHoursPerMatch] = useState(4);

  // --- Database Cloud Sync Helpers ---
  const saveMatchToCloud = async (m: ScheduledMatch) => {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('matches').upsert({
        id: m.id,
        team1: m.team1,
        team2: m.team2,
        date: m.date,
        status: m.status,
        format_id: m.formatId,
        lineup: m.lineup,
        lineup2: m.lineup2 || [],
        tournament_id: m.tournamentId || activeTournamentId,
        team1_rep: m.team1Rep || null,
        team2_rep: m.team2Rep || null
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
        class: p.class,
        tournament_id: p.tournamentId || activeTournamentId
      });
    }
  };

  const deletePlayerFromCloud = async (id: string) => {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('players').delete().eq('id', id);
    }
  };

  // 1. Load Tournaments List on mount
  useEffect(() => {
    const fetchTournaments = async () => {
      if (isSupabaseConfigured && supabase) {
        setIsCloudSynced(true);
        try {
          const { data, error } = await supabase
            .from('tournaments')
            .select('*')
            .order('created_at', { ascending: true });

          if (!error && data) {
            if (data.length > 0) {
              const list = data.map(t => ({
                id: t.id,
                name: t.name,
                created_by: t.created_by
              }));
              setTournaments(list);
              
              const savedActiveId = localStorage.getItem('racket_active_tournament_id');
              const exists = list.some(t => t.id === savedActiveId);
              setActiveTournamentId(exists ? savedActiveId! : list[0].id);
            } else {
              // Create default tournament
              const defaultT: Tournament = {
                id: 't-default',
                name: 'Wimbledon Summer Open 2026',
                created_by: 'u-admin'
              };
              setTournaments([defaultT]);
              setActiveTournamentId(defaultT.id);
              await supabase.from('tournaments').insert({
                id: defaultT.id,
                name: defaultT.name,
                created_by: defaultT.created_by
              });
            }
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        // Offline LocalStorage Mode
        setIsCloudSynced(false);
        const savedTournaments = localStorage.getItem('racket_tournaments');
        const defaultList = [
          { id: 't-default', name: 'Wimbledon Summer Open 2026', created_by: 'u-admin' }
        ];
        if (savedTournaments) {
          try {
            const parsed = JSON.parse(savedTournaments) as Tournament[];
            setTournaments(parsed);
            const savedActiveId = localStorage.getItem('racket_active_tournament_id');
            const exists = parsed.some(t => t.id === savedActiveId);
            setActiveTournamentId(exists ? savedActiveId! : parsed[0].id);
          } catch (e) {
            setTournaments(defaultList);
            setActiveTournamentId('t-default');
          }
        } else {
          setTournaments(defaultList);
          setActiveTournamentId('t-default');
          localStorage.setItem('racket_tournaments', JSON.stringify(defaultList));
        }
      }
    };

    fetchTournaments();
  }, []);

  // 2. Load Roster and Matches when activeTournamentId changes
  useEffect(() => {
    if (!activeTournamentId) return;
    localStorage.setItem('racket_active_tournament_id', activeTournamentId);

    if (isSupabaseConfigured && supabase) {
      const client = supabase;

      const fetchRoster = async () => {
        const { data, error } = await client
          .from('players')
          .select('*')
          .eq('tournament_id', activeTournamentId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          if (data.length > 0) {
            setRoster(data.map(p => ({
              id: p.id,
              name: p.name,
              gender: p.gender as Gender,
              class: p.class as PlayerClass,
              tournamentId: p.tournament_id
            })));
          } else {
            // Seed default players for the default tournament
            if (activeTournamentId === 't-default') {
              const seeded = DEFAULT_PLAYERS.map(p => ({ ...p, tournamentId: 't-default' }));
              setRoster(seeded);
              await client.from('players').insert(seeded.map(p => ({
                id: p.id,
                name: p.name,
                gender: p.gender,
                class: p.class,
                tournament_id: 't-default'
              })));
            } else {
              setRoster([]);
            }
          }
        }
      };

      const fetchMatches = async () => {
        const { data, error } = await client
          .from('matches')
          .select('*')
          .eq('tournament_id', activeTournamentId)
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
              lineup: (typeof m.lineup === 'string' ? JSON.parse(m.lineup) : m.lineup) as LineupSlot[],
              lineup2: m.lineup2 ? (typeof m.lineup2 === 'string' ? JSON.parse(m.lineup2) : m.lineup2) as LineupSlot[] : [],
              tournamentId: m.tournament_id,
              team1Rep: m.team1_rep || undefined,
              team2Rep: m.team2_rep || undefined
            }));
            setMatches(parsedMatches);
            setActiveMatchId(parsedMatches[0].id);
          } else {
            // Seed default matches for the default tournament
            if (activeTournamentId === 't-default') {
              const seeded = DEFAULT_MATCHES.map(m => ({
                ...m,
                lineup2: createEmptyLineup(DEFAULT_MATCH_FORMATS[0]),
                tournamentId: 't-default'
              }));
              setMatches(seeded);
              setActiveMatchId(seeded[0].id);
              await client.from('matches').insert(seeded.map(m => ({
                id: m.id,
                team1: m.team1,
                team2: m.team2,
                date: m.date,
                status: m.status,
                format_id: m.formatId,
                lineup: m.lineup,
                lineup2: m.lineup2,
                tournament_id: 't-default'
              })));
            } else {
              setMatches([]);
              setActiveMatchId('');
            }
          }
        }
      };

      fetchRoster();
      fetchMatches();
    } else {
      // LocalStorage Mode
      const savedRoster = localStorage.getItem(`racket_roster_${activeTournamentId}`);
      if (savedRoster) {
        try {
          setRoster(JSON.parse(savedRoster));
        } catch (e) {
          setRoster([]);
        }
      } else {
        if (activeTournamentId === 't-default') {
          const seeded = DEFAULT_PLAYERS.map(p => ({ ...p, tournamentId: 't-default' }));
          setRoster(seeded);
          localStorage.setItem(`racket_roster_${activeTournamentId}`, JSON.stringify(seeded));
        } else {
          setRoster([]);
        }
      }

      const savedMatches = localStorage.getItem(`racket_matches_${activeTournamentId}`);
      if (savedMatches) {
        try {
          const parsed = JSON.parse(savedMatches);
          setMatches(parsed);
          if (parsed.length > 0) {
            setActiveMatchId(parsed[0].id);
          } else {
            setActiveMatchId('');
          }
        } catch (e) {
          setMatches([]);
          setActiveMatchId('');
        }
      } else {
        if (activeTournamentId === 't-default') {
          const seeded = DEFAULT_MATCHES.map(m => ({
            ...m,
            lineup2: createEmptyLineup(DEFAULT_MATCH_FORMATS[0]),
            tournamentId: 't-default'
          }));
          setMatches(seeded);
          setActiveMatchId(seeded[0].id);
          localStorage.setItem(`racket_matches_${activeTournamentId}`, JSON.stringify(seeded));
        } else {
          setMatches([]);
          setActiveMatchId('');
        }
      }
    }
  }, [activeTournamentId]);

  // Save changes locally
  useEffect(() => {
    if (activeTournamentId && roster.length > 0) {
      localStorage.setItem(`racket_roster_${activeTournamentId}`, JSON.stringify(roster));
    }
  }, [roster, activeTournamentId]);

  useEffect(() => {
    if (activeTournamentId && matches.length > 0) {
      localStorage.setItem(`racket_matches_${activeTournamentId}`, JSON.stringify(matches));
    }
  }, [matches, activeTournamentId]);

  const activeMatch = useMemo(() => {
    return matches.find(m => m.id === activeMatchId) || matches[0];
  }, [matches, activeMatchId]);

  const activeFormat = useMemo(() => {
    if (!activeMatch) return DEFAULT_MATCH_FORMATS[0];
    return DEFAULT_MATCH_FORMATS.find(f => f.id === activeMatch.formatId) || DEFAULT_MATCH_FORMATS[0];
  }, [activeMatch]);

  // Computed lineup validation results (combines home and away players checks)
  const lineupValidation = useMemo(() => {
    const defaultRes = { errors: [], playerCounts: {} };
    if (!activeMatch || !activeFormat) return defaultRes;

    // Validate Team 1's Lineup
    const res1 = validateLineup(activeMatch, activeFormat, roster, registeredUsers);

    // Validate Team 2's Lineup (using lineup2 in place of lineup)
    const match2 = { ...activeMatch, lineup: activeMatch.lineup2 || [] };
    const res2 = validateLineup(match2, activeFormat, roster, registeredUsers);

    // Merge errors (prefix messages for clarity)
    const errors = [
      ...res1.errors.map(e => ({ ...e, message: `[${activeMatch.team1}] ${e.message}` })),
      ...res2.errors.map(e => ({ ...e, message: `[${activeMatch.team2}] ${e.message}` }))
    ];

    // Combine player play counts
    const playerCounts = { ...res1.playerCounts };
    Object.entries(res2.playerCounts).forEach(([pId, count]) => {
      playerCounts[pId] = (playerCounts[pId] || 0) + count;
    });

    // Check overall playcount over-participation (> 2 matches total across both team lineups)
    Object.entries(playerCounts).forEach(([pId, count]) => {
      if (count > 2) {
        // Remove existing global error for this player to avoid duplication
        const existingIdx = errors.findIndex(err => err.lineId === 'global' && err.message.includes(pId));
        if (existingIdx !== -1) errors.splice(existingIdx, 1);

        const playerObj = roster.find(p => p.id === pId) || registeredUsers.find(u => u.id === pId || `@${u.username}` === pId);
        errors.push({
          lineId: 'global',
          type: 'error',
          message: `Over-participation: ${playerObj?.name || pId} is assigned to ${count} total lines across both teams (max 2).`
        });
      }
    });

    return { errors, playerCounts };
  }, [activeMatch, activeFormat, roster, registeredUsers]);

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

  // --- CRUD Event Handlers ---
  const handleAddTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTournamentName.trim() || !currentUser) return;

    const newT: Tournament = {
      id: `t-${Date.now()}`,
      name: newTournamentName.trim(),
      created_by: currentUser.id
    };

    const updatedTournaments = [...tournaments, newT];
    setTournaments(updatedTournaments);
    setActiveTournamentId(newT.id);
    setNewTournamentName('');

    if (isSupabaseConfigured && supabase) {
      await supabase.from('tournaments').insert({
        id: newT.id,
        name: newT.name,
        created_by: newT.created_by
      });
    } else {
      localStorage.setItem('racket_tournaments', JSON.stringify(updatedTournaments));
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    const newPlayer: Player = {
      id: `p-${Date.now()}`,
      name: newPlayerName.trim(),
      gender: newPlayerGender,
      class: newPlayerClass,
      tournamentId: activeTournamentId
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
      class: editPlayerClass,
      tournamentId: activeTournamentId
    };

    setRoster(prev => prev.map(p => p.id === editingPlayerId ? updatedPlayer : p));
    await savePlayerToCloud(updatedPlayer);
    setEditingPlayerId(null);
  };

  const handleDeletePlayer = async (pId: string) => {
    setRoster(prev => prev.filter(p => p.id !== pId));
    await deletePlayerFromCloud(pId);
    
    const updatedMatches = matches.map(m => {
      const updatedLineup = m.lineup.map(slot => ({
        ...slot,
        playerIds: slot.playerIds.map(id => id === pId ? '' : id)
      }));
      const updatedLineup2 = (m.lineup2 || []).map(slot => ({
        ...slot,
        playerIds: slot.playerIds.map(id => id === pId ? '' : id)
      }));
      const updatedMatch = { ...m, lineup: updatedLineup, lineup2: updatedLineup2 };
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
      lineup: createEmptyLineup(format),
      lineup2: createEmptyLineup(format),
      tournamentId: activeTournamentId,
      team1Rep: newMatchTeam1Rep || undefined,
      team2Rep: newMatchTeam2Rep || undefined
    };

    setMatches(prev => [...prev, newMatch]);
    await saveMatchToCloud(newMatch);
    setActiveMatchId(newMatch.id);
    setNewMatchTeam1('');
    setNewMatchTeam2('');
    setNewMatchTeam1Rep('');
    setNewMatchTeam2Rep('');
    setShowAddMatchForm(false);
  };

  const handleDeleteMatch = async (mId: string) => {
    const remaining = matches.filter(m => m.id !== mId);
    setMatches(remaining);
    await deleteMatchFromCloud(mId);
    if (activeMatchId === mId && remaining.length > 0) {
      setActiveMatchId(remaining[0].id);
    } else if (remaining.length === 0) {
      setActiveMatchId('');
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
        lineup: createEmptyLineup(targetFormat),
        lineup2: createEmptyLineup(targetFormat)
      };
      saveMatchToCloud(updatedMatch);
      return updatedMatch;
    });
    setMatches(updatedMatches);
  };

  const handleAssignPlayer = async (playerId: string, lineId: string, slotIndex: number, teamIndex: 1 | 2 = 1) => {
    if (!activeMatchId) return;
    const updatedMatches = matches.map(m => {
      if (m.id !== activeMatchId) return m;
      const targetLineup = teamIndex === 1 ? m.lineup : (m.lineup2 || createEmptyLineup(activeFormat));
      const updatedLineup = targetLineup.map(slot => {
        if (slot.lineId !== lineId) return slot;
        const updatedPlayerIds = [...slot.playerIds];
        updatedPlayerIds[slotIndex] = playerId;
        return { ...slot, playerIds: updatedPlayerIds };
      });
      const updatedMatch = teamIndex === 1 
        ? { ...m, lineup: updatedLineup } 
        : { ...m, lineup2: updatedLineup };
      saveMatchToCloud(updatedMatch);
      return updatedMatch;
    });
    setMatches(updatedMatches);
  };

  const handleClearSlot = async (lineId: string, slotIndex: number, teamIndex: 1 | 2 = 1) => {
    if (!activeMatchId) return;
    const updatedMatches = matches.map(m => {
      if (m.id !== activeMatchId) return m;
      const targetLineup = teamIndex === 1 ? m.lineup : (m.lineup2 || createEmptyLineup(activeFormat));
      const updatedLineup = targetLineup.map(slot => {
        if (slot.lineId !== lineId) return slot;
        const updatedPlayerIds = [...slot.playerIds];
        updatedPlayerIds[slotIndex] = '';
        return { ...slot, playerIds: updatedPlayerIds };
      });
      const updatedMatch = teamIndex === 1 
        ? { ...m, lineup: updatedLineup } 
        : { ...m, lineup2: updatedLineup };
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
        lineup: createEmptyLineup(activeFormat),
        lineup2: createEmptyLineup(activeFormat)
      };
      saveMatchToCloud(updatedMatch);
      return updatedMatch;
    });
    setMatches(updatedMatches);
  };

  return {
    isCloudSynced,
    tournaments,
    activeTournamentId,
    setActiveTournamentId,
    newTournamentName,
    setNewTournamentName,
    handleAddTournament,

    roster,
    matches,
    activeMatchId,
    setActiveMatchId,
    activeMatch,
    activeFormat,
    lineupValidation,
    budgetSummary,
    
    // Player Form States
    newPlayerName,
    setNewPlayerName,
    newPlayerGender,
    setNewPlayerGender,
    newPlayerClass,
    setNewPlayerClass,
    
    // Player Edit States
    editingPlayerId,
    setEditingPlayerId,
    editPlayerName,
    setEditPlayerName,
    editPlayerGender,
    setEditPlayerGender,
    editPlayerClass,
    setEditPlayerClass,
    
    // Match Form States
    newMatchTeam1,
    setNewMatchTeam1,
    newMatchTeam2,
    setNewMatchTeam2,
    newMatchDate,
    setNewMatchDate,
    newMatchFormatId,
    setNewMatchFormatId,
    newMatchTeam1Rep,
    setNewMatchTeam1Rep,
    newMatchTeam2Rep,
    setNewMatchTeam2Rep,
    showAddMatchForm,
    setShowAddMatchForm,
    
    // Budget States
    courtHourRate,
    setCourtHourRate,
    hoursPerMatch,
    setHoursPerMatch,
    
    // Roster Mutators
    handleAddPlayer,
    startEditing,
    handleSaveEdit,
    handleDeletePlayer,
    
    // Match Mutators
    handleAddMatch,
    handleDeleteMatch,
    handleUpdateMatchStatus,
    handleRescheduleMatch,
    handleFormatChange,
    
    // Lineup Mutators
    handleAssignPlayer,
    handleClearSlot,
    handleClearFullLineup,
  };
}

export type UseMatchPlannerReturn = ReturnType<typeof useMatchPlanner>;

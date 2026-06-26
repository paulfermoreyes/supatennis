import React, { useState } from 'react';
import { AlertTriangle, X, Info, Check, UserCheck, Edit2, ShieldAlert } from 'lucide-react';
import { ScheduledMatch, MatchFormat, Player, User } from '../types';
import { LineupValidationResult } from '../utils/validation';

interface LineupBuilderProps {
  activeMatch: ScheduledMatch | undefined;
  activeFormat: MatchFormat | undefined;
  roster: Player[];
  lineupValidation: LineupValidationResult;
  handleAssignPlayer: (playerId: string, lineId: string, slotIndex: number, teamIndex: 1 | 2) => void;
  handleClearSlot: (lineId: string, slotIndex: number, teamIndex: 1 | 2) => void;
  handleClearFullLineup: () => void;
  isTournamentAdmin: boolean;
  isTeam1Rep: boolean;
  isTeam2Rep: boolean;
  registeredUsers: User[];
}

export function LineupBuilder({
  activeMatch,
  activeFormat,
  roster,
  lineupValidation,
  handleAssignPlayer,
  handleClearSlot,
  handleClearFullLineup,
  isTournamentAdmin,
  isTeam1Rep,
  isTeam2Rep,
  registeredUsers,
}: LineupBuilderProps) {
  
  // Track which slots are currently in manual input mode
  // Key format: `${lineId}-${slotIndex}-${teamIndex}`
  const [manualInputSlot, setManualInputSlot] = useState<string | null>(null);
  const [manualName, setManualName] = useState('');

  if (!activeMatch || !activeFormat) {
    return (
      <div className="border border-dashed border-gray-300 rounded-md p-8 text-center bg-gray-50 font-sans">
        <p className="text-sm text-gray-500 italic">Please select or add a match in the schedule panel to edit lineups.</p>
      </div>
    );
  }

  // Check editing rights
  const canEditTeam1 = isTournamentAdmin || isTeam1Rep;
  const canEditTeam2 = isTournamentAdmin || isTeam2Rep;
  const canClearAll = isTournamentAdmin;

  const handleDrop = (e: React.DragEvent, lineId: string, slotIndex: number, teamIndex: 1 | 2) => {
    e.preventDefault();
    const isAuthorized = teamIndex === 1 ? canEditTeam1 : canEditTeam2;
    if (!isAuthorized) return;

    const playerId = e.dataTransfer.getData('text/plain');
    if (playerId) {
      handleAssignPlayer(playerId, lineId, slotIndex, teamIndex);
    }
  };

  const globalErrors = lineupValidation.errors.filter(e => e.lineId === 'global');

  // Helper to parse player name and details for display
  const resolvePlayerDisplay = (pId: string) => {
    if (!pId) return null;
    if (pId.startsWith('@')) {
      const username = pId.substring(1);
      const u = registeredUsers.find(usr => usr.username.toLowerCase() === username.toLowerCase());
      return {
        name: u ? u.name : username,
        sub: `@${username}`,
        isTag: true
      };
    } else if (pId.startsWith('manual:')) {
      return {
        name: pId.substring(7),
        sub: 'Manual Entry',
        isManual: true
      };
    } else {
      const p = roster.find(player => player.id === pId);
      return {
        name: p ? p.name : 'Unknown Roster Player',
        sub: p ? `Class ${p.class} • ${p.gender}` : '',
        isRoster: true
      };
    }
  };

  return (
    <div className="border border-gray-200 bg-white p-5 rounded-md shadow-sm font-sans flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <h3 className="font-bold text-wimbledon-green text-md uppercase font-serif-display leading-none">
            Encounter Lineups
          </h3>
          <p className="text-[10px] text-gray-500 italic mt-1 leading-none">Format: {activeFormat.name}</p>
        </div>
        
        {canClearAll && (
          <button
            onClick={handleClearFullLineup}
            className="text-3xs text-red-650 hover:text-red-800 underline font-bold uppercase cursor-pointer bg-transparent border-0"
          >
            Clear Lineup
          </button>
        )}
      </div>

      {/* Global Warnings Panel */}
      {globalErrors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded flex flex-col gap-1.5 animate-pulse">
          <div className="flex items-center gap-1 text-xs font-bold text-red-700 uppercase font-sans">
            <AlertTriangle className="w-4 h-4 text-red-600 animate-bounce" /> Roster Rule Violations
          </div>
          <ul className="list-disc list-inside text-3xs text-red-650 flex flex-col gap-0.5 font-medium">
            {globalErrors.map((err, i) => (
              <li key={`glob-${i}`}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Side-by-Side Lineup Builder */}
      <div className="flex flex-col gap-4">
        {activeFormat.lines.map((line) => {
          const slotCount = line.type === 'Singles' ? 1 : 2;
          const lineErrors = lineupValidation.errors.filter(e => e.lineId === line.id);

          return (
            <div 
              key={line.id}
              className={`p-3.5 border rounded-md transition-all flex flex-col gap-3 ${
                lineErrors.some(e => e.type === 'error') ? 'border-red-300 bg-red-50/5' :
                lineErrors.some(e => e.type === 'warning') ? 'border-amber-300 bg-amber-50/5' :
                'border-gray-150 bg-gray-50/30'
              }`}
            >
              {/* Line Type Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                <span className="text-xs font-extrabold text-gray-800 font-serif-display uppercase">
                  {line.name}
                </span>
                
                <span className="text-[9px] uppercase tracking-wider font-bold text-wimbledon-purple bg-wimbledon-purple-light/20 px-1.5 py-0.2 rounded-full font-sans">
                  {line.genderReq} {line.classReq ? `(Class ${line.classReq})` : ''}
                </span>
              </div>

              {/* Home vs Away Slot Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Team 1 (Home) Column */}
                <div className="flex flex-col gap-2">
                  <div className="text-[9px] uppercase tracking-wider font-bold text-gray-400">
                    🏠 {activeMatch.team1} (Home)
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: slotCount }).map((_, idx) => {
                      const slotData = activeMatch.lineup?.find(s => s.lineId === line.id) || { lineId: line.id, playerIds: [] };
                      const pId = slotData.playerIds[idx] || '';
                      const resolved = resolvePlayerDisplay(pId);
                      const isManualMode = manualInputSlot === `${line.id}-${idx}-1`;

                      return (
                        <div
                          key={`team1-${line.id}-${idx}`}
                          onDragOver={(e) => canEditTeam1 && e.preventDefault()}
                          onDrop={(e) => handleDrop(e, line.id, idx, 1)}
                          className={`border rounded p-2 transition-all ${
                            pId 
                              ? 'border-wimbledon-green bg-white shadow-3xs' 
                              : 'border-dashed border-gray-300 bg-white/70'
                          }`}
                        >
                          {resolved ? (
                            <div className="flex items-center justify-between gap-1 text-left font-sans">
                              <div className="flex flex-col leading-none">
                                <span className="text-xs font-bold text-gray-800 truncate max-w-[125px] flex items-center gap-1">
                                  {resolved.isTag && <UserCheck className="w-3 h-3 text-wimbledon-purple" />}
                                  {resolved.name}
                                </span>
                                <span className="text-[9px] text-gray-450 uppercase font-semibold mt-0.5 font-sans">
                                  {resolved.sub}
                                </span>
                              </div>
                              {canEditTeam1 && (
                                <button
                                  onClick={() => handleClearSlot(line.id, idx, 1)}
                                  className="text-gray-450 hover:text-red-650 bg-transparent border-0 cursor-pointer p-0.5"
                                  title="Remove Player"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : isManualMode && canEditTeam1 ? (
                            <div className="flex items-center gap-1 font-sans">
                              <input 
                                type="text"
                                placeholder="Enter name"
                                value={manualName}
                                onChange={(e) => setManualName(e.target.value)}
                                className="text-4xs p-1 border border-gray-300 rounded bg-white text-gray-900 w-full focus:outline-none"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && manualName.trim()) {
                                    handleAssignPlayer(`manual:${manualName.trim()}`, line.id, idx, 1);
                                    setManualInputSlot(null);
                                    setManualName('');
                                  }
                                }}
                                autoFocus
                              />
                              <button 
                                onClick={() => {
                                  if (manualName.trim()) {
                                    handleAssignPlayer(`manual:${manualName.trim()}`, line.id, idx, 1);
                                    setManualInputSlot(null);
                                    setManualName('');
                                  }
                                }}
                                className="p-1 bg-wimbledon-green text-white rounded cursor-pointer border-0"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => setManualInputSlot(null)}
                                className="p-1 bg-gray-100 text-gray-500 rounded cursor-pointer border border-gray-250"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5 justify-center font-sans">
                              {canEditTeam1 ? (
                                <>
                                  <select
                                    value={pId}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === '__manual__') {
                                        setManualInputSlot(`${line.id}-${idx}-1`);
                                        setManualName('');
                                      } else {
                                        handleAssignPlayer(val, line.id, idx, 1);
                                      }
                                    }}
                                    className="text-[10px] p-1 border border-gray-200 bg-white text-gray-650 rounded w-full font-sans cursor-pointer focus:outline-none"
                                  >
                                    <option value="">-- Choose/Tag --</option>
                                    <optgroup label="Team Roster">
                                      {roster.map(pOpt => {
                                        const count = lineupValidation.playerCounts[pOpt.id] || 0;
                                        return (
                                          <option key={pOpt.id} value={pOpt.id}>
                                            {pOpt.name} (Class {pOpt.class}, {pOpt.gender.charAt(0)}) [{count}/2]
                                          </option>
                                        );
                                      })}
                                    </optgroup>
                                    <optgroup label="Tag Users (@)">
                                      {registeredUsers.map(u => {
                                        const tag = `@${u.username}`;
                                        const count = lineupValidation.playerCounts[tag] || 0;
                                        return (
                                          <option key={u.id} value={tag}>
                                            @{u.username} ({u.name}) [{count}/2]
                                          </option>
                                        );
                                      })}
                                    </optgroup>
                                    <option value="__manual__">✍️ Input name manually...</option>
                                  </select>
                                </>
                              ) : (
                                <span className="text-[10px] text-gray-400 italic text-center py-0.5">Unassigned</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Team 2 (Away) Column */}
                <div className="flex flex-col gap-2">
                  <div className="text-[9px] uppercase tracking-wider font-bold text-gray-400">
                    ✈️ {activeMatch.team2} (Away)
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: slotCount }).map((_, idx) => {
                      const slotData = activeMatch.lineup2?.find(s => s.lineId === line.id) || { lineId: line.id, playerIds: [] };
                      const pId = slotData.playerIds[idx] || '';
                      const resolved = resolvePlayerDisplay(pId);
                      const isManualMode = manualInputSlot === `${line.id}-${idx}-2`;

                      return (
                        <div
                          key={`team2-${line.id}-${idx}`}
                          onDragOver={(e) => canEditTeam2 && e.preventDefault()}
                          onDrop={(e) => handleDrop(e, line.id, idx, 2)}
                          className={`border rounded p-2 transition-all ${
                            pId 
                              ? 'border-wimbledon-green bg-white shadow-3xs' 
                              : 'border-dashed border-gray-300 bg-white/70'
                          }`}
                        >
                          {resolved ? (
                            <div className="flex items-center justify-between gap-1 text-left font-sans">
                              <div className="flex flex-col leading-none">
                                <span className="text-xs font-bold text-gray-800 truncate max-w-[125px] flex items-center gap-1">
                                  {resolved.isTag && <UserCheck className="w-3 h-3 text-wimbledon-purple" />}
                                  {resolved.name}
                                </span>
                                <span className="text-[9px] text-gray-455 uppercase font-semibold mt-0.5 font-sans">
                                  {resolved.sub}
                                </span>
                              </div>
                              {canEditTeam2 && (
                                <button
                                  onClick={() => handleClearSlot(line.id, idx, 2)}
                                  className="text-gray-450 hover:text-red-650 bg-transparent border-0 cursor-pointer p-0.5"
                                  title="Remove Player"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : isManualMode && canEditTeam2 ? (
                            <div className="flex items-center gap-1 font-sans">
                              <input 
                                type="text"
                                placeholder="Enter name"
                                value={manualName}
                                onChange={(e) => setManualName(e.target.value)}
                                className="text-4xs p-1 border border-gray-300 rounded bg-white text-gray-905 w-full focus:outline-none"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && manualName.trim()) {
                                    handleAssignPlayer(`manual:${manualName.trim()}`, line.id, idx, 2);
                                    setManualInputSlot(null);
                                    setManualName('');
                                  }
                                }}
                                autoFocus
                              />
                              <button 
                                onClick={() => {
                                  if (manualName.trim()) {
                                    handleAssignPlayer(`manual:${manualName.trim()}`, line.id, idx, 2);
                                    setManualInputSlot(null);
                                    setManualName('');
                                  }
                                }}
                                className="p-1 bg-wimbledon-green text-white rounded cursor-pointer border-0"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => setManualInputSlot(null)}
                                className="p-1 bg-gray-100 text-gray-500 rounded cursor-pointer border border-gray-250"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5 justify-center font-sans">
                              {canEditTeam2 ? (
                                <>
                                  <select
                                    value={pId}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === '__manual__') {
                                        setManualInputSlot(`${line.id}-${idx}-2`);
                                        setManualName('');
                                      } else {
                                        handleAssignPlayer(val, line.id, idx, 2);
                                      }
                                    }}
                                    className="text-[10px] p-1 border border-gray-200 bg-white text-gray-650 rounded w-full font-sans cursor-pointer focus:outline-none"
                                  >
                                    <option value="">-- Choose/Tag --</option>
                                    <optgroup label="Team Roster">
                                      {roster.map(pOpt => {
                                        const count = lineupValidation.playerCounts[pOpt.id] || 0;
                                        return (
                                          <option key={pOpt.id} value={pOpt.id}>
                                            {pOpt.name} (Class {pOpt.class}, {pOpt.gender.charAt(0)}) [{count}/2]
                                          </option>
                                        );
                                      })}
                                    </optgroup>
                                    <optgroup label="Tag Users (@)">
                                      {registeredUsers.map(u => {
                                        const tag = `@${u.username}`;
                                        const count = lineupValidation.playerCounts[tag] || 0;
                                        return (
                                          <option key={u.id} value={tag}>
                                            @{u.username} ({u.name}) [{count}/2]
                                          </option>
                                        );
                                      })}
                                    </optgroup>
                                    <option value="__manual__">✍️ Input name manually...</option>
                                  </select>
                                </>
                              ) : (
                                <span className="text-[10px] text-gray-400 italic text-center py-0.5">Unassigned</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Line Specific Warnings */}
              {lineErrors.map((err, i) => (
                <div 
                  key={`err-${i}`}
                  className={`flex items-center gap-1 text-[9px] font-semibold p-1 rounded-sm mt-1 border ${
                    err.type === 'error' ? 'bg-red-50 border-red-205 text-red-750' :
                    err.type === 'warning' ? 'bg-amber-50 border-amber-205 text-amber-750' :
                    'bg-blue-50 border-blue-105 text-blue-750'
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
  );
}
export default LineupBuilder;

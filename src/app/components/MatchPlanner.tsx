import React, { useState } from 'react';
import { Calendar, Shield, ShieldCheck, ShieldAlert, Plus, Layers } from 'lucide-react';
import { UseMatchPlannerReturn } from '../hooks/useMatchPlanner';
import { RosterManager } from './RosterManager';
import { MatchScheduler } from './MatchScheduler';
import { LineupBuilder } from './LineupBuilder';
import { User } from '../types';

interface MatchPlannerProps {
  planner: UseMatchPlannerReturn;
  currentUser: User | null;
  registeredUsers: User[];
  onOpenLogin: () => void;
}

export function MatchPlanner({ planner, currentUser, registeredUsers, onOpenLogin }: MatchPlannerProps) {
  const {
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
  } = planner;

  const [showAddTournament, setShowAddTournament] = useState(false);

  // Find active tournament details
  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  // Check roles and edit permissions
  const isTournamentAdmin = !!(
    currentUser &&
    (currentUser.username === 'admin' || (activeTournament && activeTournament.created_by === currentUser.id))
  );

  const isTeam1Rep = !!(currentUser && activeMatch && activeMatch.team1Rep === currentUser.id);
  const isTeam2Rep = !!(currentUser && activeMatch && activeMatch.team2Rep === currentUser.id);
  const isRepresentative = isTeam1Rep || isTeam2Rep;

  // Format a friendly permission badge
  const renderPermissionBadge = () => {
    if (isTournamentAdmin) {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold font-sans">
          <ShieldCheck className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span>Tournament Admin (Full Access)</span>
        </div>
      );
    }
    if (isTeam1Rep && isTeam2Rep) {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-wimbledon-purple-light text-wimbledon-purple border border-wimbledon-purple/20 text-xs font-bold font-sans">
          <Shield className="w-4 h-4 text-wimbledon-purple" />
          <span>Team Representative (Both Teams)</span>
        </div>
      );
    }
    if (isTeam1Rep) {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-wimbledon-purple-light text-wimbledon-purple border border-wimbledon-purple/20 text-xs font-bold font-sans">
          <Shield className="w-4 h-4 text-wimbledon-purple" />
          <span>Rep: {activeMatch?.team1} (Edit Home Lineup)</span>
        </div>
      );
    }
    if (isTeam2Rep) {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-wimbledon-purple-light text-wimbledon-purple border border-wimbledon-purple/20 text-xs font-bold font-sans">
          <Shield className="w-4 h-4 text-wimbledon-purple" />
          <span>Rep: {activeMatch?.team2} (Edit Away Lineup)</span>
        </div>
      );
    }
    if (currentUser) {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-gray-50 text-gray-700 border border-gray-250 text-xs font-bold font-sans">
          <ShieldAlert className="w-4 h-4 text-gray-500" />
          <span>Read-Only Access (Non-rep)</span>
        </div>
      );
    }
    return (
      <div 
        onClick={onOpenLogin}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-50 text-amber-800 border border-amber-250 text-xs font-bold font-sans cursor-pointer hover:bg-amber-100 transition-colors"
      >
        <ShieldAlert className="w-4 h-4 text-amber-605" />
        <span>Guest (Read-Only • Click to Login)</span>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto w-full p-6 md:p-12 flex flex-col gap-6">
      
      {/* Tournament Selector & Access Bar */}
      <div className="bg-white border border-gray-200 rounded-md p-4 flex flex-wrap gap-4 items-center justify-between shadow-xs">
        <div className="flex flex-wrap items-center gap-3 font-sans">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase">
            <Layers className="w-4 h-4 text-wimbledon-purple" />
            Active Tournament:
          </div>
          
          <select
            value={activeTournamentId}
            onChange={(e) => setActiveTournamentId(e.target.value)}
            className="text-xs p-1.5 border border-gray-300 rounded bg-white text-gray-900 font-bold focus:outline-none focus:border-wimbledon-purple cursor-pointer"
          >
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} {t.created_by === 'u-admin' ? '(Default)' : ''}
              </option>
            ))}
          </select>

          {currentUser && (
            <button
              onClick={() => setShowAddTournament(!showAddTournament)}
              className="text-2xs bg-wimbledon-purple hover:bg-wimbledon-purple-hover text-white py-1.5 px-3 rounded font-bold uppercase transition-all tracking-wider flex items-center gap-1 cursor-pointer border-0"
            >
              <Plus className="w-3.5 h-3.5" /> New Tournament
            </button>
          )}
        </div>

        {/* Access Right Indicator */}
        <div>{renderPermissionBadge()}</div>
      </div>

      {/* Add Tournament Form Modal/Overlay */}
      {showAddTournament && currentUser && (
        <form 
          onSubmit={(e) => {
            handleAddTournament(e);
            setShowAddTournament(false);
          }}
          className="bg-gray-50 border border-gray-200 p-4 rounded-md flex flex-wrap gap-3 items-end font-sans shadow-2xs"
        >
          <div className="flex-1 min-w-[250px]">
            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Create New Tournament</label>
            <input 
              type="text" 
              placeholder="E.g. Wimbledon Autumn Doubles Cup 2026"
              value={newTournamentName}
              onChange={(e) => setNewTournamentName(e.target.value)}
              className="w-full text-xs p-2 border border-gray-300 bg-white text-gray-900 rounded focus:border-wimbledon-purple focus:outline-none font-medium"
              required
            />
          </div>
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => setShowAddTournament(false)} 
              className="text-xs py-2 px-4 border border-gray-300 bg-white text-gray-600 rounded font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="text-xs py-2 px-4 bg-wimbledon-green text-white rounded font-bold cursor-pointer border-0"
            >
              Create Tournament
            </button>
          </div>
        </form>
      )}

      {/* Planner Header Stat Bar */}
      <div className="bg-wimbledon-cream border border-gray-200 p-6 rounded-md flex flex-wrap gap-6 items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-wimbledon-green text-white p-3 rounded-full">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-wimbledon-green font-serif-display uppercase">Tournament Match Planner</h2>
            <p className="text-xs text-gray-500 font-sans">Manage schedules, roster participation, and calculate court budget.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 md:gap-8 font-sans">
          <div className="border-r border-gray-200 pr-6">
            <div className="text-2xs uppercase tracking-wider text-gray-400 font-bold">Scheduled Matches</div>
            <div className="text-xl font-extrabold text-wimbledon-purple font-serif-display">
              {budgetSummary.activeScheduledMatches} <span className="text-xs font-semibold text-gray-400">matches</span>
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
              ₱{budgetSummary.totalCost}
            </div>
          </div>
          <div>
            <div className="text-2xs uppercase tracking-wider text-gray-400 font-bold">Cost / Player</div>
            <div className="text-xl font-extrabold text-wimbledon-green font-serif-display">
              ₱{budgetSummary.costPerPlayer.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Team Roster (3 cols) */}
        <div className="lg:col-span-3">
          <RosterManager 
            roster={roster}
            lineupValidation={lineupValidation}
            newPlayerName={newPlayerName}
            setNewPlayerName={setNewPlayerName}
            newPlayerGender={newPlayerGender}
            setNewPlayerGender={setNewPlayerGender}
            newPlayerClass={newPlayerClass}
            setNewPlayerClass={setNewPlayerClass}
            editingPlayerId={editingPlayerId}
            setEditingPlayerId={setEditingPlayerId}
            editPlayerName={editPlayerName}
            setEditPlayerName={setEditPlayerName}
            editPlayerGender={editPlayerGender}
            setEditPlayerGender={setEditPlayerGender}
            editPlayerClass={editPlayerClass}
            setEditPlayerClass={setEditPlayerClass}
            courtHourRate={courtHourRate}
            setCourtHourRate={setCourtHourRate}
            hoursPerMatch={hoursPerMatch}
            setHoursPerMatch={setHoursPerMatch}
            handleAddPlayer={handleAddPlayer}
            startEditing={startEditing}
            handleSaveEdit={handleSaveEdit}
            handleDeletePlayer={handleDeletePlayer}
            isAdmin={isTournamentAdmin}
          />
        </div>

        {/* Middle Column: Match Schedule (4 cols) */}
        <div className="lg:col-span-4">
          <MatchScheduler 
            matches={matches}
            activeMatchId={activeMatchId}
            setActiveMatchId={setActiveMatchId}
            showAddMatchForm={showAddMatchForm}
            setShowAddMatchForm={setShowAddMatchForm}
            newMatchTeam1={newMatchTeam1}
            setNewMatchTeam1={setNewMatchTeam1}
            newMatchTeam2={newMatchTeam2}
            setNewMatchTeam2={setNewMatchTeam2}
            newMatchDate={newMatchDate}
            setNewMatchDate={setNewMatchDate}
            newMatchFormatId={newMatchFormatId}
            setNewMatchFormatId={setNewMatchFormatId}
            newMatchTeam1Rep={newMatchTeam1Rep}
            setNewMatchTeam1Rep={setNewMatchTeam1Rep}
            newMatchTeam2Rep={newMatchTeam2Rep}
            setNewMatchTeam2Rep={setNewMatchTeam2Rep}
            handleAddMatch={handleAddMatch}
            handleDeleteMatch={handleDeleteMatch}
            handleUpdateMatchStatus={handleUpdateMatchStatus}
            handleRescheduleMatch={handleRescheduleMatch}
            handleFormatChange={handleFormatChange}
            isAdmin={isTournamentAdmin}
            registeredUsers={registeredUsers}
          />
        </div>

        {/* Right Column: Lineup Builder (5 cols) */}
        <div className="lg:col-span-5">
          <LineupBuilder 
            activeMatch={activeMatch}
            activeFormat={activeFormat}
            roster={roster}
            lineupValidation={lineupValidation}
            handleAssignPlayer={handleAssignPlayer}
            handleClearSlot={handleClearSlot}
            handleClearFullLineup={handleClearFullLineup}
            isTournamentAdmin={isTournamentAdmin}
            isTeam1Rep={isTeam1Rep}
            isTeam2Rep={isTeam2Rep}
            registeredUsers={registeredUsers}
          />
        </div>
      </div>
    </div>
  );
}
export default MatchPlanner;

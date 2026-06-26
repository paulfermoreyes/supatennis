import { ScheduledMatch, MatchFormat, Player, Gender, PlayerClass, MatchStatus, User } from '../types';

export interface LineupValidationError {
  lineId: string;
  type: 'error' | 'warning' | 'info';
  message: string;
}

export interface LineupValidationResult {
  errors: LineupValidationError[];
  playerCounts: Record<string, number>;
}

/**
 * Validates a team lineup for a scheduled match according to gender, class, and participation rules
 */
export function validateLineup(
  activeMatch: ScheduledMatch | undefined,
  activeFormat: MatchFormat | undefined,
  roster: Player[],
  registeredUsers?: User[]
): LineupValidationResult {
  if (!activeMatch || !activeFormat) return { errors: [], playerCounts: {} };

  const errors: LineupValidationError[] = [];
  const playerCounts: Record<string, number> = {};

  // 1. Calculate player participation counts
  activeMatch.lineup.forEach(slot => {
    slot.playerIds.forEach(pId => {
      if (pId) {
        playerCounts[pId] = (playerCounts[pId] || 0) + 1;
      }
    });
  });

  // Helper to get player info from ID (either roster player, tagged username, or manual input)
  const getPlayerDetails = (pId: string): Player | null => {
    if (!pId) return null;
    if (pId.startsWith('@')) {
      const username = pId.substring(1);
      const u = registeredUsers?.find(usr => usr.username.toLowerCase() === username.toLowerCase());
      if (u) {
        return {
          id: pId,
          name: u.name,
          gender: u.gender,
          class: u.class
        };
      }
      return {
        id: pId,
        name: pId,
        gender: 'Male', // Default fallback
        class: 'B'
      };
    } else if (pId.startsWith('manual:')) {
      return {
        id: pId,
        name: pId.substring(7),
        gender: '' as any, // No gender validation for manual
        class: '' as any // No class validation for manual
      };
    } else {
      return roster.find(p => p.id === pId) || null;
    }
  };

  // 2. Validate individual slots
  activeMatch.lineup.forEach(slot => {
    const lineDef = activeFormat.lines.find(l => l.id === slot.lineId);
    if (!lineDef) return;

    const players = slot.playerIds
      .map(getPlayerDetails)
      .filter(Boolean) as Player[];

    // Check duplicate booking in the same slot
    const seen = new Set<string>();
    slot.playerIds.forEach(pId => {
      if (pId) {
        if (seen.has(pId)) {
          const playerObj = getPlayerDetails(pId);
          errors.push({
            lineId: slot.lineId,
            type: 'error',
            message: `Duplicate: ${playerObj?.name || pId} is added multiple times in this match.`
          });
        }
        seen.add(pId);
      }
    });

    // Check gender mismatches (only if gender is defined on the player)
    if (lineDef.genderReq === 'Male') {
      players.forEach(p => {
        if (p.gender && p.gender !== 'Male') {
          errors.push({
            lineId: slot.lineId,
            type: 'warning',
            message: `Gender Mismatch: ${p.name} is Female, but slot requires Male.`
          });
        }
      });
    } else if (lineDef.genderReq === 'Female') {
      players.forEach(p => {
        if (p.gender && p.gender !== 'Female') {
          errors.push({
            lineId: slot.lineId,
            type: 'warning',
            message: `Gender Mismatch: ${p.name} is Male, but slot requires Female.`
          });
        }
      });
    } else if (lineDef.genderReq === 'Mixed') {
      if (players.length === 2) {
        const withGender = players.filter(p => p.gender);
        if (withGender.length === 2) {
          const males = withGender.filter(p => p.gender === 'Male');
          const females = withGender.filter(p => p.gender === 'Female');
          if (males.length !== 1 || females.length !== 1) {
            errors.push({
              lineId: slot.lineId,
              type: 'warning',
              message: `Gender Mismatch: Mixed Doubles requires 1 Male and 1 Female player.`
            });
          }
        }
      }
    }

    // Check class mismatches (only if class is defined on the player)
    if (lineDef.classReq) {
      players.forEach(p => {
        if (p.class && p.class !== lineDef.classReq) {
          errors.push({
            lineId: slot.lineId,
            type: 'info',
            message: `Class Notice: ${p.name} is Class ${p.class}, slot expects Class ${lineDef.classReq}.`
          });
        }
      });
    }
  });

  // 3. Validate over-participation (> 2 matches)
  Object.entries(playerCounts).forEach(([pId, count]) => {
    if (count > 2) {
      const playerObj = getPlayerDetails(pId);
      errors.push({
        lineId: 'global',
        type: 'error',
        message: `Over-participation: ${playerObj?.name || pId} is in ${count} matches (max 2 matches).`
      });
    }
  });

  return { errors, playerCounts };
}


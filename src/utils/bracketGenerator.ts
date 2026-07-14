/**
 * Standard utility to get round names based on the number of teams
 * participating in that round (NOT total tournament teams).
 *
 * Convention (used by FIFA, UEFA, etc.):
 *   2  teams → Final        (1 match)
 *   4  teams → Semi-Final   (2 matches)
 *   8  teams → Quarter-Final(4 matches)
 *  16  teams → Round of 16  (8 matches)
 *  32  teams → Round of 32  (16 matches)
 *  64  teams → Round of 64  (32 matches)
 * 128  teams → Round of 128 (64 matches)
 *
 * For non-power-of-2 preliminary rounds, a qualifying label is used.
 */
const getStandardRoundName = (teamsInThisRound) => {
    const roundNames = {
        2:   'Final',
        4:   'Semi-Final',
        8:   'Quarter-Final',
        16:  'Round of 16',
        32:  'Round of 32',
        64:  'Round of 64',
        128: 'Round of 128',
    };
    return roundNames[teamsInThisRound] || `Round of ${teamsInThisRound}`;
};

/**
 * Generates a knockout match structure for any number of teams N.
 * Supports actual team names and manager info.
 */
export const generateKnockoutMatches = (n, tournamentName, tournamentId, startDate, actualTeams = []) => {
    if (n < 2) return [];

    const getTName = (idx) => {
        const team = actualTeams[idx];
        return team?.name || team || `Team ${idx + 1}`;
    };
    const getMName = (idx) => {
        const team = actualTeams[idx];
        return team?.manager || '';
    };

    let powerOf2 = 2;
    while (powerOf2 * 2 <= n) powerOf2 *= 2;

    const matches = [];
    const playInCount = n - powerOf2;
    let teamCounter = 0; // Index for actualTeams

    // Phase 1: Play-in Round
    if (playInCount > 0) {
        // Instead of "Preliminary", use the actual technical round name (e.g. Round of 16 for an 8-slot bracket base)
        const subRoundName = getStandardRoundName(powerOf2 * 2);

        for (let i = 0; i < playInCount; i++) {
            const idxA = teamCounter++;
            const idxB = teamCounter++;
            matches.push({
                teamA: getTName(idxA),
                teamB: getTName(idxB),
                managerA: getMName(idxA),
                managerB: getMName(idxB),
                round: subRoundName,
                roundOrder: 0,
                matchOrder: i,
                isPlaceholder: false
            });
        }
    }

    // Phase 2: Main Bracket
    let currentTeams = powerOf2;
    let roundLevel = 1;

    while (currentTeams >= 2) {
        const rName = getStandardRoundName(currentTeams);
        const matchCount = currentTeams / 2;

        for (let i = 0; i < matchCount; i++) {
            let tA = 'TBD';
            let tB = 'TBD';
            let mA = '';
            let mB = '';

            if (currentTeams === powerOf2) {
                if (teamCounter < n) {
                    tA = getTName(teamCounter);
                    mA = getMName(teamCounter++);
                }
                if (teamCounter < n) {
                    tB = getTName(teamCounter);
                    mB = getMName(teamCounter++);
                }
            }

            matches.push({
                teamA: tA,
                teamB: tB,
                managerA: mA,
                managerB: mB,
                round: rName,
                roundOrder: rName === 'Final' ? 99 : roundLevel,
                matchOrder: i,
                isPlaceholder: (tA === 'TBD' || tB === 'TBD')
            });
        }

        currentTeams /= 2;
        roundLevel++;
    }

    return matches.map(m => ({
        ...m,
        competition: tournamentName,
        tournamentId: tournamentId,
        date: startDate || new Date().toISOString().split('T')[0],
        time: '12:00', scoreA: 0, scoreB: 0, status: 'scheduled', currentMinute: 0
    }));
};

/**
 * Generates a 2-Pool (Group Stage) + Knockout match structure.
 */
export const generatePoolMatches = (n, tournamentName, tournamentId, startDate, actualTeams = []) => {
    if (n < 4) return [];

    const matches = [];
    const poolACount = Math.ceil(n / 2);
    const poolBCount = n - poolACount;

    const allTeams = Array.from({ length: n }, (_, i) => ({
        name: actualTeams[i]?.name || actualTeams[i] || `Team ${i + 1}`,
        manager: actualTeams[i]?.manager || ''
    }));

    const poolATeams = allTeams.slice(0, poolACount);
    const poolBTeams = allTeams.slice(poolACount);

    // Pool A round-robin
    let mOrder = 0;
    for (let i = 0; i < poolATeams.length; i++) {
        for (let j = i + 1; j < poolATeams.length; j++) {
            matches.push({
                teamA: poolATeams[i].name,
                teamB: poolATeams[j].name,
                managerA: poolATeams[i].manager,
                managerB: poolATeams[j].manager,
                round: 'Pool A',
                pool: 'A',
                roundOrder: 1,
                matchOrder: mOrder++,
                isPlaceholder: false
            });
        }
    }

    // Pool B round-robin
    mOrder = 0;
    for (let i = 0; i < poolBTeams.length; i++) {
        for (let j = i + 1; j < poolBTeams.length; j++) {
            matches.push({
                teamA: poolBTeams[i].name,
                teamB: poolBTeams[j].name,
                managerA: poolBTeams[i].manager,
                managerB: poolBTeams[j].manager,
                round: 'Pool B',
                pool: 'B',
                roundOrder: 1,
                matchOrder: mOrder++,
                isPlaceholder: false
            });
        }
    }

    // Semi-Finals
    matches.push({ teamA: 'Winner Pool A', teamB: 'Runner-up Pool B', round: 'Semi-Final', roundOrder: 2, matchOrder: 0, isPlaceholder: true });
    matches.push({ teamA: 'Winner Pool B', teamB: 'Runner-up Pool A', round: 'Semi-Final', roundOrder: 2, matchOrder: 1, isPlaceholder: true });

    // Final
    matches.push({ teamA: 'TBD', teamB: 'TBD', round: 'Final', roundOrder: 99, matchOrder: 0, isPlaceholder: true });

    return matches.map(m => ({
        ...m,
        competition: tournamentName,
        tournamentId: tournamentId,
        date: startDate || new Date().toISOString().split('T')[0],
        time: '12:00', scoreA: 0, scoreB: 0, status: 'scheduled', currentMinute: 0
    }));
};

/**
 * Utility to calculate total matches for a given tournament type.
 */
export const calcMatchesCount = (n, type) => {
    const num = Number(n);
    if (!num || num < 2) return 0;

    switch (type) {
        case 'league':
            return (num * (num - 1)) / 2;
        case 'knockout':
            return num - 1;
        case 'pool':
            const nA = Math.ceil(num / 2), nB = num - nA;
            return (nA * (nA - 1) / 2) + (nB * (nB - 1) / 2) + 3;
        case 'dual_knockout':
            return num - 1;
        default:
            return 0;
    }
};

/**
 * Generates a full League (Round Robin) match structure.
 */
export const generateLeagueMatches = (n, tournamentName, tournamentId, startDate, actualTeams = []) => {
    if (n < 2) return [];

    const matches = [];
    const teamsList = Array.from({ length: n }, (_, i) => {
        return actualTeams[i]?.name || actualTeams[i] || `Team ${i + 1}`;
    });

    let mOrder = 0;
    for (let i = 0; i < teamsList.length; i++) {
        for (let j = i + 1; j < teamsList.length; j++) {
            const teamA = teamsList[i];
            const teamB = teamsList[j];
            const managerA = actualTeams[i]?.manager || '';
            const managerB = actualTeams[j]?.manager || '';

            matches.push({
                teamA,
                teamB,
                managerA,
                managerB,
                round: 'League',
                roundOrder: 1,
                matchOrder: mOrder++,
                isPlaceholder: false
            });
        }
    }

    return matches.map(m => ({
        ...m,
        competition: tournamentName,
        tournamentId: tournamentId,
        date: startDate || new Date().toISOString().split('T')[0],
        time: '12:00', scoreA: 0, scoreB: 0, status: 'scheduled', currentMinute: 0
    }));
};
/**
 * Shift a pool's internal round name up by one level.
 * Because the Grand Final sits above each pool's bracket,
 * the pool's "Final" is really a Semi-Final, etc.
 */
const shiftRoundUp = (poolRoundName) => {
    const shiftMap = {
        'Final':          'Semi-Final',
        'Semi-Final':     'Quarter-Final',
        'Quarter-Final':  'Round of 16',
        'Round of 16':    'Round of 32',
        'Round of 32':    'Round of 64',
        'Round of 64':    'Round of 128',
    };
    if (poolRoundName.toLowerCase().includes('preliminary')) return poolRoundName;
    return shiftMap[poolRoundName] || poolRoundName;
};

/**
 * Recalculate roundOrder after shifting names.
 */
const getRoundOrder = (roundName) => {
    const orderMap = {
        'Preliminary': 0,
        'Round of 128': 1,
        'Round of 64': 2,
        'Round of 32': 3,
        'Round of 16': 4,
        'Quarter-Final': 5,
        'Semi-Final': 6,
        'Final': 99,
    };
    return orderMap[roundName] ?? 3;
};

/**
 * Generates a dual-pool knockout structure (Left Wing vs Right Wing).
 * Round names use the standard convention for the OVERALL tournament,
 * not per-pool (e.g. pool's "Final" becomes "Semi-Final").
 */
export const generateDualKnockoutMatches = (n, tournamentName, tournamentId, startDate, actualTeams = []) => {
    if (n < 4) return [];

    const nA = Math.ceil(n / 2);
    const nB = n - nA;

    const poolA = actualTeams.slice(0, nA);
    const poolB = actualTeams.slice(nA);

    const wingA = generateKnockoutMatches(nA, tournamentName, tournamentId, startDate, poolA);
    const wingB = generateKnockoutMatches(nB, tournamentName, tournamentId, startDate, poolB);

    // Shift every pool round name UP by one level
    const merged = [
        ...wingA.map(m => {
            const newRound = shiftRoundUp(m.round);
            return { ...m, pool: 'A', round: newRound, roundOrder: getRoundOrder(newRound) };
        }),
        ...wingB.map(m => {
            const newRound = shiftRoundUp(m.round);
            return { ...m, pool: 'B', matchOrder: m.matchOrder + 100, round: newRound, roundOrder: getRoundOrder(newRound) };
        })
    ];

    // Grand Final (Winner A vs Winner B)
    merged.push({
        teamA: 'Winner Pool A',
        teamB: 'Winner Pool B',
        round: 'Final',
        roundOrder: 99,
        matchOrder: 0,
        isPlaceholder: true,
        competition: tournamentName,
        tournamentId: tournamentId,
        date: startDate || new Date().toISOString().split('T')[0],
        time: '12:00', scoreA: 0, scoreB: 0, status: 'scheduled', currentMinute: 0
    });

    return merged;
};

export const calcPoolMatchesCount = (n) => {
    if (n < 4) return 0;
    const nA = Math.ceil(n / 2), nB = n - nA;
    return (nA * (nA - 1) / 2) + (nB * (nB - 1) / 2) + 3;
};

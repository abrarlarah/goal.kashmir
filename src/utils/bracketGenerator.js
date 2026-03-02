/**
 * Standard utility to get round names based on the number of teams participating in that stage.
 * @param {number} teamsCount 
 * @returns {string}
 */
const getStandardRoundName = (teamsCount) => {
    if (teamsCount <= 2) return 'Final';
    if (teamsCount <= 4) return 'Semi-Final';
    if (teamsCount <= 8) return 'Quarter-Final';
    if (teamsCount <= 16) return 'Round of 16';
    if (teamsCount <= 32) return 'Round of 32';
    if (teamsCount <= 64) return 'Round of 64';
    return `Round of ${teamsCount}`;
};

/**
 * Generates a knockout match structure for any number of teams N.
 */
export const generateKnockoutMatches = (n, tournamentName, tournamentId, startDate) => {
    if (n < 2) return [];

    let powerOf2 = 2;
    while (powerOf2 * 2 <= n) powerOf2 *= 2;

    const matches = [];
    const playInCount = n - powerOf2;
    let teamCounter = 1;

    // Phase 1: Play-in Round
    if (playInCount > 0) {
        const nextRoundTeams = powerOf2;
        const subRoundName = `Preliminary / ${getStandardRoundName(nextRoundTeams)}`;

        for (let i = 0; i < playInCount; i++) {
            matches.push({
                teamA: `Team ${teamCounter++}`,
                teamB: `Team ${teamCounter++}`,
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

            // Initial seeding for the first full round
            if (currentTeams === powerOf2) {
                if (teamCounter <= n) tA = `Team ${teamCounter++}`;
                if (teamCounter <= n) tB = `Team ${teamCounter++}`;
            }

            matches.push({
                teamA: tA,
                teamB: tB,
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
export const generatePoolMatches = (n, tournamentName, tournamentId, startDate) => {
    if (n < 4) return [];

    const matches = [];
    const poolACount = Math.ceil(n / 2);
    const poolBCount = n - poolACount;

    const poolATeams = Array.from({ length: poolACount }, (_, i) => `Team ${i + 1}`);
    const poolBTeams = Array.from({ length: poolBCount }, (_, i) => `Team ${poolACount + i + 1}`);

    // Pool A round-robin
    let mOrder = 0;
    for (let i = 0; i < poolATeams.length; i++) {
        for (let j = i + 1; j < poolATeams.length; j++) {
            matches.push({ teamA: poolATeams[i], teamB: poolATeams[j], round: 'Pool A', pool: 'A', roundOrder: 1, matchOrder: mOrder++, isPlaceholder: false });
        }
    }

    // Pool B round-robin
    mOrder = 0;
    for (let i = 0; i < poolBTeams.length; i++) {
        for (let j = i + 1; j < poolBTeams.length; j++) {
            matches.push({ teamA: poolBTeams[i], teamB: poolBTeams[j], round: 'Pool B', pool: 'B', roundOrder: 1, matchOrder: mOrder++, isPlaceholder: false });
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

export const calcPoolMatchesCount = (n) => {
    if (n < 4) return 0;
    const nA = Math.ceil(n / 2), nB = n - nA;
    return (nA * (nA - 1) / 2) + (nB * (nB - 1) / 2) + 3;
};

/**
 * Generates a dual-pool knockout structure (Left Wing vs Right Wing).
 */
export const generateDualKnockoutMatches = (n, tournamentName, tournamentId, startDate) => {
    if (n < 4) return [];

    const matches = [];
    const poolACount = Math.ceil(n / 2);
    const poolBCount = n - poolACount;

    const generateWing = (teamCount, poolLabel) => {
        const wingMatches = [];
        let powerOf2 = 2;
        while (powerOf2 * 2 <= teamCount) powerOf2 *= 2;

        const playInCount = teamCount - powerOf2;
        let teamCounter = 1;

        // Wing Phase 1: Play-in
        if (playInCount > 0) {
            for (let i = 0; i < playInCount; i++) {
                wingMatches.push({
                    teamA: `Team ${poolLabel}-${teamCounter++}`,
                    teamB: `Team ${poolLabel}-${teamCounter++}`,
                    round: `Preliminary`,
                    pool: poolLabel, roundOrder: 0, matchOrder: i, isPlaceholder: false
                });
            }
        }

        // Wing Phase 2: Knockout Tree
        let wingTeams = powerOf2;
        let roundLevel = 1;

        while (wingTeams >= 2) {
            const matchCount = wingTeams / 2;
            // Name relative to the WHOLE tournament (e.g. 2 matches in wing = 4 total = Semi-Final)
            const globalTeamsAtThisStage = wingTeams * 2;
            const rName = getStandardRoundName(globalTeamsAtThisStage);

            for (let i = 0; i < matchCount; i++) {
                let tA = 'TBD', tB = 'TBD';
                if (wingTeams === powerOf2) {
                    if (teamCounter <= teamCount) tA = `Team ${poolLabel}-${teamCounter++}`;
                    if (teamCounter <= teamCount) tB = `Team ${poolLabel}-${teamCounter++}`;
                }

                wingMatches.push({
                    teamA: tA, teamB: tB, round: rName, pool: poolLabel,
                    roundOrder: rName === 'Final' ? 99 : roundLevel,
                    matchOrder: poolLabel === 'A' ? i : i + 100, // Offset matchOrder for wing separation if needed
                    isPlaceholder: (tA === 'TBD' || tB === 'TBD')
                });
            }
            wingTeams /= 2;
            roundLevel++;
        }
        return wingMatches;
    };

    matches.push(...generateWing(poolACount, 'A'));
    matches.push(...generateWing(poolBCount, 'B'));

    // The Grand Final - ensuring it's unique
    const hasFinal = matches.some(m => m.round === 'Final');
    if (!hasFinal) {
        matches.push({
            teamA: 'Winner Pool A', teamB: 'Winner Pool B',
            round: 'Final', roundOrder: 99, matchOrder: 0, isPlaceholder: true
        });
    }

    return matches.map(m => ({
        ...m,
        competition: tournamentName,
        tournamentId: tournamentId,
        date: startDate || new Date().toISOString().split('T')[0],
        time: '12:00', scoreA: 0, scoreB: 0, status: 'scheduled', currentMinute: 0
    }));
};

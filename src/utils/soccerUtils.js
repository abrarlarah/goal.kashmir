export const calculateStandings = (teams, matches, selectedCompetition = 'All') => {
    if (!teams || teams.length === 0) return [];

    // Initialize stats map from teams
    // Initialize stats map from teams
    const stats = {};
    teams
        .filter(team => {
            if (!selectedCompetition || selectedCompetition === 'All') return true;
            // Handle both Array (new format) and String (old format) for tournaments
            const teamTournaments = Array.isArray(team.tournaments)
                ? team.tournaments
                : (typeof team.tournaments === 'string' ? team.tournaments.split(',').map(t => t.trim()) : []);
            return teamTournaments.includes(selectedCompetition);
        })
        .forEach(team => {
            stats[team.name] = {
                id: team.id,
                name: team.name,
                shortName: team.shortName || team.name.substring(0, 3).toUpperCase(),
                played: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                points: 0,
                form: []
            };
        });

    // Filter Matches
    const filteredMatches = matches.filter(m =>
        (selectedCompetition === 'All' || !selectedCompetition || m.competition === selectedCompetition) &&
        (m.status === 'finished')
    );

    filteredMatches.forEach(match => {
        // Find teams by name (assuming names are unique keys in matches)
        const teamA = stats[match.teamA];
        const teamB = stats[match.teamB];

        if (!teamA || !teamB) return; // Team not found

        // Update Played
        teamA.played++;
        teamB.played++;

        // Update Goals
        const gA = Number(match.scoreA);
        const gB = Number(match.scoreB);

        teamA.goalsFor += gA;
        teamA.goalsAgainst += gB;
        teamB.goalsFor += gB;
        teamB.goalsAgainst += gA;

        // Update Result
        if (gA > gB) {
            teamA.wins++;
            teamA.points += 3;
            teamB.losses++;
            teamA.form.push('W');
            teamB.form.push('L');
        } else if (gA < gB) {
            teamB.wins++;
            teamB.points += 3;
            teamA.losses++;
            teamB.form.push('W');
            teamA.form.push('L');
        } else {
            teamA.draws++;
            teamB.draws++;
            teamA.points += 1;
            teamB.points += 1;
            teamA.form.push('D');
            teamB.form.push('D');
        }
    });

    // Convert to array and sort
    return Object.values(stats).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const gdA = a.goalsFor - a.goalsAgainst;
        const gdB = b.goalsFor - b.goalsAgainst;
        if (gdB !== gdA) return gdB - gdA;
        return b.goalsFor - a.goalsFor;
    });
};

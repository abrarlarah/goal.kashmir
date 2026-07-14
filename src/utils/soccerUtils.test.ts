import { describe, it, expect } from 'vitest';
import { calculateStandings } from './soccerUtils';
import { Match, Team } from '../types';

describe('soccerUtils - calculateStandings', () => {
    it('should correctly calculate points, wins, and goal differences for finished matches', () => {
        const teams: Team[] = [
            { id: 'team1', name: 'Team A', shortName: 'TA', status: 'Active' },
            { id: 'team2', name: 'Team B', shortName: 'TB', status: 'Active' },
        ];

        const matches: Match[] = [
            {
                id: 'm1',
                teamA: 'Team A',
                teamB: 'Team B',
                scoreA: 2,
                scoreB: 1,
                status: 'finished',
                tournamentId: 't1'
            }
        ];

        const standings = calculateStandings(teams, matches);
        
        expect(standings.length).toBe(2);
        
        const team1Stats = standings.find(s => s.id === 'team1');
        const team2Stats = standings.find(s => s.id === 'team2');
        
        expect(team1Stats?.points).toBe(3); // Win
        expect(team1Stats?.goalsFor).toBe(2);
        expect(team1Stats?.goalsAgainst).toBe(1);
        expect(team1Stats?.points).toBe(3);

        expect(team2Stats?.points).toBe(0); // Loss
        expect(team2Stats?.goalsFor).toBe(1);
        expect(team2Stats?.goalsAgainst).toBe(2);
    });

    it('should handle draws correctly', () => {
        const teams: Team[] = [
            { id: 'team1', name: 'Team A', shortName: 'TA', status: 'Active' },
            { id: 'team2', name: 'Team B', shortName: 'TB', status: 'Active' },
        ];

        const matches: Match[] = [
            {
                id: 'm1',
                teamA: 'Team A',
                teamB: 'Team B',
                scoreA: 1,
                scoreB: 1,
                status: 'finished',
                tournamentId: 't1'
            }
        ];

        const standings = calculateStandings(teams, matches);
        
        const team1Stats = standings.find(s => s.id === 'team1');
        const team2Stats = standings.find(s => s.id === 'team2');
        
        expect(team1Stats?.points).toBe(1); // Draw
        expect(team1Stats?.draws).toBe(1);
        
        expect(team2Stats?.points).toBe(1); // Draw
        expect(team2Stats?.draws).toBe(1);
    });
    
    it('should ignore scheduled or live matches', () => {
        const teams: Team[] = [
            { id: 'team1', name: 'Team A', shortName: 'TA', status: 'Active' },
            { id: 'team2', name: 'Team B', shortName: 'TB', status: 'Active' },
        ];

        const matches: Match[] = [
            {
                id: 'm1',
                teamA: 'Team A',
                teamB: 'Team B',
                scoreA: 2,
                scoreB: 0,
                status: 'live', // Not finished!
                tournamentId: 't1'
            }
        ];

        const standings = calculateStandings(teams, matches);
        
        const team1Stats = standings.find(s => s.id === 'team1');
        expect(team1Stats?.points).toBe(0);
        expect(team1Stats?.played).toBe(0);
    });
});

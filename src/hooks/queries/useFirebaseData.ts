import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Team, Player, Match, Tournament, Lineup } from '../../types';

// Generic fetch function for collections with enterprise scaling limits
const fetchCollection = async <T>(collectionName: string, maxLimit: number = 500): Promise<T[]> => {
    // We limit reads to prevent astronomical billing if the database grows huge
    const q = query(collection(db, collectionName), limit(maxLimit));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
};

export const useTeams = () => {
    return useQuery({
        queryKey: ['teams'],
        queryFn: () => fetchCollection<Team>('teams', 100), // Cap at 100 teams for initial load
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

export const usePlayers = () => {
    return useQuery({
        queryKey: ['players'],
        queryFn: () => fetchCollection<Player>('players', 300), // Cap at 300 players
        staleTime: 1000 * 60 * 5,
    });
};

export const useMatches = () => {
    return useQuery({
        queryKey: ['matches'],
        queryFn: () => fetchCollection<Match>('matches', 200), // Cap at 200 recent matches
        staleTime: 1000 * 60, // 1 minute for faster match updates
    });
};

export const useTournaments = () => {
    return useQuery({
        queryKey: ['tournaments'],
        queryFn: () => fetchCollection<Tournament>('tournaments', 20),
        staleTime: 1000 * 60 * 60, // 1 hour (tournaments rarely change)
    });
};

export const useLineups = () => {
    return useQuery({
        queryKey: ['lineups'],
        queryFn: () => fetchCollection<Lineup>('lineups', 200),
        staleTime: 1000 * 60 * 5,
    });
};

export const useAllData = () => {
    const teams = useTeams();
    const players = usePlayers();
    const matches = useMatches();
    const tournaments = useTournaments();
    const lineups = useLineups();

    const isLoading = teams.isLoading || players.isLoading || matches.isLoading || tournaments.isLoading || lineups.isLoading;

    return {
        teams: teams.data || [],
        players: players.data || [],
        matches: matches.data || [],
        tournaments: tournaments.data || [],
        lineups: lineups.data || [],
        loading: isLoading
    };
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Team, Player, Match, Tournament, Lineup } from '../../types';

// Generic fetch function for collections
const fetchCollection = async <T>(collectionName: string): Promise<T[]> => {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
};

export const useTeams = () => {
    return useQuery({
        queryKey: ['teams'],
        queryFn: () => fetchCollection<Team>('teams'),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

export const usePlayers = () => {
    return useQuery({
        queryKey: ['players'],
        queryFn: () => fetchCollection<Player>('players'),
        staleTime: 1000 * 60 * 5,
    });
};

export const useMatches = () => {
    return useQuery({
        queryKey: ['matches'],
        queryFn: () => fetchCollection<Match>('matches'),
        staleTime: 1000 * 60, // 1 minute for faster match updates
    });
};

export const useTournaments = () => {
    return useQuery({
        queryKey: ['tournaments'],
        queryFn: () => fetchCollection<Tournament>('tournaments'),
        staleTime: 1000 * 60 * 60, // 1 hour (tournaments rarely change)
    });
};

export const useLineups = () => {
    return useQuery({
        queryKey: ['lineups'],
        queryFn: () => fetchCollection<Lineup>('lineups'),
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

import React, { createContext, useContext, ReactNode } from 'react';
import { Team, Player, Match, Tournament, Lineup } from '../types';
import { useAllData } from '../hooks/queries/useFirebaseData';

interface DataContextType {
    teams: Team[];
    players: Player[];
    matches: Match[];
    tournaments: Tournament[];
    lineups: Lineup[];
    loading: boolean;
}

const DataContext = createContext<DataContextType>({
    teams: [],
    players: [],
    matches: [],
    tournaments: [],
    lineups: [],
    loading: true
});

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const data = useAllData();

    return (
        <DataContext.Provider value={data}>
            {children}
        </DataContext.Provider>
    );
};

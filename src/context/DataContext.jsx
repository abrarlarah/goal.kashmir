import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);
    const [matches, setMatches] = useState([]);
    const [tournaments, setTournaments] = useState([]);
    const [lineups, setLineups] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);

        let loaded = {
            teams: false,
            players: false,
            matches: false,
            tournaments: false,
            lineups: false
        };

        const checkAllLoaded = () => {
            if (loaded.teams && loaded.players && loaded.matches && loaded.tournaments && loaded.lineups) {
                setLoading(false);
            }
        };

        // Real-time listeners for all main collections
        const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
            setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            loaded.teams = true;
            checkAllLoaded();
        }, (error) => {
            console.error("Error fetching teams (likely permission denied):", error);
        });

        const unsubPlayers = onSnapshot(collection(db, 'players'), (snapshot) => {
            setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            loaded.players = true;
            checkAllLoaded();
        }, (error) => {
            console.error("Error fetching players:", error);
        });

        const unsubMatches = onSnapshot(collection(db, 'matches'), (snapshot) => {
            setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            loaded.matches = true;
            checkAllLoaded();
        }, (error) => {
            console.error("Error fetching matches:", error);
        });

        const unsubTournaments = onSnapshot(collection(db, 'tournaments'), (snapshot) => {
            setTournaments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            loaded.tournaments = true;
            checkAllLoaded();
        }, (error) => {
            console.error("Error fetching tournaments:", error);
        });

        const unsubLineups = onSnapshot(collection(db, 'lineups'), (snapshot) => {
            setLineups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            loaded.lineups = true;
            checkAllLoaded();
        }, (error) => {
            console.error("Error fetching lineups:", error);
            loaded.lineups = true; // Don't block if lineups fail
            checkAllLoaded();
        });

        // Safety timeout in case streams stall (clean up loading state after 5s if still hanging)
        const timeoutId = setTimeout(() => {
            setLoading(false);
        }, 5000);

        return () => {
            clearTimeout(timeoutId);
            unsubTeams();
            unsubPlayers();
            unsubMatches();
            unsubTournaments();
            unsubLineups();
        };
    }, []);

    const value = {
        teams,
        players,
        matches,
        tournaments,
        lineups,
        loading
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

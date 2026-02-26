import React, { useState, useEffect } from 'react';

const MatchTimer = ({ match, showSeconds = true }) => {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        const calculateSeconds = () => {
            const baseSeconds = match.elapsedSeconds !== undefined ? match.elapsedSeconds : (match.currentMinute || 0) * 60;
            if (match.status === 'live' && match.timerRunning && match.timerLastStarted) {
                const elapsedMs = Date.now() - match.timerLastStarted;
                return baseSeconds + Math.floor(elapsedMs / 1000);
            }
            return baseSeconds;
        };

        setSeconds(calculateSeconds());
        const interval = setInterval(() => {
            setSeconds(calculateSeconds());
        }, 1000);

        return () => clearInterval(interval);
    }, [match]);

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (!showSeconds) {
        return <span>{mins}'</span>;
    }

    return <span>{mins}:{secs.toString().padStart(2, '0')}</span>;
};

export default MatchTimer;

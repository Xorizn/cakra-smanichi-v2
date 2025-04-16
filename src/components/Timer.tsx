'use client'

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  initialDuration: number; // Duration in seconds
  onTimeUp: () => void; // Callback when time is up
}

const Timer: React.FC<TimerProps> = ({ initialDuration, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(initialDuration);

  useEffect(() => {
    // Exit early if time is already up or less
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    // Set up the interval
    const intervalId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    // Clear interval on component unmount or when time is up
    return () => clearInterval(intervalId);
  }, [timeLeft, onTimeUp]);

  // Format time left into HH:MM:SS or MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (hours > 0) {
      parts.push(hours.toString().padStart(2, '0'));
    }
    parts.push(minutes.toString().padStart(2, '0'));
    parts.push(secs.toString().padStart(2, '0'));

    return parts.join(':');
  };

  return (
    <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
      <Clock className="h-4 w-4" />
      <span>{formatTime(timeLeft)}</span>
    </div>
  );
};

export default Timer;

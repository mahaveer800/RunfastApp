import { useState, useEffect, useRef } from 'react';
import { calculateDistance } from '../utils/distance';
import { calculatePace } from '../utils/pace';

export const useRunning = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [distance, setDistance] = useState(0);
  const [pace, setPace] = useState("0:00");
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  
  const timerRef = useRef(null);
  const lastPositionRef = useRef(null);

  // Timer Control
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  // Update Pace when distance or time changes
  useEffect(() => {
    setPace(calculatePace(distance, seconds));
  }, [distance, seconds]);

  const startRun = () => {
    setIsRunning(true);
    setSeconds(0);
    setDistance(0);
    setRouteCoordinates([]);
    lastPositionRef.current = null;
  };

  const updateLocation = (newLat, newLon) => {
    if (!isRunning) return;

    const newPoint = { latitude: newLat, longitude: newLon };
    setRouteCoordinates((prev) => [...prev, newPoint]);

    if (lastPositionRef.current) {
      const distDelta = calculateDistance(
        lastPositionRef.current.latitude,
        lastPositionRef.current.longitude,
        newLat,
        newLon
      );
      setDistance((prev) => prev + distDelta);
    }
    lastPositionRef.current = newPoint;
  };

  const stopRun = () => {
    setIsRunning(false);
    clearInterval(timerRef.current);
    return {
      duration: seconds,
      distance: distance,
      pace: pace,
      route: routeCoordinates,
      date: new Date().toISOString(),
    };
  };

  return {
    isRunning,
    seconds,
    distance,
    pace,
    routeCoordinates,
    startRun,
    stopRun,
    updateLocation,
  };
};
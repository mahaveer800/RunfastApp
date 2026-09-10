// import { useState, useEffect, useRef } from 'react';
// import { calculateDistance } from '../utils/distance';
// import { calculatePace } from '../utils/pace';

// export const useRunning = () => {
//   const [isRunning, setIsRunning] = useState(false);
//   const [seconds, setSeconds] = useState(0);
//   const [distance, setDistance] = useState(0);
//   const [pace, setPace] = useState("0:00");
//   const [routeCoordinates, setRouteCoordinates] = useState([]);
  
//   const timerRef = useRef(null);
//   const lastPositionRef = useRef(null);

//   // Timer Control
//   useEffect(() => {
//     if (isRunning) {
//       timerRef.current = setInterval(() => {
//         setSeconds((prev) => prev + 1);
//       }, 1000);
//     } else {
//       clearInterval(timerRef.current);
//     }
//     return () => clearInterval(timerRef.current);
//   }, [isRunning]);

//   // Update Pace when distance or time changes
//   useEffect(() => {
//     setPace(calculatePace(distance, seconds));
//   }, [distance, seconds]);

//   const startRun = () => {
//     setIsRunning(true);
//     setSeconds(0);
//     setDistance(0);
//     setRouteCoordinates([]);
//     lastPositionRef.current = null;
//   };

//   const updateLocation = (newLat, newLon) => {
//     if (!isRunning) return;

//     const newPoint = { latitude: newLat, longitude: newLon };
//     setRouteCoordinates((prev) => [...prev, newPoint]);

//     if (lastPositionRef.current) {
//       const distDelta = calculateDistance(
//         lastPositionRef.current.latitude,
//         lastPositionRef.current.longitude,
//         newLat,
//         newLon
//       );
//       setDistance((prev) => prev + distDelta);
//     }
//     lastPositionRef.current = newPoint;
//   };

//   const stopRun = () => {
//     setIsRunning(false);
//     clearInterval(timerRef.current);
//     return {
//       duration: seconds,
//       distance: distance,
//       pace: pace,
//       route: routeCoordinates,
//       date: new Date().toISOString(),
//     };
//   };

//   return {
//     isRunning,
//     seconds,
//     distance,
//     pace,
//     routeCoordinates,
//     startRun,
//     stopRun,
//     updateLocation,
//   };
// };





// import {useEffect, useRef, useState} from 'react';
// import {
//   NativeModules,
//   NativeEventEmitter,
//   PermissionsAndroid,
//   Platform,
// } from 'react-native';

// import {calculatePace} from '../utils/pace';

// const {RunTracking} = NativeModules;

// export const useRunning = () => {
//   const [isRunning, setIsRunning] = useState(false);
//   const [seconds, setSeconds] = useState(0);
//   const [distance, setDistance] = useState(0);
//   const [speed, setSpeed] = useState(0);
//   const [pace, setPace] = useState('0:00');
//   const [routeCoordinates, setRouteCoordinates] = useState([]);

//   const startTimeRef = useRef(null);

//   useEffect(() => {
//     if (Platform.OS !== 'android') {
//       return;
//     }

//     const emitter =
//       new NativeEventEmitter(RunTracking);

//     const subscription =
//       emitter.addListener(
//         'RunTrackingUpdate',
//         data => {

//           setSeconds(
//             Number(data.duration || 0)
//           );

//           setDistance(
//             Number(data.distance || 0)
//           );

//           setSpeed(
//             Number(data.speed || 0)
//           );

//           if (
//             data.latitude !== undefined &&
//             data.longitude !== undefined
//           ) {
//             setRouteCoordinates(prev => [
//               ...prev,
//               {
//                 latitude: data.latitude,
//                 longitude: data.longitude,
//               },
//             ]);
//           }

//           setPace(
//             calculatePace(
//               Number(data.distance || 0),
//               Number(data.duration || 0)
//             )
//           );
//         }
//       );

//     return () => {
//       subscription.remove();
//     };
//   }, []);

//   const requestLocationPermission = async () => {

//     if (Platform.OS !== 'android') {
//       return true;
//     }

//     const fine =
//       await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
//       );

//     const coarse =
//       await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
//       );

//     return (
//       fine === PermissionsAndroid.RESULTS.GRANTED ||
//       coarse === PermissionsAndroid.RESULTS.GRANTED
//     );
//   };

//   const startRun = async () => {

//     const permission =
//       await requestLocationPermission();

//     if (!permission) {
//       throw new Error(
//         'Location permission is required'
//       );
//     }

//     setSeconds(0);
//     setDistance(0);
//     setSpeed(0);
//     setPace('0:00');
//     setRouteCoordinates([]);

//     startTimeRef.current = Date.now();

//     RunTracking.startRun();

//     setIsRunning(true);
//   };

//   const stopRun = async () => {

//     RunTracking.stopRun();

//     setIsRunning(false);

//     const result = {
//       duration: seconds,
//       distance,
//       speed,
//       pace,
//       route: routeCoordinates,
//       date: new Date().toISOString(),
//     };

//     return result;
//   };

//   return {
//     isRunning,
//     seconds,
//     distance,
//     speed,
//     pace,
//     routeCoordinates,

//     startRun,
//     stopRun,
//   };
// };





import {useEffect, useState} from 'react';
import {
  NativeModules,
  NativeEventEmitter,
  PermissionsAndroid,
  Platform,
} from 'react-native';

import {calculatePace} from '../utils/pace';

const {RunTracking} = NativeModules;

export const useRunning = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [pace, setPace] = useState('0:00');
  const [routeCoordinates, setRouteCoordinates] = useState([]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    if (!RunTracking) {
      console.error(
        'RunTracking native module not found. Check RunTrackingPackage registration.',
      );
      return;
    }

    const emitter = new NativeEventEmitter(RunTracking);

    const subscription = emitter.addListener(
      'RunTrackingUpdate',
      data => {
        const duration = Number(data?.duration || 0);
        const distanceValue = Number(data?.distance || 0);
        const speedValue = Number(data?.speed || 0);

        setSeconds(duration);
        setDistance(distanceValue);
        setSpeed(speedValue);

        setPace(
          calculatePace(
            distanceValue,
            duration,
          ),
        );

        if (
          typeof data?.latitude === 'number' &&
          typeof data?.longitude === 'number' &&
          (data.latitude !== 0 || data.longitude !== 0)
        ) {
          setRouteCoordinates(prev => [
            ...prev,
            {
              latitude: data.latitude,
              longitude: data.longitude,
            },
          ]);
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    // Location permission
    const locationResult = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'RunFast Location Permission',
        message:
          'RunFast needs precise location to track your running distance, speed and route.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );

    if (
      locationResult !== PermissionsAndroid.RESULTS.GRANTED
    ) {
      return false;
    }

    // Android 13+ notification permission
    if (Platform.Version >= 33) {
      const notificationResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'RunFast Notifications',
          message:
            'RunFast needs notification permission to show the active GPS tracking notification.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );

      // Notification denial should not prevent GPS tracking.
      console.log(
        'Notification permission:',
        notificationResult,
      );
    }

    return true;
  };

  const startRun = async () => {
    if (!RunTracking) {
      throw new Error(
        'RunTracking native module is not available.',
      );
    }

    const permission = await requestPermissions();

    if (!permission) {
      throw new Error(
        'Precise location permission is required to start a run.',
      );
    }

    // Reset UI
    setSeconds(0);
    setDistance(0);
    setSpeed(0);
    setPace('0:00');
    setRouteCoordinates([]);

    // Start native Android foreground service
    RunTracking.startRun();

    setIsRunning(true);
  };

  const stopRun = async () => {
    if (!RunTracking) {
      throw new Error(
        'RunTracking native module is not available.',
      );
    }

    // Stop native foreground service
    RunTracking.stopRun();

    setIsRunning(false);

    // Return latest state available to JS
    return {
      duration: seconds,
      distance,
      speed,
      pace,
      route: routeCoordinates,
      date: new Date().toISOString(),
    };
  };

  return {
    isRunning,
    seconds,
    distance,
    speed,
    pace,
    routeCoordinates,

    startRun,
    stopRun,
  };
};
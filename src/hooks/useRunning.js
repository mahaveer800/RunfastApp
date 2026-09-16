

// import {useEffect, useState} from 'react';
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

//   useEffect(() => {
//     if (Platform.OS !== 'android') {
//       return;
//     }

//     if (!RunTracking) {
//       console.error(
//         'RunTracking native module not found. Check RunTrackingPackage registration.',
//       );
//       return;
//     }

//     const emitter = new NativeEventEmitter(RunTracking);

//     const subscription = emitter.addListener(
//       'RunTrackingUpdate',
//       data => {
//         const duration = Number(data?.duration || 0);
//         const distanceValue = Number(data?.distance || 0);
//         const speedValue = Number(data?.speed || 0);

//         setSeconds(duration);
//         setDistance(distanceValue);
//         setSpeed(speedValue);

//         setPace(
//           calculatePace(
//             distanceValue,
//             duration,
//           ),
//         );

//         if (
//           typeof data?.latitude === 'number' &&
//           typeof data?.longitude === 'number' &&
//           (data.latitude !== 0 || data.longitude !== 0)
//         ) {
//           setRouteCoordinates(prev => [
//             ...prev,
//             {
//               latitude: data.latitude,
//               longitude: data.longitude,
//             },
//           ]);
//         }
//       },
//     );

//     return () => {
//       subscription.remove();
//     };
//   }, []);

//   const requestPermissions = async () => {
//     if (Platform.OS !== 'android') {
//       return true;
//     }

//     // Location permission
//     const locationResult = await PermissionsAndroid.request(
//       PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//       {
//         title: 'RunFast Location Permission',
//         message:
//           'RunFast needs precise location to track your running distance, speed and route.',
//         buttonPositive: 'Allow',
//         buttonNegative: 'Deny',
//       },
//     );

//     if (
//       locationResult !== PermissionsAndroid.RESULTS.GRANTED
//     ) {
//       return false;
//     }

//     // Android 13+ notification permission
//     if (Platform.Version >= 33) {
//       const notificationResult = await PermissionsAndroid.request(
//         PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
//         {
//           title: 'RunFast Notifications',
//           message:
//             'RunFast needs notification permission to show the active GPS tracking notification.',
//           buttonPositive: 'Allow',
//           buttonNegative: 'Deny',
//         },
//       );

//       // Notification denial should not prevent GPS tracking.
//       console.log(
//         'Notification permission:',
//         notificationResult,
//       );
//     }

//     return true;
//   };

//   const startRun = async () => {
//     if (!RunTracking) {
//       throw new Error(
//         'RunTracking native module is not available.',
//       );
//     }

//     const permission = await requestPermissions();

//     if (!permission) {
//       throw new Error(
//         'Precise location permission is required to start a run.',
//       );
//     }

//     // Reset UI
//     setSeconds(0);
//     setDistance(0);
//     setSpeed(0);
//     setPace('0:00');
//     setRouteCoordinates([]);

//     // Start native Android foreground service
//     RunTracking.startRun();

//     setIsRunning(true);
//   };

//   const stopRun = async () => {
//     if (!RunTracking) {
//       throw new Error(
//         'RunTracking native module is not available.',
//       );
//     }

//     // Stop native foreground service
//     RunTracking.stopRun();

//     setIsRunning(false);

//     // Return latest state available to JS
//     return {
//       duration: seconds,
//       distance,
//       speed,
//       pace,
//       route: routeCoordinates,
//       date: new Date().toISOString(),
//     };
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







import { useEffect, useState, useRef } from 'react';
import {
  NativeModules,
  NativeEventEmitter,
  PermissionsAndroid,
  Platform,
} from 'react-native';

import { calculatePace } from '../utils/pace';

const { RunTracking } = NativeModules;

export const useRunning = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [pace, setPace] = useState('0:00');
  const [routeCoordinates, setRouteCoordinates] = useState([]);

  // High-frequency milliseconds tracking ke liye References
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  // Native Emitter listener (GPS, Distance, Route updates ke liye)
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
        const nativeDuration = Number(data?.duration || 0);
        const distanceValue = Number(data?.distance || 0);
        const speedValue = Number(data?.speed || 0);

        setDistance(distanceValue);
        setSpeed(speedValue);

        setPace(
          calculatePace(
            distanceValue,
            nativeDuration,
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

  // Milliseconds Precision Timer (Local JS Interval)
  useEffect(() => {
    if (isRunning) {
      // Millisecond accuracy track karne ke liye start timestamp save karein
      startTimeRef.current = Date.now() - seconds * 1000;

      // Har 30ms me UI update karein (Smooth Milliseconds Display)
      timerRef.current = setInterval(() => {
        const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
        setSeconds(elapsedSeconds);
      }, 30);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

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

    // Timer Interval clear karein
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Stop native foreground service
    RunTracking.stopRun();

    setIsRunning(false);

    // Final workout state snapshot
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
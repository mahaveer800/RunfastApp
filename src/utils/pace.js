export const calculatePace = (distanceInMeters, timeInSeconds) => {
  if (distanceInMeters <= 0 || timeInSeconds <= 0) return "0.00";
  
  const distanceInKm = distanceInMeters / 1000;
  const timeInMinutes = timeInSeconds / 60;
  
  const pace = timeInMinutes / distanceInKm;
  const minutes = Math.floor(pace);
  const seconds = Math.floor((pace - minutes) * 60);

  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};
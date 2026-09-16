export const formatTime = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  // Milliseconds calculate karne ke liye (2 digits)
  const milliseconds = Math.floor((totalSeconds % 1) * 100);

  const pad = (num) => String(num).padStart(2, '0');

  const formattedMS = pad(milliseconds);
  const formattedSec = pad(seconds);
  const formattedMin = pad(minutes);

  if (hours > 0) {
    return `${hours}:${formattedMin}:${formattedSec}.${formattedMS}`;
  }
  
  return `${formattedMin}:${formattedSec}.${formattedMS}`;
};
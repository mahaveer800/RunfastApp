import { database } from '../database/database';
import { Q } from '@nozbe/watermelondb';

const workoutsCollection = database.collections.get('workouts');

// Save a new completed run
export const saveWorkoutSession = async ({ distance, duration, pace, route }) => {
  await database.write(async () => {
    await workoutsCollection.create((workout) => {
      workout.distance = distance;
      workout.duration = duration;
      workout.pace = pace;
      workout.route = JSON.stringify(route || []);
      workout.date = new Date().toISOString();
    });
  });
};

// Fetch all saved run history
export const getAllWorkouts = async () => {
  return await workoutsCollection.query().fetch();
};

// Fetch workouts strictly for the last 1 month (30 Days)
export const getMonthlyWorkouts = async () => {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  return await workoutsCollection
    .query(
      Q.where('date', Q.gte(oneMonthAgo.toISOString()))
    )
    .fetch();
};

// Delete a specific workout by ID or model instance
export const deleteWorkout = async (workoutOrId) => {
  await database.write(async () => {
    if (typeof workoutOrId === 'string') {
      const workout = await workoutsCollection.find(workoutOrId);
      await workout.destroyPermanently();
    } else if (workoutOrId && workoutOrId.destroyPermanently) {
      await workoutOrId.destroyPermanently();
    }
  });
};

// Clear all workout records
export const clearAllWorkouts = async () => {
  await database.write(async () => {
    const all = await workoutsCollection.query().fetch();
    for (const record of all) {
      await record.destroyPermanently();
    }
  });
};
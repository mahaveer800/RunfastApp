import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import Workout from './models/Workout';
import GalleryItem from './models/GalleryItem';

// Setup SQLite adapter
const adapter = new SQLiteAdapter({
  schema,
  jsi: true, // Speeds up performance using JSI if available
  onSetUpError: (error) => {
    console.error('Database setup failed: ', error);
  },
});

// Initialize Database instance
export const database = new Database({
  adapter,
  modelClasses: [Workout, GalleryItem],
  actionsEnabled: true,
});
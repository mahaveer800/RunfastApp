import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import Workout from './models/Workout';
import GalleryItem from './models/GalleryItem';
import Alarm from './models/Alarm';

const adapter = new SQLiteAdapter({
  schema,
  jsi: true,
  onSetUpError: (error) => {
    console.error('Database setup failed: ', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Workout, GalleryItem, Alarm],
  actionsEnabled: true,
});
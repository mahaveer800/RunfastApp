import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'workouts',
      columns: [
        { name: 'distance', type: 'number' },
        { name: 'duration', type: 'number' },
        { name: 'pace', type: 'string' },
        { name: 'route', type: 'string' }, // JSON stringified route coordinates
        { name: 'date', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'gallery_items',
      columns: [
        { name: 'image_uri', type: 'string' },
        { name: 'caption', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});
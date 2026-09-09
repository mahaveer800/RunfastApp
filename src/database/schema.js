import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 2, // Version incremented to 2 for adding new table
  tables: [
    tableSchema({
      name: 'workouts',
      columns: [
        { name: 'distance', type: 'number' },
        { name: 'duration', type: 'number' },
        { name: 'pace', type: 'string' },
        { name: 'route', type: 'string' }, 
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
    tableSchema({
      name: 'alarms',
      columns: [
        { name: 'time', type: 'string' },
        { name: 'label', type: 'string' },
        { name: 'enabled', type: 'boolean' },
        { name: 'date', type: 'string' },
      ],
    }),
  ],
});
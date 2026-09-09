import { database } from '../database/database';

const galleryCollection = database.collections.get('gallery_items');

// Save a new gallery item / photo
export const saveGalleryItem = async ({ imageUri, caption }) => {
  return await database.write(async () => {
    return await galleryCollection.create((item) => {
      item.imageUri = imageUri;
      item.caption = caption || '';
      item.createdAt = Date.now();
    });
  });
};

// Fetch all gallery items
export const getAllGalleryItems = async () => {
  return await galleryCollection.query().fetch();
};

// Delete a gallery item
export const deleteGalleryItem = async (itemOrId) => {
  await database.write(async () => {
    if (typeof itemOrId === 'string') {
      const item = await galleryCollection.find(itemOrId);
      await item.destroyPermanently();
    } else if (itemOrId && itemOrId.destroyPermanently) {
      await itemOrId.destroyPermanently();
    }
  });
};

// Clear all gallery items
export const clearAllGalleryItems = async () => {
  await database.write(async () => {
    const all = await galleryCollection.query().fetch();
    for (const item of all) {
      await item.destroyPermanently();
    }
  });
};

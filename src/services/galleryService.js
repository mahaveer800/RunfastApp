import { decode } from 'base64-arraybuffer';
import { database } from '../database/database';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';

const BUCKET = 'gallery';
const SIGNED_URL_SECONDS = 3600;

const galleryCollection = database.collections.get('gallery_items');

const getAuthenticatedUser = async () => {
  const client = getSupabase();

  if (!client || !isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    throw new Error(`Session check failed: ${error.message}`);
  }

  const session = data?.session;

  if (!session?.user || !session.access_token) {
    throw new Error('No active Supabase session. Please log in again.');
  }

  return {
    client,
    user: session.user,
  };
};

const getFileExtension = (uri = '') => {
  const cleanUri = uri.split('?')[0];
  const match = cleanUri.match(/\.(jpg|jpeg|png|webp)$/i);
  return match ? match[1].toLowerCase() : 'jpg';
};

const getContentType = (ext) => {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
};

const uploadImageToSupabase = async ({ imageUri, base64, contentType }, userId) => {
  const { client } = await getAuthenticatedUser();

  if (!base64 && !imageUri) {
    throw new Error('Image data is missing.');
  }

  const ext = getFileExtension(imageUri || '');
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const storagePath = `${userId}/${fileName}`;
  const mimeType = contentType || getContentType(ext);

  if (!base64) {
    throw new Error('Image encoding failed. Please select the image again.');
  }

  const arrayBuffer = decode(base64);

  const { error } = await client.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  return storagePath;
};

const createSignedUrl = async (client, storagePath) => {
  if (!storagePath) return null;

  try {
    const { data, error } = await client.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_SECONDS);

    if (error) {
      console.warn('Signed URL warning:', error.message);
      return null;
    }

    return data?.signedUrl || null;
  } catch (e) {
    console.warn('Signed URL exception:', e);
    return null;
  }
};

export const saveGalleryItem = async ({ imageUri, base64, contentType, caption }) => {
  const { client, user } = await getAuthenticatedUser();

  const storagePath = await uploadImageToSupabase(
    { imageUri, base64, contentType },
    user.id,
  );

  const { data: metadata, error } = await client
    .from('gallery_items')
    .insert({
      user_id: user.id,
      image_uri: storagePath,
      caption: caption || '',
      created_at: Date.now(),
    })
    .select()
    .single();

  if (error) {
    await client.storage.from(BUCKET).remove([storagePath]);
    throw new Error(`Could not save gallery metadata: ${error.message}`);
  }

  // Backup locally to WatermelonDB
  try {
    await database.write(async () => {
      await galleryCollection.create((item) => {
        item.imageUri = imageUri || '';
        item.caption = caption || '';
        item.createdAt = metadata.created_at || Date.now();
      });
    });
  } catch (localErr) {
    console.warn('Local DB backup warning:', localErr);
  }

  return metadata;
};

export const getAllGalleryItems = async () => {
  const { client, user } = await getAuthenticatedUser();

  const { data: cloudItems, error } = await client
    .from('gallery_items')
    .select('id, user_id, image_uri, caption, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Error fetching cloud gallery:', error.message);
    const localItems = await galleryCollection.query().fetch();
    return localItems.map((item) => ({
      id: item.id,
      caption: item.caption || '',
      createdAt: item.createdAt ? new Date(item.createdAt).getTime() : Date.now(),
      imageUri: item.imageUri || '',
    }));
  }

  const results = await Promise.all(
    (cloudItems || []).map(async (item) => {
      const signedUrl = await createSignedUrl(client, item.image_uri);
      return {
        id: item.id,
        caption: item.caption || '',
        createdAt: Number(item.created_at) || Date.now(),
        userId: item.user_id,
        storagePath: item.image_uri,
        imageUri: signedUrl || '',
      };
    }),
  );

  return results.filter((item) => Boolean(item.imageUri));
};

export const deleteGalleryItem = async (itemOrId) => {
  const { client, user } = await getAuthenticatedUser();
  const recordId = typeof itemOrId === 'string' ? itemOrId : itemOrId?.id;
  const storagePath = typeof itemOrId === 'object' ? itemOrId.storagePath : null;

  if (!recordId) throw new Error('Gallery item ID is missing.');

  if (storagePath) {
    const { error: storageError } = await client.storage
      .from(BUCKET)
      .remove([storagePath]);

    if (storageError) {
      console.warn('Cloud storage remove warning:', storageError.message);
    }
  }

  const { error: metadataError } = await client
    .from('gallery_items')
    .delete()
    .eq('id', recordId)
    .eq('user_id', user.id);

  if (metadataError) {
    throw new Error(`Metadata deletion failed: ${metadataError.message}`);
  }

  try {
    const localRecord = await galleryCollection.find(recordId).catch(() => null);
    if (localRecord) {
      await database.write(async () => {
        await localRecord.destroyPermanently();
      });
    }
  } catch (e) {
    // Non-fatal
  }
};

export const syncCloudGalleryItems = async () => {
  return true;
};

export const clearAllGalleryItems = async () => {
  const { client, user } = await getAuthenticatedUser();

  const { data: items } = await client
    .from('gallery_items')
    .select('id, image_uri')
    .eq('user_id', user.id);

  if (items && items.length > 0) {
    const paths = items.map((i) => i.image_uri).filter(Boolean);
    if (paths.length > 0) {
      await client.storage.from(BUCKET).remove(paths);
    }
    await client.from('gallery_items').delete().eq('user_id', user.id);
  }

  try {
    await database.write(async () => {
      const all = await galleryCollection.query().fetch();
      for (const item of all) {
        await item.destroyPermanently();
      }
    });
  } catch (e) {
    // Non-fatal
  }
};

import { Model } from '@nozbe/watermelondb';
import { text, date } from '@nozbe/watermelondb/decorators';

export default class GalleryItem extends Model {
  static table = 'gallery_items';

  @text('image_uri') imageUri;
  @text('caption') caption;
  @date('created_at') createdAt;
}
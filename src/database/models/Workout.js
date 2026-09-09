import { Model } from '@nozbe/watermelondb';
import { field, text, date } from '@nozbe/watermelondb/decorators';

export default class Workout extends Model {
  static table = 'workouts';

  @field('distance') distance;
  @field('duration') duration;
  @text('pace') pace;
  @text('route') route;
  @text('date') date;
}
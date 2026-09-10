
// import { Model } from '@nozbe/watermelondb';

// export default class Alarm extends Model {
//   static table = 'alarms';

//   // Time Field (Read & Write)
//   get time() {
//     return this._getRaw('time');
//   }
//   set time(value) {
//     this._setRaw('time', value);
//   }

//   // Label Field (Read & Write)
//   get label() {
//     return this._getRaw('label');
//   }
//   set label(value) {
//     this._setRaw('label', value);
//   }

//   // Enabled Field (Read & Write)
//   get enabled() {
//     return this._getRaw('enabled');
//   }
//   set enabled(value) {
//     this._setRaw('enabled', value);
//   }

//   // Date Field (Read & Write)
//   get date() {
//     return this._getRaw('date');
//   }
//   set date(value) {
//     this._setRaw('date', value);
//   }
// }



// import { Model } from '@nozbe/watermelondb';

// export default class Alarm extends Model {
//   static table = 'alarms';

//   get time() {
//     return this._getRaw('time');
//   }

//   set time(value) {
//     this._setRaw('time', value);
//   }

//   get label() {
//     return this._getRaw('label');
//   }

//   set label(value) {
//     this._setRaw('label', value);
//   }

//   get enabled() {
//     return this._getRaw('enabled');
//   }

//   set enabled(value) {
//     this._setRaw('enabled', value);
//   }

//   get date() {
//     return this._getRaw('date');
//   }

//   set date(value) {
//     this._setRaw('date', value);
//   }

//   get repeatType() {
//     return this._getRaw('repeat_type');
//   }

//   set repeatType(value) {
//     this._setRaw('repeat_type', value);
//   }

//   get selectedDays() {
//     return this._getRaw('selected_days');
//   }

//   set selectedDays(value) {
//     this._setRaw('selected_days', value);
//   }

//   get sound() {
//     return this._getRaw('sound');
//   }

//   set sound(value) {
//     this._setRaw('sound', value);
//   }

//   get notificationId() {
//     return this._getRaw('notification_id');
//   }

//   set notificationId(value) {
//     this._setRaw('notification_id', value);
//   }
// }





import {Model} from '@nozbe/watermelondb';
import {field, text} from '@nozbe/watermelondb/decorators';

export default class Alarm extends Model {
  static table = 'alarms';

  @text('time') time;
  @text('label') label;
  @field('enabled') enabled;
  @text('date') date;

  @text('repeat_type') repeatType;
  @text('selected_days') selectedDays;
  @text('sound') sound;
  @field('notification_id') notificationId;
}
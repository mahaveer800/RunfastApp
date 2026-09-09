
import { Model } from '@nozbe/watermelondb';

export default class Alarm extends Model {
  static table = 'alarms';

  // Time Field (Read & Write)
  get time() {
    return this._getRaw('time');
  }
  set time(value) {
    this._setRaw('time', value);
  }

  // Label Field (Read & Write)
  get label() {
    return this._getRaw('label');
  }
  set label(value) {
    this._setRaw('label', value);
  }

  // Enabled Field (Read & Write)
  get enabled() {
    return this._getRaw('enabled');
  }
  set enabled(value) {
    this._setRaw('enabled', value);
  }

  // Date Field (Read & Write)
  get date() {
    return this._getRaw('date');
  }
  set date(value) {
    this._setRaw('date', value);
  }
}
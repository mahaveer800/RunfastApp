import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  Platform,
  ScrollView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import notifee, {
  TriggerType,
  AndroidCategory,
  AndroidImportance,
} from '@notifee/react-native';
import { useAlert } from '../../context/AlertContext';

import { COLORS } from '../../constants/colors';
import { database } from '../../database/database';

const DAYS = [
  { id: 1, label: 'Mon', full: 'Monday' },
  { id: 2, label: 'Tue', full: 'Tuesday' },
  { id: 3, label: 'Wed', full: 'Wednesday' },
  { id: 4, label: 'Thu', full: 'Thursday' },
  { id: 5, label: 'Fri', full: 'Friday' },
  { id: 6, label: 'Sat', full: 'Saturday' },
  { id: 7, label: 'Sun', full: 'Sunday' },
];

const SOUNDS = [
  {
    id: 'ring1',
    name: 'Morning Clock',
  },
  {
    id: 'ring2',
    name: 'Classic Bell',
  },
  {
    id: 'ring3',
    name: 'School Bell',
  },
  {
    id: 'ring6',
    name: 'Anvil Bell',
  },
  {
    id: 'ring7',
    name: 'Alarm Tone 7',
  },
  {
    id: 'ring8',
    name: 'Alarm Tone 8',
  },
];

const DEFAULT_SOUND = 'ring1';


const SOUND_FILES = {
  ring1: 'ring1',
  ring2: 'ring2',
  ring3: 'ring3',
  ring6: 'ring6',
  ring7: 'ring7',
  ring8: 'ring8',
};

// Android locks a channel's sound when it is first created. Bump this only
// when changing the sound configuration, so users receive a fresh channel.
const ALARM_CHANNEL_VERSION = 2;

export const AlarmScreen = () => {
  const { showAlert } = useAlert();
  const [alarms, setAlarms] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState('time');
  const [labelInput, setLabelInput] = useState('');
  const [repeatType, setRepeatType] = useState('once');
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedSound, setSelectedSound] = useState(DEFAULT_SOUND);

  useEffect(() => {
    fetchAlarms();
  }, []);


  const scheduleNativeAlarm = async (
    notificationId,
    title,
    triggerDate,
    soundName,
  ) => {
    try {
      await notifee.requestPermission();

      // Android resource names do not include the file extension.
      // Only MP3 resources are used here; Notifee does not support WAV custom sounds.
      const androidSound = SOUND_FILES[soundName] || SOUND_FILES[DEFAULT_SOUND];
      const channelId = `runfast_alarm_${androidSound}_v${ALARM_CHANNEL_VERSION}`;
   

    await notifee.createChannel({
      id: channelId,
      name: `RunFast Alarm - ${soundName}`,
      importance: AndroidImportance.HIGH,
      sound: androidSound,
      bypassDnd: true,
      vibration: true,
      vibrationPattern: [300, 500, 300, 500],
    });

    let alarmTime = triggerDate.getTime();

    // Agar selected time already pass ho chuka hai,
    // to next day schedule karo.
    if (alarmTime <= Date.now()) {
      alarmTime += 24 * 60 * 60 * 1000;
    }

    const trigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: alarmTime,
      alarmManager: true,
    };

    await notifee.createTriggerNotification(
      {
        id: String(notificationId),

        title: '⏰ Alarm',

        body: title || 'Running Time!',

        android: {
          channelId,

          category: AndroidCategory.ALARM,

          importance: AndroidImportance.HIGH,

          sound: androidSound,

          bypassDnd: true,

          loopSound: true,

          vibrationPattern: [300, 500, 300, 500],

          pressAction: {
            id: 'default',
          },
        },

        ios: {
          sound: 'default',
        },
      },
      trigger,
    );

      console.log('Alarm scheduled successfully:', {
        notificationId,
        soundName,
        androidSound,
        channelId,
        alarmTime: new Date(alarmTime).toString(),
      });
    } catch (err) {
      console.log('Error scheduling native notification:', err);
      throw err;
    }
  };


  const cancelNativeAlarm = async (notificationId) => {
    try {
      if (notificationId) {
        await notifee.cancelNotification(String(notificationId));
      }
    } catch (err) {
      console.log('Error canceling notification:', err);
    }
  };

  // ------------------------------------------
  // FETCH ALARMS
  // ------------------------------------------

  const fetchAlarms = async () => {
    try {
      if (!database || !database.collections) {
        console.log('Database not ready');
        return;
      }

      const alarmsCollection = database.collections.get('alarms');
      const alarmList = await alarmsCollection.query().fetch();
      setAlarms(alarmList);
    } catch (error) {
      console.log('Error fetching alarms:', error);
    }
  };

  // ------------------------------------------
  // DATE / TIME PICKER
  // ------------------------------------------

  const onChangeDateTime = (event, currentDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (currentDate) {
      setSelectedDate(currentDate);
    }
  };

  const showModeSelector = (currentMode) => {
    setMode(currentMode);
    setShowPicker(true);
  };

  // ------------------------------------------
  // RESET FORM
  // ------------------------------------------

  const resetForm = () => {
    setSelectedDate(new Date());
    setLabelInput('');
    setRepeatType('once');
    setSelectedDays([]);
    setSelectedSound(DEFAULT_SOUND);
    setShowPicker(false);
  };

  const openAlarmModal = () => {
    resetForm();
    setIsModalVisible(true);
  };

  const closeAlarmModal = () => {
    setShowPicker(false);
    setIsModalVisible(false);
  };

  // ------------------------------------------
  // SELECT DAYS
  // ------------------------------------------

  const toggleDay = (dayId) => {
    setSelectedDays((prev) => {
      if (prev.includes(dayId)) {
        return prev.filter((id) => id !== dayId);
      }
      return [...prev, dayId].sort((a, b) => a - b);
    });
  };

  // ------------------------------------------
  // SAVE ALARM
  // ------------------------------------------

  const handleSaveAlarm = async () => {
    try {
      if (!database) {
        showAlert({ title: 'Error', message: 'Database is not ready.', type: 'error' });
        return;
      }

      if (repeatType === 'weekly' && selectedDays.length === 0) {
        showAlert({
          title: 'Select days',
          message: 'Please select at least one day.',
          type: 'warning',
        });
        return;
      }

      const alarmsCollection = database.collections.get('alarms');

      const timeString = selectedDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      const dateString = selectedDate.toLocaleDateString();
      const notificationId = Date.now().toString();

      // 1. Save in WatermelonDB
      await database.write(async () => {
        await alarmsCollection.create((alarm) => {
          alarm.time = timeString;
          alarm.label = labelInput.trim() || 'Running Alarm';
          alarm.enabled = true;
          alarm.date = dateString;
          alarm.repeatType = repeatType;
          alarm.selectedDays = JSON.stringify(selectedDays);
          alarm.sound = selectedSound;
          alarm.notificationId = notificationId;
        });
      });

      // 2. Native OS me alarm trigger schedule karein
      await scheduleNativeAlarm(
        notificationId,
        labelInput.trim() || 'Running Alarm',
        selectedDate,
        selectedSound
      );

      resetForm();
      setIsModalVisible(false);
      await fetchAlarms();

      showAlert({
        title: 'Alarm Saved',
        message: `${timeString} alarm has been scheduled.`,
        type: 'success',
      });
    } catch (error) {
      console.log('Error saving alarm:', error);
      showAlert({
        title: 'Error',
        message: 'Unable to schedule alarm. Please enable notifications and try again.',
        type: 'error',
      });
    }
  };

  // ------------------------------------------
  // DELETE ALARM
  // ------------------------------------------

  const handleDeleteAlarm = async (id) => {
    try {
      const alarmsCollection = database.collections.get('alarms');
      const alarmRecord = await alarmsCollection.find(id);

      // 1. Native alarm notification cancel karein
      if (alarmRecord.notificationId) {
        await cancelNativeAlarm(alarmRecord.notificationId);
      }

      // 2. DB se remove karein
      await database.write(async () => {
        await alarmRecord.destroyPermanently();
      });

      await fetchAlarms();
    } catch (error) {
      console.log('Error deleting alarm:', error);
    }
  };

  // ------------------------------------------
  // TOGGLE ALARM
  // ------------------------------------------

  const handleToggleAlarm = async (item) => {
    try {
      const newStatus = !item.enabled;

      await database.write(async () => {
        await item.update((alarm) => {
          alarm.enabled = newStatus;
        });
      });

      // Toggle ke according Native notification handle karein
      if (newStatus) {
        // Parse time to recreate JS Date object for trigger
        const [time, modifier] = item.time.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;

        const targetDate = new Date();
        targetDate.setHours(hours, minutes, 0, 0);

        await scheduleNativeAlarm(
          item.notificationId,
          item.label,
          targetDate,
          item.sound
        );
      } else {
        await cancelNativeAlarm(item.notificationId);
      }

      await fetchAlarms();
    } catch (error) {
      console.log('Error updating alarm:', error);
    }
  };

  // ------------------------------------------
  // REPEAT TEXT
  // ------------------------------------------

  const getRepeatText = (item) => {
    if (item.repeatType === 'daily') {
      return 'Daily';
    }

    if (item.repeatType === 'weekly') {
      try {
        const days = JSON.parse(item.selectedDays || '[]');
        const names = days
          .map((dayId) => {
            const day = DAYS.find((d) => d.id === dayId);
            return day ? day.label : '';
          })
          .filter(Boolean);

        return names.length ? names.join(', ') : 'Weekly';
      } catch {
        return 'Weekly';
      }
    }

    return 'Once';
  };

  // ------------------------------------------
  // SOUND NAME
  // ------------------------------------------

  const getSoundName = (soundId) => {
    const sound = SOUNDS.find((item) => item.id === soundId);
    return sound ? sound.name : 'Morning Clock';
  };

  // ------------------------------------------
  // RENDER ALARM
  // ------------------------------------------

  const renderAlarm = ({ item }) => (
    <View style={[styles.alarmCard, !item.enabled && styles.disabledCard]}>
      <View style={styles.alarmIcon}>
        <Ionicons
          name={item.enabled ? 'alarm-outline' : 'alarm-off-outline'}
          size={28}
          color={item.enabled ? COLORS.primary : COLORS.textSecondary}
        />
      </View>

      <View style={styles.alarmInfo}>
        <Text style={[styles.timeText, !item.enabled && styles.disabledText]}>
          {item.time}
        </Text>

        <Text style={styles.labelText}>{item.label}</Text>

        <Text style={styles.dateSubText}>
          {item.repeatType === 'once' ? item.date : getRepeatText(item)}
        </Text>

        <Text style={styles.soundText}>🔔 {getSoundName(item.sound)}</Text>
      </View>

      <View style={styles.actionColumn}>
        <Switch
          value={item.enabled}
          onValueChange={() => handleToggleAlarm(item)}
          trackColor={{
            false: COLORS.border,
            true: COLORS.primary,
          }}
          thumbColor={COLORS.text}
        />

        <TouchableOpacity
          onPress={() => handleDeleteAlarm(item.id)}
          style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ------------------------------------------
  // UI
  // ------------------------------------------

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Alarms</Text>
          <Text style={styles.headerSubtitle}>
            Schedule your running alarms
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={openAlarmModal}
          activeOpacity={0.7}>
          <Ionicons name="add" size={26} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* ALARM LIST */}
      <FlatList
        data={alarms}
        keyExtractor={(item) => item.id}
        renderItem={renderAlarm}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          alarms.length === 0 ? styles.emptyContainer : styles.listContainer
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons
              name="alarm-outline"
              size={50}
              color={COLORS.textSecondary}
            />

            <Text style={styles.emptyTitle}>No alarms set</Text>

            <Text style={styles.emptyText}>
              Tap + to create a running alarm.
            </Text>
          </View>
        }
      />

      {/* ADD ALARM MODAL */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={closeAlarmModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Set New Alarm</Text>

              {/* TIME + DATE */}
              <View style={styles.pickerRow}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => showModeSelector('time')}>
                  <Ionicons
                    name="time-outline"
                    size={19}
                    color={COLORS.primary}
                  />
                  <Text style={styles.pickerButtonText}>
                    {selectedDate.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => showModeSelector('date')}>
                  <Ionicons
                    name="calendar-outline"
                    size={19}
                    color={COLORS.primary}
                  />
                  <Text style={styles.pickerButtonText}>
                    {selectedDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* DATE TIME PICKER */}
              {showPicker && (
                <View>
                  <DateTimePicker
                    value={selectedDate}
                    mode={mode}
                    is24Hour={false}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onChangeDateTime}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={styles.iosPickerDoneBtn}
                      onPress={() => setShowPicker(false)}>
                      <Text style={styles.iosPickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* LABEL */}
              <Text style={styles.sectionTitle}>Alarm Label</Text>
              <TextInput
                style={styles.input}
                placeholder="Morning Run"
                placeholderTextColor={COLORS.textSecondary}
                value={labelInput}
                onChangeText={setLabelInput}
              />

              {/* REPEAT */}
              <Text style={styles.sectionTitle}>Repeat</Text>
              <View style={styles.repeatRow}>
                <TouchableOpacity
                  style={[
                    styles.repeatButton,
                    repeatType === 'once' && styles.selectedButton,
                  ]}
                  onPress={() => setRepeatType('once')}>
                  <Text
                    style={[
                      styles.repeatText,
                      repeatType === 'once' && styles.selectedText,
                    ]}>
                    Once
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.repeatButton,
                    repeatType === 'daily' && styles.selectedButton,
                  ]}
                  onPress={() => setRepeatType('daily')}>
                  <Text
                    style={[
                      styles.repeatText,
                      repeatType === 'daily' && styles.selectedText,
                    ]}>
                    Daily
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.repeatButton,
                    repeatType === 'weekly' && styles.selectedButton,
                  ]}
                  onPress={() => setRepeatType('weekly')}>
                  <Text
                    style={[
                      styles.repeatText,
                      repeatType === 'weekly' && styles.selectedText,
                    ]}>
                    Weekly
                  </Text>
                </TouchableOpacity>
              </View>

              {/* DAYS */}
              {repeatType === 'weekly' && (
                <>
                  <Text style={styles.sectionTitle}>Select Days</Text>
                  <View style={styles.daysContainer}>
                    {DAYS.map((day) => {
                      const selected = selectedDays.includes(day.id);
                      return (
                        <TouchableOpacity
                          key={day.id}
                          style={[
                            styles.dayButton,
                            selected && styles.selectedDay,
                          ]}
                          onPress={() => toggleDay(day.id)}>
                          <Text
                            style={[
                              styles.dayText,
                              selected && styles.selectedDayText,
                            ]}>
                            {day.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* SOUND */}
              <Text style={styles.sectionTitle}>Alarm Sound</Text>
              <View style={styles.soundContainer}>
                {SOUNDS.map((sound) => {
                  const selected = selectedSound === sound.id;
                  return (
                    <TouchableOpacity
                      key={sound.id}
                      style={[
                        styles.soundOption,
                        selected && styles.selectedSound,
                      ]}
                      onPress={() => setSelectedSound(sound.id)}>
                      <Ionicons
                        name={
                          selected ? 'radio-button-on' : 'radio-button-off'
                        }
                        size={20}
                        color={
                          selected ? COLORS.primary : COLORS.textSecondary
                        }
                      />
                      <Text style={styles.soundOptionText}>{sound.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* BUTTONS */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={closeAlarmModal}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={handleSaveAlarm}>
                  <Text style={styles.saveBtnText}>Save Alarm</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 14,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    fontSize: 14,
  },
  alarmCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 15,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disabledCard: {
    opacity: 0.55,
  },
  alarmIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alarmInfo: {
    flex: 1,
  },
  timeText: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  disabledText: {
    color: COLORS.textSecondary,
  },
  labelText: {
    color: COLORS.text,
    fontSize: 14,
    marginTop: 2,
  },
  dateSubText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 5,
  },
  soundText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  actionColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteButton: {
    padding: 6,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 18,
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    padding: 22,
    borderRadius: 18,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    padding: 13,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  iosPickerDoneBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    marginVertical: 6,
  },
  iosPickerDoneText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  repeatRow: {
    flexDirection: 'row',
    gap: 8,
  },
  repeatButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 9,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  repeatText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  selectedText: {
    color: COLORS.text,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDay: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  selectedDayText: {
    color: COLORS.text,
  },
  soundContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  soundOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectedSound: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  soundOptionText: {
    color: COLORS.text,
    fontSize: 13,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 9,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
  },
  saveBtnText: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
});

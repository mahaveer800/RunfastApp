
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../constants/colors';
import { database } from '../../database/database';

export const AlarmScreen = () => {
  const [alarms, setAlarms] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState('time');
  const [labelInput, setLabelInput] = useState('');

  useEffect(() => {
    fetchAlarms();
  }, []);

const fetchAlarms = async () => {
    try {
      
      if (!database || !database.collections) {
        console.log("Database not ready yet, retrying in 500ms...");
        setTimeout(fetchAlarms, 500);
        return;
      }
      const alarmsCollection = database.collections.get('alarms');
      const alarmList = await alarmsCollection.query().fetch();
      setAlarms(alarmList);
    } catch (error) {
      console.log('Error fetching alarms:', error);
    }
  };
  const onChangeDateTime = (event, currentDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (currentDate) {
      setSelectedDate(currentDate);
    }
  };

  const showModeSelector = (currentMode) => {
    setShowPicker(true);
    setMode(currentMode);
  };

  const handleSaveAlarm = async () => {
    const timeString = selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = selectedDate.toLocaleDateString();

    try {
      if (!database) return;
      const alarmsCollection = database.collections.get('alarms');
      await database.write(async () => {
        await alarmsCollection.create((alarm) => {
          alarm.time = timeString;
          alarm.label = labelInput || 'Running Alarm';
          alarm.enabled = true;
          alarm.date = dateString;
        });
      });

      setLabelInput('');
      setSelectedDate(new Date());
      setIsModalVisible(false);
      fetchAlarms();
    } catch (error) {
      console.log('Error saving alarm:', error);
    }
  };

  const handleDeleteAlarm = async (id) => {
    try {
      if (!database) return;
      const alarmsCollection = database.collections.get('alarms');
      const alarmRecord = await alarmsCollection.find(id);
      await database.write(async () => {
        await alarmRecord.destroyPermanently();
      });
      fetchAlarms();
    } catch (error) {
      console.log('Error deleting alarm:', error);
    }
  };

  const handleToggleAlarm = async (item) => {
    try {
      if (!database) return;
      await database.write(async () => {
        await item.update((alarm) => {
          alarm.enabled = !alarm.enabled;
        });
      });
      fetchAlarms();
    } catch (error) {
      console.log('Error updating alarm status:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alarms</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsModalVisible(true)}
        >
          <Ionicons name="add" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={alarms}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.alarmCard, !item.enabled && styles.disabledCard]}>
            <View style={styles.alarmInfo}>
              <Text style={[styles.timeText, !item.enabled && styles.disabledText]}>
                {item.time}
              </Text>
              <Text style={styles.dateSubText}>{item.date} • {item.label}</Text>
            </View>

            <View style={styles.actionRow}>
              <Switch
                value={item.enabled}
                onValueChange={() => handleToggleAlarm(item)}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={COLORS.text}
              />
              <TouchableOpacity
                onPress={() => handleDeleteAlarm(item.id)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No alarms set yet. Tap '+' to add one.</Text>
        }
      />

      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set New Alarm</Text>

            <View style={styles.pickerRow}>
              <TouchableOpacity style={styles.pickerButton} onPress={() => showModeSelector('time')}>
                <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                <Text style={styles.pickerButtonText}>
                  {selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.pickerButton} onPress={() => showModeSelector('date')}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                <Text style={styles.pickerButtonText}>{selectedDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
            </View>

            {showPicker && (
              <DateTimePicker
                value={selectedDate}
                mode={mode}
                is24Hour={false}
                display="default"
                onChange={onChangeDateTime}
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Label (e.g., Morning Run)"
              placeholderTextColor={COLORS.textSecondary}
              value={labelInput}
              onChangeText={setLabelInput}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSaveAlarm}
              >
                <Text style={styles.saveBtnText}>Save Alarm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
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
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 50,
  },
  alarmCard: {
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disabledCard: {
    opacity: 0.6,
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
  dateSubText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  deleteButton: {
    padding: 4,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 50,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
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
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    backgroundColor: COLORS.background,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
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
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRunning } from '../../hooks/useRunning';
import { Button } from '../../components/Button';
import { StatCard } from '../../components/StatCard';
import { formatTime } from '../../utils/time';
import { COLORS } from '../../constants/colors';
import { saveWorkoutSession } from '../../services/workoutService';
import { useAlert } from '../../context/AlertContext';

export const RunningScreen = ({ navigation, onRunSaved }) => {
  const { isRunning, seconds, distance, pace, startRun, stopRun } = useRunning();
  const { showAlert } = useAlert();

  const handleStopAndSave = async () => {
    const workoutData = stopRun();
    try {
      await saveWorkoutSession(workoutData);
      console.log('Workout saved to database:', workoutData);
      showAlert({
        title: 'Run Saved!',
        message: 'Your workout session has been successfully saved to History.',
        type: 'success',
        confirmText: 'View History',
        onConfirm: () => {
          if (onRunSaved) {
            onRunSaved(workoutData);
          }
        },
      });
    } catch (error) {
      console.error('Failed to save workout:', error);
      showAlert({
        title: 'Save Failed',
        message: 'Could not save the workout to the local database.',
        type: 'error',
      });
    }

    if (navigation?.navigate) {
      navigation.navigate('RunningResult', { workout: workoutData });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
   
        <Text style={styles.headerTitle}>RunFast Tracker</Text>
      </View>

      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(seconds)}</Text>
        <View style={styles.timerLabelRow}>
          <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} style={{ marginRight: 4 }} />
          <Text style={styles.timerLabel}>Time Elapsed</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatCard
          label="Distance"
          value={(distance / 1000).toFixed(2)}
          unit="km"
          iconName="navigate-outline"
          iconColor={COLORS.primary}
        />
        <StatCard
          label="Pace"
          value={pace}
          unit="min/km"
          iconName="speedometer-outline"
          iconColor={COLORS.secondary}
        />
      </View>

      <View style={styles.actionContainer}>
        {!isRunning ? (
          <Button
            title="Start Run"
            iconName="play"
            onPress={startRun}
            type="primary"
          />
        ) : (
          <Button
            title="Stop Run"
            iconName="stop"
            onPress={handleStopAndSave}
            type="danger"
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  timerText: {
    color: COLORS.primary,
    fontSize: 64,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  timerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  timerLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionContainer: {
    marginBottom: 20,
  },
});
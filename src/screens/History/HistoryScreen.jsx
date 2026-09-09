import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getAllWorkouts, deleteWorkout, clearAllWorkouts } from '../../services/workoutService';
import { StatCard } from '../../components/StatCard';
import { formatTime } from '../../utils/time';
import { formatDate } from '../../utils/date';
import { COLORS } from '../../constants/colors';
import { useAlert } from '../../context/AlertContext';

export const HistoryScreen = () => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();

  const loadWorkouts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllWorkouts();
      // Sort newest first
      const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
      setWorkouts(sorted);
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  const handleDeleteWorkout = (workout) => {
    showAlert({
      title: 'Delete Workout',
      message: 'Are you sure you want to delete this workout record? This cannot be undone.',
      type: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteWorkout(workout);
          await loadWorkouts();
          showAlert({
            title: 'Deleted',
            message: 'Workout record has been removed.',
            type: 'success',
          });
        } catch (error) {
          console.error('Failed to delete workout:', error);
          showAlert({
            title: 'Error',
            message: 'Failed to delete the workout.',
            type: 'error',
          });
        }
      },
    });
  };

  const handleClearAll = () => {
    showAlert({
      title: 'Clear All History',
      message: 'Are you sure you want to delete ALL workout history records?',
      type: 'error',
      confirmText: 'Clear All',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await clearAllWorkouts();
          await loadWorkouts();
          showAlert({
            title: 'Cleared',
            message: 'All workout history has been deleted.',
            type: 'success',
          });
        } catch (error) {
          console.error('Failed to clear history:', error);
          showAlert({
            title: 'Error',
            message: 'Failed to clear workout history.',
            type: 'error',
          });
        }
      },
    });
  };

  const totalDistance = workouts.reduce((sum, w) => sum + (w.distance || 0), 0);
  const renderItem = ({ item }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.cardDate}>{item.date ? formatDate(item.date) : 'Recent Run'}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.durationRow}>
              <Ionicons name="timer-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.cardDuration}>{formatTime(item.duration || 0)}</Text>
            </View>
            <TouchableOpacity
              style={styles.trashButton}
              onPress={() => handleDeleteWorkout(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.statItem}>
            <View style={styles.statIconRow}>
              <Ionicons name="navigate-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <Text style={styles.statValue}>
              {((item.distance || 0) / 1000).toFixed(2)} <Text style={styles.statUnit}>km</Text>
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statIconRow}>
              <Ionicons name="speedometer-outline" size={14} color={COLORS.secondary} style={{ marginRight: 4 }} />
              <Text style={styles.statLabel}>Pace</Text>
            </View>
            <Text style={styles.statValue}>
              {item.pace || '0:00'} <Text style={styles.statUnit}>min/km</Text>
            </Text>
          </View>
        </View>
      </View>
    );
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="stats-chart" size={22} color={COLORS.primary} style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Workout History</Text>
        </View>
        {workouts.length > 0 ? (
          <TouchableOpacity
            style={styles.clearAllButton}
            onPress={handleClearAll}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-bin-outline" size={18} color={COLORS.danger} style={{ marginRight: 4 }} />
            <Text style={styles.clearAllText}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.summaryRow}>
        <StatCard
          label="Total Runs"
          value={workouts.length}
          unit="runs"
          iconName="ribbon-outline"
          iconColor={COLORS.primary}
        />
        <StatCard
          label="Total Distance"
          value={(totalDistance / 1000).toFixed(2)}
          unit="km"
          iconName="map-outline"
          iconColor={COLORS.secondary}
        />
      </View>
      <FlatList
        data={workouts}
        keyExtractor={(item, index) => item.id || String(index)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadWorkouts}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="fitness-outline" size={54} color={COLORS.textSecondary} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Workouts Yet</Text>
              <Text style={styles.emptySubtitle}>Complete and save a run to see it here!</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(244, 67, 54, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  clearAllText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardDate: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDuration: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  trashButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statUnit: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: 'normal',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
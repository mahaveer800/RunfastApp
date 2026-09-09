import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { formatTime } from '../../utils/time';

export const MonthlySummary = ({ workouts }) => {
  // Total calculations for the past 1 month
  const totalRuns = workouts.length;
  const totalDistanceKm = workouts.reduce((acc, curr) => acc + (curr.distance || 0), 0) / 1000;
  const totalDurationSec = workouts.reduce((acc, curr) => acc + (curr.duration || 0), 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Last 1 Month Summary</Text>
      <View style={styles.row}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalRuns}</Text>
          <Text style={styles.statLabel}>Total Runs</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalDistanceKm.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Distance (km)</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatTime(totalDurationSec)}</Text>
          <Text style={styles.statLabel}>Time Spent</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
});
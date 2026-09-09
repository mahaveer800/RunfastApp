import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../constants/colors';

export const StatCard = ({ label, value, unit, iconName, iconColor }) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        {iconName && (
          <Ionicons
            name={iconName}
            size={16}
            color={iconColor || COLORS.primary}
            style={styles.icon}
          />
        )}
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.value}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    flex: 1,
    margin: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  unit: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginLeft: 4,
  },
});
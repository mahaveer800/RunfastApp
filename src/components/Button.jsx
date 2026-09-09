import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../constants/colors';

export const Button = ({ title, onPress, type = 'primary', iconName, style }) => {
  const backgroundColor =
    type === 'primary' ? COLORS.primary : type === 'danger' ? COLORS.danger : COLORS.cardBackground;

  return (
    <TouchableOpacity style={[styles.button, { backgroundColor }, style]} onPress={onPress}>
      <View style={styles.contentRow}>
        {iconName && <Ionicons name={iconName} size={20} color={COLORS.text} style={styles.icon} />}
        <Text style={styles.text}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
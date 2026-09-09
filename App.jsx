import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RunningScreen } from './src/screens/Running/RunningScreen';
import { HistoryScreen } from './src/screens/History/HistoryScreen';
import { GalleryScreen } from './src/screens/Gallery/GalleryScreen';
import { COLORS } from './src/constants/colors';
import { AlertProvider } from './src/context/AlertContext';

function MainApp() {
  const [activeTab, setActiveTab] = useState('running');
  const [historyKey, setHistoryKey] = useState(0);
  const insets = useSafeAreaInsets();
  const handleRunSaved = () => {
    setHistoryKey((prev) => prev + 1);
    setActiveTab('history');
  };

  const tabs = [
    { id: 'running', label: 'Track', activeIcon: 'walk', inactiveIcon: 'walk-outline' },
    { id: 'history', label: 'History', activeIcon: 'stats-chart', inactiveIcon: 'stats-chart-outline' },
    { id: 'gallery', label: 'Gallery', activeIcon: 'images', inactiveIcon: 'images-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'running' && <RunningScreen onRunSaved={handleRunSaved} />}
        {activeTab === 'history' && <HistoryScreen key={historyKey} />}
        {activeTab === 'gallery' && <GalleryScreen />}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabItem, isActive && styles.activeTabItem]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isActive ? tab.activeIcon : tab.inactiveIcon}
                size={22}
                color={isActive ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AlertProvider>
        <MainApp />
      </AlertProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBackground,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
  },
  activeTabItem: {
    backgroundColor: 'rgba(255, 87, 34, 0.12)',
  },
  tabLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 4,
  },
  activeTabLabel: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});
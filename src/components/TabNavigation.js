import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../Styles/appStyle';

const TabNavigation = ({ tabs, activeTab, setActiveTab, style, tabButtonStyle, tabTextStyle, activeTabStyle, activeTabTextStyle }) => (
  <View style={[styles.tabContainer, style]}>
    {tabs.map(tab => (
      <TouchableOpacity
        key={tab.value}
        style={[
          styles.tabButton,
          tabButtonStyle,
          activeTab === tab.value && [styles.activeTab, activeTabStyle]
        ]}
        onPress={() => setActiveTab(tab.value)}
      >
        <Text style={[
          styles.tabText,
          tabTextStyle,
          activeTab === tab.value && [styles.activeTabText, activeTabTextStyle]
        ]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.primary,
  },
});

export default TabNavigation; 
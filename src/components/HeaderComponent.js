import React from 'react';
import {  Text, Dimensions, Platform, StatusBar, StyleSheet, View, TouchableOpacity, SafeAreaView} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../Styles/appStyle';

const HeaderComponent = ({ headerTitle,  onBackPress, icon1Name, icon1OnPress, icon2Name, icon2OnPress, filterCount }) => {
  return (
    <>
      {/* Handle status bar separately for Android */}
      {Platform.OS === 'android' && <View style={styles.statusBar} />}
      
      {/* SafeAreaView handles iOS notches automatically */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            onPress={onBackPress}
            style={styles.backButton}
            activeOpacity={0.6}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Text style={styles.headerText} numberOfLines={1}>
            {headerTitle}
          </Text>
          
          <View style={styles.rightIconsContainer}>
            {icon1Name && (
  <TouchableOpacity 
    onPress={icon1OnPress}
    style={styles.iconButton}
    activeOpacity={0.6}
  >
    <Ionicons name={icon1Name} size={24} color="#fff" />
    {filterCount > 0 && (
      <View style={styles.filterBadge}>
        <Text style={styles.filterBadgeText}>{filterCount}</Text>
      </View>
    )}
  </TouchableOpacity>
)}
            
            {icon2Name && (
              <TouchableOpacity 
                onPress={icon2OnPress}
                style={styles.iconButton}
                activeOpacity={0.6}
              >
                <Ionicons name={icon2Name} size={24} color="#fff" />
              </TouchableOpacity>
            )}
            
            {/* This spacer ensures proper alignment when no icons are present */}
            {!icon1Name && !icon2Name && <View style={styles.spacer} />}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  statusBar: {
    backgroundColor: '#fff',
  },
  safeArea: {
    backgroundColor: colors.primary,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#A6A7A6',
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  rightIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
    flexDirection: "row"
  },
  spacer: {
    width: 40,
  },
  filterBadge: {
  backgroundColor: "#ff5252",
  borderRadius: 8,
  minWidth: 16,
  height: 16,
  alignItems: "center",
  justifyContent: "center",
  marginLeft: -8,
  marginTop: -8,
  position: "absolute",
  right: 2,
  top: 2,
  zIndex: 1,
  paddingHorizontal: 3,
},
filterBadgeText: {
  color: "#fff",
  fontSize: 12,
  fontWeight: "bold",
},
});

export default HeaderComponent;
import React from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  Dimensions, 
  Platform 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../Styles/appStyle';

const { width } = Dimensions.get('window');

const ApplyButton = ({ onPress, buttonText, icon, tabBarHeight }) => {

  // Responsive style calculations
  const buttonPadding = Platform.OS === 'ios' ? 12 : 10;
  const buttonMarginVertical = width > 400 ? 18 : 5;
  const buttonWidth = width > 412 ? '90%' : '100%';
  
  const iconSize = width > 400 ? 26 : 24;
  const textFontSize = width > 400 ? 18 : 16;

  return (
    <TouchableOpacity 
      style={[
        styles.buttonContainer,
        {
          paddingVertical: buttonPadding,
          paddingHorizontal: buttonPadding + 4,
          marginVertical: buttonMarginVertical,
          marginBottom: tabBarHeight > 0 ? 35 : 11,
          width: buttonWidth,
        }
      ]}
      onPress={onPress}
    >
      <MaterialIcons name={icon} size={iconSize} color="#fff" />
      <Text style={[styles.buttonText, { fontSize: textFontSize }]}>
        {buttonText}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    backgroundColor: colors.primary,
    borderRadius: 25,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ApplyButton;

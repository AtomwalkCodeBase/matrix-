import React from 'react';
import styled from "styled-components/native";
import Constants from "expo-constants";

export const colors1 = {
  primary: '#7e57c2',
  primaryLight: '#f0e7ff',
  text: '#333',
  subText: '#888',
  background: '#f8f9fa',
  white: '#ffffff',
  success: '#4caf50',
  warning: '#ff9800',
};

// Colors
export const colors = {
  primary: "#1456a7",
  secondary: "#ffa500",
  tertiary: "#E6E6E6",
  alternative: "#999999",
  lightblue: "#00B6FF",
  navyblue: "#1C0C3E",
  white: '#fff',
  black: '#000',
  blue: '#5D5FEE',
  lightgreen:'#90EE90',
  grey: '#BABBC3',
  light: '#F3F4FB',
  darkBlue: '#7978B5',
  yellow:'#FFC300',
  lightyellow:'#F7F9D1',
  offwhite: '#F8F6F0',
  red: '#ff2400',
  green: '#32cd32',
  darkred: '#ff2020',
  darkgrey: '#4c4c4c',
  warning: '#FFA726',  // Orange warning color (Material Design)
  textSecondary: '#757575',  // Dark gray for secondary text (Material Design)
  primaryLight: '#b9cce5',
  cardBg: '#f8f9fa',
  overlayBg: 'rgba(0, 0, 0, 0.6)',
    background: '#F5F7FA',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#E1E8ED',
  success: '#27AE60',
  warning: '#F39C12',
  danger: '#E74C3C'
};

const statusBarHeight = Constants.statusBarHeight;

export const Container = styled.SafeAreaView`
  background-color: ${colors.primary};
  padding: 20px;
  padding-bottom: 0px;
  flex: 1;
  padding-top: ${statusBarHeight}px;
`;

// Header
export const HeaderView = styled.View`
  padding-vertical: 10px;
  padding-top: 15px;
  margin-bottom: 10px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  background-color: ${colors.white};
  /* Shadow for iOS */
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 3px;

  /* Shadow for Android */
  elevation: 3;
`;

export const HeaderSubTitle = styled.View`
  margin-bottom: 10px;
  flex-direction: row;
  padding-left: 20px;
  justify-content: space-between;
  align-items: center;
  /* background-color: ${colors.white}; */
  color:${colors.black};
`;

export const HeaderTitle = styled.Text`
  font-size: 30px;
  font-weight: bold;
  color: ${colors.black};
  letter-spacing: 1px;
`;
export const HeaderTitleLong = styled.Text`
  font-size: 16px;
  font-weight: bold;
  color: ${colors.white};
  letter-spacing: 1px;
  font-style: italic;
`;
export const HeaderSubTitleText = styled.Text`
  font-size: 16px;
  font-weight: bold;
  color: ${colors.black};
  letter-spacing: 1px;
  font-style: italic;
`;

export const HeaderButton = styled.TouchableOpacity`
  font-weight: bold;
  color: ${colors.tertiary};
  padding: 10px;
`;

export const HeaderLogo = styled.View`
  padding: 10px;
`;

// List
export const ListContainer = styled.View`
  margin-bottom: 30px;
  flex: 1;
  padding-bottom: 40px;
`;

export const ListView = styled.TouchableHighlight`
  background-color: ${colors.white};
  color: #454545;
  min-height: 85px;
  width: 100%;
  padding: 15px;
  justify-content: space-around;
  margin-bottom: 15px;
  border-radius: 10px;
`;

export const ListRowView = styled.View`
flex-direction: row;
justify-content: flex-end;
margin-top: 20px;
`;

export const ListViewHidden = styled.View`
  background-color: ${colors.tertiary};
  min-height: 85px;
  width: 100%;
  padding: 15px;
  justify-content: center;
  align-items: flex-start;
  margin-bottom: 15px;
  border-radius: 11px;
`;

export const ListButton = styled.TouchableOpacity`
  font-weight: bold;
  color: ${colors.tertiary};
  margin-left: 15px;
  margin-bottom: 10px;
`;

export const HiddenButton = styled.TouchableOpacity`
  width: 55px;
  align-items: center;
`;

export const TodoText = styled.Text`
  font-size: 18px;
  letter-spacing: 1px;
  font-weight: 500;
  color: ${colors.black};
`;

export const TodoDate = styled.Text`
  font-size: 10px;
  letter-spacing: 1px;
  color: ${colors.black};
  text-align: right;
  text-transform: uppercase;
`;

// Text for swiped todo row
export const SwipedTodoText = styled(TodoText)`
  color: ${colors.secondary};
  font-style: italic;
  text-decoration: line-through;
`;

// Modal
export const ModalButton = styled.TouchableOpacity`
  width: 60px;
  height: 60px;
  background-color: ${colors.tertiary};
  border-radius: 50px;
  justify-content: center;
  align-items: center;
  align-self: center;
  position: absolute;
  bottom: 15px;
`;

export const ModalContainer = styled.View`
  padding: 20px;
  justify-content: center;
  align-items: center;
  flex: 1;
  background-color: #f2f2f2;
`;

export const ModalView = styled.View`
  background-color: #4491FE;
  border-radius: 20px;
  padding: 35px;
`;

export const StyledInput = styled.TextInput`
  width: 300px;
  height: 50px;
  background-color: ${colors.tertiary};
  padding: 10px;
  font-size: 16px;
  border-radius: 10px;
  color: ${colors.black};
  letter-spacing: 1px;
`;

export const ModalAction = styled.TouchableOpacity`
  width: 60px;
  height: 60px;
  background-color: ${(props) => props.color};
  border-radius: 50px;
  justify-content: center;
  align-items: center;
  align-self: center;
`;

export const ModalActionGroup = styled.View`
  flex-direction: row;
  justify-content: space-around;
  margin-top: 30px;
`;

export const ModalIcon = styled.View`
  align-items: center;
  margin-bottom: 30px;
`;

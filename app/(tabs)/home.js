import { StyleSheet, Text, View } from 'react-native'
import React, { useContext } from 'react'
import { AppContext } from '../../context/AppContext';
import HomeScreen from '../../src/screens/HomeScreen';
import FingerPopup from '../../src/screens/FingerPopup';
import PinPopup from '../../src/screens/PinPopup';
const home = () => {
  const { state } = useContext(AppContext);

  return (
    <View style={{flex: 1}}>
      <HomeScreen/>
      <FingerPopup/>
      <PinPopup/>
    </View>
  )
}

export default home

const styles = StyleSheet.create({})
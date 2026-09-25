import {View } from 'react-native'
import React from 'react'
import { useRoute } from 'expo-router';
import ProcessTravel from '../../src/screens/ProcessTravel'
const index = () => {
  const route = useRoute();
    const data = route?.params;
  return (
    <View style={{ flex: 1,}}>
    <ProcessTravel data={data}/>
    </View>
  )
}

export default index

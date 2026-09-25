import {View } from 'react-native'
import React from 'react'
import { useRoute } from 'expo-router';
import AddClaim from '../../src/screens/AddClaim'
const index = () => {
  const route = useRoute();
    const data = route?.params;
  return (
    <View style={{ flex: 1,}}>
    <AddClaim data={data}/>
    </View>
  )
}

export default index

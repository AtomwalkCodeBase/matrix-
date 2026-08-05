import {View } from 'react-native'
import React from 'react'
import { useRoute } from '@react-navigation/native'
import AddClaimList from '../../src/screens/AddClaimList'
const index = () => {
  const route = useRoute();
    const data = route?.params;
  return (
    <View style={{ flex: 1,}}>
    <AddClaimList data={data}/>
    </View>
  )
}

export default index

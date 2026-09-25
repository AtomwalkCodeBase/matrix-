import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { useRoute } from 'expo-router';;
import ClaimScreen from '../../src/screens/ClaimScreen';


const index = () => {
  const route = useRoute();
  const data = route?.params;
  return (
    <View style={{ flex: 1,
        
        }}>
            <ClaimScreen data={data}/>
    </View>
  )
}

export default index

const styles = StyleSheet.create({})
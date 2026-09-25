import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { useRoute } from 'expo-router';;
import ApproveClaim from '../../src/screens/ApproveClaim';

const index = () => {

  const route = useRoute();
  const leave = route.params;
  const emp_data_id = leave.id
  return (
    <View style={{ flex: 1,
        
        }}>
            <ApproveClaim/>
    </View>
  )
}

export default index

const styles = StyleSheet.create({})
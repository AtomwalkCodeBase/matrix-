import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import ExpenseScreen from '../../src/screens/ExpenseScreen';


const index = () => {

  return (
    <View style={{ flex: 1}}>
        <ExpenseScreen />
    </View>
  )
}

export default index

const styles = StyleSheet.create({})
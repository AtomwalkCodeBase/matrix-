import { View } from 'react-native'
import React from 'react'
import { useRoute } from '@react-navigation/native'
import ProcessTravel from '../../src/screens/ProcessTravel'
import RetainerResourceScreen from '../../src/components/APMTimeSheet/RetainerResourceScreen'
import { useLocalSearchParams } from 'expo-router'
const index = () => {
    const params = useLocalSearchParams();

    const data = {
        editingTask: JSON.parse(params.editingTask || "{}"),
        resourceCount: Number(params.resourceCount || 0),
    };

    return (
        <View style={{ flex: 1, }}>
            <RetainerResourceScreen data={data} />
        </View>
    )
}

export default index

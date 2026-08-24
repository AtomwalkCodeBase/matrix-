import { View } from 'react-native'
import RetainerResourceScreen from '../../src/components/APMTimeSheet/RetainerResourceScreen'
import { useLocalSearchParams } from 'expo-router'
const index = () => {
    const params = useLocalSearchParams();

    const data = {
        editingTask: JSON.parse(params.editingTask || "{}"),
        resourceCount: Number(params.resourceCount || 0),
        returnTo: params.returnTo,
        resource_list: params.resource_list,
    };

    return (
        <View style={{ flex: 1, }}>
            <RetainerResourceScreen data={data} />
        </View>
    )
}

export default index

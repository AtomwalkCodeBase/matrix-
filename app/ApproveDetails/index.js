import {View } from 'react-native'
import { useRoute } from 'expo-router';;
import ApproveClaimDetails from '../../src/screens/ApproveClaimDetails';
const index = () => {
  const route = useRoute();
  const claim_data = route?.params

  return (
    <View style={{ flex: 1,
        
        }}>
            <ApproveClaimDetails claim_data={claim_data} />
            {/* <ApplyLeave id={emp_data_id}/> */}
    </View>
  )
}

export default index
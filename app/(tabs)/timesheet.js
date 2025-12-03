import React, { useContext } from 'react';
import APMTimeSheet from '../../src/screens/APMTimeSheet';
import { StyleSheet, View } from 'react-native';
import { AppContext } from '../../context/AppContext';
import Loader from '../../src/components/old_components/Loader';
// import { StyleSheet, View } from 'react-native';
// import { AppContext } from '../../context/AppContext';
// import Loader from '../../src/components/old_components/Loader';
// import APMTimeSheet from '../../src/screens/APMTimeSheet';

const Index = () => {
  const { companyInfo } = useContext(AppContext);

  if (!companyInfo || Object.keys(companyInfo).length === 0) {
    return <Loader visible={true} />;
  }

  const businessType = companyInfo?.business_type?.trim()?.toUpperCase();

  return (
    <View style={styles.container}>
      <APMTimeSheet />
    </View>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

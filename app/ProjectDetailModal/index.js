import React, { useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import ProjectDetailScreen from '../../src/components/APMTimeSheet/ProjectDetailModal';

const Index = () => {
  return (
    <View style={styles.container}>
      <ProjectDetailScreen />
    </View>
  );
};

export default Index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

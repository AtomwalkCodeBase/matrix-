import React, { useEffect, useRef } from 'react';
import {
  useWindowDimensions,
  View,
  Text,
  Animated,
  StyleSheet,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors } from '../../Styles/appStyle';

const Loader = ({ visible = false, onTimeout }) => {
  const { width, height } = useWindowDimensions();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (visible) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );

      pulseAnimation.start();
      rotateAnimation.start();

      timeoutRef.current = setTimeout(() => {
        if (onTimeout) {
          onTimeout();
        } else {
          Alert.alert('Timeout', 'Not able to proceed');
        }
      }, 70000);

      return () => {
        pulseAnimation.stop();
        rotateAnimation.stop();
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        pulseAnim.setValue(1);
        rotateAnim.setValue(0);
      };
    }
  }, [visible, pulseAnim, rotateAnim, onTimeout]);

  if (!visible) return null;

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { height, width }]}>
      <Animated.View style={[styles.loader, { transform: [{ scale: pulseAnim }] }]}>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <FontAwesome5 name="atom" size={40} color={colors.primary} />
        </Animated.View>
        <Text style={styles.loadingText}>Loading...</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    width: 120,
    height: 120,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
});

export default Loader;

import React, { useEffect, useRef, useState } from 'react';
import {
  useWindowDimensions,
  View,
  Text,
  Animated,
  StyleSheet,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../Styles/appStyle';

// --- Tip messages ---
const TIPS = [
  // Indian Traffic Rules
  { icon: 'traffic-light', text: 'Follow traffic signals – red means stop!' },
  { icon: 'motorcycle', text: 'Always wear a helmet while riding.' },
  { icon: 'road', text: 'Keep left, overtake from the right.' },
  { icon: 'parking', text: 'No parking in front of fire hydrants.' },
  { icon: 'car-crash', text: 'Speed thrills but kills – drive safe.' },
  { icon: 'sign-out-alt', text: 'Use indicators before turning.' },
  // Corporate Behaviour
  { icon: 'clock', text: 'Be punctual – time is money.' },
  { icon: 'users', text: 'Respect your colleagues and their ideas.' },
  { icon: 'briefcase', text: 'Dress professionally for work.' },
  { icon: 'handshake', text: 'Be a team player – collaborate!' },
  { icon: 'comment-dots', text: 'Communicate clearly and kindly.' },
  { icon: 'check-double', text: 'Take ownership of your tasks.' },
  // Client Space
  { icon: 'user-tie', text: 'Understand the client’s needs first.' },
  { icon: 'smile', text: 'Always be courteous and polite.' },
  { icon: 'star', text: 'Deliver quality work – exceed expectations.' },
  { icon: 'lock', text: 'Keep client data confidential.' },
  { icon: 'hand-holding-heart', text: 'Build trust through transparency.' },
  { icon: 'rocket', text: 'Be proactive – suggest improvements.' },
];

const Loader = ({ visible = false, onTimeout }) => {
  const { width, height } = useWindowDimensions();

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Tip rotation state
  const [tipIndex, setTipIndex] = useState(0);

  const timeoutRef = useRef(null);
  const tipIntervalRef = useRef(null);

  // Pick a random starting tip when loader becomes visible
  useEffect(() => {
    if (visible) {
      const randomIndex = Math.floor(Math.random() * TIPS.length);
      setTipIndex(randomIndex);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      // --- Animations ---
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
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

      // Fade in the tips
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      pulseAnimation.start();
      rotateAnimation.start();

      // --- Rotate tips every 3 seconds ---
      tipIntervalRef.current = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % TIPS.length);
      }, 3000);

      // --- Timeout (70 sec) ---
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
        clearInterval(tipIntervalRef.current);
        timeoutRef.current = null;
        tipIntervalRef.current = null;
        pulseAnim.setValue(1);
        rotateAnim.setValue(0);
        fadeAnim.setValue(0);
      };
    }
  }, [visible, pulseAnim, rotateAnim, fadeAnim, onTimeout]);

  if (!visible) return null;

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const currentTip = TIPS[tipIndex];

  return (
    <View style={[styles.overlay, { height, width }]}>
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)']}
        style={styles.gradient}
      >
        <Animated.View style={[styles.loaderCard, { transform: [{ scale: pulseAnim }] }]}>
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <FontAwesome5 name="atom" size={48} color={colors.primary} />
          </Animated.View>

          <Text style={styles.loadingText}>Loading...</Text>

          <Animated.View style={[styles.tipContainer, { opacity: fadeAnim }]}>
            <FontAwesome5 name={currentTip.icon} size={20} color={colors.primary} style={styles.tipIcon} />
            <Text style={styles.tipText}>{currentTip.text}</Text>
          </Animated.View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderCard: {
    width: 280,
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingVertical: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
    elevation: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    width: '100%',
  },
  tipIcon: {
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 10,
    color: '#334155',
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'left',
  },
});

export default Loader;
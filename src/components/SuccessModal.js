import React, { useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components/native';
import {
  Modal,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Dimensions,
} from 'react-native';
// NOTE: original file imported `colors` twice, which is a duplicate-identifier error.
import { colors } from '../Styles/appStyle';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* =========================================================
   Overlay (full screen)
========================================================= */

const Overlay = styled(Animated.View)`
  flex: 1;
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;
`;

/* =========================================================
   Shadow wrapper (shadow kept separate from overflow:hidden)
========================================================= */

const ShadowContainer = styled(Animated.View)`
  width: 85%;
  border-radius: 24px;
`;

/* =========================================================
   Card
========================================================= */

const ContentContainer = styled.View`
  width: 100%;
  background-color: #fff;
  border-radius: 24px;
  align-items: center;
  overflow: hidden;
`;

/* =========================================================
   Header
========================================================= */

const Header = styled.View`
  width: 100%;
  height: 110px;
  background-color: ${colors.primary};
  overflow: hidden;
`;

/* soft decorative circles inside the header */
const HeaderBubble = styled(Animated.View)`
  position: absolute;
  border-radius: 100px;
  background-color: rgba(255, 255, 255, 0.14);
`;

/* diagonal light sweep */
const Shimmer = styled(Animated.View)`
  position: absolute;
  top: -40px;
  width: 50px;
  height: 200px;
  background-color: rgba(255, 255, 255, 0.18);
`;

/* =========================================================
   Icon area (rings + particles + badge)
========================================================= */

const IconWrapper = styled.View`
  width: 76px;
  height: 76px;
  margin-top: -38px;
  justify-content: center;
  align-items: center;
`;

const Ring = styled(Animated.View)`
  position: absolute;
  width: 76px;
  height: 76px;
  border-radius: 38px;
  border-width: 2px;
  border-color: ${colors.primary};
`;

const Particle = styled(Animated.View)`
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 2px;
`;

const IconContainer = styled(Animated.View)`
  width: 76px;
  height: 76px;
  border-radius: 38px;
  background-color: #fff;
  justify-content: center;
  align-items: center;
  border-width: 3px;
  border-color: #fff;
`;

const CheckmarkCircle = styled(Animated.View)`
  width: 62px;
  height: 62px;
  border-radius: 31px;
  background-color: ${colors.primary};
  justify-content: center;
  align-items: center;
`;

const Checkmark = styled(Animated.Text)`
  color: #fff;
  font-size: 34px;
  font-weight: 400;
  line-height: 38px;
`;

/* =========================================================
   Body
========================================================= */

const ContentBody = styled.View`
  width: 100%;
  padding: 20px 20px 28px 20px;
  align-items: center;
`;

const MessageText = styled(Animated.Text)`
  font-size: 26px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
  letter-spacing: 0.3px;
  font-family: ${Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium'};
`;

const SubText = styled(Animated.Text)`
  font-size: 15px;
  color: #666;
  text-align: center;
  margin-bottom: 28px;
  line-height: 22px;
  padding-horizontal: 16px;
  letter-spacing: 0.2px;
  font-family: ${Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif'};
`;

/* =========================================================
   Button
========================================================= */

const ButtonWrap = styled(Animated.View)`
  width: 100%;
`;

const CloseButton = styled.TouchableOpacity`
  width: 100%;
  height: 52px;
  border-radius: 14px;
  overflow: hidden;
  background-color: ${colors.primary};
`;

const CloseButtonText = styled.Text`
  color: #fff;
  font-weight: 600;
  font-size: 16px;
  letter-spacing: 1px;
  font-family: ${Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium'};
  text-align: center;
  line-height: 52px;
`;

const ProgressBar = styled(Animated.View)`
  height: 4px;
  background-color: rgba(255, 255, 255, 0.45);
  position: absolute;
  bottom: 0;
  left: 0;
`;

/* =========================================================
   Native shadow styles
========================================================= */

const styles = StyleSheet.create({
  modalShadow: {
    borderRadius: 24,
    elevation: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
  },
});

/* =========================================================
   Confetti configuration
========================================================= */

const PARTICLE_COLORS = [
  '#FFC107',
  '#FF7043',
  '#42A5F5',
  '#66BB6A',
  '#AB47BC',
  '#FF4081',
];
const PARTICLE_COUNT = 12;

/* =========================================================
   Success Modal
========================================================= */

const SuccessModal = ({ visible, onClose, message }) => {
  // --- original values ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const iconBounce = useRef(new Animated.Value(0)).current;

  // --- new visual-only values ---
  const badgeScale = useRef(new Animated.Value(0)).current;
  const checkRotate = useRef(new Animated.Value(0)).current;
  const burstAnim = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const bubbleFloat = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const subAnim = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(0)).current;
  const btnPress = useRef(new Animated.Value(1)).current;

  // Pre-computed particle directions
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (i % 2) * 0.2;
        const distance = 62 + (i % 3) * 16;
        return {
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
          spin: i % 2 === 0 ? '180deg' : '-180deg',
          round: i % 3 === 0,
        };
      }),
    []
  );

  const stopLoops = () => {
    iconBounce.stopAnimation();
    rotateAnim.stopAnimation();
    progressAnim.stopAnimation();
    ring1.stopAnimation();
    ring2.stopAnimation();
    shimmerAnim.stopAnimation();
    bubbleFloat.stopAnimation();
  };

  useEffect(() => {
    if (!visible) {
      stopLoops();
      return;
    }

    /* ---------- Reset ---------- */
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.9);
    slideAnim.setValue(30);
    progressAnim.setValue(1);
    checkmarkScale.setValue(0);
    rotateAnim.setValue(0);
    iconBounce.setValue(0);

    badgeScale.setValue(0);
    checkRotate.setValue(0);
    burstAnim.setValue(0);
    ring1.setValue(0);
    ring2.setValue(0);
    shimmerAnim.setValue(0);
    bubbleFloat.setValue(0);
    titleAnim.setValue(0);
    subAnim.setValue(0);
    btnAnim.setValue(0);
    btnPress.setValue(1);

    /* ---------- Card entrance ---------- */
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    /* ---------- Badge pop + checkmark ---------- */
    Animated.sequence([
      Animated.delay(180),
      Animated.spring(badgeScale, {
        toValue: 1,
        friction: 5,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(380),
      Animated.parallel([
        Animated.spring(checkmarkScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(checkRotate, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.8)),
        }),
      ]),
    ]).start();

    /* ---------- Confetti burst ---------- */
    Animated.sequence([
      Animated.delay(420),
      Animated.timing(burstAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    /* ---------- Icon tilt ---------- */
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 600,
      delay: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.back(1.5)),
    }).start();

    /* ---------- Gentle idle float ---------- */
    Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(iconBounce, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();

    /* ---------- Pulse rings (staggered) ---------- */
    const pulse = (val, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 1600,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad),
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    pulse(ring1, 500).start();
    pulse(ring2, 1300).start();

    /* ---------- Header shimmer + floating bubbles ---------- */
    Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic),
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(900),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bubbleFloat, {
          toValue: 1,
          duration: 2800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(bubbleFloat, {
          toValue: 0,
          duration: 2800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();

    /* ---------- Staggered text + button ---------- */
    const reveal = (val, delay) =>
      Animated.timing(val, {
        toValue: 1,
        duration: 450,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      });
    reveal(titleAnim, 450).start();
    reveal(subAnim, 580).start();
    reveal(btnAnim, 710).start();

    /* ---------- Progress bar ---------- */
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 5000,
      useNativeDriver: false,
      easing: Easing.linear,
    }).start();

    /* ---------- Auto close ---------- */
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => {
      clearTimeout(timer);
      stopLoops();
    };
  }, [visible]);

  /* =======================================================
     Close
  ======================================================= */

  const handleClose = () => {
    iconBounce.stopAnimation();
    rotateAnim.stopAnimation();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  /* =======================================================
     Interpolations
  ======================================================= */

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '8deg'],
  });

  const bounceInterpolate = iconBounce.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -4, 0],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const checkRotateInterpolate = checkRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-35deg', '0deg'],
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, SCREEN_WIDTH],
  });

  const bubbleA = bubbleFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  const bubbleB = bubbleFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });

  const ringStyle = (val) => ({
    opacity: val.interpolate({
      inputRange: [0, 0.15, 1],
      outputRange: [0, 0.45, 0],
    }),
    transform: [
      {
        scale: val.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.9],
        }),
      },
    ],
  });

  const rise = (val, from = 16) => ({
    opacity: val,
    transform: [
      {
        translateY: val.interpolate({
          inputRange: [0, 1],
          outputRange: [from, 0],
        }),
      },
    ],
  });

  /* =======================================================
     Render
  ======================================================= */

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <Overlay
        style={{
          backgroundColor: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)'],
          }),
        }}
      >
        <ShadowContainer
          style={[
            styles.modalShadow,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            },
          ]}
        >
          <ContentContainer>
            {/* ---------------- Header ---------------- */}
            <Header>
              <HeaderBubble
                style={{
                  width: 120,
                  height: 120,
                  top: -40,
                  left: -30,
                  transform: [{ translateY: bubbleA }],
                }}
              />
              <HeaderBubble
                style={{
                  width: 90,
                  height: 90,
                  top: 20,
                  right: -20,
                  transform: [{ translateY: bubbleB }],
                }}
              />
              <HeaderBubble
                style={{
                  width: 36,
                  height: 36,
                  top: 18,
                  right: 80,
                  transform: [{ translateY: bubbleA }],
                }}
              />
              <Shimmer
                style={{
                  transform: [
                    { translateX: shimmerTranslate },
                    { rotate: '20deg' },
                  ],
                }}
              />
            </Header>

            {/* ---------------- Icon ---------------- */}
            <IconWrapper>
              {/* Pulse rings */}
              <Ring style={ringStyle(ring1)} />
              <Ring style={ringStyle(ring2)} />

              {/* Confetti burst */}
              {particles.map((p, i) => (
                <Particle
                  key={i}
                  style={{
                    backgroundColor: p.color,
                    borderRadius: p.round ? 4 : 2,
                    opacity: burstAnim.interpolate({
                      inputRange: [0, 0.1, 0.7, 1],
                      outputRange: [0, 1, 1, 0],
                    }),
                    transform: [
                      {
                        translateX: burstAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, p.dx],
                        }),
                      },
                      {
                        translateY: burstAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, p.dy],
                        }),
                      },
                      {
                        rotate: burstAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', p.spin],
                        }),
                      },
                      {
                        scale: burstAnim.interpolate({
                          inputRange: [0, 0.2, 1],
                          outputRange: [0, 1.2, 0.5],
                        }),
                      },
                    ],
                  }}
                />
              ))}

              {/* Badge */}
              <IconContainer
                style={{
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 8,
                  elevation: 6,
                  transform: [
                    { scale: badgeScale },
                    { rotate: rotateInterpolate },
                    { translateY: bounceInterpolate },
                  ],
                }}
              >
                <CheckmarkCircle
                  style={{ transform: [{ scale: checkmarkScale }] }}
                >
                  <Checkmark
                    style={{
                      transform: [{ rotate: checkRotateInterpolate }],
                    }}
                  >
                    ✓
                  </Checkmark>
                </CheckmarkCircle>
              </IconContainer>
            </IconWrapper>

            {/* ---------------- Body ---------------- */}
            <ContentBody>
              <MessageText style={rise(titleAnim)}>Success!</MessageText>

              <SubText style={rise(subAnim)}>
                {message || 'Your action has been completed successfully.'}
              </SubText>

              <ButtonWrap
                style={[
                  rise(btnAnim, 20),
                  { transform: [...rise(btnAnim, 20).transform, { scale: btnPress }] },
                ]}
              >
                <CloseButton
                  onPress={handleClose}
                  onPressIn={() =>
                    Animated.spring(btnPress, {
                      toValue: 0.96,
                      friction: 6,
                      useNativeDriver: true,
                    }).start()
                  }
                  onPressOut={() =>
                    Animated.spring(btnPress, {
                      toValue: 1,
                      friction: 4,
                      useNativeDriver: true,
                    }).start()
                  }
                  activeOpacity={0.9}
                >
                  <CloseButtonText>CLOSE</CloseButtonText>
                  <ProgressBar style={{ width: progressWidth }} />
                </CloseButton>
              </ButtonWrap>
            </ContentBody>
          </ContentContainer>
        </ShadowContainer>
      </Overlay>
    </Modal>
  );
};

export default SuccessModal;
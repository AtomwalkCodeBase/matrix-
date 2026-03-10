import React, { useEffect, useRef } from 'react';
import styled from 'styled-components/native';
import { Modal, View, Image, Text, TouchableOpacity, Animated, Easing, Platform } from 'react-native';

const ModalContainer = styled.Modal`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const Overlay = styled(Animated.View)`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const ContentContainer = styled(Animated.View)`
  width: 85%;
  background-color: #fff;
  border-radius: 20px;
  align-items: center;
  overflow: hidden;
  elevation: 24;
  shadow-color: #000;
  shadow-offset: 0px 12px;
  shadow-opacity: 0.35;
  shadow-radius: 16px;
`;

const GradientHeader = styled.View`
  width: 100%;
  height: 100px;
  justify-content: center;
  align-items: center;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  background-color: #1456a7;
`;

const IconContainer = styled(Animated.View)`
  width: 70px;
  height: 70px;
  border-radius: 35px;
  background-color: #fff;
  justify-content: center;
  align-items: center;
  margin-top: -35px;
  elevation: 6;
  shadow-color: #1456a7;
  shadow-offset: 0px 3px;
  shadow-opacity: 0.2;
  shadow-radius: 4px;
  border-width: 2px;
  border-color: #1456a7;
`;

const IconImage = styled(Image)`
  width: 40px;
  height: 40px;
  tint-color: #1456a7;
`;

const ContentBody = styled.View`
  padding: 24px 20px 30px 20px;
  align-items: center;
  width: 100%;
`;

const MessageText = styled(Animated.Text)`
  font-size: 24px;
  font-weight: 600;
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

const CloseButton = styled.TouchableOpacity`
  width: 100%;
  height: 52px;
  border-radius: 12px;
  overflow: hidden;
  elevation: 2;
  shadow-color: #1456a7;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.2;
  shadow-radius: 4px;
  background-color: #1456a7;
`;

const CloseButtonText = styled.Text`
  color: #fff;
  font-weight: 600;
  font-size: 16px;
  letter-spacing: 0.5px;
  font-family: ${Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium'};
  text-align: center;
  line-height: 52px;
`;

const ProgressBar = styled(Animated.View)`
  height: 4px;
  background-color: rgba(255, 255, 255, 0.4);
  position: absolute;
  bottom: 0;
  left: 0;
`;

const CheckmarkCircle = styled(Animated.View)`
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background-color: #1456a7;
  justify-content: center;
  align-items: center;
  border-width: 2px;
  border-color: #fff;
`;

const Checkmark = styled(Animated.Text)`
  color: #fff;
  font-size: 32px;
  font-weight: 300;
  line-height: 32px;
`;

const SuccessModal = ({ visible, onClose, message }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const iconBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      slideAnim.setValue(30);
      progressAnim.setValue(1);
      checkmarkScale.setValue(0);
      rotateAnim.setValue(0);
      iconBounce.setValue(0);

      // Sequence of professional animations
      Animated.parallel([
        // Fade in overlay
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        
        // Scale and slide up content
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 60,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
        ]),
      ]).start();

      // Animated checkmark appearance
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(checkmarkScale, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();

      // Subtle icon rotation
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }).start();

      // Gentle bounce effect
      Animated.loop(
        Animated.sequence([
          Animated.delay(800),
          Animated.timing(iconBounce, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ])
      ).start();

      // Progress bar animation for auto-close
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 5000,
        useNativeDriver: false,
        easing: Easing.linear,
      }).start();

      const timer = setTimeout(() => {
        handleClose();
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      // Stop all animations when modal closes
      iconBounce.stopAnimation();
      rotateAnim.stopAnimation();
    }
  }, [visible]);

  const handleClose = () => {
    // Stop any ongoing animations
    iconBounce.stopAnimation();
    rotateAnim.stopAnimation();
    
    // Exit animation
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

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '10deg'],
  });

  const bounceInterpolate = iconBounce.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -3, 0],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <ModalContainer
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <Overlay style={{ backgroundColor: fadeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)']
      })}}>
        <ContentContainer
          style={{
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim }
            ],
          }}
        >
          <GradientHeader>
            {/* Empty header with primary color */}
          </GradientHeader>

          <IconContainer
            style={{
              transform: [
                { rotate: rotateInterpolate },
                { translateY: bounceInterpolate }
              ],
            }}
          >
            <CheckmarkCircle
              style={{
                transform: [{ scale: checkmarkScale }],
              }}
            >
              <Checkmark>✓</Checkmark>
            </CheckmarkCircle>
          </IconContainer>

          <ContentBody>
            <MessageText
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              Success!
            </MessageText>
            
            <SubText
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              {message || "Your action has been completed successfully."}
            </SubText>
            
            <CloseButton onPress={handleClose} activeOpacity={0.9}>
              <CloseButtonText>CLOSE</CloseButtonText>
              <ProgressBar style={{ width: progressWidth }} />
            </CloseButton>
          </ContentBody>
        </ContentContainer>
      </Overlay>
    </ModalContainer>
  );
};

export default SuccessModal;
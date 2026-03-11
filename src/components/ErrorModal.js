import React, { useEffect, useRef } from 'react';
import { Modal, Platform, Animated, Easing } from 'react-native';
import styled from 'styled-components/native';

const ModalContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
`;

const ModalContent = styled(Animated.View)`
  width: 90%;
  max-width: 340px;
  background-color: #fff;
  border-radius: 20px;
  overflow: hidden;
  elevation: 24;
  shadow-color: #000;
  shadow-offset: 0px 12px;
  shadow-opacity: 0.25;
  shadow-radius: 16px;
`;

const HeaderBar = styled.View`
  height: 8px;
  width: 100%;
  background-color: #d32f2f;
`;

const ContentContainer = styled.View`
  padding: 32px 24px 28px 24px;
  align-items: center;
`;

const IconContainer = styled(Animated.View)`
  width: 88px;
  height: 88px;
  border-radius: 44px;
  background-color: #ffebee;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  border-width: 2px;
  border-color: #d32f2f;
  border-style: dashed;
`;

const IconText = styled(Animated.Text)`
  font-size: 44px;
  font-weight: 300;
  color: #d32f2f;
  line-height: 48px;
  text-align: center;
`;

const TitleText = styled(Animated.Text)`
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
  letter-spacing: -0.3px;
  font-family: ${Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif-medium'};
`;

const MessageText = styled(Animated.Text)`
  font-size: 15px;
  color: #666;
  text-align: center;
  margin-bottom: 28px;
  line-height: 22px;
  padding-horizontal: 8px;
  letter-spacing: 0.2px;
  font-family: ${Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif'};
`;

const ButtonContainer = styled.View`
  flex-direction: row;
  width: 100%;
  gap: 12px;
`;

const ModalButton = styled.TouchableOpacity`
  flex: 1;
  height: 48px;
  border-radius: 12px;
  background-color: ${({ secondary }) => secondary ? '#f8f9fa' : '#d32f2f'};
  justify-content: center;
  align-items: center;
  border-width: ${({ secondary }) => secondary ? '1px' : '0px'};
  border-color: ${({ secondary }) => secondary ? '#e0e0e0' : 'transparent'};
  elevation: ${({ secondary }) => secondary ? 0 : 2};
  shadow-color: ${({ secondary }) => secondary ? 'transparent' : '#d32f2f'};
  shadow-offset: 0px 4px;
  shadow-opacity: 0.2;
  shadow-radius: 6px;
`;

const ButtonText = styled.Text`
  color: ${({ secondary }) => secondary ? '#666' : '#fff'};
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.3px;
  font-family: ${Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif-medium'};
`;

const ErrorCode = styled(Animated.Text)`
  font-size: 12px;
  color: #999;
  margin-top: 16px;
  font-family: ${Platform.OS === 'ios' ? 'SF Mono' : 'monospace'};
`;

const ErrorModal = ({ visible, label = "Error", message, onClose, onRetry }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      slideAnim.setValue(20);
      rotateAnim.setValue(0);
      pulseAnim.setValue(1);
      shakeAnim.setValue(0);

      // Entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
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
      ]).start();

      // Gentle pulse animation for icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ])
      ).start();

      // Subtle rotation animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
        ])
      ).start();

      // Gentle shake effect at start
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(shakeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Clean up animations
      pulseAnim.stopAnimation();
      rotateAnim.stopAnimation();
      shakeAnim.stopAnimation();
    }
  }, [visible]);

  const handleClose = () => {
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
      pulseAnim.stopAnimation();
      rotateAnim.stopAnimation();
      shakeAnim.stopAnimation();
      onClose();
    });
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const shakeInterpolate = shakeAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -3, 0],
  });

  const pulseInterpolate = pulseAnim.interpolate({
    inputRange: [1, 1.05],
    outputRange: [1, 1.05],
  });

  return (
    <Modal transparent visible={visible} animationType="none">
      <ModalContainer>
        <ModalContent
          style={{
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim },
            ],
          }}
        >
          <HeaderBar />
          
          <ContentContainer>
            <IconContainer
              style={{
                transform: [
                  { rotate: rotateInterpolate },
                  { scale: pulseInterpolate },
                  { translateX: shakeInterpolate },
                ],
              }}
            >
              <IconText>!</IconText>
            </IconContainer>

            <TitleText
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              {label}
            </TitleText>

            <MessageText
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              {message || "We encountered an unexpected issue. Please try again."}
            </MessageText>

            <ButtonContainer>
              {onRetry && (
                <ModalButton onPress={onRetry} activeOpacity={0.8}>
                  <ButtonText>Retry</ButtonText>
                </ModalButton>
              )}
              <ModalButton 
                secondary={onRetry ? true : false} 
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <ButtonText secondary={onRetry ? true : false}>
                  Close
                </ButtonText>
              </ModalButton>
            </ButtonContainer>

            
          </ContentContainer>
        </ModalContent>
      </ModalContainer>
    </Modal>
  );
};

export default ErrorModal;
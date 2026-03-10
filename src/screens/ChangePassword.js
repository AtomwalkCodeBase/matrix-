import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Animated, ScrollView, KeyboardAvoidingView, Platform, BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';
import { setUserPinView } from '../services/productServices';
import { colors } from '../Styles/appStyle';
import HeaderComponent from '../components/HeaderComponent';
import SuccessModal from '../components/SuccessModal';
import Loader from '../components/old_components/Loader';
import { SafeAreaView } from 'react-native-safe-area-context';

const ResetPasswordScreen = () => {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isFocusedOld, setIsFocusedOld] = useState(false);
  const [isFocusedNew, setIsFocusedNew] = useState(false);
  const [isFocusedConfirm, setIsFocusedConfirm] = useState(false);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMandatoryReset, setIsMandatoryReset] = useState(false);

  const shakeAnim = new Animated.Value(0);
  const router = useRouter();

  // Check if this is a mandatory reset (user has default PIN 9999)
  useEffect(() => {
    const checkDefaultPin = async () => {
      try {
        const userPin = await AsyncStorage.getItem('userPin');
        if (userPin === '9999') {
          setIsMandatoryReset(true);
        }
      } catch (error) {
        console.error('Error checking default PIN:', error);
      }
    };
    checkDefaultPin();
  }, []);

  // Handle hardware back button on Android for mandatory reset
  useEffect(() => {
    if (isMandatoryReset) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        Alert.alert(
          'PIN Update Required',
          'You must update your default PIN to continue using the app.',
          [{ text: 'OK' }]
        );
        return true; // Prevent default back behavior
      });

      return () => backHandler.remove();
    }
  }, [isMandatoryReset]);

  const handleCancel = async () => {
    if (isMandatoryReset) {
      Alert.alert(
        'PIN Update Required',
        'You must update your default PIN to continue using the app.',
        [{ text: 'OK' }]
      );
    } else {
      router.back();
    }
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      const oldPinNum = await AsyncStorage.getItem('userPin');
      const employeeId = await AsyncStorage.getItem("empId");

      // Validation checks
      if (!oldPin || !newPin || !confirmPin) {
        setErrorMessage('All fields are required.');
        triggerShake();
        setIsLoading(false);
        return;
      }

      if (newPin !== confirmPin) {
        setErrorMessage('New PIN and Confirm PIN do not match.');
        triggerShake();
        setIsLoading(false);
        return;
      }

      if (oldPinNum !== oldPin) {
        setErrorMessage('Old Pin is not correct.');
        triggerShake();
        setIsLoading(false);
        return;
      }

      if (newPin == oldPin) {
        setErrorMessage('Old and new PINs must be different.');
        triggerShake();
        setIsLoading(false);
        return;
      }

      if (newPin.length < 4) {
        setErrorMessage('Please enter a PIN with at least 4 digits.');
        triggerShake();
        setIsLoading(false);
        return;
      }

      // Add validation for default PIN '9999'
      if (newPin === '9999') {
        setErrorMessage('Cannot set PIN to default value (9999). Please choose a different PIN.');
        triggerShake();
        setIsLoading(false);
        return;
      }

      const response = await setUserPinView(oldPin, newPin, employeeId);

      if (response && response.status) {
        await AsyncStorage.setItem('userPin', newPin);
        setIsLoading(false);
        setIsSuccessModalVisible(true);
      } else {
        const errorMsg = response?.message || 'Failed to update PIN. Please try again.';
        setErrorMessage(errorMsg);
        triggerShake();
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      let errorMsg = 'An error occurred while updating your PIN.';
      
      if (error.response) {
        errorMsg = error.response.data?.message || error.response.statusText || errorMsg;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
      triggerShake();
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <HeaderComponent
        headerTitle="Update Your PIN"
        onBackPress={handleCancel}
        showBackButton={!isMandatoryReset} // This assumes your HeaderComponent accepts this prop
      /> 
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.headerSection}>
              <MaterialIcons name="lock" size={48} color={colors.primary} />
              <Text style={styles.title}>
                Update Your PIN
              </Text>
              <Text style={styles.subtitle}>
                {isMandatoryReset 
                  ? "You must update your default PIN to continue using the app."
                  : "Change the secure PIN for your account"}
              </Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current PIN</Text>
                <View style={[
                  styles.inputContainer, 
                  isFocusedOld && styles.focusedInput,
                  oldPin && styles.filledInput
                ]}>
                  <MaterialIcons name="lock-outline" size={20} color={isFocusedOld ? colors.primary : colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your current PIN"
                    secureTextEntry
                    keyboardType="numeric"
                    maxLength={6}
                    value={oldPin}
                    onChangeText={setOldPin}
                    placeholderTextColor={colors.grey}
                    onFocus={() => setIsFocusedOld(true)}
                    onBlur={() => setIsFocusedOld(false)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New PIN</Text>
                <View style={[
                  styles.inputContainer, 
                  isFocusedNew && styles.focusedInput,
                  newPin && styles.filledInput
                ]}>
                  <MaterialIcons name="vpn-key" size={20} color={isFocusedNew ? colors.primary : colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your new PIN"
                    keyboardType="numeric"
                    maxLength={6}
                    value={newPin}
                    onChangeText={setNewPin}
                    secureTextEntry
                    placeholderTextColor={colors.grey}
                    onFocus={() => setIsFocusedNew(true)}
                    onBlur={() => setIsFocusedNew(false)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New PIN</Text>
                <View style={[
                  styles.inputContainer, 
                  isFocusedConfirm && styles.focusedInput,
                  confirmPin && styles.filledInput
                ]}>
                  <MaterialIcons name="check-circle-outline" size={20} color={isFocusedConfirm ? colors.primary : colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your new PIN"
                    keyboardType="numeric"
                    maxLength={6}
                    value={confirmPin}
                    onChangeText={setConfirmPin}
                    secureTextEntry
                    placeholderTextColor={colors.grey}
                    onFocus={() => setIsFocusedConfirm(true)}
                    onBlur={() => setIsFocusedConfirm(false)}
                  />
                </View>
              </View>

              {errorMessage ? (
                <Animated.View style={[styles.errorContainer, { transform: [{ translateX: shakeAnim }] }]}>
                  <MaterialIcons name="error-outline" size={18} color={colors.red} />
                  <Animated.Text style={styles.errorText}>
                    {errorMessage}
                  </Animated.Text>
                </Animated.View>
              ) : null}
              
              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={handleSubmit}
                activeOpacity={0.8}
              >
                <Text style={styles.submitText}>
                  Update PIN
                </Text>
                <MaterialIcons name="arrow-forward" size={20} color={colors.white} />
              </TouchableOpacity>
              
              {/* Only show cancel button if not mandatory reset */}
              {!isMandatoryReset && (
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.securityNote}>
              <MaterialIcons name="security" size={20} color={colors.warning} style={styles.noteIcon} />
              <View>
                <Text style={styles.noteTitle}>Security Notice</Text>
                <Text style={styles.noteText}>
                  <Text style={styles.bulletPoint}>• </Text>
                  Your PIN helps keep your account secure
                  {'\n'}
                  <Text style={styles.bulletPoint}>• </Text>
                  Never share your PIN with anyone
                  {'\n'}
                  <Text style={styles.bulletPoint}>• </Text>
                  If you've updated your PIN using web app, please logout and login again with your new PIN.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessModal
        visible={isSuccessModalVisible}
        onClose={() => {
          setIsSuccessModalVisible(false);
          if (isMandatoryReset) {
            router.replace('home'); // Use replace for mandatory reset
          } else {
            router.back();
          }
        }}
        message="Your PIN has been updated successfully."
      />
      <Loader 
        visible={isLoading}
        onTimeout={() => {
          setIsLoading(false);
          setErrorMessage('Request timed out. Please try again.');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.background,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 8,
    paddingLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundDark,
  },
  focusedInput: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: `${colors.primary}10`,
  },
  filledInput: {
    backgroundColor: colors.white,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    padding: 0, // Removes default padding on some devices
    letterSpacing: 2, // Adds spacing between characters for PIN input
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    // backgroundColor: `${colors.error}15`,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: colors.red,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  submitButton: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: 12,
    flexDirection: 'row',
  },
  submitText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  cancelButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.red,
  },
  cancelText: {
    color: colors.red,
    fontSize: 16,
    fontWeight: '500',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${colors.warning}15`,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  noteIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.warning,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bulletPoint: {
    fontWeight: 'bold',
    color: colors.warning,
  },
});

export default ResetPasswordScreen;
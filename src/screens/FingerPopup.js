import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import Modal from 'react-native-modal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';

const FingerPopup = () => {
    const [isPopupVisible, setIsPopupVisible] = useState(false);
    const [biometricType, setBiometricType] = useState('fingerprint');
    const router = useRouter();

    useEffect(() => {
        // iOS uses Face ID (or Touch ID on older devices); Android uses fingerprint
        if (Platform.OS === 'ios') {
            setBiometricType('face');
        } else {
            setBiometricType('fingerprint');
        }
    }, []);

    useEffect(() => {
        const checkFingerprintSupportAndPreference = async () => {
            const hardwareSupported = await LocalAuthentication.hasHardwareAsync();
            const fingerprintsEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hardwareSupported || !fingerprintsEnrolled) {
                await AsyncStorage.setItem('fingerprintSupported', 'false');
                return; // Don't show the popup
            }

            // Fingerprint is supported
            const useFingerprint = await AsyncStorage.getItem('useFingerprint');

            // Show popup only if user hasn't selected anything yet
            if (useFingerprint === null) {
                setIsPopupVisible(true);
            }
        };

        checkFingerprintSupportAndPreference();
    }, []);

    const handleYes = async () => {
        await AsyncStorage.setItem('useFingerprint', 'true');
        setIsPopupVisible(false);
    };

    const handleNo = async () => {
        await AsyncStorage.setItem('useFingerprint', 'false');
        setIsPopupVisible(false);
    };

    const handleClose = () => {
        setIsPopupVisible(false); // Do not set anything, so it reappears on next load
    };

    return (
        <Modal isVisible={isPopupVisible} animationIn="zoomIn" animationOut="zoomOut">
            <View style={styles.popupContainer}>
                {/* Close Icon */}
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                    <Text style={styles.closeText}>X</Text>
                </TouchableOpacity>

                {/* Icon */}
                <Image source={require('../../assets/images/pin.png')} style={styles.icon} />

                {/* Message */}
                <Text style={styles.message}>Would you like to set your {biometricType === 'face' ? 'Face ID' : 'Fingerprint'} for Login?</Text>

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.yesButton} onPress={handleYes}>
                        <Text style={styles.buttonText}>YES</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.noButton} onPress={handleNo}>
                        <Text style={styles.buttonText}>NO</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    popupContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        padding: 10,
    },
    closeText: {
        fontSize: 18,
        color: 'black',
    },
    icon: {
        width: 50,
        height: 50,
        marginBottom: 20,
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    yesButton: {
        backgroundColor: '#4CAF50',
        padding: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    noButton: {
        backgroundColor: '#F44336',
        padding: 10,
        borderRadius: 5,
    },
    buttonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
});

export default FingerPopup;

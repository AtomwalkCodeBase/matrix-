import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, ActivityIndicator, Image, TouchableOpacity, AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { LinearGradient } from 'expo-linear-gradient';

const NetworkErrorModal = ({ visible, onNetworkRestore, onRetry }) => {
    const [isVisible, setIsVisible] = useState(!!visible);

    // Remember whether we were offline, so onNetworkRestore fires only on a real offline -> online change
    const wasOffline = useRef(!!visible);

    // Always call the latest callback without re-subscribing
    const restoreRef = useRef(onNetworkRestore);
    restoreRef.current = onNetworkRestore;

    const handleState = (state) => {
        if (state.isConnected === false) {
            wasOffline.current = true;
            setIsVisible(true);
        } else if (state.isConnected === true) {
            // isConnected can be null while the state is unknown (mostly at startup);
            // that is ignored so the modal does not flash on launch.
            setIsVisible(false);
            if (wasOffline.current) {
                wasOffline.current = false;
                restoreRef.current?.(); // Notify parent that network is back
            }
        }
    };

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(handleState);
        return () => unsubscribe();
    }, []);

    // iOS can keep a stale network state after the app was in the background,
    // so re-check whenever the app comes back to the foreground.
    useEffect(() => {
        const sub = AppState.addEventListener('change', (nextState) => {
            if (nextState === 'active') {
                NetInfo.refresh().then(handleState).catch(() => {});
            }
        });
        return () => sub.remove();
    }, []);

    const handleRetry = async () => {
        try {
            const state = await NetInfo.refresh(); // force a fresh check
            handleState(state);
        } catch (e) {
            // ignore, the listener will update when the connection changes
        }
        onRetry?.();
    };

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="fade"
            statusBarTranslucent
            supportedOrientations={['portrait']} // iOS: your app is portrait-only
            onRequestClose={() => {}} // Android back button: keep the modal until the network is back
        >
            <View style={styles.modalOverlay}>
                <LinearGradient colors={['#6a11cb', '#2575fc']} style={styles.modalContainer}>
                    {/* Ensure Image Path is Correct */}
                    <Image source={require('../../assets/images/no-internet.png')} style={styles.image} />

                    <Text style={styles.title}>No Internet Connection</Text>
                    <Text style={styles.subtitle}>
                        Please check your internet connection. The app will resume when the connection is restored.
                    </Text>

                    <ActivityIndicator size="large" color="white" style={{ marginBottom: 10 }} />

                    {/* Retry Button */}
                    {onRetry && (
                        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    )}
                </LinearGradient>
            </View>
        </Modal>
    );
};

const styles = {
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        width: 320,
        padding: 25,
        borderRadius: 15,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    image: {
        width: 100,
        height: 100,
        marginBottom: 15,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: 'white',
        opacity: 0.9,
        textAlign: 'center',
        marginBottom: 15,
    },
    retryButton: {
        marginTop: 10,
        backgroundColor: '#28a745',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
};

export default NetworkErrorModal;
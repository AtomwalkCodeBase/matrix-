import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Platform,
  Animated,
  Easing
} from 'react-native';

const ConfirmationModal = ({ 
  visible, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  color,
  messageColor,
  headerTitle
}) => {
  const scaleValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }).start();
    } else {
      scaleValue.setValue(0);
    }
  }, [visible]);

  const handleConfirm = async () => {
    // First close the modal
    if (onCancel) {
      onCancel();
    }
    
    // Small delay to ensure modal close animation completes
    setTimeout(() => {
      if (onConfirm) {
        onConfirm();
      }
    }, 200);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleCancel}
      statusBarTranslucent={true}
    >
      <View style={styles.centeredView}>
        <Animated.View style={[
          styles.modalView,
          { transform: [{ scale: scaleValue }] }
        ]}>
          <MaterialIcons name="clear" size={24} color="black" onPress={handleCancel} style={styles.cancel} />
          <Text style={styles.modalTitle}>{headerTitle ? headerTitle : "Confirmation"}</Text>
          <Text style={[styles.modalText, messageColor && { color: messageColor }]}>{message}</Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              activeOpacity={0.7}
              accessibilityLabel={cancelText}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>{cancelText}</Text>
            </TouchableOpacity>
            
            <View style={styles.buttonDivider} />
            
            <TouchableOpacity
              style={[
                styles.button,
                color ? { backgroundColor: color, marginLeft: 8 } : styles.confirmButton
              ]}
              onPress={handleConfirm}
              activeOpacity={0.7}
              accessibilityLabel={confirmText}
            >
              <Text style={styles.buttonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
  },
  modalView: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#F5F5F7',
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButtonText: {
    color: '#333',
  },
  buttonDivider: {
    width: 12,
  },
  cancel: {
    position: "absolute",
    right: "7%",
    top: "7%"
  }
});

export default ConfirmationModal;
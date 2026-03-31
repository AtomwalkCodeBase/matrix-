// components/ReusableRemarkModal.js
import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import RemarksInput from './RemarkInput';
import AmountInput from './AmountInput';
import { colors } from '../Styles/appStyle';

const RemarkModals = ({
  visible,
  onClose,
  onSubmit,
  title = 'Remarks',
  placeholder = 'Please enter your remarks',
  buttonText = 'Submit',
  remark,
  setRemark,
  error,
  isLoading = false,
  type = "text",
  errorMessage
}) => {
  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit();
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Feather name="x" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {type === "text" ? <RemarksInput
              remark={remark}
              label={false}
              setRemark={setRemark}
              error={error}
              placeholder={placeholder}
          /> : <AmountInput
              placeholder="Enter Pincode (eg: XXXXXX)"
              claimAmount={remark}
              setClaimAmount={setRemark}
          />}
          {errorMessage &&
            <Text style={{color: colors.red, marginBottom: "15"}}>{errorMessage}</Text>
          }

          <TouchableOpacity
            style={[styles.modalSubmitButton, isLoading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.modalSubmitText}>
              {isLoading ? 'Submitting...' : buttonText}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalSubmitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  modalSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    opacity: 0.7,
  },
});

export default RemarkModals;
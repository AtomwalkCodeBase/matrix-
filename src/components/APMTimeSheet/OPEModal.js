import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../Styles/appStyle';

const PRIMARY_COLOR = colors.primary;

const OPEModal = ({ visible, onClose, project, onSubmit, pickImage }) => {
  const [opeAmount, setOpeAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal opens with new project
  React.useEffect(() => {
    if (visible && project) {
      // Pre-fill amount if updating existing
      const existingAmount = project?.original_A?.ope_amt || project?.original_P?.ope_amt;
      if (existingAmount && existingAmount !== "0.00") {
        setOpeAmount(existingAmount);
      } else {
        setOpeAmount('');
      }
      setRemarks('');
      setSelectedFile(null);
    }
  }, [visible, project]);

  const handlePickImage = async () => {
    const file = await pickImage();
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    // Validate amount
    if (!opeAmount || parseFloat(opeAmount) <= 0) {
      Alert.alert('Validation', 'Please enter a valid OPE amount');
      return;
    }

    setIsSubmitting(true);
    const success = await onSubmit({
      opeAmount,
      remarks,
      file: selectedFile,
    });
    setIsSubmitting(false);

    if (success) {
      // Reset and close on success
      setOpeAmount('');
      setRemarks('');
      setSelectedFile(null);
      onClose();
    }
  };

  if (!project) return null;

  const isUpdate = project?.original_A?.ope_amt && project.original_A.ope_amt !== "0.00";
  const customerName = project?.customer_name || 'Unknown Customer';
  const orderKey = project?.order_item_key || '';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isUpdate ? 'Update OPE Amount' : 'Add OPE Amount'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Project Info */}
            <View style={styles.projectInfo}>
              <Text style={styles.customerName}>{customerName}</Text>
              <Text style={styles.orderKey}>{orderKey}</Text>
            </View>

            {/* OPE Amount Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>OPE Amount (₹) *</Text>
              <View style={styles.amountInputWrapper}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  value={opeAmount}
                  onChangeText={setOpeAmount}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* File Upload */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Supporting Document (Optional)</Text>
              <TouchableOpacity 
                style={styles.uploadButton} 
                onPress={handlePickImage}
                disabled={isSubmitting}
              >
                <Ionicons name="cloud-upload-outline" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.uploadButtonText}>
                  {selectedFile ? 'Change File' : 'Upload File'}
                </Text>
              </TouchableOpacity>

              {/* Selected File Preview */}
              {selectedFile && (
                <View style={styles.filePreview}>
                  <View style={styles.fileInfo}>
                    <Ionicons name="document-outline" size={20} color={PRIMARY_COLOR} />
                    <Text style={styles.fileName} numberOfLines={1}>
                      {selectedFile.name}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedFile(null)}>
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Remarks Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Remarks (Optional)</Text>
              <TextInput
                style={styles.remarksInput}
                placeholder="Enter any remarks"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={remarks}
                onChangeText={setRemarks}
                editable={!isSubmitting}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Text style={styles.submitButtonText}>Submitting...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>
                    {isUpdate ? 'Update OPE Amount' : 'Submit OPE Amount'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  projectInfo: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  orderKey: {
    fontSize: 13,
    color: '#64748b',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    paddingHorizontal: 12,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    backgroundColor: '#f8fafc',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: PRIMARY_COLOR,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    color: '#1e293b',
    flex: 1,
  },
  remarksInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default OPEModal;
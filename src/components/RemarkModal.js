import React from "react";
import { Modal, TouchableOpacity, View, Text, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Loader from "./old_components/Loader";
import { colors } from "../Styles/appStyle";

const RemarkModal = ({
  visible,
  onClose,
  remark,
  setRemark,
  isLoading,
  selectedAction,
  onSubmit
}) => (
  <Modal visible={visible} transparent animationType="slide">
    <TouchableOpacity
      activeOpacity={1}
      style={styles.modalOverlay}
      onPress={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.modalContent}
        onPress={() => {}}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {selectedAction === 'APPROVE' ? 'Approve Task' : 'Reject Task'}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={remark}
            onChangeText={setRemark}
            placeholder="Add remarks..."
            multiline
            numberOfLines={3}
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.addButtonsContainer}>
          <TouchableOpacity
            style={[styles.addButton, styles.addOnlyButton]}
            onPress={onClose}
          >
            <Text style={styles.addButtonText}>No, Keep It</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, selectedAction === 'APPROVE' ? styles.approveButton : styles.rejectButton]}
            onPress={() => onSubmit(selectedAction)}
            disabled={isLoading}
          >
            <Text style={styles.addButtonText}>
              {isLoading ? 'PROCESSING...' : selectedAction === "APPROVE" ? "Yes, Approved" : "Yes, Rejected"}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
    <Loader visible={isLoading} />
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "white",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  addButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: "center",
    flex: 1,
  },
  addOnlyButton: {
    backgroundColor: "#8B5CF6",
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default RemarkModal; 
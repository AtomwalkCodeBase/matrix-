import React, { useState } from "react";
import { Modal, TouchableOpacity, View, Text, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DropdownPicker from "./DropdownPicker";
import TabNavigation from "./TabNavigation";
import { colors } from "../Styles/appStyle";

const FilterModal = ({
  visible,
  onClose,
  onClearFilters,
  onApplyFilters,
  filterConfigs = [],
  modalTitle = "Filters",
  applyButtonText = "Apply Filters",
  clearButtonText = "Clear Filters",
  tabs = [],
  activeTab,
  setActiveTab,
}) => {
  // Check if any filter has a selected value
  const hasSelectedFilters = filterConfigs.some(
    (filter) => filter.value !== null && filter.value !== undefined && filter.value !== ""
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        {/* TouchableOpacity only for the overlay area outside modalContent */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {tabs.length > 0 && (
            <TabNavigation
              tabs={tabs}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              style={styles.tabNavigation}
            />
          )}
            {filterConfigs.map((filter, index) => (
              <View key={index} style={styles.formGroup}>
                <DropdownPicker
                  label={filter.label}
                  data={filter.options}
                  value={filter.value}
                  setValue={filter.setValue}
                />
              </View>
            ))}
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[styles.clearButton, !hasSelectedFilters && styles.disabledButton]}
                onPress={()=> {
                  onClearFilters()
                  onClose()
                }}
                disabled={!hasSelectedFilters}
              >
                <Text
                  style={[styles.clearButtonText, !hasSelectedFilters && styles.disabledButtonText]}
                >
                  {clearButtonText}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyButton, !hasSelectedFilters && styles.disabledButton]}
                onPress={() => {
                  onApplyFilters();
                  onClose();
                }}
                disabled={!hasSelectedFilters}
              >
                <Text
                  style={[styles.applyButtonText, !hasSelectedFilters && styles.disabledButtonText]}
                >
                  {applyButtonText}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

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
    paddingBottom: 10,
    maxHeight: "90%",
  },
  scrollContent: {
    paddingBottom: 20,
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
  tabNavigation: {
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  clearButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  applyButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  applyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    color: "#999",
  },
});

export default FilterModal;
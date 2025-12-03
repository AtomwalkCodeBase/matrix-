import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DatePicker from "../DatePicker";
import { colors } from "../../Styles/appStyle";

const CustomDateRangeCard = ({
  isExpanded,
  setIsExpanded,
  startDate,
  endDate,
  startObj,
  endObj,
  setStartObj,
  setEndObj,
  onApply,
  onCancel
}) => {
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text style={styles.headerText}>
            {startDate && endDate ? `${startDate} to ${endDate}` : 'Select custom date range'}
          </Text>
        </View>

        <Ionicons
          name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"}
          size={20}
          color="#666"
        />
      </TouchableOpacity>

      {isExpanded && (
        <>
          <View style={{ height: 12 }} />
          <DatePicker
            label="Start Date"
            cDate={startObj}
            setCDate={setStartObj}
            // maximumDate={endObj}
          />
          <View style={{ height: 10 }} />
          <DatePicker
            label="End Date"
            cDate={endObj}
            setCDate={setEndObj}
            minimumDate={startObj}
          />
          <TouchableOpacity style={styles.applyBtn} onPress={() => onApply()}>
            <Text style={styles.applyButtonText}>

            Filter
            </Text>
          </TouchableOpacity>
           
        </>
      )}

      {!isExpanded && (
        <Text style={styles.info}>Tap to edit the custom date range</Text>
      )}
    </View>
  );
};

export default CustomDateRangeCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  info: {
    marginTop: 8,
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
  buttonRow: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  cancel: {
    color: colors.primary,
    padding: 10,
    fontSize: 14,
  },
  applyBtn: {
    marginTop: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,

  },
  apply: {
    color: "#fff",
    fontWeight: "600",
  },
    //   button: {
    //     flex: 1,
    //     paddingVertical: 14,
    //     borderRadius: 10,
    //     alignItems: "center",
    //     marginHorizontal: 5
    // },
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
            textAlign: "center"
      },
});

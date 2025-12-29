import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../Styles/appStyle";

const Employees = ({ activities, employees, onViewDetails }) => {

  // console.log("activities", activities)
  if (!activities.length)
    return (
      <View style={styles.empty}>
        <Ionicons name="people-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>No Employee Data</Text>
      </View>
    );

  // Group activities by employee
  const grouped = {};
  activities.forEach((act) => {
    if (!grouped[act.emp_id]) {
      const emp = employees.find((e) => e.emp_id === act.emp_id);
      grouped[act.emp_id] = {
        empId: act.emp_id,
        name: emp?.employee_name || "Unknown",
        logs: [],
        totalHours: 0,
      };
    }
    grouped[act.emp_id].logs.push(act);
    grouped[act.emp_id].totalHours += Number(act.effort || 0);
  });

  const list = Object.values(grouped);

  return (
    <>
      {activities.map((emp) => (
        <TouchableOpacity key={emp.emp_id} style={styles.card} onPress={() => onViewDetails(null, emp)}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {emp.employee_name.split(" ").map((n) => n[0]).join("")}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{emp.employee_name}</Text>
              <Text style={styles.small}>{emp.projects.length} activities</Text>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.hours}>{emp.projects.totalHoursPerProject}h</Text>
              <Text style={styles.small}>Total Hours</Text>
            </View>
          </View>

          <Text style={styles.section}>Recent Logs</Text>
          {emp.projects.slice(0, 3).map((log, i) => (
            <View key={i} style={styles.log}>
              <Text style={styles.logProject}>
                {log.project_name || log.activity_name}
              </Text>
              <Text style={styles.logHours}>{log.effort}h</Text>
            </View>
          ))}
        </TouchableOpacity>
      ))}
    </>
  );
};

export default Employees;

const styles = StyleSheet.create({
  empty: { alignItems: "center", paddingVertical: 40 },
  emptyText: { marginTop: 10, color: "#666" },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
  },
  header: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { color: "#fff", fontWeight: "600" },
  name: { fontSize: 16, fontWeight: "600", color: "#333" },
  small: { fontSize: 12, color: "#777" },
  hours: { color: colors.primary, fontWeight: "700", fontSize: 16 },

  section: { fontWeight: "600", marginTop: 12, marginBottom: 6 },
  log: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#eee",
    paddingVertical: 4,
  },
  logProject: { color: "#333", flex: 1 },
  logHours: { fontWeight: "600", color: colors.primary },
});

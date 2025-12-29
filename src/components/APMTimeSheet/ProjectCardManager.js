import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../Styles/appStyle";

const ProjectCardManager = ({ project, onViewDetails }) => {
  const employees = project.employees || new Set();
  const utilization = project.utilization || 0;
  const activities = project.activities || [];

  // console.log("project", project)
  
  // Get status information from activities
  // const getStatusInfo = () => {
  //   if (activities.length === 0) return { status: "No Activities", color: "#999" };
    
  //   const submittedCount = activities.filter(act => act.project_status === "S").length;
  //   const totalCount = activities.length;
    
  //   if (submittedCount === totalCount) {
  //     return { status: "All Submitted", color: "#4CAF50" };
  //   } else if (submittedCount > 0) {
  //     return { status: "Partially Submitted", color: "#FF9800" };
  //   } else {
  //     return { status: "Pending", color: "#F44336" };
  //   }
  // };

  const getStatusColor = (status) => {
  const s = (status || '').toLowerCase();
  return s === 'completed'
    ? '#10b981'
    : s === 'in progress'
    ? '#f59e0b'
    : '#64748b';
};


  return (
    <TouchableOpacity style={styles.card} onPress={() => onViewDetails(project, null)}>
      {/* Header with status badge */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{project.customer_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor:  getStatusColor(project?.project_period_status) }]}>
            <Text style={styles.statusText}>{project.project_period_status}</Text>
          </View>
        </View>
        <Text style={styles.code}>{project.order_item_key}</Text>
        <Text style={styles.code}>Audit Type: {project.audit_type}</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Ionicons name="people-outline" size={18} color="#666" />
          <Text style={styles.statValue}>{project.total_assigned_employees || employees.size}</Text>
          <Text style={styles.statLabel}>Employees</Text>
        </View>

        <View style={styles.stat}>
          <Ionicons name="time-outline" size={18} color="#666" />
          <Text style={styles.statValue}>{project.totalHours || 0}</Text>
          <Text style={styles.statLabel}>Hours</Text>
        </View>

        {/* <View style={styles.stat}>
          <Ionicons 
            name="trending-up-outline" 
            size={18} 
            color={utilization > 0 ? "#4CAF50" : "#666"} 
          />
          <Text style={[styles.statValue, utilization > 0 && styles.positiveUtilization]}>
            {utilization}%
          </Text>
          <Text style={styles.statLabel}>Utilization</Text>
        </View> */}

        {/* <View style={styles.stat}>
          <Ionicons name="list-outline" size={18} color="#666" />
          <Text style={styles.statValue}>{activities.length}</Text>
          <Text style={styles.statLabel}>Activities</Text>
        </View> */}
      </View>

      {/* Activities Preview */}
      {activities.length > 0 && (
        <View style={styles.activitiesPreview}>
          <Text style={styles.activitiesLabel}>Recent Activities:</Text>
          {activities.slice(0, 2).map((activity, index) => (
            <View key={index} style={styles.activityItem}>
              <Text style={styles.activityName} numberOfLines={1}>
                {activity.activity_name}
              </Text>
              <Text style={styles.activityStatus}>
                {activity.status_display || activity.status}
              </Text>
            </View>
          ))}
          {activities.length > 2 && (
            <Text style={styles.moreActivities}>
              +{activities.length - 2} more activities
            </Text>
          )}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.detailsText}>View Details →</Text>
      </View>
    </TouchableOpacity>
  );
};

export default ProjectCardManager;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    flex: 1,
    marginRight: 12,
  },
  code: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
    paddingVertical: 16,
    marginBottom: 16,
  },
  stat: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginTop: 4,
    marginBottom: 2,
  },
  positiveUtilization: {
    color: "#4CAF50",
  },
  statLabel: {
    fontSize: 12,
    color: "#777",
    fontWeight: "500",
  },
  activitiesPreview: {
    marginBottom: 16,
  },
  activitiesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  activityItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  activityName: {
    fontSize: 13,
    color: "#555",
    flex: 1,
    marginRight: 8,
  },
  activityStatus: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  moreActivities: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
    marginTop: 4,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
  },
  detailsText: {
    color: colors.primary,
    fontWeight: "600",
    textAlign: "right",
    fontSize: 14,
  },
});
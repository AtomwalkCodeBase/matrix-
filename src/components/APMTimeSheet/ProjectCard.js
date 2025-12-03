// ProjectCard.js
import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../Styles/appStyle";

// Helper: parse date strings like "21-Nov-2025" or accept Date objects
const parseCustomDate = (input) => {
  if (!input) return null;
  if (input instanceof Date) return input;
  // Accept either "21-Nov-2025" or ISO strings
  if (typeof input === "string") {
    // If it's already ISO-like, let Date try
    const isoTry = new Date(input);
    if (!isNaN(isoTry.getTime())) return isoTry;

    // Try custom "21-Nov-2025"
    const parts = input.split("-");
    if (parts.length === 3) {
      const [dStr, monStr, yStr] = parts;
      const day = parseInt(dStr, 10);
      const mon = monStr.slice(0, 3);
      const year = parseInt(yStr, 10);
      const months = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
      };
      const m = months[mon] ?? months[monStr] ?? NaN;
      if (!isNaN(day) && !isNaN(m) && !isNaN(year)) {
        return new Date(year, m, day);
      }
    }
  }
  // fallback
  const fallback = new Date(input);
  return isNaN(fallback.getTime()) ? null : fallback;
};

// Safe getDatesBetween: expects Date objects (or parseable inputs)
const getDatesBetween = (startInput, endInput) => {
  const start = parseCustomDate(startInput);
  const end = parseCustomDate(endInput);
  if (!start || !end) return [];
  // Normalize times to midnight for comparison
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const out = [];
  let cur = new Date(s);
  while (cur <= e) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
};

const format = (dateString) => {
  if (!dateString) return "Not set";
  try {
    const d = parseCustomDate(dateString);
    if (!d) return dateString;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const formatTime = (timeString) => {
  if (!timeString) return "N/A";
  return timeString;
};

const ProjectCard = ({
  project = {},
  onStartProject = () => {},
  onViewDetails = () => {},
  fadeAnim = new Animated.Value(1),
  onCheckIn = () => {},
  onCheckOut = () => {},
  isDetailsOpen = false,
}) => {
  // Planned and actual days arrays (Date objects)
  const plannedDays = useMemo(() => {
    return getDatesBetween(project.planned_start_date, project.planned_end_date);
  }, [project.planned_start_date, project.planned_end_date]);

  const loggedDays = useMemo(() => {
    if (!project?.original_A?.ts_data_list?.length) return [];

    const uniqueDates = [
      ...new Set(project.original_A.ts_data_list.map((d) => d.a_date)),
    ];

    return uniqueDates
      .map((d) => parseCustomDate(d))
      .filter((d) => d instanceof Date && !isNaN(d));
  }, [project?.original_A?.ts_data_list]);

  const progress =
    plannedDays.length > 0 ? (loggedDays.length / plannedDays.length) * 100 : 0;

  // Project is active
  const isActive =
    project.status === "active" &&
    (project.status_display === "IN PROGRESS" || project.status_display === "NOT SUBMITTED");

  const today = new Date();
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Utility to compare date equality (midnight-normalized)
  const sameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const todayLogs =
    project?.original_A?.ts_data_list?.filter((log) => {
      const d = parseCustomDate(log.a_date);
      return sameDay(d, normalizedToday);
    }) || [];

  // If today's date exists in logs and contains an 'I|' it means already checked-in
  const todayHasCheckIn = todayLogs.some((l) => l.geo_data?.includes("I|"));

  // If today's date exists in logs and contains an 'O|' it means already checked-out
  const todayHasCheckOut = todayLogs.some((l) => l.geo_data?.includes("O|"));

  const hasOpenSession = project.hasCheckIn && !project.hasCheckOut;
  const canCheckIn = isActive && !hasOpenSession;
  const canCheckOut = isActive && hasOpenSession && todayHasCheckIn && !todayHasCheckOut;

  console.log("Card Data--",JSON.stringify(project))

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2}>
           {project.project_code}
          </Text>
          <Text style={styles.projectCode}>{project.title}</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            project.status === "completed"
              ? styles.statusCompleted
              : project.status === "active"
                ? styles.statusActive
                : styles.statusPending,
          ]}
        >
          <Ionicons
            name={
              project.status === "completed" ? "checkmark-circle" : project.status === "active" ? "time" : "calendar"
            }
            size={12}
            color="#fff"
          />
          <Text style={styles.statusBadgeText}>{project.status_display || project.status}</Text>
        </View>
      </View>

      {/* ACTIVITY DETAILS */}
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Ionicons name="briefcase-outline" size={16} color="#64748b" />
          <Text style={styles.infoLabel}>Activity</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {project.activity_name}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="cube-outline" size={16} color="#64748b" />
          <Text style={styles.infoLabel}>Items</Text>
          <Text style={styles.infoValue}>{project.no_of_items ?? "-"}</Text>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="speedometer-outline" size={16} color="#64748b" />
          <Text style={styles.infoLabel}>Progress</Text>
          <Text style={styles.infoValue}>{Math.round(progress)}%</Text>
        </View>
      </View>

      {/* CHECK-IN/CHECK-OUT STATUS */}
      {(project.hasCheckIn || project.hasCheckOut) && (
        <View style={styles.attendanceSection}>
          <Text style={styles.sectionTitle}>Attendance</Text>

          {project.hasCheckIn && project.checkIn && (
            <View style={styles.attendanceRow}>
              <View style={styles.attendanceLabel}>
                <Ionicons name="log-in-outline" size={14} color="#10b981" />
                <Text style={[styles.attendanceLabelText, styles.checkInText]}>
                  {project.hasCheckOut ? "Last Check-In" : "Checked In"}
                </Text>
              </View>
              <View style={styles.attendanceDetails}>
                <Text style={styles.attendanceTime}>{formatTime(project.checkIn.time)}</Text>
                <Text style={styles.attendanceDate}>{format(project.actual_start_date)}</Text>
              </View>
            </View>
          )}

          {project.hasCheckOut && project.checkOut && (
            <View style={styles.attendanceRow}>
              <View style={styles.attendanceLabel}>
                <Ionicons name="log-out-outline" size={14} color="#ef4444" />
                <Text style={[styles.attendanceLabelText, styles.checkOutText]}>
                  {canCheckIn ? "Last Check-Out" : "Checked Out"}
                </Text>
              </View>
              <View style={styles.attendanceDetails}>
                <Text style={styles.attendanceTime}>{formatTime(project.checkOut.time)}</Text>
                <Text style={styles.attendanceDate}>{format(project.actual_end_date)}</Text>
              </View>
            </View>
          )}

          {isActive && (project.hasCheckIn || project.hasCheckOut) && (
            <View style={styles.multipleSessionsInfo}>
              <Ionicons name="information-circle-outline" size={14} color="#3b82f6" />
              <Text style={styles.multipleSessionsText}>You are responsible to upload file</Text>
            </View>
          )}
        </View>
      )}

      {/* TIMELINE SECTION */}
      <View style={styles.timelineSection}>
        <Text style={styles.sectionTitle}>Project Timeline</Text>

        {/* Planned Dates */}
        <View style={styles.timelineRow}>
          <View style={styles.timelineLabel}>
            <Ionicons name="calendar-outline" size={14} color="#64748b" />
            <Text style={styles.timelineLabelText}>Planned</Text>
          </View>
          <Text style={styles.timelineDate}>
            {format(project.planned_start_date)} - {format(project.planned_end_date)}
          </Text>
        </View>

        {/* Actual Dates */}
        {/* <View style={styles.timelineRow}>
          <View style={styles.timelineLabel}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#64748b" />
            <Text style={styles.timelineLabelText}>Actual</Text>
          </View>
          <Text style={styles.timelineDate}>
            {loggedDays.length > 0
              ? `${format(project.actual_start_date)} - ${format(project.actual_end_date)}`
              : "Not started"}
          </Text>
        </View> */}

        {/* DAILY PROGRESS BAR */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Daily Progress</Text>
            <Text style={styles.progressSubtitle}>
              {loggedDays.length} {loggedDays.length === 1 ? "day" : "days"} logged
              {plannedDays.length > 0 ? ` of ${plannedDays.length} planned` : ""}
            </Text>
          </View>

          <View style={styles.dateProgressContainer}>
            {/* Date Row */}
            <View style={styles.dateRow}>
              {loggedDays.map((day, index) => {
                const dateNumber = day.getDate();
                const monthName = day.toLocaleDateString("en-IN", { month: "short" });
                const isFirstOfMonth = dateNumber === 1;
                return (
                  <View key={`date-${index}`} style={styles.dateColumn}>
                    {isFirstOfMonth && <Text style={styles.monthLabel}>{monthName}</Text>}
                    <Text style={styles.dateNumber}>{dateNumber}</Text>
                  </View>
                );
              })}
            </View>

            {/* Progress Bar Row */}
            <View style={styles.progressBarRow}>
              {loggedDays.map((day, index) => {
                const isToday = sameDay(normalizedToday, day);
                // priority: Today (blue ring), Completed (green), Pending (grey)
                return (
                  <View
                    key={`progress-${index}`}
                    style={[
                      styles.progressSegment,
                      styles.segmentCompleted,
                      isToday && styles.segmentToday,
                    ]}
                  />
                );
              })}
            </View>

            {/* Day Labels Row */}
            <View style={styles.dayLabelRow}>
              {loggedDays.map((day, index) => {
                const dayName = day.toLocaleDateString("en-IN", { weekday: "narrow" });
                return (
                  <Text key={`day-${index}`} style={styles.dayLabel}>
                    {dayName}
                  </Text>
                );
              })}
            </View>
          </View>

          {/* Progress Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, styles.legendCompleted]} />
              <Text style={styles.legendText}>Completed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, styles.legendToday]} />
              <Text style={styles.legendText}>Today</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ACTION BUTTONS */}
      <View style={styles.actions}>

        {/* COMPLETED STATUS */}
        {project.status_display === "Completed" ? (
          <TouchableOpacity style={[styles.btn, styles.disabledBtn]} disabled={true}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Completed</Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* PLANNED → Only Show Check-In */}
            {project.status_display === "PLANNED" && (
              <TouchableOpacity
                style={[styles.btn, styles.primaryBtn]}
                onPress={() => onCheckIn(project)}
              >
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <Text style={styles.btnText}>Check-In</Text>
              </TouchableOpacity>
            )}

            {/* IN PROGRESS → Show Only Check-In OR Check-Out */}
            {project.status_display === "IN PROGRESS" && (
              <TouchableOpacity
                style={[
                  styles.btn,
                  canCheckOut ? styles.checkOutBtn : canCheckIn ? styles.primaryBtn : styles.disabledBtn,
                ]}
                onPress={() => {
                  if (canCheckOut) onCheckOut(project);
                  else if (canCheckIn) onCheckIn(project);
                }}
                disabled={!canCheckIn && !canCheckOut}
              >
                <Ionicons name={canCheckOut ? "log-out-outline" : "log-in-outline"} size={18} color="#fff" />
                <Text style={styles.btnText}>
                  {canCheckOut ? "Check-Out" : "Check-In"}
                </Text>
              </TouchableOpacity>
            )}

            {/* DETAILS BUTTON — ALWAYS SHOWN */}
            <TouchableOpacity
              style={[
                styles.btn,
                isDetailsOpen ? styles.checkOutBtn : styles.secondaryBtn,
              ]}
              onPress={() => onViewDetails(project, isDetailsOpen)}
            >
              <Ionicons
                name={isDetailsOpen ? "close-circle-outline" : "document-text-outline"}
                size={18}
                color={isDetailsOpen ? "#fff" : colors.primary}
              />
              <Text
                style={[
                  styles.btnText,
                  !isDetailsOpen && styles.secondaryBtnText,
                ]}
              >
                {isDetailsOpen ? "Close" : "Details"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>


    </Animated.View>
  );
};

export default ProjectCard;

// -----------------------------
// STYLES
// -----------------------------
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  projectCode: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusCompleted: {
    backgroundColor: "#10b981",
  },
  statusActive: {
    backgroundColor: "#f59e0b",
  },
  statusPending: {
    backgroundColor: "#64748b",
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 10,
    marginLeft: 6,
    fontWeight: "600",
  },
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
  },
  infoItem: {
    alignItems: "center",
    flex: 1,
  },
  infoLabel: {
    color: "#64748b",
    fontSize: 10,
    marginTop: 4,
    marginBottom: 2,
  },
  infoValue: {
    color: "#1e293b",
    fontSize: 14,
    fontWeight: "600",
  },
  attendanceSection: {
    marginBottom: 16,
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#10b981",
  },
  attendanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  attendanceLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  attendanceLabelText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "600",
  },
  checkInText: {
    color: "#10b981",
  },
  checkOutText: {
    color: "#ef4444",
  },
  attendanceDetails: {
    alignItems: "flex-end",
  },
  attendanceTime: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  attendanceDate: {
    fontSize: 11,
    color: "#64748b",
  },
  multipleSessionsInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    padding: 8,
    backgroundColor: "#dbeafe",
    borderRadius: 8,
  },
  multipleSessionsText: {
    marginLeft: 6,
    fontSize: 11,
    color: "#1e40af",
    fontWeight: "500",
  },
  timelineSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingVertical: 6,
  },
  timelineLabel: {
    flexDirection: "row",
    alignItems: "center",
    width: 80,
  },
  timelineLabelText: {
    marginLeft: 6,
    color: "#64748b",
    fontSize: 12,
    fontWeight: "500",
  },
  timelineDate: {
    fontSize: 13,
    color: "#1e293b",
    fontWeight: "500",
    flex: 1,
  },
  progressSection: {
    marginTop: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  progressSubtitle: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  dateProgressContainer: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dateColumn: {
    alignItems: "center",
    flex: 1,
  },
  monthLabel: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 2,
  },
  dateNumber: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e293b",
  },
  progressBarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    height: 10,
    alignItems: "center",
  },
  progressSegment: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 2,
    backgroundColor: "#e2e8f0", // default grey
  },
  segmentCompleted: {
    backgroundColor: "#10b981", // green
  },
  segmentToday: {
    // blue ring with transparent inner (simulate ring)
    backgroundColor: "#3b82f6",
    borderWidth: 2,
    borderColor: "#1d4ed8",
    height: 12,
    borderRadius: 6,
    marginTop: -2,
  },
  segmentPending: {
    backgroundColor: "#e2e8f0",
  },
  segmentMissed: {
    backgroundColor: "#94a3b8",
  },
  dayLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  dayLabel: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "500",
    flex: 1,
    textAlign: "center",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
    marginBottom: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendCompleted: {
    backgroundColor: "#10b981",
  },
  legendToday: {
    backgroundColor: "#3b82f6",
    borderWidth: 1,
    borderColor: "#1d4ed8",
  },
  legendText: {
    fontSize: 10,
    color: "#64748b",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
  },
  checkOutBtn: {
    backgroundColor: "#ef4444",
  },
  disabledBtn: {
    backgroundColor: "#94a3b8",
  },
  secondaryBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  btnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 6,
  },
  secondaryBtnText: {
    color: colors.primary,
  },
});

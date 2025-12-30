import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../Styles/appStyle';

const PRIMARY_COLOR = colors.primary;

// === Utility Functions ===
const parseAPIDate = (dateStr) => {
  if (!dateStr) return null;
  const [day, monthStr, year] = dateStr.split('-');
  const monthMap = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const month = monthMap[monthStr];
  if (month === undefined) return null;
  const date = new Date(year, month, parseInt(day));
  return isNaN(date.getTime()) ? null : date;
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'Not set';
  const date = parseAPIDate(dateStr);
  return date
    ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : dateStr;
};

const getDatesBetween = (start, end) => {
  const dates = [];
  const startDate = parseAPIDate(start);
  const endDate = parseAPIDate(end);
  if (!startDate || !endDate) return dates;

  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const getStatusColor = (status) => {
  const s = (status || '').toLowerCase();
  return s === 'completed'
    ? '#10b981'
    : s === 'in progress'
    ? '#f59e0b'
    : '#64748b';
};

// === Reusable Sub-Components ===

const StatusBadge = ({ status }) => (
  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
    <Text style={styles.statusText}>{status || 'Planned'}</Text>
  </View>
);

const InfoItem = ({ icon, label, value }) => (
  <View style={styles.infoItem}>
    <Ionicons name={icon} size={15} color="#64748b" />
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
  </View>
);

const TimelineRow = ({ icon, label, value }) => (
  <View style={styles.timelineRow}>
    <Ionicons name={icon} size={12} color="#64748b" />
    <Text style={styles.timelineLabel}>{label}</Text>
    <Text style={styles.timelineValue}>{value}</Text>
  </View>
);

const CalendarDay = ({ date, isLogged, isToday, isWeekend, logEntry }) => {
  const dayOfMonth = date.getDate();
  const dateIso = date.toISOString().split('T')[0];

  return (
    <View style={styles.calendarDay}>
      <View style={[styles.dayOfWeek, isWeekend && styles.weekendDay]}>
        <Text style={[styles.dayOfWeekText, isWeekend && styles.weekendText]}>
          {date.toLocaleDateString('en-US', { weekday: 'short' })}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.dateCircle,
          isLogged && styles.loggedDate,
          isToday && !isLogged && styles.todayDate,
          isWeekend && styles.weekendDate,
        ]}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dateNumber,
            isLogged && styles.loggedDateNumber,
            isToday && !isLogged && styles.todayDateNumber,
            isWeekend && styles.weekendDateNumber,
          ]}
        >
          {dayOfMonth}
        </Text>
        {isLogged && (
          <View
            style={[
              styles.activityDot,
              logEntry?.check_out ? styles.completedDot : styles.inProgressDot,
            ]}
          />
        )}
      </TouchableOpacity>

      <Text
        style={[
          styles.dayStatus,
          isLogged && styles.completedDay,
          !isLogged && isToday && styles.todayDay,
        ]}
      >
        {isLogged ? 'Checked In' : isToday ? 'Today' : ''}
      </Text>
    </View>
  );
};

const DailyLogEntry = ({ entry }) => (
  <View style={styles.logEntry}>
    <View style={styles.logHeader}>
      <View style={styles.logDate}>
        <Ionicons name="calendar" size={12} color={PRIMARY_COLOR} />
        <Text style={styles.logDateText}>{formatDate(entry.date)}</Text>
      </View>
      {entry.items_audited ? (
        <View style={styles.itemsBadge}>
          <Ionicons name="cube-outline" size={10} color={PRIMARY_COLOR} />
          <Text style={styles.itemsBadgeText}>{entry.items_audited} items</Text>
        </View>
      ) : null}
    </View>

    <View style={styles.logTimes}>
      <View style={styles.logTimeItem}>
        <Ionicons name="log-in" size={14} color="#10b981" />
        <View style={styles.logTimeContent}>
          <Text style={styles.logTimeLabel}>Check In</Text>
          <Text style={styles.logTimeText}>
            {entry.check_in && typeof entry.check_in === 'object'
              ? entry.check_in.time
              : entry.check_in || '-'}
          </Text>
        </View>
      </View>
      <View style={styles.timeDivider} />
      <View style={styles.logTimeItem}>
        <Ionicons name="log-out" size={14} color="#ef4444" />
        <View style={styles.logTimeContent}>
          <Text style={styles.logTimeLabel}>Check Out</Text>
          {entry.check_out ? (
            <Text style={styles.logTimeText}>
              {typeof entry.check_out === 'object' ? entry.check_out.time : entry.check_out}
            </Text>
          ) : (
            <Text style={[styles.logTimeText, styles.inProgressText]}>In Progress</Text>
          )}
        </View>
      </View>
    </View>

    {entry.remark ? (
      <View style={styles.remarkContainer}>
        <Ionicons name="chatbox-outline" size={10} color="#64748b" />
        <Text style={styles.remarkText}>{entry.remark}</Text>
      </View>
    ) : null}
  </View>
);

// === Main Component ===
export const AuditCard = ({ project, onAction, onViewDetails }) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const checkInData = useMemo(() => {
    if (!project?.day_logs || typeof project.day_logs !== 'object') return [];
    return Object.values(project.day_logs).map(log => ({
      date: log.date || '',
      check_in: log.check_in?.time || null,
      check_out: log.check_out || null,
      remark: log.remarks || '',
      items_audited: log.no_of_items || 0,
    }));
  }, [project?.day_logs]);

  const { plannedDays, loggedDates, progressPercentage } = useMemo(() => {
    const planned = getDatesBetween(project?.planned_start_date, project?.planned_end_date);
    const logged = checkInData
      .map(d => parseAPIDate(d.date)?.toISOString().split('T')[0])
      .filter(Boolean);

    const progress = planned.length > 0 ? (logged.length / planned.length) * 100 : 0;

    return { plannedDays: planned, loggedDates: logged, progressPercentage: progress };
  }, [project?.planned_start_date, project?.planned_end_date, checkInData]);

  const { hasOpenSession, isCompleted } = useMemo(() => {
    const lastEntry = checkInData[checkInData.length - 1];
    const hasOpen = checkInData.length > 0 && !lastEntry?.check_out;
    const completed = project?.complete === true || project?.project_period_status === 'Completed';
    return { hasOpenSession: hasOpen, isCompleted: completed };
  }, [checkInData, project]);

  const handleToggleDetails = () => {
    const newState = !isDetailsOpen;
    setIsDetailsOpen(newState);
    // onViewDetails?.(project, newState);
  };

  const renderPrimaryButton = () => {
    const btnProps = {
      style: [styles.btn],
      textStyle: styles.btnText,
      iconColor: '#fff',
    };

    if (project?.todaysStatus === 'Complete') {
      return (
        <View style={[styles.btn, styles.disabledBtn]}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Activity is complete</Text>
        </View>
      );
    }

    if (project?.hasPendingCheckout) {
      return (
        <TouchableOpacity
          style={[styles.btn, styles.primaryBtn]}
          onPress={() => onAction({ type: 'checkout_yesterday', project })}
        >
          <Ionicons name="time-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Checkout Yesterday</Text>
        </TouchableOpacity>
      );
    }

    if (hasOpenSession) {
      return (
        <TouchableOpacity
          style={[styles.btn, styles.checkOutBtn]}
          onPress={() => onAction({ type: 'continue', project })}
        >
          <Ionicons name="log-out-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Check Out</Text>
        </TouchableOpacity>
      );
    }

    if (project?.original_A && !project?.hasPendingCheckout) {
      return (
        <TouchableOpacity
          style={[styles.btn, styles.primaryBtn]}
          onPress={() => onAction({ type: 'resume', project })}
        >
          <Ionicons name="play-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Resume Activity</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.btn, styles.primaryBtn]}
        onPress={() => onAction({ type: 'start', project })}
      >
        <Ionicons name="log-in-outline" size={16} color="#fff" />
        <Text style={styles.btnText}>Start Activity</Text>
      </TouchableOpacity>
    );
  };

  const customerName = project?.customer_name || 'Unknown Customer';
  const auditType = project?.original_P?.product_name || project?.audit_type || 'N/A';
  const noOfItems = project?.original_P?.no_of_items || 0;
  const periodStatus = project?.project_period_status || 'Planned';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.customerName} numberOfLines={1}>{customerName}</Text>
          <Text style={styles.orderKey}>{project?.project_code}</Text>
        </View>
        <StatusBadge status={periodStatus} />
      </View>

      {/* Info Grid */}
      <View style={styles.infoGrid}>
        <InfoItem icon="briefcase-outline" label="Audit Type" value={auditType} />
        <InfoItem icon="cube-outline" label="Items" value={noOfItems} />
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        <Text style={styles.sectionTitle}>Project Timeline</Text>
        <TimelineRow
          icon="calendar-outline"
          label="Planned Date"
          value={`${formatDate(project?.planned_start_date)} to ${formatDate(project?.planned_end_date)}`}
        />
        <TimelineRow
          icon="calendar-outline"
          label="Actual Date"
          value={`${formatDate(project?.actual_start_date)} to ${formatDate(project?.actual_end_date)}`}
        />
      </View>

      {/* Expanded Details */}
      {isDetailsOpen && (
        <View style={styles.detailsSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.sectionTitle}>Daily Progress</Text>
            <Text style={styles.calendarProgress}>
              {loggedDates.length}/{plannedDays.length} days completed
            </Text>
          </View>

          {/* Legend */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.completedDot]} />
              <Text style={styles.legendText}>(Complete)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.inProgressDot]} />
              <Text style={styles.legendText}>(In Progress)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.noActivityDot]} />
              <Text style={styles.legendText}>Not Started</Text>
            </View>
          </View>

          {/* Calendar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.calendarContainer}>
            <View style={styles.calendarWeek}>
              {plannedDays.map((date, index) => {
                const dateIso = date.toISOString().split('T')[0];
                const isLogged = loggedDates.includes(dateIso);
                const isToday = date.toDateString() === new Date().toDateString();
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const logEntry = checkInData.find(e => {
                  const eIso = parseAPIDate(e.date)?.toISOString().split('T')[0];
                  return eIso === dateIso;
                });

                return (
                  <CalendarDay
                    key={index}
                    date={date}
                    isLogged={isLogged}
                    isToday={isToday}
                    isWeekend={isWeekend}
                    logEntry={logEntry}
                  />
                );
              })}
            </View>
          </ScrollView>

          {/* Daily Logs */}
          {checkInData.length > 0 ? (
            <ScrollView style={styles.dailyLogScroll} nestedScrollEnabled>
              <View style={styles.dailyLog}>
                {checkInData.map((entry, idx) => (
                  <DailyLogEntry key={idx} entry={entry} />
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={24} color="#cbd5e1" />
              <Text style={styles.emptyText}>No activity logged yet</Text>
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {/* {(periodStatus === 'In Progress' || periodStatus === 'Planned') && renderPrimaryButton()} */}
        {(periodStatus === 'In Progress' || periodStatus === 'Planned') && renderPrimaryButton()}
        <TouchableOpacity
          style={[styles.btn, isDetailsOpen ? styles.closeBtn : styles.secondaryBtn]}
          onPress={handleToggleDetails}
        >
          <Ionicons
            name={isDetailsOpen ? 'close-circle-outline' : 'document-text-outline'}
            size={16}
            color={isDetailsOpen ? '#fff' : PRIMARY_COLOR}
          />
          <Text style={[styles.btnText, !isDetailsOpen && styles.secondaryBtnText]}>
            {isDetailsOpen ? 'Minimize Details' : 'Details'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  titleContainer: {
    marginBottom: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerContent: {
    flex: 1,
    marginRight: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  orderKey: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  infoGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 2,
    fontWeight: 500,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  timeline: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5
  },
  timelineLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginLeft: 4,
    marginRight: 8,
  },
  timelineValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    flex: 1,
  },
  detailsSection: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 3,
  },
  dailyLogScroll: {
    maxHeight: 300,
  },
  dailyLog: {
    gap: 10,
  },
  logEntry: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY_COLOR,
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  logDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 6,
  },
  itemsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8eef6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  itemsBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  logTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  logTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  logTimeContent: {
    flex: 1,
  },
  logTimeLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 2,
  },
  logTimeText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
  },
  timeDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 8,
  },
  remarkContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    padding: 8,
    borderRadius: 6,
    gap: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#fbbf24',
  },
  remarkText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  inProgressText: {
    color: '#f59e0b',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  primaryBtn: {
    backgroundColor: PRIMARY_COLOR,
  },
  checkOutBtn: {
    backgroundColor: '#ef4444',
  },
  closeBtn: {
    backgroundColor: '#64748b',
  },
  disabledBtn: {
    backgroundColor: '#94a3b8',
  },
  secondaryBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryBtnText: {
    color: PRIMARY_COLOR,
  },
  // Add these styles after the progressFill style
calendarContainer: {
  marginTop: 12,
},
calendarScroll: {
  paddingHorizontal: 8,
},
calendarWeek: {
  flexDirection: 'row',
  gap: 4,
  alignItems: 'flex-start',
},
calendarDay: {
  alignItems: 'center',
  width: 48,
  paddingVertical: 4,
},
dayOfWeek: {
  width: 24,
  height: 16,
  borderRadius: 3,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 2,
},
weekendDay: {
  backgroundColor: '#fef3c7',
},
dayOfWeekText: {
  fontSize: 8,
  fontWeight: '600',
  color: '#64748b',
},
weekendText: {
  color: '#d97706',
},
dateCircle: {
  width: 36,
  height: 36,
  borderRadius: 18,
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  borderWidth: 2,
  borderColor: '#e2e8f0',
  backgroundColor: '#fff',
},
loggedDate: {
  backgroundColor: PRIMARY_COLOR,
  borderColor: PRIMARY_COLOR,
},
todayDate: {
  borderColor: '#3b82f6',
  backgroundColor: '#eff6ff',
},
weekendDate: {
  borderColor: '#fde68a',
  backgroundColor: '#fffbeb',
},
dateNumber: {
  fontSize: 12,
  fontWeight: '600',
  color: '#64748b',
  zIndex: 2,
},
loggedDateNumber: {
  color: '#fff',
},
todayDateNumber: {
  color: '#3b82f6',
  fontWeight: '700',
},
weekendDateNumber: {
  color: '#d97706',
},
activityDot: {
  position: 'absolute',
  bottom: -2,
  right: -2,
  width: 8,
  height: 8,
  borderRadius: 4,
  zIndex: 3,
},
completedDot: {
  backgroundColor: '#10b981',
},
inProgressDot: {
  backgroundColor: '#f59e0b',
},
dayStatus: {
  fontSize: 10,
  fontWeight: '500',
  marginTop: 2,
  height: 12,
},
completedDay: {
  color: '#10b981',
},
todayDay: {
  color: '#3b82f6',
},
calendarHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
calendarDays: {
  fontSize: 12,
  fontWeight: '600',
  color: '#1e293b',
},
calendarProgress: {
  fontSize: 11,
  color: '#64748b',
  fontWeight: '500',
},
legendContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  backgroundColor: '#e8eef6',
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 8,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#e8eef6',
},
legendItem: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
legendDot: {
  width: 10,
  height: 10,
  borderRadius: 5,
},
completedDot: {
  backgroundColor: '#10b981',
},
inProgressDot: {
  backgroundColor: '#f59e0b',
},
noActivityDot: {
  backgroundColor: '#cbd5e1',
  borderWidth: 1,
  borderColor: '#94a3b8',
},
legendText: {
  fontSize: 11,
  color: '#444',
  fontWeight: '500',
},

// Enhanced date circle styles
inProgressDate: {
  backgroundColor: '#fff7ed',
  borderColor: '#f59e0b',
  borderWidth: 2,
},
inProgressDateNumber: {
  color: '#d97706',
  fontWeight: '700',
},

// Day status text
inProgressDay: {
  color: '#d97706',
  fontWeight: '600',
},
});
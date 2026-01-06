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
import RetainerCard from './RetainerCard';

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
        <Text style={styles.logDateText}>
          {formatDate(entry.date)} 
          {entry.session_number > 1 && ` (Session ${entry.session_number})`}
        </Text>
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
            {entry.check_in || '-'}
          </Text>
        </View>
      </View>
      <View style={styles.timeDivider} />
      <View style={styles.logTimeItem}>
        <Ionicons name="log-out" size={14} color="#ef4444" />
        <View style={styles.logTimeContent}>
          <Text style={styles.logTimeLabel}>Check Out</Text>
          {entry.check_out ? (
            <Text style={styles.logTimeText}>{entry.check_out}</Text>
          ) : entry.is_incomplete ? (
            <Text style={[styles.logTimeText, styles.inProgressText]}>In Progress</Text>
          ) : (
            <Text style={styles.logTimeText}>-</Text>
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

// Retainer Section Component (to be integrated inside AuditCard)
// In AuditCard component, update the RetainerSection component:
// Update this in your AuditCard component:
const RetainerSection = ({ 
  project, 
  retainerData, 
  onToggleRetainers,
  onRetainerAction, // Add this new prop
  hasOpenSessionGlobally // Add this prop
}) => {
  const retainers = project?.original_P?.retainer_list || [];
  if (retainers.length === 0) return null;

  const projectRetainerData = retainerData[project.id] || {};
  const isExpanded = projectRetainerData.expanded || false;
  const isLoading = projectRetainerData.loading || false;

  return (
    <View style={styles.retainerSection}>
      <TouchableOpacity
        style={styles.viewRetainersButton}
        onPress={() => onToggleRetainers(project.id, retainers)}
        disabled={isLoading}
      >
        <Text style={styles.viewRetainersText}>
          View Retainers ({retainers.length})
        </Text>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={PRIMARY_COLOR}
        />
      </TouchableOpacity>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <Ionicons name="refresh-outline" size={16} color="#64748b" />
          <Text style={styles.loadingText}>Loading retainer data...</Text>
        </View>
      )}

      {isExpanded && projectRetainerData.retainers && (
        <View style={styles.retainersList}>
          {projectRetainerData.retainers.map((retainer, index) => (
            <RetainerCard
              key={`${project.id}-${retainer.emp_id}-${index}`}
              retainer={retainer}
              fullData={retainer.fullData}
              onAction={onRetainerAction} // Pass the action handler
              hasOpenSessionGlobally={hasOpenSessionGlobally} // Pass global open session status
            />
          ))}
          
          {projectRetainerData.error && (
            <Text style={styles.sectionError}>{projectRetainerData.error}</Text>
          )}
        </View>
      )}
    </View>
  );
};

// === Main Component ===
export const AuditCard = ({ 
  project, 
  onAction, 
  allProjects, 
  hasOpenSessionGlobally, 
  retainerData,
  onToggleRetainers,
  onEditRetainer,
  onDeleteRetainer,
  onViewRetainerDetails,
  handleRetainerAction,
  hasAnyOpenSession
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const checkInData = useMemo(() => {
    if (!project?.day_logs || typeof project.day_logs !== 'object') return [];
    
    const allLogs = [];
    
    Object.values(project.day_logs).forEach(log => {
      if (log.sessions && Array.isArray(log.sessions)) {
        log.sessions.forEach((session, index) => {
          allLogs.push({
            date: log.date,
            session_number: index + 1,
            check_in: session.check_in?.time || null,
            check_out: session.check_out?.time || null,
            remark: log.remarks || '',
            items_audited: session.no_of_items || 0,
            geo_data: session.geo_data || '',
            is_incomplete: session.check_in && !session.check_out
          });
        });
      } else {
        allLogs.push({
          date: log.date || '',
          session_number: 1,
          check_in: log.check_in?.time || null,
          check_out: log.check_out || null,
          remark: log.remarks || '',
          items_audited: log.no_of_items || 0,
          is_incomplete: log.check_in && !log.check_out
        });
      }
    });
    
    return allLogs.sort((a, b) => {
      const dateCompare = new Date(parseAPIDate(a.date)) - new Date(parseAPIDate(b.date));
      if (dateCompare !== 0) return dateCompare;
      return a.session_number - b.session_number;
    });
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
    const hasOpenFromDayLogs = checkInData.length > 0 && !lastEntry?.check_out;
    
    let hasOpenFromTsData = false;
    if (project?.original_A?.ts_data_list?.length) {
      const entries = project.original_A.ts_data_list;
      const lastTsEntry = entries[entries.length - 1];
      const geoData = lastTsEntry?.geo_data || '';
      hasOpenFromTsData = geoData.includes('I|') && !geoData.includes('O|');
    }
    
    const hasOpen = hasOpenFromDayLogs || hasOpenFromTsData;
    const completed = project?.original_A?.status === "S";
    
    return { hasOpenSession: hasOpen, isCompleted: completed };
  }, [checkInData, project]);

  const handleToggleDetails = () => {
    setIsDetailsOpen(!isDetailsOpen);
  };

  const renderPrimaryButton = () => {
    const getLastEntryStatus = useMemo(() => {
      if (!project?.original_A?.ts_data_list?.length) return 'not_started';
      
      const entries = project.original_A.ts_data_list;
      const lastEntry = entries[entries.length - 1];
      const geoData = lastEntry?.geo_data || '';
      
      if (geoData.includes('I|') && geoData.includes('O|')) {
        return 'checked_out';
      } else if (geoData.includes('I|') && !geoData.includes('O|')) {
        return 'open_session';
      }
      return 'unknown';
    }, [project?.original_A?.ts_data_list]);

    const isActivityCompleted = project?.original_A?.status === "S";
    const thisProjectHasOpenSession = hasOpenSession;
    const lastEntryStatus = getLastEntryStatus;

    // 1. If activity is completed (status: "S")
    if (isActivityCompleted) {
      return (
        <View style={[styles.btn, styles.disabledBtn]}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Activity is complete</Text>
        </View>
      );
    }

    // 2. If activity has pending checkout from previous day
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

    // 3. If this project has an open session
    if (thisProjectHasOpenSession || lastEntryStatus === 'open_session') {
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

    // 4. If there's any open session globally, disable other projects
    if (hasOpenSessionGlobally && !thisProjectHasOpenSession) {
      return (
        <View style={[styles.btn, styles.disabledBtn]}>
          <Ionicons name="lock-closed-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Finish Pending</Text>
        </View>
      );
    }

    // 5. If activity was checked out but not submitted
    if (lastEntryStatus === 'checked_out') {
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

    // 6. If activity hasn't started yet
    if (!project?.original_A) {
      return (
        <TouchableOpacity
          style={[styles.btn, styles.primaryBtn]}
          onPress={() => onAction({ type: 'start', project })}
        >
          <Ionicons name="log-in-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Start Activity</Text>
        </TouchableOpacity>
      );
    }

    // 7. Fallback for Resume button
    if (project?.original_A) {
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

    // Default fallback
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
  const store_location= project?.original_A?.store_name || project?.original_P?.store_name || '';
  const store_remark= project?.original_A?.store_remarks || project?.original_P?.store_remarks || '';

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

      <View style={styles.timeline}>
        <Text style={styles.sectionTitle}>Store Location</Text>
        <TimelineRow
          icon="home"
          value={store_location}
        />
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        <Text style={styles.sectionTitle}>Project Timeline</Text>
        <TimelineRow
          icon="calendar-outline"
          label="Planned Date"
          value={`${formatDate(project?.planned_start_date)} to ${formatDate(project?.planned_end_date)}`}
        />
        {project.actual_start_date && <TimelineRow
          icon="calendar-outline"
          label="Actual Date"
          value={`${formatDate(project?.original_A?.start_date)} to ${formatDate(project?.original_A?.end_date)}`}
        />}
      </View>

      {/* Retainer Section - Always visible if there are retainers */}
<RetainerSection
  project={project}
  retainerData={retainerData}
  onToggleRetainers={onToggleRetainers}
  onEdit={onEditRetainer}
  onDelete={onDeleteRetainer}
  onViewDetails={onViewRetainerDetails}
  onRetainerAction={handleRetainerAction} // Add this
  hasOpenSessionGlobally={hasAnyOpenSession} // Pass from parent
/>

      {/* Expanded Details */}
      {isDetailsOpen && (
        <View style={styles.detailsSection}>
          <View style={styles.timeline}>
            <Text style={styles.sectionTitle}>Store Remark</Text>
            <TimelineRow
              icon="pin"
              value={store_remark}
            />
          </View>
          
          <View style={styles.progressHeader}>
            <Text style={styles.sectionTitle}>Daily Progress</Text>
            <Text style={styles.calendarProgress}>
              {loggedDates.length}/{plannedDays.length} days completed
            </Text>
          </View>

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
        {(periodStatus === 'In Progress' || periodStatus === 'Planned' || periodStatus === 'Pending') && renderPrimaryButton()}
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

  // Retainer Section Styles (only styles used in AuditCard component)
  retainerSection: {
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  viewRetainersButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#e8eef6',
  },
  viewRetainersText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  retainersList: {
    padding: 12,
    gap: 12,
  },
  sectionError: {
    fontSize: 13,
    color: '#dc2626',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
  },
});
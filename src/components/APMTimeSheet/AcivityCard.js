import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { AntDesign, FontAwesome6, Ionicons } from '@expo/vector-icons';
import { colors } from '../../Styles/appStyle';
import RetainerCard from './RetainerCard';
import { DateForApiFormate, formatAMPMTime, formatToDDMMYYYY, getTodayApiDateStr } from './utils';
import ConfirmationModal from '../ConfirmationModal';

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
  if (typeof status === 'boolean') {
    return status ?  '#ef4444' : '#10b981'; // green / red
  }

  const s = (status || '').toLowerCase();
  return s === 'completed'
    ? '#10b981'
    : s === 'in progress'
    ? '#f59e0b'
    : '#64748b';
};

const StatusBadge = ({ status }) => {
  const isBoolean = typeof status === 'boolean';
  const displayText = isBoolean ? status ? 'No' : 'Yes' : status || 'Planned';

  return (
    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
      <Text style={styles.statusText}>{displayText}</Text>
    </View>
  );
};

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

// === Retainer Section Component ===
const RetainerSection = ({ 
  project, 
  retainerData, 
  onToggleRetainers,
  onRetainerAction,
  hasOpenSessionGlobally
}) => {
  const retainers = project?.original_P?.retainer_list || [];

  // Filter out retainers with a_type: "A"
  const validRetainers = retainers.filter(retainer => retainer.a_type !== "A");

  if (validRetainers.length === 0) return null;

  const projectRetainerData = retainerData[project.id] || {};
  const isExpanded = projectRetainerData.expanded || false;
  const isLoading = projectRetainerData.loading || false;

  return (
    <View style={styles.retainerSection}>
      <TouchableOpacity
        style={styles.viewRetainersButton}
        onPress={() => {
          onToggleRetainers(project.id, validRetainers);
        }}
        disabled={isLoading}
      >
        <Text style={styles.viewRetainersText}>
          View Retainers ({validRetainers.length})
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
          {projectRetainerData.retainers.map((retainer, index) => {
            // Additional safety check - filter out any a_type: "A" that might have slipped through
            if (retainer.a_type === "A") return null;

            // Debug each retainer
            // console.log(`🎯 Retainer ${index}:`, {
            //   name: retainer.employee_name,
            //   emp_id: retainer.emp_id,
            //   hasFullData: !!retainer.fullData,
            //   fullDataKeys: retainer.fullData ? Object.keys(retainer.fullData) : []
            // });

            return (
              <RetainerCard
                parentProject={project}
                key={`${project.id}-${retainer.emp_id}-${index}`}
                retainer={retainer}
                fullData={retainer.fullData}
                onAction={onRetainerAction}
                hasOpenSessionGlobally={hasOpenSessionGlobally}
              />
            );
          })}

          {projectRetainerData.error && (
            <Text style={styles.sectionError}>{projectRetainerData.error}</Text>
          )}

          {/* Show message if no valid retainers after filtering */}
          {projectRetainerData.retainers &&
            projectRetainerData.retainers.filter(r => r.a_type !== "A").length === 0 && (
              <Text style={styles.noRetainersText}>
                No active retainers available
              </Text>
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
  showPincodeModal,
  isLoading
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [confirmPopup, setConfirmPopup] = useState({
       isOpen: false,
       title: "",
       message: "",
       onConfirm: null,
   });
  // console.log("Project Details---",project)
  const todayStr = getTodayApiDateStr();

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


  const lastEntryStatus = useMemo(() => {
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

  const auditEndDate = project?.original_P?.max_audit_end_date;
    const isAuditEndDatePass = auditEndDate && DateForApiFormate(auditEndDate, true) < DateForApiFormate(todayStr, true);
    const isPlannedEndExceed = DateForApiFormate(project?.planned_end_date, true) < DateForApiFormate(todayStr, true);

  const isNonNegotiable = project?.original_P?.is_non_negotiable_date;
  const isStrictDeadlinePassed = isNonNegotiable && isAuditEndDatePass;

  const showAuditExceededMessage = isNonNegotiable && isAuditEndDatePass;


  const renderPrimaryButton = () => {

    const isActivityCompleted = project?.original_A?.status === "S";
    const thisProjectHasOpenSession = hasOpenSession;

    if(project?.original_P?.status !== "S"){
       return (<></>)
    }

    // 1. If activity is completed (status: "S")
    if (isActivityCompleted) {
      return (
        // <View style={[styles.btn, styles.disabledBtn]}>
        //   <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
        //   <Text style={styles.btnText}>Activity is complete</Text>
        // </View>
        <TouchableOpacity
          style={[styles.btn, styles.primaryBtn, isLoading && styles.disabledBtn]}
          onPress={() => onAction({ type: 'start_a', project, isMaxAuditEndDatePass: showAuditExceededMessage })}
          disabled={isLoading}
        >
          <Ionicons name="log-in-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Start Again Activity</Text>
        </TouchableOpacity>
      );
    }

    // 2. If activity has pending checkout from previous day
    // Always allow this to remain visible even if strict deadline has passed
    if (project?.hasPendingCheckout) {
      return (
        <TouchableOpacity
          style={[styles.btn, styles.primaryBtn ,isLoading && styles.disabledBtn]}
          onPress={() => onAction({ type: 'checkout_yesterday', project })}
          disabled={isLoading}
        >
          <Ionicons name="time-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Close Check-in</Text>
        </TouchableOpacity>
      );
    }

    // 3. If this project has an open session
    // Always allow this to remain visible even if strict deadline has passed
    if (thisProjectHasOpenSession || lastEntryStatus === 'open_session') {
      return (
        <TouchableOpacity
          style={[styles.btn, styles.checkOutBtn, isLoading && styles.disabledBtn]}
          onPress={() => onAction({ type: 'continue', project })}
          disabled={isLoading}
        >
          <Ionicons name="log-out-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Check Out</Text>
        </TouchableOpacity>
      );
    }

    // If strict deadline has passed and no open session to close, hide all other buttons
    if (isStrictDeadlinePassed) {
      return null;
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
          style={[styles.btn, styles.primaryBtn,isLoading && styles.disabledBtn]}
          onPress={() => onAction({ type: 'resume', project, isMaxAuditEndDatePass: showAuditExceededMessage })}
          disabled={isLoading}
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
          style={[styles.btn, styles.primaryBtn ,isLoading && styles.disabledBtn]}
          onPress={() => onAction({ type: 'start', project, isMaxAuditEndDatePass: showAuditExceededMessage })}
          disabled={isLoading}
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
          disabled={isLoading}
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
        disabled={isLoading}
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
  const store_location = project?.original_A?.store_name || project?.original_P?.store_name || '';
  const store_remark = project?.original_A?.store_remarks || project?.original_P?.store_remarks || '';
  const document_required = project?.original_P?.is_file_applicable;
  const document_uploaded = project?.original_A?.submitted_file;

  // console.log("project",JSON.stringify(project))

  return (
    <>
    <View style={[ styles.card, { backgroundColor: isStrictDeadlinePassed && periodStatus !== "Completed"  ? `${colors.red}40` : '#fff' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.customerName} numberOfLines={1}>{customerName}</Text>
          <Text style={styles.orderKey}>{project?.order_item_key}</Text>
        </View>
        <StatusBadge status={periodStatus} />
      </View>

      {/* Info Grid */}
      <View style={[styles.infoGrid, { backgroundColor: isStrictDeadlinePassed && periodStatus !== "Completed" ? `${colors.red}20` : '#f8fafc' }]}>
        <InfoItem icon="briefcase-outline" label="Audit Type" value={auditType} />
        <InfoItem icon="cube-outline" label="Items" value={noOfItems} />
        {document_required && <InfoItem icon="document-attach-outline" label="Document Upload" value={document_uploaded ?
          <Ionicons name="checkmark" size={24} color={colors.success} /> : <Ionicons name="close" size={24} color={colors.red} />} />
        }
      </View>

      <View style={[styles.cardContainer, { backgroundColor: isStrictDeadlinePassed && periodStatus !== "Completed" ? `${colors.red}20` : '#f8fafc' }]}>
        {/* LEFT SIDE */}
        <View style={styles.leftSection}>
          <View style={styles.headerRow}>
             <Ionicons name="home" size={12} color="#64748b" />
            <Text style={styles.label}>Store Location</Text>
          </View>
          <Text style={styles.value}>{store_location || "--"}</Text>

          {project?.original_P?.store_code &&
          <> 
          <View style={styles.headerRow}>
             <Ionicons name="home" size={12} color="#64748b" />
            <Text style={styles.label}>Store code</Text>
          </View>
          <Text style={styles.value}>{project?.original_P?.store_code}</Text>
          </>
          }
        </View>

        {/* DIVIDER */}
        <View style={styles.divider} />

        {/* RIGHT SIDE */}
        <View style={styles.rightSection}>
          <View style={styles.headerRow}>
            <Ionicons name="pin" size={12} color="#64748b" />
            <Text style={styles.label}>PinCode</Text>
          </View>
            {!project?.original_P?.pin_code ? (
              <TouchableOpacity
                style={[styles.btn, styles.primaryBtn, {maxHeight: 50}]}
                onPress={() => showPincodeModal(project)}
              >
                <AntDesign name="plus" size={14} color="#fff" />
                <Text style={styles.btnText}>Add</Text>
              </TouchableOpacity>
            ): <Text style={styles.value}>
              {project.original_P.pin_code}
            </Text>}
          </View>
      </View>
      
      {project?.original_P?.is_non_negotiable_date && project?.original_P?.max_audit_end_date && 
      //  <View style={[styles.timeline,{ backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginTop: 10 }]}>
        <View style={[styles.cardContainer2]}>
          <Text style={{ color: colors.white, textAlign: "center", fontWeight: "600"}}>Non negotiable Date: {`${formatDate(project?.original_P?.audit_date)} to ${formatDate(project?.original_P?.max_audit_end_date)}`}</Text>
        </View>

      // </View>
      
      }

      {/* Timeline */}
      <View style={styles.timeline}>
        <Text style={styles.sectionTitle}>Project Timeline</Text>
        <TimelineRow
          icon="calendar-outline"
          label="Planned Date"
          value={`${formatDate(project?.original_P?.start_date)} to ${formatDate(project?.original_P?.end_date)}`}
        />
        <TimelineRow
          icon="calendar-outline"
          label="Planned Time"
          value={`${formatAMPMTime(project?.original_P?.start_time)} to ${formatAMPMTime(project?.original_P?.end_time)}`}
        />
        {/* {project.actual_start_date && <TimelineRow
          icon="calendar-outline"
          label="Actual Date"
          value={`${formatDate(project?.original_A?.start_date)} to ${formatDate(project?.original_A?.end_date)}`}
        />} */}
      </View>

      {showAuditExceededMessage && project?.project_period_status !== "Completed" &&
        <View>
          <Text style={{ color: colors.red, marginBottom: "15" }}>{
            isStrictDeadlinePassed ? "Audit max end date has been exceeded. You can't start the activity" :
              "Audit max end date has been exceeded"}
          </Text>
        </View>}

      {/* Retainer Section - Always visible if there are retainers */}
      <RetainerSection
        project={project}
        retainerData={retainerData}
        onToggleRetainers={onToggleRetainers}
        // onRetainerAction={handleRetainerActionWrapper}
        onRetainerAction={onAction}
        hasOpenSessionGlobally={hasOpenSessionGlobally}
      />

      {/* Action Buttons */}
      <View style={styles.actions}>
        {(periodStatus === 'In Progress' || periodStatus === 'Planned' || periodStatus === 'Pending' || periodStatus === 'Completed') && renderPrimaryButton()}
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

      {/* Expanded Details */}
      {isDetailsOpen && (
        <View style={styles.detailsSection}>
          {store_remark && <View style={styles.timeline}>
            <Text style={styles.sectionTitle}>Account Manager Remark</Text>
            <TimelineRow
              value={store_remark}
            />
          </View>}

          <View style={styles.progressHeader}>
            <Text style={styles.sectionTitle}>Daily Progress</Text>
            {/* <Text style={styles.calendarProgress}>
              {loggedDates.length}/{plannedDays.length} days completed
            </Text> */}
          </View>

          {/* Daily Logs */}
          {checkInData?.length > 0 ? (
            <>
              <ScrollView style={styles.dailyLogScroll} nestedScrollEnabled>
                <View style={styles.dailyLog}>
                  {checkInData?.map((entry, idx) => (
                    <DailyLogEntry key={idx} entry={entry} />
                  ))}
                </View>
              </ScrollView>
              {project.project_period_status === "Completed" && project?.original_A?.status !== "A" && 
              <TouchableOpacity
                style={[styles.btn, styles.primaryBtn, { marginTop: 10 }]}
                onPress={() => onAction({ type: 'reverse', project})}

              >
                <FontAwesome6 name="check-circle" size={16} color={colors.white} />
                <Text style={styles.btnText}>Reverse Audit Status</Text>
              </TouchableOpacity>
              }
              {(project.project_period_status !== "Completed" && !project?.hasPendingCheckout && !hasOpenSession) && 
              <TouchableOpacity
                style={[styles.btn, styles.successBtn, { marginTop: 10 }]}
                onPress={() => onAction({ type: 'force_complete', project })}
              >
                <FontAwesome6 name="check-circle" size={16} color={colors.white} />
                <Text style={styles.btnText}>Mark as Complete</Text>
              </TouchableOpacity>}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={24} color="#cbd5e1" />
              <Text style={styles.emptyText}>No activity logged yet</Text>
            </View>
          )}
        </View>
      )}
    </View>

 <ConfirmationModal
            visible={confirmPopup.isOpen}
            title={confirmPopup.title}
            message={confirmPopup.message}
            onConfirm={confirmPopup.onConfirm}
            onCancel={() => setConfirmPopup((p) => ({ ...p, isOpen: false }))}
            messageColor={!isPlannedEndExceed ? "red" : ""}
        />
    </>
  );
};

// DailyLogEntry Component (moved down to fix reference)
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
            <Text style={styles.logTimeText}>{entry.check_out.time}</Text>
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
    marginBottom: 10,
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
    marginTop: 12,
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
  successBtn: {
    backgroundColor: colors.success,
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

  // Retainer Section Styles
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
  noRetainersText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  calendarProgress: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
    cardContainer: {
    flexDirection: "row",
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
    cardContainer2: {
    flexDirection: "row",
    // backgroundColor: '#f8fafc',
     backgroundColor: colors.red,
    borderRadius: 10,
    padding: 6,
    marginVertical: 5,
    alignItems: "center",
    // justifyContent: "center"
  },

  leftSection: {
    flex: 7,
    justifyContent: "center",
  },

  rightSection: {
    flex: 3,
    justifyContent: "center",
  },

  divider: {
    width: 1,
    height: "100%",
    backgroundColor: '#64748b',
    marginHorizontal: 10,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap:5
  },

  label: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 2,
    fontWeight: 500,
  },

  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 14
  },
});
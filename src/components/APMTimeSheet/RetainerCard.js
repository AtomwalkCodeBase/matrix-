import React from 'react'; // Remove useMemo import
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../Styles/appStyle';

// Main Retainer Card Component
const RetainerCard = ({ 
  retainer, 
  fullData, 
  onAction, // New prop for handling activity actions
  hasOpenSessionGlobally = false // New prop to check if there's any open session globally
}) => {

  console.log("Retainer data in card---",retainer)
  
  // Determine which data to display
  const displayData = fullData || retainer;
  
  // Determine status based on available data
  const getStatus = () => {
    if (fullData?.status_display) {
      return fullData.status_display;
    }
    if (fullData?.status === 'S') {
      return 'SUBMITTED';
    }
    if (fullData?.status === 'A') {
      return 'ACTIVE';
    }
    return 'ASSIGNED';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
      case 'ASSIGNED':
        return colors.success;
      case 'SUBMITTED':
        return colors.info;
      case 'COMPLETED':
        return colors.secondary;
      default:
        return colors.warning;
    }
  };

  const status = getStatus();
  const statusColor = getStatusColor(status);

  // Check if retainer has an open session
  const hasOpenSession = () => {
    if (!fullData?.day_logs) return false;
    
    const lastLogEntry = Object.values(fullData.day_logs || {}).pop();
    const hasOpenFromDayLogs = lastLogEntry &&
      lastLogEntry.check_in &&
      !lastLogEntry.check_out;

    let hasOpenFromTsData = false;
    if (fullData?.original_A?.ts_data_list?.length) {
      const entries = fullData.original_A.ts_data_list;
      const lastTsEntry = entries[entries.length - 1];
      const geoData = lastTsEntry?.geo_data || '';
      hasOpenFromTsData = geoData.includes('I|') && !geoData.includes('O|');
    }

    return hasOpenFromDayLogs || hasOpenFromTsData;
  };

  // Function to determine button state and action for retainer
  const renderRetainerActivityButton = () => {
    if (!fullData) {
      // If we don't have full retainer data, show disabled button
      return (
        <View style={[styles.btn, styles.disabledBtn]}>
          <Ionicons name="information-circle-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>No Activity Data</Text>
        </View>
      );
    }

    // Check if retainer activity is completed
    const isCompleted = fullData?.original_A?.status === "S";
    const hasSession = hasOpenSession();

    // 1. If activity is completed
    if (isCompleted) {
      return (
        <View style={[styles.btn, styles.disabledBtn]}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Activity Complete</Text>
        </View>
      );
    }

    // 2. If retainer has pending checkout from previous day
    if (fullData?.hasPendingCheckout) {
      return (
        <TouchableOpacity
          style={[styles.btn, styles.primaryBtn]}
          onPress={() => onAction && onAction({ 
            type: 'checkout_yesterday', 
            retainer: displayData 
          })}
        >
          <Ionicons name="time-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Checkout Yesterday</Text>
        </TouchableOpacity>
      );
    }

    // 3. If retainer has an open session
    if (hasSession) {
      return (
        <TouchableOpacity
          style={[styles.btn, styles.checkOutBtn]}
          onPress={() => onAction && onAction({ 
            type: 'continue', 
            retainer: displayData 
          })}
        >
          <Ionicons name="log-out-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Check Out</Text>
        </TouchableOpacity>
      );
    }

    // 4. If there's any open session globally and retainer doesn't have one
    if (hasOpenSessionGlobally && !hasSession) {
      return (
        <View style={[styles.btn, styles.disabledBtn]}>
          <Ionicons name="lock-closed-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Finish Pending</Text>
        </View>
      );
    }

    // 5. If activity was checked out but not submitted
    if (fullData?.original_A?.id && !hasSession) {
      return (
        <TouchableOpacity
          style={[styles.btn, styles.primaryBtn]}
          onPress={() => onAction && onAction({ 
            type: 'resume', 
            retainer: displayData 
          })}
        >
          <Ionicons name="play-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Resume Activity</Text>
        </TouchableOpacity>
      );
    }

    // 6. If retainer hasn't started activity yet
    if (!fullData?.original_A) {
      return (
        <TouchableOpacity
          style={[styles.btn, styles.primaryBtn]}
          onPress={() => onAction && onAction({ 
            type: 'start', 
            retainer: displayData 
          })}
        >
          <Ionicons name="log-in-outline" size={16} color="#fff" />
          <Text style={styles.btnText}>Start Activity</Text>
        </TouchableOpacity>
      );
    }

    // 7. Fallback for Resume button
    if (fullData?.original_A) {
      return (
        <TouchableOpacity
          style={[styles.btn, styles.primaryBtn]}
          onPress={() => onAction && onAction({ 
            type: 'resume', 
            retainer: displayData 
          })}
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
        onPress={() => onAction && onAction({ 
          type: 'start', 
          retainer: displayData 
        })}
      >
        <Ionicons name="log-in-outline" size={16} color="#fff" />
        <Text style={styles.btnText}>Start Activity</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.card}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={24} color={colors.white} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.employeeName}>
              {displayData.employee_name || retainer.employee_name}
            </Text>
            <Text style={styles.empId}>ID: {displayData.emp_id || retainer.emp_id}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>

      {/* Project Info (if available) */}
      {fullData?.project_name && (
        <View style={styles.projectInfo}>
          <Ionicons name="briefcase-outline" size={14} color={colors.primary} />
          <Text style={styles.projectName}>Project: {fullData.project_name}</Text>
        </View>
      )}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Basic Info Section */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <View style={styles.iconLabel}>
            <Ionicons name="people-outline" size={16} color={colors.primary} />
            <Text style={styles.label}>Resources:</Text>
          </View>
          <Text style={styles.value}>{retainer.no_resource}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.iconLabel}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={styles.label}>Start:</Text>
          </View>
          <Text style={styles.value}>{retainer.start_date}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.iconLabel}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={styles.label}>End:</Text>
          </View>
          <Text style={styles.value}>{retainer.end_date}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.iconLabel}>
            <Ionicons name="cube-outline" size={16} color={colors.primary} />
            <Text style={styles.label}>Items:</Text>
          </View>
          <Text style={styles.value}>{retainer.no_of_items}</Text>
        </View>
      </View>

      {/* Activity Button Section */}
      <View style={styles.activityButtonSection}>
        {renderRetainerActivityButton()}
      </View>

      {retainer.error && (
        <Text style={styles.errorText}>{retainer.error}</Text>
      )}
    </View>
  );
};

export default RetainerCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTextContainer: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  empId: {
    fontSize: 12,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  projectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    gap: 6,
  },
  projectName: {
    fontSize: 12,
    color: '#0369a1',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  infoSection: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#64748b',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  // Activity Button Styles
  activityButtonSection: {
    marginTop: 8,
    marginBottom: 4,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    width: '100%',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
  },
  checkOutBtn: {
    backgroundColor: '#ef4444',
  },
  disabledBtn: {
    backgroundColor: '#94a3b8',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  // Action Buttons
  actionSection: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  detailsBtn: {
    backgroundColor: '#dbeafe',
  },
  editBtn: {
    backgroundColor: '#fef3c7',
  },
  deleteBtn: {
    backgroundColor: '#fee2e2',
  },
  detailsBtnText: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '500',
  },
  editBtnText: {
    fontSize: 12,
    color: '#d97706',
    fontWeight: '500',
  },
  deleteBtnText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});
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
const formatDate = (dateStr) => {
  if (!dateStr) return 'Not set';
  return dateStr;
};

// === Main Component ===
export const OPECard = ({ 
  project, 
  onAction,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get values from project
  const opeAmount = project?.original_A?.ope_amt || project?.original_P?.ope_amt || "0.00";
  const hasOPEAmount = opeAmount && opeAmount !== "0.00";
  
  // Check order status
  const isOrderActive = project?.original_P?.order_item_status === "A" || 
                        project?.original_A?.order_item_status === "A";
  
  // Check activity status
  const isActivityCompleted = project?.original_A?.status === "S";
  const isApproved = project?.original_A?.status_display === "APPROVED";
  
  // Check if OPE Actual
  const isOpeActual = project?.original_P?.is_ope_actual === true || 
                      project?.original_A?.is_ope_actual === true ||
                      project?.is_ope_actual === true;

  // Determine button state
  const showAddButton = isOrderActive && isOpeActual && !hasOPEAmount;
  const showUpdateButton = isOrderActive && isOpeActual && hasOPEAmount;
  
  // Special case: Activity completed but OPE pending (status "S" but ope_amt is "0.00")
  const isOpePending = isOrderActive && isActivityCompleted && !hasOPEAmount;

  const handleOPEAction = () => {
    if (hasOPEAmount) {
      onAction({ 
        type: 'update_ope_amount', 
        project,
        opeAmount: opeAmount
      });
    } else {
      onAction({ 
        type: 'add_ope_amount', 
        project 
      });
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Basic project info
  const customerName = project?.customer_name || 'Unknown Customer';
  const orderKey = project?.order_item_key || '';
  const auditType = project?.original_P?.product_name || project?.audit_type || 'N/A';
  const storeLocation = project?.original_A?.store_name || project?.original_P?.store_name || 'Not assigned';
  const plannedDates = `${formatDate(project?.planned_start_date)} - ${formatDate(project?.planned_end_date)}`;
  const periodStatus = project?.project_period_status || 'Planned';
  const {color ,label} = getStatusColor(project.order_item_status, hasOPEAmount)

  return (
    <View style={styles.card}>
      {/* Header with Customer and Status */}
      <View style={styles.header}>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName} numberOfLines={1}>
            {customerName}
          </Text>
          <Text style={styles.orderKey}>{orderKey}</Text>
        </View>
        
        {/* Show special badge for OPE Pending */}
        {isOpePending && (
          <View style={[styles.statusBadge, { backgroundColor: '#f59e0b' }]}>
            <Text style={styles.statusText}>OPE Pending</Text>
          </View>
        )}
        
        {/* Show regular status badge for other cases */}
        {!isOpePending && (
          <View style={[styles.statusBadge, { backgroundColor: color }]}>
            <Text style={styles.statusText}>{label}</Text>
          </View>
        )}
      </View>

      {/* Show OPE Pending message if applicable */}
      {isOpePending && (
        <View style={styles.opePendingContainer}>
          <Ionicons name="alert-circle-outline" size={18} color="#f59e0b" />
          <Text style={styles.opePendingText}>
            Activity Completed - OPE Amount Pending
          </Text>
        </View>
      )}

      {/* Audit Type - Only show if not updating OPE (for cleaner UI) */}
      {!showUpdateButton && (
        <View style={styles.auditTypeContainer}>
          <Ionicons name="briefcase-outline" size={14} color="#64748b" />
          <Text style={styles.auditTypeText}>{auditType}</Text>
        </View>
      )}

      {/* Store Location - Always show */}
      <View style={styles.locationContainer}>
        <Ionicons name="location-outline" size={16} color="#64748b" />
        <Text style={styles.locationText} numberOfLines={1}>{storeLocation}</Text>
      </View>

      {/* Dates - Always show */}
      <View style={styles.datesContainer}>
        <Ionicons name="calendar-outline" size={16} color="#64748b" />
        <Text style={styles.datesText}>{plannedDates}</Text>
      </View>

      {/* OPE Amount Display (if exists) */}
      {hasOPEAmount && (
        <View style={styles.opeContainer}>
          <Ionicons name="cash-outline" size={16} color="#10b981" />
          <Text style={styles.opeLabel}>OPE Amount:</Text>
          <Text style={styles.opeValue}>₹{opeAmount}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {/* Show Add button for: Order Active, OPE Actual, No amount */}
        {showAddButton && (
          <TouchableOpacity
            style={[styles.opeButton, styles.addButton]}
            onPress={handleOPEAction}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.opeButtonText}>Add OPE Amount</Text>
          </TouchableOpacity>
        )}

        {/* Show Update button for: Order Active, OPE Actual, Has amount */}
        {showUpdateButton && (
          <TouchableOpacity
            style={[styles.opeButton, styles.updateButton]}
            onPress={handleOPEAction}
          >
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.opeButtonText}>Update OPE Amount</Text>
          </TouchableOpacity>
        )}

        {/* If no action needed, show disabled state */}
        {!showAddButton && !showUpdateButton && (
          <View style={[styles.opeButton, styles.disabledButton]}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#94a3b8" />
            <Text style={[styles.opeButtonText, styles.disabledText]}>Already Approved</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Helper function for status colors
const getStatusColor = (status, hasOPEAmount) => {
  console.log(status,hasOPEAmount)
  const s = (status || '').toUpperCase();
  switch(s) {
    case 'A': return { color: '#2196F3', label: hasOPEAmount ? "OPE Given" : 'OPE Pending' };
    case 'F': return { color: '#4CAF50', label: 'F&A Approved' };
    case 'B': return { color: '#4CAF50', label: 'Ready for Billing' };
    case 'S': return { color: '#4CAF50', label: 'Submitted to BO' };
    case 'H': return { color: '#ef4444', label: 'Rejected' };
    case 'X': return { color: '#ef4444', label: 'Cancelled' };
    default: return { color: '#64748b', label: status || 'Unknown' };
  }
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
    marginRight: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  orderKey: {
    fontSize: 12,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  opePendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  opePendingText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
    flex: 1,
  },
  auditTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  auditTypeText: {
    fontSize: 13,
    color: '#475569',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
  },
  datesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  datesText: {
    fontSize: 13,
    color: '#475569',
  },
  opeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  opeLabel: {
    fontSize: 13,
    color: '#065f46',
    fontWeight: '500',
  },
  opeValue: {
    fontSize: 15,
    color: '#047857',
    fontWeight: '700',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  opeButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButton: {
    backgroundColor: PRIMARY_COLOR,
  },
  updateButton: {
    backgroundColor: '#f59e0b',
  },
  disabledButton: {
    backgroundColor: '#e2e8f0',
  },
  opeButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  disabledText: {
    color: '#64748b',
  },
  expandButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    gap: 4,
  },
  expandButtonText: {
    color: PRIMARY_COLOR,
    fontSize: 12,
    fontWeight: '500',
  },
  expandedSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  remarkBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  remarkText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  docStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docStatusText: {
    fontSize: 13,
    color: '#475569',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    width: 100,
  },
  detailValue: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
    flex: 1,
  },
});
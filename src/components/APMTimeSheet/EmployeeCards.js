import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { colors } from '../../Styles/appStyle';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { Modal, ScrollView } from 'react-native';
import { apiDateToDDMMYYYY, formatToApiDate, formatToDDMMYYYY, getStatusStyles } from './utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfirmationModal from '../ConfirmationModal';
import SuccessModal from '../SuccessModal';
import ErrorModal from '../ErrorModal';
import Loader from '../old_components/Loader';

export const InfoCard = ({ label, value, style }) => (
  <View style={[styles.infoCard, style]}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || 'N/A'}</Text>
  </View>
);

export const StatusBadge = ({ status }) => {
    const statusStyle = getStatusStyles(status);
    return (
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bgColor }]}>
            {/* <MaterialIcons name={statusStyle.icon} size={16} color={statusStyle.color}/> */}
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
                {status}
            </Text>
        </View>
    )
};

// export default function EmployeeListScreen({empData}) {
//   const [selectedEmployee, setSelectedEmployee] = useState(null);
//   const [approveSessionData, setApproveSessionData] = useState(null);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [confirmModalVisible, setConfirmModalVisible] = useState(false);
//   const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
//   const [successMessage, setSuccessMessage] = useState('');
//   const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
//   const [errorMessage, setErrorMessage] = useState('');
//   const [isLoading, setIsLoading] = useState(false);


//   const handleCardPress = (employee) => {
//     setSelectedEmployee(employee);
//     setModalVisible(true);
//   };

//   const handleApproveAll = (data) => {
//     setConfirmModalVisible(true)
//     setApproveSessionData(data);
//   };

//   const handleConfirm = async () => {
//     if (!approveSessionData) return;
//     const approverId = await AsyncStorage.getItem("empId")

//     setIsLoading(true);

//     try {
//       const payload = {
//         emp_id: approveSessionData.planned.original_P.emp_id,
//         start_date: apiDateToDDMMYYYY(approveSessionData.actual_start_date),
//         end_date: apiDateToDDMMYYYY(approveSessionData.actual_end_date),
//         call_mode: "WEEKLY_APPROVE",
//         a_emp_id: approverId,
//       };

//       // const response = await processTimesheetApproval(payload);

//       console.log(payload)

//       const response = { status: 200 }
//        if (response.status === 200) {
//         setIsSuccessModalVisible(true);
//         setSuccessMessage(`Weekly Timesheet approved" successfully for: ${approveSessionData.actual_start_date} to ${approveSessionData.actual_end_date}`);
//         getTimeSheetList();
//       } else {
//         setIsErrorModalVisible(true);
//         setErrorMessage(`Failed to approve Timesheet`);
//       }
//     } catch (error) {
//     //    console.error(`Error approving weekly Timesheet:`, error);
//       setIsErrorModalVisible(true);
//       setErrorMessage(error?.response?.data?.message || `Failed to approve Timesheet`);
//     } finally {
//       setIsLoading(false);
//     }
//   };


//   return (
//     <>
//       <FlatList
//         data={empData}
//         keyExtractor={(item) => item.emp_id}
//         renderItem={({ item }) => (
//             <EmployeeCard
//             employee={item}
//             onPress={() => handleCardPress(item)}
//             />
//         )}
//         // ListHeaderComponent={
//         //     <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 16 }}>
//         //     Employee Audits
//         //     </Text>
//         // }
//         contentContainerStyle={{ paddingBottom: 20, flexGrow: 1, }}
//         showsVerticalScrollIndicator={false}
//         />


//       <EmployeeDetailModal
//         visible={modalVisible}
//         employee={selectedEmployee}
//         onClose={() => setModalVisible(false)}
//         onApproveAll={handleApproveAll}
//       />

//       <ConfirmationModal
//         visible={confirmModalVisible}
//         message="Are you sure you want to approve this order item timesheet?"
//         onConfirm={() => {
//             handleConfirm()
//             setConfirmModalVisible(false);
//         }}
//         onCancel={() => setConfirmModalVisible(false)}
//         confirmText="Confirm"
//         cancelText="Cancel"
//             />

//         <SuccessModal
//           visible={isSuccessModalVisible}
//           onClose={() => setIsSuccessModalVisible(false)}
//           message={successMessage}
//         />

//         <ErrorModal
//           visible={isErrorModalVisible}
//           message={errorMessage}
//           onClose={() => setIsErrorModalVisible(false)}
//         />

//         <Loader visible={isLoading} />
//     </>
//   );
// }

  const getTotalCustomers = (customers) => customers.length;
  const getTotalOrderItems = (customers) => customers.reduce((sum, customer) => sum + customer.order_items.length, 0);

export const EmployeeCard = ({ employee, onPress }) =>{
     
    return(
    
  <TouchableOpacity style={styles.employeeCard} activeOpacity={0.7} onPress={onPress}>
    <View style={styles.cardHeader}>
      <View style={styles.headerLeft}>
        <Text style={styles.employeeName}>{employee.employee_name}</Text>
        <Text style={styles.employeeId}>ID: {employee.emp_id}</Text>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between",alignItems: "center" ,paddingTop: 10 }}>
        <View style={styles.statsRow}>
          <View style={styles.statBadge}>
            <Ionicons name="people-outline" size={14} color={colors.primary} />
            <Text style={styles.statNumber}>{getTotalCustomers(employee.customers)}</Text>
            <Text style={styles.statLabel}>Customers</Text>
          </View>
          <View style={styles.statBadge}>
            <Ionicons name="document-text-outline" size={14} color={colors.primary} />
            <Text style={styles.statNumber}>{getTotalOrderItems(employee.customers)}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.expandBtn} onPress={onPress}>
          <Ionicons name="chevron-down-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  </TouchableOpacity>
)};

export const AuditDetailCard = ({ audit, onViewSessions, onApprove }) => {
    return (
        <View style={{paddingHorizontal: 12, marginTop: 10}}>
            {audit.order_items?.map((orderItem, idx) => (
                <View key={idx} style={styles.auditCard}>
                    <View style={styles.auditHeader}>
                        <View style={styles.auditIcon}>
                            <MaterialIcons name="assessment" size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.auditTitle}>{audit.customer_name}</Text>
                            <Text style={styles.auditTitle}>{orderItem.order_item_key}</Text>
                            <Text style={styles.auditSubtitle}>{orderItem.audit_type}</Text>
                        </View>
                    </View>

                    <View style={styles.auditRow}>
                        <Text style={styles.auditLabel}>Location</Text>
                        <Text style={styles.auditValue}>{orderItem.location}</Text>
                    </View>

                    <View style={styles.auditRow}>
                        <Text style={styles.auditLabel}>Planned Date</Text>
                        <Text style={styles.auditValue}>
                            {orderItem.planned_start_date} - {orderItem.planned_end_date}
                        </Text>
                    </View>

                    <View style={styles.auditRow}>
                        <Text style={styles.auditLabel}>Work Time</Text>
                        <Text style={styles.auditValue}>
                            {orderItem.planned_start_time} - {orderItem.planned_end_time}
                        </Text>
                    </View>

                    <View style={styles.auditRow}>
                        <Text style={styles.auditLabel}>Actual Date</Text>
                        <Text style={styles.auditValue}>
                            {orderItem.actual_start_date === null ? "Not started yet" : `${orderItem.actual_start_date} - ${orderItem.actual_end_date}`}
                        </Text>
                    </View>

                    <View style={styles.auditRow}>
                        <Text style={styles.auditLabel}>Items</Text>
                        <Text style={styles.auditValue}>
                            {orderItem.audit_item_no_actual} / {orderItem.audit_item_no_planned}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: "center", paddingVertical: 6}}>
                      <Text style={{ fontSize: 14, color: colors.textLight, textTransform: 'uppercase',marginTop: 8}}>Order Item Status: </Text><StatusBadge status={orderItem.order_item_complete_status} />
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.actionBtn, styles.viewBtn]} onPress={() => onViewSessions(orderItem)}>
                            <Ionicons name="eye-outline" size={16} color={colors.white} />
                            <Text style={styles.actionBtnText}>View Sessions</Text>
                        </TouchableOpacity>
                        {/* <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => onApprove(orderItem)}>
                            <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
                            <Text style={styles.actionBtnText}>Approve</Text>
                        </TouchableOpacity> */}
                    </View>
                </View>
            ))}
        </View>
    );
};

export const SessionDetailModal = ({ visible, sessions, onClose, onApprove }) => {
  if (!sessions?.orderItem?.day_logs) return null;

  const dayLogs = sessions.orderItem.day_logs;

const processDayLogs = (dayLogs = []) => {
  if (!Array.isArray(dayLogs)) return [];

  const groupedByDate = {};

  dayLogs.forEach(log => {
    const date = log.date;
    if (!date) return;

    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }

    groupedByDate[date].push(log);
  });

  return Object.entries(groupedByDate).map(([date, logs]) => {
    // sort by first check-in time
    const sortedLogs = logs.sort((a, b) =>
      (a.first_check_in?.time || '').localeCompare(
        b.first_check_in?.time || ''
      )
    );

    const firstLog = sortedLogs[0];
    const lastLog = sortedLogs[sortedLogs.length - 1];

    return {
      date,
      checkInTime: firstLog.first_check_in?.time || 'N/A',
      checkOutTime: lastLog.last_check_out?.time || 'N/A',
      totalItems: logs.reduce(
        (sum, l) => sum + (l.units_counted || 0),
        0
      ),
      status: firstLog.approval_status || 'PENDING',
      ts_id: firstLog.ts_id,
    };
  });
};

 const processedSessions = useMemo(() => processDayLogs(dayLogs),[dayLogs]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.modalSheet}>
          <View style={styles.modalDrag} />

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Session Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons
                name="close-circle-outline"
                size={26}
                color={colors.textLight}
              />
            </TouchableOpacity>
          </View>

          <FlatList
            data={processedSessions}
            keyExtractor={(item, idx) => `${item.date}-${idx}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <View style={styles.sessionRow}>
                {/* Date */}
                <View style={{ flexDirection: 'row', alignContent: 'center',  marginBottom: 8 }}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={[styles.sessionDate, { marginLeft: 6 }]}>
                    {item.date}
                  </Text>
                </View>

                {/* Session grid */}
                <View style={styles.sessionGrid}>
                  <View style={styles.sessionMeta}>
                    <Text style={styles.sessionMetaLabel}>Check In</Text>
                    <Text style={styles.sessionMetaValue}>
                      {item.checkInTime || '--'}
                    </Text>
                  </View>

                  <View style={styles.sessionDivider} />

                  <View style={styles.sessionMeta}>
                    <Text style={styles.sessionMetaLabel}>Check Out</Text>
                    <Text style={styles.sessionMetaValue}>
                      {item.checkOutTime || '--'}
                    </Text>
                  </View>

                  <View style={styles.sessionDivider} />

                  <View style={styles.sessionMeta}>
                    <Text style={styles.sessionMetaLabel}>Items</Text>
                    <Text style={styles.sessionMetaValue}>
                      {item.totalItems}
                    </Text>
                  </View>
                </View>

                {/* Status */}
               <View style={{ flexDirection: 'row', alignItems: "center", paddingVertical: 6}}>
                <Text style={{ fontSize: 14, color: colors.textLight, textTransform: 'uppercase',marginTop: 8}}>Approval Status: </Text><StatusBadge status={item.status} />
              </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons
                  name="document-outline"
                  size={48}
                  color={colors.border}
                />
                <Text style={styles.emptyText}>No sessions recorded</Text>
              </View>
            }
          />
            {sessions?.orderItem?.order_item_complete_status === "completed" && <TouchableOpacity style={styles.approveAllBtn} onPress={() => onApprove(sessions.orderItem)}>
                <Ionicons name="checkmark-done-outline" size={20} color={colors.white} />
                <Text style={styles.approveAllText}>Approve All</Text>
              </TouchableOpacity>}
        </View>
      </View>
    </Modal>
  );
};

export const EmployeeDetailModal = ({ visible, employee, onClose, onApproveAll }) => {
  const [sessionModalVisible, setSessionModalVisible] = React.useState(false);
  const [selectedAuditSessions, setSelectedAuditSessions] = React.useState(null);

  if (!employee) return null;

  const handleViewSessions = (orderItem) => {
  const rawDayLogs = orderItem.actual?.day_logs;

  let dayLogsArray = [];

  if (Array.isArray(rawDayLogs)) {
    dayLogsArray = rawDayLogs;
  } else if (rawDayLogs && typeof rawDayLogs === 'object') {
    dayLogsArray = Object.values(rawDayLogs);
  }

  const normalizedDayLogs = dayLogsArray.map(log => ({
    ...log,
    check_in: log.check_in?.time || log.check_in || '',
    check_out: log.check_out?.time || log.check_out || '',
    units_counted: log.no_of_items || log.units_counted || 0,
    approval_status: log.approval_status || 'PENDING',
  }));

  setSelectedAuditSessions({
    orderItem: {
      ...orderItem,
      day_logs: normalizedDayLogs,
    },
  });

  setSessionModalVisible(true);
};


  return (
    <>
     <Modal visible={visible} transparent animationType="slide">
  <View style={styles.overlay}>
    {/* tap outside to close */}
    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

    <View style={styles.modalSheet}>
      <View style={styles.modalDrag} />

      <View style={styles.modalHeader}>
        <View>
          <Text style={styles.modalTitle}>{employee.employee_name}</Text>
          <Text style={{ fontSize: 12, color: colors.textLight }}>
            {employee.emp_id}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close-circle-outline" size={26} color={colors.textLight} />
        </TouchableOpacity>
      </View>

      {/* 🔥 Use FlatList instead of ScrollView */}
      <FlatList
        data={employee.customers || []}
        keyExtractor={(_, idx) => String(idx)}
        renderItem={({ item }) => (
          <AuditDetailCard
            audit={item}
            onViewSessions={handleViewSessions}
            // onApprove={onApproveAll}
          />
        )}
        ListHeaderComponent={
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.infoGrid}>
              <InfoCard label="Total Customers" value={getTotalCustomers(employee.customers)} />
              <InfoCard label="Total Orders" value={getTotalOrderItems(employee.customers)} />
            </View>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  </View>
</Modal>


      <SessionDetailModal
        visible={sessionModalVisible}
        sessions={selectedAuditSessions}
        onClose={() => setSessionModalVisible(false)}
        onApprove={onApproveAll}
      />
    </>
  );
};

export const styles = StyleSheet.create({
  // ── Employee Card ──
  employeeCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    backgroundColor: colors.white,
    padding: 16,
    flexDirection: "column",
    justifyContent: 'space-between',
    alignItems: "flex-start",
  },
  headerLeft: {
    flex: 1,
  },
  employeeName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  employeeId: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textLight,
  },
  expandBtn: {
    padding: 8,
  },

  // ── Modal ──
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayBg,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 20,
  },
  modalDrag: {
    width: 44,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },

  // ── Scrollable Content ──
  modalContent: {
    paddingHorizontal: 20,
  },

  // ── Section ──
  section: {
    marginTop: 20,
    paddingHorizontal: 12
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  // ── Info Grid ──
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.light,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },

  // ── Audit Details Card ──
  auditCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  auditIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  auditTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  auditSubtitle: {
    fontSize: 12,
    color: colors.textLight,
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  auditLabel: {
    fontSize: 12,
    color: colors.textLight,
    width: 80,
  },
  auditValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },

  // ── Status Badge ──
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 8,
    flexDirection : "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3
  },
  statusText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Action Buttons Row ──
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  viewBtn: {
    backgroundColor: colors.lightblue,
  },
  approveBtn: {
    backgroundColor: colors.success,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },

  // ── Approve All Button ──
  approveAllBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 16,
    marginHorizontal: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  approveAllText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Session Modal ──
  sessionRow: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  sessionMeta: {
    alignItems: 'center',
  },
  sessionMetaLabel: {
    fontSize: 10,
    color: colors.textLight,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  sessionMetaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  sessionDivider: {
    width: 1,
    backgroundColor: colors.border,
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 10,
  },
});
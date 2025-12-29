import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import {
  MaterialIcons,
  FontAwesome5,
  Ionicons,
  AntDesign,
} from '@expo/vector-icons';
import { colors } from '../../Styles/appStyle';
import HeaderComponent from '../HeaderComponent';

const EmployeeProjectModal = ({ visible, onClose, employeeData }) => {
  const [openAccordion, setOpenAccordion] = useState(null);

//     const employeeData = useMemo(
//     () => mapEmployeeProjectData(EmployeeData),
//     [EmployeeData]
//   );

//   console.log("employeeData", JSON.stringify(employeeData))

  const toggleAccordion = (index) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return colors.green;
      case 'in progress':
        return colors.yellow;
      default:
        return colors.grey;
    }
  };

  const renderInfoRow = (icon, label, value) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  const renderProjectDetail = (label, value) => (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'N/A'}</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>

        {/* Header */}
         <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

        <HeaderComponent headerTitle="Employee Project Details" onBackPress={onClose} />

        <ScrollView style={styles.scrollView}>
          {/* Employee Info Section */}
          <View style={styles.infoSection}>
            {renderInfoRow(
              <FontAwesome5 name="user" size={16} color={colors.primary} />,
              'Employee Name',
              employeeData.employee_name
            )}
            {renderInfoRow(
              <FontAwesome5 name="id-card" size={16} color={colors.primary} />,
              'Employee ID',
              employeeData.emp_id
            )}
            {/* {renderInfoRow(
              <FontAwesome5 name="calendar-alt" size={16} color={colors.primary} />,
              'Start Date',
              employeeData.startDate
            )}
            {renderInfoRow(
              <FontAwesome5 name="calendar-alt" size={16} color={colors.primary} />,
              'End Date',
              employeeData.endDate
            )} */}
          </View>

          {/* Projects Accordion */}
          {employeeData.projects.map((project, index) => {
            const isOpen = openAccordion === index;

            return (
              <View key={index} style={styles.projectCard}>
                {/* Accordion Header */}
                <TouchableOpacity
                  style={[
                    styles.accordionHeader,
                    isOpen && styles.accordionHeaderOpen,
                  ]}
                  onPress={() => toggleAccordion(index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.accordionHeaderLeft}>
                    <View style={styles.projectNameRow}>
                      <FontAwesome5
                        name="project-diagram"
                        size={16}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.projectName}>{project.customer_name}</Text>
                    </View>
                    <View style={styles.projectMetaInfo}>
                      <Text style={styles.metaText}>
                        <Text style={styles.metaBold}>Order Item key: </Text>
                        {project.order_item_key}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.accordionHeaderRight}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(project.project_period_status) },
                      ]}
                    >
                      <Text style={styles.statusText}>{project.project_period_status}</Text>
                    </View>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                </TouchableOpacity>

                {/* Accordion Content */}
                {isOpen && (
                  <View style={styles.accordionContent}>
                    {/* Project Details */}
                    <View style={styles.projectDetails}>
                        {renderProjectDetail(
                        'Planned Start Date',
                        project.planned_start_date
                      )}
                      {renderProjectDetail(
                        'Planned End Date',
                        project.planned_end_date
                      )}
                      {renderProjectDetail(
                        'Actual Start Date',
                        project.actual_start_date
                      )}
                      {renderProjectDetail(
                        'Actual End Date',
                        project.actual_end_date
                      )}
                      {renderProjectDetail('Audit Type', project.audit_type)}
                    </View>

                    {/* Day Logs */}
                    {project.day_logs && Object.keys(project.day_logs).length > 0 && (
                      <View style={styles.dayLogsSection}>
                        <View style={styles.dayLogsTitle}>
                          <FontAwesome5
                            name="tasks"
                            size={14}
                            color={colors.textSecondary}
                          />
                          <Text style={styles.dayLogsTitleText}>Day Logs</Text>
                        </View>

                        <View style={styles.dayLogsTable}>
                          {/* Table Header */}
                          <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderText, { flex: 1 }]}>
                              Date
                            </Text>
                            <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>
                              In
                            </Text>
                            <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>
                              Out
                            </Text>
                            <Text style={[styles.tableHeaderText, { flex: 0.7 }]}>
                              Items
                            </Text>
                          </View>

                          {/* Table Rows */}
                          {Object.values(project.day_logs || {}).map((log, logIndex) => (
                            <>
                            <View key={log.date || logIndex} style={styles.tableRow}>
                                <Text style={[styles.tableCell, { flex: 1 }]}>
                                {log.date}
                                </Text>

                                <Text
                                style={[
                                    styles.tableCell,
                                    styles.checkInTime,
                                    { flex: 0.8 },
                                ]}
                                >
                                {log.check_in?.time || "—"}
                                </Text>

                                <Text
                                style={[
                                    styles.tableCell,
                                    styles.checkOutTime,
                                    { flex: 0.8 },
                                ]}
                                >
                                {log.check_out?.time || "—"}
                                </Text>

                                <Text style={[styles.tableCell, { flex: 0.7 }]}>
                                {log.no_of_items ?? 0}
                                </Text>
                            </View>
                            <View style={{paddingHorizontal: 10, paddingVertical: 5,borderBottomWidth: 1,borderBottomColor: colors.grey,}}>
                                <Text>remark: {log.remarks || '--'}</Text>
                            </View>
                            </>
                            ))}

                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
};

  const mapEmployeeProjectData = (rawEmployeeData) => {
  if (!rawEmployeeData) return null;

  return {
    emp_id: rawEmployeeData.emp_id,
    employee_name: rawEmployeeData.employee_name,
    color: rawEmployeeData.color,

    projects: (rawEmployeeData.projects || []).map(project => {
      const dayLogsArray = project.day_logs
        ? Object.values(project.day_logs).map(log => ({
            date: log.date,
            check_in: log.check_in || {},
            check_out:
              typeof log.check_out === "string"
                ? {}
                : log.check_out || {},
            remarks: log.remarks || "",
            effort: log.effort ?? 0,
            no_of_items: log.no_of_items ?? 0
          }))
        : [];

      return {
        ...project,
        day_logs: dayLogsArray
      };
    })
  };
};

export default EmployeeProjectModal;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    marginRight: 8,
    width: 20,
  },
  infoLabel: {
    fontWeight: '600',
    color: colors.textSecondary,
    width: 120,
  },
  infoValue: {
    color: colors.textSecondary,
    flex: 1,
  },
  projectCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.cardBg,
  },
  accordionHeaderOpen: {
    backgroundColor: '#e9ecef',
  },
  accordionHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  projectNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  projectMetaInfo: {
    flexDirection: 'row',
  },
  metaText: {
    fontSize: 13,
    color: colors.black,
  },
  metaBold: {
    fontWeight: '600',
  },
  accordionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  accordionContent: {
    padding: 16,
    backgroundColor: colors.white,
  },
  projectDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey,
  },
  detailItem: {
    width: '50%',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.black,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: colors.black,
    fontWeight: 600
  },
  dayLogsSection: {
    marginTop: 16,
  },
  dayLogsTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayLogsTitleText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  dayLogsTable: {
    backgroundColor: colors.white,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.grey,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#495057',
    padding: 12,
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
  },
  tableCell: {
    fontSize: 13,
    color: colors.text,
  },
  checkInTime: {
    color: colors.green,
    fontWeight: '600',
  },
  checkOutTime: {
    color: colors.red,
    fontWeight: '600',
  },
});
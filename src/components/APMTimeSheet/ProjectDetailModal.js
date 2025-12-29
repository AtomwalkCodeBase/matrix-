import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar, Modal } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../Styles/appStyle';
import HeaderComponent from '../HeaderComponent';
import { getStatusStyles } from './utils';

// Reusable Components
const InfoRow = ({ label, value, icon }) => (
  <View style={styles.infoRow}>
    {icon && <View style={styles.iconContainer}>{icon}</View>}
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const SectionHeader = ({ title, icon, count }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleRow}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
      {count !== undefined && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      )}
    </View>
  </View>
);

const DayLogCard = ({ date, log }) => {
  const totalHours = log.check_out?.time && log.check_in?.time 
    ? calculateWorkHours(log.check_in.time, log.check_out.time)
    : 'In Progress';

  return (
    <View style={styles.dayLogCard}>
      <View style={styles.dayLogHeader}>
        <View style={styles.dateIconContainer}>
          <Ionicons name="calendar" size={16} color={colors.primary} />
        </View>
        <Text style={styles.dayLogDate}>{date}</Text>
        {log.check_out?.time && (
          <View style={styles.workHoursBadge}>
            <Ionicons name="time" size={12} color="#4CAF50" />
            <Text style={styles.workHoursText}>{totalHours}</Text>
          </View>
        )}
      </View>

      <View style={styles.dayLogBody}>
        <View style={styles.timeSection}>
          <View style={styles.timeBlock}>
            <View style={styles.timeIconWrapper}>
              <Ionicons name="enter-outline" size={16} color="#4CAF50" />
            </View>
            <View>
              <Text style={styles.timeBlockLabel}>Check In</Text>
              <Text style={styles.timeBlockValue}>{log.check_in?.time || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.timeDivider} />

          <View style={styles.timeBlock}>
            <View style={styles.timeIconWrapper}>
              <Ionicons name="exit-outline" size={16} color="#F44336" />
            </View>
            <View>
              <Text style={styles.timeBlockLabel}>Check Out</Text>
              <Text style={styles.timeBlockValue}>
                {log.check_out?.time || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialIcons name="inventory" size={18} color="#FF9800" />
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Items</Text>
              {/* <Text style={styles.statValue}>{log.no_of_items || 0}</Text> */}
              <Text style={styles.statValue}>{0}</Text>
            </View>
          </View>
          
          <View style={styles.statItem}>
            <MaterialIcons name="trending-up" size={18} color="#9C27B0" />
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Effort</Text>
              {/* <Text style={styles.statValue}>{log.effort || 0}</Text> */}
              <Text style={styles.statValue}>{0}</Text>
            </View>
          </View>
        </View>

        {log.remarks && log.remarks.trim() !== '' && (
          <View style={styles.remarksContainer}>
            <View style={styles.remarksHeader}>
              <MaterialIcons name="comment" size={14} color="#FF9800" />
              <Text style={styles.remarksLabel}>Remarks</Text>
            </View>
            <Text style={styles.remarksText}>{log.remarks}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const calculateWorkHours = (checkIn, checkOut) => {
  const parseTime = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours + minutes / 60;
  };

  try {
    const inTime = parseTime(checkIn);
    const outTime = parseTime(checkOut);
    const diff = outTime - inTime;
    const hours = Math.floor(diff);
    const minutes = Math.round((diff - hours) * 60);
    return `${hours}h ${minutes}m`;
  } catch {
    return 'N/A';
  }
};

const EmployeeCard = ({ employee,rawProjectData, onExpand, isExpanded }) => {
  console.log("employeeCard", JSON.stringify(employee))

  const statusStyles = getStatusStyles(employee.activity_status === true ? "Completed" : rawProjectData.project_period_status);

  const dayLogsArray = employee.day_logs 
    ? Object.entries(employee.day_logs).sort((a, b) => {
        const dateA = new Date(a[0]);
        const dateB = new Date(b[0]);
        return dateB - dateA;
      })
    : [];

  const totalDays = dayLogsArray.length;

  return (
    <View style={styles.employeeCard}>
      <TouchableOpacity 
        style={styles.employeeHeader} 
        onPress={onExpand}
        activeOpacity={0.7}
      >
        <View style={styles.employeeInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {employee.employee_name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <View style={styles.employeeDetails}>
            <Text style={styles.employeeName}>{employee.employee_name}</Text>
            <Text style={styles.employeeId}>ID: {employee.emp_id}</Text>
          </View>
        </View>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.employeeExpanded}>
          <View style={styles.divider} />
          
          {dayLogsArray.length > 0 ? (
            <View style={styles.dayLogsContainer}>
              <View style={{flexDirection: "row"}}>
              <Text style={styles.dayLogsTitle}>Activity Status</Text>
                                      <View style={[styles.statusBadge, { backgroundColor: statusStyles.bgColor }]}>
                          <MaterialIcons 
                            name={statusStyles.icon} 
                            size={16} 
                            color={statusStyles.color} 
                          />
                          <Text style={[styles.statusText, { color: statusStyles.color }]}>
                            {employee.activity_status === true ? "Completed" : rawProjectData.project_period_status}
                          </Text>
                        </View>

              </View>
              <View style={styles.dayLogsHeaderRow}>
                <MaterialIcons name="event-note" size={18} color={colors.primary} />
                <Text style={styles.dayLogsTitle}>Work Logs</Text>
              </View>
              
               <ScrollView 
                style={styles.dayLogsScrollView}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                <View style={styles.dayLogsContent}>

                  {dayLogsArray.map(([date, log]) => (
                    <DayLogCard key={date} date={date} log={log} />
                  ))}
                </View>
              </ScrollView>
                  {employee.activity_status === true &&
                <>
                 <TouchableOpacity
                                  style={[styles.btn, styles.primaryBtn]}
                                  // onPress={() => onAction({ type: 'checkout_yesterday', project })}
                                >
                                  <Feather name="check-circle" size={16} color="#fff" />
                                  <Text style={styles.btnText}>Approve</Text>
                                </TouchableOpacity>

                 <TouchableOpacity
                          style={[styles.btn, styles.checkOutBtn]}
                          // onPress={() => onAction({ type: 'checkout_yesterday', project })}
                        >
                          <MaterialCommunityIcons name="cancel" size={16} color='#fff' />
                          <Text style={styles.btnText}>Reject</Text>
                        </TouchableOpacity>
                </>  
                }
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Ionicons name="calendar-outline" size={40} color="#ccc" />
              <Text style={styles.noDataText}>No work logs available</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// Main Component
const ProjectDetailScreen = ({ showProjectModal, project, onClose }) => {
  const [expandedEmployees, setExpandedEmployees] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  const toggleEmployee = (empId) => {
    setExpandedEmployees(prev => ({
      ...prev,
      [empId]: !prev[empId]
    }));
  };

  const filteredEmployees = project.teamMembers
    .filter(emp =>
      emp.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.emp_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <Modal visible={showProjectModal} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        
        {/* Header */}
        <HeaderComponent headerTitle="Project Details" onBackPress={onClose} />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Project Info Section */}
          <View style={styles.section}>
            <SectionHeader 
              title="Project Information" 
              icon={<MaterialIcons name="work" size={20} color={colors.primary} />}
            />
            <View style={styles.card}>
              <InfoRow 
                label="Customer Name" 
                value={project.customer_name}
                icon={<Ionicons name="person-outline" size={18} color={colors.primary} />}
              />

              <InfoRow 
                label="Audit Type" 
                value={project.project_name}
                icon={<Feather name="box" size={18} color={colors.primary} />}
              />
              <InfoRow 
                label="Order Item Key" 
                value={project.order_item_key}
                icon={<MaterialIcons name="key" size={18} color={colors.primary} />}
              />
              <View style={styles.dateRow}>
                <View style={styles.dateItem}>
                  <Ionicons name="play-circle-outline" size={18} color="#4CAF50" />
                  <View style={styles.dateContent}>
                    <Text style={styles.dateLabel}>Start Date</Text>
                    <Text style={styles.dateValue}>{project.planned_start_date}</Text>
                  </View>
                </View>
                <View style={styles.dateItem}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FF9800" />
                  <View style={styles.dateContent}>
                    <Text style={styles.dateLabel}>End Date</Text>
                    <Text style={styles.dateValue}>{project.planned_end_date}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Employees Section */}
          <View style={styles.section}>
            <SectionHeader 
              title="Team Members" 
              icon={<Ionicons name="people" size={20} color={colors.primary} />}
              count={project.teamMembers.length}
            />
            
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
            </View>

            {/* Employee List */}
            {filteredEmployees.map((employee) => (
              <EmployeeCard
                key={employee.emp_id}
                employee={employee}
                rawProjectData={project}
                isExpanded={expandedEmployees[employee.emp_id]}
                onExpand={() => toggleEmployee(employee.emp_id)}
              />
            ))}

            {filteredEmployees.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No employees found</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1456a7',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 4,
  },
  menuButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  countBadge: {
    backgroundColor: '#1456a7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dateContent: {
    marginLeft: 8,
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1456a7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  employeeId: {
    fontSize: 12,
    color: '#666',
  },
  employeeExpanded: {
    padding: 14,
    paddingTop: 0,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 14,
  },
  dayLogsContainer: {
    gap: 10,
  },
  dayLogsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  dayLogsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
   dayLogsScrollView: {
    maxHeight: 320, // You can adjust this height as needed
  },
  dayLogsContent: {
    gap: 10,
    paddingRight: 4, // Add some padding for scrollbar
  },
  dayLogCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dayLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateIconContainer: {
    marginRight: 8,
  },
  dayLogDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  workHoursBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  workHoursText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
  },
  dayLogBody: {
    padding: 12,
    gap: 12,
  },
  timeSection: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  timeBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeBlockLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  timeBlockValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  timeDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  remarksContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  remarksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  remarksLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  remarksText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noDataText: {
    marginTop: 12,
    fontSize: 13,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  dayLogs: {
    flex: 1,
    height: 200,
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
    backgroundColor: colors.primary,
  },
    checkOutBtn: {
    backgroundColor: '#ef4444',
  },
    btnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
    statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    justifyContent: 'center',
    minWidth: 100,
    maxWidth: 120,
    marginLeft: 'auto',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default ProjectDetailScreen;
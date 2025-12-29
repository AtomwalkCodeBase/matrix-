import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
  Animated,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import HeaderComponent from "../components/HeaderComponent";
import Loader from "../components/old_components/Loader";
import { colors } from "../Styles/appStyle";
import { getAllocationList, getEmplyoeeList } from "../services/productServices";
import PeriodDisplay from "../components/APMTimeSheet/PeriodDisplay";
import CustomDateRangeCard from "../components/APMTimeSheet/CustomDateRangeCard";
import UniversalProjectList from "../components/APMTimeSheet/ProjectList";
import Employees from "../components/APMTimeSheet/Employees";
import FilterModal from "../components/FilterModal";
import ProjectCardManager from "../components/APMTimeSheet/ProjectCardManager";
import { useNavigation } from "expo-router";
import { formatDate, getDateRangeFromPeriod, mapAllocationData, parseDateString, searchByKeys } from "../components/APMTimeSheet/utils";
import ProjectDetailModal from "../components/APMTimeSheet/ProjectDetailModal";
import TabNavigation from "../components/TabNavigation";
import EmployeeProjectModal from "../components/APMTimeSheet/EmployeeProjectModal";

const { width } = Dimensions.get('window');

const ManagerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigation();

  // DATA STATES
  const [allActivities, setAllActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [projectsData, setProjectsData] = useState([]);
  const [employeeData, setEmployeeData] = useState([]);

  // UI STATES
  const [activeTab, setActiveTab] = useState("projects");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showEmployeeDetailsModal, setShowEmployeeDetailsModal] = useState(false)
  const [activeFilters, setActiveFilters] = useState({
    period: "this_month",
    employees: [],
  });

  const [pendingFilters, setPendingFilters] = useState({
    period: "this_month",
    employees: [],
  });

  const [searchQuery, setSearchQuery] = useState('');

  // DATE RANGE
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [isCustomExpanded, setIsCustomExpanded] = useState(false);
  const [startDateObj, setStartDateObj] = useState(new Date());
  const [endDateObj, setEndDateObj] = useState(new Date());

  // ANIMATIONS
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  // ---------------------
  // DATA FETCHING
  // ---------------------
  const fetchEmployeeList = async () => {
    try {
      const res = await getEmplyoeeList();
      setEmployees(res.data);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch employees");
    }
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);

      const res = await getAllocationList(
        null,
        dateRange.startDate,
        dateRange.endDate
      );

      const allocationData = Array.isArray(res?.data) ? res.data : [];
      // console.log(allocationData)
      setAllActivities(allocationData);

      if (allocationData.length > 0) {
        const { projectsData, employeeData } = mapAllocationData(allocationData);

        setProjectsData(projectsData);
        setEmployeeData(employeeData);
        // console.log(" Projects Data:", projectsData);
        // console.log(" Employee Data:", employeeData);
      } else {
        setProjectsData([]);
        setEmployeeData([]);
      }
    } catch (error) {
      console.error("Error fetching allocation data:", error);
      Alert.alert("Error", "Failed to load activities");
      setProjectsData([]);
      setEmployeeData([]);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------
  // FILTER CONFIG
  // ---------------------
  const periodOptions = useMemo(
    () => [
      { label: "Today", value: "today" },
      { label: "Yesterday", value: "yesterday" },
      { label: "This Week", value: "this_week" },
      { label: "This Month", value: "this_month" },
      { label: "Custom Date", value: "custom" },
    ],
    []
  );

  const filterConfigs = [
    {
      label: "Period",
      value: pendingFilters.period,
      options: periodOptions,
      setValue: (v) =>
        setPendingFilters((prev) => ({
          ...prev,
          period: v,
        })),
    },
    {
      label: "Employees",
      type: "multi-select",
      options: employees.map((emp) => ({
        label: emp.employee_name,
        value: emp.emp_id,
      })),
      value: pendingFilters.employees,
      setValue: (v) =>
        setPendingFilters((prev) => ({
          ...prev,
          employees: v,
        })),
    },
  ];

  // ---------------------
  // FILTER ACTIONS
  // ---------------------
  const applyFilters = () => {
    setActiveFilters(pendingFilters);

    if (pendingFilters.period !== "custom") {
      const dr = getDateRangeFromPeriod(pendingFilters.period);
      setDateRange(dr);
      setStartDateObj(parseDateString(dr.startDate));
      setEndDateObj(parseDateString(dr.endDate));
      setIsCustomExpanded(false);
    }
    setShowFilterModal(false);
  };

  const clearFilters = () => {
    const def = { period: "today", employees: [] };
    setPendingFilters(def);
    setActiveFilters(def);

    const dr = getDateRangeFromPeriod("today");
    setDateRange(dr);
    setStartDateObj(parseDateString(dr.startDate));
    setEndDateObj(parseDateString(dr.endDate));
    setIsCustomExpanded(false);
    setShowFilterModal(false);
  };

  // Calculate filter count for header badge
  const filterCount = useMemo(() => {
    return (activeFilters.employees.length ? 1 : 0) +
      (activeFilters.period !== "today" ? 1 : 0);
  }, [activeFilters]);

  // ---------------------
  // LIFECYCLE
  // ---------------------
  useEffect(() => {
    const init = async () => {
      const dr = getDateRangeFromPeriod("this_month"); // ✅ CURRENT MONTH
      setDateRange(dr);
      setStartDateObj(parseDateString(dr.startDate));
      setEndDateObj(parseDateString(dr.endDate));

      await fetchEmployeeList();

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    };
    init();
  }, []);

  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      fetchActivities();
    }
  }, [dateRange]);

  useEffect(() => {
    if (activeFilters.period === "custom") {
      setDateRange({
        startDate: formatDate(startDateObj),
        endDate: formatDate(endDateObj),
      });
    }
  }, [startDateObj, endDateObj]);


  const handleViewDetails = (project, employee) => {
    console.log("project ksksdbksdbs", project)
    console.log("emp[plyoee sjdchhsdj", employee)
    if(project){
    setSelectedProject(project);
    setShowProjectModal(true);
    }
     if(employee){
      setSelectedEmployee(employee);
      setShowEmployeeDetailsModal(true)
    }
  };

  const SEARCH_CONFIG = {
    projects: ["project_name", "order_item_key"],
    employees: ["employee_name", "emp_id", "project_name"],
  };

  const searchedData = useMemo(() => {
    if (activeTab === "projects") {
      return searchByKeys(
        projectsData,
        searchQuery,
        SEARCH_CONFIG.projects
      );
    }

    if (activeTab === "employees") {
      return searchByKeys(
        employeeData,
        searchQuery,
        SEARCH_CONFIG.employees
      );
    }

    return [];
  }, [activeTab, searchQuery, projectsData, employeeData]);

  const DashboardStats = () => {
    const stats = [
      {
        label: "Total Projects",
        value: projectsData.length,
        icon: "business-outline",
        color: "#4f46e5",
      },
      {
        label: "Total Employees",
        value: employeeData.length,
        icon: "people-outline",
        color: "#059669",
      },
    ];

    return (
      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}15` }]}>
              <Ionicons name={stat.icon} size={24} color={stat.color} />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchActivities();
    setRefreshing(false);
  };

  if (loading) return <Loader visible={true} />;

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <HeaderComponent
        headerTitle="Manager Dashboard"
        onBackPress={() => navigate.goBack()}
        icon1Name="filter"
        icon1OnPress={() => {
          setPendingFilters(activeFilters);
          setShowFilterModal(true);
        }}
        filterCount={filterCount}
      />

      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* STATS OVERVIEW */}
        <DashboardStats />

        {/* PERIOD DISPLAY */}
        <View style={styles.periodSection}>
          <PeriodDisplay
            label={
              activeFilters.period === "custom"
                ? `Custom: ${dateRange.startDate} - ${dateRange.endDate}`
                : periodOptions.find((o) => o.value === activeFilters.period)?.label
            }
          />
        </View>

        {/* CUSTOM DATE RANGE */}
        {activeFilters.period === "custom" && (
          <CustomDateRangeCard
            isExpanded={isCustomExpanded}
            setIsExpanded={setIsCustomExpanded}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            startObj={startDateObj}
            endObj={endDateObj}
            setStartObj={setStartDateObj}
            setEndObj={setEndDateObj}
            onApply={() => {
              if (startDateObj > endDateObj) {
                Alert.alert("Error", "Start date cannot be after end date.");
                return;
              }
              setIsCustomExpanded(false);
            }}
            onCancel={() => setIsCustomExpanded(false)}
          />
        )}

        {/* TABS and search bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Feather name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder={
                activeTab === "projects"
                  ? "Search by Project Name or Order Key..."
                  : "Search by Name, ID or Project..."
              }
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <TabNavigation tabs={[{ label: 'Projects', value: 'projects' }, { label: 'Employees', value: 'employees' }]} activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* CONTENT */}
        <View style={styles.contentContainer}>
          {activeTab === "projects" ? (
            <UniversalProjectList
              projects={searchedData}
              CardComponent={ProjectCardManager}
              onViewDetails={handleViewDetails}
              showUtilization={true}
              showHours={true}
              showEmployeesPreview={true}
            />
          ) : (
            <Employees activities={searchedData} employees={employees} onViewDetails={handleViewDetails} />
          )}
        </View>
      </Animated.ScrollView>

      {/* FILTER MODAL */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApplyFilters={applyFilters}
        onClearFilters={clearFilters}
        filterConfigs={filterConfigs}
        modalTitle="Filter Dashboard"
        applyButtonText="Apply Filters"
        clearButtonText="Clear Filters"
      />

      {showProjectModal && selectedProject && (
        <ProjectDetailModal
          showProjectModal={showProjectModal}
          project={selectedProject}
          onClose={() => setShowProjectModal(false)}
        />
      )}

      {showEmployeeDetailsModal && selectedEmployee && 
      <EmployeeProjectModal
        visible={showEmployeeDetailsModal}
        onClose={() => setShowEmployeeDetailsModal(false)}
        employeeData={selectedEmployee}
      />}
    </SafeAreaView>
  );
};

export default ManagerDashboard;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 12,
    gap: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },

  statIconContainer: {
    padding: 8,
    borderRadius: 12,
    marginRight: 12,
  },

  statTextContainer: {
    flex: 1,
  },

  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  periodSection: {
    marginHorizontal: 16,
    marginVertical: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: 'transparent',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 4,
    width: '80%',
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  contentContainer: {
    marginTop: 16,
    paddingBottom: 20,
    marginHorizontal: 14
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
});
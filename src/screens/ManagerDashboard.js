// screens/ManagerDashboard.js

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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

const { width } = Dimensions.get('window');

const ManagerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigation();

  // DATA STATES
  const [allActivities, setAllActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);

  // UI STATES
  const [activeTab, setActiveTab] = useState("projects");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    period: "today",
    employees: [],
  });
  const [pendingFilters, setPendingFilters] = useState({
    period: "today",
    employees: [],
  });

  // DATE RANGE
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [isCustomExpanded, setIsCustomExpanded] = useState(false);
  const [startDateObj, setStartDateObj] = useState(new Date());
  const [endDateObj, setEndDateObj] = useState(new Date());

  // ANIMATIONS
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  // ---------------------
  // FORMAT HELPERS
  // ---------------------
  const formatDate = (date) => {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const parseDate = (str) => {
    if (!str) return null;
    const [dd, mm, yyyy] = str.split("-").map(Number);
    return new Date(yyyy, mm - 1, dd);
  };

  // ---------------------
  // PERIOD → DATE RANGE
  // ---------------------
  const getDateRangeFromPeriod = (period) => {
    const today = new Date();

    switch (period) {
      case "today":
        return { startDate: formatDate(today), endDate: formatDate(today) };
      case "yesterday": {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        return { startDate: formatDate(y), endDate: formatDate(y) };
      }
      case "this_week": {
        const s = new Date(today);
        s.setDate(s.getDate() - s.getDay());
        const e = new Date(s);
        e.setDate(s.getDate() + 6);
        return { startDate: formatDate(s), endDate: formatDate(e) };
      }
      case "this_month": {
        const s = new Date(today.getFullYear(), today.getMonth(), 1);
        const e = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { startDate: formatDate(s), endDate: formatDate(e) };
      }
      default:
        return dateRange;
    }
  };

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
      const res = await getAllocationList(
        null,
        dateRange.startDate,
        dateRange.endDate
      );
      setAllActivities(res.data || []);
      groupProjects(res.data || []);
    } catch (err) {
      Alert.alert("Error", "Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------
  // PROJECT GROUPING
  // ---------------------
  const groupProjects = (activities) => {
    const grouped = {};

    activities.forEach((act) => {
      const projKey = act.project_name || act.order_item_key || "UNKNOWN";

      if (!grouped[projKey]) {
        grouped[projKey] = {
          projectCode: act.order_item_key,
          projectName: act.project_name,
          activities: [],
          employees: new Set(),
          plannedHours: 0,
          actualHours: 0,
        };
      }

      grouped[projKey].activities.push(act);
      grouped[projKey].employees.add(act.emp_id);
      grouped[projKey].plannedHours += Number(act.effort || 0);
      grouped[projKey].actualHours += Number(act.actual_effort || act.effort || 0);
    });

    const final = Object.values(grouped).map((p) => ({
      ...p,
      totalEmployees: p.employees.size,
      utilization: p.plannedHours
        ? Math.round((p.actualHours / p.plannedHours) * 100)
        : 0,
    }));

    setProjects(final);
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
      setStartDateObj(parseDate(dr.startDate));
      setEndDateObj(parseDate(dr.endDate));
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
    setStartDateObj(parseDate(dr.startDate));
    setEndDateObj(parseDate(dr.endDate));
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
      const dr = getDateRangeFromPeriod("today");
      setDateRange(dr);
      setStartDateObj(parseDate(dr.startDate));
      setEndDateObj(parseDate(dr.endDate));
      await fetchEmployeeList();

      // Animate content in
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


  const handleViewDetails = (project) => {
      Alert.alert(
        "Project Details",
        `Project: ${project.title}\nActivity: ${project.activity_name}\nCode: ${project.project_code}\nStatus: ${project.status_display || project.status}\nStart Date: ${project.planned_start_date || 'Not set'}\nEnd Date: ${project.due_date || 'Not set'}\nEffort: ${project.effort || 0} ${project.effort_unit || ''}\nItems: ${project.no_of_items || 0}`,
        [{ text: "Close", style: "cancel" }]
      );
    };

  // ---------------------
  // UI COMPONENTS
  // ---------------------
 const DashboardStats = () => {
  const stats = [
    {
      label: "Total Projects",
      value: projects.length,
      icon: "business-outline",
      color: "#4f46e5",
    },
    {
      label: "Total Employees",
      value: employees.length,
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

  const TabButton = ({ title, isActive, onPress }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
        {title}
      </Text>
      {isActive && <View style={styles.tabIndicator} />}
    </TouchableOpacity>
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchActivities();
    setRefreshing(false);
  };

  if (loading) return <Loader visible={true} />;

  return (
    <SafeAreaView edges={['left','right','bottom']} style={styles.safeArea}>
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

        {/* TABS */}
        <View style={styles.tabsContainer}>
          <TabButton
            title="Projects"
            isActive={activeTab === "projects"}
            onPress={() => setActiveTab("projects")}
          />
          <TabButton
            title="Employees"
            isActive={activeTab === "employees"}
            onPress={() => setActiveTab("employees")}
          />
        </View>

        {/* CONTENT */}
        <View style={styles.contentContainer}>
          {activeTab === "projects" ? (
            <UniversalProjectList
              projects={projects}
              CardComponent={ProjectCardManager}
              onViewDetails={handleViewDetails}
              showUtilization={true}
              showHours={true}
              showEmployeesPreview={true}
            />
          ) : (
            <Employees activities={allActivities} employees={employees} />
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
});
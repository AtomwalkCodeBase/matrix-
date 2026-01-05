import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";

import Loader from "../components/old_components/Loader";
import HeaderComponent from "../components/HeaderComponent";
import PeriodDisplay from "../components/APMTimeSheet/PeriodDisplay";
import CustomDateRangeCard from "../components/APMTimeSheet/CustomDateRangeCard";
import EmptyState from "../components/APMTimeSheet/EmptyState";
import FilterModal from "../components/FilterModal";
import ConfirmationModal from "../components/ConfirmationModal";
import ErrorModal from "../components/ErrorModal";
import ActivitySubmitCard from "../components/APMTimeSheet/ActivitySubmitCard";

import {
  formatAPITime,
  getCurrentDateRangeFromPeriod,
  getCurrentDateTimeDefaults,
  normalizeProjects,
  formatToDDMMYYYY,
  formatAMPMTime,
  formatDate,
  parseDateString,
  getDateRangeFromPeriod,
  DateForApiFormate,
  getTodayApiDateStr,
  parseApiDate,

} from "../components/APMTimeSheet/utils";

import { getAllocationList, postAllocationData } from "../services/productServices";
import { useNavigation } from "expo-router";
import { AuditCard } from "../components/APMTimeSheet/AcivityCard";

const PROJECTS_PER_PAGE = 10;

const DEFAULT_FILTERS = {
  status: null,
  period: "today", // Change from "this_month" to "today"
};

const APMTimeSheet = () => {
  const [empId, setEmpId] = useState(null);
  const [allProjects, setAllProjects] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [activeFilters, setActiveFilters] = useState({ ...DEFAULT_FILTERS });
  const [pendingFilters, setPendingFilters] = useState({ ...DEFAULT_FILTERS });

  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [startDateObj, setStartDateObj] = useState(new Date());
  const [endDateObj, setEndDateObj] = useState(new Date());

  const [isCustomExpanded, setIsCustomExpanded] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedProject, setSelectedProject] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const [confirmPopup, setConfirmPopup] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const fadeAnim = useState(new Animated.Value(0))[0];

  const navigate = useNavigation();

  // Memoized options
  const periodOptions = useMemo(
    () => [
      { label: "Today", value: "today" },
      { label: "This Week", value: "this_week" },
      { label: "This Month", value: "this_month" },
      { label: "Custom Date", value: "custom" },
    ],
    []
  );

  const statusOptions = useMemo(
    () => [
      { label: "Active", value: "active" },
      { label: "Planned", value: "submitted" },
      { label: "Completed", value: "completed" },
      { label: "All", value: "All" },
    ],
    []
  );

  const filterConfigs = useMemo(
    () => [
      {
        label: "Status",
        options: statusOptions,
        value: pendingFilters.status,
        setValue: (v) => setPendingFilters((p) => ({ ...p, status: v })),
      },
      {
        label: "Period",
        options: periodOptions,
        value: pendingFilters.period,
        setValue: (v) => setPendingFilters((p) => ({ ...p, period: v })),
      },
    ],
    [pendingFilters, statusOptions, periodOptions]
  );

  // Initialize dates & load employee
  // Initialize dates & load employee
  // Initialize dates & load employee
  useEffect(() => {
    const init = async () => {
      try {
        const storedEmpId = await AsyncStorage.getItem("empId");
        if (!storedEmpId) {
          setErrorMessage("Employee ID not found. Please login again.");
          setShowErrorModal(true);
          return;
        }
        setEmpId(storedEmpId);

        // Set default filters
        setActiveFilters({ ...DEFAULT_FILTERS });
        setPendingFilters({ ...DEFAULT_FILTERS });

        // Default: Today (for display) but fetch this month's data
        const todayRange = getDateRangeFromPeriod("today");
        const monthRange = getDateRangeFromPeriod("this_month"); // Get month range for API call

        // Set display range to today
        setDateRange(todayRange);
        setStartDateObj(parseDateString(todayRange.startDate) || new Date());
        setEndDateObj(parseDateString(todayRange.endDate) || new Date());

        // Fetch with month range to get all data
        await fetchProjects(storedEmpId, monthRange.startDate, monthRange.endDate);
      } catch (err) {
        console.error("Initialization error:", err);
        setErrorMessage("Failed to initialize app.");
        setShowErrorModal(true);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Fade in when projects change
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [projects]);

  // Re-apply filters when raw data or active filters change
  useEffect(() => {
    applyFiltersAndPagination(allProjects, activeFilters);
  }, [allProjects, activeFilters]);

  // Debug: Log when activeFilters change
  useEffect(() => {
    console.log("Active filters changed:", activeFilters);
    console.log("All projects count:", allProjects.length);
  }, [activeFilters]);

  // Debug: Log when allProjects change
  useEffect(() => {
    console.log("All projects updated, count:", allProjects.length);
    if (allProjects.length > 0) {
      console.log("First project:", JSON.stringify(allProjects[0]));
    }
  }, [allProjects]);

  // Sync custom date pickers → dateRange
  useEffect(() => {
    if (activeFilters.period !== "custom") return;

    const startStr = formatDate(startDateObj);
    const endStr = formatDate(endDateObj);

    if (startDateObj > endDateObj) {
      // auto-swap invalid range
      setStartDateObj(endDateObj);
      setEndDateObj(startDateObj);
      setDateRange({ startDate: endStr, endDate: startStr });
    } else {
      setDateRange({ startDate: startStr, endDate: endStr });
    }
  }, [startDateObj, endDateObj, activeFilters.period]);

  // Helper: update date range + refetch

  // Fetch projects from API
  // Fetch projects from API
  // Fetch projects from API
  const fetchProjects = async (employeeId, start, end) => {
    setIsLoading(true);
    try {
      const res = await getAllocationList(employeeId, start, end);
      const raw = Array.isArray(res?.data) ? res.data : [];
      const normalized = normalizeProjects(raw);

      console.log("Raw API response:", JSON.stringify(raw));
      console.log("Normalized projects:", JSON.stringify(normalized));

      // Store ALL projects without filtering
      setAllProjects(normalized);
      console.log("All projects stored:", normalized.length);

    } catch (err) {
      console.error(err);
      setAllProjects([]);
      setErrorMessage("Failed to load projects. Please try again.");
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters + pagination
  // Apply filters + pagination
  // Apply filters + pagination
  const applyFiltersAndPagination = useCallback((list, filters, page = 1) => {
    let filtered = [...list];

    console.log("Applying filters:", filters);
    console.log("Total projects before filtering:", filtered.length);

    // Apply status filter
    if (filters.status && filters.status !== "All") {
      filtered = filtered.filter((p) => {
        const statusMatch = p.project_period_status === filters.status ||
          p.status === filters.status;
        return statusMatch;
      });
      console.log("After status filter:", filtered.length);
    }

    // Apply period filter
    if (filters.period) {
      switch (filters.period) {
        case "today":
          const todayStr = formatToDDMMYYYY(new Date());
          const todayApiStr = getTodayApiDateStr();

          console.log("Filtering for today:", {
            dd_mm_yyyy: todayStr,
            api_format: todayApiStr
          });

          filtered = filtered.filter(project => {
            const hasActivityToday = project.day_logs && project.day_logs[todayApiStr];
            const isPlannedForToday = project.planned_start_date === todayApiStr ||
              project.planned_end_date === todayApiStr;

            return hasActivityToday || project.hasPendingCheckout || isPlannedForToday;
          });
          console.log("After today filter:", filtered.length);
          break;

        case "this_week":
          const weekRange = getDateRangeFromPeriod("this_week");
          console.log("Week range:", weekRange);

          // Parse week dates (dd-mm-yyyy format)
          const weekStart = parseDateString(weekRange.startDate);
          const weekEnd = parseDateString(weekRange.endDate);

          console.log("Parsed week dates:", {
            weekStart: weekStart?.toString(),
            weekEnd: weekEnd?.toString()
          });

          filtered = filtered.filter(project => {
            // 1. Check if project has any activity within this week
            const hasActivityInWeek = Object.keys(project.day_logs || {}).some(dateStr => {
              const activityDate = parseApiDate(dateStr); // Use parseApiDate for API dates
              if (!activityDate || !weekStart || !weekEnd) return false;

              // Reset times to compare only dates
              const activityDateOnly = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
              const weekStartOnly = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
              const weekEndOnly = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());

              return activityDateOnly >= weekStartOnly && activityDateOnly <= weekEndOnly;
            });

            // 2. Check if project is PLANNED for this week
            const plannedStart = parseApiDate(project.planned_start_date); // Use parseApiDate
            const plannedEnd = parseApiDate(project.planned_end_date); // Use parseApiDate

            console.log(`Project ${project.id} dates:`, {
              planned_start: project.planned_start_date,
              planned_end: project.planned_end_date,
              plannedStart: plannedStart?.toString(),
              plannedEnd: plannedEnd?.toString(),
              hasActivityInWeek
            });

            const isPlannedForWeek = (plannedStart && weekStart && weekEnd &&
              plannedStart >= weekStart && plannedStart <= weekEnd) ||
              (plannedEnd && weekStart && weekEnd &&
                plannedEnd >= weekStart && plannedEnd <= weekEnd);

            return hasActivityInWeek || isPlannedForWeek || project.hasPendingCheckout;
          });
          console.log("After week filter:", filtered.length);
          break;

        case "this_month":
          const monthRange = getDateRangeFromPeriod("this_month");
          console.log("Month range:", monthRange);

          // Parse month dates (dd-mm-yyyy format)
          const monthStart = parseDateString(monthRange.startDate);
          const monthEnd = parseDateString(monthRange.endDate);

          console.log("Parsed month dates:", {
            monthStart: monthStart?.toString(),
            monthEnd: monthEnd?.toString()
          });

          filtered = filtered.filter(project => {
            // 1. Check if project has any activity within this month
            const hasActivityInMonth = Object.keys(project.day_logs || {}).some(dateStr => {
              const activityDate = parseApiDate(dateStr); // Use parseApiDate for API dates
              if (!activityDate || !monthStart || !monthEnd) return false;

              // Reset times to compare only dates
              const activityDateOnly = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
              const monthStartOnly = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate());
              const monthEndOnly = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate());

              return activityDateOnly >= monthStartOnly && activityDateOnly <= monthEndOnly;
            });

            // 2. Check if project is PLANNED for this month
            const plannedStart = parseApiDate(project.planned_start_date); // Use parseApiDate
            const plannedEnd = parseApiDate(project.planned_end_date); // Use parseApiDate

            console.log(`Project ${project.id} dates:`, {
              planned_start: project.planned_start_date,
              planned_end: project.planned_end_date,
              plannedStart: plannedStart?.toString(),
              plannedEnd: plannedEnd?.toString(),
              hasActivityInMonth
            });

            const isPlannedForMonth = (plannedStart && monthStart && monthEnd &&
              plannedStart >= monthStart && plannedStart <= monthEnd) ||
              (plannedEnd && monthStart && monthEnd &&
                plannedEnd >= monthStart && plannedEnd <= monthEnd);

            return hasActivityInMonth || isPlannedForMonth || project.hasPendingCheckout;
          });
          console.log("After month filter:", filtered.length);
          break;

        default:
          break;
      }
    }

    // Sort: Today's completed → bottom
    const todayStr = formatToDDMMYYYY(new Date());
    const sorted = [...filtered].sort((a, b) => {
      const aIsTodayComplete = a.todaysStatus === "complete" && a.activityDate === todayStr;
      const bIsTodayComplete = b.todaysStatus === "complete" && b.activityDate === todayStr;
      return aIsTodayComplete ? 1 : bIsTodayComplete ? -1 : 0;
    });

    const startIdx = (page - 1) * PROJECTS_PER_PAGE;
    const paginated = sorted.slice(0, startIdx + PROJECTS_PER_PAGE);

    console.log("Final filtered projects:", paginated.length);
    setProjects(paginated);
  }, []);

  // Load more on scroll
  const loadMore = () => {
    if (isLoadingMore) return;
    const totalFiltered = allProjects.filter((p) => {
      if (activeFilters.status && activeFilters.status !== "All") {
        return p.status === activeFilters.status;
      }
      return true;
    });
    const nextPage = Math.floor(projects.length / PROJECTS_PER_PAGE) + 1;
    if (projects.length < totalFiltered.length) {
      setIsLoadingMore(true);
      applyFiltersAndPagination(allProjects, activeFilters, nextPage);
      setIsLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (empId) {
      await fetchProjects(empId, dateRange.startDate, dateRange.endDate);
    }
    setRefreshing(false);
  };

  // Location helper
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMessage("Location permission required.");
        setShowErrorModal(true);
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch {
      setErrorMessage("Unable to get location. Check GPS.");
      setShowErrorModal(true);
      return null;
    }
  };

  // Submit activity (Start / Resume / Complete)
  const handleActivitySubmit = async ({ project, mode, data = {}, extraFields = {} }) => {
    if (!project) return false;

    const isAddMode = mode === "ADD";
    setIsLoading(true);
    try {

      const loc = await getCurrentLocation();
      if (!loc) {
        setIsLoading(false);
        return false; // stop the flow if location failed
      }
      const { apiDate: defaultApiDate, currentTime } = getCurrentDateTimeDefaults();
      const formData = new FormData();

      let activityDate = data.activityDate;

      // If a Date object was passed from the modal, convert to dd-mm-yyyy
      if (activityDate instanceof Date) {
        activityDate = DateForApiFormate(activityDate);
      }

      // For "checkout_yesterday", force activity_date to the pending checkout date
      if (!activityDate && project?.modalContext?.type === "checkout_yesterday") {
        activityDate = project?.pendingCheckoutDate || defaultApiDate;
      }

      if (!activityDate) {
        activityDate = defaultApiDate;
      }

      let startTime = null;
      if (isAddMode) {
        startTime = data.startTime || currentTime;
      } else if (data.startTime) {
        startTime = data.startTime;
      }

      const resolvedEmpId =
        empId ||
        project?.original_P?.emp_id ||
        project?.original_A?.emp_id ||
        "";

      formData.append("emp_id", resolvedEmpId);
      formData.append("activity_date", DateForApiFormate(activityDate));
      formData.append(
        "remarks",
        data.remarks ?? (isAddMode ? "Project Started from mobile" : "")
      );
      formData.append("latitude_id", String(loc.latitude));
      formData.append("longitude_id", String(loc.longitude));

      if (data.file) {
        formData.append("submitted_file", data.file);
      }

      if (isAddMode) {
        // START / ADD mode
        if (!project.original_P?.id) {
          console.warn("Missing original_P.id for ADD mode", project);
          return false;
        }
        formData.append("call_mode", "ADD");
        formData.append("p_id", String(project.original_P.id));
        formData.append("start_time", formatAMPMTime(startTime));
        formData.append("geo_type", "I");
        // As per spec: initial no_of_items is 0 on Start
        formData.append("no_of_items", "0");
      } else {
        // UPDATE mode: Resume / Continue / Complete
        if (!project.original_A?.id) {
          console.warn("Missing original_A.id for UPDATE mode", project);
          return false;
        }

        formData.append(
          "no_of_items",
          String(Number(data.noOfItems || 0))
        );
        formData.append("call_mode", "UPDATE");
        formData.append("a_id", String(project.original_A.id));

        if (data.endTime) {
          formData.append("end_time", formatAMPMTime(data.endTime));
        }

        if (startTime) {
          // Resume path – treat as new check-in
          formData.append("start_time", formatAMPMTime(startTime));
          formData.append("remarks", "Project resume from Mobile");
          formData.append("geo_type", "I");
        } else {
          // Pure checkout: only end_time, no start_time
          formData.append("geo_type", "O");
        }
      }

      Object.entries(extraFields).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });

      console.log("==== FORM DATA BEFORE API ====");
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }
      console.log("================================");

      const res = await postAllocationData(formData);

      if (res?.status === 200) {
        return true;
      }

      const apiMsg =
        res?.data?.message ||
        (isAddMode
          ? "Failed to start activity. Please try again."
          : "Failed to update activity. Please try again.");
      setErrorMessage(apiMsg);
      setShowErrorModal(true);
      return false;
    } catch (error) {
      console.error("Error in handleActivitySubmit", error);
      setErrorMessage(
        isAddMode
          ? "An error occurred while starting the activity."
          : "An error occurred while updarrrting the activity."
      );
      setShowErrorModal(true);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Action handlers
  const handleActivityAction = ({ type, project }) => {
    if (type === "start") {
      const hasOpenSession = allProjects.some((p) => p.todaysStatus === "Active" || p.hasPendingCheckout === true);
      if (hasOpenSession) {
        setErrorMessage("Finish Pending");
        setShowErrorModal(true);
        return;
      }

      setConfirmPopup({
        isOpen: true,
        title: "Start Activity",
        message: "Start this activity now?",
        onConfirm: async () => {
          await handleActivitySubmit({ project, mode: "ADD" });
          await onRefresh();
          setConfirmPopup((p) => ({ ...p, isOpen: false }));
        },
      });
      return;
    }

    if (type === "resume") {
      const hasOpenSession = allProjects.some((p) => p.todaysStatus === "Active" || p.hasPendingCheckout === true);
      if (hasOpenSession) {
        setErrorMessage("Finish Pending");
        setShowErrorModal(true);
        return;
      }
      setConfirmPopup({
        isOpen: true,
        title: "Resume Activity",
        message: "Resume this activity?",
        onConfirm: async () => {
          await handleActivitySubmit({
            project,
            mode: "UPDATE",
            data: { startTime: getCurrentDateTimeDefaults().currentTime },
          });
          await onRefresh();
          setConfirmPopup((p) => ({ ...p, isOpen: false }));
        },
      });
      return;
    }

    // continue / complete / checkout_yesterday → open modal
    if (["continue", "complete", "checkout_yesterday"].includes(type)) {
      setSelectedProject({ ...project, modalContext: { type } });
      setIsFormModalOpen(true);
    }
  };

  const handleSubmitFromModal = (formData) =>
    handleActivitySubmit({
      project: selectedProject,
      mode: "UPDATE",
      data: formData,
    }).then(async () => {
      await onRefresh();      // ✅ refresh after submit
      setIsFormModalOpen(false);
    });
    

  const handleMarkCompleteFromModal = (formData) =>
    handleActivitySubmit({
      project: selectedProject,
      mode: "UPDATE",
      data: formData,
      extraFields: { is_completed: 1 },
    }).then(async () => {
      await onRefresh();       // ✅ refresh after complete
      setIsFormModalOpen(false);
    });
  // Filter controls
  const openFilterModal = () => {
    setPendingFilters({ ...activeFilters });
    setShowFilterModal(true);
  };

  const applyFilters = () => {
    setActiveFilters(pendingFilters);

    if (pendingFilters.period !== "custom") {
      const range = getDateRangeFromPeriod(pendingFilters.period);

      // Always fetch month data for complete dataset
      const monthRange = getDateRangeFromPeriod("this_month");
      setDateRange(range); // Set display range
      fetchProjects(empId, monthRange.startDate, monthRange.endDate);
    }
    // for custom → dateRange already updated via picker
    setShowFilterModal(false);
  };

  const clearFilters = async () => {
    setPendingFilters({ ...DEFAULT_FILTERS });
    setActiveFilters({ ...DEFAULT_FILTERS });

    const todayRange = getDateRangeFromPeriod("today");
    const monthRange = getDateRangeFromPeriod("this_month");

    setDateRange(todayRange); // Display today
    await fetchProjects(empId, monthRange.startDate, monthRange.endDate); // Fetch month data
    setShowFilterModal(false);
    setIsCustomExpanded(false);
  };


  const hasAnyOpenSession = useMemo(() => {
  if (!allProjects.length) return false;
  
  return allProjects.some(project => {
    // Check day_logs
    const lastLogEntry = Object.values(project.day_logs || {}).pop();
    const hasOpenFromDayLogs = lastLogEntry && 
                               lastLogEntry.check_in && 
                               !lastLogEntry.check_out;
    
    // Check ts_data_list
    let hasOpenFromTsData = false;
    if (project?.original_A?.ts_data_list?.length) {
      const entries = project.original_A.ts_data_list;
      const lastTsEntry = entries[entries.length - 1];
      const geoData = lastTsEntry?.geo_data || '';
      hasOpenFromTsData = geoData.includes('I|') && !geoData.includes('O|');
    }
    
    return hasOpenFromDayLogs || hasOpenFromTsData;
  });
}, [allProjects]);

  // Add this function inside your component
  const getFilteredProjects = useCallback(() => {
    let filtered = [...allProjects];

    // Apply period filter
    if (activeFilters.period === "today") {
      const todayStr = formatToDDMMYYYY(new Date());
      filtered = filtered.filter(project => {
        // Show projects with activity today OR pending checkouts
        return project.day_logs &&
          (project.day_logs[todayStr] || project.hasPendingCheckout);
      });
    } else if (activeFilters.period === "this_week") {
      // Filter for this week's activities
      const weekRange = getDateRangeFromPeriod("this_week");
      filtered = filtered.filter(project => {
        // Check if project has any activity within this week
        return Object.keys(project.day_logs || {}).some(dateStr => {
          const date = parseDateString(dateStr);
          const start = parseDateString(weekRange.startDate);
          const end = parseDateString(weekRange.endDate);
          return date >= start && date <= end;
        });
      });
    }
    // For "this_month" and "custom", show all filtered projects

    return filtered;
  }, [allProjects, activeFilters.period]);

  const applyCustomDateRange = () => {
    if (startDateObj > endDateObj) {
      Alert.alert("Invalid Range", "Start date cannot be after end date.");
      return;
    }
    const range = {
      startDate: formatDate(startDateObj),
      endDate: formatDate(endDateObj),
    };
    setDateRange(range);
    setActiveFilters((prev) => ({ ...prev, period: "custom" }));

    // For custom range, fetch exactly what's requested
    fetchProjects(empId, range.startDate, range.endDate);
    setIsCustomExpanded(false);
  };

  if (isLoading && !refreshing) return <Loader visible={true} />;

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <HeaderComponent
        headerTitle="Projects TimeSheet"
        onBackPress={() => navigate.goBack()}
        icon1Name="filter"
        icon1OnPress={openFilterModal}
        filterCount={
          (activeFilters.status ? 1 : 0) +
          (activeFilters.period !== "today" ? 1 : 0)
        }
      />

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onClearFilters={clearFilters}
        onApplyFilters={applyFilters}
        filterConfigs={filterConfigs}
        modalTitle="Filter Projects"
      />

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
          onApply={applyCustomDateRange}
          onCancel={() => {
            setIsCustomExpanded(false);
            const sd = parseDateString(dateRange.startDate) || new Date();
            const ed = parseDateString(dateRange.endDate) || new Date();
            setStartDateObj(sd);
            setEndDateObj(ed);
          }}
        />
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={({ nativeEvent }) => {
          if (
            nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >=
            nativeEvent.contentSize.height - 50
          ) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {empId ? (
          <>
            <PeriodDisplay
              label={
                activeFilters.period === "custom"
                  ? `Custom (${dateRange.startDate} - ${dateRange.endDate})`
                  : periodOptions.find((o) => o.value === activeFilters.period)?.label ||
                  "Today" // Changed from "This Month"
              }
            />

            <Animated.View style={{ opacity: fadeAnim }}>
              {projects.length === 0 ? (
                <EmptyState title="No Projects" subtitle="Try changing filters or pull to refresh" />
              ) : (
                projects.map((project) => (
                  // Update the AuditCard render in APMTimeSheet:
                  <AuditCard
  key={project.id}
  project={project}
  onAction={handleActivityAction}
  allProjects={allProjects}
  hasOpenSessionGlobally={hasAnyOpenSession}
/>
                ))
              )}
            </Animated.View>

            {isLoadingMore && <Text style={styles.loadingMore}>Loading more...</Text>}
          </>
        ) : (
          <EmptyState title="No Employee ID" subtitle="Please check your profile" />
        )}
      </ScrollView>

      <ErrorModal
        visible={showErrorModal}
        message={errorMessage}
        onClose={() => {
          setShowErrorModal(false);
          setErrorMessage("");
        }}
      />

      <ConfirmationModal
        visible={confirmPopup.isOpen}
        title={confirmPopup.title}
        message={confirmPopup.message}
        onConfirm={confirmPopup.onConfirm}
        onCancel={() => setConfirmPopup((p) => ({ ...p, isOpen: false }))}
      />

      <ActivitySubmitCard
        visible={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        editingTask={selectedProject}
        isPendingCheckout={selectedProject?.modalContext?.type === "checkout_yesterday"}
        onSubmitActivity={handleSubmitFromModal}
        onCompleteActivity={handleMarkCompleteFromModal}
      />
    </SafeAreaView>
  );
};

export default APMTimeSheet;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContainer: { padding: 16, paddingBottom: 40 },
  loadingMore: { textAlign: "center", marginVertical: 16, color: "#666" },
});
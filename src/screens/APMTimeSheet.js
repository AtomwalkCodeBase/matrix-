import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  Alert,
  TouchableOpacity,
  Text,
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
  isDateInRange,
  formatRetainerActivities,
} from "../components/APMTimeSheet/utils";

import { getAllocationList, postAllocationData } from "../services/productServices";
import { useNavigation } from "expo-router";
import { AuditCard } from "../components/APMTimeSheet/AcivityCard";
import RetainerCard from "../components/APMTimeSheet/RetainerCard";
import { colors } from "../Styles/appStyle";
import Icon from "react-native-vector-icons/MaterialIcons";
import RemarkModals from "../components/RemarkModals";

const PROJECTS_PER_PAGE = 10;

const DEFAULT_FILTERS = {
  status: null,
  period: "today",
};

const APMTimeSheet = () => {
  const [empId, setEmpId] = useState(null);
  const [allProjects, setAllProjects] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // New state for retainer data and loading
  const [retainerData, setRetainerData] = useState({}); // { projectId: { retainers: [], loading: boolean, expanded: boolean } }
  const [loadingRetainers, setLoadingRetainers] = useState({}); // Track loading per project

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
  const [isPincodeModalOpen, setIsPincodeModalOpen] = useState(false);
  const [pincodeProject, setPincodeProject] = useState(null);
  const [pincode, setPincode] = useState("");

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
      { label: "Previous Week", value: "previous_week" },
      { label: "This Week", value: "this_week" },
      { label: "This Month", value: "this_month" },
      { label: "Custom Date", value: "custom" },
    ],
    []
  );

  const statusOptions = useMemo(
    () => [
      { label: "All", value: "All" },
      { label: "In Progress", value: "In Progress" },
      { label: "Pending", value: "Pending" },
      { label: "Planned", value: "Planned" },
      { label: "Completed", value: "Completed" },
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

        setActiveFilters({ ...DEFAULT_FILTERS });
        setPendingFilters({ ...DEFAULT_FILTERS });

        const todayRange = getDateRangeFromPeriod("today");
        const monthRange = getDateRangeFromPeriod("this_month");

        setDateRange(todayRange);
        setStartDateObj(parseDateString(todayRange.startDate) || new Date());
        setEndDateObj(parseDateString(todayRange.endDate) || new Date());

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

  // Sync custom date pickers → dateRange
  useEffect(() => {
    if (activeFilters.period !== "custom") return;

    const startStr = formatDate(startDateObj);
    const endStr = formatDate(endDateObj);

    if (startDateObj > endDateObj) {
      setStartDateObj(endDateObj);
      setEndDateObj(startDateObj);
      setDateRange({ startDate: endStr, endDate: startStr });
    } else {
      setDateRange({ startDate: startStr, endDate: endStr });
    }
  }, [startDateObj, endDateObj, activeFilters.period]);

  // Fetch projects from API
  const fetchProjects = async (employeeId, start, end) => {
    setIsLoading(true);
    try {
      const res = await getAllocationList(employeeId, null, start, end);
      const raw = Array.isArray(res?.data) ? res.data : [];
      const normalized = normalizeProjects(raw);

      setAllProjects(normalized);
      // Reset retainer data when projects are reloaded
      setRetainerData({});
    } catch (err) {
      console.error(err);
      setAllProjects([]);
      setErrorMessage("Failed to load projects. Please try again.");
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Fetch retainer data for a specific project
  const fetchRetainersForProject = async (projectId, retainerList) => {

    if (!retainerList || retainerList.length === 0) {
      console.log('No retainers to fetch');
      return;
    }

    // Filter out retainers with a_type: "A"
    const filteredRetainers = retainerList.filter(retainer => retainer.a_type !== "A");

    if (filteredRetainers.length === 0) {
      setRetainerData(prev => ({
        ...prev,
        [projectId]: {
          retainers: [],
          loading: false,
          expanded: true,
          noValidRetainers: true
        }
      }));
      return;
    }

    // Set loading state for this project
    setRetainerData(prev => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        loading: true,
        expanded: prev[projectId]?.expanded || false
      }
    }));

    try {
      const retainerPromises = filteredRetainers.map(async (retainer) => {
        try {
          // Call API with retainer's emp_id
          const monthRange = getDateRangeFromPeriod("this_month");
          const res = await getAllocationList(retainer.emp_id, null, monthRange.startDate, monthRange.endDate);

          const rawRetainerData = Array.isArray(res?.data) ? res.data : [];

          if (rawRetainerData.length === 0) {
            // Create a minimal fullData structure
            const minimalFullData = {
              // original_P: {
              //   id: retainer.a_id,
              //   emp_id: retainer.emp_id,
              //   employee_name: retainer.employee_name,
              //   no_of_items: retainer.no_of_items || 0,
              //   start_date: retainer.start_date,
              //   end_date: retainer.end_date
              // },
              original_P: retainer,
              project_period_status: 'Planned',
              todaysStatus: 'Planned',
              hasPendingCheckout: false,
              isRetainer: true
            };

            return {
              ...retainer,
              fullData: minimalFullData,
              fetchedAt: new Date().toISOString(),
              hasRealData: false
            };
          }

          // Normalize retainer data using the new specialized function
          const normalizedRetainerProjects = formatRetainerActivities(rawRetainerData);
          // Find the matching retainer project
          let matchingRetainerProject = null;

          if (retainer.a_id) {
            matchingRetainerProject = normalizedRetainerProjects.find(project => {
              return project.original_P?.id === retainer.a_id ||
                project.original_A?.id === retainer.a_id;
            });
          }

          // If no match found, take the first one or create a minimal one
          if (!matchingRetainerProject) {
            if (normalizedRetainerProjects.length > 0) {
              matchingRetainerProject = normalizedRetainerProjects;
            } else {
              // Create minimal data
              matchingRetainerProject = {
                original_P: {
                  id: retainer.a_id,
                  emp_id: retainer.emp_id,
                  employee_name: retainer.employee_name
                },
                project_period_status: 'Planned',
                todaysStatus: 'Planned',
                hasPendingCheckout: false,
                isRetainer: true
              };
            }
          }

          return {
            ...retainer,
            fullData: matchingRetainerProject,
            fetchedAt: new Date().toISOString(),
            hasRealData: true
          };
        } catch (error) {
          console.error(`Error fetching retainer ${retainer.emp_id}:`, error);

          // Return with minimal data
          const minimalFullData = {
            original_P: {
              id: retainer.a_id,
              emp_id: retainer.emp_id,
              employee_name: retainer.employee_name
            },
            project_period_status: 'Planned',
            todaysStatus: 'Planned',
            hasPendingCheckout: false,
            isRetainer: true
          };

          return {
            ...retainer,
            fullData: minimalFullData,
            error: "Failed to load data",
            fetchedAt: new Date().toISOString(),
            hasRealData: false
          };
        }
      });

      const retainersWithData = await Promise.all(retainerPromises);
      // console.log('Retainers with data:', retainersWithData);

      // Update retainer data state
      setRetainerData(prev => ({
        ...prev,
        [projectId]: {
          retainers: retainersWithData,
          loading: false,
          expanded: true
        }
      }));
    } catch (error) {
      console.error(`Error fetching retainers for project ${projectId}:`, error);
      setRetainerData(prev => ({
        ...prev,
        [projectId]: {
          ...prev[projectId],
          loading: false,
          error: "Failed to load retainer data"
        }
      }));
    }
  };

  // Toggle retainer visibility
  const toggleRetainers = (projectId, retainerList) => {
    // Filter out retainers with a_type: "A"
    const validRetainers = retainerList?.filter(retainer => retainer.a_type !== "A") || [];

    if (validRetainers.length === 0) {
      // Show message if no valid retainers
      setRetainerData(prev => ({
        ...prev,
        [projectId]: {
          retainers: [],
          loading: false,
          expanded: true,
          noValidRetainers: true
        }
      }));
      return;
    }

    const currentState = retainerData[projectId];

    if (currentState?.expanded) {
      // Collapse
      setRetainerData(prev => ({
        ...prev,
        [projectId]: {
          ...prev[projectId],
          expanded: false
        }
      }));
    } else {
      // Expand and fetch if not already loaded
      if (!currentState?.retainers || currentState.retainers.length === 0) {
        fetchRetainersForProject(projectId, retainerList);
      } else {
        setRetainerData(prev => ({
          ...prev,
          [projectId]: {
            ...prev[projectId],
            expanded: true
          }
        }));
      }
    }
  };

  // Apply filters + pagination
  const applyFiltersAndPagination = useCallback((list, filters, page = 1) => {
    let filtered = [...list];

    if (filters.status && filters.status !== "All") {
      filtered = filtered.filter((p) => {
        const statusMatch = p.project_period_status === filters.status ||
          p.status === filters.status;
        return statusMatch;
      });
    }

    if (filters.period) {
      switch (filters.period) {
        case "today":
          const todayStr = formatToDDMMYYYY(new Date());
          const todayApiStr = getTodayApiDateStr();
          
          filtered = filtered.filter(project => {
            const hasActivityToday = project.day_logs && project.day_logs[todayApiStr];
            const isPlannedForToday = isDateInRange(todayApiStr,project.planned_start_date,project.planned_end_date  )

            return hasActivityToday || project.hasPendingCheckout || isPlannedForToday;
          });
          break;

        case "this_week":
          const weekRange = getDateRangeFromPeriod("this_week");
          const weekStart = parseDateString(weekRange.startDate);
          const weekEnd = parseDateString(weekRange.endDate);

          filtered = filtered.filter(project => {
            const hasActivityInWeek = Object.keys(project.day_logs || {}).some(dateStr => {
              const activityDate = parseApiDate(dateStr);
              if (!activityDate || !weekStart || !weekEnd) return false;

              const activityDateOnly = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
              const weekStartOnly = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
              const weekEndOnly = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());

              return activityDateOnly >= weekStartOnly && activityDateOnly <= weekEndOnly;
            });

            const plannedStart = parseApiDate(project.planned_start_date);
            const plannedEnd = parseApiDate(project.planned_end_date);

            const isPlannedForWeek = (plannedStart && weekStart && weekEnd &&
              plannedStart >= weekStart && plannedStart <= weekEnd) ||
              (plannedEnd && weekStart && weekEnd &&
                plannedEnd >= weekStart && plannedEnd <= weekEnd);

            return hasActivityInWeek || isPlannedForWeek || project.hasPendingCheckout;
          });
          break;

          case "previous_week":
      case "last_week":
        const prevWeekRange = getDateRangeFromPeriod("previous_week");   // ← uses the function you already updated
        const prevWeekStart = parseDateString(prevWeekRange.startDate);
        const prevWeekEnd = parseDateString(prevWeekRange.endDate);

        filtered = filtered.filter(project => {
          const hasActivityInPrevWeek = Object.keys(project.day_logs || {}).some(dateStr => {
            const activityDate = parseApiDate(dateStr);
            if (!activityDate || !prevWeekStart || !prevWeekEnd) return false;

            const activityDateOnly = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
            const prevStartOnly = new Date(prevWeekStart.getFullYear(), prevWeekStart.getMonth(), prevWeekStart.getDate());
            const prevEndOnly   = new Date(prevWeekEnd.getFullYear(),   prevWeekEnd.getMonth(),   prevWeekEnd.getDate());

            return activityDateOnly >= prevStartOnly && activityDateOnly <= prevEndOnly;
          });

          const plannedStart = parseApiDate(project.planned_start_date);
          const plannedEnd = parseApiDate(project.planned_end_date);

          const isPlannedForPrevWeek = 
            (plannedStart && prevWeekStart && prevWeekEnd &&
              plannedStart >= prevWeekStart && plannedStart <= prevWeekEnd) ||
            (plannedEnd && prevWeekStart && prevWeekEnd &&
              plannedEnd >= prevWeekStart && plannedEnd <= prevWeekEnd);

          return hasActivityInPrevWeek || isPlannedForPrevWeek || project.hasPendingCheckout;
        });
        break;

        case "this_month":
          const monthRange = getDateRangeFromPeriod("this_month");
          const monthStart = parseDateString(monthRange.startDate);
          const monthEnd = parseDateString(monthRange.endDate);

          filtered = filtered.filter(project => {
            const hasActivityInMonth = Object.keys(project.day_logs || {}).some(dateStr => {
              const activityDate = parseApiDate(dateStr);
              if (!activityDate || !monthStart || !monthEnd) return false;

              const activityDateOnly = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
              const monthStartOnly = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate());
              const monthEndOnly = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate());

              return activityDateOnly >= monthStartOnly && activityDateOnly <= monthEndOnly;
            });

            const plannedStart = parseApiDate(project.planned_start_date);
            const plannedEnd = parseApiDate(project.planned_end_date);

            const isPlannedForMonth = (plannedStart && monthStart && monthEnd &&
              plannedStart >= monthStart && plannedStart <= monthEnd) ||
              (plannedEnd && monthStart && monthEnd &&
                plannedEnd >= monthStart && plannedEnd <= monthEnd);

            return hasActivityInMonth || isPlannedForMonth || project.hasPendingCheckout;
          });
          break;

        default:
          break;
      }
    }

    const todayStr = formatToDDMMYYYY(new Date());
    const sorted = [...filtered].sort((a, b) => {
      const aIsTodayComplete = a.todaysStatus === "complete" && a.activityDate === todayStr;
      const bIsTodayComplete = b.todaysStatus === "complete" && b.activityDate === todayStr;
      return aIsTodayComplete ? 1 : bIsTodayComplete ? -1 : 0;
    });

    const startIdx = (page - 1) * PROJECTS_PER_PAGE;
    const paginated = sorted.slice(0, startIdx + PROJECTS_PER_PAGE);

    setProjects(paginated);
  }, []);

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
  
  try {
    // RESET to initial state completely
    setAllProjects([]);
    setProjects([]);
    setRetainerData({});
    
    // Get fresh employee ID (in case it changed)
    const storedEmpId = await AsyncStorage.getItem("empId");
    if (!storedEmpId) {
      setErrorMessage("Employee ID not found. Please login again.");
      setShowErrorModal(true);
      setRefreshing(false);
      return;
    }
    
    setEmpId(storedEmpId);
    
    // Reset filters to default
    setActiveFilters({ ...DEFAULT_FILTERS });
    setPendingFilters({ ...DEFAULT_FILTERS });
    
    // Get current date ranges (same as initial load)
    const todayRange = getDateRangeFromPeriod("today");
    const monthRange = getDateRangeFromPeriod("this_month");
    
    // Set dates (same as initial load)
    setDateRange(todayRange);
    setStartDateObj(parseDateString(todayRange.startDate) || new Date());
    setEndDateObj(parseDateString(todayRange.endDate) || new Date());
    
    // Fetch projects with same parameters as initial load
    await fetchProjects(storedEmpId, monthRange.startDate, monthRange.endDate);
    
  } catch (err) {
    console.error("Refresh error:", err);
    setErrorMessage("Failed to refresh. Please try again.");
    setShowErrorModal(true);
  } finally {
    setRefreshing(false);
  }
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

  const extractApiErrorMessage = (error, fallback) => {
  const backendMessage =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    "";

  // SPECIFIC CASE HANDLING
  if (
    backendMessage ===
    "Invalid request - No valid Time Sheet record found."
  ) {
    return "There is no record found for check-out. Please reload the screen and try again.";
  }

  // Existing generic handling
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.response?.data?.errors) {
    return Object.values(error.response.data.errors)
      .flat()
      .join("\n");
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
};



  // Submit activity (Start / Resume / Complete)
  const handleActivitySubmit = async ({ project, mode, data = {}, extraFields = {} }) => {
    let processedProject = project;

    const isAddMode = mode === "ADD";

    const isUpdateRetainer = mode === "UPDATE" && project?.modalContext?.type === "update_retainer";

    setIsLoading(true);

          if (mode === "FORCE_COMPLETE" || mode === "REVERSE_COMPLETE") {
        const formData = new FormData();

        const resolvedEmpId =
          project?.original_P?.emp_id ||
          project?.original_A?.emp_id ||
          "";

        const aId = project?.original_A?.id;

        if (!resolvedEmpId || !aId) {
          setErrorMessage("Unable to identify activity");
          setShowErrorModal(true);
          setIsLoading(false);
          return false;
        }

        formData.append("emp_id", resolvedEmpId);
        formData.append("a_id", String(aId));
        formData.append("call_mode", mode === "REVERSE_COMPLETE" ? "REVERSE_COMPLETE" :"FORCE_COMPLETE");
        if(mode === "REVERSE_COMPLETE"){
          formData.append("geo_type", "O")
        }
        if (data.file) {
          formData.append("submitted_file", data.file);
        }
        if (data.remarks) {
        formData.append("remarks",data.remarks);}

        Object.entries(extraFields).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value);
          }
        });

        try {
      //     for (let [key, value] of formData.entries()) {
      //   console.log(key, value);
      // }
          const res = await postAllocationData(formData);
          // const res ={status : 200}

          if (res?.status === 200) {
            return true;
          }

          setErrorMessage(mode === "REVERSE_COMPLETE" ? "Failed to change status update.Please Try Again sometime." : "Failed to complete this activity.Please try again sometime. ");
          setShowErrorModal(true);
          return false;

        } catch (error) {
          const msg = extractApiErrorMessage(
            error,
            "Unable to force complete activity"
          );
          setErrorMessage(msg);
          setShowErrorModal(true);
          return false;

        } finally {
          setIsLoading(false);
        }
      }


    try {
      const loc = await getCurrentLocation();
      if (!loc) {
        setIsLoading(false);
        return false;
      }

      const { apiDate: defaultApiDate, currentTime } = getCurrentDateTimeDefaults();
      const formData = new FormData();

      let activityDate = data.activityDate;

      if (activityDate instanceof Date) {
        activityDate = DateForApiFormate(activityDate);
      }

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

      // For retainer projects
      let resolvedEmpId = "";
      let pId = "";
      let aId = "";

      if (project.isRetainer && project.retainerData) {
        // Use retainer's emp_id from retainerData
        resolvedEmpId = project.original_P.emp_id || "";
        // console.log('Using retainer emp_id:', resolvedEmpId);

        // For ADD mode, we need p_id
        if (isAddMode) {
          // Use retainer's a_id as p_id or get from original_P
          pId = project.retainerData.a_id || project.original_P?.id;
          // console.log('Retainer p_id:', pId);
        } else {
          // For UPDATE mode, use original_A.id
          aId = project.original_A?.id || project.retainerData.a_id;
          // console.log('Retainer a_id:', aId);
        }
      } else {
        // Primary project logic
        resolvedEmpId = project?.original_P?.emp_id || project?.original_A?.emp_id || "";

        if (isAddMode) {
          pId = project.original_P?.id;
        } else {
          aId = project.original_A?.id;
        }
      }

      if (!resolvedEmpId) {
        console.error('No employee ID found');
        setErrorMessage("Unable to identify employee");
        setShowErrorModal(true);
        setIsLoading(false);
        return false;
      }

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

      if (isAddMode && processedProject.isRetainer) {
        const pId = processedProject.retainerData?.a_id ||
          processedProject.original_P?.id;

        if (pId) {
          formData.append("p_id", String(pId));
        } else {
          console.error('No p_id found for retainer');
          setErrorMessage("Unable to identify retainer project");
          setShowErrorModal(true);
          setIsLoading(false);
          return false;
        }
      }

      if (isAddMode) {
        if (!pId) {
          console.warn("Missing p_id for ADD mode", project);
          setErrorMessage("Unable to identify project");
          setShowErrorModal(true);
          setIsLoading(false);
          return false;
        }

        formData.append("call_mode", "ADD");
        formData.append("p_id", String(pId));
        formData.append("start_time", formatAMPMTime(startTime));
        formData.append("geo_type", "I");
        formData.append("no_of_items", "0");
      } else {
        if (!aId) {
          console.warn("Missing a_id for UPDATE mode", project);
          setErrorMessage("Unable to identify activity");
          setShowErrorModal(true);
          setIsLoading(false);
          return false;
        }
        if (isUpdateRetainer) {
    formData.append("call_mode", "DATA_CORRECT");
    formData.append("a_id", String(aId));
    formData.append("geo_type", "O");

    formData.append("no_of_items",String(Number(data.noOfItems || 0)));

        } else {

        formData.append("no_of_items",String(Number(data.noOfItems || 0)));
        formData.append("call_mode", "UPDATE");
        formData.append("a_id", String(aId));

        if (data.endTime) {
          formData.append("end_time", formatAMPMTime(data.endTime));
        }

        if (startTime) {
          formData.append("start_time", formatAMPMTime(startTime));
          formData.append("remarks", "Project resume from Mobile");
          formData.append("geo_type", "I");
        } else {
          formData.append("geo_type", "O");
        }
      }
    }

      Object.entries(extraFields).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });

      // for (let [key, value] of formData.entries()) {
      //   console.log(key, value);
      // }

      const res = await postAllocationData(formData);
      // const res = { status: 200 }

      if (res?.status === 200) {
        return true;
      }

      const apiMsg =
        res?.data?.error ||
        res?.data?.message ||
        (isAddMode
          ? "Failed to start activity. Please try again."
          : "Failed to update activity. Please try again.");

      setErrorMessage(apiMsg);
      setShowErrorModal(true);
      return false;

    } catch (error) {
      // console.error(
      //   "Error in handleActivitySubmit",
      //   error?.response?.data || error?.message || error
      // );

      const errorMessage = extractApiErrorMessage(
        error,
        isAddMode
          ? "An error occurred while starting the activity."
          : "An error occurred while updating the activity."
      );

      setErrorMessage(errorMessage);
      setShowErrorModal(true);
      return false;

    } finally {
      setIsLoading(false);
    }
  };

  // Action handlers
  const handleActivityAction = ({ type, project, retainer = false, isMaxAuditEndDatePass }) => {
    if (type === "start") {
      if (!retainer) {
        const hasOpenSession = allProjects?.some((p) => p.todaysStatus === "Active" || p.hasPendingCheckout === true);
        if (hasOpenSession) {
          setErrorMessage("Finish Pending");
          setShowErrorModal(true);
          return;
        }
      }

      setConfirmPopup({
        isOpen: true,
        title: "Start Activity",
        message: `${isMaxAuditEndDatePass ? `Max audit end date is Passed .${'\n\n'}Still Do you want to start the activity` : "Start this activity now?"}`,
        onConfirm: async () => {
          await handleActivitySubmit({ project, mode: "ADD" });
          await onRefresh();
          setConfirmPopup((p) => ({ ...p, isOpen: false }));
        },
      });
      return;
    }

    if (type === "resume") {
      if (retainer) {
        const hasOpenSession = allProjects.some((p) => p.todaysStatus === "Active" || p.hasPendingCheckout === true);
        if (hasOpenSession) {
          setErrorMessage("Finish Pending");
          setShowErrorModal(true);
          return;
        }
      }
      setConfirmPopup({
        isOpen: true,
        title: "Resume Activity",
        message: `${isMaxAuditEndDatePass ? `Max audit end date is Passed .${'\n\n'}Still Do you want to Resume the activity` : "Resume this activity?"}`,
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

    if (type === "reverse") {
      setConfirmPopup({
        isOpen: true,
        title: "Reverse Audit status",
        message: "Are you sure you want to Reverse audit status",
        onConfirm: async () => {
          await handleActivitySubmit({
            project,
            mode: "REVERSE_COMPLETE",
            data: { startTime: getCurrentDateTimeDefaults().currentTime },
          });
          await onRefresh();
          setConfirmPopup((p) => ({ ...p, isOpen: false }));
        },
      });
      return;
    }


    if (["continue", "complete", "checkout_yesterday", "update_retainer", "force_complete"].includes(type)) {
      setSelectedProject({ ...project, modalContext: { type }, retainer });
      setIsFormModalOpen(true);
    }
  };

  const handleSubmitFromModal = (formData) => {
    const { extraFields = {}, ...dataWithoutExtraFields } = formData;
    return handleActivitySubmit({
      project: selectedProject,
      mode: formData.mode === "FORCE_COMPLETE" ? "FORCE_COMPLETE" :"UPDATE",
      data: dataWithoutExtraFields,
      extraFields,
    }).then(async (success) => {
      if (success) {
        await onRefresh();
        // Refresh retainer data if it was a retainer action
        if (selectedProject?.retainer) {
          const parentProject = projects.find(p =>
            p.original_P?.retainer_list?.some(r => r.emp_id === selectedProject.retainerData?.emp_id)
          );
          if (parentProject) {
            fetchRetainersForProject(parentProject.id, parentProject.original_P?.retainer_list || []);
          }
        }
      }
      setIsFormModalOpen(false);
    });
  };

  // Update handleMarkCompleteFromModal for retainers
  const handleMarkCompleteFromModal = (formData) => {
    const { extraFields = {}, ...dataWithoutExtraFields } = formData;
    return handleActivitySubmit({
      project: selectedProject,
      mode: "UPDATE",
      data: dataWithoutExtraFields,
      extraFields: { ...extraFields, is_completed: 1 },
    }).then(async (success) => {
      if (success) {
        await onRefresh();
        if (selectedProject?.isRetainer) {
          const parentProject = projects.find(p =>
            p.original_P?.retainer_list?.some(r => r.emp_id === selectedProject.retainerData?.emp_id)
          );
          if (parentProject) {
            fetchRetainersForProject(parentProject.id, parentProject.original_P?.retainer_list || []);
          }
        }
      }
      setIsFormModalOpen(false);
    });
  };

  const handlePincodeSubmit = async () => {
    if (!pincode) {
      setErrorMessage("Please enter pincode");
      return;
    }

    if (!/^\d{6}$/.test(pincode)) {
      setErrorMessage("Pincode must be exactly 6 digits");
      return;
    }
    if (pincode === "000000") {
      setErrorMessage("Pincode cannot be all zeros");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();

      const aId = pincodeProject?.original_A?.id;
      const resolvedEmpId = pincodeProject?.original_P?.emp_id || pincodeProject?.original_A?.emp_id || empId;
      const { apiDate: defaultApiDate } = getCurrentDateTimeDefaults();
      const activityDate = defaultApiDate;

      if (!aId) {
        setErrorMessage("Please start the activity to add pin code.");
        setShowErrorModal(true);
        setIsLoading(false);
        return;
      }

      formData.append("emp_id", resolvedEmpId);
      formData.append("a_id", String(aId));
      formData.append("activity_date", DateForApiFormate(activityDate));
      formData.append("call_mode", "DATA_CORRECT");
      formData.append("geo_type", "O");
      formData.append("pin_code", pincode);

      // for (let [key, value] of formData.entries()) {
      //   console.log(key, value);
      // }

      const res = await postAllocationData(formData);

      // const res = { status: 200 }

      if (res?.status === 200) {
        setIsPincodeModalOpen(false);
        setPincode("");
        setPincodeProject(null);
        await onRefresh();
      } else {
        const apiMsg = res?.data?.error || res?.data?.message || "Failed to update pincode.";
        setErrorMessage(apiMsg);
        setShowErrorModal(true);
      }
    } catch (error) {
      const errorMessage = extractApiErrorMessage(error, "An error occurred while updating pincode.");
      setErrorMessage(errorMessage);
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter controls
  const openFilterModal = () => {
    setPendingFilters({ ...activeFilters });
    setShowFilterModal(true);
  };

  const applyFilters = () => {
    const periodChanged = pendingFilters.period !== activeFilters.period;
    setActiveFilters(pendingFilters);

    if (periodChanged && pendingFilters.period !== "custom") {
      const range = getDateRangeFromPeriod(pendingFilters.period);
      const monthRange = getDateRangeFromPeriod("this_month");
      setDateRange(range);
      fetchProjects(empId, monthRange.startDate, monthRange.endDate);
    }
    setShowFilterModal(false);
  };

  const clearFilters = async () => {
    setPendingFilters({ ...DEFAULT_FILTERS });
    setActiveFilters({ ...DEFAULT_FILTERS });

    const todayRange = getDateRangeFromPeriod("today");
    const monthRange = getDateRangeFromPeriod("this_month");

    setDateRange(todayRange);
    await fetchProjects(empId, monthRange.startDate, monthRange.endDate);
    setShowFilterModal(false);
    setIsCustomExpanded(false);
  };

  const hasAnyOpenSession = useMemo(() => {
    if (!allProjects.length) return false;

    return allProjects.some(project => {
      const lastLogEntry = Object.values(project.day_logs || {}).pop();
      const hasOpenFromDayLogs = lastLogEntry &&
        lastLogEntry.check_in &&
        !lastLogEntry.check_out;

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

    fetchProjects(empId, range.startDate, range.endDate);
    setIsCustomExpanded(false);
  };

  if (isLoading && !refreshing) return <Loader visible={true} />;

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <HeaderComponent
        headerTitle="My Audits"
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
                  "Today"
              }
            />

            <Animated.View style={{ opacity: fadeAnim }}>
              {projects.length === 0 ? (
                <EmptyState
                  title="No Projects"
                  subtitle="Try changing filters or pull to refresh"
                />
              ) : (
                projects.map((project) => {
                  return (
                    <React.Fragment key={project.id}>
                      <AuditCard
                        project={project}
                        onAction={handleActivityAction}
                        allProjects={allProjects}
                        hasOpenSessionGlobally={hasAnyOpenSession}
                        retainerData={retainerData}
                        onToggleRetainers={toggleRetainers}
                        hasAnyOpenSession={hasAnyOpenSession}
                        showPincodeModal={(proj) => {
                          setPincodeProject(proj);
                          setIsPincodeModalOpen(true);
                        }}
                      />
                    </React.Fragment>
                  );
                })
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

      {isPincodeModalOpen && <RemarkModals
        visible={isPincodeModalOpen}
        onClose={() => {
          setIsPincodeModalOpen(false);
          setPincodeProject(null);
          setPincode("");
          setErrorMessage("")
        }}
        onSubmit={handlePincodeSubmit}
        title="Pin code"
        placeholder="Enter pin code"
        type="number"
        remark={pincode}
        setRemark={setPincode}
        errorMessage={errorMessage}
      />}
    </SafeAreaView>
  );
};

export default APMTimeSheet;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContainer: { padding: 16, paddingBottom: 40 },
  loadingMore: { textAlign: "center", marginVertical: 16, color: "#666" },
  retainerSection: {
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 12,
  },
  viewRetainersButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  viewRetainersText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  retainersList: {
    marginTop: 12,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
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
} from "../components/APMTimeSheet/utils";

import { getAllocationList, postAllocationData } from "../services/productServices";
import { useNavigation } from "expo-router";
import { AuditCard } from "../components/APMTimeSheet/AcivityCard";

const PROJECTS_PER_PAGE = 10;

const DEFAULT_FILTERS = {
  status: null,
  period: "this_month",
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
      { label: "This Month", value: "this_month" },
      { label: "This Week", value: "this_week" },
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

        // Default: This Month
        const defaultRange = getDateRangeFromPeriod("this_month");
        updateDateRangeAndFetch(storedEmpId, defaultRange);
      } catch (err) {
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
      // auto-swap invalid range
      setStartDateObj(endDateObj);
      setEndDateObj(startDateObj);
      setDateRange({ startDate: endStr, endDate: startStr });
    } else {
      setDateRange({ startDate: startStr, endDate: endStr });
    }
  }, [startDateObj, endDateObj, activeFilters.period]);

  // Helper: update date range + refetch
  const updateDateRangeAndFetch = async (id, range) => {
    setDateRange(range);
    setStartDateObj(parseDateString(range.startDate) || new Date());
    setEndDateObj(parseDateString(range.endDate) || new Date());
    await fetchProjects(id, range.startDate, range.endDate);
  };

  // Fetch projects from API
  const fetchProjects = async (employeeId, start, end) => {
    setIsLoading(true);
    try {
      const res = await getAllocationList(employeeId, start, end);
      const raw = Array.isArray(res?.data) ? res.data : [];
      const normalized = normalizeProjects(raw);

      // Sort: Today's completed → bottom
      const todayStr = formatToDDMMYYYY(new Date());
      const sorted = [...normalized].sort((a, b) => {
        const aIsTodayComplete = a.todaysStatus === "complete" && a.activityDate === todayStr;
        const bIsTodayComplete = b.todaysStatus === "complete" && b.activityDate === todayStr;
        return aIsTodayComplete ? 1 : bIsTodayComplete ? -1 : 0;
      });

      setAllProjects(sorted);
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
  const applyFiltersAndPagination = useCallback((list, filters, page = 1) => {
    let filtered = [...list];

    if (filters.status && filters.status !== "All") {
      filtered = filtered.filter((p) => p.status === filters.status);
    }

    const startIdx = (page - 1) * PROJECTS_PER_PAGE;
    const paginated = filtered.slice(0, startIdx + PROJECTS_PER_PAGE);

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

        // console.log("==== FORM DATA BEFORE API ====");
        // for (let [key, value] of formData.entries()) {
        //   console.log(key, value);
        // }
        // console.log("================================");

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
            : "An error occurred while updating the activity."
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
      const hasOpenSession = allProjects.some((p) => p.todaysStatus === "Active");
      if (hasOpenSession) {
        setErrorMessage("Complete pending activity first.");
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
      extraFields: { is_complete: 1 },
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
      updateDateRangeAndFetch(empId, range);
    }
    // for custom → dateRange already updated via picker
    setShowFilterModal(false);
  };

  const clearFilters = async () => {
    setPendingFilters({ ...DEFAULT_FILTERS });
    setActiveFilters({ ...DEFAULT_FILTERS });

    const todayRange = getDateRangeFromPeriod("this_month"); // or "today" if you prefer
    await updateDateRangeAndFetch(empId, todayRange);
    setShowFilterModal(false);
    setIsCustomExpanded(false);
  };

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
        headerTitle="Projects TimeSheet"
        onBackPress={() => navigate.goBack()}
        icon1Name="filter"
        icon1OnPress={openFilterModal}
        filterCount={
          (activeFilters.status ? 1 : 0) +
          (activeFilters.period !== "this_month" ? 1 : 0)
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
                    "This Month"
              }
            />

            <Animated.View style={{ opacity: fadeAnim }}>
              {projects.length === 0 ? (
                <EmptyState title="No Projects" subtitle="Try changing filters or pull to refresh" />
              ) : (
                projects.map((project) => (
                  <AuditCard
                    key={project.id}
                    project={project}
                    onAction={handleActivityAction}
                    onViewDetails={() => console.log("project", project)}
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
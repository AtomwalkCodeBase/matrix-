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

import Loader from "../components/old_components/Loader";
import HeaderComponent from "../components/HeaderComponent";
import EmptyState from "../components/APMTimeSheet/EmptyState";
import FilterModal from "../components/FilterModal";
import ErrorModal from "../components/ErrorModal";
import OPEModal from "../components/APMTimeSheet/OPEModal";

import {
  formatDate,
  parseDateString,
  getDateRangeFromPeriod,
  DateForApiFormate,
  normalizeProjects,
  getMonthRange,
  formatToDDMMYYYY,
  formatMonthLabel,
  formatWeekLabel,
} from "../components/APMTimeSheet/utils";

import { getAllocationList, postAllocationData } from "../services/productServices";
import { useNavigation } from "expo-router";
import { colors } from "../Styles/appStyle";
import { OPECard } from "../components/APMTimeSheet/OPECard";
import SuccessModal from "../components/SuccessModal";

const PROJECTS_PER_PAGE = 10;

const DEFAULT_FILTERS = {
  status: "All",
  range: "week",
};

const OPEScreen = () => {
  const [empId, setEmpId] = useState(null);
  const [allProjects, setAllProjects] = useState([]);
  const [projects, setProjects] = useState([]);
  const [monthOffset, setMonthOffset] = useState(0);  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [activeFilters, setActiveFilters] = useState({ ...DEFAULT_FILTERS });
  const [pendingFilters, setPendingFilters] = useState({ ...DEFAULT_FILTERS });

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showOPEModal, setShowOPEModal] = useState(false);

  const [selectedProject, setSelectedProject] = useState(null);

  const fadeAnim = useState(new Animated.Value(0))[0];
  const navigate = useNavigation();


const statusOptions = useMemo(
  () => [
    { label: "All", value: "All" },
    { label: "Added", value: "A" },
    { label: "F&A Approved", value: "F" },
    { label: "Planned", value: "P" },
    { label: "Ready for Billing", value: "B" },
    { label: "Submitted to BO", value: "S" },
    { label: "Rejected", value: "H" },
    { label: "Cancelled", value: "X" },
  ],
  []
);

const rangeOptions = useMemo(
  () => [
    { label: "Month", value: "month" },
    { label: "Week", value: "week" },
  ],
  []
);

 const filterConfigs = useMemo(
  () => [
    {
      label: "Range",
      options: rangeOptions,
      value: pendingFilters.range,
      setValue: (v) => setPendingFilters((p) => ({ ...p, range: v })),
    },
    {
      label: "Status",
      options: statusOptions,
      value: pendingFilters.status,
      setValue: (v) => setPendingFilters((p) => ({ ...p, status: v })),
    },
  ],
  [pendingFilters, statusOptions, rangeOptions]
);

const loadMonthProjects = async (employeeId, offset = 0, mode = "week") => {
  const range = getMonthRange({ mode: mode, offset });

  await fetchProjects(employeeId, range.start, range.end);
};

  // Initialize
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

      const monthRange = getMonthRange({ mode: activeFilters.range });

      await fetchProjects(storedEmpId, monthRange.start, monthRange.end);

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

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [projects]);

  // Apply filters
  useEffect(() => {
    applyFiltersAndPagination(allProjects, activeFilters);
  }, [allProjects, activeFilters]);

  // Fetch projects
  const fetchProjects = async (employeeId, start, end) => {
    setIsLoading(true);
    const formattedStart = formatToDDMMYYYY(start);
    const formattedEnd = formatToDDMMYYYY(end);
    console.log(employeeId, formattedStart, formattedEnd)
    try {
      const res = await getAllocationList(employeeId, null, formattedStart, formattedEnd);
      const raw = Array.isArray(res?.data) ? res.data : [];
      
      // Filter OPE Actual projects
      const opeActualProjects = raw.filter(project => {
        return project.is_ope_actual === true || 
               project.original_P?.is_ope_actual === true || 
               project.original_A?.is_ope_actual === true;
      });
      
      const normalized = normalizeProjects(opeActualProjects);
      setAllProjects(normalized);
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
    filtered = filtered.filter(
      (p) => p.project_period_status === filters.status
    );
  }

  const startIdx = (page - 1) * PROJECTS_PER_PAGE;
  const paginated = filtered.slice(0, startIdx + PROJECTS_PER_PAGE);

  setProjects(paginated);
}, []);

  const loadMore = () => {
    if (isLoadingMore) return;
    const nextPage = Math.floor(projects.length / PROJECTS_PER_PAGE) + 1;
    if (projects.length < allProjects.length) {
      setIsLoadingMore(true);
      applyFiltersAndPagination(allProjects, activeFilters, nextPage);
      setIsLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const storedEmpId = await AsyncStorage.getItem("empId");
      if (!storedEmpId) {
        setErrorMessage("Employee ID not found. Please login again.");
        setShowErrorModal(true);
        setRefreshing(false);
        return;
      }
      
      setEmpId(storedEmpId);
      setActiveFilters({ ...DEFAULT_FILTERS });
      setPendingFilters({ ...DEFAULT_FILTERS });
      
      const monthRange = getMonthRange({ mode: "month", offset: monthOffset });
      await fetchProjects(storedEmpId, monthRange.start, monthRange.end);
    } catch (err) {
      console.error("Refresh error:", err);
      setErrorMessage("Failed to refresh. Please try again.");
      setShowErrorModal(true);
    } finally {
      setRefreshing(false);
    }
  };

  // Submit OPE Claim
  const handleOPESubmit = async ({ opeAmount, remarks, file }) => {
    if (!selectedProject) return false;

    setIsLoading(true);
    try {

      // Get activity ID
      const aId = selectedProject?.original_A?.id || selectedProject?.original_P?.id;
      if (!aId) {
        setErrorMessage("Unable to identify activity");
        setShowErrorModal(true);
        setIsLoading(false);
        return false;
      }

      const formData = new FormData();
      
      // Add all required fields in the exact format you specified
      formData.append("call_mode", "CLAIM_UPDATE");
      formData.append("emp_id", empId);
      formData.append("a_id", String(aId));
      formData.append("ope_amt", String(opeAmount));
      formData.append("claim_remarks", remarks || "");

      // Add file if selected
      if (file) {
        formData.append("claim_file", {
          uri: file.fileUri,
          type: file.fileMimeType || 'image/jpeg',
          name: file.fileName || `claim_${Date.now()}.jpg`,
        });
      }

      // Log form data for debugging
      for (let pair of formData._parts) {
        console.log(pair[0], pair[1]);
      }

      // const res = await postAllocationData(formData);

      const res = {status: 400}

      if (res?.status === 200) {
        setShowSuccessModal(true)
        await onRefresh();
        return true;
      } else {
        const errorMsg = res?.data?.error || res?.data?.message || "Failed to submit claim";
        setErrorMessage(errorMsg);
        setShowErrorModal(true);
        return false;
      }

    } catch (error) {
      console.error("Error submitting OPE claim:", error);
      setErrorMessage(error?.response?.data?.error || error?.message || "Failed to submit claim");
      setShowErrorModal(true);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle card action
  const handleActivityAction = ({ type, project }) => {
    // Only handle OPE amount actions
    if (type === 'add_ope_amount' || type === 'update_ope_amount') {
      setSelectedProject(project);
      setShowOPEModal(true);
    }
  };

  // Filter controls
  const openFilterModal = () => {
    setPendingFilters({ ...activeFilters });
    setShowFilterModal(true);
  };

const applyFilters = async() => {
  setActiveFilters(pendingFilters);
  setMonthOffset(0);
  const range = getMonthRange({
    mode: pendingFilters.range,
    offset: 0,
  });
  await fetchProjects(empId, range.start, range.end);

  setShowFilterModal(false);
};

const clearFilters = async() => {
  const reset = { ...DEFAULT_FILTERS };
  setPendingFilters(reset);
  setActiveFilters(reset);
  setMonthOffset(0);
  const range = getMonthRange({ mode: "month", offset: 0 });
  await fetchProjects(empId, range.start, range.end);
  setShowFilterModal(false);
};

  if (isLoading && !refreshing) return <Loader visible={true} />;

  const range = getMonthRange({ mode: activeFilters.range, offset: monthOffset });

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <HeaderComponent
        headerTitle="OPE Actuals"
        onBackPress={() => navigate.goBack()}
        icon1Name="filter"
        icon1OnPress={openFilterModal}
        filterCount={
          (activeFilters.status ? 1 : 0)
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

     <View style={styles.monthNavigation}>
  <TouchableOpacity
    style={styles.navButton}
    onPress={() => {
      const newOffset = monthOffset - 1;
      setMonthOffset(newOffset);
      loadMonthProjects(empId, newOffset);
    }}
  >
    <Text style={styles.navButtonText}>← Previous</Text>
  </TouchableOpacity>

  <View style={styles.monthContainer}>
    <Text style={styles.monthText}>
       {activeFilters.range === "week" ? formatWeekLabel(range.start, range.end) : formatMonthLabel(range.start)}
    </Text>
  </View>

  <TouchableOpacity
    style={styles.navButton}
    onPress={() => {
      const newOffset = monthOffset + 1;
      setMonthOffset(newOffset);
      loadMonthProjects(empId, newOffset);
    }}
  >
    <Text style={styles.navButtonText}>Next →</Text>
  </TouchableOpacity>
</View>

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

            <Animated.View style={{ opacity: fadeAnim }}>
              {projects.length === 0 ? (
                <EmptyState
                  title="No OPE Projects"
                  subtitle="Try changing filters or pull to refresh"
                />
              ) : (
                projects.map((project) => (
                  <OPECard
                    key={project.id}
                    project={project}
                    onAction={handleActivityAction}
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

      {/* OPE Modal */}
      <OPEModal
        visible={showOPEModal}
        onClose={() => {
          setShowOPEModal(false);
          setSelectedProject(null);
        }}
        project={selectedProject}
        onSubmit={handleOPESubmit}
      />

      <SuccessModal visible={showSuccessModal} onClose={() => setShowSuccessModal(false)}/>

      <ErrorModal
        visible={showErrorModal}
        message={errorMessage}
        onClose={() => {
          setShowErrorModal(false);
          setErrorMessage("");
        }}
      />
    </SafeAreaView>
  );
};

export default OPEScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContainer: { padding: 16, paddingBottom: 40 },
  loadingMore: { textAlign: "center", marginVertical: 16, color: "#666" },
   monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  navButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
    minWidth: 90,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  monthContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
  },
});
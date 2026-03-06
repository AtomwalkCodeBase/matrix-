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
import * as ImagePicker from "expo-image-picker";

import Loader from "../components/old_components/Loader";
import HeaderComponent from "../components/HeaderComponent";
import PeriodDisplay from "../components/APMTimeSheet/PeriodDisplay";
import CustomDateRangeCard from "../components/APMTimeSheet/CustomDateRangeCard";
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
} from "../components/APMTimeSheet/utils";

import { getAllocationList, postAllocationData } from "../services/productServices";
import { useNavigation } from "expo-router";
import { colors } from "../Styles/appStyle";
import { OPECard } from "../components/APMTimeSheet/OPECard";

const PROJECTS_PER_PAGE = 10;

const DEFAULT_FILTERS = {
  status: null,
  period: "today",
};

const OPEScreen = () => {
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
  const [showOPEModal, setShowOPEModal] = useState(false);

  const [selectedProject, setSelectedProject] = useState(null);

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
    try {
      const res = await getAllocationList(employeeId, null, start, end);
      const raw = Array.isArray(res?.data) ? res.data : [];
      
      // Filter OPE Actual projects
      const opeActualProjects = raw.filter(project => {
        return project.is_ope_actual === true || 
               project.original_P?.is_ope_actual === true || 
               project.original_A?.is_ope_actual === true;
      });
      
      console.log(`Total projects: ${raw.length}, OPE Actual: ${opeActualProjects.length}`);
      
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
      filtered = filtered.filter((p) => {
        return p.project_period_status === filters.status || p.status === filters.status;
      });
    }

    if (filters.period && filters.period !== "custom") {
      const range = getDateRangeFromPeriod(filters.period);
      const startDate = parseDateString(range.startDate);
      const endDate = parseDateString(range.endDate);

      filtered = filtered.filter(project => {
        const projectDate = parseDateString(project.planned_start_date);
        return projectDate >= startDate && projectDate <= endDate;
      });
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
      
      const monthRange = getDateRangeFromPeriod("this_month");
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

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant gallery permissions to upload files.');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        return {
          uri: asset.uri,
          type: 'image/jpeg',
          name: `ope_claim_${Date.now()}.jpg`,
        };
      }
      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      return null;
    }
  };

  // Submit OPE Claim
  const handleOPESubmit = async ({ opeAmount, remarks, file }) => {
    if (!selectedProject) return false;

    setIsLoading(true);
    try {
      const loc = await getCurrentLocation();
      if (!loc) {
        setIsLoading(false);
        return false;
      }

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
      formData.append("latitude_id", String(loc.latitude));
      formData.append("longitude_id", String(loc.longitude));

      // Add file if selected
      if (file) {
        formData.append("claim_file", {
          uri: file.uri,
          type: file.type || 'image/jpeg',
          name: file.name || `claim_${Date.now()}.jpg`,
        });
      }

      // Log form data for debugging
      for (let pair of formData._parts) {
        console.log(pair[0], pair[1]);
      }

      const res = await postAllocationData(formData);

      if (res?.status === 200) {
        Alert.alert("Success", "OPE claim submitted successfully");
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

  const applyFilters = () => {
    setActiveFilters(pendingFilters);

    if (pendingFilters.period !== "custom") {
      const monthRange = getDateRangeFromPeriod("this_month");
      fetchProjects(empId, monthRange.startDate, monthRange.endDate);
    }
    setShowFilterModal(false);
  };

  const clearFilters = async () => {
    setPendingFilters({ ...DEFAULT_FILTERS });
    setActiveFilters({ ...DEFAULT_FILTERS });

    const monthRange = getDateRangeFromPeriod("this_month");
    await fetchProjects(empId, monthRange.startDate, monthRange.endDate);
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
        headerTitle="OPE Actuals"
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
                  : periodOptions.find((o) => o.value === activeFilters.period)?.label || "Today"
              }
            />

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
        pickImage={pickImage}
      />

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
});
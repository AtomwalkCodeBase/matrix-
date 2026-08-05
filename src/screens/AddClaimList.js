import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  TouchableOpacity,
  Text,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Loader from "../components/old_components/Loader";
import HeaderComponent from "../components/HeaderComponent";
import EmptyState from "../components/APMTimeSheet/EmptyState";
import FilterModal from "../components/FilterModal";
import ErrorModal from "../components/ErrorModal";

import {
  getMonthRange,
  formatToDDMMYYYY,
  formatMonthLabel,
  formatWeekLabel,
  normalizeProjects,
} from "../components/APMTimeSheet/utils";

import { getAllocationList } from "../services/productServices";
import { colors } from "../Styles/appStyle";

const PROJECTS_PER_PAGE = 10;

const DEFAULT_FILTERS = {
  status: "All",
  range: "month",
};

// Order item status codes, in workflow order. Once an order item reaches
// "Ready for Billing" (B) or beyond, no new claim can be raised against it.
// Adjust this list if the actual workflow / eligible codes differ.
const CLAIMABLE_STATUSES = ["P", "A", "B"];

const STATUS_META = {
  P: { label: "Planned", color: "#2196F3", bg: "#E3F2FD" },
  A: { label: "Actual Added", color: "#9C27B0", bg: "#F3E5F5" },
  B: { label: "Submitted to AM", color: "#FF9800", bg: "#FFF3E0" },
  S: { label: "Ready for Billing", color: "#FF9800", bg: "#FFF3E0" },
  F: { label: "F&A Approved", color: "#4CAF50", bg: "#E8F5E9" },
  H: { label: "Rejected", color: "#F44336", bg: "#FFEBEE" },
  X: { label: "Cancelled", color: "#9E9E9E", bg: "#F5F5F5" },
};

const getStatusMeta = (status) =>
  STATUS_META[status] || { label: status || "Unknown", color: "#666", bg: "#f0f0f0" };

const isClaimable = (project) =>
  CLAIMABLE_STATUSES.includes(project?.order_item_status);

// Multiple allocations can point at the same order item (e.g. split across
// activities). For claim purposes we only care about the order item itself,
// so collapse duplicates into a single card. If any allocation is still
// claimable, that one becomes the representative so the group stays
// selectable; otherwise we just show the first allocation's details.
const groupByOrderItem = (list) => {
  const map = new Map();

  list.forEach((project) => {
    const key = project.order_item_id || project.id;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        ...project,
        allocationCount: 1,
        activityNames: project.activity_name ? [project.activity_name] : [],
      });
      return;
    }

    const activityNames = existing.activityNames.includes(project.activity_name)
      ? existing.activityNames
      : project.activity_name
        ? [...existing.activityNames, project.activity_name]
        : existing.activityNames;

    const shouldPromote = !isClaimable(existing) && isClaimable(project);

    map.set(key, {
      ...(shouldPromote ? project : existing),
      allocationCount: existing.allocationCount + 1,
      activityNames,
    });
  });

  return Array.from(map.values());
};

/**
 * AddClaimList
 * -------------
 * "Select an Order Item" screen — first step of the Add Claim flow:
 * ClaimScreen -> AddClaimList -> ClaimApply
 *
 * Incoming props.data (forwarded from ClaimScreen.handlePress):
 *   - mode: 'ADD' | 'APPLY'
 *   - masterClaimId: optional, present when adding another item to an existing draft claim
 */
const AddClaimList = (props) => {
  const { mode, masterClaimId } = props?.data || {};

  const [empId, setEmpId] = useState(null);
  const [allProjects, setAllProjects] = useState([]);
  const [projects, setProjects] = useState([]);
  const [monthOffset, setMonthOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [activeFilters, setActiveFilters] = useState({ ...DEFAULT_FILTERS });
  const [pendingFilters, setPendingFilters] = useState({ ...DEFAULT_FILTERS });

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fadeAnim = useState(new Animated.Value(0))[0];
  const navigate = useNavigation();
  const router = useRouter();

  const statusOptions = useMemo(
    () => [
      { label: "All", value: "All" },
      { label: "Planned", value: "P" },
      { label: "OPE Pending / Added", value: "A" },
      { label: "Ready for Billing", value: "B" },
      { label: "Submitted to BO", value: "S" },
      { label: "F&A Approved", value: "F" },
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

  const loadMonthProjects = async (employeeId, offset = 0, rangeMode) => {
    const range = getMonthRange({ mode: rangeMode, offset });
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
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [projects]);

  // Apply filters
  useEffect(() => {
    applyFiltersAndPagination(allProjects, activeFilters);
  }, [allProjects, activeFilters.status]);

  // Fetch order items
  const fetchProjects = async (employeeId, start, end) => {
    setIsLoading(true);
    const formattedStart = formatToDDMMYYYY(start);
    const formattedEnd = formatToDDMMYYYY(end);

    try {
      const res = await getAllocationList(employeeId, null, formattedStart, formattedEnd);
      const raw = Array.isArray(res?.data) ? res.data : [];
      const normalized = normalizeProjects(raw);
      const grouped = groupByOrderItem(normalized);
      setAllProjects(grouped);
    } catch (err) {
      console.error(err);
      setAllProjects([]);
      setErrorMessage("Failed to load order items. Please try again.");
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndPagination = useCallback((list, filters, page = 1) => {
    let filtered = [...list];

    if (filters.status && filters.status !== "All") {
      filtered = filtered.filter((p) => p.order_item_status === filters.status);
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

  // Selecting an order item -> hand off to ClaimApply, carrying forward the
  // ADD/masterClaimId context so the rest of the claim flow is unchanged.
  const handleSelectOrderItem = (project) => {
    if (!isClaimable(project)) return;

    router.push({
      pathname: "ClaimApply",
      params: {
        mode: mode || "APPLY",
        ...(masterClaimId ? { masterClaimId } : {}),
        orderItemData: JSON.stringify(project),
      },
    });
  };

  // Filter controls
  const openFilterModal = () => {
    setPendingFilters({ ...activeFilters });
    setShowFilterModal(true);
  };

  const applyFilters = async () => {
    const prevRange = activeFilters.range;
    const newRange = pendingFilters.range;
    setActiveFilters(pendingFilters);
    if (newRange !== prevRange) {
      setMonthOffset(0);
      const range = getMonthRange({ mode: newRange, offset: 0 });
      await fetchProjects(empId, range.start, range.end);
    }
    setShowFilterModal(false);
  };

  const clearFilters = async () => {
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
        headerTitle="Select Order Item"
        onBackPress={() => navigate.goBack()}
        icon1Name="filter"
        icon1OnPress={openFilterModal}
        filterCount={
          (activeFilters.status !== "All" ? 1 : 0) +
          (activeFilters.range !== "month" ? 1 : 0)
        }
      />

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onClearFilters={clearFilters}
        onApplyFilters={applyFilters}
        filterConfigs={filterConfigs}
        modalTitle="Filter Order Items"
      />

      <View style={styles.monthNavigation}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => {
            const newOffset = monthOffset - 1;
            setMonthOffset(newOffset);
            loadMonthProjects(empId, newOffset, activeFilters.range);
          }}
        >
          <Text style={styles.navButtonText}>← Previous</Text>
        </TouchableOpacity>

        <View style={styles.monthContainer}>
          <Text style={styles.monthText}>
            {activeFilters.range === "week"
              ? formatWeekLabel(range.start, range.end)
              : formatMonthLabel(range.start)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => {
            const newOffset = monthOffset + 1;
            setMonthOffset(newOffset);
            loadMonthProjects(empId, newOffset, activeFilters.range);
          }}
        >
          <Text style={styles.navButtonText}>Next →</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.helperText}>
        Tap an order item to raise a claim against it. Items that are Ready for
        Billing or beyond can no longer accept new claims.
      </Text>

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
                  title="No Order Items"
                  subtitle="Try changing filters/months or pull to refresh"
                />
              ) : (
                projects.map((project) => (
                  <OrderItemCard
                    key={project.id}
                    project={project}
                    onSelect={() => handleSelectOrderItem(project)}
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
    </SafeAreaView>
  );
};

// New, claim-specific card design (replaces the OPE card that used to be
// reused here). Shows the order item key as the primary identifier, and
// visually locks out order items that are no longer claimable.
const OrderItemCard = ({ project, onSelect }) => {
  const claimable = isClaimable(project);
  const statusMeta = getStatusMeta(project.order_item_status);
  const productName =
    project.original_A?.product_name || project.original_P?.product_name || "";

  return (
    <TouchableOpacity
      activeOpacity={claimable ? 0.7 : 1}
      onPress={onSelect}
      disabled={!claimable}
      style={[styles.card, !claimable && styles.cardDisabled]}
    >
      <View style={styles.cardHeaderRow}>
        <Text style={[styles.orderItemKey, !claimable && styles.textMuted]} numberOfLines={1}>
          {project.order_item_key || project.order_item_id}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
          <Text style={[styles.statusPillText, { color: statusMeta.color }]}>
            {statusMeta.label}
          </Text>
        </View>
      </View>

      {!!project.customer_name && (
        <Text style={[styles.customerName, !claimable && styles.textMuted]} numberOfLines={1}>
          {project.customer_name}
        </Text>
      )}

      <View style={styles.metaRow}>
        {project.activityNames && project.activityNames.length > 0 && (
          <Text style={styles.metaText} numberOfLines={1}>
            {project.activityNames.join(", ")}
          </Text>
        )}
        {!!productName && (
          <>
            {project.activityNames?.length > 0 && <Text style={styles.metaDot}>•</Text>}
            <Text style={styles.metaText} numberOfLines={1}>{productName}</Text>
          </>
        )}
      </View>

      {project.allocationCount > 1 && (
        <View style={styles.allocationBadge}>
          <Text style={styles.allocationBadgeText}>
            {project.allocationCount} allocations
          </Text>
        </View>
      )}

      {(project.planned_start_date || project.planned_end_date) && (
        <Text style={styles.periodText}>
          {project.planned_start_date} — {project.planned_end_date}
        </Text>
      )}

      <View style={styles.cardFooter}>
        {claimable ? (
          <>
            <Text style={styles.selectText}>Select for claim</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </>
        ) : (
          <>
            <Ionicons name="lock-closed" size={14} color="#9E9E9E" />
            <Text style={styles.lockedText}>Not available for new claims</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default AddClaimList;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContainer: { padding: 16, paddingBottom: 40 },
  loadingMore: { textAlign: "center", marginVertical: 16, color: "#666" },
  helperText: {
    fontSize: 12,
    color: "#666",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
  },
  monthNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  navButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dee2e6",
    minWidth: 90,
    alignItems: "center",
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
  },
  monthContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#212529",
    textAlign: "center",
  },

  // Card
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eef0f2",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardDisabled: {
    backgroundColor: "#fafafa",
    opacity: 0.75,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  orderItemKey: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    flex: 1,
    marginRight: 8,
  },
  textMuted: {
    color: "#9E9E9E",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  customerName: {
    fontSize: 13,
    color: "#555",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#777",
  },
  metaDot: {
    fontSize: 12,
    color: "#ccc",
    marginHorizontal: 6,
  },
  periodText: {
    fontSize: 12,
    color: "#999",
    marginBottom: 10,
  },
  allocationBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EDE7F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
  },
  allocationBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#673AB7",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 10,
    gap: 4,
  },
  selectText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
    marginRight: 2,
  },
  lockedText: {
    fontSize: 12,
    color: "#9E9E9E",
    fontStyle: "italic",
  },
});
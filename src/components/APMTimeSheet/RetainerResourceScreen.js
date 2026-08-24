import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View, Text, Modal, StyleSheet, ScrollView,
    TouchableOpacity, TextInput, FlatList, ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import AmountInput from '../AmountInput';
import { colors } from '../../Styles/appStyle';
import { buildEmployeePayload, DateForApiFormate, findCurrentDateEntry, getCurrentDateTimeDefaults, mergeResourceData } from './utils';
import { getEmplyoeeList, getResourceAllocationList, processContractEmpAllocation } from '../../services/productServices';
import HeaderComponent from '../HeaderComponent';
import { useNavigation, useRouter } from 'expo-router';
import RemarksInput from '../RemarkInput';
import ErrorModal from '../ErrorModal';
import SuccessModal from '../SuccessModal';
import ConfirmationModal from '../ConfirmationModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import CompanyDropdown from '../ComanyDropDown';

export const EMP_TYPE_LABEL = { T: 'TL', E: 'EX', 2: 'TL', 1: 'EX' }; // handle both shapes
const EMP_TYPE_OPTIONS = ['TL', 'EX'];

const RetainerResourceScreen = ({ data }) => {
    const navigate = useNavigation();
    const router = useRouter();
    const { editingTask, resourceCount, returnTo, resource_list: incomingResourceList } = data;
    const [resources, setResources] = useState([]);
    const [isManualEntry, setIsManualEntry] = useState(false);
    const [manualResources, setManualResources] = useState([]);
    const [pendingResourceList, setPendingResourceList] = useState(null);
    const [isWarning, setIsWaring] = useState(false)

    const todayApiDate = DateForApiFormate(new Date()); // "DD-MM-YYYY", matches allAEntries' raw format

    const effectiveApiDate = useMemo(() => {
        const plannedEnd = editingTask?.planned_end_date;
        if (plannedEnd) {
            const plannedEndComp = DateForApiFormate(plannedEnd, true);
            const todayComp = DateForApiFormate(new Date(), true);
            if (todayComp > plannedEndComp) {
                return DateForApiFormate(plannedEnd, false);
            }
        }
        return todayApiDate;
    }, [editingTask?.planned_end_date, todayApiDate]);

    const currentEntry = useMemo(() => findCurrentDateEntry(editingTask?.allAEntries, effectiveApiDate),
        [editingTask?.allAEntries, effectiveApiDate]
    );

    const [mode, setMode] = useState(currentEntry ? "UPDATE" : "ADD"); // initial guess, corrected in loadData
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [successVisible, setSuccessVisible] = useState(false);
    const [errorVisible, setErrorVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const [allResources, setAllResources] = useState([]);
    const [pickerIndex, setPickerIndex] = useState(null); // which row is picking
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [plannedRes, actualRes, empRes] = await Promise.all([
                getResourceAllocationList({
                    emp_id: editingTask.emp_id,
                    allocation_id: editingTask.p_id,
                    start_date: effectiveApiDate,
                    end_date: effectiveApiDate,
                }),

                currentEntry
                    ? getResourceAllocationList({
                        emp_id: editingTask.emp_id,
                        allocation_id: currentEntry.id,
                        start_date: effectiveApiDate,
                        end_date: effectiveApiDate,
                    })
                    : Promise.resolve({ data: [] }),

                getEmplyoeeList({ rm_emp_id: editingTask?.emp_id, emp_type: "C" }),
            ]);
            const filteredAllocations = effectiveApiDate === todayApiDate
                ? plannedRes?.data?.filter(item => isTodayWithinRange(item.s_date, item.e_date))
                : plannedRes?.data ?? [];

            const plannedResources = filteredAllocations?.filter(r => r.is_active) ?? [];
            // const actualResources = actualRes.data?.filter(r => r.is_active && r.is_present) ?? [];
            const actualResources = actualRes.data?.filter(r => r.is_active) ?? [];

            if (plannedResources.length === 0) {
                setIsManualEntry(true);

                const resourceList = Array.isArray(incomingResourceList) ? incomingResourceList[0] : incomingResourceList;
                const rawList = resourceList
                    ? resourceList.split("|").filter(Boolean)
                    : (editingTask?.original_A?.resource_list || editingTask?.original_P?.resource_list || []);

                const count = Number(resourceCount) || 0;

                let parsed = Array.isArray(rawList)
                    ? rawList.map(entry => {
                        const [name, items, resourceType, empId] = entry.split("^");
                        return { name: name || "", items: items || "", resourceType: resourceType || "", empId: empId || "" };
                    })
                    : [];

                // Resize to match the current resourceCount, preserving already-filled entries
                if (count > parsed.length) {
                    parsed = [...parsed, ...Array.from({ length: count - parsed.length }, () => ({ name: "", items: "", resourceType: "", empId: "" }))];
                } else if (count > 0 && count < parsed.length) {
                    parsed = parsed.slice(0, count);
                }

                setManualResources(parsed);
            } else {
                setIsManualEntry(false);
                const resolvedMode = actualResources.length > 0 ? "UPDATE" : "ADD";
                setMode(resolvedMode);

                let resourceListArray;
                let hasIncomingList = false;
                if (incomingResourceList) {
                    resourceListArray = Array.isArray(incomingResourceList) ? incomingResourceList : [incomingResourceList];
                    hasIncomingList = true;
                } else {
                    const rawResourceList = editingTask?.original_A?.resource_list || editingTask?.original_P?.resource_list || [];
                    resourceListArray = Array.isArray(rawResourceList) ? rawResourceList : [];
                }
                const mergedResources = mergeResourceData(plannedResources, actualResources, resourceListArray, hasIncomingList);

                setResources(mergedResources);

                const verifiedEmployees = empRes?.data?.filter(e => e.is_verified) || [];
                const plannedIds = new Set(plannedResources.map(p => p.emp_id));
                setAllResources(verifiedEmployees.filter(e => !plannedIds.has(e.emp_id)));
            }
        } catch (err) {
            console.error('RetainerResourceScreen loadData:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateResource = (index, changes) => {
        setResources(prev => prev.map((r, i) => i === index ? { ...r, ...changes, isUpdate: true, } : r));
    };

    const handleReplacement = useCallback((index, employee) => {
        updateResource(index, {
            actual_emp_id: employee.emp_id,
            actual_name: employee.display_name,
            emp_type: employee.emp_type_label,
            contract_rate: employee.contract_rate ?? "",
            isReplacement: true,
        });
    }, []);

    const updateManualResource = (index, field, value) => {
        setManualResources(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleAddExtraResource = () => {
        setResources(prev => ([
            ...prev,
            {
                actual_emp_id: "",
                actual_name: "",
                employee_name: "",
                planned_emp_id: "",
                emp_type: "",
                items: "",
                remarks: "",
                is_present: true,
                isReplacement: false,
                isManuallyAdded: true,
            },
        ]));
    };

    const handleRemoveManualRow = (index) => {
        setResources(prev => prev.filter((_, i) => i !== index));
    };

    const joinResourceList = (list, mapFn) => list.map(mapFn)
        .filter(([name, items, type]) => name?.trim() && items?.toString().trim() && type)
        .map(([name, items, type, empId]) => `${name}^${items}^${type}^${empId ?? ""}`)
        .join("|");

    const getJoinedManualResources = () => joinResourceList(manualResources, v => [v.name, v.items, v.resourceType, v.empId]);

    const getJoinedAssignedResources = () => joinResourceList(resources.filter(r => r.is_present === true), r => [r.actual_name, r.items, r.emp_type, r.actual_emp_id]);

    const handleRevert = useCallback((index) => {
        const row = resources[index];

        updateResource(index, {
            actual_emp_id: row.planned_emp_id,
            actual_name: row.employee_name,
            emp_type: EMP_TYPE_LABEL[row.emp_type] ?? row.emp_type,
            isReplacement: false,
        });
    }, [resources]);

    const selectedEmpIds = new Set(resources.map(r => r.actual_emp_id));

    const buildPayload = () => {
        const formData = new FormData();

        formData.append("emp_id", editingTask.emp_id);
        formData.append("p_id", mode === "UPDATE" ? currentEntry.id : editingTask.a_id);
        formData.append("call_mode", mode);

        const isPresent = (r) => r.is_present === true || r.is_present === 1 || r.is_present === "1" || r.is_present === "Y" || r.is_present === "true";

        const cEmpList = resources.filter(r => {
            if (!r.id && !isPresent(r)) return false;
            return true;
        }).map(resource => buildEmployeePayload(resource, effectiveApiDate, mode));

        formData.append("c_emp_list", JSON.stringify(cEmpList));

        return formData;
    };

    const handleSave = async () => {
        setConfirmVisible(false);

        if (isManualEntry) {
            const hasIncompleteResource = manualResources.some(resource => (
                !resource.name?.trim() ||
                !resource.items?.toString().trim() ||
                !resource.resourceType
            ));

            if (hasIncompleteResource) {
                setErrorMessage("Please fill in the resource name, number of items, and resource type for each resource.");
                setIsWaring(true);
                setErrorVisible(true);
                return;
            }

            const resourceList = getJoinedManualResources();
            router.dismissTo({
                pathname: returnTo,
                params: resourceList ? { resource_list: resourceList } : {},
            });
            return;
        }

        const missingSelection = resources.some(
            r => r.is_present === true && !r.actual_emp_id?.toString().trim()
        );

        if (missingSelection) {
            setErrorMessage("Please select an employee for every resource before saving.");
            setIsWaring(true)
            setErrorVisible(true);
            return;
        }

        const missingItems = resources.some(r => {
            if (!r.is_present) return false;

            const items = Number(r.items);
            const quantity = Number(r.a_quantity);

            return !items || items <= 0 || !quantity || quantity <= 0;
        });

        if (missingItems) {
            setErrorMessage("Please enter the number of items audited for every present resource before saving.");
            setIsWaring(true);
            setErrorVisible(true);
            return;
        }

        const expectedCount = Number(resourceCount) || 0;
        const presentCount = resources.filter(r => r.is_present === true).length;

        if (expectedCount > 0 && presentCount !== expectedCount) {
            setErrorMessage(
                `Resource count mismatch: You entered ${expectedCount} resources, but only ${presentCount} are marked as present.\n\n Please mark the correct resources as present or update the resource count.`
            );
            setIsWaring(true)
            setErrorVisible(true);
            return;
        }

        try {
            const payload = buildPayload();

            for (let [key, value] of payload.entries()) {
                console.log(key, value);
            }
            const res = await processContractEmpAllocation(payload);
            // const res = { status: 200 }
            if (res?.status === 200) {
                const resourceList = getJoinedAssignedResources();
                setSuccessVisible(true);
                setPendingResourceList(resourceList);
                await loadData();
                return;
            }

            setErrorMessage(res?.data?.message || res?.data?.error?.message || "Save failed.");
            setErrorVisible(true);
        } catch (err) {

            setErrorMessage(err?.response?.data?.message || err?.message || "Something went wrong. Please try again.");
            setErrorVisible(true);
        }
    };

    return (
        <SafeAreaView
            style={styles.container}
            edges={["left", "right", "bottom"]}
        >
            <HeaderComponent
                headerTitle="Resource Details"
                onBackPress={() => router.back()}
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >

                {/* Title */}
                <Text style={styles.title}>{editingTask.employee_name}</Text>
                <Text style={styles.subtitle}>Daily Audit Entry</Text>

                <View style={styles.divider} />

                {isManualEntry ? (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {manualResources.map((item, index) => (
                            <View key={index} style={styles.resourceInputGroup}>
                                <Text style={styles.resourceInputLabel}>Resource {index + 1}</Text>
                                <TextInput
                                    style={styles.resourceInput}
                                    value={item.name}
                                    onChangeText={(v) => updateManualResource(index, "name", v)}
                                    placeholder="Enter name"
                                />
                                <AmountInput
                                    label={editingTask?.original_P?.product_unit ? `${editingTask.original_P.product_unit} Audited *` : "Number of Items Audited *"}
                                    placeholder="Enter item number*"
                                    claimAmount={item.items}
                                    setClaimAmount={(value) => updateManualResource(index, "items", value)}
                                />
                                <CompanyDropdown
                                    label="Resource Type*"
                                    data={[{ label: "Team Lead", value: "TL" }, { label: "Executive", value: "EX" }]}
                                    value={item.resourceType}
                                    setValue={(value) => updateManualResource(index, "resourceType", value?.value)}
                                />
                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    <>
                        {/* Content */}
                        <View style={styles.content}>
                            {loading ? (
                                <View style={styles.loader}>
                                    <ActivityIndicator color={colors.primary} />
                                    <Text style={styles.loadingText}>
                                        Loading resources…
                                    </Text>
                                </View>
                            ) : resources.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.empty}>
                                        No active resources planned for today.
                                    </Text>
                                </View>
                            ) : (
                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={styles.scrollContent}
                                >
                                    {resources.map((item, index) => (
                                        <ResourceRow
                                            key={`row-${item.allocation_id ?? "manual"}-${index}`}
                                            index={index}
                                            resource={resources[index]}
                                            updateResource={updateResource}
                                            onPickerOpen={() => setPickerIndex(index)}
                                            handleRevert={handleRevert}
                                            onRemove={() => handleRemoveManualRow(index)}
                                        />
                                    ))}

                                    <TouchableOpacity style={styles.saveBtn} onPress={handleAddExtraResource}>
                                        <Text style={styles.saveText}>+ Add Extra Resource</Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            )}
                        </View>


                    </>

                )}
                {/* Fixed bottom buttons */}
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => navigate.goBack()}
                    >
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                        onPress={() => {
                            if (isManualEntry) {
                                handleSave(); // goes straight to navigate.navigate(...) branch, no confirm modal needed for manual entry
                            } else {
                                setConfirmVisible(true);
                            }
                        }}
                        disabled={loading}
                    >
                        <Text style={styles.saveText}>Save</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Resource Picker */}
            <ResourcePicker
                visible={pickerIndex !== null}
                onClose={() => setPickerIndex(null)}
                onSelect={(selected) => handleReplacement(pickerIndex, selected)}
                allResources={allResources}
                plannedIds={selectedEmpIds}
            />

            <ConfirmationModal
                visible={confirmVisible}
                headerTitle="Confirm Save"
                message={
                    mode === "UPDATE"
                        ? "Update resource entries for today?"
                        : "Add resource entries for today?"
                }
                confirmText="Save"
                cancelText="Cancel"
                onConfirm={handleSave}
                onCancel={() => setConfirmVisible(false)}
            />

            <SuccessModal
                visible={successVisible}
                message="Resources saved successfully."
                onClose={() => {
                    setSuccessVisible(false);
                    const resourceList = pendingResourceList || getJoinedAssignedResources();
                    router.dismissTo({
                        pathname: returnTo,
                        params: resourceList ? { resource_list: resourceList } : {},
                    });
                }}
            />

            <ErrorModal
                visible={errorVisible}
                label={isWarning ? "Waring" : "Error"}
                isWarning={isWarning}
                message={errorMessage}
                onClose={() => setErrorVisible(false)}
            />
        </SafeAreaView>
    );
};

export default RetainerResourceScreen;

//Resource Row Card
const ResourceRow = ({ index, editState, updateResource, onPickerOpen, resource, handleRevert, onRemove }) => {
    const { actual_name, actual_emp_id, employee_name, planned_emp_id, emp_type, items, isReplacement, isManuallyAdded, remarks } = resource;

    const isPresent = resource.is_present === true || resource.is_present === 1 || resource.is_present === "1" || resource.is_present === "Y" || resource.is_present === "true" || resource.is_present === undefined || resource.is_present === null;
    const isAbsent = !isPresent;

    return (
        <View style={[rowStyles.card, isAbsent && rowStyles.absentCard]}>
            <View style={rowStyles.header}>
                <Text style={rowStyles.label}>Resource {index + 1}</Text>
                <View style={rowStyles.headerRight}>
                    {isAbsent && (
                        <View style={rowStyles.absentBadge}>
                            <Text style={rowStyles.absentText}>Absent</Text>
                        </View>
                    )}
                    <Badge type={emp_type} />
                </View>
            </View>

            <TouchableOpacity
                style={[rowStyles.selector, isReplacement && rowStyles.selectorReplaced]}
                onPress={onPickerOpen}
                activeOpacity={0.7}
            >
                <View style={rowStyles.selectorLeft}>
                    <Text style={rowStyles.selectorName}>{actual_name}</Text>
                    <Text style={rowStyles.selectorId}>{actual_emp_id}</Text>
                    {isReplacement && (
                        <Text style={rowStyles.replacedNote}>
                            ↳ Replacing {employee_name} ({planned_emp_id})
                        </Text>
                    )}
                </View>
                <Text style={rowStyles.chevron}>›</Text>
            </TouchableOpacity>

            {/* Show emp type toggle only for replaced resource */}
            {(isReplacement || isManuallyAdded) && (
                <EmpTypeToggle
                    value={resource.emp_type}
                    onChange={(v) => updateResource(index, { emp_type: v, })}
                />
            )}

            {/* Present Checkbox */}
            <TouchableOpacity
                style={rowStyles.checkboxContainer}
                onPress={() => updateResource(index, { is_present: !isPresent })}
                activeOpacity={0.7}
            >
                <View style={[rowStyles.checkbox, isPresent && rowStyles.checkboxChecked]}>
                    {isPresent && <Text style={rowStyles.checkmark}>✓</Text>}
                </View>
                <Text style={rowStyles.checkboxLabel}>Mark as Present</Text>
            </TouchableOpacity>

            <AmountInput
                label="Items Audited *"
                placeholder="Enter count"
                claimAmount={resource.items}
                setClaimAmount={(v) => updateResource(index, { items: v, a_quantity: v, })}
            />

            <RemarksInput
                labelFiled="Remarks"
                remark={resource.remarks}
                setRemark={(v) => updateResource(index, { remarks: v })}
            />




            {isReplacement && (
                <TouchableOpacity onPress={() => handleRevert(index)} style={[styles.saveBtn, { marginTop: 10 }]}>
                    <Text style={styles.saveText}>
                        Revert Employee
                    </Text>
                </TouchableOpacity>
            )}

            {isManuallyAdded && (
                <TouchableOpacity onPress={onRemove} style={[styles.cancelBtn, { marginTop: 10 }]}>
                    <Text style={styles.cancelText}>
                        Remove
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

//Resource Replacement modal
const ResourcePicker = ({ visible, onClose, onSelect, allResources, plannedIds }) => {
    const [query, setQuery] = useState('');

    const filtered = allResources.filter(r => {
        if (plannedIds.has(r.emp_id)) return false;

        const search = query.toLowerCase();

        return (
            r.name.toLowerCase().includes(search) ||
            r.emp_id.toLowerCase().includes(search)
        );
    })

    return (
        <Modal visible={visible} transparent animationType="fade">
            <TouchableOpacity
                style={pickerStyles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity activeOpacity={1} style={pickerStyles.sheet}>
                    <Text style={pickerStyles.title}>Select Replacement</Text>

                    <TextInput
                        style={pickerStyles.search}
                        placeholder="Search by name or ID…"
                        placeholderTextColor={colors.alternative}
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                    />

                    <FlatList
                        data={filtered}
                        keyExtractor={(item, index) => `picker-${item.emp_id}-${index}`}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={pickerStyles.row}
                                onPress={() => {
                                    onSelect(normalizeResource(item, true)); // normalize on select
                                    onClose();
                                }}
                            >
                                <View style={pickerStyles.rowLeft}>
                                    <Text style={pickerStyles.name}>{item.name}</Text>
                                    <Text style={pickerStyles.empId}>{item.emp_id}</Text>
                                </View>
                                <Badge type={item.grade_level} />
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <Text style={pickerStyles.empty}>No resources found</Text>
                        }
                        style={{ maxHeight: 300 }}
                    />
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

// Resource Type(TL/EX) Toggle  
const EmpTypeToggle = ({ value, onChange }) => (
    <View style={toggleStyles.wrap}>
        <Text style={toggleStyles.label}>Resource Type *</Text>
        <View style={toggleStyles.row}>
            {EMP_TYPE_OPTIONS.map(opt => (
                <TouchableOpacity
                    key={opt}
                    style={[toggleStyles.btn, value === opt && toggleStyles.btnActive]}
                    onPress={() => onChange(opt)}
                >
                    <Text style={[toggleStyles.btnText, value === opt && toggleStyles.btnTextActive]}>
                        {opt === 'TL' ? 'Team Lead' : 'Executive'}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    </View>
);

const Badge = ({ type }) => {
    const label = EMP_TYPE_LABEL[type] ?? type;
    const isEX = label === 'EX';
    return (
        <View style={[badgeStyles.wrap, isEX ? badgeStyles.ex : badgeStyles.tl]}>
            <Text style={[badgeStyles.text, isEX ? badgeStyles.exText : badgeStyles.tlText]}>
                {label}
            </Text>
        </View>
    );
};

//Main screen style
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F7F8FC"
    },
    title: {
        fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center',
    },
    subtitle: {
        fontSize: 12, color: colors.textLight, textAlign: 'center', marginTop: 3,
    },
    divider: {
        height: 1, backgroundColor: colors.border, marginVertical: 14,
    },
    content: { flex: 1, minHeight: 0 },

    scrollContent: { paddingHorizontal: 12, paddingBottom: 16 },

    loader: { flex: 1, alignItems: 'center', paddingVertical: 32, gap: 10 },
    loadingText: { color: colors.textLight, fontSize: 13 },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
    },

    empty: {
        textAlign: "center",
        color: colors.alternative,
        fontSize: 14,
    },
    buttonRow: {
        flexDirection: 'row', marginTop: 16, gap: 10, paddingHorizontal: 12
    },
    cancelBtn: {
        flex: 1, borderWidth: 1, borderColor: colors.primary,
        borderRadius: 8, paddingVertical: 12, alignItems: 'center',
    },
    cancelText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
    saveBtn: {
        flex: 1, backgroundColor: colors.primary,
        borderRadius: 8, paddingVertical: 12, alignItems: 'center',
    },
    saveBtnDisabled: { backgroundColor: colors.primaryLight },
    saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    resourceInputGroup: {
        marginBottom: 12,
    },

    resourceInputLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#444",
        marginBottom: 6,
    },

    resourceInput: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        fontSize: 14,
        backgroundColor: "#fafafa",
    },

});

//Resource Row Card Style
const rowStyles = StyleSheet.create({
    card: {
        backgroundColor: '#fff', borderRadius: 10, padding: 14,
        marginBottom: 12, borderWidth: 1, borderColor: colors.border
    },
    absentCard: { borderColor: '#FFD0CC', backgroundColor: '#FFF8F7' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    headerRight: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    label: { fontSize: 13, fontWeight: '700', color: colors.textLight },
    absentBadge: {
        backgroundColor: '#FFE0DD', borderRadius: 4,
        paddingHorizontal: 7, paddingVertical: 2,
    },
    absentText: { fontSize: 11, fontWeight: '700', color: colors.danger },
    selector: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderWidth: 1, borderColor: colors.border, borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.background,
        marginBottom: 10,
    },
    selectorReplaced: { borderColor: colors.secondary, backgroundColor: '#FFFBF2' },
    selectorLeft: { flex: 1 },
    selectorName: { fontSize: 14, fontWeight: '600', color: colors.text },
    selectorId: { fontSize: 11, color: colors.textLight, marginTop: 1 },
    replacedNote: { fontSize: 11, color: colors.secondary, marginTop: 3, fontStyle: 'italic' },
    chevron: { fontSize: 22, color: colors.alternative, marginLeft: 8 },
    revertButton: {
        marginBottom: 10,
        alignSelf: "flex-start"
    },

    revertText: {
        color: colors.primary,
        fontWeight: "600",
        fontSize: 12
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 2,
        borderColor: colors.primary,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    checkboxChecked: {
        backgroundColor: colors.primary,
    },
    checkmark: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    checkboxLabel: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '500',
    }
});

////Resource Replacement modal style
const pickerStyles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
        padding: 20, paddingBottom: 32,
    },
    title: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
    search: {
        borderWidth: 1, borderColor: colors.border, borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 9, fontSize: 14,
        color: colors.text, backgroundColor: colors.background, marginBottom: 10,
    },
    row: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    rowLeft: { flex: 1, marginRight: 8 },
    name: { fontSize: 14, fontWeight: '600', color: colors.text },
    empId: { fontSize: 12, color: colors.textLight, marginTop: 2 },
    empty: { textAlign: 'center', color: colors.alternative, marginTop: 20, fontSize: 13 },
});

const badgeStyles = StyleSheet.create({
    wrap: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' },
    tl: { backgroundColor: '#EAF2FF' },
    ex: { backgroundColor: '#FFF3E0' },
    text: { fontSize: 11, fontWeight: '700' },
    tlText: { color: colors.primary },
    exText: { color: colors.secondary },
});

const toggleStyles = StyleSheet.create({
    wrap: { marginTop: 8 },
    label: { fontSize: 12, color: colors.textLight, marginBottom: 6 },
    row: { flexDirection: 'row', gap: 8 },
    btn: {
        flex: 1, paddingVertical: 8, borderRadius: 6,
        borderWidth: 1, borderColor: colors.border,
        alignItems: 'center', backgroundColor: colors.background,
    },
    btnActive: { borderColor: colors.primary, backgroundColor: '#EAF2FF' },
    btnText: { fontSize: 13, fontWeight: '600', color: colors.alternative },
    btnTextActive: { color: colors.primary },
});

const normalizeResource = (r, isFromEmployeeList = false) => ({
    emp_id: r.emp_id,
    display_name: isFromEmployeeList ? r.name : r.employee_name,
    emp_type_raw: isFromEmployeeList ? r.grade_level : r.emp_type,
    emp_type_label: isFromEmployeeList
        ? (EMP_TYPE_LABEL[r.grade_level] ?? 'EX')
        : (EMP_TYPE_LABEL[r.emp_type] ?? 'EX'),
    _raw: r,
});

const parseAPIDate = (dateStr) => {
    if (!dateStr) return null;
    const [day, monthStr, year] = dateStr.split('-');
    const monthMap = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const month = monthMap[monthStr];
    if (month === undefined) return null;
    const date = new Date(year, month, parseInt(day));
    return isNaN(date.getTime()) ? null : date;
};

const isTodayWithinRange = (sDate, eDate) => {
    const start = parseAPIDate(sDate);
    const end = parseAPIDate(eDate);
    if (!start || !end) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return today >= start && today <= end;
};
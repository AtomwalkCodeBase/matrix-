import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View, Text, Modal, StyleSheet, ScrollView,
    TouchableOpacity, TextInput, FlatList, ActivityIndicator
} from 'react-native';
import AmountInput from '../AmountInput';
import { colors } from '../../Styles/appStyle';
import { buildEmployeePayload, DateForApiFormate, findCurrentDateEntry, formatToDDMMYYYY, getCurrentDateTimeDefaults, mergeResourceData } from './utils';
import { getEmplyoeeList, getResourceAllocationList, processContractEmpAllocation } from '../../services/productServices';
import HeaderComponent from '../HeaderComponent';
import { useNavigation } from 'expo-router';
import RemarksInput from '../RemarkInput';
import ErrorModal from '../ErrorModal';
import SuccessModal from '../SuccessModal';
import ConfirmationModal from '../ConfirmationModal';

export const EMP_TYPE_LABEL = { T: 'TL', E: 'EX', 2: 'TL', 1: 'EX' }; // handle both shapes
const EMP_TYPE_OPTIONS = ['TL', 'EX'];

const RetainerResourceScreen = ({ data }) => {
    const navigate = useNavigation();
    const { editingTask, resourceCount } = data;
    const [resources, setResources] = useState([]);

    const today = formatToDDMMYYYY(new Date());
    const todayApiDate = DateForApiFormate(new Date()); // "DD-MM-YYYY", matches allAEntries' raw format

    const currentEntry = useMemo(() => findCurrentDateEntry(editingTask?.allAEntries, todayApiDate),
        [editingTask?.allAEntries, todayApiDate]
    );

    const [mode, setMode] = useState(currentEntry ? "UPDATE" : "ADD"); // initial guess, corrected in loadData
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [successVisible, setSuccessVisible] = useState(false);
    const [errorVisible, setErrorVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");


    // console.log("currentEntry", currentEntry)

    const [allResources, setAllResources] = useState([]);
    const [pickerIndex, setPickerIndex] = useState(null); // which row is picking
    const [loading, setLoading] = useState(true);
    const { apiDate } = getCurrentDateTimeDefaults();

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
                    start_date: todayApiDate,
                    end_date: todayApiDate,
                }),

                currentEntry
                    ? getResourceAllocationList({
                        emp_id: editingTask.emp_id,
                        allocation_id: currentEntry.id,
                        start_date: todayApiDate,
                        end_date: todayApiDate,
                    })
                    : Promise.resolve({ data: [] }),

                getEmplyoeeList({ rm_emp_id: editingTask?.emp_id, emp_type: "C" }),
            ]);

            const plannedResources = plannedRes.data?.filter(r => r.is_active) ?? [];
            const actualResources = actualRes.data?.filter(r => r.is_active) ?? [];

            // Real mode: only UPDATE if currentEntry.id actually returned data
            const resolvedMode = actualResources.length > 0 ? "UPDATE" : "ADD";
            setMode(resolvedMode);

            const mergedResources = mergeResourceData(plannedResources, actualResources);
            setResources(mergedResources);

            const verifiedEmployees = empRes?.data?.filter(e => e.is_verified) || [];
            const plannedIds = new Set(plannedResources.map(p => p.emp_id));
            setAllResources(verifiedEmployees.filter(e => !plannedIds.has(e.emp_id)));
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
        formData.append("c_emp_list", JSON.stringify(resources.map(resource => buildEmployeePayload(resource, today, mode))));

        return formData;
    };

    const handleSave = async () => {
        setConfirmVisible(false);
        try {
            const payload = buildPayload();
            // for (let [key, value] of payload.entries()) {
            //     console.log(key, value);
            // }
            const res = await processContractEmpAllocation(payload);

            if (res?.status === 200) {
                setSuccessVisible(true);
                return;
            }

            setErrorMessage(res?.data?.message || res?.data?.error?.message || "Save failed.");
            setErrorVisible(true);
        } catch (err) {
            // console.log("Save error:", err?.message);
            // console.log("Is network error (no response):", !err?.response);
            // console.log("Request config baseURL/url:", err?.config?.baseURL, err?.config?.url);
            // console.log("Response data (if any):", err?.response?.data);

            setErrorMessage(err?.response?.data?.message || err?.message || "Something went wrong. Please try again.");
            setErrorVisible(true);
        }
    };

    return (
        <>
            <View style={styles.container}>
                <HeaderComponent
                    headerTitle="Resource Details"
                    onBackPress={() => navigate.goBack()}
                />

                {/* Title */}
                <Text style={styles.title}>{editingTask.employee_name}</Text>
                <Text style={styles.subtitle}>Daily Audit Entry</Text>

                <View style={styles.divider} />

                {loading ? (
                    <View style={styles.loader}>
                        <ActivityIndicator color={colors.primary} />
                        <Text style={styles.loadingText}>Loading resources…</Text>
                    </View>
                ) : resources.length === 0 ? (
                    <Text style={styles.empty}>No active resources planned for today.</Text>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
                        {resources.map((item, index) => (
                            <ResourceRow
                                // planned={item}
                                key={`row-${item.allocation_id}-${index}`}
                                index={index}
                                resource={resources[index]}
                                updateResource={updateResource}
                                onPickerOpen={() => setPickerIndex(index)}
                                handleRevert={handleRevert}

                            />
                        ))}
                    </ScrollView>
                )}

                {/* Buttons */}

            </View>
            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => navigate.goBack()}
                >
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                    onPress={() => setConfirmVisible(true)}
                    disabled={loading}
                >
                    <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
            </View>

            {/* Resource Picker */}
            < ResourcePicker
                visible={pickerIndex !== null}
                onClose={() => setPickerIndex(null)}
                onSelect={(selected) => handleReplacement(pickerIndex, selected)}
                allResources={allResources}
                plannedIds={selectedEmpIds}
            />

            <ConfirmationModal
                visible={confirmVisible}
                headerTitle="Confirm Save"
                message={mode === "UPDATE" ? "Update resource entries for today?" : "Add resource entries for today?"}
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
                    navigate.goBack();
                }}
            />

            <ErrorModal
                visible={errorVisible}
                label="Error"
                message={errorMessage}
                onClose={() => setErrorVisible(false)}
            />

        </>
    );
};

export default RetainerResourceScreen;

//Resource Row Card
const ResourceRow = ({ index, editState, updateResource, onPickerOpen, resource, handleRevert }) => {
    const { actual_name, actual_emp_id, employee_name, planned_emp_id, emp_type, items, isReplacement, is_present } = resource;

    const isAbsent = !is_present;

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
            {isReplacement && (
                <EmpTypeToggle
                    value={resource.emp_type}
                    onChange={(v) => updateResource(index, { emp_type: v, })}
                />
            )}

            <RemarksInput
                labelFiled="Remarks"
                remark={resource.remarks}
                setRemark={(v) => updateResource(index, { remarks: v })}
            />



            {/* <AmountInput
                label="Items Audited"
                placeholder="Enter count"
                claimAmount={resource.items}
                setClaimAmount={(v) => updateResource(index, { items: v, })}
            /> */}

            {isReplacement && (
                <TouchableOpacity onPress={() => handleRevert(index)} style={[styles.saveBtn, { marginTop: 10 }]}>
                    <Text style={styles.saveText}>
                        Revert Employee
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
        <Text style={toggleStyles.label}>Resource Type</Text>
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
    scroll: { flexGrow: 0, paddingHorizontal: 12 },
    loader: { alignItems: 'center', paddingVertical: 32, gap: 10 },
    loadingText: { color: colors.textLight, fontSize: 13 },
    empty: { textAlign: 'center', color: colors.alternative, fontSize: 14, paddingVertical: 32 },
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
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { View, Text, Modal, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import Ionicons from "react-native-vector-icons/Ionicons";

import DatePicker from '../DatePicker';
import AmountInput from '../AmountInput';
import TimePicker from '../TimePicker';
import FilePicker from '../FilePicker';
import RemarksInput from '../RemarkInput';
import { colors } from '../../Styles/appStyle';
import { DateForApiFormate, formatAMPMTime, formatAPITime, formatToApiDate, getCurrentDateTimeDefaults, normalizeToDDMMYYYY, parseApiDate } from './utils';
import { AppContext } from '../../../context/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ErrorModal from '../ErrorModal';
import CompanyDropdown from '../ComanyDropDown';
import ConfirmationModal from '../ConfirmationModal';

const ActivitySubmitCard = ({ visible, onClose, editingTask, isPendingCheckout = false, onSubmitActivity, onCompleteActivity }) => {
    const [resourceModalVisible, setResourceModalVisible] = useState(false);
    const [retainerInputs, setRetainerInputs] = useState([]);
    const [tempRetainerInputs, setTempRetainerInputs] = useState([]);
    const { profile } = useContext(AppContext);
    const insets = useSafeAreaInsets();
    const [showErrorModal, setShowErrorModal] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const isExecutive = profile.grade_level < 100;
    const [confirmPopup, setConfirmPopup] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: null,
    });

    const isRetainer = editingTask?.retainer;

    const contextType = editingTask?.modalContext?.type;
    const isRetainerUpdate = editingTask?.modalContext?.type === "update_retainer";
    const hasExistingResources = retainerInputs.filter(v => v.name?.trim() && v.items?.toString().trim()).length > 0;

    const getToday = () => new Date();

    const getCurrentTime = () => {
        const now = new Date();
        return now.toTimeString().slice(0, 5);
    };


    const parseTimeToDate = (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string') return null;
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time ? time.split(':').map(Number) : [0, 0];
        if (period) {
            if (period.toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
        }
        const date = new Date();
        date.setHours(hours || 0, minutes || 0, 0, 0);
        return isNaN(date.getTime()) ? null : date;
    };



    // planned_end_date is in API format like "29-Nov-2025"
    const MONTH_SHORT_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mon = MONTH_SHORT_NAMES[now.getMonth()];
    const yyyy = now.getFullYear();
    const todayApiPlanned = `${dd}-${mon}-${yyyy}`;

    const plannedEndDate = editingTask?.planned_end_date;
    const isTodayPlannedEnd = DateForApiFormate(plannedEndDate, true) < DateForApiFormate(todayApiPlanned, true);
    const isPlannedEndExceed = DateForApiFormate(plannedEndDate, true) <= DateForApiFormate(todayApiPlanned, true);

    const [formData, setFormData] = useState({
        date: getToday(),
        endTime: isPendingCheckout ? getCurrentTime() : parseTimeToDate(getCurrentTime()),
        noOfItems: "0",
        noOfResource: "0",
        remarks: "",
    });

    const [fileUri, setFileUri] = useState(null);
    const [fileName, setFileName] = useState("");
    const [fileMimeType, setFileMimeType] = useState("");
    const [remarkError, setRemarkError] = useState("");

    // console.log("editingTask", editingTask);

    useEffect(() => {
        if (visible) {
            let dateToUse;

            if (isPendingCheckout && editingTask?.pendingCheckoutDate) {
                // pendingCheckoutDate = "01-Dec-2025"
                dateToUse = parseApiDate(editingTask.pendingCheckoutDate);
            } else {
                dateToUse = new Date(); // today's date
            }

            // Check if resource_list exists and is an array
            const existingResourceList = isRetainer?.fullData?.original_A?.resource_list || [];
            //    const existingResourceList =['ram^20', 'hari^40'];
            const formattedResources = existingResourceList.map(res => {
                const [name, items, resourceType] = res.split("^");
                return {
                    name: name || "",
                    items: items || "",
                    resourceType: resourceType || ""
                };
            });

            setFormData(prev => ({
                ...prev,
                date: dateToUse,
                endTime: isPendingCheckout ? getCurrentTime() : parseTimeToDate(getCurrentTime()),
                noOfItems: isRetainer ? String(isRetainer?.no_of_items) : "0",
                noOfResource: String(formattedResources.length),
                remarks: "",
            }));
            setFileUri(null);
            setFileName("");
            setFileMimeType("");
            setRetainerInputs(formattedResources);
        }
    }, [visible]);

    // --------------------------
    // VALIDATION CHECK
    // --------------------------
    const isValid = useMemo(() => {
        const { date, endTime, remarks } = formData;
        const hasSubmittedFile = !!(editingTask?.original_A?.submitted_file);

        if (!date || !endTime) return false;

        if (isTodayPlannedEnd) {

            // if (!remarks) return false;

            if (editingTask?.original_P?.is_file_applicable && !hasSubmittedFile && !fileUri) {
                return false;
            }
        }

        return true;
    }, [formData, isTodayPlannedEnd, editingTask?.original_P?.is_file_applicable, fileUri, editingTask]);

    // console.log("editingTask", formData);


    const getOpenCheckInDate = () => {
        if (!editingTask?.day_logs) return null;

        const openEntry = Object.values(editingTask.day_logs).find(
            (log) => log?.check_in && !log?.check_out
        );

        return openEntry?.date || null; // e.g. "26-Feb-2026"
    };

    const handleOpenResourceModal = () => {

        const count = Number(formData.noOfResource);

        setRetainerInputs(prev => {

            let updated = [...prev];

            if (count > updated.length) {
                updated = [...updated, ...Array(count - updated.length).fill({ name: "", items: "", resourceType: "" })];
            }
            else if (count < updated.length) {
                updated = updated.slice(0, count);
            }

            setTempRetainerInputs(updated);
            return updated;
        });

        setResourceModalVisible(true);
    };

    const handleRetainerChange = (index, field, value) => {
        setTempRetainerInputs(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const getJoinedResources = () => retainerInputs.filter(v => v.name && v.items && v.resourceType).map(v => `${v.name}^${v.items}^${v.resourceType}`).join("|");

    const formatDateToDDMMYYYY = (date) => {
        if (!date) return null;

        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();

        return `${day}-${month}-${year}`;
    };

    const buildPayload = (basePayload) => {
        const resourceList = getJoinedResources();

        let payload = { ...basePayload };

        // Convert date to API format (DD-MM-YYYY)
        if (payload.date) {
            payload.date = formatDateToDDMMYYYY(payload.date);
        }

        // Convert endTime to API format (HH:MM AM/PM)
        if (payload.endTime instanceof Date) {
            let hours = payload.endTime.getHours();
            const minutes = String(payload.endTime.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            const displayHours = String(hours).padStart(2, '0');
            payload.endTime = `${displayHours}:${minutes} ${ampm}`;
        }

        if (resourceList && tl_count > 0 && ex_count > 0) {
            payload.extraFields = {
            ...(payload.extraFields || {}),
            resource_list: resourceList,
            tl_count: String(tl_count),
            ex_count: String(ex_count)
            };
        }
        if (contextType !== "checkout_yesterday") return payload;

        const selectedDate = formatDateToDDMMYYYY(formData.date);
        const openDate = normalizeToDDMMYYYY(getOpenCheckInDate());
        // console.log("selectedDate", selectedDate)
        // console.log("openDate", formatToApiDate(openDate))

        if (!openDate) return payload;

        if (openDate === selectedDate) {
            return {
                ...payload,
                date: selectedDate
            };
        }

        return {
            ...payload,
            date: openDate,
            extraFields: {
                ...(payload.extraFields || {}),
                end_date: selectedDate
            }
        };
    };

    const validateResources = () => {
        const expected = Number(formData.noOfResource || 0);

        for (let i = 0; i < retainerInputs.length; i++) {
            const item = retainerInputs[i];

            if (!item.name?.trim()) {
                return { isValid: false, message: `Please enter name for Resource ${i + 1}` };
            }

            if (!item.items?.toString().trim()) {
                return {
                    isValid: false,
                    message: `Please enter ${editingTask?.original_P?.product_unit ? `${editingTask?.original_P?.product_unit} Audited` : "Number of Items Audited"} for Resource ${i + 1}`,
                };
            }

            if (!item.resourceType?.toString().trim()) {
                return {
                    isValid: false,
                    message: `Please select Resource Type (TL/EX) for Resource ${i + 1}`,
                };
            }
        }
        const entered = retainerInputs.filter(
            (v) => v.name?.trim() && v.items?.toString().trim() && v.resourceType?.toString().trim()).length;

        if (expected && expected !== entered) {
            return {
                isValid: false,
                message: `Number of resources (${expected}) entered (${entered}).\nPlease check the name(s) or entered ${editingTask?.original_P?.product_unit
                    ? `${editingTask?.original_P?.product_unit} Audited value`
                    : "Number of Items Audited value"
                    }`,
            };
        }

        return { isValid: true };
    };

    const handleSubmit = () => {
        const validation = validateResources();
        if (!validation.isValid) {
            setErrorMessage(validation.message);
            setShowErrorModal(true);
            return;
        }

        if (contextType === "update_retainer") {
            let payload = {
                ...formData,
                mode: "DATA_CORRECT",
            };

            payload = buildPayload(payload);
            // console.log("DATA_CORRECT Payload:", payload);
            onSubmitActivity(payload);
        } else {

            if (!isValid) return;

            const file =
                fileUri
                    ? {
                        uri: fileUri,
                        name: fileName || "upload.jpg",
                        type: fileMimeType || "image/jpeg",
                    }
                    : null;

            let payload = {
                ...formData,
                mode: "UPDATE",
                file,
            };
            payload = buildPayload(payload);

            // console.log("Activity pause activity Payload:", payload)

            onSubmitActivity(payload);
        }

        onClose();
    };

    const handleForceComplete = () => {
        const file =
            fileUri
                ? {
                    uri: fileUri,
                    name: fileName || "upload.jpg",
                    type: fileMimeType || "image/jpeg",
                }
                : null;
        let payload = {
            ...formData,
            file,
            mode: "FORCE_COMPLETE",
        };

        payload = buildPayload(payload);
        
         setConfirmPopup({
            isOpen: true,
            title: "Complete Activity",
            message:  `${!isPlannedEndExceed ? `Are you sure you want to complete this audit item.\n\n This audit is planned till ${project.planned_end_date}.\n\n After this you won't able to perform any activity for this audit item` : "Are you sure you want to complete this activity"}`,
            onConfirm: () => {
            onSubmitActivity(payload);
            onClose();
            setConfirmPopup((p) => ({ ...p, isOpen: false }));
            },
        });
    };

    const handleMarkComplete = () => {
        if (!isValid) return;

        const validation = validateResources();
        if (!validation.isValid) {
            setErrorMessage(validation.message);
            setShowErrorModal(true);
            return;
        }

        const file =
            fileUri
                ? {
                    uri: fileUri,
                    name: fileName || "upload.jpg",
                    type: fileMimeType || "image/jpeg",
                }
                : null;

        let payload = {
            ...formData,
            mode: "UPDATE",
            file,
            is_completed: 1
        };

        payload = buildPayload(payload);
         const modalMsg = isRetainer ? `Are you sure you want to mark today’s activity as complete for this retainer?` : !isPlannedEndExceed ? `Are you sure you want to complete this audit item.\n\n This audit is planned till ${editingTask.planned_end_date}.\n\n After this you won't able to perform any activity for this audit item` : "Are you sure you want to complete this activity"
         setConfirmPopup({
            isOpen: true,
            title: "Complete Activity",
            message: modalMsg,
            onConfirm: () => {
            onCompleteActivity(payload);
            onClose();
            setConfirmPopup((p) => ({ ...p, isOpen: false }));
            },
        });

        //   console.log("Complete Activity for retainer Payload:", payload)
        // onCompleteActivity(payload);
        // onClose();
    };

    const renderHeader = () => {
        if (isRetainer) {
            return (
                <View style={styles.retainerHeader}>
                    <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
                    <Text style={styles.retainerTitle}>Complete Retainer Activity</Text>
                    <Text style={styles.retainerName}>{editingTask.original_P.employee_name}</Text>

                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                    {contextType === "force_complete" ? "Mark Complete" : isPendingCheckout ? "Pending Checkout" : "Activity Checkout"}
                </Text>
                <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <>
            <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

                    <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}>
                        {renderHeader()}
                        {/* <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Activity Checkout</Text>

                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View> */}

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

                            {isPendingCheckout && !isRetainer && (
                                <Text style={styles.warningText}>⚠️ Your yesterday checkout is still pending!</Text>
                            )}

                            <Text style={{ backgroundColor: colors.primary, borderRadius: 10, color: "white", textAlign: "center", padding: 6, fontWeight: 500, fontSize: 14 }}>NO of Items Assigned you to Audit: {editingTask?.original_P?.no_of_items}</Text>

                            <View style={styles.formGroup}>
                                <DatePicker
                                    label="Date *"
                                    cDate={formData.date}
                                    setCDate={(date) => setFormData(prev => ({ ...prev, date }))}
                                    maximumDate={new Date()}
                                    // disable={isExecutive || isRetainerUpdate || contextType === "checkout_yesterday"}
                                    disable={!(contextType === "checkout_yesterday") && (isExecutive || isRetainerUpdate)}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <TimePicker
                                    label="End Time *"
                                    cDate={formData.endTime}
                                    setCDate={(value) =>
                                        setFormData(prev => ({ ...prev, endTime: value }))
                                    }
                                    disable={!(contextType === "checkout_yesterday") && (isExecutive || isRetainerUpdate)}
                                />
                            </View>
                            {contextType !== "force_complete" && <View style={styles.formGroup}>
                                <AmountInput
                                    label={editingTask?.original_P?.product_unit ? `${editingTask?.original_P?.product_unit} Audited *` : "Number of Items Audited *"}
                                    placeholder="Enter item number"
                                    claimAmount={formData.noOfItems}
                                    setClaimAmount={(value) =>
                                        setFormData(prev => ({ ...prev, noOfItems: value }))
                                    }
                                />
                            </View>}
                            {isRetainer && <View style={styles.formGroup}>
                                <AmountInput
                                    label="Number of Resources *"
                                    placeholder="Enter no of resource"
                                    claimAmount={formData.noOfResource}
                                    setClaimAmount={(value) => { setFormData(prev => ({ ...prev, noOfResource: value })); }}
                                // setClaimAmount={handleResourceCountChange}
                                />

                                <TouchableOpacity
                                    style={[
                                        styles.button,
                                        styles.applyButton,
                                        { marginTop: 14 },
                                        (!formData.noOfResource || formData.noOfResource === "0") && styles.disabledButton
                                    ]}
                                    disabled={!formData.noOfResource || formData.noOfResource === "0"}
                                    onPress={handleOpenResourceModal}
                                >
                                    <Text style={[styles.applyButtonText, { textAlign: "center" }]}>
                                        {hasExistingResources ? "Update Resource Names" : "Add Resource Names"}
                                    </Text>
                                </TouchableOpacity>

                            </View>
                            }

                            {hasExistingResources && (
                                <View style={styles.resourceNamesDisplay}>
                                    <Text style={styles.resourceNamesLabel}>Entered Resource Names:</Text>
                                    {retainerInputs.map((item, index) => (
                                        item.name?.trim() && (
                                            <View key={index} style={styles.resourceNameRow}>
                                                <Text style={styles.resourceNameNumber}>{index + 1}.</Text>
                                                <Text style={styles.resourceNameText}>{item.name} ({item.items} items)({item.resourceType})</Text>
                                            </View>
                                        )
                                    ))}
                                </View>
                            )}
                            {editingTask?.original_P?.is_file_applicable && (
                                <FilePicker
                                    label="Attach File"
                                    fileName={fileName}
                                    fileUri={fileUri}
                                    setFileName={setFileName}
                                    setFileUri={setFileUri}
                                    setFileMimeType={setFileMimeType}
                                />
                            )}


                            {editingTask?.original_P?.is_file_applicable && !(editingTask?.original_A?.submitted_file) && (
                                <Text style={{ color: "red", fontSize: 12, marginTop: 5 }}>
                                    File upload is mandatory for this activity.
                                </Text>
                            )}

                            {contextType !== "update_retainer" &&
                                <View style={styles.formGroup}>
                                    <RemarksInput
                                        labelFiled="Remarks"
                                        remark={formData.remarks}
                                        setRemark={(v) =>
                                            setFormData(prev => ({ ...prev, remarks: v }))
                                        }
                                    />
                                </View>}


                            {remarkError ? (
                                <Text style={{ color: "red", marginTop: -5, marginBottom: 10 }}>
                                    {remarkError}
                                </Text>
                            ) : null}

                            {/* BUTTONS */}
                            <View style={styles.buttonRow}>

                                {contextType === "force_complete" ?
                                    <TouchableOpacity
                                        style={[
                                            styles.button,
                                            styles.applyButton,
                                            !isValid && styles.disabledButton
                                        ]}
                                        disabled={!isValid}
                                        onPress={handleForceComplete}
                                    >
                                        <Text style={styles.applyButtonText}>Mark as Complete</Text>
                                    </TouchableOpacity>

                                    : isPendingCheckout ? (
                                        <>
                                            <TouchableOpacity
                                                style={[
                                                    styles.button,
                                                    styles.applyButton,
                                                    !isValid && styles.disabledButton,
                                                    { paddingHorizontal: 10 },
                                                ]}
                                                disabled={!isValid}
                                                onPress={handleSubmit}
                                            >
                                                <Text style={[styles.applyButtonText, { textAlign: "center" }]}>Checkout For Yesterday</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[
                                                    styles.button,
                                                    styles.applyButton,
                                                    !isValid && styles.disabledButton
                                                ]}
                                                disabled={!isValid}
                                                onPress={handleMarkComplete}
                                            >
                                                <Text style={[styles.applyButtonText, { textAlign: "center" }]}>Completed</Text>
                                            </TouchableOpacity>
                                        </>

                                    ) : editingTask?.retainer ?
                                        <>
                                            {contextType !== "update_retainer" && <TouchableOpacity
                                                style={[
                                                    styles.button,
                                                    styles.applyButton,
                                                    !isValid && styles.disabledButton
                                                ]}
                                                disabled={!isValid}
                                                onPress={handleMarkComplete}
                                            >
                                                <Text style={styles.applyButtonText}>Mark as Complete</Text>
                                            </TouchableOpacity>}

                                            {contextType === "update_retainer" && <TouchableOpacity
                                                style={[
                                                    styles.button,
                                                    styles.applyButton,
                                                ]}
                                                // disabled={!isValid}
                                                onPress={handleSubmit}
                                            >
                                                <Text style={styles.applyButtonText}>Update</Text>
                                            </TouchableOpacity>}
                                        </>
                                        : isTodayPlannedEnd ? (
                                            <>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.button,
                                                        styles.clearButton,
                                                        !isValid && styles.disabledButton
                                                    ]}
                                                    disabled={!isValid}
                                                    onPress={() => {
                                                        if (isTodayPlannedEnd && !formData.remarks) {
                                                            setRemarkError("Remarks are mandatory when pausing an activity.");
                                                            return;
                                                        }
                                                        setRemarkError("");
                                                        handleSubmit();
                                                    }}

                                                >
                                                    <Text style={styles.clearButtonText}>Pause Activity</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.button,
                                                        styles.applyButton,
                                                        !isValid && styles.disabledButton
                                                    ]}
                                                    disabled={!isValid}
                                                    onPress={handleMarkComplete}
                                                >
                                                    <Text style={styles.applyButtonText}>Completed</Text>
                                                </TouchableOpacity>
                                            </>
                                        ) : (
                                            <>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.button,
                                                        styles.clearButton,
                                                        !isValid && styles.disabledButton
                                                    ]}
                                                    disabled={!isValid}
                                                    onPress={handleMarkComplete}
                                                >
                                                    <Text style={styles.clearButtonText}>Completed</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.button,
                                                        styles.applyButton,
                                                        !isValid && styles.disabledButton
                                                    ]}
                                                    disabled={!isValid}
                                                    onPress={() => {
                                                        if (isTodayPlannedEnd && !formData.remarks) {
                                                            setRemarkError("Remarks are required.");
                                                            return;
                                                        }
                                                        setRemarkError("");
                                                        handleSubmit();
                                                    }}

                                                >
                                                    <Text style={styles.applyButtonText}>Pause Activity</Text>
                                                </TouchableOpacity>
                                            </>
                                        )}


                            </View>

                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal visible={resourceModalVisible} transparent animationType="slide">
                <View style={styles.resourceModalOverlay}>

                    <View style={styles.resourceModalContainer}>

                        <Text style={styles.resourceModalTitle}>
                            Enter Resource Names
                        </Text>

                        <ScrollView>

                            {tempRetainerInputs.map((item, index) => (
                                <View key={index} style={styles.resourceInputGroup}>

                                    <Text style={styles.resourceInputLabel}>
                                        Resource {index + 1}
                                    </Text>

                                    <TextInput
                                        style={styles.resourceInput}
                                        value={item.name}
                                        onChangeText={(v) => handleRetainerChange(index, "name", v)}
                                        placeholder="Enter name"
                                    />
                                    <AmountInput
                                        label={editingTask?.original_P?.product_unit ? `${editingTask?.original_P?.product_unit} Audited *` : "Number of Items Audited *"}
                                        placeholder="Enter item number"
                                        claimAmount={item.items}
                                        setClaimAmount={(value) => handleRetainerChange(index, "items", value)}
                                    />
                                    <CompanyDropdown
                                        label="Resource Type"
                                        data={[{ label: "Team Lead", value: "TL" }, { label: "Executive", value: "EX" }]}
                                        value={item.resourceType}
                                        setValue={(value) => handleRetainerChange(index, "resourceType", value?.value)}
                                    />

                                </View>
                            ))}

                        </ScrollView>

                        <View style={styles.resourceModalButtonRow}>

                            <TouchableOpacity
                                style={styles.resourceCancelButton}
                                onPress={() => setResourceModalVisible(false)}
                            >
                                <Text style={styles.resourceCancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.resourceSaveButton}
                                onPress={() => {
                                    setRetainerInputs(tempRetainerInputs);
                                    setResourceModalVisible(false);
                                }}
                            >
                                <Text style={styles.resourceSaveText}>Save</Text>
                            </TouchableOpacity>

                        </View>

                    </View>
                </View>
            </Modal>

            <ErrorModal
                visible={showErrorModal}
                message={errorMessage} onClose={() => setShowErrorModal(false)}
            />

        <ConfirmationModal
            visible={confirmPopup.isOpen}
            title={confirmPopup.title}
            message={confirmPopup.message}
            onConfirm={confirmPopup.onConfirm}
            onCancel={() => setConfirmPopup((p) => ({ ...p, isOpen: false }))}
            messageColor={!isPlannedEndExceed ? "red" : ""}
        />
        </>
    );
};

export default ActivitySubmitCard;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "white",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        // paddingBottom: 10,
        paddingTop: 20,
        maxHeight: "90%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    formGroup: {
        marginVertical: 1,
    },
    warningText: {
        color: "red",
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 10,
        backgroundColor: "#ffe6e6",
        padding: 8,
        borderRadius: 6
    },

    // ---------------------------
    // BUTTONS
    // ---------------------------
    buttonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20
    },

    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
        marginHorizontal: 5
    },

    primaryButton: {
        backgroundColor: "#5B21B6" // strong purple
    },

    secondaryButton: {
        backgroundColor: "#B79CED" // light purple shade
    },

    disabledButton: {
        opacity: 0.4
    },

    buttonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
    },
    clearButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
    },
    clearButtonText: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: "600",
    },
    applyButton: {
        flex: 1,
        backgroundColor: colors.primary,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
    },
    applyButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    retainerHeader: {
        alignItems: "center",
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    retainerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: colors.primary,
        marginTop: 8,
    },
    retainerName: {
        fontSize: 14,
        color: "#666",
        marginTop: 4,
    },
    retainerInfo: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        color: "white",
        textAlign: "center",
        padding: 12,
        fontWeight: "600",
        marginBottom: 15,
        fontSize: 14,
    },
    closeBtn: {
        position: "absolute",
        right: 0,
        top: 3
    },
    // RESOURCE MODAL STYLES

    resourceModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        paddingHorizontal: 20,
    },

    resourceModalContainer: {
        backgroundColor: "white",
        borderRadius: 14,
        padding: 20,
        maxHeight: "80%",
    },

    resourceModalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333",
        marginBottom: 15,
        textAlign: "center",
    },

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

    resourceModalButtonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
    },

    resourceCancelButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
        marginRight: 8,
    },

    resourceCancelText: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: "600",
    },

    resourceSaveButton: {
        flex: 1,
        backgroundColor: colors.primary,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
        marginLeft: 8,
    },

    resourceSaveText: {
        color: "white",
        fontSize: 15,
        fontWeight: "700",
    },

    // RESOURCE NAMES DISPLAY STYLES
    resourceNamesDisplay: {
        backgroundColor: "#f5f5f5",
        borderRadius: 8,
        padding: 12,
        marginVertical: 10,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },

    resourceNamesLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
        marginBottom: 8,
    },

    resourceNameRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },

    resourceNameNumber: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.primary,
        marginRight: 8,
        minWidth: 20,
    },

    resourceNameText: {
        fontSize: 13,
        color: "#555",
        flex: 1,
    },
});

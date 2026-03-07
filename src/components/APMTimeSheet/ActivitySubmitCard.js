import React, { useState, useEffect, useMemo, useContext } from 'react';
import { View, Text, Modal, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import Ionicons from "react-native-vector-icons/Ionicons";

import DatePicker from '../DatePicker';
import AmountInput from '../AmountInput';
import TimePicker from '../TimePicker';
import FilePicker from '../FilePicker';
import RemarksInput from '../RemarkInput';
import { colors } from '../../Styles/appStyle';
import { formatAMPMTime, formatAPITime, getCurrentDateTimeDefaults, normalizeToDDMMYYYY, parseApiDate } from './utils';
import { AppContext } from '../../../context/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ErrorModal from '../ErrorModal';

const ActivitySubmitCard = ({ visible, onClose, editingTask, isPendingCheckout = false, onSubmitActivity, onCompleteActivity }) => {
    const [resourceModalVisible, setResourceModalVisible] = useState(false);
    const [retainerInputs, setRetainerInputs] = useState([]);
    const { profile } = useContext(AppContext);
    const insets = useSafeAreaInsets();
    const [showErrorModal, setShowErrorModal] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const isExecutive = profile.grade_level < 100;

    const isRetainer = editingTask?.retainer;

    const contextType = editingTask?.modalContext?.type;
    const isRetainerUpdate = editingTask?.modalContext?.type === "update_retainer";

    // const { todayISO, dayLogKey: todayDayLogKey, apiDate: todayApiDate, currentTime } = getCurrentDateTimeDefaults()

    // console.log("todayISO", todayISO)
    // console.log("todayDayLogKey", todayDayLogKey)
    // console.log("todayApiDate", todayApiDate)
    // console.log("currentTime", currentTime)


    const getToday = () => new Date();


    const getCurrentTime = () => {
        const now = new Date();
        return now.toTimeString().slice(0, 5);
    };

    // console.log("isRetainer", isRetainer)

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
    const isTodayPlannedEnd = plannedEndDate === todayApiPlanned;

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
            const hasResources = Array.isArray(existingResourceList) && existingResourceList.length > 0;

            const formatResourceNames = (resList) => {
                if (!Array.isArray(resList)) return [];
                return resList.map(res => typeof res === 'string' ? res : (res?.name || ""));
            };

            const initialResources = hasResources ? formatResourceNames(existingResourceList) : [];

            setFormData(prev => ({
                ...prev,
                date: dateToUse,
                endTime: isPendingCheckout ? getCurrentTime() : parseTimeToDate(getCurrentTime()),
                noOfItems: isRetainer ? String(isRetainer?.no_of_items) : "0",
                noOfResource: hasResources ? String(initialResources.length) : "0",
            }));
            setFileUri(null);
            setFileName("");
            setFileMimeType("");
            setRetainerInputs(initialResources);
        }
    }, [visible]);

    // --------------------------
    // VALIDATION CHECK
    // --------------------------
    const isValid = useMemo(() => {
        const { date, endTime, remarks } = formData;

        if (!date || !endTime) return false;

        if (isTodayPlannedEnd) {

            if (!remarks) return false;

            if (editingTask?.original_P?.is_file_applicable && !fileUri) {
                return false;
            }
        }

        return true;
    }, [formData, isTodayPlannedEnd, editingTask?.original_P?.is_file_applicable, fileUri]);

    // console.log("editingTask", formData);


    const getOpenCheckInDate = () => {
        if (!editingTask?.day_logs) return null;

        const openEntry = Object.values(editingTask.day_logs).find(
            (log) => log?.check_in && !log?.check_out
        );

        return openEntry?.date || null; // e.g. "26-Feb-2026"
    };

    // const openCheckInDate = getOpenCheckInDate();
    // const todayApiFormatted = normalizeToDDMMYYYY(todayISO);
    // const normalizedOpenDate = normalizeToDDMMYYYY(openCheckInDate);

    // if (
    //   (contextType === "continue" || contextType === "complete") &&
    //   normalizedOpenDate && normalizedOpenDate !== todayApiFormatted ) {
    //   setErrorMessage("Session started on a previous day. Please reload the screen.")
    //   setShowErrorModal(true)
    //   return;
    // }

    const handleRetainerNameChange = (index, value) => {
        setRetainerInputs(prev => {
            const updated = [...prev];
            updated[index] = value;
            return updated;
        });
    };

    const getJoinedResources = () =>
        retainerInputs
            .map(v => v.trim())
            .filter(Boolean)
            .join("|");

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

        if (resourceList) {
            payload.extraFields = {
                ...(payload.extraFields || {}),
                resource_list: resourceList
            };
        }
        if (contextType !== "checkout_yesterday") return payload;

        const selectedDate = formatDateToDDMMYYYY(formData.date);
        const openDate = normalizeToDDMMYYYY(getOpenCheckInDate());

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

    // --------------------------
    // BUTTON HANDLERS
    // --------------------------
    const handleSubmit = () => {
        const expected = Number(formData.noOfResource || 0);
        const entered = retainerInputs.filter(v => v.trim()).length;

        if (expected && expected !== entered) {

            setErrorMessage(
                `Number of resources (${expected}) must match entered resource names (${entered})`
            );

            setShowErrorModal(true);
            return;
        }
        if (contextType === "update_retainer") {
            //      onSubmitActivity({
            //     ...formData,
            //     mode: "DATA_CORRECT",
            //     //  endTime: toAmPm(formData.endTime),
            // });
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

            //   console.log("Activity Payload:", payload)

            onSubmitActivity(payload);
        }

        onClose();
    };

    const handleMarkComplete = () => {
        if (!isValid) return;
        const expected = Number(formData.noOfResource || 0);
        const entered = retainerInputs.filter(v => v.trim()).length;

        if (expected && expected !== entered) {

            setErrorMessage(
                `Number of resources (${expected}) must match entered resource names (${entered})`
            );

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

        //   console.log("Complete Activity Payload:", payload)

        onCompleteActivity(payload);


        onClose();
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
                    {isPendingCheckout ? "Pending Checkout" : "Activity Checkout"}
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
                                    // disable={Boolean(isExecutive) || contextType === "update_retainer" || !contextType === "checkout_yesterday"}
                                    disable={contextType === "continue" && (isExecutive || isRetainerUpdate)}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <TimePicker
                                    label="End Time *"
                                    cDate={formData.endTime}
                                    setCDate={(value) =>
                                        setFormData(prev => ({ ...prev, endTime: value }))
                                    }
                                // disable={Boolean(isExecutive) || contextType === "update_retainer" }
                                />
                            </View>
                            <View style={styles.formGroup}>
                                <AmountInput
                                    label="Number of Items Audited *"
                                    placeholder="Enter item number"
                                    claimAmount={formData.noOfItems}
                                    setClaimAmount={(value) =>
                                        setFormData(prev => ({ ...prev, noOfItems: value }))
                                    }
                                />
                            </View>
                            {isRetainer && <View style={styles.formGroup}>
                                <AmountInput
                                    label="Number of Resources *"
                                    placeholder="Enter no of resource"
                                    claimAmount={formData.noOfResource}
                                    setClaimAmount={(value) => {
                                        setFormData(prev => ({ ...prev, noOfResource: value }));

                                        const count = Number(value);

                                        if (count > 0) {
                                            setRetainerInputs(prev => {
                                                const currentList = [...prev];
                                                   if (count > currentList.length) {
                                                    // Add new empty slots
                                                    return [...currentList, ...Array(count - currentList.length).fill("")];
                                                }

                                                // Do NOT remove existing values, just keep them
                                                return currentList;
                                            });
                                            setResourceModalVisible(true);
                                        } else {
                                            setRetainerInputs([]);
                                        }

                                    }}
                                />

                                {/* {editingTask?.fullData?.allAEntries && 
                                 editingTask.fullData.allAEntries.length > 0 && 
                                 editingTask.fullData.allAEntries[editingTask.fullData.allAEntries.length - 1]?.resource_list && 
                                 editingTask.fullData.allAEntries[editingTask.fullData.allAEntries.length - 1].resource_list.length > 0 && (
                                    <View style={{ marginTop: 10 }}>
                                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 5 }}>
                                            Resources available:
                                        </Text>
                                        {editingTask.fullData.allAEntries[editingTask.fullData.allAEntries.length - 1].resource_list.map((res, idx) => (
                                            <Text key={idx} style={{ fontSize: 13, color: '#666', marginLeft: 5 }}>
                                                • {res.name || (typeof res === 'string' ? res : JSON.stringify(res))}
                                            </Text>
                                        ))}
                                    </View>
                                )} */}
                            </View>
                            }

                            {isRetainer && retainerInputs.filter(name => name.trim()).length > 0 && (
                                <View style={styles.resourceNamesDisplay}>
                                    <Text style={styles.resourceNamesLabel}>Entered Resource Names:</Text>
                                    {retainerInputs.slice(0, Number(formData.noOfResource)).map((name, index) => (
                                        name.trim() && (
                                            <View key={index} style={styles.resourceNameRow}>
                                                <Text style={styles.resourceNameNumber}>{index + 1}.</Text>
                                                <Text style={styles.resourceNameText}>{name}</Text>
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


                            {editingTask?.original_P?.is_file_applicable && (
                                <Text style={{ color: "red", fontSize: 12, marginTop: 5 }}>
                                    File upload is mandatory for this activity.
                                </Text>
                            )}

                            {contextType !== "update_retainer" &&
                                <View style={styles.formGroup}>
                                    <RemarksInput
                                        label="Remarks"
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

                                {/* MARK AS COMPLETE (always secondary unless today) */}
                                {/* <TouchableOpacity
                                style={[
                                    styles.button,
                                    isTodayPlannedEnd ? styles.primaryButton : styles.secondaryButton,
                                    !isValid && styles.disabledButton
                                ]}
                                disabled={!isValid}
                                onPress={handleMarkComplete}
                            >
                                <Text style={styles.buttonText}>Mark as Complete</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    !isTodayPlannedEnd ? styles.primaryButton : styles.secondaryButton,
                                    !isValid && styles.disabledButton
                                ]}
                                disabled={!isValid}
                                onPress={handleSubmit}
                            >
                                <Text style={styles.buttonText}>Submit</Text>
                            </TouchableOpacity> */}

                                {isPendingCheckout ? (
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

                            {retainerInputs.slice(0, Number(formData.noOfResource)).map((name, index) => (
                                <View key={index} style={styles.resourceInputGroup}>

                                    <Text style={styles.resourceInputLabel}>
                                        Resource {index + 1}
                                    </Text>

                                    <TextInput
                                        style={styles.resourceInput}
                                        value={name}
                                        onChangeText={(v) => handleRetainerNameChange(index, v)}
                                        placeholder="Enter name"
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
                                onPress={() => setResourceModalVisible(false)}
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
        marginVertical: 10,
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
        fontSize: 14,
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

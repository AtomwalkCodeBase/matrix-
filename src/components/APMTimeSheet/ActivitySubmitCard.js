import React, { useState, useEffect, useMemo, useContext } from 'react';
import { View, Text, Modal, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Ionicons from "react-native-vector-icons/Ionicons";

import DatePicker from '../DatePicker';
import AmountInput from '../AmountInput';
import TimePicker from '../TimePicker';
import FilePicker from '../FilePicker';
import RemarksInput from '../RemarkInput';
import { colors } from '../../Styles/appStyle';
import { formatAMPMTime, formatAPITime, getCurrentDateTimeDefaults, parseApiDate } from './utils';
import { AppContext } from '../../../context/AppContext';

const ActivitySubmitCard = ({
    visible,
    onClose,
    editingTask,
    isPendingCheckout = false,
    onSubmitActivity,        // <-- parent callback
    onCompleteActivity       // <-- parent callback
}) => {
  const { profile } = useContext(AppContext);

  const isExecutive = profile.grade_level < 100;

  const isRetainer = editingTask?.retainer;


    const getToday = () => new Date();

    // console.log("editingTask", editingTask);

    const getCurrentTime = () => {
        const now = new Date();
        return now.toTimeString().slice(0, 5);
    };

    // console.log("editingTask", getYesterday())

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
    const MONTH_SHORT_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mon = MONTH_SHORT_NAMES[now.getMonth()];
    const yyyy = now.getFullYear();
    const todayApiPlanned = `${dd}-${mon}-${yyyy}`;

    const plannedEndDate = editingTask?.planned_end_date;
    const isTodayPlannedEnd = plannedEndDate === todayApiPlanned;

    const [formData, setFormData] = useState({
        date: getToday(),
        endTime: isPendingCheckout ? getCurrentTime():  parseTimeToDate(getCurrentTime()),
        noOfItems: "",
        remarks: "",
    });

    const [fileUri, setFileUri] = useState(null);
    const [fileName, setFileName] = useState("");
    const [fileMimeType, setFileMimeType] = useState("");
    const [remarkError, setRemarkError] = useState("");

    useEffect(() => {
        if (visible) {
             let dateToUse;

    if (isPendingCheckout && editingTask?.pendingCheckoutDate) {
      // pendingCheckoutDate = "01-Dec-2025"
      dateToUse = parseApiDate(editingTask.pendingCheckoutDate);
    } else {
      dateToUse = new Date(); // today's date
    }

            setFormData(prev => ({
                ...prev,
                date: dateToUse,
                endTime:isPendingCheckout ? getCurrentTime() : parseTimeToDate(getCurrentTime()),
            }));
            setFileUri(null);
            setFileName("");
            setFileMimeType("");
        }
    }, [visible]);

    // --------------------------
    // VALIDATION CHECK
    // --------------------------
    const isValid = useMemo(() => {
        const { date, endTime, noOfItems, remarks } = formData;

        if (!date || !endTime || !noOfItems) return false;

        if (editingTask?.original_P?.is_file_applicable && !fileUri) {
          return false;
        }

        // If planned_end_date is today → remarks required for submit button
        if (isTodayPlannedEnd && !remarks) return false;

        return true;
    }, [formData, isTodayPlannedEnd]);

    // --------------------------
    // BUTTON HANDLERS
    // --------------------------
    const handleSubmit = () => {
        if (!isValid) return;

        const file =
            fileUri
                ? {
                    uri: fileUri,
                    name: fileName || "upload.jpg",
                    type: fileMimeType || "image/jpeg",
                  }
                : null;

        onSubmitActivity({
            ...formData,
            mode: "UPDATE",
            //  endTime: toAmPm(formData.endTime),
            file,
        });

        onClose();
    };

    const handleMarkComplete = () => {
        if (!isValid) return;

        const file =
            fileUri
                ? {
                    uri: fileUri,
                    name: fileName || "upload.jpg",
                    type: fileMimeType || "image/jpeg",
                  }
                : null;

        onCompleteActivity({
            ...formData,
            mode: "UPDATE",
            //  endTime: toAmPm(formData.endTime),
            file,
            is_completed: 1
        });

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
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

                <View style={styles.modalContent}>
                  {renderHeader()}
                    {/* <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Activity Checkout</Text>

                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View> */}

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}  keyboardShouldPersistTaps="handled">

                        {isPendingCheckout && !isRetainer && (
                            <Text style={styles.warningText}>⚠️ Your yesterday checkout is still pending!</Text>
                        )}

                        <Text style={{backgroundColor: colors.primary, borderRadius: 10, color: "white", textAlign: "center", padding: 6, fontWeight: 500,fontSize: 14}}>NO of Items Assigned you to Audit: {editingTask?.original_P?.no_of_items}</Text>

                        <View style={styles.formGroup}>
                            <DatePicker
                                label="Date *"
                                cDate={formData.date}
                                setCDate={(date) => setFormData(prev => ({ ...prev, date }))}
                                maximumDate={new Date()}
                                disable={Boolean(isExecutive)}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <TimePicker
                                label="End Time *"
                                cDate={formData.endTime}
                                setCDate={(value) =>
                                    setFormData(prev => ({ ...prev, endTime: value }))
                                }
                                disable={Boolean(isExecutive)}
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


                        <FilePicker
                            label="Attach File"
                            fileName={fileName}
                            fileUri={fileUri}
                            setFileName={setFileName}
                            setFileUri={setFileUri}
                            setFileMimeType={setFileMimeType}
                        />
                        
                        {editingTask?.original_P?.is_file_applicable && (
                        <Text style={{ color: "red", fontSize: 12, marginTop: 5 }}>
                          File upload is mandatory for this activity.
                        </Text>
                      )}

                        <View style={styles.formGroup}>
                            <RemarksInput
                                label="Remarks"
                                remark={formData.remarks}
                                setRemark={(v) =>
                                    setFormData(prev => ({ ...prev, remarks: v }))
                                }
                            />
                            
                        </View>
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
        {paddingHorizontal: 10},
      ]}
      disabled={!isValid}
      onPress={handleSubmit}
    >
      <Text style={[styles.applyButtonText,{textAlign: "center"}]}>Checkout For Yesterday</Text>
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
        <Text style={[styles.applyButtonText, {textAlign: "center"}]}>Completed</Text>
      </TouchableOpacity>
      </>

  ) : editingTask?.retainer ?  
  <TouchableOpacity
        style={[
          styles.button,
          styles.applyButton,
          !isValid && styles.disabledButton
        ]}
        disabled={!isValid}
        onPress={handleMarkComplete}
      >
        <Text style={styles.applyButtonText}>Mark as Complete</Text>
      </TouchableOpacity>

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
        setRemarkError("Remarks are required when continuing tomorrow.");
        return;
    }
    setRemarkError("");
    handleSubmit();
}}

      >
        <Text style={styles.clearButtonText}>Continue Tomorrow</Text>
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
        <Text style={styles.applyButtonText}>Continue Tomorrow</Text>
      </TouchableOpacity>
    </>
  )}
                    

                        </View>

                    </ScrollView>
                </View>
            </View>
        </Modal>
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
        paddingBottom: 10,
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
    }
});

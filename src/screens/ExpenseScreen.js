import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Modal, ScrollView } from 'react-native';
import { colors } from '../Styles/appStyle';
import { getAllocationList, getExpensePlannedItem, postExpensePlannedItem } from '../services/productServices';
import { formatToDDMMYYYY, getMonthRange, normalizeProjects } from '../components/APMTimeSheet/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DropdownPicker from '../components/DropdownPicker';
import { Entypo, FontAwesome6, Ionicons, MaterialIcons } from '@expo/vector-icons';
import HeaderComponent from '../components/HeaderComponent';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import AmountInput from '../components/AmountInput';
import DatePicker from '../components/DatePicker';
import TabNavigation from '../components/TabNavigation';
import Loader from '../components/old_components/Loader';
import SuccessModal from '../components/SuccessModal';
import ErrorModal from '../components/ErrorModal';
import RemarksInput from '../components/RemarkInput';

const ExpenseScreen = () => {
  const [allCustomer, setAllCustomer] = useState([]);
  const [selectedOrderItemId, setSelectedOrderItemId] = useState(null);
  const [dateRange, setDateRange] = useState(() => getMonthRange({ type: "current" }));
  const [activeTab, setActiveTab] = useState('planned');
  const [modalItem, setModalItem] = useState({});
  const [expenseItems, setExpenseItems] = useState([]);
   const [isLoading, setIsLoading] = useState(false);
   const [showSuccessModal, setShowSuccessModal] = useState(false);
   const [showErrorModal, setShowErrorModal] = useState(false);
   const [successMessage, setSuccessMessage] = useState("");
   const [errorMessage, setErrorMessage] = useState("");
  const [plannedItems, setPlannedItems] = useState([]);
  const [actualItems, setActualItems] = useState([]);


     const navigate = useNavigation();

  useEffect(() => {
    fetchEmpAllocationData();
  }, [])

  useEffect(() => {
  if (!selectedOrderItemId) {
    setExpenseItems([]);
    return;
  }
  fetchPlannedAndActual(selectedOrderItemId);
}, [selectedOrderItemId, activeTab]);

useEffect(() => {
  setSelectedOrderItemId(null);
  setExpenseItems([]);
  setModalItem(null);
}, [activeTab]);

  const fetchPlannedAndActual = async (orderItemId) => {
    setIsLoading(true);

    try {
      const [plannedRes, actualRes] = await Promise.all([
        getExpensePlannedItem({ expense_type: "P", o_item_id: orderItemId }),
        getExpensePlannedItem({ expense_type: "A", o_item_id: orderItemId }),
      ]);

      setPlannedItems(plannedRes.data || []);
      setActualItems(actualRes.data || []);
      

      // console.log(plannedRes.data)
      // console.log(actualRes.data)
    } catch (err) {
      setErrorMessage('Failed to fetch expense item data. try again later!!!')
    setShowErrorModal(true)
    setExpenseItems([]);
    } finally {
      setIsLoading(false);
    }
  };

// console.log("expenseItems", expenseItems)

   const fetchEmpAllocationData = async (startOverride, endOverride) => {
  const emp_id = await AsyncStorage.getItem('empId');
  
  // Get the date from state/function
  const start = startOverride || dateRange.start;
  const end = endOverride || dateRange.end;
  
  setIsLoading(true);
  
  try {
    // Convert dates to DD-MM-YYYY format
    const formattedStart = formatToDDMMYYYY(start);
    const formattedEnd = formatToDDMMYYYY(end);
    
    const response = await getAllocationList(emp_id, null, formattedStart, formattedEnd);
    
    if (response.data && Array.isArray(response.data)) {
      const normalizedData = normalizeProjects(response.data);
      const groupedData = groupCustomersWithOrderItems(normalizedData);
      setAllCustomer(groupedData);
    } else {
      setErrorMessage('Failed to order item. try again later!!!')
      setShowErrorModal(true)
      setAllCustomer([]);
    }
  } catch (error) {
    console.error("API Error:", error);
  } finally {
    setIsLoading(false);
  }
}

  const extractNumericId = (value) => {
  if (!value) return null;
  return Number(String(value).replace(/\D/g, ""));
};

const groupCustomersWithOrderItems = (data) => {
  const map = new Map();

  data.forEach((entry) => {
    const { customer_name, order_item_id, order_item_key } = entry;
    if (!customer_name || !order_item_id) return;

    const numericOrderItemId = extractNumericId(order_item_id);

    if (!map.has(customer_name)) {
      map.set(customer_name, {
        customer_name,
        order_items: [],
      });
    }

    map.get(customer_name).order_items.push({
      order_item_id: numericOrderItemId,
      order_item_key,
    });
  });

  return Array.from(map.values());
};

const flatCustomerOptions = allCustomer.flatMap(c =>
  c.order_items.map(oi => ({
    label: `${c.customer_name} [${oi.order_item_key}]`,
    value: oi.order_item_id,
  }))
);

 const handleSubmit = async (formData) => {
  // console.log("button clickec", formData)
  setModalItem(null); 

  setIsLoading(true);

   try {
      const payload = {
        "exp_data": {
          "order_item_id": formData.item.order_item_id,
          "call_mode": formData.mode,
          "exp_allocation_list": [
            {
              "project_id": formData?.item?.project_id,
              "activity_id": formData?.item?.activity_id,
              "item_id": formData?.item?.item_id,
              "quantity": formData?.quantity,
              "expense_cost": 0,
              "expense_amt": formData.days,
              "remarks": formData.remark,
            }
          ]
        }
      };
      // console.log('Form submitted:', payload);
      const res =  await postExpensePlannedItem(payload);
      // const res = {status: 200}
      if (res?.status === 200) {
         setShowErrorModal(false);
        setSuccessMessage(formData.mode === "ADD" ?  `${formData?.item?.item_name} Successfully added in actual` : `${formData?.item?.item_name} Successfully updated`)
        setShowSuccessModal(true);
        await fetchPlannedAndActual(formData.item.order_item_id);
      return true
    }
    
  } catch (error) {
    setModalItem(null);
    setErrorMessage("Something went wrong. Please try again later!!!")
    setShowErrorModal(true)
  }finally{
    setIsLoading(false)
  }
  //  console.log('Submitted:', formData);
 };

 const actualItemIds = new Set((actualItems || []).map(item => item.item_id));


  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      {/* Header */}
      <HeaderComponent
        headerTitle="Expense Management"
        onBackPress={() => navigate.goBack()}
      />

      <View style={styles.content}>
         {/* <TabNavigation tabs={[{label: 'Planned Item', value: 'planned'}, {label: 'Actual Item', value: 'actual'}]} activeTab={activeTab} setActiveTab={setActiveTab} /> */}
  
        <View style={styles.dropdownWrapper}>
          <DropdownPicker
                label="Select Order item"
                data={flatCustomerOptions.map((customer) => ({
                  label: customer.label,
                  value: customer.value,
                }))}
                placeHolder="Order item"
                value={selectedOrderItemId}
                setValue={setSelectedOrderItemId}
              />
          <Text style={{ color: colors.textLight, fontSize: 13 }}>
            {selectedOrderItemId ? selectedOrderItemId.label : 'Select a customer from dropdown'}
          </Text>
        </View>

        {/* Item List or Empty State */}
        {/* {expenseItems.length > 0 ? (
          <FlatList
            data={expenseItems}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              
              return(
                <>
                <Text>Planned Item</Text>
              <ItemRow item={plannedItems} onFillPress={() => setModalItem(item)} actionButtonShow={true} activeTab="planned" />
                <Text>Actual Item</Text>
              <ItemRow item={actualItems} onFillPress={() => setModalItem(item)} actionButtonShow={true} activeTab="actual" />
                </>
            )}}
            ListFooterComponent={<View style={{ height: 16 }} />}
          /> */}
        {selectedOrderItemId ? <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >

          {/* ---------- PLANNED ITEMS ---------- */}
          <Text style={styles.sectionTitle}>Planned Items</Text>

          {plannedItems.length > 0 ? (
            plannedItems.map((item) => {
              const alreadyAdded = actualItemIds.has(item.item_id);

              return (
                <ItemRow
                  key={`planned-${item.id}`}
                  item={item}
                  mode="ADD"
                  onFillPress={() => setModalItem({ ...item, mode: "ADD" })}
                  actionButtonShow={!alreadyAdded}
                />
              );
            })
          ) : (
            <Text style={styles.emptyText}>
              No planned items available
            </Text>
          )}

          {/* ---------- ACTUAL ITEMS ---------- */}
          <Text style={styles.sectionTitle}>Actual Items</Text>

          {actualItems.length > 0 ? (
            actualItems.map((item) => (
              <ItemRow
                key={`actual-${item.id}`}
                item={item}
                mode="UPDATE"
                onFillPress={() => setModalItem({ ...item, mode: "UPDATE" })}
                actionButtonShow={true}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>
              No actual expenses added
            </Text>
          )}

        </ScrollView>

          : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={48} color={colors.border} style={styles.emptyIcon} />
              <Text style={styles.emptyText}>
                Please select a order item to view items
              </Text>
            </View>
          )}
      </View>

      {/* Modal */}
      <ExpenseModal
        visible={!!modalItem}
        item={modalItem}
        onClose={() => setModalItem(null)}
        onSubmit={handleSubmit}
      />

      <Loader visible={isLoading} />

      <SuccessModal
        visible={showSuccessModal}
        message={successMessage}
        onClose={() => {
          setShowSuccessModal(false);
          // setActiveTab(activeTab);
        }}
      />

      <ErrorModal
        visible={showErrorModal}
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />
    </SafeAreaView>
  );
}

export default ExpenseScreen

export const ItemRow = ({ item, onFillPress, actionButtonShow = false, activeTab, mode }) => {

  const isAdd = mode === "ADD";
  
  return(

  <View style={styles.itemRow}>
    <Text style={styles.itemName}>{item.item_name}</Text>
    <Text style={styles.itemOrderKey}>{item.order_item_key}</Text>

    <View style={styles.metaRow}>
      <View style={styles.metaItem}>
        <Text style={styles.metaLabel}>Qty</Text>
        <Text style={styles.metaValue}>{item.quantity}</Text>
      </View>
      <View style={styles.metaDivider} />
      <View style={styles.metaItem}>
        <Text style={styles.metaLabel}>Date</Text>
        <Text style={styles.metaValue}>{item.expense_date}</Text>
      </View>
      <View style={styles.metaDivider} />
      <View style={styles.metaItem}>
        <Text style={styles.metaLabel}>Days</Text>
        <Text style={styles.metaValue}>{item.allocation_days || 0}</Text>
      </View>
    </View>

   { actionButtonShow && <TouchableOpacity style={styles.fillBtn} onPress={onFillPress}>
     {isAdd ?  <Entypo name="plus"  size={16} color={colors.white} /> : <FontAwesome6 name="pen-to-square" size={16} color={colors.white} />}
      <Text style={styles.fillBtnText}>{isAdd ? "Add Actual Expense" : "Update Expense"}</Text>
    </TouchableOpacity>}
  </View>
)};

export const ExpenseModal = ({ visible, item, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({ quantity: '', days: '', date: new Date(), remark: '' });

  useEffect(() => {
    if (item) setFormData({ quantity: String(item.quantity), days: String(item.allocation_days || 0), date: item.date ? new Date(item.date) : new Date(), remark: item.remarks });
  }, [item]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalSheet}>
          {/* <TouchableOpacity onPress={onClose} />
          <View style={styles.modalDrag} /> */}

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Fill Expense Details</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close-circle-outline" size={26} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <ScrollView scrollEnabled={true}>
            <View style={styles.formSection}>
              <ItemRow item={item} />

            <AmountInput
            claimAmount={formData.quantity}
            label="Quantity"
            placeholder = "Enter Quantity"
            setClaimAmount={(quantity) => handleChange("quantity", quantity)}
            // error={errors.claimAmount}
            // disabled={isViewMode}
          />

          <AmountInput
            claimAmount={formData.days}
            label="No. of Days"
            placeholder = "Enter no of Days"
            setClaimAmount={(days) => handleChange("days", days)}
            // error={errors.claimAmount}
            // disabled={isViewMode}
          />

            {/* <DatePicker
            cDate={formData.date}
            label="Expense Date"
            setCDate={(date) => handleChange("date", date)}
            // error={errors.expenseDate}
            // disabled={isViewMode}
          /> */}

           <RemarksInput
            remark={formData.remark}
            setRemark={(remark) => handleChange("remark", remark)}
            // error={errors.remarks}
            // disabled={isViewMode}
          />

            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onClose}>
              <Ionicons name="close-outline" size={16} color={colors.text} />
              <Text style={[styles.btnText, styles.btnCancelText]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnSubmit]} onPress={() => onSubmit({...formData,item, mode: item.mode})}>
              <Ionicons name="checkmark-outline" size={16} color={colors.white} />
              <Text style={styles.btnText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      {/* </TouchableOpacity> */}
      </View>
    </Modal>
  );
};


const styles = StyleSheet.create({
  // ── Screen ──
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenHeader: {
    backgroundColor: colors.primary,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },

  // ── Dropdown wrapper ──
  dropdownWrapper: {
    marginVertical: 14,
  },

  // ── Empty State ──
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textLight,
    textAlign: 'center',
  },

   itemRow: {
    marginTop: 6,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  itemOrderKey: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metaItem: {
    alignItems: 'center',
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 5,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  metaDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  fillBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 11,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fillBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Modal ──
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayBg,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingBottom: 30,
  },
  modalDrag: {
    width: 44,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginVertical: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },

  // ── Info Grid (read-only planned details) ──
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.light,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },

  // ── Form ──
  formSection: {
    paddingHorizontal: 20,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },

  // ── Modal Buttons ──
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  btn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  btnCancel: {
    backgroundColor: colors.tertiary,
  },
  btnSubmit: {
    backgroundColor: colors.primary,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  btnCancelText: {
    color: colors.text,
  },
});
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Keyboard, Alert, View, Text } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { getExpenseItem, getExpenseProjectList, postClaim } from '../services/productServices';
import HeaderComponent from '../components/HeaderComponent';
import DropdownPicker from '../components/DropdownPicker';
import AmountInput from '../components/AmountInput';
import DatePicker from '../components/DatePicker';
import FilePicker from '../components/FilePicker';
import RemarksTextArea from '../components/RemarkInput';
import SubmitButton from '../components/SubmitButton';
import SuccessModal from '../components/SuccessModal';
import Loader from '../components/old_components/Loader';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { colors } from '../Styles/appStyle';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Container = styled.ScrollView`
  flex: 1;
  padding: 10px;
  background-color: #fff;
  height: 100%;
`;

const AddClaim = (props) => {
  const [claimAmount, setClaimAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileUri, setFileUri] = useState('');
  const [fileMimeType, setFileMimeType] = useState('');
  const [claimItem, setClaimItem] = useState([]);
  const [expenseItemsData, setExpenseItemsData] = useState([]);
  const [empId, setEmpId] = useState('');
  const [projectList, setProjectList] = useState([]);
  const [item, setItem] = useState('');
  const [project, setProject] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [errors, setErrors] = useState({});
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigation = useNavigation();
  const router = useRouter();

  // Parse props data
  const { masterClaimId, mode, claimData } = props.data || {};
  const isAddMode = mode === 'ADD';
  const isEditMode = mode === 'EDIT';
  const isViewMode = mode === 'VIEW';

  // Parse claim data if available
  const parsedClaimData = claimData ? JSON.parse(claimData) : null;


  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    fetchClaimItemList();
    fetchProjectList();
    fetchEmpId();

    // Pre-fill form if in EDIT mode with received data
    if (isEditMode && parsedClaimData) {
      setItem(parsedClaimData.item_id?.toString() || '');
      setProject(parsedClaimData.project_id?.toString() || '');
      setClaimAmount(parsedClaimData.expense_amt || '');
      setRemark(parsedClaimData.remarks || '');

      // Set file info from existing claim
      if (parsedClaimData.submitted_file_1) {
        const urlParts = parsedClaimData.submitted_file_1.split('/');
        setFileName(urlParts[urlParts.length - 1].split('?')[0]);
      }

      // Parse and set date from "26-Jun-2025" format
      if (parsedClaimData.expense_date) {
        const months = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const [day, monthStr, year] = parsedClaimData.expense_date.split('-');
        const month = months[monthStr];
        setExpenseDate(new Date(year, month, day));
      }
    }
  }, []);



  const fetchClaimItemList = async () => {
    setIsLoading(true);
    try {
      const response = await getExpenseItem();
      const formattedData = response.data.map(item => ({
        label: item.name,
        value: item.id.toString() // Ensure string value for dropdown
      }));
      setClaimItem(formattedData);
      setExpenseItemsData(response.data);
    } catch (error) {
      console.error("Error fetching expense items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectList = async () => {
    setIsLoading(true);
    try {
      const response = await getExpenseProjectList();
      const formattedData = response.data.map(project => ({
        label: project.title,
        value: project.id.toString() // Ensure string value for dropdown
      }));
      setProjectList(formattedData);
    } catch (error) {
      console.error("Error fetching project list:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmpId = async () => {
    try {
      const id = await AsyncStorage.getItem('empId');
      setEmpId(id);
    } catch (error) {
      console.error("Error fetching employee ID:", error);
    }
  };

  const handleBackPress = () => {
    if (mode === 'ADD NEW') {
      router.navigate({
        pathname: 'home',
        params: { screen: 'HomePage' }
      });
    } else {
      router.push('ClaimScreen');
    }
  };

  const handleError = (error, input) => {
    setErrors(prevState => ({ ...prevState, [input]: error }));
  };

  const validate = () => {
    Keyboard.dismiss();
    let isValid = true;

    if (!item) {
      handleError('Please select an Expense Item', 'item');
      isValid = false;
    }

    if (!expenseDate) {
      handleError('Please select the date', 'expenseDate');
      isValid = false;
    }

    if (!remark) {
      handleError('Please fill the remark field', 'remarks');
      isValid = false;
    }

    if (!claimAmount) {
      handleError('Please enter the claim amount', 'claimAmount');
      isValid = false;
    }

    // File is only required for new claims or when updating without existing file
    if (item) {
      const selectedItem = expenseItemsData.find(i => i.id.toString() === item);
      const billRequired = selectedItem?.is_exp_bill_required;

      const fileProvided = !!fileUri || !!parsedClaimData?.submitted_file_1;

      if (billRequired && !fileProvided) {
        handleError('Please upload a bill for this expense item', 'file');
        isValid = false;
      } else {
        handleError(null, 'file'); // clear error if not required or already provided
      }
    }

    if (isValid) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    // Format date as "DD-MM-YYYY"
    const formattedDate = `${expenseDate.getDate().toString().padStart(2, '0')}-${(expenseDate.getMonth() + 1).toString().padStart(2, '0')}-${expenseDate.getFullYear()}`;

    const formData = new FormData();

    // Only append file if a new one was selected
    if (fileUri) {
      formData.append('file_1', {
        uri: fileUri,
        name: fileName,
        type: fileMimeType,
      });
    }

    formData.append('remarks', remark);
    formData.append('item', item);
    formData.append('quantity', '1');
    formData.append('expense_amt', claimAmount);
    formData.append('expense_date', formattedDate);
    formData.append('emp_id', empId);

    if (isEditMode) {
      // Use CLAIM_RESUBMIT if this is a resubmission (status was 'B')
      formData.append('call_mode', parsedClaimData?.isResubmit ? 'CLAIM_RESUBMIT' : 'CLAIM_UPDATE');
      formData.append('claim_id', parsedClaimData.id); // Use the specific claim ID for updates
    } else {
      formData.append('call_mode', 'CLAIM_SAVE');
      if (isAddMode && masterClaimId) {
        formData.append('m_claim_id', masterClaimId);
      }
    }

    if (project) {
      formData.append('project_id', project);
    }

    try {
      const res = await postClaim(formData);
      if (res.status === 200) {
        setIsSuccessModalVisible(true);
      } else {
        console.error('Unexpected response:', res);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit claim');
      console.error("Submission error:", error.response?.data);
    } finally {
      setIsLoading(false);
    }
  };

  // console.log("Claim resubmit data==", claimData)

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["left", "right", "bottom"]}>
      <HeaderComponent
        headerTitle={
          isViewMode ? "View Claim" :
            isEditMode ? parsedClaimData?.isResubmit ? "Resubmit Claim Item" : "Edit Claim Item" :
              isAddMode && masterClaimId ? "Add Claim Item" :
                "Add New Claim"
        }
        onBackPress={handleBackPress}
      />
      {isLoading ? (
        <Loader
          visible={isLoading}
          onTimeout={() => {
            setIsLoading(false);
            Alert.alert('Timeout', 'Not able to process the Claim.');
          }}
        />
      ) : (
        <Container showsVerticalScrollIndicator={false}>
          {isEditMode && (
            <View style={{
              padding: 15,
              backgroundColor: parsedClaimData?.isResubmit ? '#fff3e0' : '#e3f2fd',
              borderRadius: 8,
              marginBottom: 15,
              borderLeftWidth: 4,
              borderLeftColor: parsedClaimData?.isResubmit ? '#ff9800' : '#2196f3'
            }}>
              <Text style={{
                fontWeight: 'bold',
                color: '#333',
                marginBottom: 5
              }}>
                {parsedClaimData?.isResubmit ? 'Resubmitting Claim Item' : 'Editing Claim Item'}
              </Text>
              <Text style={{ color: '#666' }}>
                Claim ID: {parsedClaimData?.master_claim_id || 'N/A'}
              </Text>
              {parsedClaimData?.isResubmit && (
                <Text style={{ color: '#ff9800', marginTop: 5, fontStyle: 'italic' }}>
                  This claim was returned for corrections
                </Text>
              )}
            </View>
          )}
          {isAddMode && masterClaimId && (
            <View style={{
              padding: 15,
              backgroundColor: '#f0e5ff',
              borderRadius: 8,
              marginBottom: 15,
              borderLeftWidth: 4,
              borderLeftColor: colors.primary
            }}>
              <Text style={{
                fontWeight: 'bold',
                color: '#333'
              }}>
                Adding to Claim: {masterClaimId}
              </Text>
            </View>
          )}

          <DropdownPicker
            label="Expense Item"
            data={claimItem}
            value={item}
            setValue={setItem}
            error={errors.item}
            disabled={isViewMode}
          />

          {/* <DropdownPicker
            label="Expense Item"
            data={claimItem}
            value={item}
            setValue={setItem}
            error={errors.item}
            disabled={isViewMode || (isEditMode && parsedClaimData?.isResubmit)}
          /> */}

          {projectList.length > 0 && (
            <DropdownPicker
              label="Project"
              data={projectList}
              value={project}
              setValue={setProject}
              disabled={isViewMode}
            />
          )}

          <DatePicker
            cDate={expenseDate}
            label="Expense Date"
            setCDate={setExpenseDate}
            error={errors.expenseDate}
            disabled={isViewMode}
          />

          <AmountInput
            claimAmount={claimAmount}
            label="Expense Amount"
            setClaimAmount={setClaimAmount}
            error={errors.claimAmount}
            disabled={isViewMode}
          />

          <FilePicker
            label="Attach File"
            fileName={fileName}
            setFileName={setFileName}
            fileUri={fileUri}
            setFileUri={setFileUri}
            setFileMimeType={setFileMimeType}
            error={errors.file}
            existingImgUri={parsedClaimData?.submitted_file_1}
            existingFileName={parsedClaimData?.submitted_file_1 ?
              parsedClaimData.submitted_file_1.split('/').pop().split('?')[0] :
              null
            }
            disabled={isViewMode}
            required={(() => {
              const selectedItem = expenseItemsData.find(i => i.id.toString() === item);
              return selectedItem ? !!selectedItem.is_exp_bill_required : false;
            })()}
          />

          <RemarksTextArea
            remark={remark}
            setRemark={setRemark}
            error={errors.remarks}
            disabled={isViewMode}
          />

          {!isViewMode && (
            <SubmitButton
              label={
                isEditMode ?
                  (parsedClaimData?.isResubmit ? "Resubmit Claim" : "Update Claim") :
                  isAddMode ? "Save Draft" :
                    "Submit Claim"
              }
              onPress={validate}
              bgColor={
                isEditMode ?
                  (parsedClaimData?.isResubmit ? colors.warning : colors.info) :
                  colors.primary
              }
              textColor="white"
            />
          )}
        </Container>
      )}

      <SuccessModal
        visible={isSuccessModalVisible}
        onClose={() => {
          setIsSuccessModalVisible(false);
          router.push('ClaimScreen');
        }}
        message={
          isEditMode ?
            (parsedClaimData?.isResubmit ? "Claim resubmitted successfully!" : "Claim updated successfully!") :
            isAddMode ? "Claim item added successfully!" :
              "Claim submitted successfully!"
        }
      />
    </SafeAreaView>
  );
};

export default AddClaim;
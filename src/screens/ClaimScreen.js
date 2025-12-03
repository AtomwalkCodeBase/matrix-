import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { FlatList, View, Text, Alert, Linking, TouchableOpacity, StyleSheet, TextInput, Animated, Easing, Dimensions, BackHandler } from 'react-native';
import { useFocusEffect, useNavigation, usePathname, useRouter } from 'expo-router';
import { getEmpClaim, postClaimAction } from '../services/productServices';
import HeaderComponent from '../components/HeaderComponent';
import ImageView from 'react-native-image-viewing';
import ModalComponent from '../components/ModalComponent';
import ClaimCard from '../components/ClaimCard';
import ApplyButton from '../components/ApplyButton';
import Loader from '../components/old_components/Loader';
import styled from 'styled-components/native';
import EmptyMessage from '../components/EmptyMessage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfirmationModal from '../components/ConfirmationModal';
import { Ionicons } from '@expo/vector-icons';
import FilterModal from '../components/FilterModal';
import SuccessModal from '../components/SuccessModal';
import ErrorModal from '../components/ErrorModal';
import ClaimModalComponent from '../components/ClaimModalComponent';
import { colors } from '../Styles/appStyle';

const { width } = Dimensions.get('window');

const Container = styled.View`
  flex: 1;
  padding: 10px;
  background-color: #fff;
`;

const TabContainer = styled.View`
  flex-direction: row;
  margin-bottom: 10px;
  border-bottom-width: 1px;
  border-bottom-color: #ccc;
`;

const TabButton = styled.TouchableOpacity`
  flex: 1;
  padding: 12px;
  align-items: center;
  border-bottom-width: 2px;
  border-bottom-color: ${props => props.active ? `${colors.primary}` : 'transparent'};
`;

const TabText = styled.Text`
  font-size: 14px;
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  color: ${props => props.active ? `${colors.primary}` : '#666'};
`;

const GroupHeader = styled.TouchableOpacity`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: ${props => props.isApproved ? '#e8f5e9' : props.isDraft ? '#f0e5ff' : '#f5f5f5'};
  border-radius: 8px;
  margin-bottom: 8px;
  border-left-width: 4px;
  border-left-color: ${props => props.isApproved ? '#4caf50' : props.isDraft ? '#a970ff' : '#ff9800'};
`;

const StatusContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 12px;
  margin-bottom: 15px;
  margin-horizontal: 10px;
`;

const StatusItem = styled.View`
  align-items: center;
  flex: 1;
`;

const StatusTitle = styled.Text`
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
`;

const StatusValue = styled.Text`
  font-size: 16px;
  font-weight: bold;
  color: ${props => props.color || '#333'};
`;

const styles = StyleSheet.create({
  icon: {
    marginLeft: 8,
  },
  approvedIcon: {
    color: '#4caf50',
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#495057',
    paddingLeft: 10,
    paddingVertical: 8,
  },
  filterButton: {
    backgroundColor: '#6c5ce7',
    padding: 10,
    borderRadius: 10,
    marginLeft: 10,
  },
  dropdownContainer: {
    marginBottom: 15,
  },
  groupHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  groupAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  draftBadge: {
    backgroundColor: '#a970ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  draftBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemCountBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  itemCountText: {
    fontSize: 12,
    color: '#424242',
    fontWeight: 'bold',
  },
});

const ClaimScreen = (props) => {
  const {
    headerTitle = "My Claim",
    buttonLabel = "Add Claim",
    requestData = 'GET',
  } = props.data;

  const router = useRouter();
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [allClaims, setAllClaims] = useState([]);
  const [filteredClaims, setFilteredClaims] = useState([]);
  const [groupedClaims, setGroupedClaims] = useState([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [empId, setEmpId] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [claimToDelete, setClaimToDelete] = useState(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [pendingFilters, setPendingFilters] = useState({
  all: { status: null, claimId: null, period: 'CY' },
  drafts: { claimId: null, period: 'CY' }
});
  const pathname = usePathname();
  const [statusSummary, setStatusSummary] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    draft: 0
  });
  const [filters, setFilters] = useState({
  all: { // For "Submitted Claims" tab
    status: null,
    claimId: null,
    period: 'CY'
  },
  drafts: { // For "Draft Claims" tab
    claimId: null,
    period: 'CY'
  }
});
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);

  const navigation = useNavigation();

  const statusOptions = [
  { label: 'Submitted', value: 'S' },
  { label: 'Approved', value: 'A' },
  { label: 'Forwarded', value: 'F' },
  { label: 'Rejected', value: 'R' },
  { label: 'Back to Claimant', value: 'B' },
  { label: 'Draft', value: 'N' },
];

const periodOptions = [
  { label: 'Current Financial Year', value: 'CY' },
  { label: 'Upto Last Financial Year', value: 'LY' },
  { label: 'All Claims', value: 'ALL' },
];

  useEffect(() => {
    if (allClaims.length > 0) {
      updateStatusSummary(allClaims);
    }
  }, [allClaims]);

   useFocusEffect(
      useCallback(() => {
        const onBackPress = () => {
          if (selectedImageUrl) {
            setSelectedImageUrl(null);
            return true;
          }
          return false;
        };
  
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
  
        return () => {
          backHandler?.remove && backHandler.remove();
        };
      }, [])
    );
  


  const getFilterCount = () => {
  const currentFilters = getCurrentFilters();
  let count = 0;
  
  if (activeTab === 'all' && currentFilters.status) count++;
  if (currentFilters.claimId) count++;
  if (currentFilters.period && currentFilters.period !== 'CY') count++;
  
  return count;
};

const getCurrentFilters = () => {
  return activeTab === 'all' ? filters.all : filters.drafts;
};

  const updateStatusSummary = (claims) => {
    const summary = {
      total: claims.length,
      approved: claims.filter(claim => claim.expense_status === 'A').length,
      pending: claims.filter(claim => ['S', 'F', 'B'].includes(claim.expense_status)).length,
      draft: claims.filter(claim => claim.expense_status === 'N').length
    };
    setStatusSummary(summary);
  };

  const getDropdownOptions = (key) => {
  // First filter claims based on the active tab
  let tabFilteredClaims = [...allClaims];
  
  if (activeTab === 'drafts') {
    tabFilteredClaims = tabFilteredClaims.filter(claim => 
      claim.expense_status === 'N' || 
      claim.status_display === 'Not Submitted'
    );
  } else {
    tabFilteredClaims = tabFilteredClaims.filter(claim => 
      claim.expense_status !== 'N' && 
      claim.status_display !== 'Not Submitted'
    );
  }

  // Then filter out claims with empty claim_items arrays
  const validClaims = tabFilteredClaims.filter(claim => 
    claim.claim_items && claim.claim_items.length > 0
  );
  
  const uniqueValues = [...new Set(validClaims.map(item => item[key]))];
  return uniqueValues.map(value => ({ label: value, value }));
};

  useEffect(() => {
    fetchEmpId();
  }, []);

useEffect(() => {
  if (empId) {
    fetchClaimDetails();
  }
}, [empId, filters.all.period, filters.drafts.period]); // Watch period filters for both tabs

  useEffect(() => {
    if (allClaims.length > 0) {
      const hasDrafts = allClaims.some(claim => claim.expense_status === 'N');
      if (hasDrafts) {
        setActiveTab('drafts');
      }
    }
  }, [allClaims]);

useEffect(() => {
  filterClaims();
}, [allClaims, activeTab, searchQuery, filters]); // Add filters to dependencies

const formatIndianCurrency = (num) => {
    if (!num && num !== 0) return null;
    
    const numberValue = Number(num);
    if (isNaN(numberValue)) return null;

    const isInteger = Number.isInteger(numberValue);
    const numStr = isInteger ? numberValue.toString() : numberValue.toString();
    const parts = numStr.split('.');
    let integerPart = parts[0];
    const decimalPart = !isInteger && parts.length > 1 ? `.${parts[1]}` : '';

    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    
    if (otherNumbers !== '') {
      integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    } else {
      integerPart = lastThree;
    }

    return `₹${integerPart}${decimalPart}`;
  };
  

// Helper function to parse claim dates in "DD-MMM-YYYY" format
const parseClaimDate = (dateString) => {
  if (!dateString) return null;
  
  try {
    // Handle "DD-MMM-YYYY" format (e.g., "26-Jun-2025")
    if (/^\d{2}-[a-zA-Z]{3}-\d{4}$/.test(dateString)) {
      const months = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
      };
      
      const [day, month, year] = dateString.split('-');
      return new Date(year, months[month], day);
    }
    
    return new Date(dateString); // Fallback for other formats
  } catch (e) {
    console.warn('Failed to parse date:', dateString);
    return null;
  }
};


const filterClaims = () => {
  const currentFilters = getCurrentFilters();
  let filtered = [...allClaims];

  // Filter by period - now using currentFilters.period
  if (currentFilters.period && currentFilters.period !== 'ALL') {
    const currentYear = new Date().getFullYear();
    filtered = filtered.filter(claim => {
      const claimDate = parseClaimDate(claim.claim_date);
      if (!claimDate) return true;
      
      const claimYear = claimDate.getFullYear();
      return currentFilters.period === 'CY' 
        ? claimYear === currentYear 
        : claimYear === currentYear - 1;
    });
  }

  // Filter by active tab
  if (activeTab === 'drafts') {
    filtered = filtered.filter(claim => 
      claim.expense_status === 'N' || 
      claim.status_display === 'Not Submitted'
    );
  } else {
    filtered = filtered.filter(claim => 
      claim.expense_status !== 'N' && 
      claim.status_display !== 'Not Submitted'
    );
    
    // Apply status filter only for "all" tab
    if (currentFilters.status) {
      filtered = filtered.filter(claim => claim.expense_status === currentFilters.status);
    }
  }

  // Apply search filter
  if (searchQuery) {
    filtered = filtered.filter(claim => 
      claim.master_claim_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.employee_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Apply claim ID filter
  if (currentFilters.claimId) {
    filtered = filtered.filter(claim => claim.master_claim_id === currentFilters.claimId);
  }

  setFilteredClaims(filtered);
  setGroupedClaims(filtered);
};

  const fetchEmpId = async () => {
    try {
      const id = await AsyncStorage.getItem('empNoId');
      setEmpId(id);
    } catch (error) {
      console.error("Error fetching employee ID:", error);
    }
  };

  const fetchClaimDetails = () => {
  setIsLoading(true);
  
  // Get the current period filter from the filters state
  const currentPeriod = getCurrentFilters().period;
  const apiPeriod = currentPeriod === 'ALL' ? null : currentPeriod;
  
  getEmpClaim(requestData, empId, apiPeriod || 'CY')
    .then((res) => {
      const claims = res.data || [];
      const validClaims = claims.filter(claim => 
        !claim.master_claim_id || 
        (claim.master_claim_id && claim.claim_items && claim.claim_items.length > 0)
      );
      
      setAllClaims(validClaims);
      setIsLoading(false);
      
      if (claims.length === 0) {
        handlePress('ADD NEW');
      }
    })
    .catch((error) => {
      setIsLoading(false);
      console.error("Error fetching claim data:", error);
    });
};

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleTabChange = (tab) => {
  // When switching to drafts tab, we don't want to carry over status filters
  if (tab === 'drafts') {
    setFilters(prev => ({
      ...prev,
      drafts: {
        ...prev.drafts,
        status: null // Explicitly clear status filter for drafts
      }
    }));
  }
  setActiveTab(tab);
};

  const handleBackPress = () => {
    if (selectedImageUrl) {
      setSelectedImageUrl(null);
    } else {
      router.navigate({
        pathname: 'home',
        params: { screen: 'HomePage' }
      });
    }
  };

  const handleCardPress = (claim) => {
    setSelectedClaim(claim);
    setModalVisible(true);
  };

  const handleDeleteClaim = async () => {
    if (!claimToDelete) return;
    
    setIsLoading(true);
    const claimPayload = {
      claim_id: claimToDelete.id,
      call_mode: "DELETE",
    };

    try {
      await postClaimAction(claimPayload);
      // Alert.alert('Success', 'Claim deleted successfully!');
      setSuccessMessage("Claim deleted successfully!")
      setShowSuccessModal(true)
      fetchClaimDetails();
    } catch (error) {
      // Alert.alert('Error', 'Failed to delete claim.');
      setErrorMessage("Failed to delete claim.");
      setShowErrorModal(true);
      console.error('Error deleting claim:', error);
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
      setClaimToDelete(null);
    }
  };

  const promptDeleteClaim = (claim) => {
    setClaimToDelete(claim);
    setShowDeleteConfirm(true);
  };

  const promptUpdateClaim = (claim) => {
  // If it's a grouped claim with items, take the first item for editing
  const claimToEdit = claim.claim_items && claim.claim_items.length > 0 
    ? claim.claim_items[0] 
    : claim;
  
  // Determine if this is a resubmission (status 'B')
  const isResubmit = claimToEdit.expense_status === 'B';
  
  router.push({
    pathname: 'ClaimApply',
    params: { 
      mode: 'EDIT',
      claimData: JSON.stringify({
        ...claimToEdit,
        isResubmit // Add flag to indicate this is a resubmission
      }),
      masterClaimId: claim.master_claim_id
    }
  });
};

  const closeModal = () => {
    setModalVisible(false);
  };

  const handleFilterPress = () => {
  // Initialize pending filters with current filters
  setPendingFilters(JSON.parse(JSON.stringify(filters)));
  setShowFilterModal(true);
};

  const handlePress = (mode, masterClaimId = null, claimData = null) => {
  const params = {
    mode: mode || (activeTab === 'drafts' ? 'ADD' : 'APPLY'),
  };

  if (masterClaimId) {
    params.masterClaimId = masterClaimId;
  }

  if (claimData) {
    params.claimData = JSON.stringify(claimData);
  }

  router.push({
    pathname: 'ClaimApply',
    params
  });
};

  const handleSubmitClaim = (masterClaimId) => {
  // Find the complete claim object to verify it's a draft
  const claimToSubmit = groupedClaims.find(claim => claim.master_claim_id === masterClaimId);
  
  if (claimToSubmit && (claimToSubmit.expense_status === 'N' || claimToSubmit.status_display === 'Not Submitted')) {
    setSelectedClaimId(masterClaimId);
    setShowConfirmModal(true);
  } else {
    // Alert.alert('Error', 'Only draft claims can be submitted');
    setErrorMessage("Only draft claims can be submitted");
    setShowErrorModal(true);
  }
};

  const confirmSubmitClaim = async () => {
  if (!selectedClaimId) return;
  
  setShowConfirmModal(false);
  setIsLoading(true);
  
  const claimPayload = {
    m_claim_id: selectedClaimId, // Use the selected master claim ID
    call_mode: "SUBMIT_ALL",
  };

  try {
    await postClaimAction(claimPayload);
    setSuccessMessage("Claim submitted successfully!");
    setShowSuccessModal(true);
    
    // Switch to the "Submitted Claims" tab after successful submission
    setActiveTab('all');
    
    fetchClaimDetails(); // Refresh the claims list
  } catch (error) {
    setErrorMessage("Failed to submit claim.");
    setShowErrorModal(true);
    console.error('Error submitting claim:', error);
  } finally {
    setIsLoading(false);
  }
};

  const handleViewFile = (fileUrl) => {
    const fileExtension = fileUrl.split('.').pop().split('?')[0].toLowerCase();

    if (['jpg', 'jpeg', 'png'].includes(fileExtension)) {
      setSelectedImageUrl(fileUrl);
    } else if (fileExtension === 'pdf') {
      Alert.alert('File Downloading', 'The file is being downloaded.');
      Linking.openURL(fileUrl).catch((err) =>
        console.error('Failed to open URL:', err)
      );
    } else {
      console.warn('Unsupported file type:', fileExtension);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'S':
        return 'SUBMITTED';
      case 'N':
        return 'DRAFT';
      case 'A':
        return 'APPROVED';
      case 'F':
        return 'FORWARDED';
      case 'B':
        return 'BACK TO CLAIMANT';
      case 'R':
        return 'REJECTED';
      case 'P':
        return 'SETTLE';
      default:
        return status === 'A' ? 'APPROVED' : 'PENDING';
    }
  };


  const toggleGroup = (claimId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [claimId]: !prev[claimId]
    }));
  };

  const isGroupApproved = (claim) => {
    return claim.expense_status === 'A';
  };

  const isGroupDraft = (claim) => {
    return claim.expense_status === 'N' || claim.status_display === 'Not Submitted';
  };

  const calculateGroupTotal = (claim) => {
    if (claim.claim_items && claim.claim_items.length > 0) {
      return claim.claim_items.reduce((total, item) => {
        const amount = parseFloat(item.expense_amt) || 0;
        return total + amount;
      }, 0);
    }
    return parseFloat(claim.expense_amt) || 0;
  };

  const renderGroupedClaimItem = ({ item, index }) => {
  const isApproved = isGroupApproved(item);
  const isDraft = isGroupDraft(item);
  const groupTotal = calculateGroupTotal(item);
  
  return (
    <View style={{ marginBottom: 10, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 2 }}>
      <GroupHeader 
        onPress={() => toggleGroup(item.master_claim_id)}
        isApproved={isApproved}
        isDraft={isDraft}
        activeOpacity={0.7}
        style={{ 
          padding: 16,
          borderLeftWidth: 6,
          borderLeftColor: isApproved ? '#4caf50' : isDraft ? '#a970ff' : '#2196F3',
          backgroundColor: isApproved ? '#f0f9f0' : isDraft ? '#f8f2ff' : '#E3F2FD'
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: 'bold', 
                color: isApproved ? '#4caf50' : isDraft ? '#a970ff' : '#454545',
                marginRight: 8
              }}>
                {item.master_claim_id}
              </Text>
            </View>
            
            {/* Replace the existing Text component with this badge */}
            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCountText}>
                {item.claim_items?.length || 1} item{item.claim_items?.length !== 1 ? 's' : ''}
              </Text>
            </View>
            
            <Text style={{ fontSize: 15, color: '#666' }}>
              {item.claim_date} 
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ 
              fontSize: 16, 
              fontWeight: 'bold', 
              color: isApproved ? '#4caf50' : isDraft ? '#a970ff' : '#454545',
              marginRight: 8
            }}>
              {formatIndianCurrency(groupTotal.toFixed(2))}
            </Text>
            <Ionicons 
              name={expandedGroups[item.master_claim_id] ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={isApproved ? '#4caf50' : isDraft ? '#a970ff' : '#454545'} 
            />
          </View>
        </View>
      </GroupHeader>
      
      {expandedGroups[item.master_claim_id] && (
    <View style={{ padding: 12 }}>
      {item.claim_items && item.claim_items.length > 0 ? (
        item.claim_items.map((claimItem, index) => (
          <ClaimCard 
            key={`${claimItem.id}-${index}`}
            claim={claimItem}
            onPress={handleCardPress}
            onViewFile={handleViewFile}
            getStatusText={getStatusText}
            onUpdate={() => promptUpdateClaim({
              ...claimItem,
              master_claim_id: item.master_claim_id
            })}
            onDelete={() => promptDeleteClaim(claimItem)}
            style={{ 
              marginBottom: index === item.claim_items.length - 1 ? 0 : 8,
            }}
          />
        ))
      ) : (
        <ClaimCard 
          claim={item}
          onPress={handleCardPress}
          onViewFile={handleViewFile}
          getStatusText={getStatusText}
          onUpdate={() => promptUpdateClaim(item)}
          onDelete={() => promptDeleteClaim(item)}
        />
      )}
          
          {isDraft && (
            <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
              <TouchableOpacity 
                style={{ 
                  flex: 1,
                  padding: 12,
                  backgroundColor: '#a970ff',
                  borderRadius: 8,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                onPress={() => handlePress('ADD', item.master_claim_id)}
              >
                <Ionicons name="add" size={18} color="white" />
                <Text style={{ color: 'white', marginLeft: 8, fontWeight: '500' }}>Add Item</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{ 
                  flex: 1,
                  padding: 12,
                  backgroundColor: '#4CAF50',
                  borderRadius: 8,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                onPress={() => handleSubmitClaim(item.master_claim_id)}
              >
                <Ionicons name="send" size={18} color="white" />
                <Text style={{ color: 'white', marginLeft: 8, fontWeight: '500' }}>Submit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};


  if (selectedImageUrl) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <HeaderComponent headerTitle="View Image" onBackPress={handleBackPress} />
        <View style={{ flex: 1 }}>
          <ImageView
            images={[{ uri: selectedImageUrl }]}
            imageIndex={0}
            visible={true}
            onRequestClose={handleBackPress}
            presentationStyle="overFullScreen"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["left", "right", "bottom"]}>
      <HeaderComponent 
        headerTitle={headerTitle} 
        onBackPress={handleBackPress}
        icon2Name={"add-circle"}
        icon2OnPress={() => handlePress('ADD')}
        icon1Name="filter"
        icon1OnPress={handleFilterPress}
        filterCount={getFilterCount()}
      />
      
      <Container>
        {activeTab=='all' &&(
          <StatusContainer>
            <StatusItem>
              <StatusTitle>Total</StatusTitle>
              <StatusValue>{filteredClaims.length}</StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusTitle>Approved</StatusTitle>
              <StatusValue color="#4CAF50">
                {filteredClaims.filter(claim => claim.expense_status === 'A').length}
              </StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusTitle>Submitted</StatusTitle>
              <StatusValue color="#FF9800">
                {filteredClaims.filter(claim => ['S', 'F', 'B'].includes(claim.expense_status)).length}
              </StatusValue>
            </StatusItem>
            <StatusItem>
              <StatusTitle>Drafts</StatusTitle>
              <StatusValue color="#9C27B0">
                {filteredClaims.filter(claim => claim.expense_status === 'N').length}
              </StatusValue>
            </StatusItem>
          </StatusContainer>
         )}

        <TabContainer>
          <TabButton 
            active={activeTab === 'drafts'} 
            onPress={() => handleTabChange('drafts')}
          >
  <TabText active={activeTab === 'drafts'}>Draft Claims</TabText>
</TabButton>

<TabButton 
  active={activeTab === 'all'} 
  onPress={() => handleTabChange('all')}
>
  <TabText active={activeTab === 'all'}>Submitted Claims</TabText>
</TabButton>

        </TabContainer>

        <FlatList
          data={[...groupedClaims].reverse()}
          renderItem={renderGroupedClaimItem}
          keyExtractor={(item) => item.master_claim_id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <EmptyMessage 
              data={activeTab === 'drafts' ? 'draft claims' : 'claims'} 
              action={activeTab === 'drafts' ? () => handlePress('ADD NEW') : null}
              actionText={activeTab === 'drafts' ? 'Create New Claim' : null}
              message={activeTab === 'drafts' ? 'Create New Claim' : "No Claim Found"}
              subMessage={`You don't have any claims to dispaly. Please Click on the above 'PLUS' icon to add a new claim.`}
            />
          }
        />

        
        <ApplyButton onPress={() => handlePress('ADD')} buttonText="Add New Claim" 
          icon='add-circle' currentPath={pathname}/>

        {selectedClaim && (
          <ClaimModalComponent
            isVisible={isModalVisible}
            claim={selectedClaim}
            onClose={closeModal}
            onCancelLeave={() => promptDeleteClaim(selectedClaim)}  // Add this line
            showCancelButton={selectedClaim.expense_status === 'N'}
          />
        )}

        <ConfirmationModal
          visible={showConfirmModal}
          message="Are you sure you want to submit this claim?"
          onConfirm={confirmSubmitClaim}
          onCancel={() => setShowConfirmModal(false)}
          confirmText="Yes"
          cancelText="No"
        />

        <ConfirmationModal
          visible={showDeleteConfirm}
          message="Are you sure you want to delete this claim?"
          onConfirm={handleDeleteClaim}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmText="Delete"
          cancelText="Cancel"
          confirmColor="#ff4444"
        />

        <FilterModal
  visible={showFilterModal}
  onClose={() => {
    // Reset pending filters to current active filters when closing
    setPendingFilters(JSON.parse(JSON.stringify(filters)));
    setShowFilterModal(false);
  }}
  onClearFilters={() => {
    // Clear both pending and active filters immediately
    const clearedFilters = {
      all: { status: null, claimId: null, period: 'CY' },
      drafts: { claimId: null, period: 'CY' }
    };
    
    setPendingFilters(clearedFilters);
    setFilters(clearedFilters);
    filterClaims(); // Immediately apply the cleared filters
  }}
  onApplyFilters={() => {
    // Apply the pending filters to active filters
    setFilters(JSON.parse(JSON.stringify(pendingFilters)));
    filterClaims();
    setShowFilterModal(false);
  }}
  filterConfigs={[
    ...(activeTab === 'all' ? [{
      label: "Status",
      options: statusOptions.filter(opt => opt.value !== 'N'),
      value: pendingFilters[activeTab].status,
      setValue: (value) => setPendingFilters(prev => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], status: value }
      })),
    }] : []),
    {
      label: "Claim ID",
      options: getDropdownOptions('master_claim_id'),
      value: pendingFilters[activeTab].claimId,
      setValue: (value) => setPendingFilters(prev => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], claimId: value }
      })),
    },
    {
      label: "Period",
      options: periodOptions,
      value: pendingFilters[activeTab].period,
      setValue: (value) => setPendingFilters(prev => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], period: value }
      })),
    }
  ]}
  modalTitle="Filter Claims"
/>
      </Container>
      <Loader visible={isLoading} />
      <SuccessModal
        visible={showSuccessModal}
        message={successMessage}
        onClose={() => {
          setShowSuccessModal(false);
          setActiveTab('all'); // Ensure we stay on Submitted Claims tab
        }}
      />
      <ErrorModal
        visible={showErrorModal}
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />
    </SafeAreaView>
  );
};

export default ClaimScreen;
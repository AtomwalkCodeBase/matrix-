import React, { useState } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import styled from 'styled-components/native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../Styles/appStyle';
import ConfirmationModal from './ConfirmationModal';

const TravelModal = ({ isVisible, travelRequest, onClose, onCancelRequest, showCancelButton }) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Format currency in Indian style
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

  // Get icon configuration for travel mode
  const getTravelModeIcon = (mode) => {
    // console.log("Travel mode===",mode)
    const modeLower = mode?.toLowerCase() || '';
    switch(modeLower) {
      case 'air': 
      case 'flight': 
        return { icon: 'flight', iconSet: MaterialIcons, color: '#3F51B5', label: 'Flight' };
      case 'train': 
        return { icon: 'train', iconSet: MaterialCommunityIcons, color: '#795548', label: 'Train' };
      case 'bus': 
        return { icon: 'bus', iconSet: MaterialCommunityIcons, color: '#FF9800', label: 'Bus' };
      case 'car': 
        return { icon: 'taxi', iconSet: MaterialCommunityIcons, color: '#FF5722', label: 'Taxi' };
      case 'slf': 
        return { icon: 'car', iconSet: MaterialCommunityIcons, color: '#607D8B', label: 'Own Car' };
      default: 
        return { icon: 'directions', iconSet: MaterialIcons, color: '#9C27B0', label: 'Other' };
    }
  };

  // Render status badge with appropriate colors
  const renderStatusBadge = (status) => {
    const statusLower = status?.toLowerCase() || '';
    let backgroundColor, textColor;
    
    switch(statusLower) {
      case 'booked':
        backgroundColor = '#E8F5E9';
        textColor = '#2E7D32';
        break;
      case 'approved':
        backgroundColor = '#E3F2FD';
        textColor = '#1565C0';
        break;
      case 'draft':
        backgroundColor = '#FFF8E1';
        textColor = '#FF8F00';
        break;
      case 'rejected':
      case 'cancelled':
        backgroundColor = '#FFEBEE';
        textColor = '#C62828';
        break;
      default:
        backgroundColor = '#F5F5F5';
        textColor = '#424242';
    }
    
    return (
      <StatusBadge style={{ backgroundColor }}>
        <StatusBadgeText style={{ color: textColor }}>{status}</StatusBadgeText>
      </StatusBadge>
    );
  };

  // Compact travel mode display
  const renderTravelMode = () => {
    const modeConfig = getTravelModeIcon(travelRequest.travel_mode);
    const ModeIcon = modeConfig.iconSet;
    
    return (
      <TravelModeContainer>
        <ModeIcon 
          name={modeConfig.icon} 
          size={16} 
          color={modeConfig.color} 
          style={{ marginRight: 6 }}
        />
        <TravelModeText>{modeConfig.label}</TravelModeText>
      </TravelModeContainer>
    );
  };

  // DRY method: Create travel payload with configurable call mode
  const createTravelPayload = (callMode) => {
    return {
      call_mode: callMode,
      emp_id: travelRequest.emp_id,
      travel_mode: travelRequest.travel_mode,
      to_city: travelRequest.to_city,
      remarks: travelRequest.remarks,
      start_date: travelRequest.start_date,
      end_date: travelRequest.end_date,
      is_accommodation: travelRequest.is_accommodation,
      advance_required: travelRequest.advance_required,
      advance_amt: travelRequest.advance_amt,
      travel_purpose: travelRequest.travel_purpose,
      project_code: travelRequest.project_code,
      travel_id: travelRequest.travel_id
    };
  };

  // Handle cancel request confirmation
  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    const cancelPayload = createTravelPayload('CANCEL');
    onCancelRequest(cancelPayload);
    onClose();
  };

  // Render all details in a compact layout
const renderDetails = () => {
  if (!travelRequest) return null;

  const detailConfigs = [
    { label: 'Travel ID', value: travelRequest.travel_id },
    { label: 'Employee', value: travelRequest.employee_name },
    { label: 'Destination', value: travelRequest.to_city },
    {
      label: 'Travel Mode',
      value: renderTravelMode(), // JSX
      customComponent: true,
      isCompact: true
    },
    {
      label: 'Duration',
      value: `${travelRequest.start_date} to ${travelRequest.end_date}`
    },
    {
      label: 'Project',
      value: `${travelRequest.project_name ? `${travelRequest.project_name} (${travelRequest.project_code})` : "--"}`
    },
    { label: 'Purpose', value: travelRequest.travel_purpose },
    travelRequest.advance_required && {
      label: 'Advance Amount',
      value: formatIndianCurrency(travelRequest.advance_amt),
      isCurrency: true
    },
    {
      label: 'Status',
      customComponent: true,
      component: renderStatusBadge(travelRequest.status_display)
    },
    travelRequest.a_remarks && {
      label: 'Approver Remarks',
      value: travelRequest.a_remarks,
      isFooter: true
    },
    travelRequest.remarks && {
      label: 'Remarks',
      value: travelRequest.remarks,
      isFooter: true
    }
  ].filter(Boolean);

  return (
    <DetailsContainer>
      {detailConfigs.map((item, index) => (
        <React.Fragment key={index}>
          
          {/* HEADER ROW */}
          {item.isHeader && (
            <>
              {/* <HeaderDivider /> */}
              <HeaderLabel>{item.label}</HeaderLabel>
            </>
          )}

          {/* NORMAL DETAIL ROW */}
          <DetailRow compact={item.isCompact}>
            <DetailLabel>{item.label}:</DetailLabel>
            {item.customComponent
              ? item.component || item.value
              : <DetailValue isCurrency={item.isCurrency}>{item.value}</DetailValue>
            }
          </DetailRow>

          {/* FOOTER ROW */}
          {/* {item.isFooter && <FooterDivider />} */}
        </React.Fragment>
      ))}
    </DetailsContainer>
  );
};


  // Action button logic
  const getActionButton = () => {
    if (!showCancelButton) {
      return (
        <ActionButton onPress={onClose}>
          <ActionButtonText>CLOSE</ActionButtonText>
        </ActionButton>
      );
    }

    return (
      <ActionButton onPress={() => setShowConfirmModal(true)} danger>
        <ActionButtonText>CANCEL REQUEST</ActionButtonText>
      </ActionButton>
    );
  };

  return (
    <>
      <Modal visible={isVisible} transparent={true} animationType="fade">
        <ModalOverlay>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Travel Request Details</ModalTitle>
              <CloseButton onPress={onClose}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </CloseButton>
            </ModalHeader>

            <ModalBody>
              {renderDetails()}
            </ModalBody>

            <ModalFooter>
              {getActionButton()}
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      </Modal>

      <ConfirmationModal
        visible={showConfirmModal}
        message="Are you sure you want to cancel this travel request?"
        onConfirm={handleCancelConfirm}
        onCancel={() => setShowConfirmModal(false)}
        confirmText="Yes, Cancel"
        cancelText="No, Keep"
        color="#EF4444"
        headerTitle="Cancel Travel Request"
      />
    </>
  );
};

// Styled Components
const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
  padding: 24px;
`;

const ModalContent = styled.View`
  background-color: white;
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  overflow: hidden;
  elevation: 4;
  shadow-color: #000;
  shadow-opacity: 0.1;
  shadow-radius: 10px;
`;

const ModalHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom-width: 1px;
  border-bottom-color: #E5E7EB;
  background-color: #F9FAFB;
`;

const HeaderLabel = styled.Text`
   fontSize: 18px;
      fontWeight: bold;
      marginBottom: 0.5rem;
      borderBottom: 2px solid #ccc;
      paddingBottom: 0.25rem
`;

const ModalTitle = styled.Text`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
`;

const CloseButton = styled.TouchableOpacity`
  padding: 4px;
`;

const ModalBody = styled.View`
  padding: 16px 20px;
`;

const DetailsContainer = styled.View`
  gap: 8px;
`;

const HeaderDivider = styled.View`
  height: 1px;
  background-color: #E5E7EB;
  margin: 8px 0;
`;

const FooterDivider = styled.View`
  height: 1px;
  background-color: #E5E7EB;
  margin: 8px 0;
`;

const DetailRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-vertical: ${props => props.compact ? '2px' : '6px'};
`;

const DetailLabel = styled.Text`
  font-size: 14px;
  color: #4B5563;
  font-weight: 500;
  flex: 1;
`;

const DetailValue = styled.Text`
  font-size: 14px;
  color: #111827;
  font-weight: ${props => props.isCurrency ? '600' : '400'};
  text-align: right;
  flex: 1;
  ${props => props.isCurrency && 'font-family: monospace;'}
`;

const TravelModeContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
`;

const TravelModeText = styled.Text`
  font-size: 14px;
  color: #111827;
`;

const StatusBadge = styled.View`
  padding: 4px 10px;
  border-radius: 12px;
  align-self: flex-end;
`;

const StatusBadgeText = styled.Text`
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
`;

const ModalFooter = styled.View`
  padding: 16px 20px;
  border-top-width: 1px;
  border-top-color: #E5E7EB;
  flex-direction: row;
  justify-content: flex-end;
  background-color: #F9FAFB;
`;

const ActionButton = styled.TouchableOpacity`
  padding: 12px 20px;
  border-radius: 8px;
  background-color: ${props => props.danger ? '#EF4444' : colors.primary};
  margin-left: 12px;
  min-width: 120px;
  align-items: center;
  justify-content: center;
`;

const ActionButtonText = styled.Text`
  color: white;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.5px;
`;

export default TravelModal;
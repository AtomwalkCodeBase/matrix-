import React from 'react';
import { Image, Modal } from 'react-native';
import styled from 'styled-components/native';
// import { MaterialIcons } from '@expo/vector-icons';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { colors } from '../Styles/appStyle';

// Status configuration
const statusOptions = [
  { label: 'Submitted', value: 'S', color: '#0D47A1' },
  { label: 'Approved', value: 'A', color: '#2E7D32' },
  { label: 'Forwarded', value: 'F', color: '#7B1FA2' },
  { label: 'Rejected', value: 'R', color: '#EF4444' },
  { label: 'Back to Claimant', value: 'B', color: '#F59E0B' },
  { label: 'Draft', value: 'N', color: '#84928d' },
  { label: 'Settled', value: 'P', color: '#00C853' }, // Added Settled status
];

// Helper function to get status info
const getStatusInfo = (statusValue) => {
  const foundStatus = statusOptions.find(opt => opt.value === statusValue);
  return foundStatus || { label: statusValue, color: '#6B7280' };
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return dateString; // Add proper date formatting if needed
};

const ClaimModalComponent = ({ 
  isVisible, 
  claim, 
  onClose, 
  onCancelLeave,
  showCancelButton = false
}) => {
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


  const renderClaimDetails = () => {
    if (!claim) return null;
    const statusInfo = getStatusInfo(claim.expense_status);
    const showCost = claim.expense_cost && claim.expense_cost !== claim.expense_amt;

    return (
      <DetailContainer>
        {/* Header Section */}
        <ClaimHeader>
          <ClaimID>{claim.claim_id}</ClaimID>
          <StatusBadge statusColor={statusInfo.color}>
            <StatusText statusColor={statusInfo.color}>{statusInfo.label}</StatusText>
          </StatusBadge>
        </ClaimHeader>

        <Divider />

        <ItemName>{claim.o_item_key}</ItemName>

        <Divider />

        {/* Claim Details Section */}
        <SectionTitle>Item Details</SectionTitle>
        <DetailGroup>
          <DetailItem>
            <DetailLabel>Claim Item</DetailLabel>
            <DetailValue>{claim.item_name}</DetailValue>
          </DetailItem>
          <DetailItem>
            <DetailLabel>Submitted Date</DetailLabel>
            <DetailValue>{formatDate(claim.submitted_date)}</DetailValue>
          </DetailItem>
          
          <DetailItem>
            <DetailLabel>Expense Date</DetailLabel>
            <DetailValue>{formatDate(claim.expense_date)}</DetailValue>
          </DetailItem>
          
          <DetailItem>
            <DetailLabel>Amount</DetailLabel>
            <DetailValue>{formatIndianCurrency(claim.expense_amt)}</DetailValue>
          </DetailItem>

          <DetailItem>
            <DetailLabel>Remarks</DetailLabel>
            <RemarksText>{claim.remarks}</RemarksText>
          </DetailItem>
        </DetailGroup>

        {/* Claim Reference Section */}
        <SectionTitle>Item Reference</SectionTitle>
        <DetailGroup>
          {claim.project_name && (
            <DetailItem>
              <DetailLabel>Project</DetailLabel>
              <DetailValue>{claim.project_name}</DetailValue>
            </DetailItem>
          )}
          
          <DetailItem>
            <DetailLabel>Employee</DetailLabel>
            <DetailValue>{claim.employee_name}</DetailValue>
          </DetailItem>
        </DetailGroup>

        {/* Approval/Settlement Details Section */}
        {(claim.expense_status === 'A' || claim.expense_status === 'P') && (
          <>
            <SectionTitle>Approval Details</SectionTitle>
            <DetailGroup>
              <DetailItem>
                <DetailLabel>Approved By</DetailLabel>
                <DetailValue>{claim.approved_by}</DetailValue>
              </DetailItem>
              
              <DetailItem>
                <DetailLabel>Approved Date</DetailLabel>
                <DetailValue>{formatDate(claim.approved_date)}</DetailValue>
              </DetailItem>

              <DetailItem>
              <DetailLabel>Approved Amount</DetailLabel>
                <DetailValue>{formatIndianCurrency(claim.expense_cost)}</DetailValue>
              </DetailItem>
              
              {claim.approval_remarks && (
                <DetailItem>
                  <DetailLabel>{claim.expense_status === 'A' ? 'Approval' : 'Settlement'} Remarks</DetailLabel>
                  <RemarksText>{claim.approval_remarks}</RemarksText>
                </DetailItem>
              )}
            </DetailGroup>
          </>
        )}

        {/* Rejection Details Section */}
        {claim.expense_status === 'R' && claim.approved_date && (
          <>
            <SectionTitle>Rejection Details</SectionTitle>
            <DetailGroup>
              <DetailItem>
                <DetailLabel>Rejected By</DetailLabel>
                <DetailValue>{claim.approved_by}</DetailValue>
              </DetailItem>
              
              <DetailItem>
                <DetailLabel>Rejected Date</DetailLabel>
                <DetailValue>{formatDate(claim.approved_date)}</DetailValue>
              </DetailItem>
              
              {claim.approval_remarks && (
                <DetailItem>
                  <DetailLabel>Rejection Remarks</DetailLabel>
                  <RemarksText>{claim.approval_remarks}</RemarksText>
                </DetailItem>
              )}
            </DetailGroup>
          </>
        )}

        {/* Forwarded Details Section */}
        {claim.expense_status === 'F' && claim.approved_by && (
          <>
            <SectionTitle>Forwarded Details</SectionTitle>
            <DetailGroup>
              <DetailItem>
                <DetailLabel>Forwarded To</DetailLabel>
                <DetailValue>{claim.approved_by}</DetailValue>
              </DetailItem>
              
              {claim.approved_date && (
                <DetailItem>
                  <DetailLabel>Forwarded Date</DetailLabel>
                  <DetailValue>{formatDate(claim.approved_date)}</DetailValue>
                </DetailItem>
              )}
              
              {claim.approval_remarks && (
                <DetailItem>
                  <DetailLabel>Forward Remarks</DetailLabel>
                  <RemarksText>{claim.approval_remarks}</RemarksText>
                </DetailItem>
              )}
            </DetailGroup>
          </>
        )}

        {/* Receipt Image */}
        {claim.submitted_file_1 && (
          <>
            <SectionTitle>Receipt</SectionTitle>
            <ImageContainer>
              {claim.submitted_file_1.toLowerCase().includes('.pdf') ? (
                <PdfContainer>
                  <Feather name="file-text" size={32} color="#EF4444" />
                  <PdfFileName>
                    {claim.submitted_file_1.split('/').pop().split('?')[0]}
                  </PdfFileName>
                </PdfContainer>
              ) : (
                <ReceiptImage
                  source={{ uri: claim.submitted_file_1 }}
                  resizeMode="contain"
                />
              )}
            </ImageContainer>
          </>
        )}
      </DetailContainer>
    );
  };

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade">
      <ModalOverlay>
        <ModalContainer>
          <ModalHeader>
            <ModalTitle>Claim Item Details</ModalTitle>
            <CloseButton onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </CloseButton>
          </ModalHeader>

          <ModalBody>
            {renderClaimDetails()}
          </ModalBody>

          <ModalFooter>
            {showCancelButton && (
              <ActionButton danger onPress={onCancelLeave}>
                <ActionButtonText>DELETE ITEM</ActionButtonText>
              </ActionButton>
            )}
            
            <ActionButton onPress={onClose}>
              <ActionButtonText>CLOSE</ActionButtonText>
            </ActionButton>
          </ModalFooter>
        </ModalContainer>
      </ModalOverlay>
    </Modal>
  );
};

// Styled Components (remain the same as before)
const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
  padding: 24px;
`;

const ModalContainer = styled.View`
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
  padding: 20px;
  border-bottom-width: 1px;
  border-bottom-color: #E5E7EB;
  background-color: #F9FAFB;
`;

const ModalTitle = styled.Text`
  font-size: 18px;
  font-weight: 600;
  color: #111827;
`;

const CloseButton = styled.TouchableOpacity`
  padding: 4px;
  border-radius: 20px;
  background-color: #F3F4F6;
`;

const ModalBody = styled.View`
  padding: 20px;
  max-height: 500px;
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
  padding: 12px 16px;
  border-radius: 8px;
  background-color: ${props => props.danger ? '#EF4444' : colors.primary};
  margin-left: 12px;
  min-width: 100px;
  align-items: center;
  justify-content: center;
`;

const ActionButtonText = styled.Text`
  color: white;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.5px;
`;

const DetailContainer = styled.ScrollView`
  gap: 16px;
`;

const ClaimHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
`;

const ClaimID = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  flex: 1;
  flex-wrap: wrap;
  margin-right: 8px;
`;

const ItemName = styled.Text`
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin-top: 2px;
`;

const StatusBadge = styled.View`
  padding: 4px 12px;
  border-radius: 12px;
  background-color: ${props => props.statusColor ? `${props.statusColor}20` : '#F3F4F6'};
  border: 1px solid ${props => props.statusColor || '#D1D5DB'};
  flex-shrink: 0;
`;

const StatusText = styled.Text`
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.statusColor || '#374151'};
`;

const Divider = styled.View`
  height: 1px;
  background-color: #E5E7EB;
  margin-vertical: 8px;
`;

const SectionTitle = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
`;

const DetailGroup = styled.View`
  gap: 8px;
  margin-bottom: 12px;
  background-color: #F9FAFB;
  padding: 12px;
  border-radius: 8px;
`;

const DetailItem = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 4px;
`;

const DetailLabel = styled.Text`
  font-size: 14px;
  color: #4B5563;
  font-weight: 500;
  width: 40%;
  flex-shrink: 0;
`;

const DetailValue = styled.Text`
  font-size: 14px;
  color: #111827;
  font-weight: 400;
  flex: 1;
  text-align: right;
  flex-wrap: wrap;
  margin-left: 8px;
`;

const RemarksText = styled.Text`
  font-size: 14px;
  color: #374151;
  line-height: 20px;
`;

const ImageContainer = styled.View`
  margin-top: 8px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #E5E7EB;
`;

const ReceiptImage = styled.Image`
  width: 100%;
  height: 200px;
  background-color: #F3F4F6;
`;

const PdfContainer = styled.View`
  padding: 20px;
  align-items: center;
  justify-content: center;
  background-color: #F3F4F6;
`;

const PdfFileName = styled.Text`
  margin-top: 8px;
  font-size: 12px;
  color: #374151;
  text-align: center;
`;

export default ClaimModalComponent;
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import RemarksInput from './RemarkInput';
import DropdownPicker from './DropdownPicker';
import AmountInput from './AmountInput';
import ActionDropdown from './ClaimActionDropdown';

const ClaimItemCard = ({ 
  item, 
  isSelected, 
  isDisabled, 
  isLimited,
  expanded,
  validationResult,
  managers,
  onToggleExpand,
  onToggleSelect,
  onActionChange,
  onAmountChange,
  onForwardManagerChange,
  onRemarkChange,
  itemActions,
  errors,
  formatIndianCurrency
}) => {
  const [itemRemark, setItemRemark] = useState('');

  const handleActionChange = (action) => {
    onActionChange(item.id, action);
  };

 const handleAmountChange = (amount) => {
  // Ensure we handle empty string properly
  onAmountChange(item.id, amount === '' ? '' : amount);
};

  const handleForwardManagerChange = (managerId) => {
    onForwardManagerChange(item.id, managerId);
  };

  const handleRemarkChange = (text) => {
    setItemRemark(text);
    onRemarkChange(item.id, text);
  };

  return (
    <View style={[
      styles.itemContainer, 
      isDisabled && styles.disabledItem, 
      isLimited && styles.limitedItem
    ]}>
      <TouchableOpacity 
          onPress={() => {
          if (isSelected && !isDisabled) {
            onToggleExpand();
          }
        }}
        activeOpacity={0.8}
        style={styles.itemHeaderTouchable}
        disabled={isDisabled}
      >
        <View style={styles.itemHeader}>
          {!isDisabled ? (
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                onToggleSelect(); // Removed the isLimited check here
              }}
              style={styles.checkboxContainer}
              disabled={isDisabled} // Only disable if item is already approved/rejected
            >
              <View style={[
                styles.checkbox, 
                isSelected && styles.checkboxSelected,
                isLimited && styles.checkboxLimited
              ]}>
                {isSelected && (
                  <MaterialIcons name="check" size={16} color="white" />
                )}
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.statusIconContainer}>
              <MaterialIcons 
                name={item.expense_status === 'A' ? 'check-circle' : 'cancel'} 
                size={22} 
                color={item.expense_status === 'A' ? '#27ae60' : '#e74c3c'} 
              />
            </View>
          )}
          
          <View style={styles.itemTitleContainer}>
            <Text style={[
              styles.itemTitle,
              isDisabled && styles.disabledText,
              isLimited && styles.limitedText
            ]} numberOfLines={1} ellipsizeMode="tail">
              {item.item_name}
            </Text>
            {item.project_name && (
              <Text style={[
                styles.itemProject,
                isDisabled && styles.disabledText,
                isLimited && styles.limitedText
              ]} numberOfLines={1}>
                {item.project_name}
              </Text>
            )}
            {item.claim_id && (
              <Text style={[
                styles.itemProject,
                isDisabled && styles.disabledText,
                isLimited && styles.limitedText
              ]} numberOfLines={1}>
                {item.claim_id}
              </Text>
            )}
            {item.expense_date && (
              <Text style={[
                styles.itemProject,
                isDisabled && styles.disabledText,
                isLimited && styles.limitedText
              ]} numberOfLines={1}>
                Expense Date: {item.expense_date}
              </Text>
            )}
            {isLimited && validationResult?.limitRemarks && (
              <Text style={styles.limitRemarksText}>
                {validationResult.limitRemarks}
              </Text>
            )}
          </View>
          
          <View style={styles.itemAmountContainer}>
            <Text style={[
              styles.itemAmount,
              isDisabled && styles.disabledText,
              isLimited && styles.limitedText
            ]}>
              {formatIndianCurrency(parseFloat(item.expense_amt).toFixed(2))}
            </Text>
            {(isSelected && !isDisabled) && (
              <MaterialIcons 
                name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
                size={24} 
                color={isLimited ? '#e67e22' : '#666'} 
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.actionSection}>
          <Text style={styles.sectionSubtitle}>Action Required</Text>
          
          {isLimited ? (
            <View style={styles.limitedActionContainer}>
              <Text style={styles.limitedActionText}>
                This item requires forwarding due to: {validationResult.limitRemarks}
              </Text>
              
              <View style={styles.managerDropdownContainer}>
                <Text style={styles.detailLabel}>Forward To:</Text>
                <View style={styles.managerDisplay}>
                  <Text style={styles.managerDisplayText}>
                    {managers.find(m => m.emp_id === validationResult.forwardManager)?.name || 
                     validationResult.forwardManager}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <>
              
              <ActionDropdown
                item={item}
                itemActions={itemActions}
                onActionChange={onActionChange}
                // isDisabled={isDisabled}
              />
              
              {(itemActions?.action === 'APPROVE' || itemActions?.action === 'FORWARD') && (
  <View style={styles.amountInputContainer}>
    <Text style={styles.detailLabel}>Approval Amount:</Text>
    <AmountInput
      label=""
      claimAmount={itemActions?.approvedAmount || ''} // Ensure empty string as fallback
      setClaimAmount={handleAmountChange}
      error={errors[`itemAmount-${item.id}`]}
      style={styles.amountInput}
      disabled={isDisabled}
    />
  </View>
)}
              
              {itemActions?.action === 'FORWARD' && (
                <View style={styles.managerDropdownContainer}>
                  <Text style={styles.detailLabel}>Forward To:</Text>
                  <DropdownPicker
                    data={managers.map(m => ({
                      label: `${m.name} [${m.emp_id}]`,
                      value: m.emp_id
                    }))}
                    value={itemActions?.forwardManager}
                    setValue={handleForwardManagerChange}
                    placeHolder="Manager"
                    style={styles.managerDropdown}
                    containerStyle={styles.dropdownContainer}
                    disabled={isDisabled}
                  />
                </View>
              )}
            </>
          )}
          
          <RemarksInput
            remark={itemActions?.remarks || ''}
            setRemark={handleRemarkChange}
            error={errors[`itemRemarks-${item.id}`]}
            placeholder="Enter remarks for this item..."
            disabled={isDisabled}
          />
        </View>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  itemContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  limitedItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#e67e22',
  },
  disabledItem: {
    opacity: 0.7,
    backgroundColor: '#f9f9f9',
  },
  itemHeaderTouchable: {
    paddingVertical: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  checkboxContainer: {
    padding: 4,
    marginRight: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#bdc3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  checkboxLimited: {
    borderColor: '#e67e22',
  },
  statusIconContainer: {
    width: 22,
    height: 22,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2c3e50',
  },
  limitedText: {
    color: '#e67e22',
  },
  disabledText: {
    color: '#95a5a6',
  },
  itemProject: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 2,
  },
  limitRemarksText: {
    fontSize: 12,
    color: '#e67e22',
    marginTop: 2,
    fontStyle: 'italic',
  },
  itemAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#27ae60',
    marginRight: 8,
  },
   actionSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  limitedActionContainer: {
    backgroundColor: '#fff8e1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  limitedActionText: {
    color: '#e65100',
    fontSize: 14,
    marginBottom: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  actionButtonActive: {
    borderWidth: 2,
  },
  approveButtonActive: {
    borderColor: '#2e7d32',
    backgroundColor: '#e8f5e9',
  },
  rejectButtonActive: {
    borderColor: '#c62828',
    backgroundColor: '#ffebee',
  },
  forwardButtonActive: {
    borderColor: '#1565c0',
    backgroundColor: '#e3f2fd',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#424242',
  },
  actionButtonTextActive: {
    fontWeight: '600',
  },
  detailLabel: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 6,
  },
  amountInputContainer: {
    marginBottom: 16,
  },
  managerDropdownContainer: {
    marginBottom: 16,
  },
  managerDisplay: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
  },
  managerDisplayText: {
    fontSize: 14,
    color: '#212121',
  },
  dropdownContainer: {
    marginTop: 6,
  },
});

export default ClaimItemCard;
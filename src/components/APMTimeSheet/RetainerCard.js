
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../Styles/appStyle';

// Reusable Info Row Component
const InfoRow = ({ icon, label, value, iconLibrary = 'Ionicons', iconColor = colors.primary }) => {
  const IconComponent = iconLibrary === 'MaterialIcons' ? MaterialIcons : Ionicons;
  
  return (
    <View style={styles.infoRow}>
      <View style={styles.iconLabelContainer}>
        <IconComponent name={icon} size={18} color={iconColor} style={styles.icon} />
        <Text style={styles.label}>{label}:</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

// Reusable Action Button Component
const ActionButton = ({ icon, label, onPress, variant = 'primary', iconLibrary = 'Ionicons' }) => {
  const IconComponent = iconLibrary === 'MaterialIcons' ? MaterialIcons : Ionicons;
  const buttonStyle = [
    styles.actionButton,
    variant === 'secondary' && styles.actionButtonSecondary,
    variant === 'danger' && styles.actionButtonDanger
  ];
  
  const iconColor = variant === 'primary' ? colors.white : 
                    variant === 'danger' ? colors.danger : colors.primary;
  
  return (
    <TouchableOpacity style={buttonStyle} onPress={onPress}>
      <IconComponent name={icon} size={20} color={iconColor} />
      <Text style={[
        styles.buttonText,
        variant !== 'primary' && styles.buttonTextOutline
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// Main Retainer Card Component
const RetainerCard = ({ retainer, onEdit, onDelete, onViewDetails, onAssignResources }) => {
    console.log("retainer", retainer)
  return (
    <View style={styles.card}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={24} color={colors.white} />
          </View>
          <View>
            <Text style={styles.employeeName}>{retainer.employee_name}</Text>
            <Text style={styles.empId}>ID: {retainer.emp_id}</Text>
          </View>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Active</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Info Section */}
      <View style={styles.infoSection}>
        <InfoRow 
          icon="people" 
          label="Resources" 
          value={retainer.no_resource} 
        />
        <InfoRow 
          icon="calendar" 
          label="Start Date" 
          value={retainer.start_date} 
        />
        <InfoRow 
          icon="calendar-outline" 
          label="End Date" 
          value={retainer.end_date} 
        />
        <InfoRow 
          icon="clipboard" 
          iconLibrary="FontAwesome5"
          label="Items to Audit" 
          value={retainer.no_of_items} 
        />
        
        {/* Additional Info - Conditional Rendering */}
        {/* {retainer.department && (
          <InfoRow 
            icon="business" 
            label="Department" 
            value={retainer.department} 
          />
        )}
        {retainer.location && (
          <InfoRow 
            icon="location" 
            label="Location" 
            value={retainer.location} 
          />
        )} */}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <ActionButton 
          icon="eye" 
          label="Start" 
          onPress={() => onViewDetails(retainer)}
          variant="secondary"
        />
        <ActionButton 
          icon="pencil" 
          iconLibrary="MaterialIcons"
          label="Edit" 
          onPress={() => onEdit(retainer)}
          variant="primary"
        />
        <ActionButton 
          icon="trash" 
          label="End" 
          onPress={() => onDelete(retainer)}
          variant="danger"
        />
      </View>
    </View>
  );
};

export default RetainerCard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  countText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  empId: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  infoSection: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  iconLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  label: {
    fontSize: 14,
    color: colors.textLight,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  actionSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonDanger: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  buttonTextOutline: {
    color: colors.primary,
  },
});
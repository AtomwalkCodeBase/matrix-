import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import { colors1 } from '../Styles/appStyle';
import StatusBadge from '../components/StatusBadge';
import CustomButton from '../components/CustomButton';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const ModuleDetailsScreen = () => {
  const navigation = useNavigation();
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
const { item } = useLocalSearchParams();
const data = JSON.parse(item); // Parse back into object



  // Extract data from enrolled training
  // const data = item;
const isFromEnrolled = !!data.t_session_data;
const sessionData = isFromEnrolled ? data.t_session_data : data;
const moduleData = sessionData.t_module_data;

  // Get status info
  const getStatusInfo = () => {
    switch (data.training_status) {
      case 'E': return { label: 'Enrolled', color: colors1.primary, bgColor: '#E3F2FD' };
      case 'A': return { label: 'Attended', color: '#2196F3', bgColor: '#E1F5FE' };
      case 'S': return { label: 'Successfully Completed', color: '#4CAF50', bgColor: '#E8F5E8' };
      case 'F': return { label: 'Failed', color: '#F44336', bgColor: '#FFEBEE' };
      case 'N': return { label: 'Not Attended', color: '#FF5722', bgColor: '#FFF3E0' };
      case 'X': return { label: 'Cancelled', color: '#9E9E9E', bgColor: '#F5F5F5' };
      default: return { label: 'Active', color: colors1.primary, bgColor: '#E3F2FD' };
    }
  };

  const statusInfo = getStatusInfo();

  const downloadCertificate = () => {
    if (data.certificate_file) {
      // Implement certificate download logic
      Alert.alert('Download', 'Certificate download started');
    }
  };

  const shareCertificate = () => {
    if (data.certificate_file) {
      // Implement certificate sharing logic
      Alert.alert('Share', 'Certificate sharing options');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerImageContainer}>
            <Image
              source={{ 
                uri: moduleData.image
              }}
              style={styles.headerImage}
              resizeMode="cover"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
            />
            <View style={styles.headerGradient} />
            
            <View style={styles.headerContent}>
              <View style={styles.headerTop}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  {/* <Text style={styles.backButtonText}>←</Text> */}
                  <AntDesign name="arrow-left" size={20} color={colors1.white} />
                </TouchableOpacity>
                
                <StatusBadge 
                  status={statusInfo.label}
                  backgroundColor={statusInfo.color}
                />
              </View>
              
              <View style={styles.headerBottom}>
                <Text style={styles.headerTitle}>{sessionData.name}</Text>
                <Text style={styles.headerSubtitle}>
                  {moduleData.training_code} • {moduleData.name}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          {/* Status Card */}
          <View style={[styles.statusCard, { backgroundColor: statusInfo.bgColor }]}>
            <View style={styles.statusRow}>
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>Training Status</Text>
                <Text style={[styles.statusValue, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
              
              {data.t_score && parseFloat(data.t_score) > 0 && (
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreLabel}>Score</Text>
                  <Text style={styles.scoreValue}>{data.t_score}%</Text>
                </View>
              )}
            </View>
            
            {data.completed_date && (
              <Text style={styles.completedDate}>
                Completed on: {new Date(data.completed_date).toLocaleDateString()}
              </Text>
            )}
          </View>

          {/* Certificate Section */}
          {data.certificate_file && (
            <View style={styles.certificateSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🏆 Certificate</Text>
                <Text style={styles.sectionSubtitle}>Your training certificate is ready!</Text>
              </View>
              
              <View style={styles.certificateCard}>
                <View style={styles.certificateIcon}>
                  <Text style={styles.certificateEmoji}>📜</Text>
                </View>
                
                <View style={styles.certificateInfo}>
                  <Text style={styles.certificateTitle}>Training Certificate</Text>
                  <Text style={styles.certificateDescription}>
                    Certificate of completion for {sessionData.name}
                  </Text>
                </View>
                
                <View style={styles.certificateActions}>
                  <TouchableOpacity 
                    style={styles.certificateButton}
                    onPress={() => setShowCertificateModal(true)}
                  >
                    <Text style={styles.certificateButtonText}>View</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.certificateButton, styles.downloadButton]}
                    onPress={downloadCertificate}
                  >
                    <Text style={[styles.certificateButtonText, styles.downloadButtonText]}>
                      Download
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Module Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📚 Module Details</Text>
            
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Training Code</Text>
                <Text style={styles.detailValue}>{moduleData.training_code}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Training Type</Text>
                <Text style={styles.detailValue}>{moduleData.training_type}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>
                  {moduleData.no_of_days} {moduleData.no_of_days === 1 ? 'Day' : 'Days'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Credits</Text>
                <Text style={styles.detailValue}>{moduleData.no_of_credit}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Version</Text>
                <Text style={styles.detailValue}>{moduleData.version}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Issue Date</Text>
                <Text style={styles.detailValue}>{moduleData.issue_date}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Effective Date</Text>
                <Text style={styles.detailValue}>{moduleData.effective_date}</Text>
              </View>
              
              {moduleData.is_mandatory && (
                <View style={styles.mandatoryRow}>
                  <View style={styles.mandatoryBadge}>
                    <Text style={styles.mandatoryText}>⚠️ Mandatory Training</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Session Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Session Information</Text>
            
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Trainer</Text>
                <Text style={styles.detailValue}>{sessionData.trainer_name}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Organization</Text>
                <Text style={styles.detailValue}>{sessionData.trainer_organisation}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Session Date</Text>
                <Text style={styles.detailValue}>{sessionData.session_date}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{sessionData.location}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Max Attendance</Text>
                <Text style={styles.detailValue}>{sessionData.max_attendance_count}</Text>
              </View>
            </View>
          </View>

          {/* Description Section */}
          {(sessionData.description || moduleData.remarks) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Description</Text>
              
              <View style={styles.descriptionCard}>
                <Text style={styles.descriptionText}>
                  {sessionData.description || moduleData.remarks}
                </Text>
              </View>
            </View>
          )}

          {/* Employee Information */}
         {isFromEnrolled && <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Enrollment Details</Text>
            
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Employee ID</Text>
                <Text style={styles.detailValue}>{data.emp_id}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Employee Name</Text>
                <Text style={styles.detailValue}>{data.employee_name}</Text>
              </View>
              
              {/* <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Approval Status</Text>
                <Text style={[
                  styles.detailValue, 
                  { color: data.is_approved ? '#4CAF50' : '#FF9800' }
                ]}>
                  {data.is_approved ? '✓ Approved' : '⏳ Pending'}
                </Text>
              </View> */}
              
              {/* <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Qualification Status</Text>
                <Text style={[
                  styles.detailValue, 
                  { color: data.is_qualified ? '#4CAF50' : '#F44336' }
                ]}>
                  {data.is_qualified ? '✓ Qualified' : '✗ Not Qualified'}
                </Text>
              </View> */}
            </View>
          </View>}
        </View>
      </ScrollView>

      {/* Certificate Modal */}
      <Modal
        visible={showCertificateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCertificateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.certificateModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Training Certificate</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowCertificateModal(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.certificatePreview}>
              {data.certificate_file ? (
                <Image
                  source={{ uri: data.certificate_file }}
                  style={styles.certificateImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.certificatePlaceholder}>
                  <Text style={styles.placeholderText}>📜</Text>
                  <Text style={styles.placeholderTitle}>Certificate Preview</Text>
                  <Text style={styles.placeholderSubtitle}>
                    Certificate for {sessionData.name}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.modalActions}>
              <CustomButton
                title="Share Certificate"
                onPress={shareCertificate}
                style={styles.modalButton}
              />
              <CustomButton
                title="Download"
                onPress={downloadCertificate}
                style={[styles.modalButton, styles.downloadModalButton]}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  
  // Header Styles
  header: {
    height: 280,
    position: 'relative',
  },
  headerImageContainer: {
    flex: 1,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  headerContent: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    justifyContent: 'space-between',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: Platform.OS === 'ios' ? 0 : 0,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: colors1.white,
    fontWeight: 'bold',
  },
  headerBottom: {
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors1.white,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },

  // Content Styles
  contentContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
  },

  // Status Card
  statusCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: colors1.subText,
    fontWeight: '500',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: colors1.subText,
    fontWeight: '500',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4CAF50',
  },
  completedDate: {
    fontSize: 12,
    color: colors1.subText,
    fontStyle: 'italic',
  },

  // Certificate Section
  certificateSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors1.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors1.subText,
  },
  certificateCard: {
    backgroundColor: colors1.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  certificateIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  certificateEmoji: {
    fontSize: 24,
  },
  certificateInfo: {
    flex: 1,
  },
  certificateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors1.text,
    marginBottom: 4,
  },
  certificateDescription: {
    fontSize: 12,
    color: colors1.subText,
  },
  certificateActions: {
    flexDirection: 'row',
  },
  certificateButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors1.primary,
    marginLeft: 8,
  },
  certificateButtonText: {
    fontSize: 12,
    color: colors1.primary,
    fontWeight: '600',
  },
  downloadButton: {
    backgroundColor: colors1.primary,
  },
  downloadButtonText: {
    color: colors1.white,
  },

  // Section Styles
  section: {
    marginBottom: 24,
  },
  detailsCard: {
    backgroundColor: colors1.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 14,
    color: colors1.text,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: colors1.subText,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  mandatoryRow: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  mandatoryBadge: {
    backgroundColor: '#FFE0E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mandatoryText: {
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: '600',
  },

  // Description Card
  descriptionCard: {
    backgroundColor: colors1.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  descriptionText: {
    fontSize: 14,
    color: colors1.text,
    lineHeight: 22,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  certificateModal: {
    backgroundColor: colors1.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors1.text,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: colors1.text,
    fontWeight: 'bold',
  },
  certificatePreview: {
    padding: 20,
    alignItems: 'center',
    minHeight: 300,
    justifyContent: 'center',
  },
  certificateImage: {
    width: '100%',
    height: 250,
  },
  certificatePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  placeholderText: {
    fontSize: 60,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors1.text,
    marginBottom: 8,
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: colors1.subText,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 12,
  },
  downloadModalButton: {
    backgroundColor: colors1.primary,
  },
});

export default ModuleDetailsScreen;
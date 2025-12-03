import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, Image, StatusBar, TouchableOpacity, ScrollView, Dimensions, StyleSheet, Platform, RefreshControl, Animated, Alert, FlatList, TextInput, ActivityIndicator, BackHandler } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppContext } from '../../context/AppContext';
import { useRouter } from "expo-router";
import Loader from '../components/old_components/Loader';
import NetInfo from '@react-native-community/netinfo';
import moment from 'moment';
import { useLayoutEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons, FontAwesome5, Feather, MaterialCommunityIcons, } from '@expo/vector-icons';
import { getEvents } from '../services/productServices';
import Modal from 'react-native-modal';
import RemarksInput from '../components/RemarkInput';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import Sidebar from '../components/Sidebar';
import ErrorModal from '../components/ErrorModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../Styles/appStyle';

const { width, height } = Dimensions.get('window');

const HomePage = ({ navigation }) => {
  const router = useRouter();
  const { 
    profile, 
    companyInfo, 
    isLoading,
    // Attendance states from context
    employeeData,
    setEmployeeData,
    setCurrentDate,
    setCurrentTimeStr,
    checkedIn,
    attendance,
    refreshKey,
    setRefreshKey,
    remark,
    setRemark,
    errors,
    previousDayUnchecked,
    isYesterdayCheckout,
    // Geolocation states from context
    geoLocationDataMissing,
    showEffortConfirmModal,
    setShowEffortConfirmModal,
    setTimesheetCheckedToday,
    // Attendance functions from context
    setdatatime,
    handleCheck,
    handleRemarkSubmit,
    handleYesterdayCheckout,
    handleCheckOutAttempt,
    initializeGeoLocationConfig,
    refreshData
  } = useContext(AppContext);
  const [loading, setIsLoading] = useState(false);
  // const [profile, setProfile] = useState({});
  const [company, setCompany] = useState({});
  const [empId, setEmpId] = useState('');
  const [empNId, setEmpNId] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [isManager, setIsManager] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isBirthday, setIsBirthday] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Local modal states
  const [localRemarkModalVisible, setLocalRemarkModalVisible] = useState(false);
  const [localSuccessModalVisible, setLocalSuccessModalVisible] = useState(false);
  const [localConfirmModalVisible, setLocalConfirmModalVisible] = useState(false);
  const [localAttendanceErrorMessage, setLocalAttendanceErrorMessage] = useState({
    message: "",
    visible: false
  });

  // Active events
  const [eventData, setEventData] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [eventLoading, setEventLoading] = useState(true);

  const fadeAnim = useState(new Animated.Value(0))[0];
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  useLayoutEffect(() => {
    if (navigation) {
      navigation.setOptions({
        headerShown: false,
      });
    }
  }, [navigation]);

  useEffect(() => {
    // fetchEvents();
    setCompany(companyInfo);
  }, [empId, companyInfo]);



  useFocusEffect(
  useCallback(() => {
    const onBackPress = () => {
      setShowExitModal(true); // ✅ Open exit confirmation modal
      return true; // ✅ Prevent default back behavior
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    return () => subscription.remove();
  }, [])
);


  useEffect(() => {
    // Initialize profile data and fetch events
    const initializeData = async () => {
      if (!profile) return;
      
      setEmployeeData(profile);
      setEmpId(profile.emp_id);
      setEmpNId(profile.id);
      setIsManager(profile?.is_manager || false);

      // Set current date and time
      const now = moment();
      setCurrentDate(now.format('DD-MM-YYYY'));
      setCurrentTimeStr(await setdatatime());

      // Initialize geolocation configuration
      if (profile && companyInfo) {
        initializeGeoLocationConfig(companyInfo, [profile], setLocalAttendanceErrorMessage);
      }

      // Fetch events
      // await fetchEvents();
    };

    initializeData();

    const updateGreeting = () => {
      const currentHour = new Date().getHours();
      if (currentHour < 12) {
        setGreeting('Good Morning');
      } else if (currentHour < 17) {
        setGreeting('Good Afternoon');
      } else {
        setGreeting('Good Evening');
      }
    };

    updateGreeting();

    const interval = setInterval(() => {
      setCurrentTime(new Date());
      updateGreeting();
    }, 60000);

    const netInfoUnsubscribe = NetInfo.addEventListener(state => {
      if (!isConnected && state.isConnected) {
        // Refresh events when network is restored
        fetchEvents();
      }
      setIsConnected(state.isConnected);
    });

    return () => {
      clearInterval(interval);
      netInfoUnsubscribe();
    };
  }, [isConnected, profile]);

  useFocusEffect(
    useCallback(() => {
      if (employeeData?.id) {
        refreshData();
      }
    }, [employeeData, refreshKey])
  );



  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshKey((prevKey) => prevKey + 1);
    // fetchData() is no longer needed since attendance data is handled by context
    setRefreshing(false);
  };

  const handlePressApproveLeave = () => {
    router.push({
      pathname: 'ApproveLeaves',
      params: { empNId },
    });
  };

  const handleEventPress = (event) => {
    router.push({
      pathname: 'EventDetails',
      params: {
        eventDetails: JSON.stringify(event)
      },
    });
  };


  const menuItems = [
    //  ...(isManager ? [{
    //   id: 1,
    //   title: 'Project DashBoard',
    //   // icon: <FontAwesome5 name="user-clock" size={24} color="#a970ff" />,
    //   icon: <MaterialCommunityIcons name="view-dashboard-outline" size={24} color={colors.primary} />,
    //   onPress: () =>  router.push({pathname: 'ManagerTimeSheet'})
    // }] : []),
    {
      id: 2,
      title: 'Timesheet',
      icon: <MaterialCommunityIcons name="timetable" size={24} color={colors.primary} />,
      onPress: () => router.push('TimeSheet')
    },
    {
      id: 3,
      title: 'Leaves',
      icon: <FontAwesome5 name="calendar-alt" size={24} color={colors.primary} />,
      onPress: () => router.push('LeaveScreen')
    },
    // {
    //   id: 5,
    //   title: 'Claims',
    //   icon: <FontAwesome5 name="rupee-sign" size={24} color={colors.primary} />,
    //   onPress: () => router.push('ClaimScreen')
    // },
    // ...(isManager ? [{
    //   id: 6,
    //   title: 'Approve Claims',
    //   icon: <FontAwesome5 name="money-bill-wave-alt" size={24} color={colors.primary} />,
    //   onPress: () => router.push('ApproveClaim')
    // }] : []),
    {
      id: 7,
      title: 'Holiday',
      icon: <FontAwesome5 name="umbrella-beach" size={24} color={colors.primary} />,
      onPress: () => router.push('HolidayList')
    },
    {
      id: 8,
      title: 'Travel Request',
      icon: <MaterialCommunityIcons name="airplane" size={24} color={colors.primary} />,
      onPress: () => router.push({ pathname: 'TravelScreen', params: { empId },})
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right",]}>
      {(isLoading) && (
        <View style={styles.loaderContainer}>
          <Loader visible={true} />
        </View>
      )}

      {/* Curved Header */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={[colors.primary, colors.primary]}
          start={[0, 0]}
          end={[1, 1]}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerTopContent}>
              <View style={styles.companySection}>
                {company.image ? (
                  <Image
                    source={{ uri: company.image }}
                    style={styles.companyLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.companyPlaceholder}>
                    <MaterialIcons name="business" size={40} color="#fff" />
                  </View>
                )}
                <Text style={styles.companyName}>
                  {company.name || 'ATOMWALK'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.welcomeSection}>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName} onPress={() => router.push('profile')}>
              {profile?.name ? `${profile?.name}` : 'Employee'}
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >

        {/* Quick Actions Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Menu</Text>
          <View style={styles.menuGrid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconContainer}>
                  {item.icon}
                </View>
                <Text style={styles.menuItemText}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={showExitModal}
        message="Are you sure you want to exit the app?"
        onConfirm={() => {
          setShowExitModal(false); // Close the modal
          setTimeout(() => {
            BackHandler.exitApp(); // Exit app after short delay
          }, 250); // Delay for modal to close (adjust if needed)
          }}
        onCancel={() => setShowExitModal(false)}
        confirmText="Exit"
        cancelText="Cancel"
      />

      <ErrorModal
        visible={localAttendanceErrorMessage.visible}
        message={localAttendanceErrorMessage.message}
        onClose={() => setLocalAttendanceErrorMessage({ message: "", visible: false })}
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#e6e6f1ff',
  },
  headerContainer: {
    overflow: 'visible',
    zIndex: 10,
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    elevation: Platform.OS === 'android' ? 999 : 0,
    // Remove the pointerEvents from here - handle it at the component level
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 10,
    paddingHorizontal: 20,
    paddingBottom: 10, // Extra padding for the curved effect
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    paddingVertical: 10,
    // marginTop: -20, // Added negative margin to move content up
  },
  headerTopContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  companySection: {
    alignItems: 'center',
    justifyContent: 'center',
    // marginBottom: 20,
  },
  companyLogo: {
    width: width * 0.25,
    height: width * 0.25,
    borderRadius: width * 0.125,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  companyPlaceholder: {
    width: width * 0.25,
    height: width * 0.25,
    borderRadius: width * 0.125,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  companyName: {
    color: '#fff',
    fontSize: width * 0.06,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  profileButton: {
    width: width * 0.11,
    height: width * 0.11,
    borderRadius: width * 0.055,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: width * 0.055,
  },

  welcomeSection: {
    marginTop: 15,
    marginBottom: 10,
  },
  greeting: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: width * 0.04,
    fontWeight: '500',
  },
  userName: {
    color: '#fff',
    fontSize: width * 0.065,
    fontWeight: 'bold',
    marginTop: 3,
  },
  timeCardContainer: {
    paddingHorizontal: 20,
    marginTop: -40,
  },
  timeCard: {
    borderRadius: 15,
    elevation: 8,
    shadowColor: '#a970ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  timeCardContent: {
    padding: 16,
  },
  timeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: width * 0.036,
    color: '#555',
    fontWeight: '500',
  },
  timeText: {
    fontSize: width * 0.04,
    color: '#333',
    fontWeight: 'bold',
  },
  attendanceButtonsContainer: {
    width: '100%',
  },
  attendanceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  attendanceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    elevation: 2,
    minHeight: 48,
  },
  buttonLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInButton: {
    backgroundColor: '#e8eef6',
  },
  checkOutButton: {
    backgroundColor: '#a970ff',
  },
  yesterdayButton: {
    backgroundColor: '#FF6B6B',
  },
  checkedInButton: {
    backgroundColor: '#D7DAD7',
  },
  disabledButton: {
    backgroundColor: '#f0f0f0',
    elevation: 0,
  },
  attendanceButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
    flexShrink: 1,
    maxWidth: '90%',
  },
  disabledButtonText: {
    color: '#888',
  },
  checkinTimeText: {
    textAlign: 'center',
    color: '#a970ff',
    fontSize: width * 0.035,
    fontWeight: '500',
    marginTop: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  eventsContainer: {
    marginBottom: 20,
  },
  cardsSlider: {
    paddingRight: 20,
  },
  loadingContainer: {
    height: 120, // Match your card height
    justifyContent: 'center',
    alignItems: 'center',
  },
  // birthdayCard: {
  //   width: width * 0.75,
  //   marginRight: 15,
  //   borderRadius: 15,
  //   overflow: 'hidden',
  //   elevation: 4,
  //   shadowColor: '#a970ff',
  //   shadowOffset: { width: 0, height: 2 },
  //   shadowOpacity: 0.2,
  //   shadowRadius: 4,
  // },
  birthdayCard: {
    width: width * 0.75,
    marginRight: 15,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#a970ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  birthdayGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    // height: '100%',  // This ensures the gradient fills the card
  },

  birthdayIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  birthdayTextContainer: {
    flex: 1,
  },
  birthdayText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  birthdaySubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: width * 0.035,
  },
  eventCard: {
    width: width * 0.75,
    marginRight: 15,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#a970ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  eventGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    // height: '100%'  // Add this property here
  },
  eventIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  eventTextContainer: {
    flex: 1,
  },
  eventTitle: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  eventDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: width * 0.035,
  },
  eventTime: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: width * 0.035,
  },

  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: width * 0.045,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginLeft: 5,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: width * 0.44,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#b9cce5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#e8eef6",
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuItemText: {
    fontSize: width * 0.036,
    fontWeight: '600',
    color: '#444',
    textAlign: 'center',
  },
  offlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffebee',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  offlineText: {
    color: '#f44336',
    marginLeft: 8,
    fontSize: width * 0.035,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', // Remove solid background
    overflow: 'hidden', // Important for gradient edges
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    // Add subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10, // Android
    zIndex: 1, // Ensure content stays above gradient
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalSubmitButton: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  modalSubmitText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  menuIconWrapper: {
    // marginTop: 30,
    position: 'absolute',
    left: '3%',
    top: '5%',
    zIndex: 50,
    backgroundColor: 'rgba(169,112,255,0.7)',
    borderRadius: 20,
    padding: 2,
    elevation: 7,
  },
  menuIconButton: {
    // marginTop: 10,
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    // elevation: 9999,
  },
});

export default HomePage;
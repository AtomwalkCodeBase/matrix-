import React, { useContext, useEffect, useState } from 'react';
import styled from 'styled-components/native';
import { View, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, StatusBar, SafeAreaView, 
  ScrollView, Dimensions, Image, Text, Alert, Keyboard, Platform } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Logos from '../../assets/images/Atom_walk_logo.jpg';
import { useRouter } from 'expo-router';
import { forgetEmpPinURL } from '../../src/services/ConstantServies';
import { getDBListInfo } from '../../src/services/authServices';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { publicAxiosRequest } from '../../src/services/HttpMethod';
import CompanyDropdown from '../../src/components/ComanyDropDown';
import Loader from '../../src/components/old_components/Loader';
import { forgetUserPinView } from '../../src/services/productServices';
import SuccessModal from '../../src/components/SuccessModal';
import { AppContext } from '../../context/AppContext';
import { colors } from '../../src/Styles/appStyle';

const { width, height } = Dimensions.get('window');

// Responsive scaling functions
const scaleWidth = (size) => (width / 375) * size;
const scaleHeight = (size) => (height / 812) * size;

const ResetPinScreen = () => {
  const router = useRouter();
  const [mobileNumberOrEmpId, setMobileNumberOrEmpId] = useState('');
  const [dbName, setDBName] = useState('');
  const [loading, setLoading] = useState(false);
  const [companyError, setCompanyError] = useState('');
  const [dbList, setDbList] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
const [successMessage, setSuccessMessage] = useState('');

const {completLogout} = useContext(AppContext);

  useEffect(() => {
    fetchDbList();
  }, []);

  const fetchDbList = async () => {
  setLoading(true); // Show loader when starting the fetch
  
  try {
    const DBData = await getDBListInfo();
    setDbList(DBData.data || []);
    
    if (DBData.data?.length === 1) {
      const firstCompany = DBData.data[0];
      const defaultDbName = firstCompany.name.replace(/^SD_/, '');
      
      setSelectedCompany({
        label: firstCompany.ref_cust_name,
        value: firstCompany.ref_cust_name
      });
      setDBName(defaultDbName);
    }
  } catch (error) {
    console.error('DB List loading error:', error);
    Alert.alert('Error', 'Failed to load company list. Please try again.');
  } finally {
    setLoading(false); // Hide loader when done (success or error)
  }
};

  const handleCompanyChange = async (item) => {
    if (!item) return;

    setSelectedCompany(item);
    const selected = dbList.find(c => c.ref_cust_name === item.value);
    
    if (selected) {
      const newDbName = selected.name.replace(/^SD_/, ''); 
      setDBName(newDbName);
      await AsyncStorage.setItem('dbName', newDbName);
    }
    
    setCompanyError('');
  };

  const validateInput = () => {
    if (!selectedCompany) {
      setCompanyError('Please select your company');
      return false;
    }
    if (!mobileNumberOrEmpId) {
      Alert.alert('Error', 'Please enter your Employee ID or Mobile Number');
      return false;
    }
    return true;
  };

  

 const handleSubmit = async () => {
  if (!validateInput()) return;

  setLoading(true);
  Keyboard.dismiss(); // Hide keyboard when submitting

  try {
    const isMobileNumber = /^\d{10}$/.test(mobileNumberOrEmpId);
    
    const payload = isMobileNumber 
      ? { mobile_number: mobileNumberOrEmpId, dbName: dbName }
      : { emp_id: mobileNumberOrEmpId, dbName: dbName };

    const response = await forgetUserPinView(payload);
    
    if (response && response.status === 200) {
      // Clear userPin from AsyncStorage on success
      await AsyncStorage.removeItem('userPin');
      
      // Set success message and show modal
      setSuccessMessage(
        'Your PIN reset request has been submitted successfully. ' +
        'Please check your registered email & login with new PIN.'
      );
      setIsSuccessModalVisible(true);

      setTimeout(() => {
        //  router.replace({
        //    pathname: "AuthScreen",
        //    params: { backTohome: "true" }
        //  });
        completLogout();
       }, 3000);
       
    } else {
      throw new Error(response?.data?.message || 'Failed to process your request');
    }
  } catch (error) {
    console.error('Reset PIN error:', error.message);
    Alert.alert(
      'Unable to proceed', "Please contact your manager to reset your PIN."
    );
  } finally {
    setLoading(false);
  }
};


  return (
    <SafeAreaContainer edges={["left", "right", "bottom"]}>
      <Container>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Header>
            <LinearGradient 
              colors={[colors.primary, colors.primary]} 
              style={styles.headerGradient}
            >
              <View style={styles.logoContainer}>
                {Logos ? (
                  <Logo source={Logos} />
                ) : (
                  <View style={styles.companyPlaceholder}>
                    <MaterialIcons name="business" size={scaleWidth(40)} color="#fff" />
                  </View>
                )}
              </View>
              <TitleContainer>
                <Title>Reset Your PIN</Title>
                <Subtitle>Enter your details to request a new PIN</Subtitle>
              </TitleContainer>
            </LinearGradient>
          </Header>
          
          <Content>
            <Card>
              {dbList.length > 0 && (
                <CompanyDropdown
                  label="Select Your Company"
                  data={dbList.map(company => ({
                    label: company.ref_cust_name,
                    value: company.ref_cust_name
                  }))}
                  value={selectedCompany}
                  setValue={handleCompanyChange}
                  error={companyError}
                />
              )}
              
              <InputLabel>Enter your Mobile number or Emp ID</InputLabel>
              <InputWrapper>
                <MaterialIcons name="person" size={20} color="#6c757d" />
                <Input
                  placeholder="Mobile number or Emp ID"
                  value={mobileNumberOrEmpId}
                  onChangeText={setMobileNumberOrEmpId}
                  keyboardType="default"
                  placeholderTextColor="#6c757d"
                  maxLength={20}
                />
              </InputWrapper>

              <SubmitButton 
                onPress={handleSubmit}
                disabled={!mobileNumberOrEmpId || !selectedCompany}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <SubmitButtonText>Send Request</SubmitButtonText>
                )}
              </SubmitButton>

              <BackButton onPress={() => router.back()}>
                <BackButtonText>Back to Login</BackButtonText>
              </BackButton>
            </Card>
          </Content>
          <View style={styles.securityNote}>
                          <Ionicons name="shield-checkmark-outline" size={20} color="#FFA726" style={styles.noteIcon} />
                              <View style={styles.noteContent}>
                                  <Text style={styles.noteTitle}>Security Notice</Text>
                                  <Text style={styles.noteText}>
                                      <Text style={styles.bulletPoint}>• </Text>
                                      Never share your PIN with anyone
                                      {'\n'}
                                      <Text style={styles.bulletPoint}>• </Text>
                                      Please check your resistered mail-id, login with newly recived mail-id
                                      (Login with PIN - Logout)
                                  </Text>
                              </View>
                          </View>
        </ScrollView>
      </Container>
      
      <Loader 
        visible={loading} 
        onTimeout={() => {
          setLoading(false);
          Alert.alert('Timeout', 'Request timed out. Please try again.');
        }}
      />
      <SuccessModal
        visible={isSuccessModalVisible}
        onClose={() => {
          setIsSuccessModalVisible(false);
          completLogout(); // Changed from replace('/login') to back()
        }}
        message={successMessage}
      />
    </SafeAreaContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + scaleHeight(20) : scaleHeight(40),
    paddingBottom: scaleHeight(40),
    paddingHorizontal: scaleWidth(20),
    alignItems: 'center',
    borderBottomLeftRadius: scaleWidth(30),
    borderBottomRightRadius: scaleWidth(30),
  },
  logoContainer: {
    marginBottom: scaleHeight(20),
    borderRadius: scaleWidth(10),
    overflow: 'hidden'
  },
  companyPlaceholder: {
    width: scaleWidth(80),
    height: scaleWidth(80),
    borderRadius: scaleWidth(40),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 167, 38, 0.1)', // 10% opacity of warning color
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA726',
    width: '100%',
},
noteIcon: {
    marginRight: 12,
    marginTop: 3,
},
noteContent: {
    flex: 1,
},
noteTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFA726',
    marginBottom: 6,
},
noteText: {
    fontSize: 13,
    color: '#757575',
    lineHeight: 20,
},
});

const SafeAreaContainer = styled(SafeAreaView)`
  flex: 1;
  background-color: #6c63ff;
`;

const Container = styled.View`
  flex: 1;
  background-color: #f8f9fa;
`;

const Header = styled.View`
  background-color: transparent;
  margin-bottom: ${scaleHeight(20)}px;
`;

const Logo = styled.Image`
  width: ${scaleWidth(180)}px;
  height: ${scaleHeight(80)}px;
  border-radius: ${scaleWidth(10)}px;
  resize-mode: contain;
  background-color: #fff;
`;

const TitleContainer = styled.View`
  align-items: center;
  margin-top: ${scaleHeight(10)}px;
`;

const Title = styled.Text`
  font-size: ${scaleWidth(24)}px;
  font-weight: bold;
  color: #fff;
  margin-bottom: ${scaleHeight(5)}px;
`;

const Subtitle = styled.Text`
  font-size: ${scaleWidth(16)}px;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
`;

const Content = styled.View`
  padding: ${scaleWidth(20)}px;
  padding-bottom: ${scaleHeight(40)}px;
`;

const Card = styled.View`
  background-color: #fff;
  border-radius: ${scaleWidth(15)}px;
  padding: ${scaleWidth(25)}px;
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.1;
  shadow-radius: 6px;
  elevation: 5;
`;

const InputLabel = styled.Text`
  font-size: ${scaleWidth(14)}px;
  color: #666;
  margin-bottom: ${scaleHeight(5)}px;
  font-weight: 500;
`;

const InputWrapper = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: #f9f9f9;
  border-radius: ${scaleWidth(5)}px;
  border: 1px solid #ddd;
  margin-bottom: ${scaleHeight(15)}px;
  padding: 0 ${scaleWidth(15)}px;
  height: ${scaleHeight(50)}px;
`;

const Input = styled.TextInput`
  flex: 1;
  color: #333;
  font-size: ${scaleWidth(16)}px;
`;

const SubmitButton = styled.TouchableOpacity`
  background-color: ${props => props.disabled ? '#adb5bd' : `${colors.primary}`};
  padding: ${scaleHeight(16)}px;
  border-radius: ${scaleWidth(10)}px;
  align-items: center;
  margin-top: ${scaleHeight(25)}px;
  shadow-color: #a970ff;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.3;
  shadow-radius: 6px;
  elevation: 5;
`;

const SubmitButtonText = styled.Text`
  color: #fff;
  font-size: ${scaleWidth(18)}px;
  font-weight: bold;
`;

const BackButton = styled(TouchableOpacity)`
  margin-top: ${scaleHeight(20)}px;
  align-self: center;
`;

const BackButtonText = styled.Text`
  color: #6c63ff;
  font-size: ${scaleWidth(16)}px;
  font-weight: 500;
  text-decoration-line: underline;
`;

export default ResetPinScreen;
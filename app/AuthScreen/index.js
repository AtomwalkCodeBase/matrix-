import React, { useContext, useEffect, useState } from 'react';
import styled from 'styled-components/native';
import {
  View, TouchableOpacity, StyleSheet, Keyboard, StatusBar,
  Platform, ScrollView, Dimensions, Image, Text
} from 'react-native';
import { MaterialIcons, Entypo } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Logos from '../../assets/images/Atom_walk_logo.jpg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getDBListInfo } from '../../src/services/authServices';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CompanyDropdown from '../../src/components/ComanyDropDown';
import { AppContext } from '../../context/AppContext';
import Loader from '../../src/components/old_components/Loader';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/Styles/appStyle';



const { width, height } = Dimensions.get('window');

// Responsive scaling functions
const scaleWidth = (size) => (width / 375) * size;
const scaleHeight = (size) => (height / 812) * size;


const LoginScreen = () => {
  const { login, errorMessage: contextErrorMessage, setErrorMessage } = useContext(AppContext);
  const { backTohome } = useLocalSearchParams();
  const router = useRouter();
  const [mobileNumberOrEmpId, setMobileNumberOrEmpId] = useState('');
  const [profileName, setProfileName] = useState('');
  const [pin, setPin] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [userPin, setUserPin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [companyError, setCompanyError] = useState('');
  const [keyboardStatus, setKeyboardStatus] = useState(false);
  const [dbList, setDbList] = useState([]);
  const isLoginDisabled = !mobileNumberOrEmpId || !pin;
const [selectedCompany, setSelectedCompany] = useState({ label: "Demo Waste Management", value: "APM_002" });
  const [bioStatus, setBioStatus] = useState(false);

  const appVersion = Constants.expoConfig?.version || '0.0.1';

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load saved empId
        const savedEmpId = await AsyncStorage.getItem('empId');
        if (savedEmpId) {
          setMobileNumberOrEmpId(savedEmpId);
        }

        // Load profile name
        const storedName = await AsyncStorage.getItem('profilename');
        if (storedName) {
          setProfileName(storedName);
        } else {
          const profileData = await AsyncStorage.getItem('profile');
          if (profileData) {
            const parsedProfile = JSON.parse(profileData);
            setProfileName(parsedProfile?.name || 'Employee');
          }
        }

        // Load fingerprint status
        const fingerprintStatus = await AsyncStorage.getItem('useFingerprint');
        setBioStatus(fingerprintStatus === 'true');

        // Load stored user PIN
        const storedPin = await AsyncStorage.getItem('userPin');
        setUserPin(storedPin);

        // Fetch DB name
        fetchDbName();
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    // Keyboard event listeners
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardStatus(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardStatus(false)
    );

    // Call initialization function
    initializeApp();

    // Cleanup
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);



  const fetchDbName = async () => {
    setLoading(true); // Add loading state at start
    try {
      const DBData = await getDBListInfo();
      setDbList(DBData.data || []);

      // Load both current and previous dbNames
      const savedDBName = await AsyncStorage.getItem('dbName');

      const matchingCompany = DBData.data.find(company => {
        const companyDbName = company.name.replace(/^SD_/, '');
        return companyDbName === savedDBName;
      });

      if (matchingCompany) {
        setSelectedCompany({
          label: matchingCompany.ref_cust_name,
          value: matchingCompany.ref_cust_name
        });
      } else if (DBData.data?.length === 1) {
        const firstCompany = DBData.data[0];
        const defaultDbName = firstCompany.name.replace(/^SD_/, '');

        setSelectedCompany({
          label: firstCompany.ref_cust_name,
          value: firstCompany.ref_cust_name
        });
        await AsyncStorage.multiSet([
          ['dbName', defaultDbName],
          ['previousDbName', defaultDbName]
        ]);
      }
    } catch (error) {
      console.error('DB List loading error:', error);
    } finally {
      setLoading(false); // Ensure loading is set to false when done
    }
  };

  const handleCompanyChange = async (item) => {
    if (!item) return;
setSelectedCompany({ label: "Demo Waste Management", value: "APM_002" });
  setCompanyError('');
  };


  const validateInput = () => {
    if (!selectedCompany) {
      setCompanyError('Please select your company');
      setLoading(false);
      return false;
    }
    if (!mobileNumberOrEmpId) {
      setErrorMessage('Mobile number or Employee ID is required');
      setLoading(false);
      return false;
    }
    if (!pin) {
      setErrorMessage('PIN is required');
      setLoading(false);
      return false;
    }
    if (pin.length < 4) {
      setErrorMessage('PIN must be at least 4 characters long');
      setLoading(false);
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const handlePressPassword = async () => {
    try {
      const prevDbName = await AsyncStorage.getItem('previousDbName');

      if (prevDbName) {
        await AsyncStorage.setItem('dbName', prevDbName);
      }

      router.push({ pathname: 'PinScreen' });
    } catch (error) {
      console.error('Error handling PIN/fingerprint login:', error);
    }
  };

  const handlePressForget = () => {
    router.push({
      pathname: 'ForgetPin',
    });
  };

  useEffect(() => {
    const logCurrentDbName = async () => {
    };
    logCurrentDbName();
  }, [selectedCompany]);

  const handlePress = async () => {
    setLoading(true);
    setErrorMessage(''); // Clear any previous errors

    if (!validateInput()) {
      setLoading(false);
      return;
    }

    try {
      // Get the dbname from the selected company
      // const selected = dbList.find(c => c.ref_cust_name === selectedCompany.value);
      // if (!selected) {
      //   setErrorMessage('Invalid company selection');
      //   setLoading(false);
      //   return;
      // }

      // const dbName = selected.name.replace(/^SD_/, '');
      const dbName = "APM_002";

      // Call the login function with just the dbName
      await login(mobileNumberOrEmpId, pin, dbName);

    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaContainer edges={["left", "right", "bottom"]}>
      <Container>
        <Header style={styles.headerContainer}>
          <LinearGradient
            colors={[colors.primary, colors.primary]}
            start={[0, 0]}
            end={[1, 1]}
            style={styles.headerGradient}
          >
            <View style={styles.headerTop}>
              <View style={styles.logoContainer}>
                {Logos ? (
                  <Image source={Logos} style={styles.logo} />
                ) : (
                  <View style={styles.companyPlaceholder}>
                    <MaterialIcons
                      name="business"
                      size={scaleWidth(40)}
                      color="#fff"
                    />
                  </View>
                )}
              </View>
              {profileName && (
                <WelcomeContainer>
                  <GreetingText>Welcome back,</GreetingText>
                  <UserNameText>{profileName}</UserNameText>
                </WelcomeContainer>
              )}
            </View>
          </LinearGradient>
        </Header>
        <MainContent keyboardStatus={keyboardStatus}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: keyboardStatus ? scaleHeight(150) : scaleHeight(50) }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            <Content>
              <Card>
                <Title>Login</Title>

                <InputContainer>
                  {/* {dbList.length > 0 && ( */}
                    <CompanyDropdown
                      label="Company"
                      data={[{label: "Demo Waste Management", value: "APM_002"}]}
                      value={selectedCompany}
                      setValue={handleCompanyChange}
                      error={companyError}
                      disabled={true}
                    />
                  {/* )} */}


                  <InputLabel>Enter your Mobile number or Emp ID</InputLabel>
                  <InputWrapper>
                    <MaterialIcons name="person" size={20} color="#6c757d" />
                    <Input
                      placeholder="Mobile number or Emp ID"
                      value={mobileNumberOrEmpId}
                      onChangeText={(text) =>
                        setMobileNumberOrEmpId(text.replace(/\s/g, ""))
                      } // This removes all spaces
                      keyboardType="default"
                      placeholderTextColor="#6c757d"
                      maxLength={15}
                    />
                  </InputWrapper>
                  <InputLabel>Enter your PIN (min 4 digits)</InputLabel>
                  <InputWrapper>
                    <MaterialIcons
                      name="lock-outline"
                      size={20}
                      color="#6c757d"
                    />
                    <Input
                      placeholder="PIN (min 4 digits)"
                      value={pin}
                      onChangeText={setPin}
                      secureTextEntry={!isPasswordVisible}
                      keyboardType="numeric"
                      placeholderTextColor="#6c757d"
                      maxLength={6} // Increased max length but validation still requires min 4
                    />
                    <TouchableOpacity
                      onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                    >
                      <MaterialIcons
                        name={
                          isPasswordVisible ? "visibility" : "visibility-off"
                        }
                        size={20}
                        color="#6c757d"
                      />
                    </TouchableOpacity>
                  </InputWrapper>

                  {contextErrorMessage ? <ErrorText>{contextErrorMessage}</ErrorText> : null}

                  <LoginButton
                    onPress={handlePress}
                    disabled={isLoginDisabled}
                    style={{
                      backgroundColor: isLoginDisabled ? "#fff" : colors.primary,
                    }}
                  >
                    <LoginButtonText
                      style={{ color: isLoginDisabled ? "#454545" : "#fff" }}
                    >
                      LOGIN
                    </LoginButtonText>
                  </LoginButton>
                </InputContainer>
              </Card>

              {!backTohome && (
                <>
                  {userPin && bioStatus && (
                    <AlternativeLogin onPress={handlePressPassword}>
                      <FingerprintIcon>
                        <Entypo
                          name="fingerprint"
                          size={scaleWidth(24)}
                          color="#fff"
                        />
                      </FingerprintIcon>
                      <AlternativeLoginText>
                        Login with PIN/Fingerprint
                      </AlternativeLoginText>
                    </AlternativeLogin>
                  )}

                  <TouchableOpacity
                    onPress={handlePressForget}
                    style={styles.forgetPinButton}
                  >
                    <Text style={styles.forgetPinText}>Forgot PIN?</Text>
                  </TouchableOpacity>
                </>
              )}
            </Content>
          </ScrollView>
        </MainContent>

        <Footer style={styles.fixedFooter}>
          <FooterText>Version Code: {appVersion}</FooterText>
        </Footer>
      </Container>
      {/* </KeyboardAvoidingView> */}
      <Loader
        visible={loading}
        onTimeout={() => {
          setLoading(false); // Hide loader
          Alert.alert("Timeout", "Not able to Login.");
        }}
      />
    </SafeAreaContainer>
  );
};

// Styled Components (remain the same as in your original code)
const styles = StyleSheet.create({
  headerContainer: {
    overflow: 'visible',
    zIndex: 10,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + scaleHeight(10) : scaleHeight(10),
    paddingHorizontal: scaleWidth(20),
    paddingBottom: scaleHeight(20),
    borderBottomLeftRadius: scaleWidth(30),
    borderBottomRightRadius: scaleWidth(30),
  },
  headerTop: {
    paddingVertical: scaleHeight(10),
  },
  companySection: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scaleHeight(20),
  },

  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderRadius: scaleWidth(10),
    overflow: 'hidden'
  },

  logo: {
    width: scaleWidth(150),
    height: scaleHeight(60),
    borderRadius: scaleWidth(10),
    resizeMode: 'contain',
    backgroundColor: '#fff',
  },
  companyPlaceholder: {
    width: scaleWidth(80),
    height: scaleWidth(80),
    borderRadius: scaleWidth(40),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    position: 'relative', // Needed for absolute positioning of footer
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hiddenFooter: {
    display: 'none',
  },
  visibleFooter: {
    padding: scaleHeight(15),
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    width: '100%',
  },

  forgetPinButton: {
    marginTop: scaleHeight(20),
    alignSelf: 'center',
    paddingVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(20),
  },
  forgetPinText: {
    color: 'rgb(90, 46, 249)',
    fontSize: scaleWidth(16),
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

});

const SafeAreaContainer = styled(SafeAreaView)`
  flex: 1;
  background-color: ${colors.primary};
`;

const Container = styled.View`
  flex: 1;
  background-color: #f5f5f5;
`;

const Header = styled.View`
  background-color: transparent;
`;

const ContentContainer = styled.View`
  flex: 1;
  margin-top: ${scaleHeight(-40)}px;
`;

const Content = styled.View`
  padding: ${scaleWidth(20)}px;
  padding-bottom: ${scaleHeight(80)}px;
`;

const Logo = styled.Image`
  width: ${scaleWidth(150)}px;
  height: ${scaleHeight(60)}px;
  border-radius: ${scaleWidth(10)}px;
  resize-mode: contain;
`;

const Card = styled.View`
  background-color: #fff;
  border-radius: ${scaleWidth(10)}px;
  margin-top: ${scaleHeight(20)}px;
  padding: ${scaleWidth(20)}px;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
  elevation: 3;
`;

const Title = styled.Text`
  font-size: ${scaleWidth(22)}px;
  font-weight: bold;
  color: #333;
  margin-bottom: ${scaleHeight(25)}px;
  text-align: center;
`;

const InputContainer = styled.View`
  width: 100%;
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

const EyeButton = styled.TouchableOpacity`
  padding: ${scaleWidth(5)}px;
`;

const ErrorText = styled.Text`
  color: #e74c3c;
  font-size: ${scaleWidth(14)}px;
  margin-bottom: ${scaleHeight(15)}px;
`;

const LoginButton = styled.TouchableOpacity`
  background-color: ${props => props.disabled ? '#fff' : `${colors.primary}`};
  border: 1px solid ${colors.primary};
  padding: ${scaleHeight(15)}px;
  border-radius: ${scaleWidth(5)}px;
  align-items: center;
  margin-top: ${scaleHeight(10)}px;
`;


const LoginButtonText = styled.Text`
  color: #fff;
  font-size: ${scaleWidth(16)}px;
  font-weight: bold;
`;

const WelcomeContainer = styled.View`
  margin-bottom: ${scaleHeight(20)}px;
  align-items: center;
`;

const GreetingText = styled.Text`
  color: rgba(255, 255, 255, 0.9);
  font-size: ${scaleWidth(16)}px;
  font-weight: 500;
`;

const UserNameText = styled.Text`
  color: #fff;
  font-size: ${scaleWidth(24)}px;
  font-weight: bold;
  margin-top: ${scaleHeight(3)}px;
`;

const AlternativeLogin = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: ${scaleHeight(30)}px;
`;

const FingerprintIcon = styled.View`
  background-color: ${colors.primary};
  width: ${scaleWidth(40)}px;
  height: ${scaleWidth(40)}px;
  border-radius: ${scaleWidth(20)}px;
  align-items: center;
  justify-content: center;
  margin-right: ${scaleWidth(10)}px;
`;

const AlternativeLoginText = styled.Text`
  color: ${colors.primary};
  font-size: ${scaleWidth(16)}px;
  font-weight: 500;
`;
const MainContent = styled.View`
  flex: 1;
  margin-bottom: ${props => props.keyboardStatus ? 0 : scaleHeight(50)}px;
`;
const Footer = styled.View`
  padding: ${scaleHeight(10)}px;
  align-items: center;
  justify-content: center;
  border-top-width: 1px;
  border-top-color: #eee;
  background-color: #fff;
  width: 100%;
`;

const FooterText = styled.Text`
  color: ${colors.primary};
  font-size: ${scaleWidth(14)}px;
  font-weight: 500;
`;


export default LoginScreen;
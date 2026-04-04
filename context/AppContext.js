import React, { createContext, useState, useEffect } from 'react';
import { publicAxiosRequest } from "../src/services/HttpMethod";
import { empLoginURL } from "../src/services/ConstantServies";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCompanyInfo, getEmployeeInfo } from '../src/services/authServices';
import { useRouter } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import NetworkErrorModal from '../src/components/NetworkErrorModal';
import moment from 'moment';

const AppContext = createContext();

const AppProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [userToken, setUserToken] = useState(null);
    const [companyInfo, setCompanyInfo] = useState(null);
    const [dbName, setDbName] = useState(null);
    const [isConnected, setIsConnected] = useState(true);
    const [profile, setProfile] = useState({});
    const [reLoad, setReload] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    // Attendance related states
    const [employeeData, setEmployeeData] = useState(null);
    const [currentDate, setCurrentDate] = useState(moment().format('DD-MM-YYYY'));
    const [currentTimeStr, setCurrentTimeStr] = useState('');
    const [currentTime, setCurrentTime] = useState('');

    const router = useRouter();

    const checkNetwork = async () => {
        const netState = await NetInfo.fetch();
        setIsConnected(netState.isConnected);
        return netState.isConnected;
    };

    const onRetry = async () => {
        const networkStatus = await checkNetwork();
        if (networkStatus) {
            setIsConnected(true);
        }
    };

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        isLoggedIn();
    }, []);



    const login = async (username, password, dbName) => {
        setIsLoading(true);
        setErrorMessage(null);

        if (!isConnected) {
            setIsLoading(false);
            setErrorMessage('No internet connection. Please check your network.');
            return;
        }

        try {
            // Update dbName if provided
            if (dbName) {
                await AsyncStorage.multiSet([
                    ['dbName', dbName],
                    ['previousDbName', dbName]
                ]);
                setDbName(dbName);
            }

            // Determine if the input is a mobile number (10 digits) or employee ID
            const isMobileNumber = /^\d{10}$/.test(username);

            const payload = isMobileNumber
                ? {
                    mobile_number: username,
                    pin: password,
                }
                : {
                    emp_id: username,
                    pin: password,
                };

            const url = await empLoginURL();
            const response = await publicAxiosRequest.post(url, payload, {
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.status === 200) {
                const { token, emp_id, e_id } = response.data;

                // Calculate token expiration date (15 days from now)
                const expirationDate = new Date();
                expirationDate.setDate(expirationDate.getDate() + 15);
                const expirationDateString = expirationDate.toISOString();

                // Store appropriate identifier based on input type
                if (isMobileNumber) {
                    await AsyncStorage.setItem('mobileNumber', username);
                } else {
                    await AsyncStorage.setItem('empId', username);
                }

                // Store token and expiration date
                await AsyncStorage.multiSet([
                    ['userToken', token],
                    ['tokenExpiration', expirationDateString],
                    ['empId', emp_id],
                    ['empNoId', String(e_id)],
                    ['userPin', password]
                ]);

                try {
                    const companyInfoResponse = await getCompanyInfo();
                    const companyInfo = companyInfoResponse.data;
                    await AsyncStorage.setItem('companyInfo', JSON.stringify(companyInfo));
                    setCompanyInfo(companyInfo);
                } catch (error) {
                    console.error('Error fetching company info:', error.message);
                }

                setUserToken(token); // Update the token in state
                setReload(true);
                router.replace({ pathname: 'home' });
            } else {
                setErrorMessage('Invalid credentials');
            }
        } catch (error) {
            console.error('API call error:', error.response?.data || error.message);
            if (error.response) {
                if (error.response.data?.error) {
                    const errorMessage = error.response.data.error;

                    // Handle "Wrong Attempt [X]" case
                    const wrongAttemptMatch = errorMessage.match(/Wrong Attempt \[(\d+)\]/);
                    if (wrongAttemptMatch) {
                        const attemptCount = parseInt(wrongAttemptMatch[1]);

                        if (attemptCount >= 6) {
                            setErrorMessage('Your account has been blocked due to too many failed attempts. Please contact support.');
                            return;
                        } else {
                            setErrorMessage(`Incorrect PIN. You have ${6 - attemptCount} attempts remaining before your account gets blocked.`);
                            return;
                        }
                    }

                    // Handle other error messages with brackets
                    if (errorMessage.includes('Multiple wrong attempt. Employee login is Inactive now.')) {
                        setErrorMessage('Multiple wrong attempts. Your account is now inactive. Please contact respective manager.');
                    } else {
                        setErrorMessage(errorMessage);
                    }
                } else {
                    setErrorMessage('Invalid credentials. Please try again.');
                }
            } else if (error.request) {
                setErrorMessage('No response from the server. Please check your connection.');
            } else {
                setErrorMessage('An error occurred. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);

        try {
            router.replace('PinScreen');
            await AsyncStorage.multiRemove([
                'userToken',
            ]);

            setUserToken(null);
            setProfile({});
            setReload(false);
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const completLogout = async () => {
        setIsLoading(true);

        try {
            router.replace('AuthScreen');
            await AsyncStorage.multiRemove([
                'userToken', 'empId', 'tokenExpiration', 'dbName', 'empNoId', 'userPin', 'profilename', 'useFingerprint'
            ]);

            setUserToken(null);
            setProfile({});
            setReload(false);
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const isLoggedIn = async () => {
        const networkStatus = await checkNetwork();
        if (!networkStatus) {
            return;
        }

        try {
            setIsLoading(true);
            const userToken = await AsyncStorage.getItem('userToken');
            const Dbname = await AsyncStorage.getItem('dbName');
            if (!userToken && !Dbname) {
                router.replace('AuthScreen');
                return;
            }

            if (!userToken) {
                router.replace('PinScreen'); // You might want to double-check this logic
                return;
            }


            setUserToken(userToken);

            // Retrieve all stored data
            const [
                companyInfo,
                dbName,
                userPin
            ] = await Promise.all([
                AsyncStorage.getItem('companyInfo'),
                AsyncStorage.getItem('dbName'),
                AsyncStorage.getItem('userPin')
            ]);

            if (companyInfo) {
                setCompanyInfo(JSON.parse(companyInfo));
            }
            if (dbName) {
                setDbName(dbName);
            }


            if (userPin) {
                router.replace('PinScreen');
            } else {
                setReload(true);
            }
        } catch (e) {
            console.error('Login Status Error:', e);
        } finally {
            setIsLoading(false);
        }
    };


    const refreshProfileData = async () => {
        try {
            setIsLoading(true);
            setReload(true); // This will trigger the useEffect that fetches data
        } catch (error) {
            console.error('Failed to refresh data:', error);
        }
    };


    useEffect(() => {
        if (reLoad) {
            setIsLoading(true);
            const fetchData = async () => {
                try {
                    // Fetch both profile and company data in parallel
                    const [profileRes, companyRes] = await Promise.all([
                        getEmployeeInfo(),
                        getCompanyInfo()
                    ]);

                    // Set profile data
                    if (profileRes?.data?.[0]) {
                        setProfile(profileRes.data[0]);
                        if (profileRes.data[0].name) {
                            await AsyncStorage.setItem('profilename', profileRes.data[0].name);
                        }
                    }

                    // Set company data
                    if (companyRes?.data) {
                        setCompanyInfo(companyRes.data);
                        await AsyncStorage.setItem('companyInfo', JSON.stringify(companyRes.data));
                    }

                    // Navigate to home
                    router.replace({ pathname: 'home' });
                } catch (error) {
                    console.error('Failed to fetch data:', error);
                } finally {
                    setIsLoading(false);
                    setReload(false); // Reset reload flag
                }
            };

            fetchData();
        }
    }, [reLoad]);

    // Attendance functions
    const setdatatime = async () => {
        let time = moment().format('hh:mm A');
        if (moment().isBetween(moment().startOf('day').add(12, 'hours').add(1, 'minute'), moment().startOf('day').add(13, 'hours'))) {
            time = time.replace(/^12/, '00');
        }
        return time;
    };


    return (
        <AppContext.Provider value={{
            login,
            logout,
            completLogout,
            refreshProfileData,
            isLoading,
            userToken,
            companyInfo,
            dbName,
            isConnected,
            checkNetwork,
            setIsLoading,
            profile,
            setReload,
            errorMessage,
            setErrorMessage,
            // Attendance states
            employeeData,
            setEmployeeData,
            currentDate,
            setCurrentDate,
            currentTimeStr,
            setCurrentTimeStr,
            currentTime,
            setCurrentTime,
            setdatatime,
          
        }}>
            {children}
            <NetworkErrorModal
                visible={!isConnected}
                onRetry={onRetry}
                onNetworkRestore={() => setIsConnected(true)}
            />
        </AppContext.Provider>
    );
};

export { AppContext, AppProvider };
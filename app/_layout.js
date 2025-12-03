import { Stack } from "expo-router";
import { AppProvider } from "../context/AppContext";
import { BackHandler, View, StyleSheet, StatusBar, Platform } from "react-native";
import { colors } from '../src/Styles/appStyle';

if (BackHandler && typeof BackHandler.removeEventListener !== "function") {
  BackHandler.removeEventListener = () => {};
}

const StatusBarBackground = () => (
  <View style={styles.statusBarBackground} />
);

export default function RootLayout() {
  return (
    <AppProvider>
      {/* Background behind status bar */}
      <StatusBarBackground />
      
      {/* Status bar itself */}
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <Stack>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="AuthScreen/index" options={{ headerShown: false }} />
        <Stack.Screen name="PinScreen/index" options={{ headerShown: false }} />
        <Stack.Screen name="ClaimApply/index" options={{ headerShown: false }} />
        <Stack.Screen name="ApproveClaim/index" options={{ headerShown: false }} />
        <Stack.Screen name="ApproveDetails/index" options={{ headerShown: false }} />
        <Stack.Screen name="ClaimScreen/index" options={{ headerShown: false }} />
        <Stack.Screen name="HolidayList/index" options={{ headerShown: false }} />
        <Stack.Screen name="ResetPassword/index" options={{ headerShown: false }} />
        <Stack.Screen name="ApproveLeaves/index" options={{ headerShown: false }} />
        <Stack.Screen name="IdCard/index" options={{ headerShown: false }} />
        <Stack.Screen name="ForgetPin/index" options={{ headerShown: false }} />
        <Stack.Screen name="TimeSheet/index" options={{ headerShown: false }} />
        <Stack.Screen name="EmployeeList/index" options={{ headerShown: false }} />
        <Stack.Screen name="TravelScreen/index" options={{ headerShown: false }} />
        <Stack.Screen name="ManagerTimeSheet/index" options={{ headerShown: false }} />
        <Stack.Screen name="LeaveScreen/index" options={{ headerShown: false }} />
      </Stack>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  statusBarBackground: {
    height: Platform.OS === "android" ? StatusBar.currentHeight : 44, // 44 for iOS notch
    backgroundColor: colors.primary,
  },
});

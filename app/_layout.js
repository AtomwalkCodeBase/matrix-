import "expo-insights";
import { Stack } from "expo-router";
import { AppProvider } from "../context/AppContext";
import {
  BackHandler,
  View,
  StyleSheet,
  StatusBar,
  Platform,
} from "react-native";
import { useEffect } from "react";
import { colors } from "../src/Styles/appStyle";

if (BackHandler && typeof BackHandler.removeEventListener !== "function") {
  BackHandler.removeEventListener = () => {};
}

const StatusBarBackground = () => (
  <View style={styles.statusBarBackground} />
);

export default function RootLayout() {
  useEffect(() => {
    checkForPlayStoreUpdate();
  }, []);

  const checkForPlayStoreUpdate = async () => {
    // Do not run this in Expo Go / development
    if (__DEV__ || Platform.OS !== "android") {
      return;
    }

    try {
      const {
        default: SpInAppUpdates,
        IAUUpdateKind,
      } = await import("sp-react-native-in-app-updates");

      const inAppUpdates = new SpInAppUpdates(false);

      const result = await inAppUpdates.checkNeedsUpdate();

      if (result.shouldUpdate) {
        console.log(
          "Play Store update available:",
          result.storeVersion
        );

        await inAppUpdates.startUpdate({
          updateType: IAUUpdateKind.FLEXIBLE,
        });
      }
    } catch (error) {
      console.log(
        "Play Store update check failed:",
        error
      );
    }
  };

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
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AuthScreen/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PinScreen/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ClaimApply/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ApproveClaim/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ApproveDetails/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ClaimScreen/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ResetPassword/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ForgetPin/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TimeSheet/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EmployeeList/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TravelScreen/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ManagerTimeSheet/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ExpenseTracker/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OPEScreen/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RetainerResourceScreen/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddClaimList/index"
          options={{ headerShown: false }}
        />
      </Stack>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  statusBarBackground: {
    height:
      Platform.OS === "android"
        ? StatusBar.currentHeight
        : 44,
    backgroundColor: colors.primary,
  },
});
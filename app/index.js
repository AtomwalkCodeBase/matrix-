import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  ActivityIndicator,
  Image,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import Logo from "../assets/images/Atomwalk_logo_loader.png";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUserToken = async () => {
      try {
        const userToken = await AsyncStorage.getItem("userToken");
        const storedMPIN = await AsyncStorage.getItem("userPin");

        if (storedMPIN) {
          router.replace("/PinScreen");
        } else if (userToken) {
          router.replace("/home");
        } else {
          router.replace("/AuthScreen");
        }
      } catch (error) {
        console.error(
          "Error fetching userToken from AsyncStorage",
          error
        );

        router.replace("/AuthScreen");
      } finally {
        setLoading(false);
      }
    };

    checkUserToken();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Image
          source={Logo}
          style={styles.logo}
          resizeMode="contain"
        />

        <ActivityIndicator
          size="large"
          color="#61C3C5"
          style={styles.loader}
        />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },

  logo: {
    width: 280,
    height: 130,
  },

  loader: {
    marginTop: 20,
  },
});
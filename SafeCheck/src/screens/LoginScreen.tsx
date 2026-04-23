import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Image, ScrollView, TextInput, Alert, ActivityIndicator,} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";
import ScreenBackground from "../components/ScreenBackground";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  const emailIsValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  }, [normalizedEmail]);

  const validateForm = () => {
    if (!normalizedEmail || !password.trim()) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return false;
    }

    if (!emailIsValid) {
      Alert.alert(
        "Invalid email",
        "Please enter a valid email address, for example: name@example.com."
      );
      return false;
    }

    return true;
  };

  const onLogin = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const response = await api.post("/api/auth/login", {
        email: normalizedEmail,
        password,
      });

      await AsyncStorage.setItem("token", response.data.token);
      await AsyncStorage.setItem("user", JSON.stringify(response.data.user));

      Alert.alert("Login successful", "Welcome back!", [
        {
          text: "Continue",
          onPress: () => navigation.replace("Main"),
        },
      ]);
    } catch (e: any) {
      const status = e?.response?.status;
      const serverMessage = e?.response?.data?.error;
      const rawMessage = e?.message || "";

      if (status === 401) {
        Alert.alert(
          "Incorrect login details",
          "The email or password you entered is incorrect. Please try again."
        );
      } else if (status === 400) {
        Alert.alert(
          "Missing information",
          serverMessage || "Please enter both email and password."
        );
      } else if (status === 404) {
        Alert.alert(
          "Account not found",
          "We could not find an account with that email address."
        );
      } else if (status === 500) {
        Alert.alert(
          "Server error",
          "Something went wrong on the server. Please try again in a moment."
        );
      } else if (rawMessage.toLowerCase().includes("network")) {
        Alert.alert(
          "Connection problem",
          "Could not connect to the server. Please check your internet and server connection."
        );
      } else {
        Alert.alert(
          "Login failed",
          serverMessage || rawMessage || "Something went wrong. Please try again."
        );
      }

      console.log("Login error:", e?.response?.data || e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 24,
          justifyContent: "center",
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", marginBottom: 18 }}>
          <View
            style={{
              width: 110,
              height: 110,
              borderRadius: 55,
              backgroundColor: "#EDE7F6",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
              overflow: "hidden",
            }}
          >
            <Image
              source={require("../../assets/SafeCheck Logo.png")}
              style={{ width: 130, height: 130 }}
              resizeMode="cover"
            />
          </View>

          <Text style={{ color: "#4c217dff", fontSize: 28, fontWeight: "800" }}>
            Welcome back
          </Text>
          <Text style={{ marginTop: 6, textAlign: "center", opacity: 0.75 }}>
            Log in to continue your safety checks
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: "#EEE6FA",
            shadowOpacity: 0.08,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          <Text style={{ color: "#4c217dff", fontWeight: "700", marginBottom: 6 }}>
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#9A9A9A"
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            style={{
              borderWidth: 1,
              borderColor:
                email.length === 0
                  ? "#D9C9F2"
                  : emailIsValid
                  ? "#B9E0BB"
                  : "#F2B6B6",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 12,
              marginBottom: 8,
              backgroundColor: "#FBFAFF",
            }}
          />
          {email.length > 0 && !emailIsValid ? (
            <Text style={{ color: "#B00020", marginBottom: 10, fontWeight: "600" }}>
              Please enter a valid email address.
            </Text>
          ) : (
            <View style={{ marginBottom: 12 }} />
          )}

          <Text style={{ color: "#4c217dff", fontWeight: "700", marginBottom: 6 }}>
            Password
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#9A9A9A"
            secureTextEntry
            style={{
              borderWidth: 1,
              borderColor: "#D9C9F2",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 12,
              backgroundColor: "#FBFAFF",
            }}
          />

          <Pressable
            onPress={onLogin}
            disabled={loading}
            style={{
              backgroundColor: loading ? "#CBB6E6" : "#8d67b9ff",
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
              marginTop: 14,
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text
                  style={{
                    color: "white",
                    fontWeight: "800",
                    marginLeft: 8,
                  }}
                >
                  Logging in...
                </Text>
              </>
            ) : (
              <Text style={{ color: "white", fontWeight: "800" }}>Login</Text>
            )}
          </Pressable>

          <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 14 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: "#EEE6FA" }} />
            <Text style={{ marginHorizontal: 10, opacity: 0.6 }}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: "#EEE6FA" }} />
          </View>

          <Pressable
            onPress={() => navigation.navigate("Signup")}
            style={{
              borderColor: "#8d67b9ff",
              borderWidth: 1,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#8d67b9ff", fontWeight: "800" }}>
              Create an account
            </Text>
          </Pressable>
        </View>

        <Text style={{ marginTop: 16, textAlign: "center", fontSize: 12, opacity: 0.65 }}>
          By continuing, you agree this app does not provide medical advice.
        </Text>
      </ScrollView>
    </ScreenBackground>
  );
}
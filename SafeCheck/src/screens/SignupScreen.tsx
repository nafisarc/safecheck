import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Image, ScrollView, TextInput, Alert, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";
import ScreenBackground from "../components/ScreenBackground";

export default function SignupScreen({ navigation }: any) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizedName = fullName.trim().replace(/\s+/g, " ");
  const normalizedEmail = email.trim().toLowerCase();

  const nameIsValid = useMemo(() => {
    // letters + spaces only, at least 2 chars total
    return /^[A-Za-z ]+$/.test(normalizedName) && normalizedName.length >= 2;
  }, [normalizedName]);

  const emailIsValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  }, [normalizedEmail]);

  const passwordIsValid = password.length >= 6;
  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const canSubmit =
    normalizedName.length > 0 &&
    normalizedEmail.length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    nameIsValid &&
    emailIsValid &&
    passwordIsValid &&
    passwordsMatch &&
    !loading;

  const validateForm = () => {
    if (!normalizedName || !normalizedEmail || !password || !confirmPassword) {
      Alert.alert(
        "Missing information",
        "Please fill in your full name, email, password, and confirm password."
      );
      return false;
    }

    if (!nameIsValid) {
      Alert.alert(
        "Invalid name",
        "Please enter letters only in the full name field."
      );
      return false;
    }

    if (!emailIsValid) {
      Alert.alert(
        "Invalid email",
        "Please enter a valid email address, for example: name@example.com."
      );
      return false;
    }

    if (!passwordIsValid) {
      Alert.alert(
        "Weak password",
        "Your password must be at least 6 characters long."
      );
      return false;
    }

    if (!passwordsMatch) {
      Alert.alert(
        "Passwords do not match",
        "Please make sure both password fields are exactly the same."
      );
      return false;
    }

    return true;
  };

  const onSignup = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const response = await api.post("/api/auth/signup", {
        fullName: normalizedName,
        email: normalizedEmail,
        password,
      });

      await AsyncStorage.setItem("token", response.data.token);
      await AsyncStorage.setItem("user", JSON.stringify(response.data.user));

      Alert.alert("Account created", "Your account was created successfully.", [
        {
          text: "Continue",
          onPress: () => navigation.replace("Profile", { isNewUser: true }),
        },
      ]);
    } catch (e: any) {
      const status = e?.response?.status;
      const serverMessage = e?.response?.data?.error;

      if (status === 409) {
        Alert.alert(
          "Account already exists",
          "An account with this email already exists. Please log in instead."
        );
      } else if (status === 400) {
        Alert.alert(
          "Invalid details",
          serverMessage || "Please check your details and try again."
        );
      } else if (status === 500) {
        Alert.alert(
          "Server error",
          "Something went wrong on the server. Please try again in a moment."
        );
      } else if (e?.message?.toLowerCase().includes("network")) {
        Alert.alert(
          "Connection problem",
          "Could not connect to the server. Please check your internet and server connection."
        );
      } else {
        Alert.alert(
          "Signup failed",
          serverMessage || e?.message || "Something went wrong. Please try again."
        );
      }

      console.log("Signup error:", e?.response?.data || e.message);
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

          <Text
            style={{
              color: "#4c217dff",
              fontSize: 28,
              fontWeight: "800",
            }}
          >
            Create account
          </Text>

          <Text
            style={{
              marginTop: 6,
              textAlign: "center",
              opacity: 0.75,
            }}
          >
            Start personalized cosmetic safety checks
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
          <Text
            style={{
              color: "#4c217dff",
              fontWeight: "700",
              marginBottom: 6,
            }}
          >
            Full name
          </Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor="#9A9A9A"
            autoCapitalize="words"
            style={{
              borderWidth: 1,
              borderColor:
                fullName.length === 0
                  ? "#D9C9F2"
                  : nameIsValid
                  ? "#B9E0BB"
                  : "#F2B6B6",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 12,
              marginBottom: 8,
              backgroundColor: "#FBFAFF",
            }}
          />
          {fullName.length > 0 && !nameIsValid ? (
            <Text style={{ color: "#B00020", marginBottom: 10, fontWeight: "600" }}>
              Name should contain letters and spaces only.
            </Text>
          ) : (
            <View style={{ marginBottom: 12 }} />
          )}

          <Text
            style={{
              color: "#4c217dff",
              fontWeight: "700",
              marginBottom: 6,
            }}
          >
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

          <Text
            style={{
              color: "#4c217dff",
              fontWeight: "700",
              marginBottom: 6,
            }}
          >
            Password
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Minimum 6 characters"
            placeholderTextColor="#9A9A9A"
            secureTextEntry
            style={{
              borderWidth: 1,
              borderColor:
                password.length === 0
                  ? "#D9C9F2"
                  : passwordIsValid
                  ? "#B9E0BB"
                  : "#F2B6B6",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 12,
              marginBottom: 8,
              backgroundColor: "#FBFAFF",
            }}
          />
          {password.length > 0 && !passwordIsValid ? (
            <Text style={{ color: "#B00020", marginBottom: 10, fontWeight: "600" }}>
              Password must be at least 6 characters.
            </Text>
          ) : (
            <View style={{ marginBottom: 12 }} />
          )}

          <Text
            style={{
              color: "#4c217dff",
              fontWeight: "700",
              marginBottom: 6,
            }}
          >
            Confirm password
          </Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter password"
            placeholderTextColor="#9A9A9A"
            secureTextEntry
            style={{
              borderWidth: 1,
              borderColor:
                confirmPassword.length === 0
                  ? "#D9C9F2"
                  : passwordsMatch
                  ? "#B9E0BB"
                  : "#F2B6B6",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 12,
              backgroundColor: "#FBFAFF",
            }}
          />
          {confirmPassword.length > 0 && !passwordsMatch ? (
            <Text style={{ marginTop: 8, color: "#B00020", fontWeight: "700" }}>
              Passwords do not match.
            </Text>
          ) : null}

          <Pressable
            onPress={onSignup}
            disabled={!canSubmit}
            style={{
              backgroundColor: canSubmit ? "#8d67b9ff" : "#CBB6E6",
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
              marginTop: 18,
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
                  Creating account...
                </Text>
              </>
            ) : (
              <Text style={{ color: "white", fontWeight: "800" }}>
                Create account
              </Text>
            )}
          </Pressable>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: 14,
            }}
          >
            <Text style={{ opacity: 0.7 }}>Already have an account? </Text>
            <Pressable onPress={() => navigation.navigate("Login")}>
              <Text style={{ color: "#8d67b9ff", fontWeight: "800" }}>
                Log in
              </Text>
            </Pressable>
          </View>
        </View>

        <Text
          style={{
            marginTop: 16,
            textAlign: "center",
            fontSize: 12,
            opacity: 0.65,
          }}
        >
          SafeCheck is not a medical tool. Always consult a professional for medical advice.
        </Text>
      </ScrollView>
    </ScreenBackground>
  );
}
import React, { useState } from "react";
import { View, Text, Pressable, Image, ScrollView, TextInput, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";
import ScreenBackground from "../components/ScreenBackground";


export default function SignupScreen({ navigation }: any) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const canSubmit =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    confirmPassword.length >= 6 &&
    passwordsMatch;

  const onSignup = async () => {
    try {
      if (!canSubmit) {
        Alert.alert("Invalid form", "Please complete all fields correctly.");
        return;
      }

      setLoading(true);

      const response = await api.post("/api/auth/signup", {
        fullName,
        email,
        password,
      });

      await AsyncStorage.setItem("token", response.data.token);
      await AsyncStorage.setItem("user", JSON.stringify(response.data.user));

      navigation.replace("Profile", { isNewUser: true });
    } catch (e: any) {
      Alert.alert("Signup failed", e.message || "Something went wrong.");
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

        <Text style={{ color: "#4c217dff", fontSize: 28, fontWeight: "800" }}>Create account</Text>
        <Text style={{ marginTop: 6, textAlign: "center", opacity: 0.75 }}>
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
        <Text style={{ color: "#4c217dff", fontWeight: "700", marginBottom: 6 }}>Full name</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your name"
          placeholderTextColor="#9A9A9A"
          style={{
            borderWidth: 1,
            borderColor: "#D9C9F2",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
            marginBottom: 12,
            backgroundColor: "#FBFAFF",
          }}
        />

        <Text style={{ color: "#4c217dff", fontWeight: "700", marginBottom: 6 }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#9A9A9A"
          autoCapitalize="none"
          keyboardType="email-address"
          style={{
            borderWidth: 1,
            borderColor: "#D9C9F2",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
            marginBottom: 12,
            backgroundColor: "#FBFAFF",
          }}
        />

        <Text style={{ color: "#4c217dff", fontWeight: "700", marginBottom: 6 }}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Minimum 6 characters"
          placeholderTextColor="#9A9A9A"
          secureTextEntry
          style={{
            borderWidth: 1,
            borderColor: "#D9C9F2",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
            marginBottom: 12,
            backgroundColor: "#FBFAFF",
          }}
        />

        <Text style={{ color: "#4c217dff", fontWeight: "700", marginBottom: 6 }}>Confirm password</Text>
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
            Passwords don’t match
          </Text>
        ) : null}

        <Pressable
          onPress={onSignup}
          disabled={!canSubmit || loading}
          style={{
            backgroundColor: canSubmit && !loading ? "#8d67b9ff" : "#CBB6E6",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 14,
          }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>
            {loading ? "Creating account..." : "Create account"}
          </Text>
        </Pressable>

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 14 }}>
          <Text style={{ opacity: 0.7 }}>Already have an account? </Text>
          <Pressable onPress={() => navigation.navigate("Login")}>
            <Text style={{ color: "#8d67b9ff", fontWeight: "800" }}>Log in</Text>
          </Pressable>
        </View>
      </View>

      <Text style={{ marginTop: 16, textAlign: "center", fontSize: 12, opacity: 0.65 }}>
        SafeCheck is not a medical tool. Always consult a professional for medical advice.
      </Text>
    </ScrollView>
    </ScreenBackground>
  );
}
import React, { useState } from "react";
import { View, Text, Pressable, Image, ScrollView, TextInput } from "react-native";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onLogin = () => {
    // TODO: hook into my auth later
    navigation.replace("Home");
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        padding: 24,
        justifyContent: "center",
        backgroundColor: "white",
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
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

        <Text style={{ color: "#4c217dff", fontSize: 28, fontWeight: "800" }}>Welcome back</Text>
        <Text style={{ marginTop: 6, textAlign: "center", opacity: 0.75 }}>
          Log in to continue your safety checks
        </Text>
      </View>

      {/* Card */}
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
        {/* Email */}
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

        {/* Password */}
        <Text style={{ color: "#4c217dff", fontWeight: "700", marginBottom: 6 }}>Password</Text>
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

        {/* Row: Forgot */}
        <View style={{ alignItems: "flex-end", marginTop: 10 }}>
          <Pressable onPress={() => { /* later: navigation.navigate("ForgotPassword") */ }}>
            <Text style={{ color: "#8d67b9ff", fontWeight: "700" }}>Forgot password?</Text>
          </Pressable>
        </View>

        {/* Login button */}
        <Pressable
          onPress={onLogin}
          style={{
            backgroundColor: "#8d67b9ff",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 14,
          }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>Login</Text>
        </Pressable>

        {/* Divider */}
        <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 14 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: "#EEE6FA" }} />
          <Text style={{ marginHorizontal: 10, opacity: 0.6 }}>or</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: "#EEE6FA" }} />
        </View>

        {/* Create account button */}
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
          <Text style={{ color: "#8d67b9ff", fontWeight: "800" }}>Create an account</Text>
        </Pressable>
      </View>

      {/* Footer */}
      <Text style={{ marginTop: 16, textAlign: "center", fontSize: 12, opacity: 0.65 }}>
        By continuing, you agree this app does not provide medical advice.
      </Text>
    </ScrollView>
  );
}
import { View, Text, Pressable, Image, ScrollView } from "react-native";

export default function HomeScreen({ navigation }: any) {
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        padding: 24,
        justifyContent: "center",
        backgroundColor: "white",
      }}
    >
      {/* Logo and heading */}
      <View style={{ alignItems: "center", marginBottom: 24 }}>
        <View
          style={{
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: "#EDE7F6",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
            overflow: "hidden",
          }}
        >
          <Image
            source={require("../../assets/SafeCheck Logo.png")}
            style={{ width: 160, height: 160 }}
            resizeMode="cover"
          />
        </View>

        <Text style={{ color: "#4c217dff", fontSize: 32, fontWeight: "800" }}>SafeCheck</Text>
        <Text style={{ marginTop: 8, textAlign: "center", opacity: 0.75 }}>
          Your personal cosmetic safety checker
        </Text>
      </View>

      {/* Buttons container */}
      <View>
        {/* Create Account */}
        <Pressable
          onPress={() => navigation.navigate("Signup")}
          style={{
            backgroundColor: "#8d67b9ff",
            padding: 14,
            borderRadius: 12,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Create Account</Text>
        </Pressable>

        {/* Login */}
        <Pressable
          onPress={() => navigation.navigate("Login")}
          style={{
            borderColor: "#8d67b9ff",
            borderWidth: 1,
            padding: 14,
            borderRadius: 12,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <Text style={{ color: "#8d67b9ff", fontWeight: "700" }}>Login</Text>
        </Pressable>

        {/* Continue as Guest */}
        <Pressable
          onPress={() => navigation.replace("Main")}
          style={{
            padding: 14,
            borderRadius: 12,
            alignItems: "center",
            backgroundColor: "#EEE6FA",
          }}
        >
          <Text style={{ color: "#4c217dff", fontWeight: "700" }}>Continue as Guest</Text>
        </Pressable>
      </View>

      {/* Footer */}
      <Text style={{ marginTop: 16, textAlign: "center", fontSize: 12, opacity: 0.65 }}>
        Try SafeCheck now — personalized cosmetic safety at your fingertips.
      </Text>
    </ScrollView>
  );
}

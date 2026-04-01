import React from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

export default function BottomNavBar({ navigation, activeTab }: any) {
  const go = (tab: string) => {
    switch (tab) {
      case "home":
        navigation.navigate("Main");     
        break;
      case "history":
        Alert.alert("Coming soon", "History will be added later.");
        break;
      case "profile":
        navigation.navigate("Profile");
        break;
      case "settings":
        Alert.alert("Coming soon", "Settings will be added later.");
        break;
    }
  };

  return (
    <View style={styles.navbar}>
      <Pressable style={styles.navItem} onPress={() => go("home")}>
        <Ionicons name="home-outline" size={24} color={activeTab === "home" ? "#8d67b9ff" : "#777"} />
        <Text style={[styles.navText, activeTab === "home" && styles.activeText]}>Home</Text>
      </Pressable>

      <Pressable style={styles.navItem} onPress={() => go("history")}>
        <MaterialIcons name="history" size={24} color={activeTab === "history" ? "#8d67b9ff" : "#777"} />
        <Text style={[styles.navText, activeTab === "history" && styles.activeText]}>History</Text>
      </Pressable>

      <Pressable style={styles.navItem} onPress={() => go("profile")}>
        <Ionicons name="person-outline" size={24} color={activeTab === "profile" ? "#8d67b9ff" : "#777"} />
        <Text style={[styles.navText, activeTab === "profile" && styles.activeText]}>Profile</Text>
      </Pressable>

      <Pressable style={styles.navItem} onPress={() => go("settings")}>
        <Ionicons name="settings-outline" size={24} color={activeTab === "settings" ? "#8d67b9ff" : "#777"} />
        <Text style={[styles.navText, activeTab === "settings" && styles.activeText]}>Settings</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: "row",
    backgroundColor: "white",
    borderTopWidth: 1,
    borderColor: "#EEE6FA",
    justifyContent: "space-around",
    paddingVertical: 10,
    elevation: 8,
    position: "absolute",   // you chose Fix B
    bottom: 0,
    width: "100%",
  },
  navItem: { alignItems: "center" },
  navText: { fontSize: 10, marginTop: 4, color: "#777" },
  activeText: { color: "#8d67b9ff", fontWeight: "700" },
});
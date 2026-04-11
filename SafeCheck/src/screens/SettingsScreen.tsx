import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Text, ScrollView, Pressable, Alert,} from "react-native";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import BottomNavBar from "../components/BottomNavBar";
import api from "../services/api";
import ScreenBackground from "../components/ScreenBackground";


export default function SettingsScreen({ navigation }: any) {
const handleSignOut = () => {
  Alert.alert(
    "Sign Out",
    "Are you sure you want to sign out?",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("user");
          navigation.replace("Login");
        },
      },
    ]
  );
};

const handleDeleteAccount = () => {
  Alert.alert(
    "Delete Account",
    "This action is permanent. Your account and saved data will be deleted.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete("/api/auth/delete-account");
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("user");
            Alert.alert("Account Deleted", "Your account has been removed.");
            navigation.replace("Signup");
          } catch (e: any) {
            Alert.alert("Error", e.message || "Could not delete account.");
          }
        },
      },
    ]
  );
};

  const SettingRow = ({
    icon,
    iconType = "Ionicons",
    title,
    subtitle,
    onPress,
    danger = false,
  }: {
    icon: string;
    iconType?: "Ionicons" | "Feather" | "MaterialIcons";
    title: string;
    subtitle?: string;
    onPress: () => void;
    danger?: boolean;
  }) => {
    const iconColor = danger ? "#B00020" : "#6D4AA2";

    const renderIcon = () => {
      if (iconType === "Feather") {
        return <Feather name={icon as any} size={20} color={iconColor} />;
      }
      if (iconType === "MaterialIcons") {
        return <MaterialIcons name={icon as any} size={20} color={iconColor} />;
      }
      return <Ionicons name={icon as any} size={20} color={iconColor} />;
    };

    return (
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#FBFAFF",
          borderWidth: 1,
          borderColor: danger ? "#F3C7CF" : "#E3D7F5",
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 14,
          marginBottom: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: danger ? "#FFF1F3" : "#F3ECFB",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            {renderIcon()}
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: danger ? "#B00020" : "#2E2E2E",
              }}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={{
                  fontSize: 12,
                  color: "#777",
                  marginTop: 2,
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#9D8DB8" />
      </Pressable>
    );
  };

  const SectionTitle = ({ title }: { title: string }) => (
    <Text
      style={{
        color: "#4c217dff",
        fontWeight: "800",
        fontSize: 15,
        marginBottom: 10,
        marginTop: 16,
      }}
    >
      {title}
    </Text>
  );

  return (
    <ScreenBackground>
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 24,
          paddingBottom: 110,
        }}
      >
        <Text
          style={{
            color: "#4c217dff",
            fontSize: 26,
            fontWeight: "800",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Settings
        </Text>

        <Text
          style={{
            textAlign: "center",
            color: "#7C6D92",
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          Manage your account, privacy, and app preferences
        </Text>

        {/* Account */}
        <SectionTitle title="Account" />
        <SettingRow
          icon="person-outline"
          title="Account Information"
          subtitle="View your account details"
          onPress={() => navigation.navigate("AccountInfo")}
        />


        {/* Privacy & Legal */}
        <SectionTitle title="Privacy & Legal" />
        <SettingRow
          icon="shield-outline"
          title="Privacy Policy"
          subtitle="How your data is handled"
          onPress={() => navigation.navigate("PrivacyPolicy")}
        />

        {/* Support & About */}
        <SectionTitle title="Support & About" />
        <SettingRow
          icon="mail-outline"
          title="Contact Us"
          subtitle="Send feedback or report an issue"
          onPress={() => navigation.navigate("ContactUs")}
        />
        <SettingRow
          icon="info"
          iconType="MaterialIcons"
          title="About SafeCheck"
          subtitle="Version, purpose, and app information"
          onPress={() => navigation.navigate("AboutSafeCheck")}
        />

        {/* Actions */}
        <SectionTitle title="Actions" />
        <SettingRow
          icon="log-out-outline"
          title="Sign Out"
          subtitle="Log out from your account"
          onPress={handleSignOut}
        />
        <SettingRow
          icon="delete-outline"
          title="Delete My Account"
          subtitle="Permanently remove your account and saved data"
          onPress={handleDeleteAccount}
          danger
        />

        <Text
          style={{
            marginTop: 22,
            textAlign: "center",
            fontSize: 12,
            color: "#8C8C8C",
            lineHeight: 18,
          }}
        >
          SafeCheck provides ingredient-based guidance for informed choices.
          {"\n"}
          It does not replace professional medical advice.
        </Text>
      </ScrollView>

      <BottomNavBar navigation={navigation} activeTab="settings" />
    </View>
    </ScreenBackground>
  );
}
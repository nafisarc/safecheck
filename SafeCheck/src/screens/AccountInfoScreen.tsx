import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Pressable, Alert} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";
import ScreenBackground from "../components/ScreenBackground";

type UserData = {
  fullName?: string;
  email?: string;
  createdAt?: string;
};

type ProfileData = {
  age?: string;
  gender?: string;
  skinSensitivity?: string;
  avoidList?: string[];
  skinConditions?: {
    eczema?: boolean;
    rosacea?: boolean;
    psoriasis?: boolean;
    asthma?: boolean;
  };
  allergies?: {
    sulfates?: boolean;
    parabens?: boolean;
    fragrance?: boolean;
    nuts?: boolean;
    dairy?: boolean;
  };
};

const COLORS = {
  primary: "#8d67b9ff",
  deep: "#4c217dff",
  bg: "#FFFFFF",
  outline: "#EEE6FA",
  text: "#221B2D",
  muted: "#6D647A",
  greenBg: "#EAF7EE",
  greenBorder: "#B9E0BB",
  greenText: "#1B5E20",
};

function formatDate(dateString?: string) {
  if (!dateString) return "Not available";

  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "Not available";

  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function prettyLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTrueKeys(obj?: Record<string, boolean>) {
  if (!obj) return [];
  return Object.entries(obj)
    .filter(([, value]) => !!value)
    .map(([key]) => prettyLabel(key));
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || "Not provided"}</Text>
      </View>
    </View>
  );
}

function ChipList({
  title,
  items,
  emptyText,
  colorMode = "neutral",
}: {
  title: string;
  items: string[];
  emptyText: string;
  colorMode?: "neutral" | "success";
}) {
  const chipStyle =
    colorMode === "success" ? styles.successChip : styles.neutralChip;
  const chipTextStyle =
    colorMode === "success" ? styles.successChipText : styles.neutralChipText;

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {items.length > 0 ? (
        <View style={styles.chipWrap}>
          {items.map((item, index) => (
            <View key={`${item}-${index}`} style={chipStyle}>
              <Text style={chipTextStyle}>{item}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>{emptyText}</Text>
      )}
    </View>
  );
}

export default function AccountInfoScreen({ navigation }: any) {
  const [user, setUser] = useState<UserData>({});
  const [profile, setProfile] = useState<ProfileData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccountInfo();
  }, []);

  const loadAccountInfo = async () => {
    try {
      setLoading(true);

      const [userRes, profileRes] = await Promise.all([
        api.get("/api/auth/me"),
        api.get("/api/profile/me"),
      ]);

      setUser(userRes.data || {});
      setProfile(profileRes.data || {});
    } catch (e: any) {
      console.log("Account info load error:", e?.response?.data || e?.message);
      Alert.alert(
        "Could not load account info",
        e?.response?.data?.error || e?.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  const conditionList = useMemo(
    () => getTrueKeys(profile.skinConditions as Record<string, boolean>),
    [profile.skinConditions]
  );

  const allergyList = useMemo(
    () => getTrueKeys(profile.allergies as Record<string, boolean>),
    [profile.allergies]
  );

  const avoidList = useMemo(
    () => (Array.isArray(profile.avoidList) ? profile.avoidList : []),
    [profile.avoidList]
  );

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your account information...</Text>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person-outline" size={28} color={COLORS.primary} />
          </View>

          <Text style={styles.heroTitle}>Account Information</Text>
          <Text style={styles.heroSubtitle}>
            View your personal and profile details saved in SafeCheck
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account Details</Text>

          <InfoRow
            label="Full Name"
            value={user.fullName || "Not provided"}
            icon="person-outline"
          />
          <InfoRow
            label="Email Address"
            value={user.email || "Not provided"}
            icon="mail-outline"
          />
          <InfoRow
            label="Account Created"
            value={formatDate(user.createdAt)}
            icon="calendar-outline"
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Profile Details</Text>

          <InfoRow
            label="Age"
            value={profile.age || "Not provided"}
            icon="hourglass-outline"
          />
          <InfoRow
            label="Gender"
            value={profile.gender || "Not provided"}
            icon="people-outline"
          />
          <InfoRow
            label="Skin Sensitivity"
            value={profile.skinSensitivity || "Not provided"}
            icon="water-outline"
          />
        </View>

        <ChipList
          title="Skin Conditions"
          items={conditionList}
          emptyText="No skin conditions selected."
          colorMode="neutral"
        />

        <ChipList
          title="Known Allergies"
          items={allergyList}
          emptyText="No allergies selected."
          colorMode="neutral"
        />

        <ChipList
          title="My Avoid List"
          items={avoidList}
          emptyText="No ingredients saved in your Avoid List yet."
          colorMode="success"
        />

        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 100,
  },

  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    color: COLORS.muted,
    fontSize: 14,
  },

  heroCard: {
    backgroundColor: "#F7F1FD",
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E7D8F8",
    marginBottom: 16,
  },

  avatarCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#EADCFB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  heroTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: COLORS.deep,
    marginBottom: 6,
    textAlign: "center",
  },

  heroSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 20,
  },

  sectionCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.outline,
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.deep,
    marginBottom: 14,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },

  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3ECFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },

  infoLabel: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 3,
    fontWeight: "600",
  },

  infoValue: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 21,
    fontWeight: "700",
  },

  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  neutralChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#F6F2FC",
    borderWidth: 1,
    borderColor: "#E5D8F7",
  },

  neutralChipText: {
    color: COLORS.deep,
    fontWeight: "700",
    fontSize: 13,
  },

  successChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: COLORS.greenBg,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
  },

  successChipText: {
    color: COLORS.greenText,
    fontWeight: "700",
    fontSize: 13,
  },

  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
  },

  backButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
  },

  backButtonText: {
    color: "white",
    fontWeight: "800",
    fontSize: 15,
  },
});
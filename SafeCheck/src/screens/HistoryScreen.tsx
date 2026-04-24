import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import ScreenBackground from "../components/ScreenBackground";
import BottomNavBar from "../components/BottomNavBar";
import api from "../services/api";

const COLORS = {
  primary: "#8d67b9ff",
  deep: "#4c217dff",
  outline: "#EEE6FA",
  muted: "#6D647A",
};

type Risk = "low" | "caution" | "high" | "unknown";

function getRiskStyle(risk: Risk) {
  if (risk === "high")
    return { bg: "#FDECEC", border: "#F2B6B6", text: "#B00020", label: "High Risk", icon: "warning-outline" as const };
  if (risk === "caution")
    return { bg: "#FFF4E5", border: "#FFD6A3", text: "#7A4B00", label: "Caution", icon: "alert-circle-outline" as const };
  if (risk === "low")
    return { bg: "#EAF7EE", border: "#B9E0BB", text: "#1B5E20", label: "Low Risk", icon: "shield-checkmark-outline" as const };
  return { bg: "#F3F3F3", border: "#E0E0E0", text: "#333", label: "Unknown", icon: "help-circle-outline" as const };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function HistoryScreen({ navigation }: any) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeMode, setActiveMode] = useState<"all" | "ingredients" | "product">("all");

  const fetchHistory = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await api.get("/api/history");
      setHistory(res.data.history || []);
    } catch (e) {
      console.log("History fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh History
  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const deleteEntry = (id: string) => {
    Alert.alert("Delete entry", "Remove this scan from your history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/api/history/${id}`);
            setHistory((prev) => prev.filter((h) => h._id !== id));
          } catch (e) {
            Alert.alert("Error", "Could not delete entry.");
          }
        },
      },
    ]);
  };

  const filtered = history.filter((h) => {
    if (activeMode === "all") return true;
    return h.mode === activeMode;
  });

  const HistoryCard = ({ item }: { item: any }) => {
    const risk = getRiskStyle(item.overall_risk as Risk);
    const isProduct = item.mode === "product";

    return (
      <Pressable
        onPress={() =>
          navigation.navigate("Result", {
            payload: { overall_risk: item.overall_risk, results: item.results },
            inputIngredients: item.inputIngredients,
            profileFlags: [],
            mode: item.mode,
            productTitle: item.productTitle,
          })
        }
        style={{
          backgroundColor: "white",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: COLORS.outline,
          padding: 16,
          marginBottom: 12,
        }}
      >
        {/* Top row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, marginRight: 10 }}>
            {/* Mode badge */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Ionicons
                name={isProduct ? "cube-outline" : "list-outline"}
                size={14}
                color={COLORS.muted}
              />
              <Text style={{ fontSize: 12, color: COLORS.muted, fontWeight: "700", textTransform: "uppercase" }}>
                {isProduct ? "Product" : "Ingredients"}
              </Text>
            </View>

            {/* Title */}
            <Text style={{ color: COLORS.deep, fontWeight: "900", fontSize: 16 }} numberOfLines={2}>
              {isProduct
                ? item.productTitle || "Unknown Product"
                : item.inputIngredients?.slice(0, 3).join(", ") +
                  (item.inputIngredients?.length > 3
                    ? ` +${item.inputIngredients.length - 3} more`
                    : "")}
            </Text>

            <Text style={{ marginTop: 4, fontSize: 12, color: COLORS.muted }}>
              {timeAgo(item.createdAt)}
            </Text>
          </View>

          {/* Risk badge */}
          <View
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: risk.bg,
              borderWidth: 1,
              borderColor: risk.border,
              alignItems: "center",
              gap: 4,
            }}
          >
            <Ionicons name={risk.icon} size={14} color={risk.text} />
            <Text style={{ color: risk.text, fontWeight: "900", fontSize: 11 }}>
              {risk.label}
            </Text>
          </View>
        </View>

        {/* Bottom row */}
        <View
          style={{
            marginTop: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 13, color: COLORS.muted }}>
            {item.flaggedCount > 0
              ? `⚠️ ${item.flaggedCount} flagged ingredient${item.flaggedCount > 1 ? "s" : ""}`
              : "✅ No flagged ingredients"}
          </Text>

          <Pressable onPress={() => deleteEntry(item._id)} hitSlop={10}>
            <Ionicons name="trash-outline" size={18} color="#B00020" />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenBackground>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchHistory(true)} />
          }
        >
          {/* Header */}
          <Text style={{ color: COLORS.deep, fontSize: 26, fontWeight: "800" }}>
            Scan History
          </Text>
          <Text style={{ marginTop: 6, opacity: 0.7 }}>
            Your previous ingredient & product checks.
          </Text>

          {/* Filter tabs */}
          <View
            style={{
              marginTop: 16,
              flexDirection: "row",
              backgroundColor: "#EEE6FA",
              borderRadius: 999,
              padding: 4,
            }}
          >
            {(["all", "ingredients", "product"] as const).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setActiveMode(mode)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 999,
                  alignItems: "center",
                  backgroundColor: activeMode === mode ? "white" : "transparent",
                }}
              >
                <Text style={{ fontWeight: "800", color: COLORS.deep, fontSize: 13 }}>
                  {mode === "all" ? "All" : mode === "ingredients" ? "Ingredients" : "Products"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Content */}
          <View style={{ marginTop: 16 }}>
            {loading ? (
              <View style={{ alignItems: "center", marginTop: 60 }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 12, color: COLORS.muted }}>Loading history...</Text>
              </View>
            ) : filtered.length === 0 ? (
              <View
                style={{
                  alignItems: "center",
                  marginTop: 60,
                  padding: 24,
                  backgroundColor: "#F8F5FF",
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: COLORS.outline,
                }}
              >
                <Ionicons name="time-outline" size={48} color={COLORS.primary} />
                <Text style={{ marginTop: 16, color: COLORS.deep, fontWeight: "900", fontSize: 18 }}>
                  No history yet
                </Text>
                <Text style={{ marginTop: 8, color: COLORS.muted, textAlign: "center" }}>
                  Your scans and ingredient checks will appear here after you run your first check.
                </Text>
                <Pressable
                  onPress={() => navigation.navigate("Manual")}
                  style={{
                    marginTop: 20,
                    backgroundColor: COLORS.primary,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "800" }}>Start a Check</Text>
                </Pressable>
              </View>
            ) : (
              filtered.map((item) => (
                <HistoryCard key={item._id} item={item} />
              ))
            )}
          </View>
        </ScrollView>

        <BottomNavBar navigation={navigation} activeTab="history" />
      </View>
    </ScreenBackground>
  );
}
import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native";
import api from "../services/api"; // adjust if your api.ts is elsewhere

function splitIngredients(raw: string): string[] {
  // handles commas, newlines, bullet dots
  return raw
    .replace(/•/g, ",")
    .replace(/\n/g, ",")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function ManualScreen({ navigation, route }: any) {
  // Optional: pass profileFlags from previous screen later
  const profileFlags: string[] = route?.params?.profileFlags || [];

  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const parsedList = useMemo(() => splitIngredients(rawText), [rawText]);

  const onAnalyze = async () => {
    setErrorMsg("");

    if (parsedList.length === 0) {
      setErrorMsg("Please paste or type at least one ingredient.");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/api/check", {
        ingredients: parsedList,
        profileFlags, // can be [] for guest
      });

      // Send results to your Result screen
      navigation.navigate("Result", {
        payload: res.data,
        inputIngredients: parsedList,
      });
    } catch (e: any) {
      setErrorMsg(e?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, padding: 24, backgroundColor: "white" }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ color: "#4c217dff", fontSize: 26, fontWeight: "800" }}>Type Ingredients</Text>
      <Text style={{ marginTop: 6, opacity: 0.75 }}>
        Paste the ingredient list exactly as shown on the label for the best match.
      </Text>

      {/* Tip card */}
      <View
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 14,
          backgroundColor: "#EDE7F6",
          borderWidth: 1,
          borderColor: "#EEE6FA",
        }}
      >
        <Text style={{ color: "#4c217dff", fontWeight: "800" }}>Tip</Text>
        <Text style={{ marginTop: 6, opacity: 0.8 }}>
          Ingredient lists are usually on the back of the product. Separate ingredients by commas.
        </Text>
      </View>

      {/* Text box */}
      <View style={{ marginTop: 16 }}>
        <Text style={{ color: "#4c217dff", fontWeight: "700", marginBottom: 8 }}>
          Ingredient list
        </Text>

        <TextInput
          value={rawText}
          onChangeText={setRawText}
          placeholder="Example: Water, Glycerin, Niacinamide, Salicylic Acid..."
          placeholderTextColor="#9A9A9A"
          multiline
          style={{
            minHeight: 160,
            textAlignVertical: "top",
            borderWidth: 1,
            borderColor: "#D9C9F2",
            borderRadius: 14,
            padding: 14,
            backgroundColor: "#FBFAFF",
          }}
        />

        <Text style={{ marginTop: 10, opacity: 0.7 }}>
          Detected ingredients: <Text style={{ fontWeight: "800" }}>{parsedList.length}</Text>
        </Text>

        {errorMsg ? (
          <Text style={{ marginTop: 10, color: "#B00020", fontWeight: "700" }}>{errorMsg}</Text>
        ) : null}
      </View>

      {/* Analyze button */}
      <Pressable
        onPress={onAnalyze}
        disabled={loading}
        style={{
          marginTop: 18,
          backgroundColor: loading ? "#CBB6E6" : "#8d67b9ff",
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: "center",
        }}
      >
        {loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator color="white" />
            <Text style={{ color: "white", fontWeight: "800" }}>Analyzing...</Text>
          </View>
        ) : (
          <Text style={{ color: "white", fontWeight: "800" }}>Analyze Ingredients</Text>
        )}
      </Pressable>

      {/* Secondary */}
      <Pressable
        onPress={() => setRawText("")}
        style={{
          marginTop: 10,
          borderColor: "#8d67b9ff",
          borderWidth: 1,
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#8d67b9ff", fontWeight: "800" }}>Clear</Text>
      </Pressable>
    </ScrollView>
  );
}
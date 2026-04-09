import React, { useState, useRef } from "react";
import {
  View, Text, Pressable, ActivityIndicator, Alert, ScrollView
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import api from "../services/api";
import ScreenBackground from "../components/ScreenBackground";

const GOOGLE_VISION_KEY = process.env.EXPO_PUBLIC_GOOGLE_VISION_KEY;

function splitIngredients(raw: string): string[] {
  return raw
    .replace(/•/g, ",")
    .replace(/\n/g, ",")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function ScanScreen({ navigation, route }: any) {
  const profileFlags: string[] = route?.params?.profileFlags ?? [];
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const cameraRef = useRef<CameraView>(null);

  // Permission not yet determined
  if (!permission) {
    return <View />;
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <ScreenBackground>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Text style={{ color: "#4c217dff", fontSize: 18, fontWeight: "800", marginBottom: 12 }}>
            Camera Access Needed
          </Text>
          <Text style={{ textAlign: "center", opacity: 0.7, marginBottom: 20 }}>
            SafeCheck needs camera access to scan ingredient labels.
          </Text>
          <Pressable
            onPress={requestPermission}
            style={{
              backgroundColor: "#8d67b9ff",
              paddingVertical: 14,
              paddingHorizontal: 32,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "white", fontWeight: "800" }}>Grant Permission</Text>
          </Pressable>
        </View>
      </ScreenBackground>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || loading) return;

    try {
      setLoading(true);
      setStatusMsg("Capturing image...");

      // 1. Take photo as base64
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
      });

      if (!photo?.base64) {
        Alert.alert("Error", "Could not capture image. Please try again.");
        return;
      }

      // 2. Send to Google Vision API
      setStatusMsg("Reading ingredients...");
      const visionRes = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: { content: photo.base64 },
                features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
              },
            ],
          }),
        }
      );

      const visionData = await visionRes.json();
      const rawText =
        visionData?.responses?.[0]?.fullTextAnnotation?.text || "";

      if (!rawText.trim()) {
        Alert.alert(
          "No text found",
          "SafeCheck couldn't read text from this image. Try better lighting or hold the camera closer."
        );
        return;
      }

      // 3. Parse into ingredients list
      const parsedList = splitIngredients(rawText);

      if (parsedList.length === 0) {
        Alert.alert(
          "No ingredients detected",
          "Text was found but no comma-separated ingredients could be parsed. Try the Manual input instead."
        );
        return;
      }

      // 4. Send to your existing /api/check endpoint
      setStatusMsg("Analyzing ingredients...");
      const res = await api.post("/api/check", {
        ingredients: parsedList,
        profileFlags,
      });

      // 5. Navigate to ResultScreen — same as ManualScreen does
      navigation.navigate("Result", {
        payload: res.data,
        inputIngredients: parsedList,
        profileFlags,
        mode: "ingredients",
      });

    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.error || e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  return (
    <ScreenBackground>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ padding: 24, paddingBottom: 12 }}>
          <Text style={{ color: "#4c217dff", fontSize: 26, fontWeight: "800" }}>
            Scan Ingredients
          </Text>
          <Text style={{ marginTop: 6, opacity: 0.75 }}>
            Point camera at the ingredient list on the label.
          </Text>
        </View>

        {/* Camera */}
        <View style={{ flex: 1, marginHorizontal: 24, borderRadius: 20, overflow: "hidden" }}>
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing="back"
          />
        </View>

        {/* Tip */}
        <View
          style={{
            marginHorizontal: 24,
            marginTop: 12,
            padding: 12,
            borderRadius: 14,
            backgroundColor: "#EDE7F6",
          }}
        >
          <Text style={{ color: "#4c217dff", fontSize: 13, opacity: 0.85 }}>
            💡 Tip: Make sure the full ingredient list is in frame and well-lit for best results.
          </Text>
        </View>

        {/* Capture button */}
        <View style={{ padding: 24, paddingTop: 16 }}>
          <Pressable
            onPress={handleCapture}
            disabled={loading}
            style={{
              backgroundColor: loading ? "#CBB6E6" : "#8d67b9ff",
              paddingVertical: 16,
              borderRadius: 14,
              alignItems: "center",
            }}
          >
            {loading ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <ActivityIndicator color="white" />
                <Text style={{ color: "white", fontWeight: "800" }}>{statusMsg}</Text>
              </View>
            ) : (
              <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>
                📸 Capture & Analyze
              </Text>
            )}
          </Pressable>

          {/* Manual fallback */}
          <Pressable
            onPress={() => navigation.navigate("Manual", { profileFlags })}
            style={{ marginTop: 10, alignItems: "center" }}
          >
            <Text style={{ color: "#8d67b9ff", fontWeight: "700" }}>
              Enter ingredients manually instead
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenBackground>
  );
}
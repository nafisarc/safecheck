import React, { useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import api from "../services/api";
import ScreenBackground from "../components/ScreenBackground";

const GOOGLE_VISION_KEY = process.env.EXPO_PUBLIC_GOOGLE_VISION_KEY;

function splitIngredients(raw: string): string[] {
  return raw
    .replace(/•/g, ",")
    .replace(/\n/g, ",")
    .replace(/;/g, ",")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index);
}

export default function ScanScreen({ navigation, route }: any) {
  const profileFlags: string[] = route?.params?.profileFlags ?? [];
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View style={{ flex: 1 }} />;
  }

  if (!permission.granted) {
    return (
      <ScreenBackground>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <Text
            style={{
              color: "#4c217dff",
              fontSize: 18,
              fontWeight: "800",
              marginBottom: 12,
            }}
          >
            Camera Access Needed
          </Text>

          <Text
            style={{
              textAlign: "center",
              opacity: 0.7,
              marginBottom: 20,
              lineHeight: 22,
            }}
          >
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
            <Text style={{ color: "white", fontWeight: "800" }}>
              Grant Permission
            </Text>
          </Pressable>
        </View>
      </ScreenBackground>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || loading) return;

    if (!GOOGLE_VISION_KEY) {
      Alert.alert(
        "Configuration error",
        "Google Vision API key is missing. Please check your environment settings."
      );
      return;
    }

    try {
      setLoading(true);
      setStatusMsg("Capturing image...");

      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
      });

      if (!photo?.base64) {
        Alert.alert("Capture failed", "Could not capture image. Please try again.");
        return;
      }

      setStatusMsg("Reading ingredients...");

      const visionRes = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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

      if (!visionRes.ok) {
        const errorText = await visionRes.text();
        console.log("Vision API error:", visionRes.status, errorText);

        Alert.alert(
          "OCR failed",
          "SafeCheck could not read the image right now. Please try again in a moment."
        );
        return;
      }

      const visionData = await visionRes.json();

      const apiError = visionData?.responses?.[0]?.error;
      if (apiError) {
        console.log("Vision API response error:", apiError);

        Alert.alert(
          "OCR failed",
          apiError.message || "SafeCheck could not process the image."
        );
        return;
      }

      const rawText = visionData?.responses?.[0]?.fullTextAnnotation?.text || "";

      if (!rawText.trim()) {
        Alert.alert(
          "No text found",
          "SafeCheck could not detect readable text. Try better lighting, hold the camera closer, and make sure the ingredient list is fully visible."
        );
        return;
      }

      const parsedList = splitIngredients(rawText);

      if (parsedList.length === 0) {
        Alert.alert(
          "No ingredients detected",
          "Text was found, but SafeCheck could not turn it into a usable ingredient list. You can try again or enter ingredients manually."
        );
        return;
      }

      setStatusMsg("Analyzing ingredients...");

      const res = await api.post("/api/check", {
        ingredients: parsedList,
        profileFlags,
      });

      navigation.navigate("Result", {
        payload: res.data,
        inputIngredients: parsedList,
        profileFlags,
        mode: "ingredients",
      });
    } catch (e: any) {
      console.log("Scan error:", e?.response?.data || e?.message || e);

      if (e?.message?.toLowerCase?.().includes("network")) {
        Alert.alert(
          "Connection problem",
          "Could not connect to the server. Please check your internet and backend connection."
        );
      } else {
        Alert.alert(
          "Scan failed",
          e?.response?.data?.error ||
            e?.message ||
            "Something went wrong while scanning."
        );
      }
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  return (
    <ScreenBackground>
      <View style={{ flex: 1 }}>
        <View style={{ padding: 24, paddingBottom: 12 }}>
          <Text
            style={{
              color: "#4c217dff",
              fontSize: 26,
              fontWeight: "800",
            }}
          >
            Scan Ingredients
          </Text>

          <Text style={{ marginTop: 6, opacity: 0.75 }}>
            Point the camera at the ingredient list on the label.
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            marginHorizontal: 24,
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
        </View>

        <View
          style={{
            marginHorizontal: 24,
            marginTop: 12,
            padding: 12,
            borderRadius: 14,
            backgroundColor: "#EDE7F6",
          }}
        >
          <Text
            style={{
              color: "#4c217dff",
              fontSize: 13,
              opacity: 0.85,
              lineHeight: 18,
            }}
          >
            💡 Tip: Make sure the full ingredient list is in frame and well lit for the best result.
          </Text>
        </View>

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
                <Text style={{ color: "white", fontWeight: "800" }}>
                  {statusMsg}
                </Text>
              </View>
            ) : (
              <Text
                style={{
                  color: "white",
                  fontWeight: "800",
                  fontSize: 16,
                }}
              >
                📸 Capture & Analyze
              </Text>
            )}
          </Pressable>

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
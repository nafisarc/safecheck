import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomNavBar from "../components/BottomNavBar";
import ScreenBackground from "../components/ScreenBackground";
import api from "../services/api";

export default function MainScreen({ navigation }: any) {
  const [userName, setUserName] = useState("there");
  const [productOfDay, setProductOfDay] = useState<any>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      const [userRes, productRes] = await Promise.all([
        api.get("/api/auth/me"),
        api.get("/api/products/random"),
      ]);

      const fullName = userRes?.data?.fullName || "there";
      const firstName = fullName.trim().split(" ")[0];
      setUserName(firstName);

      setProductOfDay(productRes?.data?.product || null);
    } catch (e: any) {
      console.log("Home load error:", e?.response?.data || e.message);
    } finally {
      setLoadingProduct(false);
    }
  };

  return (
    <ScreenBackground>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Top welcome area */}
          <View style={styles.welcomeSection}>
            <Text style={styles.greeting}>Hi, {userName}</Text>
            <Text style={styles.homeTitle}>Welcome to SafeCheck</Text>
            <Text style={styles.subtitle}>
              Check cosmetic ingredients with more confidence and get clearer
              safety guidance based on your profile.
            </Text>
          </View>

          {/* Main action cards */}
          <View style={styles.buttonsContainer}>
            <Pressable
              onPress={() => navigation.navigate("Manual")}
              style={[styles.mainButton, styles.primaryButton]}
            >
              <Ionicons name="flask-outline" size={52} color="white" />
              <View style={styles.buttonTextWrap}>
                <Text style={styles.primaryButtonTitle}>
                  Type a Product or Ingredient
                </Text>
                <Text style={styles.primaryButtonSubtitle}>
                  Search manually and get a quick safety check
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate("Scan")}
              style={[styles.mainButton, styles.secondaryButton]}
            >
              <Ionicons name="camera-outline" size={52} color="#4c217dff" />
              <View style={styles.buttonTextWrap}>
                <Text style={styles.secondaryButtonTitle}>
                  Scan a Product or Ingredient
                </Text>
                <Text style={styles.secondaryButtonSubtitle}>
                  Snap a label and let SafeCheck review it
                </Text>
              </View>
            </Pressable>
          </View>

          {/* How it works */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>How it works</Text>

            <View style={styles.stepRow}>
              <Text style={styles.stepEmoji}>1️⃣</Text>
              <Text style={styles.stepText}>
                Snap a photo of ingredients or type them in manually.
              </Text>
            </View>

            <View style={styles.stepRow}>
              <Text style={styles.stepEmoji}>2️⃣</Text>
              <Text style={styles.stepText}>
                SafeCheck checks ingredients against its knowledge base and your
                profile.
              </Text>
            </View>

            <View style={styles.stepRow}>
              <Text style={styles.stepEmoji}>3️⃣</Text>
              <Text style={styles.stepText}>
                Get a personalized safety summary and simple explanation
                instantly.
              </Text>
            </View>
          </View>

          {/* Product of the Day */}
          <View style={styles.productCard}>
            <View style={styles.productHeaderRow}>
              <View style={styles.productIconCircle}>
                <Ionicons name="sparkles-outline" size={20} color="#4c217dff" />
              </View>
              <Text style={styles.cardTitle}>Product of the Day</Text>
            </View>

            {loadingProduct ? (
              <View style={{ paddingVertical: 18 }}>
                <ActivityIndicator size="small" color="#8d67b9ff" />
                <Text style={styles.loadingText}>Loading a featured product...</Text>
              </View>
            ) : productOfDay ? (
              <>
                <Text style={styles.productBrand}>{productOfDay.brand}</Text>
                <Text style={styles.productName}>{productOfDay.name}</Text>

                {productOfDay.category ? (
                  <Text style={styles.productMeta}>
                    Category: {productOfDay.category}
                  </Text>
                ) : null}

                <Text style={styles.productMeta}>
                  Ingredients in record: {productOfDay.ingredientsCount}
                </Text>

                <Pressable
                  onPress={() =>
                    navigation.navigate("Result", {
                      productId: productOfDay.id,
                    })
                  }
                  style={styles.productButton}
                >
                  <Text style={styles.productButtonText}>Check this product</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.productFallback}>
                No featured product available right now.
              </Text>
            )}
          </View>

          <View style={{ height: 90 }} />
        </ScrollView>

        <BottomNavBar navigation={navigation} activeTab="home" />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 100,
  },

  welcomeSection: {
    marginBottom: 22,
  },
  greeting: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6f5a8f",
    marginBottom: 6,
  },
  homeTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#4c217dff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "#6f6a78",
  },

  buttonsContainer: {
    marginTop: 4,
    marginBottom: 6,
  },
  mainButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: "#8d67b9ff",
  },
  secondaryButton: {
    backgroundColor: "#EEE6FA",
    borderColor: "#8d67b9ff",
    borderWidth: 2,
  },
  buttonTextWrap: {
    flex: 1,
    marginLeft: 16,
  },
  primaryButtonTitle: {
    color: "white",
    fontWeight: "800",
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 4,
  },
  primaryButtonSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    lineHeight: 18,
  },
  secondaryButtonTitle: {
    color: "#4c217dff",
    fontWeight: "800",
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 4,
  },
  secondaryButtonSubtitle: {
    color: "#6f5a8f",
    fontSize: 13,
    lineHeight: 18,
  },

  infoCard: {
    backgroundColor: "#FBFAFF",
    borderColor: "#E9DDF8",
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginTop: 10,
  },
  cardTitle: {
    color: "#4c217dff",
    fontWeight: "800",
    fontSize: 20,
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  stepEmoji: {
    fontSize: 22,
    marginRight: 10,
    marginTop: 1,
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 25,
    color: "#333",
  },

  productCard: {
    backgroundColor: "#F7F1FD",
    borderRadius: 18,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E4D4F5",
  },
  productHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  productIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EBDDFA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  productBrand: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8d67b9ff",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  productName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2E1A47",
    marginBottom: 10,
    lineHeight: 27,
  },
  productMeta: {
    fontSize: 14,
    color: "#5c5268",
    marginBottom: 6,
    lineHeight: 20,
  },
  productButton: {
    marginTop: 12,
    backgroundColor: "#8d67b9ff",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  productButtonText: {
    color: "white",
    fontWeight: "800",
    fontSize: 15,
  },
  loadingText: {
    textAlign: "center",
    color: "#6f5a8f",
    marginTop: 8,
  },
  productFallback: {
    color: "#6f5a8f",
    fontSize: 14,
    lineHeight: 20,
  },
});
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Image, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomNavBar from "../components/BottomNavBar"; 
import ScreenBackground from "../components/ScreenBackground";

export default function CheckProductScreen({ navigation }: any) {

  return (
    <ScreenBackground>
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/*  Header with  logo */}
        <View style={styles.header}>
          <Image
            source={require("../../assets/SafeCheck Logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headerTagline}>Your personal safety assistant</Text>
        </View>

        {/* Main vertical buttons */}
        <View style={styles.buttonsContainer}>
          <Pressable
            onPress={() => navigation.navigate("Manual")}
            style={[styles.mainButton, { backgroundColor: "#8d67b9ff" }]}
          >
            <Ionicons name="flask-outline" size={100} color="white" />
            <Text style={[styles.buttonText, { color: "white" }]}>Type a Product or Ingredient</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              navigation.navigate("Scan");
            }}
            style={[
              styles.mainButton,
              { backgroundColor: "#EEE6FA", borderColor: "#8d67b9ff", borderWidth: 2 },
            ]}
          >
            <Ionicons name="camera-outline" size={100} color="#4c217dff" />
            <Text style={[styles.buttonText, { color: "#4c217dff" }]}>Scan a Product or Ingredient</Text>
          </Pressable>
        </View>

        {/* Info block */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            1️⃣ Snap a photo of ingredients or type them in manually.{"\n"}{"\n"}
            2️⃣ SafeCheck scans and flags risky ingredients for your skin and allergies.{"\n"}{"\n"}
            3️⃣ Get a personalized safety summary and simple explanation instantly!
          </Text>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
      <BottomNavBar navigation={navigation} activeTab="home" />
    </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    alignItems: "center",
    marginBottom: 10,
  },
  logo: {
    width: 70,
    height: 70,
    marginBottom: 8,
  },
  headerTagline: {
    color: "#4c217dff",
    opacity: 0.75,
    fontStyle: "italic",
  },
  buttonsContainer: {
    marginTop: 20,
  },
  mainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    marginLeft: 10,
    fontWeight: "700",
    fontSize: 16,
  },
  infoCard: {
    backgroundColor: "#FBFAFF",
    borderColor: "#EEE6FA",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
  },
  infoTitle: {
    color: "#4c217dff",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 6,
  },
  infoText: {
    opacity: 0.8,
    lineHeight: 20,
  },
});

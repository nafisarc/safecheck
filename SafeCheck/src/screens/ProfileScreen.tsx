import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, Keyboard, Switch, Alert } from "react-native";
import api from "../services/api";
import BottomNavBar from "../components/BottomNavBar";
import ScreenBackground from "../components/ScreenBackground";

export default function ProfileScreen({ navigation, route }: any) {
  const isNewUser = route?.params?.isNewUser || false;
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"Female" | "Male" | "Other" | "">("");

  const [skinConditions, setSkinConditions] = useState({
    eczema: false,
    rosacea: false,
    psoriasis: false,
    asthma: false,
  });

  const [allergies, setAllergies] = useState({
    sulfates: false,
    parabens: false,
    fragrance: false,
    nuts: false,
    dairy: false,
  });

  const [skinSensitivity, setSkinSensitivity] = useState<
    "Normal" | "Sensitive" | "Very Sensitive" | ""
  >("");

  const [avoidItem, setAvoidItem] = useState("");
  const [avoidList, setAvoidList] = useState<string[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);

      const response = await api.get("/api/profile/me");
      const profile = response.data || {};

      setAge(profile.age || "");
      setGender(profile.gender || "");
      setSkinSensitivity(profile.skinSensitivity || "");
      setAvoidList(profile.avoidList || []);

      setSkinConditions({
        eczema: profile.skinConditions?.eczema || false,
        rosacea: profile.skinConditions?.rosacea || false,
        psoriasis: profile.skinConditions?.psoriasis || false,
        asthma: profile.skinConditions?.asthma || false,
      });

      setAllergies({
        sulfates: profile.allergies?.sulfates || false,
        parabens: profile.allergies?.parabens || false,
        fragrance: profile.allergies?.fragrance || false,
        nuts: profile.allergies?.nuts || false,
        dairy: profile.allergies?.dairy || false,
      });
    } catch (e: any) {
      console.log("Load profile error:", e?.response?.data || e.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  const addToAvoidList = () => {
    if (avoidItem.trim().length > 0) {
      setAvoidList([...avoidList, avoidItem.trim()]);
      setAvoidItem("");
    }
  };

  const removeFromAvoidList = (item: string) => {
    setAvoidList(avoidList.filter((i) => i !== item));
  };

  const onSaveProfile = async () => {
    const profileData = {
      age,
      gender,
      skinConditions,
      allergies,
      skinSensitivity,
      avoidList,
    };

    try {
      await api.post("/api/profile", profileData);
      Alert.alert("Success", "Profile saved successfully.");
      if (isNewUser) {
      navigation.replace("Home");
    } else {
      navigation.goBack(); // or navigation.navigate("Main")
    }
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.error || e.message || "Could not save profile."
      );
      console.log("Save profile error:", e?.response?.data || e.message);
    }
  };

  return (
    <ScreenBackground>
    <View style={{ flex: 1}}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 24,
          paddingBottom: 100,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            color: "#4c217dff",
            fontSize: 26,
            fontWeight: "800",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          Your Profile
        </Text>

        {loadingProfile ? (
          <Text style={{ textAlign: "center", marginBottom: 16, color: "#777" }}>
            Loading your profile...
          </Text>
        ) : null}

        <Text style={{ color: "#4c217dff", fontWeight: "700", marginBottom: 6 }}>
          Basic Information
        </Text>

        <Text style={{ color: "#4c217dff", fontWeight: "700", marginBottom: 6 }}>
          Age
        </Text>

        <TextInput
          placeholder="Enter your age"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
          blurOnSubmit={true}
          placeholderTextColor="#9A9A9A"
          style={{
            borderWidth: 1,
            borderColor: "#D9C9F2",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            backgroundColor: "#FBFAFF",
            color: "#2E2E2E",
          }}
        />

        <Text style={{ color: "#4c217dff", fontWeight: "700", marginBottom: 6 }}>
          Gender
        </Text>

        <View style={{ flexDirection: "row", marginBottom: 16 }}>
          {["Female", "Male", "Other"].map((option, index) => (
            <Pressable
              key={option}
              onPress={() => setGender(option as "Female" | "Male" | "Other")}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: gender === option ? "#8d67b9ff" : "#D9C9F2",
                borderRadius: 12,
                alignItems: "center",
                marginRight: index !== 2 ? 6 : 0,
                backgroundColor: gender === option ? "#EDE7F6" : "#FBFAFF",
              }}
            >
              <Text
                style={{
                  color: gender === option ? "#4c217dff" : "#666",
                  fontWeight: "700",
                }}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ color: "#4c217dff", fontWeight: "700", marginBottom: 6 }}>
          Skin Sensitivity
        </Text>

        <View style={{ flexDirection: "row", marginBottom: 16 }}>
          {["Normal", "Sensitive", "Very Sensitive"].map((level) => (
            <Pressable
              key={level}
              onPress={() => setSkinSensitivity(level as any)}
              style={{
                flex: 1,
                padding: 10,
                borderWidth: 1,
                borderColor: skinSensitivity === level ? "#8d67b9ff" : "#D9C9F2",
                borderRadius: 10,
                alignItems: "center",
                marginRight: 6,
                backgroundColor: skinSensitivity === level ? "#EDE7F6" : "transparent",
              }}
            >
              <Text
                style={{
                  color: skinSensitivity === level ? "#4c217dff" : "#666",
                  fontWeight: "700",
                }}
              >
                {level}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ color: "#4c217dff", fontWeight: "700", marginBottom: 6 }}>
          Known Allergies
        </Text>

        {Object.keys(allergies).map((a) => (
          <View
            key={a}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <Text style={{ textTransform: "capitalize" }}>{a}</Text>
            <Switch
              value={allergies[a as keyof typeof allergies]}
              onValueChange={(val) =>
                setAllergies({ ...allergies, [a]: val })
              }
              trackColor={{ false: "#DDD", true: "#CBB6E6" }}
              thumbColor={
                allergies[a as keyof typeof allergies] ? "#8d67b9ff" : "#f4f3f4"
              }
            />
          </View>
        ))}

        <Text
          style={{
            color: "#4c217dff",
            fontWeight: "700",
            marginTop: 14,
            marginBottom: 6,
          }}
        >
          Chronic Skin Conditions
        </Text>

        {Object.keys(skinConditions).map((c) => (
          <View
            key={c}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <Text style={{ textTransform: "capitalize" }}>{c}</Text>
            <Switch
              value={skinConditions[c as keyof typeof skinConditions]}
              onValueChange={(val) =>
                setSkinConditions({ ...skinConditions, [c]: val })
              }
              trackColor={{ false: "#DDD", true: "#CBB6E6" }}
              thumbColor={
                skinConditions[c as keyof typeof skinConditions]
                  ? "#8d67b9ff"
                  : "#f4f3f4"
              }
            />
          </View>
        ))}

        <Text
          style={{
            color: "#4c217dff",
            fontWeight: "700",
            marginTop: 20,
            marginBottom: 6,
          }}
        >
          My Avoid List
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <TextInput
            value={avoidItem}
            onChangeText={setAvoidItem}
            placeholder="Ingredient name"
            placeholderTextColor="#9A9A9A"
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#D9C9F2",
              borderRadius: 12,
              padding: 10,
              backgroundColor: "#FBFAFF",
              marginRight: 6,
            }}
          />
          <Pressable
            onPress={addToAvoidList}
            style={{
              backgroundColor: "#8d67b9ff",
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>Add</Text>
          </Pressable>
        </View>

        {avoidList.map((item) => (
          <View
            key={item}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#F5F0FB",
              padding: 10,
              borderRadius: 10,
              marginBottom: 6,
            }}
          >
            <Text style={{ color: "#4c217dff" }}>{item}</Text>
            <Pressable onPress={() => removeFromAvoidList(item)}>
              <Text style={{ color: "#B00020", fontWeight: "700" }}>✕</Text>
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={onSaveProfile}
          style={{
            backgroundColor: "#8d67b9ff",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 20,
          }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>Save Profile</Text>
        </Pressable>
      </ScrollView>

      <BottomNavBar navigation={navigation} activeTab="profile" />
    </View>
    </ScreenBackground>
  );
}
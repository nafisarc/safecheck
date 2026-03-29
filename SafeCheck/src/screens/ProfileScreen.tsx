import React, { useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, Switch } from "react-native";

export default function ProfileScreen({ navigation }: any) {
  // Basic info
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"Female" | "Male" | "Other" | "">("");

  // Checkboxes for conditions/allergies
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

  // Avoid list
  const [avoidItem, setAvoidItem] = useState("");
  const [avoidList, setAvoidList] = useState<string[]>([]);

  const addToAvoidList = () => {
    if (avoidItem.trim().length > 0) {
      setAvoidList([...avoidList, avoidItem.trim()]);
      setAvoidItem("");
    }
  };

  const removeFromAvoidList = (item: string) => {
    setAvoidList(avoidList.filter((i) => i !== item));
  };

  const onSaveProfile = () => {
    // later: persist into storage (AsyncStorage/Mongo)
    const profileData = {
      age,
      gender,
      skinConditions,
      allergies,
      skinSensitivity,
      avoidList,
    };
    console.log("Saved profile:", profileData);
    navigation.navigate("Home");
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        padding: 24,
        backgroundColor: "white",
      }}
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

      {/* Basic Info */}
      <Text style={{ color: "#4c217dff", fontWeight: "700", marginBottom: 6 }}>Basic Information</Text>
      <TextInput
        placeholder="Age"
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
        placeholderTextColor="#9A9A9A"
        style={{
          borderWidth: 1,
          borderColor: "#D9C9F2",
          borderRadius: 12,
          padding: 12,
          marginBottom: 10,
          backgroundColor: "#FBFAFF",
        }}
      />

      <TextInput
        placeholder="Gender (Female / Male / Other)"
        value={gender}
        onChangeText={(text) => setGender(text as any)}
        placeholderTextColor="#9A9A9A"
        style={{
          borderWidth: 1,
          borderColor: "#D9C9F2",
          borderRadius: 12,
          padding: 12,
          marginBottom: 16,
          backgroundColor: "#FBFAFF",
        }}
      />

      {/* Skin Sensitivity */}
      <Text style={{ color: "#4c217dff", fontWeight: "700", marginBottom: 6 }}>Skin Sensitivity</Text>
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
              backgroundColor:
                skinSensitivity === level ? "#EDE7F6" : "transparent",
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

      {/* Allergies */}
      <Text style={{ color: "#4c217dff", fontWeight: "700", marginBottom: 6 }}>Known Allergies</Text>
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
            thumbColor={allergies[a as keyof typeof allergies] ? "#8d67b9ff" : "#f4f3f4"}
          />
        </View>
      ))}

      {/* Skin Conditions */}
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
            thumbColor={skinConditions[c as keyof typeof skinConditions] ? "#8d67b9ff" : "#f4f3f4"}
          />
        </View>
      ))}

      {/* Avoid List */}
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

      {/* Save Button */}
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

      <Text
        style={{ marginTop: 14, textAlign: "center", fontSize: 12, opacity: 0.65 }}
      >
        Data is stored locally for personalization only.
      </Text>
    </ScrollView>
  );
}

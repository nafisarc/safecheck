import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Keyboard} from "react-native";
import api from "../services/api";
import BottomNavBar from "../components/BottomNavBar";
import ScreenBackground from "../components/ScreenBackground";


type Mode = "ingredients" | "product";

function splitIngredients(raw: string): string[] {
  return raw
    .replace(/•/g, ",")
    .replace(/\n/g, ",")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function ManualScreen({ navigation, route }: any) {
  const profileFlags: string[] = route?.params?.profileFlags ?? [];

  const [mode, setMode] = useState<Mode>("ingredients");

  // Ingredients mode state
  const [rawText, setRawText] = useState("");

  // Product mode state
  const [productQuery, setProductQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [productResults, setProductResults] = useState<any[]>([]);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const parsedList = useMemo(() => splitIngredients(rawText), [rawText]);

  // --- Product search (debounced) ---
  useEffect(() => {
    if (mode !== "product") return;

    const q = productQuery.trim();
    if (q.length < 2) {
      setProductResults([]);
      setSearching(false);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await api.get("/api/products/search", { params: { q } });
        setProductResults(res.data?.results ?? []);
      } catch (e) {
        setProductResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [productQuery, mode]);

  const onAnalyzeIngredients = async () => {
  Keyboard.dismiss();
  setErrorMsg("");

  if (parsedList.length === 0) {
    setErrorMsg("Please paste or type at least one ingredient.");
    return;
  }

  try {
    setLoading(true);
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
    const msg = e?.response?.data?.error || e?.message || "Something went wrong.";
    setErrorMsg(msg);
  } finally {
    setLoading(false);
  }
};

  const onSelectProduct = async (p: any) => {
  Keyboard.dismiss();
  setErrorMsg("");

  const id = p?.id;
  if (!id) {
    setErrorMsg("This product entry is missing an id from the search results.");
    return;
  }

  try {
    setLoading(true);

    // encode just in case the id has spaces/symbols
    const res = await api.get(`/api/products/${encodeURIComponent(id)}/check`);

    navigation.navigate("Result", {
      payload: res.data,
      profileFlags,
      mode: "product",
      productTitle: `${p.brand} ${p.name}`,
    });
  } catch (e: any) {
    // show backend error instead of generic 404
    const msg = e?.response?.data?.error || e?.message || "Could not load that product.";
    setErrorMsg(msg);
  } finally {
    setLoading(false);
  }
};

  const switchMode = (m: Mode) => {
    Keyboard.dismiss();
    setErrorMsg("");
    setMode(m);
  };

  return (
    <ScreenBackground>
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 24,
          paddingBottom: 200,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Title */}
        <Text style={{ color: "#4c217dff", fontSize: 26, fontWeight: "800" }}>
          Manual Check
        </Text>
        <Text style={{ marginTop: 6, opacity: 0.75 }}>
          Search a product from the database or paste an ingredient list.
        </Text>

        {/* Toggle */}
        <View
          style={{
            marginTop: 16,
            flexDirection: "row",
            backgroundColor: "#EEE6FA",
            borderRadius: 999,
            padding: 4,
          }}
        >
          <Pressable
            onPress={() => switchMode("ingredients")}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 999,
              alignItems: "center",
              backgroundColor: mode === "ingredients" ? "white" : "transparent",
            }}
          >
            <Text style={{ fontWeight: "800", color: "#4c217dff" }}>
              Ingredients
            </Text>
          </Pressable>

          <Pressable
            onPress={() => switchMode("product")}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 999,
              alignItems: "center",
              backgroundColor: mode === "product" ? "white" : "transparent",
            }}
          >
            <Text style={{ fontWeight: "800", color: "#4c217dff" }}>
              Product
            </Text>
          </Pressable>
        </View>

        {/* Error */}
        {errorMsg ? (
          <Text style={{ marginTop: 12, color: "#B00020", fontWeight: "700" }}>
            {errorMsg}
          </Text>
        ) : null}

        {/* INGREDIENTS MODE */}
        {mode === "ingredients" ? (
          <>
            {/* Tip */}
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
                Paste the ingredient list exactly as on the label, separated by commas.
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
                placeholder="Example: Aqua, Glycerin, Niacinamide, Salicylic Acid..."
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
                Detected ingredients:{" "}
                <Text style={{ fontWeight: "800" }}>{parsedList.length}</Text>
              </Text>
            </View>

            {/* Analyze button */}
            <Pressable
              onPress={onAnalyzeIngredients}
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
                <Text style={{ color: "white", fontWeight: "800" }}>
                  Analyze Ingredients
                </Text>
              )}
            </Pressable>

            {/* Clear */}
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
          </>
        ) : null}

        {/* PRODUCT MODE */}
        {mode === "product" ? (
          <>
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: "#4c217dff", fontWeight: "700", marginBottom: 8 }}>
                Product name
              </Text>

              <TextInput
                value={productQuery}
                onChangeText={setProductQuery}
                placeholder='Try: "CeraVe Hydrating Cleanser"'
                placeholderTextColor="#9A9A9A"
                style={{
                  borderWidth: 1,
                  borderColor: "#D9C9F2",
                  borderRadius: 14,
                  padding: 14,
                  backgroundColor: "#FBFAFF",
                }}
              />

              {/* Results list */}
              <View style={{ marginTop: 12 }}>
                {searching ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <ActivityIndicator />
                    <Text style={{ opacity: 0.7 }}>Searching products...</Text>
                  </View>
                ) : null}

                {!searching && productQuery.trim().length >= 2 && productResults.length === 0 ? (
                  <Text style={{ marginTop: 8, opacity: 0.7 }}>
                    No products found. Try another name or brand.
                  </Text>
                ) : null}

                {productResults.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => onSelectProduct(p)}
                    disabled={loading}
                    style={{
                      marginTop: 10,
                      padding: 14,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "#EEE6FA",
                      backgroundColor: "white",
                    }}
                  >
                    <Text style={{ color: "#4c217dff", fontWeight: "900" }}>
                      {p.brand} {p.name}
                    </Text>
                    {p.category ? (
                      <Text style={{ marginTop: 4, opacity: 0.7 }}>{p.category}</Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>

              {/* Loading overlay button */}
              {loading ? (
                <View style={{ marginTop: 12, flexDirection: "row", gap: 10, alignItems: "center" }}>
                  <ActivityIndicator />
                  <Text style={{ opacity: 0.7 }}>Loading product...</Text>
                </View>
              ) : null}
            </View>

            <Pressable
              onPress={() => setProductQuery("")}
              style={{
                marginTop: 14,
                borderColor: "#8d67b9ff",
                borderWidth: 1,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#8d67b9ff", fontWeight: "800" }}>Clear search</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>

      <BottomNavBar navigation={navigation} activeTab="manual" />
    </View>
    </ScreenBackground>
  );
}
import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Linking, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import ScreenBackground from "../components/ScreenBackground";


type Risk = "low" | "caution" | "high" | "unknown";
type Grad = readonly [string, string];

const COLORS = {
  primary: "#8d67b9ff",
  deep: "#4c217dff",
  bg: "#FFFFFF",
  outline: "#EEE6FA",
  text: "#221B2D",
  black: "#111111",
  muted: "#6D647A",
  chipBg: "#F6F6F8",
  chipBorder: "#E8E8EE",
};

function normalizeRisk(r: any): Risk {
  const v = String(r || "").toLowerCase();
  if (v === "low") return "low";
  if (v === "caution" || v === "medium") return "caution";
  if (v === "high") return "high";
  return "unknown";
}

function riskRank(r: Risk) {
  return r === "low" ? 0 : r === "caution" ? 1 : r === "high" ? 2 : -1;
}

function computeOverall(results: any[]): Risk {
  let best: Risk = "low";
  for (const item of results) {
    const r = normalizeRisk(item.final_risk ?? item.personalized ?? item.base_risk ?? item.risk);
    if (riskRank(r) > riskRank(best)) best = r;
  }
  return best;
}

function prettyTag(tag: string) {
  return tag
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function humanJoin(list: string[]) {
  if (list.length <= 1) return list[0] || "";
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
}

function getRiskMeta(risk: Risk) {
  if (risk === "high") {
    return {
      label: "High Risk",
      pill: "HIGH",
      icon: "warning-outline" as const,
      grad: ["#FDECEC", "#FFF6F6"] as Grad,
      border: "#F2B6B6",
      text: "#B00020",
    };
  }
  if (risk === "caution") {
    return {
      label: "Medium Risk",
      pill: "MEDIUM",
      icon: "alert-circle-outline" as const,
      grad: ["#FFF4E5", "#FFF9F1"] as Grad,
      border: "#FFD6A3",
      text: "#7A4B00",
    };
  }
  if (risk === "low") {
    return {
      label: "Low Risk",
      pill: "LOW",
      icon: "shield-checkmark-outline" as const,
      grad: ["#EAF7EE", "#F4FBF6"] as Grad,
      border: "#B9E0BB",
      text: "#1B5E20",
    };
  }
  return {
    label: "Unknown",
    pill: "UNKNOWN",
    icon: "help-circle-outline" as const,
    grad: ["#F3F3F3", "#FAFAFA"] as Grad,
    border: "#E0E0E0",
    text: "#333",
  };
}

function buildShortReason(tags: string[], risk: Risk) {
  if (risk === "unknown") return "This ingredient isn’t in the current SafeCheck demo database yet.";
  if (tags.includes("sensitizer_flag")) return "Potential sensitizer — may trigger irritation or allergy in some users.";
  if (tags.includes("aha") || tags.includes("bha") || tags.includes("exfoliant") || tags.includes("active")) {
    return "Exfoliating active — can cause dryness or stinging depending on your skin and product strength.";
  }
  if (tags.includes("surfactant")) return "Cleansing agent — some formulas may feel drying on sensitive or dry skin.";
  if (tags.includes("potential_sting") || tags.includes("strong_ph_adjuster") || tags.includes("ph_adjuster")) {
    return "May contribute to stinging on very sensitive or compromised skin (depends on the formula).";
  }
  if (risk === "caution") return "Flagged as medium risk by SafeCheck’s demo rules.";
  if (risk === "high") return "Flagged as high risk by SafeCheck’s demo rules.";
  return "Generally low concern in this demo knowledge base.";
}

function buildWatchOutFor(flagged: any[], profileFlags: string[], overallRisk: Risk) {
  const lines: string[] = [];

  const tagsAll = flagged.flatMap((x) => (Array.isArray(x.tags) ? x.tags : []));
  const hasExfoliant = tagsAll.some((t) => ["aha", "bha", "exfoliant", "active"].includes(t));
  const hasSensitizer = tagsAll.includes("sensitizer_flag");
  const hasSurfactant = tagsAll.includes("surfactant");
  const hasSting = tagsAll.some((t) => ["potential_sting", "strong_ph_adjuster", "ph_adjuster"].includes(t));

  const relevantFlags = ["sensitive", "rosacea", "eczema", "psoriasis", "dry"].filter((f) =>
    profileFlags.includes(f)
  );

  if (overallRisk === "high") {
    lines.push("Patch test first (inner arm) and wait 24 hours before full use.");
  } else if (overallRisk === "caution") {
    lines.push("Patch testing is recommended, especially if you’ve reacted to products before.");
  } else {
    lines.push("Start slowly with new products and monitor for redness or itching.");
  }

  if (relevantFlags.length) {
    lines.push(`Because your profile includes ${humanJoin(relevantFlags.map(prettyTag))}, SafeCheck applies stricter checks.`);
  }

  if (hasExfoliant) {
    lines.push("Exfoliating actives can irritate — avoid overuse at first and don’t apply on broken skin.");
  }
  if (hasSensitizer) {
    lines.push("If you notice itching, swelling, or burning, stop use and rinse off.");
  }
  if (hasSurfactant && (profileFlags.includes("dry") || profileFlags.includes("sensitive") || profileFlags.includes("eczema"))) {
    lines.push("If cleansing feels tight/dry, switch to a gentler cleanser and moisturize right after.");
  }
  if (hasSting) {
    lines.push("If stinging happens, keep usage minimal and avoid layering with strong actives.");
  }

  return lines.slice(0, 5);
}

export default function ResultScreen({ navigation, route }: any) {
  const payload = route?.params?.payload || {};
  const results: any[] = payload.results || [];

  const mode: "ingredients" | "product" = route?.params?.mode || "ingredients";
  const productTitle: string | undefined = route?.params?.productTitle;
  const inputIngredients: string[] = route?.params?.inputIngredients || [];
  const profileFlags: string[] = route?.params?.profileFlags || [];

  const overallRisk: Risk = useMemo(() => {
    const fromApi = payload.overall_risk || payload.overallRisk;
    return fromApi ? normalizeRisk(fromApi) : computeOverall(results);
  }, [payload, results]);

  const grouped = useMemo(() => {
    const safe: any[] = [];
    const flagged: any[] = [];
    const unknown: any[] = [];

    for (const r of results) {
      const status = r.status || "";
      const risk = normalizeRisk(r.final_risk ?? r.personalized ?? r.base_risk ?? r.risk);

      if (status === "unknown" || risk === "unknown") unknown.push(r);
      else if (risk === "low") safe.push(r);
      else flagged.push(r);
    }

    return { safe, flagged, unknown };
  }, [results]);

  const headerMeta = useMemo(() => getRiskMeta(overallRisk), [overallRisk]);
  const watchOutLines = useMemo(
    () => buildWatchOutFor(grouped.flagged, profileFlags, overallRisk),
    [grouped.flagged, profileFlags, overallRisk]
  );

  const riskyCount = grouped.flagged.length;

  const riskyLine = useMemo(() => {
    if (riskyCount === 0) return "We didn’t find any ingredients that need extra caution.";
    if (riskyCount === 1) return "We found 1 ingredient that may need extra caution.";
    return `We found ${riskyCount} ingredients that may need extra caution.`;
  }, [riskyCount]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const IngredientCard = ({ item }: { item: any }) => {
    const inci = item.inci || item.name || item.input;
    const risk = normalizeRisk(item.final_risk ?? item.personalized ?? item.base_risk ?? item.risk);
    const meta = getRiskMeta(risk);

    const tags: string[] = Array.isArray(item.tags) ? item.tags : [];
    const sources: any[] = item.cir_sources || [];
    const isOpen = !!expanded[inci];

    const shortReason = buildShortReason(tags, risk);

    const details: string[] = [
      shortReason,
      profileFlags.length
        ? `Based on your profile: ${humanJoin(profileFlags.map(prettyTag))}.`
        : "No profile selected — showing general demo guidance.",
      tags.length ? `Key attributes: ${tags.slice(0, 4).map(prettyTag).join(", ")}.` : "",
    ].filter(Boolean);

    const detailsTitle =
      risk === "unknown" ? "Why is this unknown?" : "Why is this flagged?";

    const showSave = risk === "high" || risk === "caution";

    return (
      <LinearGradient
        colors={meta.grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderWidth: 1,
          borderColor: meta.border,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            {/* ✅ ingredient name BLACK for flagged/unknown cards */}
            <Text style={{ color: COLORS.black, fontWeight: "900", fontSize: 18 }}>{inci}</Text>

            <Text style={{ marginTop: 6, color: COLORS.text, opacity: 0.85, lineHeight: 18 }}>
              {shortReason}
            </Text>
          </View>

          <View
            style={{
              alignSelf: "flex-start",
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.8)",
              borderWidth: 1,
              borderColor: meta.border,
            }}
          >
            <Text style={{ color: meta.text, fontWeight: "900", fontSize: 12 }}>
              {meta.pill}
            </Text>
          </View>
        </View>

        {/* ✅ Save line smaller + less prominent */}
        {showSave ? (
          <Pressable
            onPress={() => Alert.alert("Coming soon", "Saving to Avoid List will be added next.")}
            style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <Ionicons name="bookmark-outline" size={15} color={COLORS.primary} />
            <Text style={{ color: COLORS.primary, fontWeight: "800", fontSize: 13 }}>
              Save to My Avoid List
            </Text>
          </Pressable>
        ) : null}

        {/* ✅ Why line bigger (more prominent) */}
        <Pressable onPress={() => toggle(inci)} style={{ marginTop: 10 }}>
          <Text style={{ color: COLORS.primary, fontWeight: "900", fontSize: 15 }}>
            {isOpen ? "Hide details" : detailsTitle}
          </Text>
        </Pressable>

        {isOpen ? (
          <View style={{ marginTop: 10 }}>
            {details.slice(0, 4).map((t, idx) => (
              <Text key={idx} style={{ marginBottom: 8, opacity: 0.9, lineHeight: 18 }}>
                • {t}
              </Text>
            ))}

            {sources.length ? (
              <Pressable
                onPress={() => Linking.openURL(sources[0].url)}
                style={{
                  marginTop: 10,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: COLORS.primary,
                  backgroundColor: "rgba(255,255,255,0.65)",
                }}
              >
                <Text style={{ color: COLORS.primary, fontWeight: "900" }}>Open CIR Source</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </LinearGradient>
    );
  };

  return (
    <ScreenBackground>
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 160, backgroundColor: COLORS.bg }}>
      <Text style={{ color: COLORS.deep, fontSize: 22, fontWeight: "900" }}>Safety Results</Text>
      <Text style={{ marginTop: 4, opacity: 0.7 }}>Personalized for your profile</Text>

      {/* Summary banner */}
      <LinearGradient
        colors={headerMeta.grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          marginTop: 14,
          borderWidth: 1,
          borderColor: headerMeta.border,
          borderRadius: 16,
          padding: 16,
        }}
      >
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.75)",
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: headerMeta.border,
            }}
          >
            <Ionicons name={headerMeta.icon} size={22} color={headerMeta.text} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: headerMeta.text, fontWeight: "900", fontSize: 18 }}>
              {headerMeta.label}
            </Text>

            {/* ✅ replace counts with nice sentence */}
            <Text style={{ marginTop: 8, opacity: 0.9, lineHeight: 18 }}>
              {mode === "product"
                ? "Based on the product formula in the database."
                : `Based on the ingredients you entered:`}
            </Text>

            <Text style={{ marginTop: 8, opacity: 0.95, fontWeight: "800", lineHeight: 18 }}>
              {riskyLine}
            </Text>

            {productTitle ? (
              <Text style={{ marginTop: 6, opacity: 0.8, fontWeight: "700" }}>
                Product: {productTitle}
              </Text>
            ) : null}
          </View>
        </View>
      </LinearGradient>

      {/* What to watch out for (for you) */}
      <LinearGradient
        colors={["#EAF7EE", "#F4FBF6"] as Grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          marginTop: 14,
          borderWidth: 1,
          borderColor: "#B9E0BB",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <Text style={{ color: "#1B5E20", fontWeight: "900", fontSize: 16 }}>
          What to watch out for (for you)
        </Text>

        <View style={{ marginTop: 10 }}>
          {watchOutLines.map((line, idx) => (
            <Text key={idx} style={{ marginBottom: 8, opacity: 0.9, lineHeight: 18 }}>
              • {line}
            </Text>
          ))}
        </View>
      </LinearGradient>

      {/* Flagged */}
      <Text style={{ marginTop: 18, color: COLORS.deep, fontSize: 18, fontWeight: "900" }}>
        Flagged Ingredients
      </Text>

      {grouped.flagged.length ? (
        <View style={{ marginTop: 10 }}>
          {grouped.flagged.map((item, idx) => (
            <IngredientCard key={(item.inci || item.input || idx) + "_f"} item={item} />
          ))}
        </View>
      ) : (
        <LinearGradient
          colors={["#EAF7EE", "#F4FBF6"] as Grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            marginTop: 10,
            borderWidth: 1,
            borderColor: "#B9E0BB",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <Text style={{ color: "#1B5E20", fontWeight: "900" }}>No flagged ingredients 🎉</Text>
          <Text style={{ marginTop: 6, opacity: 0.85 }}>
            SafeCheck didn’t find caution/high ingredients in your list (based on the current demo database).
          </Text>
        </LinearGradient>
      )}

      {/* Unknown */}
      {grouped.unknown.length ? (
        <>
          <Text style={{ marginTop: 14, color: COLORS.deep, fontSize: 18, fontWeight: "900" }}>
            Unknown Ingredients
          </Text>

          {mode === "product" ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
              {grouped.unknown.map((item, idx) => (
                <View
                  key={(item.inci || item.input || idx) + "_u_chip"}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor: COLORS.chipBg,
                    borderWidth: 1,
                    borderColor: COLORS.chipBorder,
                  }}
                >
                  {/* ✅ unknown chip text BLACK */}
                  <Text style={{ color: COLORS.black, fontWeight: "800" }}>
                    {item.inci || item.input}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ marginTop: 10 }}>
              {grouped.unknown.map((item, idx) => (
                <IngredientCard key={(item.inci || item.input || idx) + "_u"} item={item} />
              ))}
            </View>
          )}
        </>
      ) : null}

      {/* Safe ingredients */}
      {grouped.safe.length ? (
        <>
          <Text style={{ marginTop: 14, color: COLORS.deep, fontSize: 18, fontWeight: "900" }}>
            Safe Ingredients
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            {grouped.safe.map((item, idx) => (
              <View
                key={(item.inci || item.input || idx) + "_s"}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  backgroundColor: "#EAF7EE",
                  borderWidth: 1,
                  borderColor: "#B9E0BB",
                }}
              >
                {/* ✅ safe stays green */}
                <Text style={{ color: "#1B5E20", fontWeight: "800" }}>
                  {item.inci || item.input}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {/* Disclaimer */}
      <View
        style={{
          marginTop: 14,
          borderWidth: 1,
          borderColor: COLORS.outline,
          borderRadius: 14,
          padding: 14,
          backgroundColor: "#FAFAFF",
        }}
      >
        <Text style={{ fontSize: 12, opacity: 0.75, lineHeight: 16 }}>
          Disclaimer: SafeCheck provides general information only and does not replace professional medical advice.
          If you have persistent symptoms or severe reactions, consult a healthcare professional.
        </Text>
      </View>

      {/* Actions */}
      <View style={{ marginTop: 16 }}>
        <Pressable
          onPress={() => Alert.alert("Coming soon", "Ask Questions chat will be added next.")}
          style={{
            borderWidth: 1,
            borderColor: COLORS.primary,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            backgroundColor: "white",
            marginBottom: 10,
          }}
        >
          <Text style={{ color: COLORS.primary, fontWeight: "900" }}>Ask Questions</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.replace("Manual")}
          style={{
            backgroundColor: COLORS.primary,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>
            {mode === "product" ? "Check Another Product" : "Check Another List"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
    </ScreenBackground>
  );
}
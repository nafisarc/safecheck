import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Linking } from "react-native";

function prettyTag(tag: string) {
  return tag
    .replace(/_/g, " ")
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function humanJoin(list: string[]) {
  if (list.length <= 1) return list[0] || "";
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
}

function cleanSentence(s: string) {
  return s
    .replace(/_/g, " ")
    .replace(/\//g, ", ")
    .replace(/;/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function buildWhyLines(risk: string, tags: string[], profileFlags: string[]) {
  // for nice personalised wording
  const relevantFlags = ["sensitive", "rosacea", "eczema", "psoriasis", "dry"].filter((f) =>
    profileFlags.includes(f)
  );

  // UNKNOWN
  if (risk === "unknown") {
    return [
      "This ingredient isn’t in SafeCheck’s current demo database yet.",
      "Double-check spelling or try the label’s exact INCI name (e.g., Aqua/Water).",
    ];
  }

  const lines: string[] = [];

  // HIGH / CAUTION reasons based on tags (soft wording)
  if (tags.includes("sensitizer_flag")) {
    lines.push("A potential sensitizer, so SafeCheck treats it more strictly.");
  }

  if (tags.includes("aha") || tags.includes("bha") || tags.includes("exfoliant") || tags.includes("active")) {
    lines.push("This is an exfoliating active. Some people experience dryness or stinging, especially with sensitive skin.");
  }

  if (tags.includes("surfactant")) {
    lines.push("This is a cleansing agent. Very dry or sensitive skin may prefer gentler formulas.");
  }

  if (tags.includes("potential_sting") || tags.includes("strong_ph_adjuster") || tags.includes("ph_adjuster")) {
    lines.push("This ingredient can contribute to stinging in some formulas on very sensitive or compromised skin.");
  }

  // Personalization line (only if flags exist)
  if (relevantFlags.length) {
    lines.push(`Because your profile includes ${humanJoin(relevantFlags.map(prettyTag))}, SafeCheck suggests extra caution here.`);
  }

  // fallback if no lines were added
  if (!lines.length) {
    lines.push("Flagged based on SafeCheck’s rules and your selected profile settings.");
  }

  return lines;
}

type Risk = "low" | "caution" | "high" | "unknown";

function riskRank(r: Risk) {
  return r === "low" ? 0 : r === "caution" ? 1 : r === "high" ? 2 : -1;
}

function normalizeRisk(r: any): Risk {
  const v = String(r || "").toLowerCase();
  if (v === "low") return "low";
  if (v === "caution" || v === "medium") return "caution";
  if (v === "high") return "high";
  return "unknown";
}

function computeOverall(results: any[]): Risk {
  let best: Risk = "low";
  for (const item of results) {
    const r = normalizeRisk(item.final_risk ?? item.personalized ?? item.base_risk ?? item.risk);
    if (riskRank(r) > riskRank(best)) best = r;
  }
  return best;
}

export default function ResultScreen({ navigation, route }: any) {
  const payload = route?.params?.payload || {};
  const results: any[] = payload.results || [];
  const inputIngredients: string[] = route?.params?.inputIngredients || [];

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

      if (status === "unknown" || risk === "unknown") {
        unknown.push(r);
      } else if (risk === "low") {
        safe.push(r);
      } else {
        flagged.push(r);
      }
    }

    return { safe, flagged, unknown };
  }, [results]);

  const header = useMemo(() => {
    if (overallRisk === "high") return { label: "High Risk", bg: "#FDECEC", border: "#F2B6B6", text: "#B00020" };
    if (overallRisk === "caution") return { label: "Caution", bg: "#FFF4E5", border: "#FFD6A3", text: "#7A4B00" };
    if (overallRisk === "low") return { label: "Low Risk", bg: "#EAF7EE", border: "#B9E0BB", text: "#1B5E20" };
    return { label: "Unknown", bg: "#F3F3F3", border: "#E0E0E0", text: "#333" };
  }, [overallRisk]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const IngredientCard = ({ item }: { item: any }) => {
  const inci = item.inci || item.name || item.input;

  const risk = normalizeRisk(item.final_risk ?? item.personalized ?? item.base_risk ?? item.risk);
  const tags: string[] = Array.isArray(item.tags) ? item.tags : [];
  const sources: any[] = item.cir_sources || [];

  const profileFlags: string[] = route?.params?.profileFlags || []; // ✅

  // Nice “details” text generated from tags (not raw KB sentences)
  const whyLines = buildWhyLines(risk, tags, profileFlags);

  // Optional: if you still want to include KB notes, clean them first
  const cleanedNotes: string[] = Array.isArray(item.risk_notes)
    ? item.risk_notes.map(cleanSentence)
    : [];

  // Combine (avoid ugly raw backend strings by NOT using item.reasons)
  const details = [...whyLines, ...cleanedNotes].slice(0, 5);

  const riskChip =
    risk === "high"
      ? { bg: "#FDECEC", border: "#F2B6B6", text: "#B00020", label: "HIGH" }
      : risk === "caution"
      ? { bg: "#FFF4E5", border: "#FFD6A3", text: "#7A4B00", label: "CAUTION" }
      : risk === "low"
      ? { bg: "#EAF7EE", border: "#B9E0BB", text: "#1B5E20", label: "LOW" }
      : { bg: "#F3F3F3", border: "#E0E0E0", text: "#333", label: "UNKNOWN" };

  const key = String(inci);
  const isOpen = !!expanded[key];

  const title =
    risk === "unknown"
      ? "Why is this unknown?"
      : risk === "low"
      ? "Details"
      : "Why is this flagged?";

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: "#EEE6FA",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        backgroundColor: "white",
      }}
    >
      {/* Top row */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#4c217dff", fontWeight: "900", fontSize: 18 }}>{inci}</Text>

          {/* Tags as chips (no ugly underscores) */}
          {tags.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {tags.slice(0, 4).map((t) => (
                <View
                  key={t}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    backgroundColor: "#FBFAFF",
                    borderWidth: 1,
                    borderColor: "#D9C9F2",
                  }}
                >
                  <Text style={{ color: "#4c217dff", fontWeight: "800", fontSize: 12 }}>
                    {prettyTag(t)}
                  </Text>
                </View>
              ))}
              {tags.length > 4 ? (
                <View
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    backgroundColor: "#FBFAFF",
                    borderWidth: 1,
                    borderColor: "#D9C9F2",
                  }}
                >
                  <Text style={{ color: "#4c217dff", fontWeight: "800", fontSize: 12 }}>
                    +{tags.length - 4}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Risk badge */}
        <View
          style={{
            alignSelf: "flex-start",
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: riskChip.bg,
            borderWidth: 1,
            borderColor: riskChip.border,
          }}
        >
          <Text style={{ color: riskChip.text, fontWeight: "900", fontSize: 12 }}>{riskChip.label}</Text>
        </View>
      </View>

      {/* Details toggle */}
      <Pressable onPress={() => toggle(key)} style={{ marginTop: 12 }}>
        <Text style={{ color: "#8d67b9ff", fontWeight: "900" }}>
          {isOpen ? "Hide details" : title}
        </Text>
      </Pressable>

      {/* Details */}
      {isOpen ? (
        <View style={{ marginTop: 10 }}>
          {details.map((t, idx) => (
            <Text key={idx} style={{ marginBottom: 8, opacity: 0.85, lineHeight: 18 }}>
              • {t}
            </Text>
          ))}

          {/* Source button */}
          {sources.length ? (
            <Pressable
              onPress={() => Linking.openURL(sources[0].url)}
              style={{
                marginTop: 10,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#8d67b9ff",
              }}
            >
              <Text style={{ color: "#8d67b9ff", fontWeight: "900" }}>Open CIR Source</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, backgroundColor: "white" }}>
      {/* Summary Header */}
      <View
        style={{
          backgroundColor: header.bg,
          borderWidth: 1,
          borderColor: header.border,
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: header.text, fontWeight: "900", fontSize: 18 }}>{header.label}</Text>
        <Text style={{ marginTop: 6, opacity: 0.85 }}>
          Based on the ingredients you entered{inputIngredients.length ? ` (${inputIngredients.length})` : ""}.
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <Text style={{ opacity: 0.8 }}>Flagged: <Text style={{ fontWeight: "900" }}>{grouped.flagged.length}</Text></Text>
          <Text style={{ opacity: 0.8 }}>Safe: <Text style={{ fontWeight: "900" }}>{grouped.safe.length}</Text></Text>
          <Text style={{ opacity: 0.8 }}>Unknown: <Text style={{ fontWeight: "900" }}>{grouped.unknown.length}</Text></Text>
        </View>
      </View>

      {/* Flagged */}
      {grouped.flagged.length ? (
        <>
          <Text style={{ color: "#4c217dff", fontSize: 18, fontWeight: "900", marginBottom: 10 }}>
            Flagged ingredients
          </Text>
          {grouped.flagged.map((item, idx) => (
            <IngredientCard key={(item.inci || item.input || idx) + "_f"} item={item} />
          ))}
        </>
      ) : (
        <View style={{ marginBottom: 14 }}>
          <Text style={{ color: "#4c217dff", fontSize: 18, fontWeight: "900" }}>No flagged ingredients 🎉</Text>
          <Text style={{ marginTop: 6, opacity: 0.75 }}>
            Your list doesn’t contain any ingredients marked as unsafe.
          </Text>
        </View>
      )}

      {/* Unknown */}
      {grouped.unknown.length ? (
        <>
          <Text style={{ color: "#4c217dff", fontSize: 18, fontWeight: "900", marginTop: 10, marginBottom: 10 }}>
            Unknown 
          </Text>
          {grouped.unknown.map((item, idx) => (
            <IngredientCard key={(item.inci || item.input || idx) + "_u"} item={item} />
          ))}
        </>
      ) : null}

      {/* Safe */}
      {grouped.safe.length ? (
        <>
          <Text style={{ color: "#4c217dff", fontSize: 18, fontWeight: "900", marginTop: 10, marginBottom: 10 }}>
            Safe ingredients
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
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
                <Text style={{ color: "#1B5E20", fontWeight: "800" }}>
                  {item.inci || item.input}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {/* Actions */}
      <View style={{ marginTop: 16 }}>
        <Pressable
          onPress={() => navigation.replace("Manual")}
          style={{
            backgroundColor: "#8d67b9ff",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>Check another list</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate("Profile")}
          style={{
            borderWidth: 1,
            borderColor: "#8d67b9ff",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#8d67b9ff", fontWeight: "900" }}>Update my profile</Text>
        </Pressable>

        <Text style={{ marginTop: 14, textAlign: "center", fontSize: 12, opacity: 0.65 }}>
          SafeCheck is decision support only and does not provide medical advice.
        </Text>
      </View>
    </ScrollView>
  );
}
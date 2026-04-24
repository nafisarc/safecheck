import React, { useState, useRef } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenBackground from "../components/ScreenBackground";
import api from "../services/api";

const COLORS = {
  primary: "#8d67b9ff",
  deep: "#4c217dff",
  outline: "#EEE6FA",
  muted: "#6D647A",
};

type Message = {
  role: "user" | "assistant";
  text: string;
};

const SUGGESTED_QUESTIONS = [
  "Why is this ingredient risky for me?",
  "Are there safer alternatives?",
  "Can I still use this product?",
  "What does this ingredient actually do?",
];

export default function ExplainScreen({ navigation, route }: any) {
  const ingredients: any[] = route?.params?.ingredients || [];
  const profileFlags: string[] = route?.params?.profileFlags || [];
  const productTitle: string | undefined = route?.params?.productTitle;

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: `Hi! I'm SafeCheck's AI assistant 👋 I've reviewed your ingredient scan${productTitle ? ` for **${productTitle}**` : ""}. Ask me anything about the ingredients or your results!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const sendMessage = async (text?: string) => {
    const question = (text || input).trim();
    if (!question || loading) return;

    Keyboard.dismiss();
    setInput("");

    const userMessage: Message = { role: "user", text: question };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      setLoading(true);

      //  Send actual conversation (skip initial greeting)
      const conversationHistory = updatedMessages.slice(1).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await api.post("/api/explain", {
        question,
        ingredients,
        profileFlags,
        previousMessages: conversationHistory.slice(0, -1), // exclude current question
      });

      const assistantMessage: Message = {
        role: "assistant",
        text: res.data.reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Sorry, I couldn't generate a response right now. Please try again!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const MessageBubble = ({ message }: { message: Message }) => {
    const isUser = message.role === "user";
    return (
      <View
        style={{
          alignSelf: isUser ? "flex-end" : "flex-start",
          maxWidth: "85%",
          marginBottom: 12,
        }}
      >
        {!isUser && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                backgroundColor: COLORS.primary,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontSize: 12 }}>S</Text>
            </View>
            <Text style={{ fontSize: 12, color: COLORS.muted, fontWeight: "700" }}>
              SafeCheck AI
            </Text>
          </View>
        )}

        <View
          style={{
            padding: 14,
            borderRadius: isUser ? 18 : 18,
            borderBottomRightRadius: isUser ? 4 : 18,
            borderBottomLeftRadius: isUser ? 18 : 4,
            backgroundColor: isUser ? COLORS.primary : "#F3EEFF",
            borderWidth: isUser ? 0 : 1,
            borderColor: COLORS.outline,
          }}
        >
          <Text
            style={{
              color: isUser ? "white" : "#221B2D",
              lineHeight: 20,
              fontSize: 15,
            }}
          >
            {message.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 20,
            paddingBottom: 12,
            gap: 12,
          }}
        >
          <Pressable onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.deep} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.deep, fontSize: 20, fontWeight: "900" }}>
              Ask SafeCheck AI
            </Text>
            <Text style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
              {productTitle ? productTitle : `${ingredients.length} ingredients analyzed`}
            </Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 20, paddingBottom: 10 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg, idx) => (
            <MessageBubble key={idx} message={msg} />
          ))}

          {loading && (
            <View
              style={{
                alignSelf: "flex-start",
                padding: 14,
                borderRadius: 18,
                borderBottomLeftRadius: 4,
                backgroundColor: "#F3EEFF",
                borderWidth: 1,
                borderColor: COLORS.outline,
                marginBottom: 12,
              }}
            >
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          )}

          {/* Suggested questions */}
          {messages.length === 1 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: COLORS.muted, fontSize: 13, marginBottom: 10, fontWeight: "700" }}>
                Suggested questions:
              </Text>
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => sendMessage(q)}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: COLORS.outline,
                    backgroundColor: "white",
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: COLORS.primary, fontWeight: "700" }}>{q}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
            paddingTop: 10,
            gap: 10,
            borderTopWidth: 1,
            borderTopColor: COLORS.outline,
            backgroundColor: "white",
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about an ingredient..."
            placeholderTextColor="#9A9A9A"
            multiline
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: COLORS.outline,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              backgroundColor: "#FBFAFF",
              maxHeight: 100,
              fontSize: 15,
            }}
            onSubmitEditing={() => sendMessage()}
          />
          <Pressable
            onPress={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              backgroundColor: loading || !input.trim() ? "#CBB6E6" : COLORS.primary,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="send" size={18} color="white" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}
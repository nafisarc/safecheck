import React from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export default function ScreenBackground({ children, style }: Props) {
  return (
    <LinearGradient
      colors={["#EFE5FA", "#FFFFFF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 0.35 }}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
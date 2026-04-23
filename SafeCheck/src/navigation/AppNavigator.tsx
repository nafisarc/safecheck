import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Image, View } from "react-native";

import HomeScreen from "../screens/HomeScreen";
import MainScreen from "../screens/MainScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ResultScreen from "../screens/ResultScreen";
import SignupScreen from "../screens/SignupScreen";
import LoginScreen from "../screens/LoginScreen";
import ManualScreen from "../screens/ManualScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ScanScreen from "../screens/ScanScreen";
import ExplainScreen from "../screens/ExplainScreen";
import HistoryScreen from "../screens/HistoryScreen";
import PolicyScreen from "../screens/PrivacyPolicyScreen";
import AccountInfoScreen from "../screens/AccountInfoScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
<Stack.Navigator
  screenOptions={{
    headerShown: true,
    headerBackVisible: false,
    headerTitle: "",

    headerLeft: () => (
      <Image
        source={require("../../assets/SafeCheck Logo.png")}
        style={{
          width: 36,
          height: 35,
          borderRadius: 18,
        }}
      />
    ),

    headerShadowVisible: false,
  }}
>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Main" component={MainScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Result" component={ResultScreen} />
      <Stack.Screen name="Manual" component={ManualScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Scan" component={ScanScreen} />
      <Stack.Screen name="Explain" component={ExplainScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Policy" component={PolicyScreen} />
      <Stack.Screen name="Account" component={AccountInfoScreen} />
    </Stack.Navigator>
  );
}
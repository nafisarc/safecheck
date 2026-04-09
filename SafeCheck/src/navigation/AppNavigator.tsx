import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import MainScreen from "../screens/MainScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ResultScreen from "../screens/ResultScreen";
import SignupScreen from "../screens/SignupScreen";
import LoginScreen from "../screens/LoginScreen";
import ManualScreen from "../screens/ManualScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ScanScreen from "../screens/ScanScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: "SafeCheck" }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ title: "Create Account" }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Login" }} />
      <Stack.Screen name="Main" component={MainScreen} options={{ title: "Main" }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Your Profile" }} />
      <Stack.Screen name="Result" component={ResultScreen} options={{ title: "Safety Results" }} />
      <Stack.Screen name="Manual" component={ManualScreen} options={{ title: "Type" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
      <Stack.Screen name="Scan" component={ScanScreen} options={{ title: "Scan" }} />
    </Stack.Navigator>
  );
}
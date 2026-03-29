import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import CheckProductScreen from "../screens/CheckProductScreen";
import CheckIngredientScreen from "../screens/CheckIngredientScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ResultScreen from "../screens/ResultScreen";
import SignupScreen from "../screens/SignupScreen";
import LoginScreen from "../screens/LoginScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: "SafeCheck" }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ title: "Create Account" }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Login" }} />
      <Stack.Screen name="CheckProduct" component={CheckProductScreen} options={{ title: "Check Screen" }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Your Profile" }} />
      <Stack.Screen name="Result" component={ResultScreen} options={{ title: "Safety Results" }} />
    </Stack.Navigator>
  );
}
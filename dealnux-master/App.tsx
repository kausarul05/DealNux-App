import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { StatusBar } from 'expo-status-bar';
import "./global.css";
import { AuthStackParamList } from './src/Navigation/types';
import AdsPerformance from './src/screens/Ads/AdsPerformance';
import CreateAds from './src/screens/Ads/CreateAds';
import MyAds from './src/screens/Ads/MyAds';
import CreateNewPassword from './src/screens/Auth/CreateNewPassword';
import OtpAuth from './src/screens/Auth/OtpAuth';
import OtpResetPassword from './src/screens/Auth/OtpResetPassword';
import ProfileSetup from './src/screens/Auth/ProfileSetup';
import ResetPassword from './src/screens/Auth/ResetPassword';
import SignIn from './src/screens/Auth/SignIn';
import SignUp from './src/screens/Auth/SignUp';
import CheckoutOptions from './src/screens/Home/CheckoutOptions';
import ProductDetails from './src/screens/Home/ProductDetails';
import SavingsSummary from './src/screens/Home/SavingsSummary';
import ScanProduct from './src/screens/Home/ScanProduct';
import SearchProduct from './src/screens/Home/SearchProduct';
import TodaysDeals from './src/screens/Home/TodaysDeals';
import WelcomeScreen from './src/screens/Home/WelcomeScreen';
import EditProfile from './src/screens/Settings/EditProfile';
import MyFavourite from './src/screens/Settings/MyFavourite';
import Notification from './src/screens/Settings/Notification';
import NotificationSettings from './src/screens/Settings/NotificationSettings';
import PrivacyPolicy from './src/screens/Settings/PrivacyPolicy';
import ReFarAndEarn from './src/screens/Settings/ReFarAndEarn';
import UpdatePassword from './src/screens/Settings/UpdatePassword';
import Subscription from './src/screens/Subscriptions/Subscription';
import MainTabs from './src/screens/Navigation/TabNavigation';
import AdsApply from './src/screens/Settings/AdsApply';
import ShopCreate from './src/screens/Settings/ShopCreate';
import ShopDashboard from './src/screens/Shop/ShopDashboard';
import AddProduct from './src/screens/Shop/AddProduct';
import EditProduct from './src/screens/Shop/EditProduct';

const Stack = createNativeStackNavigator<AuthStackParamList>();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName='Welcome'>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignIn" component={SignIn} options={{ animation: "slide_from_left" }} />
      <Stack.Screen name="SignUp" component={SignUp} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="TodaysDeals" component={TodaysDeals} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="CreateAds" component={CreateAds} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="ReFarAndEarn" component={ReFarAndEarn} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="MyAds" component={MyAds} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="AdsPerformance" component={AdsPerformance} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettings} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="MyFavourite" component={MyFavourite} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="EditProduct" component={EditProduct} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="UpdatePassword" component={UpdatePassword} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="EditProfile" component={EditProfile} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="ShopCreate" component={ShopCreate} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="ShopDashboard" component={ShopDashboard} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="AddProduct" component={AddProduct} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="AdsApply" component={AdsApply} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="Subscription" component={Subscription} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="ScanProduct" component={ScanProduct} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="CheckoutOptions" component={CheckoutOptions} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="SavingsSummary" component={SavingsSummary} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="ProductDetails" component={ProductDetails} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="Notification" component={Notification} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="SearchProduct" component={SearchProduct} />
      <Stack.Screen name="ResetPassword" component={ResetPassword} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="OtpResetPassword" component={OtpResetPassword} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="CreateNewPassword" component={CreateNewPassword} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="OtpAuth" component={OtpAuth} options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetup} options={{ animation: "slide_from_right" }} />
    </Stack.Navigator>
  );
} 


export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style='auto' />
      <AuthStack />
    </NavigationContainer>
  );
}


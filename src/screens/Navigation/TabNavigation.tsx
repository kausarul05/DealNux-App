import { AntDesign, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Cart from "./Cart";
import Dashboard from "./Dashboard";
import Home from "./Home";
import Profile from "./Profile";
import Scanning from "./Scanning";

const Tab = createBottomTabNavigator();

function CenterButton({ children, onPress }: any) {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.fabContainer}>
            <View style={styles.fabButton}>{children}</View>
        </TouchableOpacity>
    );
}

export default function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarShowLabel: false,
            }}
        >
            {/* Home Tab */}
            <Tab.Screen
                name="HomeTab"
                component={Home}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.tabItem}>
                            <Ionicons
                                name={focused ? "home" : "home-outline"}
                                size={22}
                                color={focused ? "#2563EB" : "#9CA3AF"}
                            />
                            <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                                Home
                            </Text>
                        </View>
                    ),
                }}
            />

            {/* Cart Tab */}
            <Tab.Screen
                name="CartTab"
                component={Cart}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.tabItem}>
                            <Ionicons
                                name={focused ? "cart" : "cart-outline"}
                                size={22}
                                color={focused ? "#2563EB" : "#9CA3AF"}
                            />
                            <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                                Cart
                            </Text>
                        </View>
                    ),
                }}
            />

            {/* Center Scan Button */}
            <Tab.Screen
                name="ScanTab"
                component={Scanning}
                options={{
                    tabBarIcon: () => (
                        <AntDesign name="scan" size={28} color="white" />
                    ),
                    tabBarButton: (props) => <CenterButton {...props} />,
                }}
            />

            {/* Menu Tab */}
            <Tab.Screen
                name="MenuTab"
                component={Dashboard}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.tabItem}>
                            <MaterialCommunityIcons name={focused ? "view-dashboard" : "view-dashboard-outline"} size={22} color={focused ? "#2563EB" : "#9CA3AF"} />
                            <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                                Dashboard
                            </Text>
                        </View>
                    ),
                }}
            />

            {/* Profile Tab */}
            <Tab.Screen
                name="ProfileTab"
                component={Profile}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={styles.tabItem}>
                            <Ionicons
                                name={focused ? "person" : "person-outline"}
                                size={22}
                                color={focused ? "#2563EB" : "#9CA3AF"}
                            />
                            <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                                Profile
                            </Text>
                        </View>
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    // Tab Bar Container
    tabBar: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 80,
        backgroundColor: "#FFFFFF",
        borderTopWidth: 0,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 20 : 40,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 20,
    },

    // Tab Item
    tabItem: {
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        minWidth: 60,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: "500",
        color: "#9CA3AF",
        marginTop: 2,
    },
    tabLabelActive: {
        color: "#2563EB",
        fontWeight: "600",
    },

    // Center FAB Button
    fabContainer: {
        top: -20,
        alignItems: "center",
        justifyContent: "center",
    },
    fabButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#2563EB",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#FFFFFF",
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 16,
        borderWidth: 6,
        borderColor: "#FFFFFF",
    },
});
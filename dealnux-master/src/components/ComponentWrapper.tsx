import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppHeader from './AppHeader';

import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from "./BackButton";

const ComponentWrapper = ({
    // bg_color = "bg-red-500",
    title = "Add Expense",
    headerComponent,
    children,
    container_bg = "bg-[##e7eaef]"
}:any
) => {
    return (
        <SafeAreaView className={`flex-1 `}>
            {headerComponent ? headerComponent() :
                <View className="px-5 pb-3">
                    <AppHeader
                        left={() => <BackButton />}
                        middle={() => <Text className="text-[#2D2D2D] font-archivo-semi-bold text-2xl">{title}</Text>}
                    />
                </View>
            }
            <View className={`h-full px-6 py-8 ${container_bg}`}>
                {children}

                <View className=""></View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({})

export default ComponentWrapper;
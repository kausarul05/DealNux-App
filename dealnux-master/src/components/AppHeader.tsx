import React from 'react';
import { StyleSheet, View } from 'react-native';

const AppHeader = ({ left = () => { }, middle = () => { }, right = () => { } }: any) => {
    return (
        <View className="flex-row justify-between items-center h-auto py-3">
            <View>
                {left()}
            </View>
            <View>
                {middle()}
            </View>
            <View>
                {right()}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({})

export default AppHeader;
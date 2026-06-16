import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';


const BackButton = ({ bg_color = "bg-gray-50" }) => {
    const navigation = useNavigation()
    return (
        <Pressable onPress={() => navigation.goBack()} className={`h-10 w-10 justify-center  rounded-full ${bg_color}`}>
           
            <MaterialCommunityIcons name="keyboard-backspace" className="h-6 w-6" size={24} color="black" />
        </Pressable>
    );
}

const styles = StyleSheet.create({})

export default BackButton;
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text } from 'react-native';


const ScreenHeader = ({ title }:any) => {
    const navigation = useNavigation()
    return (
        <Text className=' justify-center items-center text-lg'>
            {title}
      </Text>
    );
}

const styles = StyleSheet.create({})

export default ScreenHeader;
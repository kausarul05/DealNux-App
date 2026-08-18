import React from 'react'
import { Text, View } from 'react-native'
import { COPYRIGHT_TEXT } from '../constants/brand'

// Shared footer copyright, so every page shows the same line as the website.
const CopyrightNote = ({ className = '' }: { className?: string }) => (
    <View className={`mt-6 ${className}`}>
        <Text className="text-xs text-gray-400 text-center leading-5">
            {COPYRIGHT_TEXT}
        </Text>
    </View>
)

export default CopyrightNote

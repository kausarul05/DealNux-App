// components/chat/SuggestedReplies.tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface SuggestedRepliesProps {
    replies: string[]
    onPress: (reply: string) => void
}

const SuggestedReplies: React.FC<SuggestedRepliesProps> = ({ replies, onPress }) => {
    if (!replies || replies.length === 0) return null

    return (
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.container}
            contentContainerStyle={styles.content}
        >
            {replies.map((reply, index) => (
                <TouchableOpacity
                    key={index}
                    style={styles.replyButton}
                    onPress={() => onPress(reply)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="flash" size={14} color="#2563EB" />
                    <Text style={styles.replyText}>{reply}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 8,
    },
    content: {
        gap: 8,
    },
    replyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    replyText: {
        fontSize: 13,
        color: '#2563EB',
        fontWeight: '500',
    },
})

export default SuggestedReplies
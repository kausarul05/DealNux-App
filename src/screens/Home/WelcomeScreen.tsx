import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Toast, useToast } from '../../components/useToost';
import { Images } from '../../constants';
import { AuthStackParamList } from '../../Navigation/types';


const WelcomeScreen = () => {
    const navigation = useNavigation<NavigationProp<AuthStackParamList>>();
    const toast = useToast();
    const [spinnerRotation, setSpinnerRotation] = useState<number>(0);
    const [timer, setTimer] = useState<number>(60);


    const spinnerDots = [
        { angle: 0, size: 12, opacity: 1 },
        { angle: 45, size: 11, opacity: 0.9 },
        { angle: 90, size: 10, opacity: 0.8 },
        { angle: 135, size: 9, opacity: 0.6 },
        { angle: 180, size: 8, opacity: 0.4 },
        { angle: 225, size: 7, opacity: 0.3 },
        { angle: 270, size: 6, opacity: 0.2 },
        { angle: 315, size: 6, opacity: 0.1 },
    ];

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (timer > 0) {
            interval = setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [timer]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        let spinnerInterval: NodeJS.Timeout;
        spinnerInterval = setInterval(() => {
            setSpinnerRotation(prev => (prev + 45) % 360);
        }, 150);

        return () => {

            if (spinnerInterval) clearInterval(spinnerInterval);
        };
    }, []);

    useEffect(() => {
        const t = setTimeout(async () => {

            const token = await AsyncStorage.getItem('vToken')
            if (!token) {
                (navigation as any).replace("SignIn");
            } else {
                (navigation as any).replace("MainTabs");
            }
        // replace is better for splash screens
        }, 3000);

        return () => clearTimeout(t);
    }, [navigation]);

    return (


        <View className='flex-1 justify-center items-center'>

            <LinearGradient
                colors={['#FFC6291A', '#FFC64973']}
                style={styles.background}

            />
            <Image source={Images.Logo} />

            <View className="w-16 h-16 items-center justify-center top-80 relative ">
                {spinnerDots.map((dot, index) => {
                    const angle = (dot.angle + spinnerRotation) * (Math.PI / 180);
                    const radius = 20;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;

                    return (
                        <View
                            key={index}
                            style={{
                                position: 'absolute',
                                width: dot.size,
                                height: dot.size,
                                borderRadius: dot.size / 2,
                                backgroundColor: '#2355B6',
                                opacity: dot.opacity,
                                transform: [
                                    { translateX: x },
                                    { translateY: y }
                                ]
                            }}
                        />
                    );
                })}
            </View>
            <Toast
                style={toast.style}
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                fadeAnim={toast.fadeAnim}
                buttons={toast.buttons}
                onHide={toast.hide}
            />
        </View>


    )
}

export default WelcomeScreen

const styles = StyleSheet.create({
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },

});
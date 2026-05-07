import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Sidebar from '../../../../components/Sidebar';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { appColors, appStyles } from '../../../../styles/appStyles';

export default function DashboardCompanyScreen() {
    const { profile, refreshProfile } = useAuth();
    const { colors, isDarkMode, toggleTheme } = useTheme();
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await refreshProfile();
        setRefreshing(false);
    }, [refreshProfile]);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.delay(200),
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
            ]),
        ]).start();
    }, []);

    return (
        <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
            <View style={localStyles.header}>
                <TouchableOpacity onPress={() => setSidebarVisible(true)} activeOpacity={0.7} style={{ width: 40 }}>
                    <Text style={[localStyles.hamburger, { color: colors.textPrimary }]}>≡</Text>
                </TouchableOpacity>
                <Text style={[localStyles.headerLabel, { color: colors.textSecondary }]}>DASHBOARD</Text>
                <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7} style={{ width: 40, alignItems: 'flex-end' }}>
                    <Feather name={isDarkMode ? 'moon' : 'sun'} size={24} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
            >
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                    <View style={localStyles.badge}>
                        <View style={localStyles.badgeDot} />
                        <Text style={localStyles.badgeText}>SESIÓN ACTIVA</Text>
                    </View>

                    <Text style={[appStyles.title, { paddingVertical: 10, color: colors.textPrimary }]}>
                        YA ESTÁS{'\n'}DENTRO!
                    </Text>

                    <Text style={[appStyles.subtitle, { color: colors.textSecondary }]}>
                        Bienvenido, {profile?.nickname ?? 'Empresa'}.
                    </Text>

                    <View style={[localStyles.divider, { backgroundColor: colors.border }]} />

                    <View style={[localStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[localStyles.cardLabel, { color: colors.textSecondary }]}>ROL</Text>
                        <Text style={[localStyles.cardValue, { color: colors.textPrimary }]}>Empresa</Text>
                    </View>

                    <View style={[localStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[localStyles.cardLabel, { color: colors.textSecondary }]}>ESTADO</Text>
                        <Text style={[localStyles.cardValue, { color: colors.textPrimary }]}>Autenticado</Text>
                    </View>

                </Animated.View>
            </ScrollView>

            <Sidebar
                visible={sidebarVisible}
                onClose={() => setSidebarVisible(false)}
            />
        </View>
    );
}

const localStyles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
    },
    hamburger: {
        fontSize: 26,
    },
    headerLabel: {
        fontSize: 11,
        letterSpacing: 3,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    badgeDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: appColors.primary,
    },
    badgeText: {
        color: appColors.primary,
        fontSize: 11,
        letterSpacing: 3,
    },
    divider: {
        height: 1,
        marginVertical: 28,
    },
    card: {
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 12,
        gap: 4,
    },
    cardLabel: {
        fontSize: 10,
        letterSpacing: 3,
    },
    cardValue: {
        fontSize: 14,
        letterSpacing: 0.5,
    },
});
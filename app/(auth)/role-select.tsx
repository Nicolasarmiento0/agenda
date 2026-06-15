import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors } from '../../styles/appStyles';

const PENDING_BOOKING_KEY = 'pendingBooking';

export default function RoleSelectScreen() {
    const { user, updateProfileState } = useAuth();
    const { colors, isDarkMode } = useTheme();
    const { showAlert } = useAlert();
    const { returnTo, forceRole } = useLocalSearchParams<{ returnTo?: string; forceRole?: string }>();
    const [selected, setSelected] = useState<'client' | 'company' | 'worker' | null>(null);
    const [loading, setLoading] = useState(false);

    // Auto-assign client role and redirect when coming from public business landing
    useEffect(() => {
      if (forceRole !== 'client' || !user?.id) return;
      (async () => {
        setLoading(true);
        try {
          await supabase.from('profiles').update({ role: 'client' }).eq('id', user.id);
          updateProfileState({ role: 'client' });
          await AsyncStorage.removeItem(PENDING_BOOKING_KEY);
          if (returnTo) {
            router.replace(returnTo as any);
          } else {
            router.replace('/client-dashboard');
          }
        } catch {
          setLoading(false);
        }
      })();
    }, [forceRole, user?.id]);

    const handleConfirm = async () => {
        if (!selected) {
            showAlert({ title: 'Atención', message: 'Por favor selecciona una opción' });
            return;
        }

        try {
            setLoading(true);
            const { error } = await supabase
                .from('profiles')
                .update({ role: selected })
                .eq('id', user?.id);

            if (error) throw error;

            updateProfileState({ role: selected });

            if (selected === 'company') {
                router.replace('/business-setup');
            } else {
                router.replace('/client-dashboard');
            }
        } catch (error: any) {
            showAlert({ title: 'Error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
                ¿CÓMO QUIERES{'\n'}USAR LA APP?
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Elige tu perfil para continuar
            </Text>

            <View style={styles.cardsContainer}>
                {/* Card Cliente */}
                <TouchableOpacity
                    style={[
                        styles.card,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        selected === 'client' && { borderColor: appColors.primary, borderWidth: 2 },
                    ]}
                    onPress={() => setSelected('client')}
                    activeOpacity={0.8}
                >
                    <View style={[styles.iconWrapper, { backgroundColor: selected === 'client' ? appColors.primary + '15' : colors.background }]}>
                        <Feather name="user" size={32} color={selected === 'client' ? appColors.primary : colors.textSecondary} />
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                        CLIENTE
                    </Text>
                    <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                        Busco y contrato servicios
                    </Text>
                    {selected === 'client' && (
                        <View style={[styles.checkBadge, { backgroundColor: appColors.primary }]}>
                            <Feather name="check" size={12} color="#fff" />
                        </View>
                    )}
                </TouchableOpacity>

                {/* Card Empresa */}
                <TouchableOpacity
                    style={[
                        styles.card,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        selected === 'company' && { borderColor: appColors.primary, borderWidth: 2 },
                    ]}
                    onPress={() => setSelected('company')}
                    activeOpacity={0.8}
                >
                    <View style={[styles.iconWrapper, { backgroundColor: selected === 'company' ? appColors.primary + '15' : colors.background }]}>
                        <Feather name="briefcase" size={32} color={selected === 'company' ? appColors.primary : colors.textSecondary} />
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                        EMPRESA
                    </Text>
                    <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                        Ofrezco mis servicios
                    </Text>
                    {selected === 'company' && (
                        <View style={[styles.checkBadge, { backgroundColor: appColors.primary }]}>
                            <Feather name="check" size={12} color="#fff" />
                        </View>
                    )}
                </TouchableOpacity>

            </View>

            <TouchableOpacity
                style={[
                    styles.button,
                    { backgroundColor: selected ? '#B4F736' : colors.surface },
                    !selected && { opacity: 0.5 },
                ]}
                onPress={handleConfirm}
                disabled={!selected || loading}
                activeOpacity={0.8}
            >
                <Text style={[styles.buttonText, { color: selected ? '#111827' : colors.textSecondary }]}>
                    {loading ? 'GUARDANDO...' : 'CONTINUAR'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 28,
        justifyContent: 'center',
        gap: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: 1,
        lineHeight: 38,
        marginBottom: 4,
        fontFamily: 'Inter_700Bold',
    },
    subtitle: {
        fontSize: 14,
        letterSpacing: 0.5,
        marginBottom: 16,
    },
    cardsContainer: {
        gap: 16,
        marginBottom: 8,
    },
    card: {
        padding: 28,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        gap: 8,
        position: 'relative',
    },
    cardIcon: {
        fontSize: 48,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 2,
        fontFamily: 'Inter_700Bold',
    },
    cardDesc: {
        fontSize: 13,
        letterSpacing: 0.3,
    },
    iconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    checkBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    button: {
        paddingVertical: 16,
        borderRadius: 999,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 2,
        fontFamily: 'Inter_700Bold',
    },
});
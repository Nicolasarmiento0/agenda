import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';

export default function RoleSelectScreen() {
    const { user, updateProfileState } = useAuth();
    const { colors, isDarkMode } = useTheme();
    const { showAlert } = useAlert();
    const [selected, setSelected] = useState<'client' | 'company' | null>(null);
    const [loading, setLoading] = useState(false);

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

            // ✅ Redirigir según el rol elegido
            if (selected === 'company') {
                router.replace('/screens/business-setup' as any);
            } else {
                router.replace('/screens/client-agenda' as any);
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
                        selected === 'client' && { borderColor: '#E63946', borderWidth: 2 },
                    ]}
                    onPress={() => setSelected('client')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.cardIcon}>👤</Text>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                        CLIENTE
                    </Text>
                    <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                        Busco y contrato servicios
                    </Text>
                    {selected === 'client' && (
                        <View style={styles.checkBadge}>
                            <Text style={styles.checkText}>✓</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Card Empresa */}
                <TouchableOpacity
                    style={[
                        styles.card,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        selected === 'company' && { borderColor: '#E63946', borderWidth: 2 },
                    ]}
                    onPress={() => setSelected('company')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.cardIcon}>🏢</Text>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                        EMPRESA
                    </Text>
                    <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                        Ofrezco mis servicios
                    </Text>
                    {selected === 'company' && (
                        <View style={styles.checkBadge}>
                            <Text style={styles.checkText}>✓</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={[
                    styles.button,
                    { backgroundColor: selected ? '#E63946' : colors.surface },
                    !selected && { opacity: 0.5 },
                ]}
                onPress={handleConfirm}
                disabled={!selected || loading}
                activeOpacity={0.8}
            >
                <Text style={[styles.buttonText, { color: selected ? '#fff' : colors.textSecondary }]}>
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
    },
    cardDesc: {
        fontSize: 13,
        letterSpacing: 0.3,
    },
    checkBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#E63946',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    button: {
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 2,
    },
});
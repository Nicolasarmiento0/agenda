import { Feather } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors, appStyles } from '../../styles/appStyles';

type Category = { 
  id: string; 
  name: string; 
  icon: string; 
  parent_id: string | null;
};

export default function BusinessSetupScreen() {
  const { profile, refreshProfile } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [openingTime, setOpeningTime] = useState('07:00');
  const [closingTime, setClosingTime] = useState('22:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    supabase.from('service_categories').select('*').eq('is_active', true).then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  const parentCategories = categories.filter(c => !c.parent_id);
  const subCategories = categories.filter(c => c.parent_id === parentCategoryId);

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const uploadLogo = async (userId: string): Promise<string | null> => {
    if (!logoUri) return null;
    try {
      const ext = logoUri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${userId}/logo.${ext}`;
      
      let body: any;
      let contentType: string | undefined;

      if (Platform.OS === 'web') {
        const response = await fetch(logoUri);
        body = await response.blob();
        contentType = `image/${ext}`;
      } else {
        const formData = new FormData();
        formData.append('file', {
          uri: logoUri,
          name: path.split('/')[1],
          type: `image/${ext}`,
        } as any);
        body = formData;
        contentType = undefined;
      }

      const { error } = await supabase.storage.from('business-logos').upload(path, body, {
        upsert: true,
        contentType,
      });
      
      if (error) {
        console.error('Error uploading logo:', error);
        return null;
      }
      
      const { data } = supabase.storage.from('business-logos').getPublicUrl(path);
      return `${data.publicUrl}?t=${Date.now()}`;
    } catch (e) {
      console.error('Upload catch error:', e);
      return null;
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) return setError('El nombre del negocio es obligatorio.');
    if (!parentCategoryId) return setError('Selecciona un sector principal.');
    if (!subCategoryId) return setError('Selecciona una especialidad.');
    if (!address.trim()) return setError('La dirección es obligatoria.');

    setSaving(true);
    try {
      const userId = profile?.id;
      if (!userId) throw new Error('Sin sesión');

      const logo_url = await uploadLogo(userId);

      const { error: dbError } = await supabase.from('businesses').insert({
        owner_id: userId,
        name: name.trim(),
        category_id: subCategoryId,
        description: description.trim() || null,
        address: address.trim(),
        phone: phone.trim() || null,
        logo_url,
        status: 'pending',
        opening_time: `${openingTime}:00`,
        closing_time: `${closingTime}:00`,
      });

      if (dbError) throw dbError;

      await refreshProfile();
      router.replace('/screens/business-pending' as any);
    } catch (e: any) {
      setError(e.message ?? 'Error al guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>NUEVO NEGOCIO</Text>
          <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7} style={{ width: 40, alignItems: 'flex-end' }}>
            <Feather name={isDarkMode ? 'moon' : 'sun'} size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            <Text style={[appStyles.title, { color: colors.textPrimary, paddingVertical: 4 }]}>
              REGISTRA TU{'\n'}NEGOCIO
            </Text>
            <Text style={[appStyles.subtitle, { color: colors.textSecondary, marginBottom: 28 }]}>
              Completa la información. Revisaremos tu solicitud y te notificaremos cuando sea aprobada.
            </Text>

            {/* Logo picker */}
            <TouchableOpacity onPress={pickLogo} activeOpacity={0.8} style={styles.logoContainer}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logoImage} />
              ) : (
                <View style={[styles.logoPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="camera" size={28} color={colors.textSecondary} />
                  <Text style={[styles.logoLabel, { color: colors.textSecondary }]}>AGREGAR LOGO</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Nombre */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>NOMBRE DEL NEGOCIO *</Text>
            <TextInput
              style={[appStyles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 16 }]}
              placeholder="Ej: Barbería Los Andes"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />

            {/* Sector Principal */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>SECTOR DEL NEGOCIO *</Text>
            <View style={styles.categoryGrid}>
              {parentCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.7}
                  onPress={() => {
                    setParentCategoryId(cat.id);
                    setSubCategoryId('');
                  }}
                  style={[
                    styles.categoryChip,
                    {
                      borderColor: parentCategoryId === cat.id ? appColors.primary : colors.border,
                      backgroundColor: parentCategoryId === cat.id ? `${appColors.primary}18` : colors.surface,
                    },
                  ]}
                >
                  <Feather
                    name={(cat.icon as any) || 'grid'}
                    size={14}
                    color={parentCategoryId === cat.id ? appColors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.chipText, { color: parentCategoryId === cat.id ? appColors.primary : colors.textPrimary }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Subcategoría / Especialidad */}
            {parentCategoryId ? (
              <Animated.View style={{ opacity: fadeAnim }}>
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 10 }]}>ESPECIALIDAD *</Text>
                <View style={styles.categoryGrid}>
                  {subCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      activeOpacity={0.7}
                      onPress={() => setSubCategoryId(cat.id)}
                      style={[
                        styles.subCategoryChip,
                        {
                          borderColor: subCategoryId === cat.id ? appColors.primary : colors.border,
                          backgroundColor: subCategoryId === cat.id ? appColors.primary : colors.surface,
                        },
                      ]}
                    >
                      <Text style={[styles.subChipText, { color: subCategoryId === cat.id ? '#fff' : colors.textPrimary }]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>
            ) : null}

            {/* Descripción */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIPCIÓN</Text>
            <TextInput
              style={[appStyles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 16, height: 90, textAlignVertical: 'top' }]}
              placeholder="Cuéntanos sobre tu negocio..."
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            {/* Horarios */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>APERTURA *</Text>
                <TextInput
                  style={[appStyles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border }]}
                  placeholder="09:00"
                  placeholderTextColor={colors.textSecondary}
                  value={openingTime}
                  onChangeText={setOpeningTime}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>CIERRE *</Text>
                <TextInput
                  style={[appStyles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border }]}
                  placeholder="18:00"
                  placeholderTextColor={colors.textSecondary}
                  value={closingTime}
                  onChangeText={setClosingTime}
                />
              </View>
            </View>

            {/* Dirección */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>DIRECCIÓN *</Text>
            <TextInput
              style={[appStyles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 16 }]}
              placeholder="Calle, número, ciudad"
              placeholderTextColor={colors.textSecondary}
              value={address}
              onChangeText={setAddress}
            />

            {/* Teléfono */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>TELÉFONO</Text>
            <TextInput
              style={[appStyles.input, { color: colors.textPrimary, backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 24 }]}
              placeholder="+56 9 XXXX XXXX"
              placeholderTextColor={colors.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            {error ? <Text style={[appStyles.errorText, { marginBottom: 12 }]}>{error}</Text> : null}

            <TouchableOpacity
              style={[appStyles.primaryButton, { opacity: saving ? 0.6 : 1 }]}
              activeOpacity={0.8}
              onPress={handleSubmit}
              disabled={saving}
            >
              <Text style={appStyles.primaryButtonText}>
                {saving ? 'ENVIANDO...' : 'ENVIAR SOLICITUD'}
              </Text>
            </TouchableOpacity>

          </Animated.View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
  },
  headerLabel: { fontSize: 11, letterSpacing: 3 },
  logoContainer: { alignSelf: 'center', marginBottom: 28 },
  logoImage: { width: 96, height: 96, borderRadius: 8, borderWidth: 2, borderColor: appColors.primary },
  logoPlaceholder: {
    width: 96, height: 96, borderRadius: 8,
    borderWidth: 1, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  logoLabel: { fontSize: 9, letterSpacing: 1.5 },
  label: { fontSize: 10, letterSpacing: 2, marginBottom: 8 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 4,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  subCategoryChip: {
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  chipText: { fontSize: 11, letterSpacing: 0.5, fontWeight: '600' },
  subChipText: { fontSize: 12, fontWeight: '500' },
});
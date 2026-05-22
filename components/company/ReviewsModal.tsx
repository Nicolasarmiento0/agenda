import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { glassColors } from '../../styles/appStyles';

type Review = {
  score: number;
  comment: string | null;
  created_at: string;
  profiles: { nickname: string } | null;
};

type Props = {
  visible: boolean;
  reviews: Review[];
  onClose: () => void;
  colors: { textPrimary: string; textSecondary: string; border: string };
};

export default function ReviewsModal({ visible, reviews, onClose, colors }: Props) {
  const { isDarkMode } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <BlurView
          intensity={40}
          tint={isDarkMode ? 'dark' : 'light'}
          style={[styles.sheet, { borderColor: colors.border }]}
        >
          <View style={[styles.inner, { backgroundColor: isDarkMode ? glassColors.sheetDark : glassColors.sheetModalLight }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Opiniones de Clientes</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {reviews.length === 0 ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>Aún no tienes opiniones.</Text>
              ) : reviews.map((r, i) => (
                <View key={i} style={[styles.reviewItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.reviewHeader}>
                    <Text style={[styles.reviewAuthor, { color: colors.textPrimary }]}>
                      {r.profiles?.nickname || 'Cliente'}
                    </Text>
                    <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>
                      {new Date(r.created_at).toLocaleDateString('es-ES')}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Ionicons key={star} name={star <= r.score ? 'star' : 'star-outline'} size={14} color="#F0A030" />
                    ))}
                  </View>
                  {r.comment ? (
                    <Text style={[styles.reviewComment, { color: colors.textSecondary }]}>"{r.comment}"</Text>
                  ) : (
                    <Text style={[styles.reviewComment, { color: colors.textSecondary, fontStyle: 'italic' }]}>Sin comentario</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: glassColors.overlayMedium,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inner: { flex: 1, padding: 24 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  closeBtn: { padding: 4 },
  reviewItem: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewAuthor: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  reviewDate: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  reviewComment: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular' },
});

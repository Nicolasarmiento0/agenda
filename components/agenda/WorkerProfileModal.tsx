import { BlurView } from 'expo-blur';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Appointment, WorkerRow } from '../../constants/appointments';
import { glassColors } from '../../styles/appStyles';
import WorkerAvatar from '../WorkerAvatar';
import { toLocalISOString } from './agendaHelpers';

type Props = {
  visible: boolean;
  worker: WorkerRow | null;
  appointments: Appointment[];
  selectedDate: Date;
  selectedWorkerFilter: string | null;
  onClose: () => void;
  onFilterToggle: (workerName: string) => void;
};

export default function WorkerProfileModal({
  visible,
  worker,
  appointments,
  selectedDate,
  selectedWorkerFilter,
  onClose,
  onFilterToggle,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={() => {}}>
          <BlurView intensity={70} tint="dark" style={styles.card}>
            <View style={styles.cardInner}>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' }}>✕</Text>
              </TouchableOpacity>
              {worker && (
                <>
                  <View style={{ marginTop: 8, marginBottom: 4 }}>
                    <WorkerAvatar
                      avatarUrl={worker.avatar_url}
                      name={worker.name}
                      color={worker.color}
                      size={72}
                      borderWidth={2.5}
                    />
                  </View>
                  <Text style={styles.name}>{worker.name}</Text>
                  <View style={styles.divider} />
                  <View style={styles.stats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        {appointments.filter(a => a.worker === worker.name && a.date === toLocalISOString(selectedDate)).length}
                      </Text>
                      <Text style={styles.statLabel}>Hoy</Text>
                    </View>
                    <View style={[styles.statItem, { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: glassColors.borderDarkSubtle }]}>
                      <Text style={styles.statValue}>
                        {appointments.filter(a => a.worker === worker.name).length}
                      </Text>
                      <Text style={styles.statLabel}>Semana</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.filterBtn, { backgroundColor: worker.color + '20', borderColor: worker.color + '50' }]}
                    onPress={() => { onFilterToggle(worker.name); onClose(); }}
                  >
                    <Text style={[styles.filterBtnText, { color: worker.color }]}>
                      {selectedWorkerFilter === worker.name ? 'Ver todos' : 'Filtrar por este trabajador'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </BlurView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: glassColors.overlayMedium,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    width: 260,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: glassColors.borderDarkMedium,
  },
  cardInner: {
    backgroundColor: 'rgba(14,14,14,0.78)',
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: glassColors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    fontFamily: 'Inter_700Bold',
  },
  divider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: glassColors.borderDarkSubtle,
    marginVertical: 4,
  },
  stats: {
    flexDirection: 'row',
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    fontFamily: 'Inter_400Regular',
  },
  filterBtn: {
    marginTop: 4,
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

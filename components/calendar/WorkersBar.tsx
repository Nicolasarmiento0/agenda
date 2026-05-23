import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WorkerRow } from '../../constants/appointments';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  workers: WorkerRow[];
  selectedWorkerId: string | null;
  onSelectWorker: (id: string | null) => void;
};

export default function WorkersBar({ workers, selectedWorkerId, onSelectWorker }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* "Todos" pill */}
        <TouchableOpacity
          style={styles.item}
          onPress={() => onSelectWorker(null)}
          activeOpacity={0.75}
        >
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: colors.accent + '22',
                borderColor: selectedWorkerId === null ? colors.accent : 'transparent',
                borderWidth: selectedWorkerId === null ? 2 : 2,
              },
            ]}
          >
            <Text style={[styles.initials, { color: colors.accent }]}>★</Text>
          </View>
          <Text
            style={[
              styles.name,
              {
                color: selectedWorkerId === null ? colors.accent : colors.textSecondary,
              },
            ]}
            numberOfLines={1}
          >
            Todos
          </Text>
        </TouchableOpacity>

        {workers.map((w) => {
          const isSelected = selectedWorkerId === w.id;
          return (
            <TouchableOpacity
              key={w.id}
              style={styles.item}
              onPress={() => onSelectWorker(w.id)}
              activeOpacity={0.75}
            >
              <View style={styles.avatarWrapper}>
                {w.avatar_url ? (
                  <Image
                    source={{ uri: w.avatar_url }}
                    style={[
                      styles.avatar,
                      {
                        borderColor: isSelected ? colors.white : 'transparent',
                        borderWidth: 2,
                      },
                    ]}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: w.color + '33',
                        borderColor: isSelected ? colors.white : 'transparent',
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <Text style={[styles.initials, { color: w.color }]}>{w.initials}</Text>
                  </View>
                )}
                <View style={[styles.onlineDot, { borderColor: colors.backgroundPrimary }]} />
              </View>
              <Text
                style={[
                  styles.name,
                  { color: isSelected ? colors.textPrimary : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {w.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  item: {
    alignItems: 'center',
    width: 56,
    marginRight: 8,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#30D158',
    borderWidth: 1.5,
  },
  name: {
    marginTop: 4,
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    width: 52,
  },
});

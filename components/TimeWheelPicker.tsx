import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  View
} from 'react-native';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 3;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING = ITEM_HEIGHT;

type BusyInterval = { start: number; end: number };

// ─── Single Premium Drum Column ──────────────────────────────────────────────

type WheelColumnProps = {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  isDarkMode: boolean;
  busyIndices?: Set<number>;
};

function WheelColumn({
  items,
  selectedIndex,
  onSelect,
  isDarkMode,
  busyIndices,
}: WheelColumnProps) {
  const scrollY = useRef(new Animated.Value(selectedIndex * ITEM_HEIGHT)).current;
  const scrollRef = useRef<any>(null);
  const currentIndex = useRef(selectedIndex);
  const lastHapticIndex = useRef(-1);
  const isMounted = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
      isMounted.current = true;
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;
    if (currentIndex.current === selectedIndex) return;
    currentIndex.current = selectedIndex;
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: true });
  }, [selectedIndex]);

  const snapToIndex = useCallback(
    (rawOffset: number) => {
      const index = Math.max(0, Math.min(Math.round(rawOffset / ITEM_HEIGHT), items.length - 1));
      const snappedOffset = index * ITEM_HEIGHT;

      if (Platform.OS !== 'ios' && Math.abs(rawOffset - snappedOffset) > 1) {
        scrollRef.current?.scrollTo({ y: snappedOffset, animated: true });
      }

      if (index !== currentIndex.current) {
        currentIndex.current = index;
        onSelect(index);
        Haptics.selectionAsync().catch(() => { });
      }
    },
    [items.length, onSelect],
  );

  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      const index = Math.max(0, Math.min(Math.round(value / ITEM_HEIGHT), items.length - 1));
      if (index !== lastHapticIndex.current) {
        lastHapticIndex.current = index;
        Haptics.selectionAsync().catch(() => { });
      }
    });
    return () => { scrollY.removeListener(id); };
  }, [items.length, scrollY]);

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      snapToIndex(e.nativeEvent.contentOffset.y);
    },
    [snapToIndex],
  );

  const handleScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const velocity = e.nativeEvent.velocity?.y ?? 0;
      if (Math.abs(velocity) < 0.1) {
        snapToIndex(e.nativeEvent.contentOffset.y);
      }
    },
    [snapToIndex]
  );

  const busyColor = '#EF4444';
  const accentColor = '#B4F736'; // Neon lime green of the app

  return (
    <View style={styles.column}>
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.98}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: PADDING, paddingBottom: PADDING }}
        bounces={false}
        overScrollMode="never"
        nestedScrollEnabled={true}
        style={{ height: PICKER_HEIGHT }}
      >
        {items.map((item, i) => {
          const centerAt = i * ITEM_HEIGHT;

          const opacity = scrollY.interpolate({
            inputRange: [
              centerAt - ITEM_HEIGHT,
              centerAt,
              centerAt + ITEM_HEIGHT,
            ],
            outputRange: [0.35, 1, 0.35],
            extrapolate: 'clamp',
          });

          const scale = scrollY.interpolate({
            inputRange: [centerAt - ITEM_HEIGHT, centerAt, centerAt + ITEM_HEIGHT],
            outputRange: [0.9, 1.05, 0.9],
            extrapolate: 'clamp',
          });

          const isBusy = busyIndices?.has(i);
          const isSelected = i === selectedIndex;

          return (
            <Animated.View
              key={`${item}-${i}`}
              style={[styles.item, { opacity, transform: [{ scale }] }]}
            >
              <Text
                onPress={() => snapToIndex(i * ITEM_HEIGHT)}
                style={[
                  styles.itemText,
                  {
                    color: isBusy
                      ? busyColor
                      : isSelected
                        ? accentColor
                        : isDarkMode
                          ? 'rgba(255, 255, 255, 0.45)'
                          : 'rgba(15, 23, 42, 0.45)',
                    fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  }
                ]}
              >
                {item}
              </Text>
              {isBusy && <View style={[styles.busyDot, { backgroundColor: busyColor }]} />}
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type TimeWheelPickerProps = {
  openingHour: number;
  closingHour: number;
  selectedSlot: string | null;
  onSlotSelect: (slot: string) => void;
  busyIntervals: BusyInterval[];
  durationMinutes: number;
  isDarkMode: boolean;
  closedAfter?: number; // hora de cierre real (fraccional) — slots que INICIAN después quedan bloqueados
};

export default function TimeWheelPicker({
  openingHour,
  closingHour,
  selectedSlot,
  onSlotSelect,
  busyIntervals,
  durationMinutes,
  isDarkMode,
  closedAfter,
}: TimeWheelPickerProps) {
  const hours: string[] = [];
  for (let h = openingHour; h <= Math.min(closingHour, 23); h++) {
    hours.push(String(h).padStart(2, '0'));
  }
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  const defaultHour = String(openingHour).padStart(2, '0');
  let selectedHourStr = defaultHour;
  let selectedMinuteStr = '00';

  if (selectedSlot) {
    const parts = selectedSlot.split(':');
    if (parts[0]) {
      selectedHourStr = String(parseInt(parts[0], 10)).padStart(2, '0');
    }
    if (parts[1]) {
      const parsedMin = parseInt(parts[1], 10);
      if (!isNaN(parsedMin)) {
        const roundedMin = Math.round(parsedMin / 5) * 5;
        const targetMin = roundedMin >= 60 ? 55 : roundedMin;
        selectedMinuteStr = String(targetMin).padStart(2, '0');
      }
    }
  }

  const hourRef = useRef(selectedHourStr);
  const minuteRef = useRef(selectedMinuteStr);
  hourRef.current = selectedHourStr;
  minuteRef.current = selectedMinuteStr;

  const selectedHourIndex = Math.max(0, hours.indexOf(selectedHourStr));
  const selectedMinuteIndex = Math.max(0, minutes.indexOf(selectedMinuteStr));

  const isSlotBusy = useCallback(
    (hStr: string, mStr: string): boolean => {
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      const slotStart = h + m / 60;
      // Slots que inician estrictamente después del cierre quedan bloqueados
      if (closedAfter !== undefined && slotStart > closedAfter) return true;
      const slotEnd = slotStart + durationMinutes / 60;
      return busyIntervals.some(({ start, end }) => slotStart < end && slotEnd > start);
    },
    [busyIntervals, durationMinutes, closedAfter],
  );

  const busyHourIndices = new Set(
    hours.reduce<number[]>((acc, h, i) => {
      if (minutes.every(m => isSlotBusy(h, m))) acc.push(i);
      return acc;
    }, []),
  );

  const busyMinuteIndices = new Set(
    minutes.reduce<number[]>((acc, m, i) => {
      if (isSlotBusy(hourRef.current, m)) acc.push(i);
      return acc;
    }, []),
  );

  const handleHourSelect = useCallback(
    (index: number) => {
      onSlotSelect(`${hours[index]}:${minuteRef.current}`);
    },
    [hours, onSlotSelect],
  );

  const handleMinuteSelect = useCallback(
    (index: number) => {
      onSlotSelect(`${hourRef.current}:${minutes[index]}`);
    },
    [minutes, onSlotSelect],
  );

  // Paleta de colores Neon Lime Premium
  const glassBorder = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';
  const separatorColor = isDarkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(15, 23, 42, 0.2)';
  const labelColor = isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(15, 23, 42, 0.46)';
  const highlightBg = isDarkMode ? 'rgba(180, 247, 54, 0.08)' : 'rgba(180, 247, 54, 0.05)';
  const highlightBorder = 'rgba(180, 247, 54, 0.35)'; // Accent neon green border glow

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: glassBorder,
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
        },
      ]}
    >
      <View style={styles.pickerContainer}>
        {/* Highlight Band de Refracción (Fija en el centro) */}
        <View
          pointerEvents="none"
          style={[
            styles.highlightBand,
            {
              backgroundColor: highlightBg,
              borderColor: highlightBorder,
            },
          ]}
        />

        <View style={styles.row}>
          <WheelColumn
            items={hours}
            selectedIndex={selectedHourIndex}
            onSelect={handleHourSelect}
            isDarkMode={isDarkMode}
            busyIndices={busyHourIndices}
          />

          <Text style={[styles.separator, { color: separatorColor }]}>:</Text>

          <WheelColumn
            items={minutes}
            selectedIndex={selectedMinuteIndex}
            onSelect={handleMinuteSelect}
            isDarkMode={isDarkMode}
            busyIndices={busyMinuteIndices}
          />
        </View>
      </View>

      {/* Etiquetas Minimalistas e integradas */}
      <View style={styles.labelsRow}>
        <Text style={[styles.label, { color: labelColor }]}>HR</Text>
        <View style={styles.labelSpacer} />
        <Text style={[styles.label, { color: labelColor }]}>MIN</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 8,
    overflow: 'hidden',
  },
  pickerContainer: {
    position: 'relative',
    height: PICKER_HEIGHT,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 2,
  },
  column: {
    flex: 1,
    height: PICKER_HEIGHT,
    overflow: 'hidden',
  },
  highlightBand: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: ITEM_HEIGHT,
    borderWidth: 1,
    borderRadius: 10,
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  itemText: {
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  busyDot: {
    position: 'absolute',
    bottom: 6,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  separator: {
    fontSize: 24,
    fontWeight: '300',
    paddingHorizontal: 12,
    transform: [{ translateY: -2 }],
  },
  labelsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 12,
    paddingTop: 2,
    alignItems: 'center',
  },
  labelSpacer: {
    width: 32, // Sincronizado con el ancho del separador
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
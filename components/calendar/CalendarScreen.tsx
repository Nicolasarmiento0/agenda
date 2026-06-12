import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appointment, DEFAULT_END_HOUR, DEFAULT_START_HOUR, HOUR_HEIGHT, WorkerRow, getPastelColors } from '../../constants/appointments';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useAgendaAppointments } from '../../hooks/useAgendaAppointments';
import { useWorkers } from '../../hooks/useWorkers';
import { supabase } from '../../lib/supabase';
import Sidebar from '../Sidebar';
import AppointmentModal, { AppointmentModalHandle } from './AppointmentModal';
import WorkersBar from './WorkersBar';

type ViewMode = 'month' | 'week' | 'day';

const DAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const result = new Date(d);
  result.setDate(d.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getWeekDays(anchor: Date): Date[] {
  const monday = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: Date[] = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

function getDayMonthGrid(year: number, month: number): (Date | null)[] {
  const days = getMonthDays(year, month);
  const firstDow = days[0].getDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1;
  const grid: (Date | null)[] = Array(offset).fill(null);
  days.forEach((d) => grid.push(d));
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatHour(h: number) {
  return `${pad2(Math.floor(h))}:${pad2(Math.round((h % 1) * 60))}`;
}

function isToday(d: Date) {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isHourWorking(day: Date, hour: number, businessSchedule: any): boolean {
  if (!businessSchedule) return true; // default to open if not loaded yet
  
  const dayOfWeek = day.getDay();
  const dayKey = dayOfWeek === 0 ? '7' : String(dayOfWeek);
  
  const dayBlocks = businessSchedule[dayKey];
  if (!Array.isArray(dayBlocks) || dayBlocks.length === 0) {
    return false; // Closed today
  }
  
  return dayBlocks.some((block: any) => {
    const [startH, startM] = block.start.split(':').map(Number);
    const [endH, endM] = block.end.split(':').map(Number);
    const blockStart = startH + (startM / 60);
    const blockEnd = endH + (endM / 60);
    
    // Check if there is overlap between [hour, hour + 1] and [blockStart, blockEnd]
    return blockStart < hour + 1 && blockEnd > hour;
  });
}

// ─────────────────────────── My-Appointments list (client tab) ───────────────

function MyAppointmentsList({ appointments, colors }: { appointments: Appointment[]; colors: any }) {
  const sorted = [...appointments].sort((a, b) => {
    const da = (a.date ?? '') + formatHour(a.startHour);
    const db = (b.date ?? '') + formatHour(b.startHour);
    return da.localeCompare(db);
  });

  if (sorted.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <Feather name="calendar" size={40} color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>
          No tienes citas próximas
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={sorted}
      keyExtractor={(a) => a.id}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      renderItem={({ item }) => (
        <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.listAccent, { backgroundColor: item.workerColor }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.listService, { color: colors.textPrimary }]}>{item.service}</Text>
            <Text style={[styles.listMeta, { color: colors.textSecondary }]}>
              {item.date}  ·  {formatHour(item.startHour)}  ·  {item.worker}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

// ─────────────────────────── Month Grid ───────────────────────────────────────

function MonthGrid({
  year,
  month,
  appointments,
  colors,
  onDayPress,
  onEventPress,
}: {
  year: number;
  month: number;
  appointments: Appointment[];
  colors: any;
  onDayPress: (date: Date) => void;
  onEventPress: (a: Appointment) => void;
}) {
  const { profile } = useAuth();
  const role = profile?.role ?? 'client';
  const grid = useMemo(() => getDayMonthGrid(year, month), [year, month]);

  const apptByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      if (!a.date) continue;
      (map[a.date] = map[a.date] || []).push(a);
    }
    return map;
  }, [appointments]);

  const today = useMemo(() => toLocalISO(new Date()), []);

  return (
    <View style={styles.monthContainer}>
      {/* Day headers */}
      <View style={styles.monthHeader}>
        {DAYS_SHORT.map((d) => (
          <Text key={d} style={[styles.monthHeaderText, { color: colors.textSecondary }]}>
            {d}
          </Text>
        ))}
      </View>
      {/* Grid */}
      <View style={styles.monthGrid}>
        {grid.map((day, idx) => {
          if (!day) {
            return <View key={`empty-${idx}`} style={styles.monthCell} />;
          }
          const iso = toLocalISO(day);
          const events = apptByDate[iso] ?? [];
          const isT = iso === today;

          return (
            <Pressable
              key={iso}
              style={styles.monthCell}
              onPress={() => onDayPress(day)}
              onLongPress={() => onDayPress(day)}
            >
              <View
                style={[
                  styles.monthDayCircle,
                  isT && { backgroundColor: colors.accent },
                ]}
              >
                <Text
                  style={[
                    styles.monthDayNum,
                    { color: isT ? colors.primaryText : colors.textPrimary },
                  ]}
                >
                  {day.getDate()}
                </Text>
              </View>
              <View style={styles.monthEventPills}>
                {events.slice(0, 2).map((e) => {
                  const isOther = role === 'client' && e.client_id !== profile?.id;
                  const displayText = isOther
                    ? (e.status === 'blocked' ? 'BLOQUEADO' : 'RESERVADO')
                    : e.service;
                  return (
                    <Pressable
                      key={e.id}
                      style={[styles.monthPill, { backgroundColor: e.workerColor + 'CC' }]}
                      onPress={() => onEventPress(e)}
                    >
                      <Text style={styles.monthPillText} numberOfLines={1}>
                        {displayText}
                      </Text>
                    </Pressable>
                  );
                })}
                {events.length > 2 && (
                  <Text style={[styles.monthMore, { color: colors.textSecondary }]}>
                    +{events.length - 2}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────── Week / Day shared time grid ──────────────────────

const SCREEN_W = Dimensions.get('window').width;
const TIME_COL_W = 44;
const WEEK_COL_W = 72;   // fixed width per day column (enables horizontal scroll)
const WEEK_HEADER_H = 52; // height of the day-names header row

function TimeColumn({ colors, startHour, endHour }: { colors: any; startHour: number; endHour: number }) {
  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i,
  );
  return (
    <View style={[styles.timeCol, { width: TIME_COL_W }]}>
      {hours.map((h) => (
        <View key={h} style={[styles.timeCell, { height: HOUR_HEIGHT }]}>
          <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>{pad2(h)}:00</Text>
        </View>
      ))}
    </View>
  );
}

function NowLine({ colors, startHour }: { colors: any; startHour: number }) {
  const now = new Date();
  const frac = (now.getHours() - startHour + now.getMinutes() / 60) * HOUR_HEIGHT;
  if (frac < 0) return null;
  return (
    <View style={[styles.nowLine, { top: frac }]}>
      <View style={[styles.nowDot, { backgroundColor: colors.statusCancelled }]} />
      <View style={[styles.nowRule, { backgroundColor: colors.statusCancelled }]} />
    </View>
  );
}

function EventBlock({
  appointment,
  colWidth,
  colors,
  onPress,
  startHour,
}: {
  appointment: Appointment;
  colWidth: number;
  colors: any;
  onPress: () => void;
  startHour: number;
}) {
  const { isDarkMode } = useTheme();
  const { profile } = useAuth();
  const role = profile?.role ?? 'client';

  const top = (appointment.startHour - startHour) * HOUR_HEIGHT;
  const height = Math.max(appointment.durationHours * HOUR_HEIGHT - 4, 24);

  const isNarrow = colWidth < 60;
  const isUltraNarrow = colWidth < 50;

  const paddingHorizontal = isUltraNarrow ? 2 : isNarrow ? 3 : 5;
  const titleSize = isUltraNarrow ? 8.5 : isNarrow ? 9.5 : 11;
  const subSize = isUltraNarrow ? 7.5 : isNarrow ? 8.5 : 10;

  const isBlocked = appointment.status === 'blocked';
  const isOtherClientAppt = role === 'client' && appointment.client_id !== profile?.id;
  const pastelColorsConfig = getPastelColors(appointment.id ?? appointment.clientName, isDarkMode);

  const borderLeftColor = isBlocked ? '#6B7280' : pastelColorsConfig.border;
  const backgroundColor = isBlocked
    ? (isDarkMode ? 'rgba(75, 85, 99, 0.45)' : 'rgba(209, 213, 219, 0.65)')
    : pastelColorsConfig.bg;
  const textTitleColor = isBlocked ? colors.textPrimary : pastelColorsConfig.text;

  const displayTitle = isOtherClientAppt
    ? (isBlocked ? 'BLOQUEADO' : 'RESERVADO')
    : appointment.service;

  const displaySub = isOtherClientAppt
    ? (isBlocked ? 'Horario bloqueado' : `Reservado • ${(appointment.worker || 'Barbero').split(' ')[0]}`)
    : (isBlocked ? 'Horario bloqueado' : `${appointment.clientName} • ${(appointment.worker || 'Barbero').split(' ')[0]}`);

  return (
    <Pressable
      style={[
        styles.eventBlock,
        {
          top,
          height,
          width: colWidth - (isNarrow ? 4 : 8),
          left: isNarrow ? 2 : 4,
          paddingHorizontal,
          borderLeftColor,
          backgroundColor,
        },
      ]}
      onPress={onPress}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: isUltraNarrow ? 2 : 4, width: '100%' }}>
        {isBlocked && (
          <Feather
            name="lock"
            size={titleSize - 1}
            color={colors.textSecondary}
            style={{ marginRight: 1 }}
          />
        )}
        <Text style={[styles.eventTitle, { color: textTitleColor, fontSize: titleSize, textDecorationLine: isBlocked ? 'line-through' : 'none', flex: 1, fontWeight: '600' }]} numberOfLines={1}>
          {displayTitle}
        </Text>
      </View>
      {height > 32 && (
        <Text style={[styles.eventSub, { color: isBlocked ? colors.textSecondary : textTitleColor, fontSize: subSize, opacity: isBlocked ? 1 : 0.85 }]} numberOfLines={1}>
          {displaySub}
        </Text>
      )}
    </Pressable>
  );
}

function WeekGrid({
  weekDays,
  appointments,
  colors,
  onSlotPress,
  onEventPress,
  refreshing,
  onRefresh,
  workers,
  selectedWorkerId,
  businessSchedule,
  startHour,
  endHour,
}: {
  weekDays: Date[];
  appointments: Appointment[];
  colors: any;
  onSlotPress: (date: Date, hour: number, workerId?: string) => void;
  onEventPress: (a: Appointment) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  workers: WorkerRow[];
  selectedWorkerId: string | null;
  businessSchedule: any;
  startHour: number;
  endHour: number;
}) {
  const { isDarkMode } = useTheme();
  const { showToast } = useToast();
  const [containerWidth, setContainerWidth] = useState(SCREEN_W);

  const handleLayout = useCallback((event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
    }
  }, []);

  const totalH = (endHour - startHour + 1) * HOUR_HEIGHT;
  const availableWidth = containerWidth - TIME_COL_W;

  const activeWorkers = workers;
  const isMultiWorker = selectedWorkerId === null && activeWorkers.length > 0;

  const weekColWidth = availableWidth / 7;
  const workerColWidth = isMultiWorker ? Math.max(100, availableWidth / (7 * Math.min(activeWorkers.length, 3))) : weekColWidth;
  const dayColWidth = isMultiWorker ? workerColWidth * activeWorkers.length : weekColWidth;
  const totalW = 7 * dayColWidth;

  const headerHeight = isMultiWorker ? 78 : WEEK_HEADER_H;

  const apptByDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      (map[a.date ?? ''] = map[a.date ?? ''] || []).push(a);
    }
    return map;
  }, [appointments]);

  const rows = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i,
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        ) : undefined
      }
    >
      <View style={{ flexDirection: 'row' }} onLayout={handleLayout}>
        {/* Time column — fixed horizontally */}
        <View style={{ width: TIME_COL_W, flexShrink: 0 }}>
          {/* Spacer that matches day-header height */}
          <View style={{ height: headerHeight, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }} />
          <TimeColumn colors={colors} startHour={startHour} endHour={endHour} />
        </View>

        {/* Day columns — scroll horizontally */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >
          <View style={{ width: totalW }}>
            {/* Day headers */}
            <View
              style={{
                flexDirection: 'row',
                height: headerHeight,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              }}
            >
              {weekDays.map((d) => {
                const t = isToday(d);
                return (
                  <View
                    key={d.toISOString()}
                    style={{
                      width: dayColWidth,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRightWidth: StyleSheet.hairlineWidth,
                      borderRightColor: colors.border,
                    }}
                  >
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: isMultiWorker ? 4 : 0 }}>
                      <Text style={[styles.weekDayName, { color: t ? colors.accent : colors.textSecondary }]}>
                        {DAYS_SHORT[(d.getDay() + 6) % 7]}
                      </Text>
                      <View style={[styles.weekDayCircle, t && { backgroundColor: colors.accent }]}>
                        <Text style={[styles.weekDayNum, { color: t ? '#111827' : colors.textPrimary }]}>
                          {d.getDate()}
                        </Text>
                      </View>
                    </View>

                    {isMultiWorker && (
                      <View style={{ flexDirection: 'row', width: '100%', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, height: 32 }}>
                        {activeWorkers.map((w) => (
                          <View
                            key={w.id}
                            style={{
                              width: workerColWidth,
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexDirection: 'row',
                              gap: 2,
                              borderRightWidth: StyleSheet.hairlineWidth,
                              borderRightColor: colors.border,
                            }}
                          >
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#30D158' }} />
                            <Text style={{ color: colors.textSecondary, fontSize: 9, fontFamily: 'Inter_500Medium' }} numberOfLines={1}>
                              {w.initials || w.name.split(' ')[0].slice(0, 2).toUpperCase()}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Body: grid lines + events */}
            <View style={{ height: totalH, position: 'relative' }}>
              {/* Horizontal hour lines */}
              {rows.map((h) => (
                <View
                  key={h}
                  style={[
                    styles.gridLine,
                    { top: (h - startHour) * HOUR_HEIGHT, borderColor: colors.border },
                  ]}
                />
              ))}

              {/* Day columns */}
              <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
                {weekDays.map((day) => {
                  const iso = toLocalISO(day);
                  const t = isToday(day);
                  const dayAppts = apptByDay[iso] ?? [];
                  return (
                    <View
                      key={iso}
                      style={{
                        width: dayColWidth,
                        height: totalH,
                        borderRightWidth: StyleSheet.hairlineWidth,
                        borderRightColor: colors.border,
                        backgroundColor: t ? colors.accent + '0A' : undefined,
                        flexDirection: 'row',
                      }}
                    >
                      {isMultiWorker ? (
                        activeWorkers.map((w) => {
                          const wAppts = dayAppts.filter((a) => a.worker_id === w.id || a.worker === w.name);
                          return (
                            <View
                              key={w.id}
                              style={{
                                width: workerColWidth,
                                height: totalH,
                                borderRightWidth: StyleSheet.hairlineWidth,
                                borderRightColor: colors.border,
                              }}
                            >
                              {rows.map((h) => {
                                const isWorking = isHourWorking(day, h, businessSchedule);
                                return (
                                  <Pressable
                                    key={h}
                                    style={[
                                      styles.slotCell,
                                      { height: HOUR_HEIGHT },
                                      !isWorking && { backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.4)' : 'rgba(243, 244, 246, 0.65)' }
                                    ]}
                                    onLongPress={isWorking ? () => onSlotPress(day, h, w.id) : undefined}
                                    onPress={!isWorking ? () => showToast({ type: 'error', message: 'Horario de descanso / Cerrado' }) : undefined}
                                  >
                                    {!isWorking && (
                                      <View style={styles.closedSlotOverlay}>
                                        <Feather name="lock" size={10} color={colors.textSecondary} opacity={0.6} />
                                      </View>
                                    )}
                                  </Pressable>
                                );
                              })}
                              {wAppts.map((a) => (
                                <EventBlock
                                  key={a.id}
                                  appointment={a}
                                  colWidth={workerColWidth}
                                  colors={colors}
                                  onPress={() => onEventPress(a)}
                                  startHour={startHour}
                                />
                              ))}
                            </View>
                          );
                        })
                      ) : (
                        <View style={{ flex: 1 }}>
                          {rows.map((h) => {
                            const isWorking = isHourWorking(day, h, businessSchedule);
                            return (
                              <Pressable
                                key={h}
                                style={[
                                  styles.slotCell,
                                  { height: HOUR_HEIGHT },
                                  !isWorking && { backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.4)' : 'rgba(243, 244, 246, 0.65)' }
                                ]}
                                onLongPress={isWorking ? () => onSlotPress(day, h) : undefined}
                                onPress={!isWorking ? () => showToast({ type: 'error', message: 'Horario de descanso / Cerrado' }) : undefined}
                              >
                                {!isWorking && (
                                  <View style={styles.closedSlotOverlay}>
                                    <Feather name="lock" size={12} color={colors.textSecondary} opacity={0.6} style={{ marginRight: 4 }} />
                                    <Text style={[styles.closedText, { color: colors.textSecondary }]}>Cerrado</Text>
                                  </View>
                                )}
                              </Pressable>
                            );
                          })}
                          {dayAppts.map((a) => (
                            <EventBlock
                              key={a.id}
                              appointment={a}
                              colWidth={dayColWidth}
                              colors={colors}
                              onPress={() => onEventPress(a)}
                              startHour={startHour}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              <NowLine colors={colors} startHour={startHour} />
            </View>
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
}

function DayGrid({
  day,
  appointments,
  colors,
  onSlotPress,
  onEventPress,
  refreshing,
  onRefresh,
  workers,
  selectedWorkerId,
  businessSchedule,
  startHour,
  endHour,
}: {
  day: Date;
  appointments: Appointment[];
  colors: any;
  onSlotPress: (date: Date, hour: number, workerId?: string) => void;
  onEventPress: (a: Appointment) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  workers: WorkerRow[];
  selectedWorkerId: string | null;
  businessSchedule: any;
  startHour: number;
  endHour: number;
}) {
  const { isDarkMode } = useTheme();
  const { showToast } = useToast();
  const [gridWidth, setGridWidth] = useState(SCREEN_W - TIME_COL_W - 32);
  const totalH = (endHour - startHour + 1) * HOUR_HEIGHT;
  const rows = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i,
  );

  const handleLayout = useCallback((event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setGridWidth(width);
    }
  }, []);

  const activeWorkers = workers;
  const isMultiWorker = selectedWorkerId === null && activeWorkers.length > 0;
  const availableWidth = Math.max(200, gridWidth - TIME_COL_W - 32);
  const workerColWidth = isMultiWorker ? Math.max(130, availableWidth / Math.min(activeWorkers.length, 3)) : availableWidth;

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        ) : undefined
      }
    >
      <View style={[styles.weekBody, { paddingHorizontal: 16 }]} onLayout={handleLayout}>
        {/* Time column — fixed horizontally */}
        <View style={{ width: TIME_COL_W, flexShrink: 0 }}>
          {isMultiWorker && (
            <View style={{ height: 40, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }} />
          )}
          <TimeColumn colors={colors} startHour={startHour} endHour={endHour} />
        </View>

        {/* Worker columns — scroll horizontally */}
        {isMultiWorker ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            <View style={{ flexDirection: 'column' }}>
              {/* Worker headers */}
              <View style={{ flexDirection: 'row', height: 40, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
                {activeWorkers.map((w) => (
                  <View
                    key={w.id}
                    style={{
                      width: workerColWidth,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      borderRightWidth: StyleSheet.hairlineWidth,
                      borderRightColor: colors.border,
                    }}
                  >
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#30D158' }} />
                    <Text style={{ color: colors.textPrimary, fontSize: 12, fontFamily: 'Inter_600SemiBold' }} numberOfLines={1}>
                      {w.name.split(' ')[0]}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Grid content */}
              <View style={{ width: workerColWidth * activeWorkers.length, height: totalH, position: 'relative' }}>
                {/* Horizontal grid lines across all columns */}
                {rows.map((h) => (
                  <View
                    key={h}
                    style={[
                      styles.gridLine,
                      { top: (h - startHour) * HOUR_HEIGHT, borderColor: colors.border, width: '100%' },
                    ]}
                  />
                ))}

                {/* Side by side worker columns */}
                <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
                  {activeWorkers.map((w) => {
                    const wAppts = appointments.filter((a) => a.worker_id === w.id || a.worker === w.name);
                    return (
                      <View
                        key={w.id}
                        style={{
                          width: workerColWidth,
                          height: totalH,
                          borderRightWidth: StyleSheet.hairlineWidth,
                          borderRightColor: colors.border,
                        }}
                      >
                        {rows.map((h) => {
                          const isWorking = isHourWorking(day, h, businessSchedule);
                          return (
                            <Pressable
                              key={h}
                              style={[
                                styles.slotCell,
                                { height: HOUR_HEIGHT },
                                !isWorking && { backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.4)' : 'rgba(243, 244, 246, 0.65)' }
                              ]}
                              onLongPress={isWorking ? () => onSlotPress(day, h, w.id) : undefined}
                              onPress={!isWorking ? () => showToast({ type: 'error', message: 'Horario de descanso / Cerrado' }) : undefined}
                            >
                              {!isWorking && (
                                <View style={styles.closedSlotOverlay}>
                                  <Feather name="lock" size={12} color={colors.textSecondary} opacity={0.6} style={{ marginRight: 4 }} />
                                  <Text style={[styles.closedText, { color: colors.textSecondary }]}>Cerrado</Text>
                                </View>
                              )}
                            </Pressable>
                          );
                        })}
                        {wAppts.map((a) => (
                          <EventBlock
                            key={a.id}
                            appointment={a}
                            colWidth={workerColWidth}
                            colors={colors}
                            onPress={() => onEventPress(a)}
                            startHour={startHour}
                          />
                        ))}
                      </View>
                    );
                  })}
                </View>

                {/* Now Line */}
                <NowLine colors={colors} startHour={startHour} />
              </View>
            </View>
          </ScrollView>
        ) : (
          /* Standard single-worker Day view */
          <View
            style={{ flex: 1, height: totalH, position: 'relative' }}
          >
            {rows.map((h) => {
              const isWorking = isHourWorking(day, h, businessSchedule);
              return (
                <Pressable
                  key={h}
                  style={[
                    styles.gridLine,
                    styles.slotCell,
                    {
                      top: (h - startHour) * HOUR_HEIGHT,
                      borderColor: colors.border,
                      height: HOUR_HEIGHT,
                      backgroundColor: !isWorking ? (isDarkMode ? 'rgba(31, 41, 55, 0.4)' : 'rgba(243, 244, 246, 0.65)') : undefined
                    }
                  ]}
                  onLongPress={isWorking ? () => onSlotPress(day, h, selectedWorkerId ?? undefined) : undefined}
                  onPress={!isWorking ? () => showToast({ type: 'error', message: 'Horario de descanso / Cerrado' }) : undefined}
                >
                  {!isWorking && (
                    <View style={styles.closedSlotOverlay}>
                      <Feather name="lock" size={12} color={colors.textSecondary} opacity={0.6} style={{ marginRight: 4 }} />
                      <Text style={[styles.closedText, { color: colors.textSecondary }]}>Cerrado</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
            {appointments.map((a) => (
              <EventBlock
                key={a.id}
                appointment={a}
                colWidth={gridWidth}
                colors={colors}
                onPress={() => onEventPress(a)}
                startHour={startHour}
              />
            ))}
            <NowLine colors={colors} startHour={startHour} />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─────────────────────────── FAB ───────────────────────────────────

function FAB({
  onNewAppointment,
  colors,
}: {
  onNewAppointment: () => void;
  colors: any;
}) {
  return (
    <View style={styles.fabContainer}>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={onNewAppointment}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={26} color={colors.primaryText} />
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────── Main CalendarScreen ──────────────────────────────

export default function CalendarScreen() {
  const { profile, business } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { selectedBusiness } = useBusiness();
  const { businessId: paramBusinessId } = useLocalSearchParams<{ businessId?: string }>();
  const role = profile?.role ?? 'client';
  const businessId = paramBusinessId || (role === 'client' ? selectedBusiness?.id : business?.id);

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [anchor, setAnchor] = useState(new Date());
  const [clientTab, setClientTab] = useState<'calendar' | 'list'>('calendar');
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { showToast } = useToast();
  const modalRef = useRef<AppointmentModalHandle>(null);

  const [businessSchedule, setBusinessSchedule] = useState<any>(null);
  const [calendarStartHour, setCalendarStartHour] = useState<number>(DEFAULT_START_HOUR);
  const [calendarEndHour, setCalendarEndHour] = useState<number>(DEFAULT_END_HOUR);

  useEffect(() => {
    if (!businessId) return;
    supabase
      .from('businesses')
      .select('schedule, opening_time, closing_time')
      .eq('id', businessId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setBusinessSchedule(data.schedule);
          if (data.opening_time) {
            const startHour = parseInt(data.opening_time.split(':')[0], 10);
            setCalendarStartHour(Math.max(0, startHour));
          }
          if (data.closing_time) {
            const endHour = parseInt(data.closing_time.split(':')[0], 10);
            setCalendarEndHour(Math.min(23, endHour));
          }
        }
      });
  }, [businessId]);

  // Compute date range for the hook
  const dateRange = useMemo(() => {
    if (viewMode === 'month') {
      const year = anchor.getFullYear();
      const month = anchor.getMonth();
      return getMonthDays(year, month);
    }
    if (viewMode === 'week') {
      return getWeekDays(anchor);
    }
    return [anchor];
  }, [viewMode, anchor]);

  const { workers } = useWorkers(businessId);

  // For worker role, find their workers-table row ID (not profile.id)
  const selfWorkerId = useMemo(
    () => workers.find((w) => w.user_id === profile?.id)?.id,
    [workers, profile?.id],
  );

  // Worker self-identification for display in the self bar
  const selfWorker = useMemo(
    () => workers.find((w) => w.user_id === profile?.id) ?? workers[0] ?? null,
    [workers, profile?.id],
  );

  const workerId = role === 'worker'
    ? selfWorkerId
    : (selectedWorker ?? undefined);

  const { appointments, loading, refetch } = useAgendaAppointments(
    businessId,
    dateRange,
    workerId,
  );

  const periodLabel = useMemo(() => {
    if (viewMode === 'month') {
      return `${MONTHS_ES[anchor.getMonth()]} ${anchor.getFullYear()}`;
    }
    if (viewMode === 'week') {
      const days = getWeekDays(anchor);
      const first = days[0];
      const last = days[6];
      if (first.getMonth() === last.getMonth()) {
        return `${first.getDate()} – ${last.getDate()} ${MONTHS_ES[first.getMonth()]}`;
      }
      return `${first.getDate()} ${MONTHS_ES[first.getMonth()].slice(0, 3)} – ${last.getDate()} ${MONTHS_ES[last.getMonth()].slice(0, 3)}`;
    }
    return `${anchor.getDate()} de ${MONTHS_ES[anchor.getMonth()]}`;
  }, [viewMode, anchor]);

  const navigate = (dir: -1 | 1) => {
    setAnchor((prev) => {
      const next = new Date(prev);
      if (viewMode === 'month') next.setMonth(next.getMonth() + dir);
      else if (viewMode === 'week') next.setDate(next.getDate() + 7 * dir);
      else next.setDate(next.getDate() + dir);
      return next;
    });
  };

  const openCreate = useCallback((date: Date, hour?: number, workerId?: string) => {
    if (role === 'admin') return;
    modalRef.current?.open({ mode: 'create', date: toLocalISO(date), startHour: hour, workerId });
  }, [role]);

  const openDetail = useCallback((a: Appointment) => {
    modalRef.current?.open({ mode: 'detail', appointment: a });
  }, []);

  const handleFABNew = () => openCreate(new Date());

  const weekDays = useMemo(() => getWeekDays(anchor), [anchor]);

  // Day-view appointments filtered
  const dayAppts = useMemo(() => {
    const iso = toLocalISO(anchor);
    return appointments.filter((a) => a.date === iso);
  }, [appointments, anchor]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundPrimary }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          {router.canGoBack() || role === 'admin' ? (
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setSidebarOpen(true)} style={styles.backBtn}>
              <Feather name="menu" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={styles.headerCenter}>
            <TouchableOpacity onPress={() => navigate(-1)}>
              <Feather name="chevron-left" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.periodLabel, { color: colors.textPrimary }]}>{periodLabel}</Text>
            <TouchableOpacity onPress={() => navigate(1)}>
              <Feather name="chevron-right" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleBtn} activeOpacity={0.7}>
              <Feather name={isDarkMode ? "sun" : "moon"} size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* View mode tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
          {(['month', 'week', 'day'] as ViewMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.tab,
                viewMode === m && { backgroundColor: colors.accentDim },
              ]}
              onPress={() => setViewMode(m)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: viewMode === m ? colors.accent : colors.textSecondary },
                ]}
              >
                {m === 'month' ? 'Mes' : m === 'week' ? 'Semana' : 'Día'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Client Tabs ── */}
      {role === 'client' && (
        <View style={[styles.clientTabs, { borderBottomColor: colors.border }]}>
          {(['calendar', 'list'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.clientTab,
                clientTab === t && { borderBottomColor: colors.accent, borderBottomWidth: 2 },
              ]}
              onPress={() => {
                if (t === 'list') {
                  router.push('/my-appointments');
                } else {
                  setClientTab(t);
                }
              }}
            >
              <Text
                style={[
                  styles.clientTabText,
                  { color: clientTab === t ? colors.accent : colors.textSecondary },
                ]}
              >
                {t === 'calendar' ? 'Calendario' : 'Mis Citas'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Workers Bar ── */}
      {((role === 'company') || (role === 'client' && clientTab === 'calendar')) && (
        <WorkersBar
          workers={workers}
          selectedWorkerId={selectedWorker}
          onSelectWorker={setSelectedWorker}
        />
      )}
      {role === 'worker' && selfWorker && (
        <View style={[styles.selfBar, { borderBottomColor: colors.border }]}>
          <View style={[styles.selfDot, { backgroundColor: '#30D158' }]} />
          <Text style={[styles.selfName, { color: colors.textPrimary }]}>{selfWorker.name}</Text>
        </View>
      )}

      {/* ── Calendar Views ── */}
      {(role !== 'client' || clientTab === 'calendar') && (
        <>
          {viewMode === 'month' && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={refetch}
                  tintColor={colors.accent}
                  colors={[colors.accent]}
                />
              }
            >
              <MonthGrid
                year={anchor.getFullYear()}
                month={anchor.getMonth()}
                appointments={appointments}
                colors={colors}
                onDayPress={(d) => openCreate(d)}
                onEventPress={openDetail}
              />
            </ScrollView>
          )}
          {viewMode === 'week' && (
            <WeekGrid
              weekDays={weekDays}
              appointments={appointments}
              colors={colors}
              onSlotPress={(d, h, wId) => openCreate(d, h, wId)}
              onEventPress={openDetail}
              refreshing={loading}
              onRefresh={refetch}
              workers={workers}
              selectedWorkerId={role === 'worker' ? (selfWorkerId ?? 'worker_self') : selectedWorker}
              businessSchedule={businessSchedule}
              startHour={calendarStartHour}
              endHour={calendarEndHour}
            />
          )}
          {viewMode === 'day' && (
            <DayGrid
              day={anchor}
              appointments={dayAppts}
              colors={colors}
              onSlotPress={(d, h, wId) => openCreate(d, h, wId)}
              onEventPress={openDetail}
              refreshing={loading}
              onRefresh={refetch}
              workers={workers}
              selectedWorkerId={role === 'worker' ? (selfWorkerId ?? 'worker_self') : selectedWorker}
              businessSchedule={businessSchedule}
              startHour={calendarStartHour}
              endHour={calendarEndHour}
            />
          )}
        </>
      )}

      {/* ── Client: List tab ── */}
      {role === 'client' && clientTab === 'list' && (
        <MyAppointmentsList appointments={appointments} colors={colors} />
      )}

      {/* ── FAB ── */}
      {role !== 'admin' && (
        <FAB
          onNewAppointment={handleFABNew}
          colors={colors}
        />
      )}

      {/* ── Appointment Modal ── */}
      <AppointmentModal
        ref={modalRef}
        workers={workers}
        businessId={businessId ?? ''}
        onSaved={refetch}
        showToast={showToast}
        onDateChange={(dateStr) => {
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            setAnchor(new Date(y, m, d));
          }
        }}
      />

      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  periodLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    minWidth: 160,
    textAlign: 'center',
  },
  themeToggleBtn: {
    padding: 6,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayBtn: {
    padding: 4,
  },
  todayText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Varien',
  },
  selfBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selfDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  selfName: {
    fontSize: 13,
    fontFamily: 'Varien',
  },
  clientTabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  clientTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clientTabText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  // Month
  monthContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  monthHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  monthHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
    paddingVertical: 8,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthCell: {
    width: `${100 / 7}%`,
    minHeight: 72,
    paddingBottom: 4,
    paddingHorizontal: 2,
  },
  monthDayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    alignSelf: 'center',
  },
  monthDayNum: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  monthEventPills: {
    gap: 2,
  },
  monthPill: {
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  monthPillText: {
    fontSize: 9,
    color: '#fff',
    fontFamily: 'Varien',
  },
  monthMore: {
    fontSize: 9,
    paddingLeft: 2,
  },
  // Week/Day
  weekBody: {
    flexDirection: 'row',
  },
  weekDayName: {
    fontSize: 11,
    fontFamily: 'Varien',
  },
  weekDayCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDayNum: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  timeCol: {
    flexShrink: 0,
  },
  timeCell: {
    justifyContent: 'flex-start',
    paddingTop: 4,
    paddingRight: 4,
  },
  timeLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    textAlign: 'right',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  slotCell: {
    width: '100%',
  },
  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -4,
  },
  nowRule: {
    flex: 1,
    height: 2,
  },
  eventBlock: {
    position: 'absolute',
    borderLeftWidth: 3,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  eventTitle: {
    fontSize: 11,
    fontFamily: 'Varien',
  },
  eventSub: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    right: 20,
    alignItems: 'flex-end',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  fabOptions: {
    marginBottom: 12,
    gap: 10,
    alignItems: 'flex-end',
  },
  fabOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fabOptionLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  fabOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Client list
  listCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  listAccent: {
    width: 4,
  },
  listService: {
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  listMeta: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  closedSlotOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    opacity: 0.8,
  },
  closedText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
  },
});

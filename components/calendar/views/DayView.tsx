import React, { useMemo } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { HOUR_HEIGHT } from '../../../constants/appointments';
import { isToday, nowLinePosition, toLocalISOString } from '../../calendar/modals/agendaHelpers';
import WorkerAvatar from '../../WorkerAvatar';
import { NowLine } from '../grid/NowLine';
import { TimeGrid, LABEL_WIDTH } from '../grid/TimeGrid';
import { WorkerColumn } from '../grid/WorkerColumn';
import { Appointment, CalendarPermissions, GhostSlot, PressedSlotData, WorkerRow } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface DayViewProps {
  date: Date;
  workers: WorkerRow[];
  appointments: Appointment[];
  hoursGrid: number[];
  startHour: number;
  endHour: number;
  ghostSlot: GhostSlot | null;
  pressedSlotRef: React.MutableRefObject<PressedSlotData | null>;
  business: any;
  permissions: CalendarPermissions;
  selectedWorkerFilter: string | null;
  isDarkMode: boolean;
  colors: { border: string; textSecondary: string; textPrimary: string; primary: string };
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onGhostSlotChange: (g: GhostSlot | null) => void;
  onSlotPress: (data: PressedSlotData) => void;
  onAppointmentPress: (appt: Appointment) => void;
  onWorkerHeaderPress?: (worker: WorkerRow) => void;
  onDrop?: (apptId: string, newHour: number, workerId: string, date: string) => void;
}

export function DayView({
  date, workers, appointments, hoursGrid, startHour, endHour,
  ghostSlot, pressedSlotRef, business, permissions,
  selectedWorkerFilter, isDarkMode, colors, refreshing, onRefresh,
  onGhostSlotChange, onSlotPress, onAppointmentPress, onWorkerHeaderPress, onDrop,
}: DayViewProps) {
  const dateStr = toLocalISOString(date);
  const displayWorkers = selectedWorkerFilter
    ? workers.filter(w => w.id === selectedWorkerFilter)
    : workers;

  const totalHeight = (endHour - startHour) * HOUR_HEIGHT;

  const colWidth = useMemo(() => {
    // Si hay un solo trabajador, agregamos un margen derecho igual al de las horas (LABEL_WIDTH)
    // para que la columna quede perfectamente centrada en la pantalla.
    const rightMargin = displayWorkers.length === 1 ? LABEL_WIDTH : 0;
    const available = SCREEN_WIDTH - LABEL_WIDTH - rightMargin;
    return Math.floor(available / Math.max(displayWorkers.length, 1));
  }, [displayWorkers.length]);

  const totalGridWidth = colWidth * displayWorkers.length;
  const nowPos = nowLinePosition(startHour, endHour);
  const needsHScroll = displayWorkers.length > 3;

  const workerAppts = (workerId: string) =>
    appointments.filter(
      a => a.worker_id === workerId && a.date === dateStr && a.status !== 'completed' && a.status !== 'no-show'
    );

  // Each worker gets a sized wrapper so WorkerColumn (position:absolute) has a containing block
  const columns = (
    <View style={{ flexDirection: 'row', width: totalGridWidth, height: totalHeight }}>
      {displayWorkers.map((worker, wi) => (
        <View key={worker.id} style={{ width: colWidth, height: totalHeight, position: 'relative' }}>
          <WorkerColumn
            worker={worker}
            date={date}
            appointments={workerAppts(worker.id)}
            ghostSlot={ghostSlot}
            pressedSlotRef={pressedSlotRef}
            business={business}
            startHour={startHour}
            endHour={endHour}
            width={colWidth}
            isDarkMode={isDarkMode}
            colors={colors}
            canCreate={permissions.canCreate}
            canDrag={permissions.canManageStatus}
            isFirst={wi === 0}
            colKey={worker.id}
            onGhostSlotChange={onGhostSlotChange}
            onSlotPress={onSlotPress}
            onAppointmentPress={onAppointmentPress}
            onDrop={onDrop}
          />
        </View>
      ))}
      {nowPos !== null && (
        <View
          style={{ position: 'absolute', left: 0, right: 0, top: nowPos, width: totalGridWidth }}
          pointerEvents="none"
        >
          <NowLine top={0} />
        </View>
      )}
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
    >
      {/* Worker header always outside TimeGrid — column widths match */}
      <WorkerHeaderRow
        workers={displayWorkers}
        colWidth={colWidth}
        isDarkMode={isDarkMode}
        colors={colors}
        onPress={onWorkerHeaderPress}
        showStats={needsHScroll}
        appointments={appointments}
        dateStr={dateStr}
        canShowProfile={permissions.showWorkerProfileModal}
      />

      {/* Wrap TimeGrid to add symmetrical right padding if only 1 worker */}
      <View style={{ flex: 1, paddingRight: displayWorkers.length === 1 ? LABEL_WIDTH : 0 }}>
        <TimeGrid hoursGrid={hoursGrid} isDarkMode={isDarkMode}>
          {needsHScroll ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ height: totalHeight }}
            >
              {columns}
            </ScrollView>
          ) : (
            columns
          )}
        </TimeGrid>
      </View>
    </ScrollView>
  );
}

// ─── Worker Header Row ─────────────────────────────────────────────────────────

interface WorkerHeaderRowProps {
  workers: WorkerRow[];
  colWidth: number;
  isDarkMode: boolean;
  colors: { textPrimary: string; textSecondary: string; border: string };
  onPress?: (w: WorkerRow) => void;
  showStats: boolean;
  appointments: Appointment[];
  dateStr: string;
  canShowProfile: boolean;
}

function WorkerHeaderRow({ workers, colWidth, isDarkMode, colors, onPress, showStats, appointments, dateStr, canShowProfile }: WorkerHeaderRowProps) {
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const colSep = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const rightPadding = workers.length === 1 ? LABEL_WIDTH : 0;

  return (
    <View style={[styles.workerHeaderRow, { borderBottomColor: borderColor, paddingLeft: LABEL_WIDTH, paddingRight: rightPadding }]}>
      {workers.map((w, wi) => {
        const count = showStats
          ? appointments.filter(a => a.worker_id === w.id && a.date === dateStr).length
          : 0;
        return (
          <View
            key={w.id}
            style={{
              width: colWidth,
              alignItems: 'center',
              gap: 4,
              borderLeftWidth: wi > 0 ? StyleSheet.hairlineWidth : 0,
              borderLeftColor: colSep,
            }}
          >
            <WorkerAvatar
              avatarUrl={w.avatar_url}
              name={w.name}
              color={w.color}
              size={36}
              showDot={false}
            />
            <Text
              style={[styles.workerName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {w.name}
            </Text>
            {w.specialty ? (
              <Text
                style={[styles.workerSpecialty, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {w.specialty}
              </Text>
            ) : null}
            {showStats && count > 0 && (
              <Text style={[styles.apptCount, { color: colors.textSecondary }]}>
                {count} {count === 1 ? 'cita' : 'citas'}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  workerHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  workerName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  workerSpecialty: {
    fontSize: 10,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  apptCount: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
});

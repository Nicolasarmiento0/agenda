import { Feather } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { HOUR_HEIGHT } from '../../../constants/appointments';
import { toLocalISOString } from '../../agenda/agendaHelpers';
import { getUnavailableBlocks } from '../../../app/utils/helpers';
import { EventCard } from '../events/EventCard';
import { GhostEvent } from '../events/GhostEvent';
import { calendarTokens } from '../calendarTokens';
import { Appointment, GhostSlot, PressedSlotData, WorkerRow } from '../types';

interface WorkerColumnProps {
  worker: WorkerRow;
  date: Date;
  appointments: Appointment[];
  ghostSlot: GhostSlot | null;
  pressedSlotRef: React.MutableRefObject<PressedSlotData | null>;
  business: any;
  startHour: number;
  endHour: number;
  width: number;
  isDarkMode: boolean;
  colors: { border: string; textSecondary: string };
  /** Si false, el tap en slot vacío no abre el formulario */
  canCreate: boolean;
  /** Si true, long-press en EventCard activa drag-to-reschedule */
  canDrag?: boolean;
  isFirst: boolean;
  colKey: string;
  onGhostSlotChange: (g: GhostSlot | null) => void;
  onSlotPress: (data: PressedSlotData) => void;
  onAppointmentPress: (appt: Appointment) => void;
  onDrop?: (apptId: string, newHour: number, workerId: string, date: string) => void;
}

export function WorkerColumn({
  worker, date, appointments, ghostSlot, pressedSlotRef,
  business, startHour, endHour, width, isDarkMode, colors,
  canCreate, canDrag, isFirst, colKey,
  onGhostSlotChange, onSlotPress, onAppointmentPress, onDrop,
}: WorkerColumnProps) {
  const unavailableBlocks = getUnavailableBlocks(date, business, worker, startHour, endHour);
  const totalHeight = (endHour - startHour) * HOUR_HEIGHT;
  const ghostTop = ghostSlot?.colKey === colKey ? ghostSlot.top : null;

  const sepColor = isDarkMode ? calendarTokens.colSeparatorDark : calendarTokens.colSeparatorLight;

  const handlePressIn = (e: any) => {
    if (!canCreate) return;
    const snapped = Math.floor((startHour + e.nativeEvent.locationY / HOUR_HEIGHT) * 2) / 2;
    pressedSlotRef.current = { hour: snapped, workerId: worker.id, workerName: worker.name, workerColor: worker.color, date };
    onGhostSlotChange({ colKey, top: (snapped - startHour) * HOUR_HEIGHT, hour: snapped });
  };

  const handlePressOut = () => {
    setTimeout(() => onGhostSlotChange(null), 250);
  };

  const handlePress = () => {
    const slot = pressedSlotRef.current;
    if (!slot || slot.workerId !== worker.id) return;
    pressedSlotRef.current = null;
    onGhostSlotChange(null);
    onSlotPress(slot);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={{
        position: 'absolute',
        width,
        height: totalHeight,
        borderLeftWidth: isFirst ? 0 : 0.5,
        borderLeftColor: sepColor,
      }}
    >
      {/* Unavailable blocks */}
      {unavailableBlocks.map((block, i) => {
        const isClosed = block.title === 'No disponible';
        return (
          <View
            key={`unav-${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: (block.start - startHour) * HOUR_HEIGHT,
              height: block.duration * HOUR_HEIGHT,
              width: width - 8,
              left: 4,
              backgroundColor: isDarkMode ? calendarTokens.unavailBgDark : calendarTokens.unavailBgLight,
              borderWidth: 1,
              borderColor: isDarkMode ? calendarTokens.unavailBorderDark : calendarTokens.unavailBorderLight,
              borderStyle: 'dashed',
              borderRadius: calendarTokens.unavailRadius,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1,
              overflow: 'hidden',
            }}
          >
            {block.duration >= 1 ? (
              <View style={{ alignItems: 'center', gap: 6, opacity: 0.6 }}>
                <Feather name={isClosed ? 'lock' : 'coffee'} size={16} color={colors.textSecondary} />
                <Text style={{ fontSize: 9, color: colors.textSecondary, fontWeight: '700', letterSpacing: 1 }}>
                  {isClosed ? 'CERRADO' : block.title.toUpperCase()}
                </Text>
              </View>
            ) : (
              <Feather name={isClosed ? 'lock' : 'coffee'} size={13} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            )}
          </View>
        );
      })}

      {/* Ghost slot */}
      {ghostTop !== null && canCreate && (
        <GhostEvent
          top={ghostTop}
          width={width}
          hour={ghostSlot!.hour}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Event cards */}
      {appointments.map(appt => (
        <EventCard
          key={appt.id}
          appt={appt}
          columnWidth={width}
          startHour={startHour}
          endHour={endHour}
          isDarkMode={isDarkMode}
          canDrag={canDrag}
          onPress={onAppointmentPress}
          onDrop={onDrop}
        />
      ))}
    </Pressable>
  );
}

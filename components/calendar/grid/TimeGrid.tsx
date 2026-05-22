import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HOUR_HEIGHT } from '../../../constants/appointments';
import { formatHour } from '../../calendar/modals/agendaHelpers';
import { calendarTokens } from '../calendarTokens';

export const LABEL_WIDTH = 46;

interface TimeGridProps {
  hoursGrid: number[];
  isDarkMode: boolean;
  children?: React.ReactNode;
}

/**
 * Columna de horas + líneas horizontales. Los hijos (columnas de workers)
 * se renderizan junto a la columna de etiquetas.
 */
export function TimeGrid({ hoursGrid, isDarkMode, children }: TimeGridProps) {
  const lineColor = isDarkMode
    ? calendarTokens.gridLineColorDark
    : calendarTokens.gridLineColorLight;
  const halfLineColor = isDarkMode
    ? calendarTokens.gridHalfLineColorDark
    : calendarTokens.gridHalfLineColorLight;
  const labelColor = isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';

  const totalHeight = hoursGrid.length * HOUR_HEIGHT;

  return (
    <View style={styles.container}>
      {/* Columna de etiquetas horarias */}
      <View style={[styles.labelCol, { width: LABEL_WIDTH }]}>
        {hoursGrid.map(h => (
          <View key={h} style={{ height: HOUR_HEIGHT, justifyContent: 'flex-start' }}>
            <Text
              style={[styles.label, { color: labelColor }]}
              accessibilityElementsHidden
            >
              {formatHour(h)}
            </Text>
          </View>
        ))}
      </View>

      {/* Área de contenido: líneas + columnas de workers */}
      <View style={{ flex: 1, position: 'relative' }}>
        {/* Líneas horizontales (hora y media hora) */}
        <View style={[StyleSheet.absoluteFillObject, { height: totalHeight }]} pointerEvents="none">
          {hoursGrid.map(h => (
            <React.Fragment key={h}>
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: (h - hoursGrid[0]) * HOUR_HEIGHT,
                  height: 1,
                  backgroundColor: lineColor,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: (h - hoursGrid[0]) * HOUR_HEIGHT + HOUR_HEIGHT / 2,
                  height: 1,
                  backgroundColor: halfLineColor,
                }}
              />
            </React.Fragment>
          ))}
        </View>

        {/* Columnas de workers */}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  labelCol: {
    alignItems: 'flex-end',
    paddingRight: 6,
  },
  label: {
    fontSize: calendarTokens.hourLabelSize,
    fontWeight: '400',
    marginTop: -7,
  },
});

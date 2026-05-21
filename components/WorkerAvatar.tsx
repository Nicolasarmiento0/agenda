import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

type WorkerAvatarProps = {
  avatarUrl?: string | null;
  name: string;
  color: string;
  size?: number;
  showDot?: boolean;
  borderWidth?: number;
};

export default function WorkerAvatar({
  avatarUrl,
  name,
  color,
  size = 42,
  showDot = false,
  borderWidth = 2,
}: WorkerAvatarProps) {
  const radius = size / 2;
  const initials = name.substring(0, 2).toUpperCase();
  const dotSize = Math.max(8, Math.round(size * 0.22));
  const dotOffset = Math.round(dotSize * 0.1);

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            borderWidth,
            borderColor: color,
          }}
        />
      ) : (
        <View
          style={[
            styles.initialsCircle,
            {
              width: size,
              height: size,
              borderRadius: radius,
              borderWidth,
              borderColor: color,
              backgroundColor: color + '25',
            },
          ]}
        >
          <Text
            style={[
              styles.initialsText,
              {
                color,
                fontSize: Math.round(size * 0.31),
              },
            ]}
          >
            {initials}
          </Text>
        </View>
      )}

      {showDot && (
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              bottom: dotOffset,
              right: dotOffset,
              borderWidth: Math.max(1, Math.round(dotSize * 0.2)),
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  initialsCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  dot: {
    position: 'absolute',
    backgroundColor: '#4CAF50',
    borderColor: '#0A0A0A',
  },
});

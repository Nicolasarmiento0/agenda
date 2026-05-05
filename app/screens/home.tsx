import { appStyles } from '@/styles/appStyles';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function HomeScreen() {
  const router = useRouter();
  const { isDarkMode, toggleTheme, colors } = useTheme();

  return (
    <View style={[appStyles.screenCentered, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={{ position: 'absolute', top: 60, right: 24, zIndex: 10 }}
        onPress={toggleTheme}
        activeOpacity={0.7}
      >
        <Feather name={isDarkMode ? 'moon' : 'sun'} size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      <Text style={[appStyles.title, { color: colors.textPrimary }]}>Agenda</Text>
      <Text style={[appStyles.subtitle, { color: colors.textSecondary }]}>Bienvenidos</Text>
      <Pressable style={appStyles.primaryButton} onPress={() => router.push('/screens/loginscreen')}>
        <Text style={appStyles.primaryButtonText}>Iniciar</Text>
      </Pressable>
    </View>
  );
}

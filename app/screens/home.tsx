import { appStyles } from '@/styles/appStyles';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={appStyles.screenCentered}>
      <Text style={appStyles.title}>Home</Text>
      <Text style={appStyles.subtitle}>Bienvenidos</Text>
      <Pressable style={appStyles.primaryButton} onPress={() => router.push('/screens/loginscreen')}>
        <Text style={appStyles.primaryButtonText}>Iniciar</Text>
      </Pressable>
    </View>
  );
}

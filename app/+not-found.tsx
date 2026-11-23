import { router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import Icon from '@/components/ui/Icon';
import { useAppTheme } from '../contexts/ThemeContext';
import { appStyles } from '@/utils/appStyles';
import { BUTTON } from '@/constants/Theme';

// Заглушка на випадок неіснуючого шляху (напр. застаріле посилання): повертає на головну
export default function NotFoundScreen() {
  const { colors, isDark } = useAppTheme();
  const surface = isDark ? colors.card : colors.cardAlt;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.iconCircle, { backgroundColor: surface }]}>
        <Icon name="search" size={32} color={colors.iconSecondary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Сторінку не знайдено</Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.buttonBg }]}
        onPress={() => router.replace('/')}
        accessibilityRole="button"
      >
        <Text style={[styles.buttonText, { color: colors.buttonText }]}>На головну</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = appStyles({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
    marginTop: 16,
    marginBottom: 24,
  },
  button: {
    minHeight: BUTTON.height,
    minWidth: 200,
    paddingHorizontal: 24,
    borderRadius: BUTTON.radius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
});

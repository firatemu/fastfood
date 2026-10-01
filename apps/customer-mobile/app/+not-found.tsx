import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { StackHeader } from '../components/stack-header';
import { EmptyBlock, MustardButton } from '../components/ui';
import { colors, space } from '../theme';

export default function NotFoundRoute() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StackHeader title="Sayfa yok" onBack={() => router.replace('/')} />
      <View style={{ padding: space.gutter, gap: 12 }}>
        <EmptyBlock title="Sayfa yok" message="Bu adres uygulamada yok. Menüye dönebilirsin." />
        <MustardButton label="Menüye dön" onPress={() => router.replace('/')} />
      </View>
    </View>
  );
}

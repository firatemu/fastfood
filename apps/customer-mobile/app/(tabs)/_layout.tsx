import { Tabs } from 'expo-router';

import { BurgerTabBar } from '../../components/tab-bar';
import { colors } from '../../theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BurgerTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Menü' }} />
      <Tabs.Screen name="search" options={{ title: 'Arama' }} />
      <Tabs.Screen name="builder" options={{ title: 'Özel Yarat' }} />
      <Tabs.Screen name="orders" options={{ title: 'Siparişler' }} />
      <Tabs.Screen name="account" options={{ title: 'Profil' }} />
    </Tabs>
  );
}

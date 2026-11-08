import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { C } from '../../ui/theme';
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabs = [
    { name: 'index', title: 'Today', icon: 'sunny-outline' },
    { name: 'learn', title: 'Learn', icon: 'trail-sign-outline' },
    { name: 'ranks', title: 'Ranks', icon: 'podium-outline' },
    { name: 'assess', title: 'Assess', icon: 'school-outline' },
    { name: 'you', title: 'You', icon: 'person-outline' },
  ] as const;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.purple,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: {
          height: 78 + insets.bottom,
          paddingTop: 9,
          paddingBottom: Math.max(12, insets.bottom),
          backgroundColor: C.bg,
          borderTopColor: C.line,
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 10, lineHeight: 14, fontWeight: '700', marginTop: 3 },
        tabBarLabelPosition: 'below-icon',
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  width: 46,
                  height: 32,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: focused ? C.lavender : 'transparent',
                }}
              >
                <Ionicons name={tab.icon} size={22} color={color} aria-hidden />
              </View>
            ),
          }}
        />
      ))}
      <Tabs.Screen name="review" options={{ href: null, title: 'Review' }} />
    </Tabs>
  );
}

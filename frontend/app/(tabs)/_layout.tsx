import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../components/theme';

export default function TabLayout() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const canAccessOrganizer = profile?.isAdmin === true || profile?.isExec === true;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.purple,
        tabBarInactiveTintColor: '#6b7280',
        headerStyle: {
          backgroundColor: '#25292e',
        },
        headerShadowVisible: false,
        headerTintColor: '#fff',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0.5,
          borderTopColor: '#e5e7eb',
          // Explicit height overrides the navigator's automatic safe-area
          // handling, so add the bottom inset back — the iPhone home indicator
          // on native, Safari's bottom chrome on mobile web. The base needs
          // room for a 24px icon plus the label under it.
          height: 80 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home-sharp' : 'home-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar-clear' : 'calendar-clear-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="events-info/[id]"
        options={{
          title: 'Event Info',
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="check-in"
        options={{
          title: 'Check In',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'scan' : 'scan-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="organizer"
        options={{
          href: canAccessOrganizer ? '/organizer' : null,
          title: 'Organizer',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}

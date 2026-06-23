import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Platform } from 'react-native';
import { Colors } from '../utils/colors';

import { HomeScreen } from '../screens/HomeScreen';
import { DiscoverScreen } from '../screens/DiscoverScreen';
import { CategoryScreen } from '../screens/CategoryScreen';
import { JournalScreen } from '../screens/JournalScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

export type HomeStackParamList = {
  HomeMain: undefined;
};

export type DiscoverStackParamList = {
  DiscoverMain: undefined;
  Category: { categoryId: string; categoryLabel: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  DiscoverTab: undefined;
  JournalTab: undefined;
  ProfileTab: undefined;
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const DiscoverStack = createNativeStackNavigator<DiscoverStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
    </HomeStack.Navigator>
  );
}

function DiscoverStackNav() {
  return (
    <DiscoverStack.Navigator screenOptions={{ headerShown: false }}>
      <DiscoverStack.Screen name="DiscoverMain" component={DiscoverScreen} />
      <DiscoverStack.Screen name="Category" component={CategoryScreen} />
    </DiscoverStack.Navigator>
  );
}

// ── Tab icons — minimal geometric ─────────────────────────────────────────────

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const color = focused ? '#FFFFFF' : 'rgba(255,255,255,0.35)';
  const size = focused ? 22 : 20;

  if (name === 'home') {
    return (
      <View style={{ width: 24, height: 22, alignItems: 'center', justifyContent: 'flex-end' }}>
        <View style={{
          width: 0, height: 0,
          borderLeftWidth: 11, borderRightWidth: 11, borderBottomWidth: 9,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderBottomColor: color, marginBottom: -1,
        }} />
        <View style={{ width: 12, height: 8, backgroundColor: color, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />
      </View>
    );
  }
  if (name === 'discover') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color }} />
        <View style={{ position: 'absolute', width: size * 0.35, height: size * 0.35, borderRadius: size * 0.175, backgroundColor: color }} />
      </View>
    );
  }
  if (name === 'journal') {
    return (
      <View style={{ width: 16, height: 20, borderRadius: 2, borderWidth: 2, borderColor: color, justifyContent: 'center', alignItems: 'center', gap: 3 }}>
        {[0, 1, 2].map(i => <View key={i} style={{ width: 8, height: 1.5, backgroundColor: color }} />)}
      </View>
    );
  }
  if (name === 'profile') {
    return (
      <View style={{ alignItems: 'center', gap: 2 }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: color }} />
        <View style={{ width: 18, height: 7, borderTopLeftRadius: 9, borderTopRightRadius: 9, borderWidth: 2, borderColor: color, borderBottomWidth: 0 }} />
      </View>
    );
  }
  return <Text style={{ color, fontSize: 18 }}>·</Text>;
}

const tabBarStyle: any = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: 'rgba(9,9,15,0.82)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderTopColor: 'rgba(255,255,255,0.06)',
  borderTopWidth: 1,
  height: Platform.OS === 'ios' ? 88 : 72,
  paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  paddingTop: 10,
  elevation: 0,
};

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
          marginTop: 2,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNav}
        options={{ title: 'Today', tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }}
      />
      <Tab.Screen
        name="DiscoverTab"
        component={DiscoverStackNav}
        options={{ title: 'Discover', tabBarIcon: ({ focused }) => <TabIcon name="discover" focused={focused} /> }}
      />
      <Tab.Screen
        name="JournalTab"
        component={JournalScreen}
        options={{ title: 'Journal', tabBarIcon: ({ focused }) => <TabIcon name="journal" focused={focused} /> }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

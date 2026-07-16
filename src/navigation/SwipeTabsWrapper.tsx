import React, { PropsWithChildren, useMemo, useRef } from 'react';
import { PanResponder, PanResponderGestureState, Platform, StyleSheet, View } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabsParamList } from './MainTabs';
import { MAIN_TAB_ORDER, navigateToTabHome, type MainTabName } from './tabNavigation';

const TAB_ORDER: readonly MainTabName[] = MAIN_TAB_ORDER;

const SWIPE_DISTANCE = 70;
const SWIPE_VELOCITY = 0.2;
const MAX_VERTICAL_DRIFT = 50;

function getTargetTab(currentTab: MainTabName | undefined, dx: number) {
  const currentIndex = Math.max(0, TAB_ORDER.indexOf(currentTab ?? 'Inicio'));

  if (dx < 0 && currentIndex < TAB_ORDER.length - 1) {
    return TAB_ORDER[currentIndex + 1];
  }

  if (dx > 0 && currentIndex > 0) {
    return TAB_ORDER[currentIndex - 1];
  }

  return null;
}

export function SwipeTabsWrapper({ children }: PropsWithChildren) {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabsParamList>>();
  const state = useNavigationState((s) => s);
  const isNavigatingRef = useRef(false);

  const currentTab = useMemo<MainTabName | undefined>(() => {
    const route = state?.routes?.[state.index ?? 0];
    if (!route?.name) return undefined;
    return route.name as MainTabName;
  }, [state]);

  const navigateToTab = (target: MainTabName | null) => {
    if (!target || isNavigatingRef.current || target === currentTab) return;
    isNavigatingRef.current = true;

    navigateToTabHome(navigation, target);

    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 220);
  };

  const shouldHandle = (_: unknown, gestureState: PanResponderGestureState) => {
    const absDx = Math.abs(gestureState.dx);
    const absDy = Math.abs(gestureState.dy);
    return absDx > 18 && absDx > absDy * 1.35;
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: shouldHandle,
        onMoveShouldSetPanResponderCapture: shouldHandle,
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: (_evt, gestureState) => {
          const absDx = Math.abs(gestureState.dx);
          const absDy = Math.abs(gestureState.dy);
          const absVx = Math.abs(gestureState.vx);

          if (absDy > MAX_VERTICAL_DRIFT) return;
          if (absDx < SWIPE_DISTANCE && absVx < SWIPE_VELOCITY) return;

          const target = getTargetTab(currentTab, gestureState.dx);
          navigateToTab(target);
        },
      }),
    [currentTab]
  );

  return (
    <View
      style={styles.container}
      {...(Platform.OS === 'web' ? {} : panResponder.panHandlers)}
    >
      <View
        style={styles.content}
        {...(Platform.OS === 'web' ? panResponder.panHandlers : {})}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default SwipeTabsWrapper;

import React, { useMemo, useRef } from "react";
import { Animated, PanResponder, Platform, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/theme/ThemeProvider";
import { MAIN_TAB_ORDER, navigateToTabHome, type MainTabName } from "@/navigation/tabNavigation";

type TabName = MainTabName;

const TAB_ORDER: readonly TabName[] = MAIN_TAB_ORDER;
const ACTIVATE_THRESHOLD = 24;
const NAVIGATE_THRESHOLD = 74;
const SCALE_DOWN = 0.985;

export function SwipeTabContainer({ currentTab, children }: { currentTab: TabName; children: React.ReactNode }) {
  const navigation = useNavigation<any>();
  const { palette: c } = useTheme();
  const lockedRef = useRef(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const resetVisualState = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 12,
      }),
    ]).start(() => {
      lockedRef.current = false;
    });
  };

  const animateAndNavigate = (targetTab: TabName) => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0.94,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: SCALE_DOWN,
        duration: 110,
        useNativeDriver: true,
      }),
    ]).start(() => {
      requestAnimationFrame(() => {
        navigateToTabHome(navigation, targetTab);
        opacity.setValue(1);
        scale.setValue(1);
        lockedRef.current = false;
      });
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gestureState) => {
          if (Platform.OS === "web") return false;
          const { dx, dy } = gestureState;
          return Math.abs(dx) > ACTIVATE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5;
        },
        onPanResponderGrant: () => {
          lockedRef.current = false;
        },
        onPanResponderMove: (_evt, gestureState) => {
          if (lockedRef.current) return;
          const progress = Math.min(Math.abs(gestureState.dx) / NAVIGATE_THRESHOLD, 1);
          opacity.setValue(1 - progress * 0.05);
          scale.setValue(1 - progress * 0.015);
        },
        onPanResponderRelease: (_evt, gestureState) => {
          if (lockedRef.current) return;
          lockedRef.current = true;

          const currentIndex = TAB_ORDER.indexOf(currentTab);
          if (currentIndex < 0) {
            resetVisualState();
            return;
          }

          let targetTab: TabName | null = null;

          if (gestureState.dx < -NAVIGATE_THRESHOLD) {
            targetTab = TAB_ORDER[currentIndex + 1] ?? null;
          } else if (gestureState.dx > NAVIGATE_THRESHOLD) {
            targetTab = TAB_ORDER[currentIndex - 1] ?? null;
          }

          if (!targetTab || targetTab === currentTab) {
            resetVisualState();
            return;
          }

          animateAndNavigate(targetTab);
        },
        onPanResponderTerminate: () => {
          resetVisualState();
        },
        onPanResponderTerminationRequest: () => true,
      }),
    [currentTab, navigation, opacity, scale]
  );

  return (
    <View style={{ flex: 1, overflow: "hidden", backgroundColor: c.bg }} {...panResponder.panHandlers}>
      <Animated.View style={{ flex: 1, opacity, transform: [{ scale }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

export default SwipeTabContainer;

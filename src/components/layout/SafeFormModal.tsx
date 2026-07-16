import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SafeFormModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  backgroundColor: string;
  style?: StyleProp<ViewStyle>;
};

export default function SafeFormModal({
  visible,
  onRequestClose,
  children,
  backgroundColor,
  style,
}: SafeFormModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onRequestClose}
      statusBarTranslucent={false}
      presentationStyle="fullScreen"
      hardwareAccelerated
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
        style={{ flex: 1, backgroundColor }}
      >
        <View
          style={[
            {
              flex: 1,
              backgroundColor,
              paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 14 : 0),
              paddingLeft: insets.left,
              paddingRight: insets.right,
            },
            style,
          ]}
        >
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

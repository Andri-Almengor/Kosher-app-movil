import React from 'react';
import { View, StyleSheet, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { getContentMaxWidth, getHorizontalPadding, getReadableWidth } from '@/lib/responsive';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  widthVariant?: 'full' | 'narrow' | 'regular' | 'wide';
};

export function ResponsiveContainer({ children, style, contentStyle, widthVariant = 'regular' }: Props) {
  const { width } = useWindowDimensions();
  const horizontalPadding = getHorizontalPadding(width);
  const maxWidth = widthVariant === 'full' ? getContentMaxWidth(width) : getReadableWidth(width, widthVariant === 'narrow' ? 'narrow' : widthVariant === 'wide' ? 'wide' : 'regular');

  return (
    <View style={[styles.outer, style]}>
      <View style={[styles.inner, { maxWidth, paddingHorizontal: horizontalPadding }, contentStyle]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    alignItems: 'center',
  },
  inner: {
    width: '100%',
  },
});

export default ResponsiveContainer;

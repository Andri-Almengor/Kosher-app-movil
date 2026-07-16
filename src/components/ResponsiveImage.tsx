import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { CachedImage } from '@/components/CachedImage';
import { useCachedUri } from '@/hooks/useCachedUri';

type Props = {
  uri: string;
  maxHeight?: number;
  borderRadius?: number;
};

export function ResponsiveImage({ uri, maxHeight = 600, borderRadius = 22 }: Props) {
  const [ratio, setRatio] = React.useState<number>(4 / 5);
  const resolvedUri = useCachedUri(uri);

  React.useEffect(() => {
    if (!resolvedUri) return;
    Image.getSize(
      resolvedUri,
      (w, h) => {
        if (w > 0 && h > 0) setRatio(w / h);
      },
      () => {}
    );
  }, [resolvedUri]);

  return (
    <View style={[styles.wrapper, { maxHeight, borderRadius }]}>
      <CachedImage uri={resolvedUri ?? uri} style={[styles.image, { aspectRatio: ratio, borderRadius }]} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: undefined,
  },
});

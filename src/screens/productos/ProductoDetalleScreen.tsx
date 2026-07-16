import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppHeader } from '@/components/AppHeader';
import { useI18n } from '@/i18n/I18nProvider';
import { localizeProduct } from '@/features/products/utils/localizeProduct';
import { useTheme } from '@/theme/ThemeProvider';
import type { Producto } from '@/types/producto';
import { CachedImage } from '@/components/CachedImage';
import { FullscreenImageModal } from '@/components/FullscreenImageModal';
import { useOfflineList } from '@/offline/useOfflineList';
import { AppFonts } from '@/theme/fonts';
import Ionicons from '@expo/vector-icons/Ionicons';

function getBadgeColor(value?: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'parve') return '#16a34a';
  if (normalized === 'dairy' || normalized === 'lácteo' || normalized === 'lacteo') return '#2563eb';
  if (normalized === 'bazar') return '#dc2626';
  return '#eab308';
}

export function ProductoDetalleScreen() {
  const { t, lang } = useI18n();
  const { palette: c } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const productoId = route.params?.productoId;
  const { items } = useOfflineList<Producto>('productos');

  const data = useMemo(() => {
    const id = String(productoId ?? '');
    return (items ?? []).find((p: any) => String(p?.id) === id) ?? null;
  }, [items, productoId]);

  const localized = useMemo(() => (data ? localizeProduct(data as any, lang) : null), [data, lang]);
  const chips = [localized?.atributo1, localized?.atributo2, localized?.atributo3].filter(Boolean) as string[];
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.heroWrap}>
          {data?.fotoProducto ? (
            <Pressable onPress={() => setImagePreviewVisible(true)} accessibilityRole="button" accessibilityLabel={lang === 'en' ? 'Open full product image' : 'Abrir imagen completa del producto'}>
              <CachedImage uri={data.fotoProducto} style={styles.heroImage} resizeMode="contain" />
              <View style={styles.expandHint}><Ionicons name="expand" size={18} color="#fff" /></View>
            </Pressable>
          ) : <View style={[styles.heroImage, { backgroundColor: c.border }]} />}
          <Pressable onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: c.card }]}>
            <Ionicons name="arrow-back" size={20} color={c.text} />
          </Pressable>
        </View>
        <View style={[styles.overlayCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.name, { color: c.text }]}>{localized?.nombre || t('untitled')}</Text>
          <Text style={[styles.type, { color: c.muted }]}>{localized?.categoria1 || t('na')}</Text>
          <View style={styles.badgesRow}>{chips.map((chip) => <View key={chip} style={[styles.chip, { backgroundColor: getBadgeColor(chip) }]}><Text style={styles.chipText}>{chip}</Text></View>)}</View>
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Section title={t('productInfo')}><Info label={t('labelCategory')} value={localized?.categoria1} /><Info label={t('certifiesLabel')} value={localized?.certifica} /><Info label={t('storeLabel')} value={localized?.tienda} /></Section>
          {(data?.fotoSello1 || data?.fotoSello2) ? <Section title={t('sealAndCertification')}><View style={{ flexDirection: 'row', gap: 10 }}>{data?.fotoSello1 ? <CachedImage uri={data.fotoSello1} style={styles.seal} resizeMode="contain" /> : null}{data?.fotoSello2 ? <CachedImage uri={data.fotoSello2} style={styles.seal} resizeMode="contain" /> : null}</View></Section> : null}
        </View>
      </ScrollView>
      <FullscreenImageModal
        visible={imagePreviewVisible}
        uri={data?.fotoProducto}
        title={localized?.nombre || t('untitled')}
        onClose={() => setImagePreviewVisible(false)}
      />
    </View>
  );

  function Section({ title, children }: any) {
    return <View style={{ marginTop: 18 }}><Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>{children}</View>;
  }
  function Info({ label, value }: any) {
    return <View style={styles.row}><Text style={[styles.label, { color: c.text }]}>{label}</Text><Text style={[styles.value, { color: c.muted }]}>{value || t('na')}</Text></View>;
  }
}

const styles = StyleSheet.create({
  heroWrap: { position: 'relative' },
  heroImage: { width: '100%', height: 220 },
  expandHint: { position: 'absolute', right: 16, bottom: 16, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
 backBtn: { position: "absolute", top: 16, left: 16, width: 56, height: 56, borderRadius: 999, alignItems: "center", justifyContent: "center", elevation: 5, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  overlayCard: { marginHorizontal: 16, marginTop: -28, borderWidth: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 14, elevation: 4 },
  name: { fontSize: 21, fontFamily: AppFonts.poppinsSemiBold, fontWeight: '800' },
  type: { marginTop: 2, fontSize: 17, fontFamily: AppFonts.poppinsRegular },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { backgroundColor: '#166534', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { color: '#fff', fontSize: 14, fontFamily: AppFonts.poppinsSemiBold, fontWeight: '800' },
  sectionTitle: { fontSize: 17, fontFamily: AppFonts.poppinsSemiBold, fontWeight: '800', marginBottom: 8 },
  row: { marginBottom: 10 },
  label: { fontSize: 15, fontFamily: AppFonts.poppinsSemiBold, fontWeight: '800' },
  value: { fontSize: 16, fontFamily: AppFonts.poppinsRegular, marginTop: 2 },
  seal: { width: 112, height: 66, backgroundColor: 'transparent', borderRadius: 12 },
});

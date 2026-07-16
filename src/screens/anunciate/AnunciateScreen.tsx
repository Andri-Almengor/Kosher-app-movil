import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '@/components/AppHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { AppFonts } from '@/theme/fonts';
import { SearchBar } from '@/components/SearchBar';
import { DateFilterModal } from '@/components/DateFilterModal';
import { TranslatedText } from '@/components/TranslatedText';
import { ResponsiveImage } from '@/components/ResponsiveImage';
import { useOfflineList } from '@/offline/useOfflineList';

type Noticia = {
  id: number;
  titulo?: string | null;
  contenido?: string | null;
  imageUrl?: string | null;
  fileUrl?: string | null;
  destino?: 'NOVEDADES' | 'ANUNCIANTES';
  creadoEn?: string;
};

export function AnunciateScreen() {
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const { palette: c } = useTheme();
  const [q, setQ] = useState('');
  const [filterDate, setFilterDate] = useState<Date | null>(new Date());
  const [filterOpen, setFilterOpen] = useState(false);
  const { items, loading: isLoading, error, refresh, refreshing: isFetching } = useOfflineList<Noticia>('noticias');
  const { items: restaurantItems = [] } = useOfflineList<any>('restaurantes');

  const visibleRestaurantIds = useMemo(() => {
    return new Set((restaurantItems ?? []).filter((item: any) => item?.activo !== false).map((item: any) => Number(item?.id)).filter((id) => Number.isFinite(id)));
  }, [restaurantItems]);

  const visibleAdItems = useMemo(() => {
    return [...(items ?? [])].filter((x: any) => {
      if (x?.destino !== 'ANUNCIANTES') return false;
      if (x?.activo === false) return false;
      const rawRestaurantId = x?.restauranteId ?? x?.restaurante?.id;
      if (rawRestaurantId == null) return true;
      const parsedRestaurantId = Number(rawRestaurantId);
      if (!Number.isFinite(parsedRestaurantId)) return true;
      return visibleRestaurantIds.has(parsedRestaurantId);
    }).sort((a, b) => new Date((b as any)?.actualizadoEn || b?.creadoEn || 0).getTime() - new Date((a as any)?.actualizadoEn || a?.creadoEn || 0).getTime());
  }, [items, visibleRestaurantIds]);

  const adItems = visibleAdItems;

  const availableDates = useMemo(() => {
    const seen = new Set<string>();
    const out: Date[] = [];
    for (const item of adItems) {
      if (!item?.creadoEn) continue;
      const d = new Date(item.creadoEn);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    }
    return out.sort((a, b) => b.getTime() - a.getTime());
  }, [adItems]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const sameDay = (iso?: string) => {
      if (!filterDate || !iso) return true;
      const d = new Date(iso);
      return d.getFullYear() === filterDate.getFullYear() && d.getMonth() === filterDate.getMonth() && d.getDate() === filterDate.getDate();
    };
    return adItems
      .filter((n) => sameDay(n.creadoEn))
      .filter((n) => {
        if (!s) return true;
        const hay = `${n.titulo ?? ''} ${n.contenido ?? ''}`.toLowerCase();
        return hay.includes(s);
      });
  }, [adItems, q, filterDate]);

  const dateLabel = useMemo(() => (filterDate ? filterDate.toLocaleDateString() : null), [filterDate]);
  const isTodaySelected = useMemo(() => {
    if (!filterDate) return false;
    const now = new Date();
    return filterDate.getFullYear() === now.getFullYear() && filterDate.getMonth() === now.getMonth() && filterDate.getDate() === now.getDate();
  }, [filterDate]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader />
      <View style={[styles.searchWrap, { backgroundColor: c.primary }]}> 
        <SearchBar value={q} onChangeText={setQ} onPressFilter={() => setFilterOpen(true)} placeholder={t('searchPlaceholder')} variant="onPrimary" />
      </View>
      <Text style={[styles.pageTitle, { color: c.primary }]}>{t('advertiseHere')}</Text>

      <DateFilterModal
        visible={filterOpen}
        initialDate={filterDate ?? availableDates[0] ?? new Date()}
        onClose={() => setFilterOpen(false)}
        onClear={() => { setFilterDate(null); setFilterOpen(false); }}
        onApply={(d) => { setFilterDate(d); setFilterOpen(false); }}
      />

      {dateLabel ? (
        <View style={styles.dayFilterBar}>
          <Pressable style={[styles.dayChip, { borderColor: c.border, opacity: availableDates[1] ? 1 : 0.5 }]} disabled={!availableDates[1]} onPress={() => availableDates[1] && setFilterDate(availableDates[1])}>
            <Text style={[styles.dayChipText, { color: c.text }]}>{t('yesterday')}</Text>
          </Pressable>
          <Text style={[styles.dayLabel, { color: c.muted }]}>{dateLabel}</Text>
          <Pressable style={[styles.dayChip, { borderColor: c.border }]} onPress={() => setFilterOpen(true)}>
            <Text style={[styles.dayChipText, { color: c.text }]}>{t('date')}</Text>
          </Pressable>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: c.danger, fontFamily: AppFonts.poppinsRegular, textAlign: 'center' }}>{error ?? t('errorLoad')}</Text>
          <Pressable onPress={() => refresh()} style={[styles.retry, { borderColor: c.border }]}>
            <Text style={{ color: c.text, fontFamily: AppFonts.poppinsMediumItalic }}>{t('retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(x) => String(x.id)}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}> 
              {!!item.imageUrl && <ResponsiveImage uri={item.imageUrl} />}
              {!!item.contenido && <TranslatedText text={item.contenido} style={[styles.body, { color: c.muted }]} numberOfLines={6} />}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                <Pressable onPress={() => navigation.navigate('NovedadDetalle', { newsId: item.id })} style={[styles.btn, { backgroundColor: c.primary }]}>
                  <Text style={[styles.btnText, { color: c.primaryText }]}>Ver detalle</Text>
                </Pressable>
                {!!item.fileUrl && (
                  <Pressable onPress={() => Linking.openURL(item.fileUrl!)} style={[styles.retry, { borderColor: c.border, marginTop: 0 }]}>
                    <Text style={{ color: c.text, fontFamily: AppFonts.poppinsMediumItalic }}>{t('seeMore')}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
          contentContainerStyle={{ padding: 14, paddingBottom: 140, flexGrow: filtered.length ? 0 : 1 }}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: c.muted, fontFamily: AppFonts.poppinsRegular, textAlign: 'center' }}>
                {q ? t('noResults') : filterDate ? (isTodaySelected ? t('noAdsPublishedToday') : t('noItemsForSelectedDate')) : t('noAdsYet')}
              </Text>
            </View>
          }
          refreshing={isFetching}
          onRefresh={() => refresh()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  retry: { marginTop: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  card: { borderWidth: 1, borderRadius: 22, marginBottom: 16, overflow: 'hidden', padding: 1 },
  body: { marginTop: 8, fontSize: 13, fontFamily: AppFonts.poppinsRegular, lineHeight: 18 },
  btn: { marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  btnText: { fontFamily: AppFonts.poppinsMediumItalic },
  dayFilterBar: { paddingHorizontal: 14, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  dayChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  dayChipText: { fontFamily: AppFonts.poppinsMediumItalic, fontSize: 12 },
  dayLabel: { flex: 1, textAlign: 'center', fontFamily: AppFonts.poppinsRegular, fontSize: 12 },
  searchWrap: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
  pageTitle: { textAlign: 'center', fontSize: 20, fontFamily: AppFonts.poppinsSemiBold, fontWeight: '800', letterSpacing: 0.2, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6 },
});

export default AnunciateScreen;

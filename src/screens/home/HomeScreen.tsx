import React from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "@/components/AppHeader";
import { useTheme } from "@/theme/ThemeProvider";
import { HomeCard } from "@/components/HomeCard";
import { SearchBar } from "@/components/SearchBar";
import { useI18n } from "@/i18n/I18nProvider";
import { syncAllIfOnline } from "@/offline/sync";
import { subscribeTabReset } from "@/lib/ui/tabReset";

export function HomeScreen() {
  const nav = useNavigation<any>();
  const { palette: c } = useTheme();
  const { t } = useI18n();
  const [refreshing, setRefreshing] = React.useState(false);
  const [q, setQ] = React.useState("");

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await syncAllIfOnline(() => {});
    } finally {
      setRefreshing(false);
    }
  }, []);


  useFocusEffect(
    React.useCallback(() => {
      setQ("");
      return undefined;
    }, [])
  );

  React.useEffect(() => {
    return subscribeTabReset((tab) => {
      if (tab !== "Inicio") {
        setQ("");
      }
    });
  }, []);

  const handleSubmitSearch = React.useCallback(() => {
    const query = q.trim();
    nav.navigate("Productos", { screen: "ProductosHome", params: { initialQuery: query, resetKey: Date.now() } });
  }, [nav, q]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader />
      <View style={[styles.searchWrap, { backgroundColor: c.primary }]}>
        <SearchBar value={q} onChangeText={setQ} placeholder={t("searchPlaceholder")} variant="onPrimary" onSubmitEditing={handleSubmitSearch} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <HomeCard titleKey="home_products_title" subtitleKey="home_products_subtitle" buttonKey="home_products_button" image="https://res.cloudinary.com/dbp9mpyq0/image/upload/v1773436627/PRODUCTOS_KOSHER_3_twhy9y.jpg" onPress={() => nav.navigate("Productos", { screen: "ProductosHome", params: { resetKey: Date.now() } })} />
        <HomeCard titleKey="home_news_title" subtitleKey="home_news_subtitle" buttonKey="home_news_button" image="https://res.cloudinary.com/dbp9mpyq0/image/upload/v1773436625/NOVEDADES_Y_ANUNCIOS_vfxvsu.jpg" onPress={() => nav.navigate("Novedades", { screen: "NovedadesHome", params: { resetKey: Date.now(), restaurantId: null, mode: null, fromRestaurant: null } })} />
        <HomeCard titleKey="home_restaurants_title" subtitleKey="home_restaurants_subtitle" buttonKey="home_restaurants_button" image="https://res.cloudinary.com/dbp9mpyq0/image/upload/v1773436626/RESTAURANTES_Y_NEGOCIOS_2_xwpdxh.jpg" onPress={() => nav.navigate("Restaurantes", { screen: "RestaurantesHome", params: { resetKey: Date.now() } })} />
        <HomeCard titleKey="home_donations_title" subtitleKey="home_donations_subtitle" buttonKey="home_donations_button" image="https://res.cloudinary.com/dbp9mpyq0/image/upload/v1773436626/DONACIONES_vjqm1f.jpg" onPress={() => nav.navigate("Donaciones")} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 14, paddingBottom: 140, paddingTop: 20 },
  searchWrap: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
});

export default HomeScreen;

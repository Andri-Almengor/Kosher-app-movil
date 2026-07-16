// src/features/stores/screens/StoreMapScreen.tsx
import React from "react";
import { View, Text } from "react-native";
// ⬇️ usamos el wrapper, NO react-native-maps directo
// src/features/stores/screens/StoreMapScreen.tsx
import MapView, { Marker } from "react-native-maps";

import stores from "../../../../assets/mock/stores.json";

// Tipo local según tu JSON de tiendas
type Store = {
  id: string | number;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export default function StoreMapScreen() {
  const list = stores as Store[];

  const initial = {
    latitude: list[0]?.lat ?? 9.935,
    longitude: list[0]?.lng ?? -84.077,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "700",
          marginTop: 16,
          marginHorizontal: 16,
        }}
      >
        Tiendas
      </Text>

      <MapView
        style={{ flex: 1, borderRadius: 16, margin: 16 }}
        initialRegion={initial}
      >
        {list.map((s) => (
          <Marker
            key={s.id}
            coordinate={{ latitude: s.lat, longitude: s.lng }}
            title={s.name}
            description={s.address}
          />
        ))}
      </MapView>
    </View>
  );
}

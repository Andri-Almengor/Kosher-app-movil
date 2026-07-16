import { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, Alert, ScrollView } from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { Picker } from "@react-native-picker/picker";

import type { Product, ProvinceCR } from "../api/types";
import { ProductRepository } from "../data/ProductRepository";
import { ExtraProductDataSource } from "../data/ExtraProductDataSource";
import Button from "../../../ui/Button";
import { useI18n } from "@/i18n/I18nProvider";

type P = { id?: string };

const PROVINCES: ProvinceCR[] = [
  "San José","Alajuela","Cartago","Heredia","Guanacaste","Puntarenas","Limón"
];

export default function AdminEditScreen() {
  const { t } = useI18n();
  const route = useRoute<RouteProp<Record<string, P>, string>>();
  const nav = useNavigation<any>();
  const qc = useQueryClient();
  const id = route.params?.id;

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [province, setProvince] = useState<ProvinceCR>("San José");
  const [storeName, setStoreName] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // 👇 nuevo: sello
  const [sealUrl, setSealUrl] = useState("");

  useEffect(() => {
    (async () => {
      if (!id) return;
      const p = await ProductRepository.getById(id);
      if (!p) return;
      setName(p.name);
      setBrand(p.brand);
      setPrice(String(p.price));
      setProvince(p.province);
      setStoreName(p.storeName);
      setMapUrl(p.mapUrl ?? "");
      setDescription(p.description ?? "");
      setImageUrl(p.imageUrl ?? "");
      // 👇 leer sello si existe
      setSealUrl((p as any).sealUrl ?? "");
    })();
  }, [id]);

  const save = async () => {
    const pr = Number(price);
    if (!name || !brand || !pr || !storeName) {
      Alert.alert("Campos incompletos", "Nombre, marca, precio y tienda son obligatorios.");
      return;
    }

    const product: Product = {
      id: id ?? `local-${Date.now()}`,
      name,
      brand,
      price: pr,
      province,
      storeName,
      mapUrl: mapUrl || undefined,
      description: description || undefined,
      imageUrl: imageUrl || undefined,
    };

    // 👇 adjuntar sello como campo opcional sin romper el tipo
    (product as any).sealUrl = sealUrl || undefined;

    if (!id) {
      await ExtraProductDataSource.add(product);
    } else if (id.startsWith("local-")) {
      await ExtraProductDataSource.update(product);
    } else {
      await ProductRepository.override(product);
    }

    await qc.invalidateQueries({ queryKey: ["products"] });
    Alert.alert("Listo", id ? "Producto actualizado" : "Producto creado");
    nav.goBack();
  };

  const remove = async () => {
    if (!id) return;
    Alert.alert("Eliminar", "¿Eliminar este producto?", [
      { text: t("cancel"), style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await ProductRepository.remove(id);
          await qc.invalidateQueries({ queryKey: ["products"] });
          nav.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={s.title}>{id ? "Editar producto" : "Nuevo producto"}</Text>

      <TextInput placeholder="Nombre" style={s.input} value={name} onChangeText={setName} />
      <TextInput placeholder="Marca" style={s.input} value={brand} onChangeText={setBrand} />
      <TextInput placeholder="Precio (₡)" keyboardType="numeric" style={s.input} value={price} onChangeText={setPrice} />

      <Picker selectedValue={province} onValueChange={(v) => setProvince(v)} style={s.picker}>
        {PROVINCES.map((p) => <Picker.Item key={p} label={p} value={p} />)}
      </Picker>

      <TextInput placeholder="Tienda" style={s.input} value={storeName} onChangeText={setStoreName} />
      <TextInput placeholder="URL de Maps (opcional)" style={s.input} value={mapUrl} onChangeText={setMapUrl} />
      <TextInput placeholder="Descripción (opcional)" style={[s.input, { height: 90 }]} value={description} onChangeText={setDescription} multiline />
      <TextInput placeholder="Imagen URL (opcional)" style={s.input} value={imageUrl} onChangeText={setImageUrl} />

      {/* 👇 nuevo campo: URL de sello */}
      <TextInput
        placeholder="Sello URL (opcional)"
        style={s.input}
        value={sealUrl}
        onChangeText={setSealUrl}
      />

      <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
        <Button title={t("save")} onPress={save} />
        {id && <Button title="Eliminar" variant="outline" tone="danger" onPress={remove} />}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8
  },
  picker: { height: 44, marginBottom: 8 },
});
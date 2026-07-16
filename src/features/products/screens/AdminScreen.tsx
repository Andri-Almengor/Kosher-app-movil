import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  FlatList,
} from "react-native";
import { useAuth } from "@/app/auth/authStore";
import { ExtraProductDataSource } from "../data/ExtraProductDataSource";
import { ProductRepository } from "../data/ProductRepository";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProvinceCR, Product } from "../api/types";
import { Picker } from "@react-native-picker/picker";
import Card from "@/ui/Card";
import Button from "@/ui/Button";
import { useI18n } from "@/i18n/I18nProvider";

const PROVINCES: ProvinceCR[] = [
  "San José", "Alajuela", "Cartago", "Heredia", "Guanacaste", "Puntarenas", "Limón"
];

export default function AdminScreen() {
  const { t } = useI18n();
  const { role } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["products"], queryFn: () => ProductRepository.list() });
  const products = data ?? [];

  // ---- Formulario ----
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [province, setProvince] = useState<ProvinceCR>("San José");
  const [storeName, setStoreName] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (!editId) return;
    const p = products.find(x => x.id === editId);
    if (!p) return;
    setName(p.name);
    setBrand(p.brand);
    setPrice(String(p.price));
    setProvince(p.province);
    setStoreName(p.storeName);
    setMapUrl(p.mapUrl ?? "");
    setDescription(p.description ?? "");
    setImageUrl(p.imageUrl ?? "");
  }, [editId, products]);

  if (role !== "admin") {
    return (
      <View style={s.container}>
        <Text style={s.title}>Admin</Text>
        <Text style={{ color: "#c00" }}>No tienes permisos (rol requerido: admin)</Text>
      </View>
    );
  }

  const cleanForm = () => {
    setEditId(null);
    setName(""); setBrand(""); setPrice(""); setStoreName("");
    setMapUrl(""); setDescription(""); setImageUrl("");
    setProvince("San José");
  };

  const onSubmit = async () => {
    const p = Number(price);
    if (!name || !brand || !p || !storeName) {
      Alert.alert("Campos incompletos", "Nombre, marca, precio y tienda son obligatorios.");
      return;
    }

    const product: Product = {
      id: editId ?? `local-${Date.now()}`,
      name, brand, price: p, province, storeName,
      mapUrl: mapUrl || undefined,
      description: description || undefined,
      imageUrl: imageUrl || undefined,
    };

    if (!editId) {
      // nuevo → extra
      await ExtraProductDataSource.add(product);
    } else {
      // editar
      if (editId.startsWith("local-")) {
        await ExtraProductDataSource.update(product);
      } else {
        await ProductRepository.override(product);
      }
    }

    await qc.invalidateQueries({ queryKey: ["products"] });
    Alert.alert("Listo", editId ? "Producto actualizado." : "Producto agregado.");
    cleanForm();
  };

  const onDelete = async (p: Product) => {
    Alert.alert(
      "Eliminar",
      `¿Eliminar "${p.name}"?`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await ProductRepository.remove(p.id);
            await qc.invalidateQueries({ queryKey: ["products"] });
            if (editId === p.id) cleanForm();
            Alert.alert("Eliminado", "Producto eliminado.");
          },
        },
      ]
    );
  };

  const startEdit = (p: Product) => setEditId(p.id);
  const cancelEdit = () => cleanForm();

  const renderRow = ({ item }: { item: Product }) => (
    <Card style={s.rowCard}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "700" }}>{item.name}</Text>
        <Text style={{ color: "#666", marginTop: 4 }}>{item.brand} · ₡{item.price}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button title="Editar" variant="outline" size="sm" onPress={() => startEdit(item)} />
        <Button title="Eliminar" variant="outline" size="sm" tone="danger" onPress={() => onDelete(item)} />
      </View>
    </Card>
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={s.title}>{editId ? "Editar producto" : "Agregar producto"}</Text>

      <TextInput placeholder="Nombre" style={s.input} value={name} onChangeText={setName} />
      <TextInput placeholder="Marca" style={s.input} value={brand} onChangeText={setBrand} />
      <TextInput placeholder="Precio (₡)" keyboardType="numeric" style={s.input} value={price} onChangeText={setPrice} />

      <Picker selectedValue={province} onValueChange={v => setProvince(v)} style={s.picker}>
        {PROVINCES.map(p => <Picker.Item key={p} label={p} value={p} />)}
      </Picker>

      <TextInput placeholder="Tienda (nombre)" style={s.input} value={storeName} onChangeText={setStoreName} />
      <TextInput placeholder="URL de Maps (opcional)" style={s.input} value={mapUrl} onChangeText={setMapUrl} />
      <TextInput placeholder="Descripción (opcional)" style={[s.input, { height: 90 }]} value={description} onChangeText={setDescription} multiline />
      <TextInput placeholder="Imagen URL (opcional)" style={s.input} value={imageUrl} onChangeText={setImageUrl} />

      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
        <Button title={editId ? "Guardar cambios" : "Agregar"} onPress={onSubmit} />
        {editId && <Button title={t("cancel")} variant="outline" onPress={cancelEdit} />}
      </View>

      <Text style={[s.title, { marginTop: 18 }]}>Gestionar productos</Text>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={renderRow}
        scrollEnabled={false}
        contentContainerStyle={{ paddingTop: 4 }}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  picker: { height: 44, marginBottom: 8 },
  rowCard: { padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
});
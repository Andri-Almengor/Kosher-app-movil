import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import * as XLSX from "xlsx";

export type ExcelColumn = { key: string; title: string; width?: number };

export async function pickExcelDocument() {
  const res = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    type: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ],
  });

  if (res.canceled) return null;
  const file = res.assets?.[0];
  if (!file) return null;

  if (Platform.OS === "web" && (file as any).file) {
    return { file: (file as any).file } as const;
  }

  const uri = (file as any).fileCopyUri ?? file.uri;
  return {
    uri,
    name: file.name,
    mimeType: file.mimeType,
  } as const;
}

export async function exportRowsToExcel(params: {
  rows: Record<string, any>[];
  columns?: ExcelColumn[];
  sheetName: string;
  filename: string;
}) {
  const { rows, columns, sheetName, filename } = params;
  const exportRows = columns
    ? rows.map((row) => Object.fromEntries(columns.map((col) => [col.title, row[col.key] ?? ""])))
    : rows;

  const ws = XLSX.utils.json_to_sheet(exportRows);
  if (columns?.length) {
    ws["!cols"] = columns.map((col) => ({ wch: col.width ?? Math.max(14, col.title.length + 2) }));
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  if (Platform.OS === "web") {
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const FS: any = FileSystem as any;
  const baseDir: string | null =
    (FS.documentDirectory as string | undefined) ??
    (FS.cacheDirectory as string | undefined) ??
    null;

  if (!baseDir) throw new Error("No storage directory available");

  const uri = baseDir + filename;
  await FileSystem.writeAsStringAsync(uri, wbout, {
    encoding: "base64" as any,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
    return;
  }

  return uri;
}

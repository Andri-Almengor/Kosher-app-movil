import { Alert, Linking, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { cacheRemoteFile, getCachedRemoteFileUri } from '@/offline/fileCache';

function guessMimeType(uri: string) {
  const clean = uri.toLowerCase().split('?')[0].split('#')[0];
  if (clean.endsWith('.pdf')) return 'application/pdf';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.gif')) return 'image/gif';
  if (clean.endsWith('.doc')) return 'application/msword';
  if (clean.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (clean.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (clean.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (clean.endsWith('.ppt')) return 'application/vnd.ms-powerpoint';
  if (clean.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (clean.endsWith('.txt')) return 'text/plain';
  return undefined;
}

async function openLocalUri(localUri: string) {
  try {
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(localUri, {
        mimeType: guessMimeType(localUri),
        dialogTitle: 'Abrir archivo',
        UTI: guessMimeType(localUri),
      });
      return true;
    }
  } catch {}

  try {
    const canOpen = await Linking.canOpenURL(localUri);
    if (canOpen) {
      await Linking.openURL(localUri);
      return true;
    }
  } catch {}

  return false;
}

export async function openAssetUrl(url?: string | null) {
  if (!url) return false;

  try {
    if (/^https?:\/\//i.test(url)) {
      if (Platform.OS !== 'web') {
        const cached = await getCachedRemoteFileUri(url);
        if (cached) {
          const openedLocal = await openLocalUri(cached);
          if (openedLocal) return true;
        }

        const downloaded = await cacheRemoteFile(url);
        if (downloaded) {
          const openedLocal = await openLocalUri(downloaded);
          if (openedLocal) return true;
        }
      }

      await Linking.openURL(url);
      return true;
    }

    return await openLocalUri(url);
  } catch {
    Alert.alert('No se pudo abrir', 'No fue posible abrir este archivo o imagen.');
    return false;
  }
}

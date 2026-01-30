import Constants from 'expo-constants';
import { lookup as mimeLookup } from 'react-native-mime-types';
const API = (Constants.expoConfig?.extra as any).apiBase as string;

export async function getUploadSignature(folder = 'complaints') {
  const res = await fetch(`${API}/v1/uploads/sign?folder=${folder}`);
  if (!res.ok) throw new Error('Failed to sign upload');
  return res.json();
}
export async function uploadToCloudinary(localUri: string) {
  const sign = await getUploadSignature();
  const name = localUri.split('/').pop() || `photo_${Date.now()}.jpg`;
  const type = (mimeLookup(name) as string) || 'image/jpeg';
  const data = new FormData();
  // @ts-ignore RN file
  data.append('file', { uri: localUri, name, type });
  data.append('api_key', sign.apiKey);
  data.append('timestamp', String(sign.timestamp));
  data.append('signature', sign.signature);
  data.append('folder', sign.folder);
  const res = await fetch(sign.uploadUrl, { method: 'POST', body: data });
  const json = await res.json();
  if (!json.secure_url) throw new Error('Upload failed');
  return json.secure_url as string;
}
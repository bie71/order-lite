import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Image, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { WebProduct } from '../services/githubCatalogService';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any, any>;
};

const DEFAULT_CATEGORIES = [
  'Gamis', 'Daster', 'Baju Dewasa', 'Baju Anak', 'Celamis', 'Tyso', 'Elektronik'
];

const COMMON_BADGES = [
  'Best Seller', 'Hot', 'Promo', 'Ready', 'Stok 1', 'Baru', 'Like New'
];

const COMMON_SIZES = [
  'S', 'M', 'L', 'XL', 'XXL', 'All Size', 'Standar', 'Jumbo'
];

export default function WebProductEditScreen({ navigation, route }: Props) {
  const existingProduct: WebProduct | undefined = route.params?.product;
  const onSaveCallback = route.params?.onSave;
  const isEdit = !!existingProduct;

  const [nama, setNama] = useState(existingProduct?.name || '');
  const [kategori, setKategori] = useState(existingProduct?.cat || 'Gamis');
  const [isCustomCategory, setIsCustomCategory] = useState(
    existingProduct?.cat ? !DEFAULT_CATEGORIES.includes(existingProduct.cat) : false
  );
  const [customCatInput, setCustomCatInput] = useState(
    existingProduct?.cat && !DEFAULT_CATEGORIES.includes(existingProduct.cat) ? existingProduct.cat : ''
  );

  const [harga, setHarga] = useState(
    existingProduct?.price
      ? existingProduct.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      : ''
  );
  const [hargaCoret, setHargaCoret] = useState(
    existingProduct?.old
      ? existingProduct.old.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      : ''
  );

  const [badge, setBadge] = useState(existingProduct?.badge || '');
  const [selectedSizes, setSelectedSizes] = useState<string[]>(existingProduct?.sizes || []);
  const [newSizeInput, setNewSizeInput] = useState('');
  const [showAddSize, setShowAddSize] = useState(false);

  const [deskripsi, setDeskripsi] = useState(existingProduct?.desc || '');
  const [imageUri, setImageUri] = useState<string | null>(existingProduct?.img || null);
  const [isNewLocalImage, setIsNewLocalImage] = useState(false);

  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const formatThousand = (val: string) => {
    const digits = val.replace(/[^0-9]/g, '');
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handlePickImage = async (useCamera: boolean = false) => {
    try {
      setIsProcessingImage(true);

      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Izin Ditolak', `Aplikasi butuh izin akses ${useCamera ? 'kamera' : 'galeri foto'}.`);
        setIsProcessingImage(false);
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 1,
          });

      if (!result.canceled && result.assets && result.assets[0]) {
        // Kompres gambar otomatis tanpa crop (lebar maks 800px, aspect ratio asli terjaga)
        const compressed = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 800 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        // Simpan ke direktori gambar lokal
        const imagesDir = FileSystem.documentDirectory + 'images/';
        const dirInfo = await FileSystem.getInfoAsync(imagesDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(imagesDir, { intermediates: true });
        }

        const fileName = `webprod_${Date.now()}.jpg`;
        const permanentUri = imagesDir + fileName;

        await FileSystem.copyAsync({
          from: compressed.uri,
          to: permanentUri,
        });

        setImageUri(permanentUri);
        setIsNewLocalImage(true);
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', `Gagal memproses gambar: ${err.message || err}`);
    } finally {
      setIsProcessingImage(false);
    }
  };

  const toggleSize = (sz: string) => {
    if (selectedSizes.includes(sz)) {
      setSelectedSizes(selectedSizes.filter(s => s !== sz));
    } else {
      setSelectedSizes([...selectedSizes, sz]);
    }
  };

  const handleAddCustomSize = () => {
    if (newSizeInput.trim() && !selectedSizes.includes(newSizeInput.trim())) {
      setSelectedSizes([...selectedSizes, newSizeInput.trim()]);
      setNewSizeInput('');
      setShowAddSize(false);
    }
  };

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!nama.trim()) {
      errs.nama = 'Nama produk wajib diisi.';
    }
    const cleanPrice = parseInt(harga.replace(/[^0-9]/g, ''), 10);
    if (!harga.trim() || isNaN(cleanPrice) || cleanPrice <= 0) {
      errs.harga = 'Harga produk harus lebih dari 0.';
    }
    if (isCustomCategory && !customCatInput.trim()) {
      errs.kategori = 'Kategori kustom tidak boleh kosong.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const finalCat = isCustomCategory ? customCatInput.trim() : kategori;
    const finalPrice = parseInt(harga.replace(/[^0-9]/g, ''), 10);
    const finalOldPrice = hargaCoret.trim()
      ? parseInt(hargaCoret.replace(/[^0-9]/g, ''), 10)
      : undefined;

    const updatedProduct: WebProduct = {
      id: existingProduct?.id || Date.now(),
      name: nama.trim(),
      cat: finalCat,
      price: finalPrice,
      old: finalOldPrice && finalOldPrice > 0 ? finalOldPrice : undefined,
      img: imageUri || (existingProduct?.img || 'img/1.jpg'),
      badge: badge.trim() || undefined,
      sizes: selectedSizes.length > 0 ? selectedSizes : undefined,
      desc: deskripsi.trim() || '',
    };

    if (onSaveCallback) {
      onSaveCallback(updatedProduct, isNewLocalImage);
    }

    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#F8F9FA' }}
    >
      {/* Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {isEdit ? 'Edit Produk Web' : 'Tambah Produk Web'}
        </Text>
        <TouchableOpacity style={styles.topSaveBtn} onPress={handleSave}>
          <Text style={styles.topSaveBtnText}>Simpan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Upload Foto Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Foto Produk</Text>
          <View style={styles.photoContainer}>
            {imageUri ? (
              <View style={styles.previewBox}>
                <Image
                  source={{
                    uri: imageUri.startsWith('http') || imageUri.startsWith('file:') || imageUri.startsWith('data:')
                      ? imageUri
                      : `https://sahla-store.vercel.app/${imageUri}`
                  }}
                  style={styles.previewImage}
                />
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => {
                    setImageUri(null);
                    setIsNewLocalImage(false);
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="image-outline" size={48} color="#CCC" />
                <Text style={styles.photoPlaceholderText}>Belum ada foto produk</Text>
              </View>
            )}

            <View style={styles.photoActions}>
              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: '#023c69' }]}
                onPress={() => handlePickImage(false)}
                disabled={isProcessingImage}
              >
                <Ionicons name="images-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.photoBtnText}>Pilih dari Galeri</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: '#2E7D32' }]}
                onPress={() => handlePickImage(true)}
                disabled={isProcessingImage}
              >
                <Ionicons name="camera-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.photoBtnText}>Ambil Kamera</Text>
              </TouchableOpacity>
            </View>

            {isProcessingImage && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <ActivityIndicator size="small" color="#023c69" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 12, color: '#666' }}>Mengompres foto...</Text>
              </View>
            )}
          </View>
        </View>

        {/* Informasi Utama Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Informasi Produk</Text>

          {/* Nama Produk */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nama Produk *</Text>
            <TextInput
              style={[styles.input, errors.nama && styles.inputError]}
              placeholder="Contoh: Gamis Syari Ceruty Babydoll"
              placeholderTextColor="#999"
              value={nama}
              onChangeText={text => {
                setNama(text);
                if (errors.nama) setErrors({ ...errors, nama: '' });
              }}
            />
            {errors.nama ? <Text style={styles.errorText}>{errors.nama}</Text> : null}
          </View>

          {/* Kategori */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Kategori Produk *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {DEFAULT_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.chip,
                    !isCustomCategory && kategori === cat && styles.chipActive
                  ]}
                  onPress={() => {
                    setIsCustomCategory(false);
                    setKategori(cat);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      !isCustomCategory && kategori === cat && styles.chipTextActive
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.chip, isCustomCategory && styles.chipActive]}
                onPress={() => setIsCustomCategory(true)}
              >
                <Text style={[styles.chipText, isCustomCategory && styles.chipTextActive]}>
                  + Kategori Lain
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {isCustomCategory && (
              <TextInput
                style={[styles.input, errors.kategori && styles.inputError]}
                placeholder="Ketik kategori baru (contoh: Aksesoris, Jilbab, Sepatu)"
                placeholderTextColor="#999"
                value={customCatInput}
                onChangeText={setCustomCatInput}
              />
            )}
            {errors.kategori ? <Text style={styles.errorText}>{errors.kategori}</Text> : null}
          </View>

          {/* Harga & Harga Coret */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Harga Jual (Rp) *</Text>
              <TextInput
                style={[styles.input, errors.harga && styles.inputError]}
                placeholder="285.000"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={harga}
                onChangeText={t => {
                  setHarga(formatThousand(t));
                  if (errors.harga) setErrors({ ...errors, harga: '' });
                }}
              />
              {errors.harga ? <Text style={styles.errorText}>{errors.harga}</Text> : null}
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Harga Coret (Opsional)</Text>
              <TextInput
                style={styles.input}
                placeholder="350.000"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={hargaCoret}
                onChangeText={t => setHargaCoret(formatThousand(t))}
              />
            </View>
          </View>
        </View>

        {/* Promo Badge & Ukuran */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Label Promo & Ukuran</Text>

          {/* Badge */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Label Promo / Badge (Opsional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
              <TouchableOpacity
                style={[styles.chip, !badge && styles.chipActive]}
                onPress={() => setBadge('')}
              >
                <Text style={[styles.chipText, !badge && styles.chipTextActive]}>Tanpa Label</Text>
              </TouchableOpacity>
              {COMMON_BADGES.map(b => (
                <TouchableOpacity
                  key={b}
                  style={[styles.chip, badge === b && styles.chipActive]}
                  onPress={() => setBadge(b)}
                >
                  <Text style={[styles.chipText, badge === b && styles.chipTextActive]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Sizes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Pilihan Ukuran (Opsional)</Text>
            <View style={styles.sizesWrap}>
              {COMMON_SIZES.map(sz => {
                const isSelected = selectedSizes.includes(sz);
                return (
                  <TouchableOpacity
                    key={sz}
                    style={[styles.sizeChip, isSelected && styles.sizeChipActive]}
                    onPress={() => toggleSize(sz)}
                  >
                    <Text style={[styles.sizeChipText, isSelected && styles.sizeChipTextActive]}>
                      {sz}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {selectedSizes
                .filter(sz => !COMMON_SIZES.includes(sz))
                .map(sz => (
                  <TouchableOpacity
                    key={sz}
                    style={[styles.sizeChip, styles.sizeChipActive]}
                    onPress={() => toggleSize(sz)}
                  >
                    <Text style={[styles.sizeChipText, styles.sizeChipTextActive]}>
                      {sz} ✕
                    </Text>
                  </TouchableOpacity>
                ))}

              {showAddSize ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    style={styles.customSizeInput}
                    placeholder="Ukuran..."
                    value={newSizeInput}
                    onChangeText={setNewSizeInput}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.addSizeOkBtn} onPress={handleAddCustomSize}>
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>+ OK</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.sizeChipAdd}
                  onPress={() => setShowAddSize(true)}
                >
                  <Text style={{ fontSize: 12, color: '#023c69', fontWeight: 'bold' }}>+ Ukuran</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Deskripsi */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Deskripsi Singkat</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Contoh: Bahan Ceruty Babydoll lapis furing, adem dan jatuh. Resleting depan busui friendly."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              value={deskripsi}
              onChangeText={setDeskripsi}
            />
          </View>
        </View>

        {/* Action Button Bawah */}
        <TouchableOpacity style={styles.bottomSaveBtn} onPress={handleSave}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.bottomSaveBtnText}>
            {isEdit ? 'Perbarui Produk Web' : 'Tambahkan ke Katalog Web'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    backgroundColor: '#023c69',
    paddingTop: Platform.OS === 'ios' ? 48 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 6,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  topSaveBtn: {
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  topSaveBtnText: {
    color: '#023c69',
    fontWeight: 'bold',
    fontSize: 13,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#023c69',
    marginBottom: 12,
  },
  photoContainer: {
    alignItems: 'center',
  },
  previewBox: {
    position: 'relative',
    width: 200,
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(211, 47, 47, 0.85)',
    padding: 6,
    borderRadius: 16,
  },
  photoPlaceholder: {
    width: 200,
    height: 240,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoPlaceholderText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  photoBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#FAFAFA',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#023c69',
    borderColor: '#023c69',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  sizesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  sizeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFF',
  },
  sizeChipActive: {
    backgroundColor: '#023c69',
    borderColor: '#023c69',
  },
  sizeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  sizeChipTextActive: {
    color: '#FFF',
  },
  sizeChipAdd: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#023c69',
    borderStyle: 'dashed',
    backgroundColor: '#F0F6FA',
  },
  customSizeInput: {
    borderWidth: 1,
    borderColor: '#023c69',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    width: 80,
  },
  addSizeOkBtn: {
    backgroundColor: '#023c69',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  bottomSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#023c69',
    paddingVertical: 14,
    borderRadius: 14,
    marginHorizontal: 4,
    shadowColor: '#023c69',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomSaveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

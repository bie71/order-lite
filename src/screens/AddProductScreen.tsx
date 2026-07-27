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
import { insertProduct, updateProduct } from '../database/queries/productQueries';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any, any>;
};

export default function AddProductScreen({ navigation, route }: Props) {
  const existingProduct = route.params?.product;
  const isEdit = !!existingProduct;

  const [namaProduk, setNamaProduk] = useState(existingProduct?.nama_produk || '');
  const [hargaDasar, setHargaDasar] = useState(
    existingProduct?.harga_dasar 
      ? existingProduct.harga_dasar.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') 
      : ''
  );
  const [fotoPath, setFotoPath] = useState<string | null>(existingProduct?.foto_path || null);
  
  // Validation and Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ nama?: string; harga?: string }>({});

  const formatRupiah = (text: string) => {
    const angka = text.replace(/[^0-9]/g, '');
    return angka.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmbilFoto = async () => {
    try {
      // Meminta izin akses media
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Izin Ditolak", "Aplikasi membutuhkan izin untuk mengakses galeri foto.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1, // Kualitas asli sebelum dikompres
      });

      if (!result.canceled) {
        // 1. Kompres dan Resize Gambar (Max 600px, kualitas 0.5 JPEG untuk hemat ukuran)
        const compressedImage = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 600 } }],
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
        );

        // 2. Simpan gambar ke direktori permanen aplikasi (bukan sekadar cache sementara)
        const imagesDir = FileSystem.documentDirectory + 'images/';
        const dirInfo = await FileSystem.getInfoAsync(imagesDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(imagesDir, { intermediates: true });
        }

        const fileName = `img_${Date.now()}.jpg`;
        const permanentUri = imagesDir + fileName;

        await FileSystem.copyAsync({
          from: compressedImage.uri,
          to: permanentUri,
        });
        
        setFotoPath(permanentUri);
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", `Gagal memproses foto: ${error.message || error}`);
    }
  };

  const handleHapusFoto = () => {
    setFotoPath(null);
  };

  const validate = () => {
    const newErrors: { nama?: string; harga?: string } = {};
    if (!namaProduk.trim()) {
      newErrors.nama = "Nama produk tidak boleh kosong.";
    } else if (namaProduk.trim().length < 3) {
      newErrors.nama = "Nama produk minimal 3 karakter.";
    }

    if (!hargaDasar.trim()) {
      newErrors.harga = "Harga modal tidak boleh kosong.";
    } else {
      const hargaNum = parseFloat(hargaDasar.replace(/\./g, ''));
      if (isNaN(hargaNum) || hargaNum <= 0) {
        newErrors.harga = "Harga modal harus lebih dari 0.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSimpan = async () => {
    if (!validate()) {
      return;
    }
    
    setIsSaving(true);
    try {
      // Hilangkan titik sebelum diubah ke angka
      const hargaNum = parseFloat(hargaDasar.replace(/\./g, ''));
      
      if (isEdit) {
        await updateProduct(existingProduct.id, namaProduk.trim(), hargaNum, fotoPath);
      } else {
        await insertProduct(namaProduk.trim(), hargaNum, fotoPath);
      }
      
      Alert.alert(
        "Sukses!", 
        `Master produk "${namaProduk}" berhasil ${isEdit ? 'diperbarui' : 'disimpan'}.`,
        [{ text: "OK", onPress: () => {
          setNamaProduk(''); setHargaDasar(''); setFotoPath(null);
          navigation.goBack(); // Kembali ke halaman sebelumnya
        }}]
      );
    } catch (error: any) {
      console.error("Gagal menyimpan ke SQLite:", error);
      Alert.alert(
        "Gagal Menyimpan", 
        `Terjadi kesalahan pada database SQLite:\n${error.message || error}\n\nPastikan penyimpanan perangkat Anda cukup.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Ionicons name={isEdit ? "create" : "add-circle"} size={26} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.headerTitle}>{isEdit ? 'Edit Produk' : 'Tambah Produk Baru'}</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {isEdit ? 'Perbarui informasi detail produk Anda' : 'Masukkan detail master produk dengan benar'}
            </Text>
          </View>
        </View>

        {/* AREA UNGGAH FOTO */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Foto Produk (Opsional)</Text>
          <View style={styles.imageContainer}>
            {fotoPath ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: fotoPath }} style={styles.imagePreview} />
                <View style={styles.imageOverlay}>
                  <TouchableOpacity style={styles.overlayActionBtn} onPress={handleAmbilFoto}>
                    <Ionicons name="camera" size={20} color="#FFF" />
                    <Text style={styles.overlayActionText}>Ubah</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.overlayActionBtn, styles.deleteBtn]} onPress={handleHapusFoto}>
                    <Ionicons name="trash" size={20} color="#FFF" />
                    <Text style={styles.overlayActionText}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.imagePicker} onPress={handleAmbilFoto} activeOpacity={0.8}>
                <View style={styles.imagePlaceholder}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="camera-outline" size={32} color="#023c69" />
                  </View>
                  <Text style={styles.imagePlaceholderText}>Pilih Foto Produk</Text>
                  <Text style={styles.imagePlaceholderSubText}>Format JPG/PNG, maks. 5MB</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* FORM INPUT */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Detail Produk</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Produk <Text style={styles.required}>*</Text></Text>
            <View style={[
              styles.inputWrapper, 
              errors.nama ? styles.inputErrorBorder : null
            ]}>
              <Ionicons name="cube-outline" size={20} color={errors.nama ? "#D32F2F" : "#666"} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={namaProduk} 
                onChangeText={(text) => {
                  setNamaProduk(text);
                  if (errors.nama) setErrors(prev => ({ ...prev, nama: undefined }));
                }} 
                placeholder="Misal: Sepatu Sneakers Pria" 
                placeholderTextColor="#999"
              />
            </View>
            {errors.nama && <Text style={styles.errorText}>{errors.nama}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Harga Dasar (Modal) <Text style={styles.required}>*</Text></Text>
            <View style={[
              styles.inputWrapper, 
              errors.harga ? styles.inputErrorBorder : null
            ]}>
              <Text style={[styles.currencyPrefix, errors.harga ? styles.errorCurrency : null]}>Rp</Text>
              <TextInput 
                style={[styles.input, { paddingLeft: 4 }]} 
                value={hargaDasar} 
                onChangeText={(text) => {
                  setHargaDasar(formatRupiah(text));
                  if (errors.harga) setErrors(prev => ({ ...prev, harga: undefined }));
                }} 
                keyboardType="numeric" 
                placeholder="150.000" 
                placeholderTextColor="#999"
              />
            </View>
            {errors.harga && <Text style={styles.errorText}>{errors.harga}</Text>}
            {!errors.harga && hargaDasar ? (
              <Text style={styles.helperText}>
                Harga terinput: Rp {hargaDasar}
              </Text>
            ) : null}
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, isSaving ? styles.submitBtnDisabled : null]} 
          onPress={handleSimpan} 
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="save" size={22} color="#FFF" />
              <Text style={styles.submitBtnText}>{isEdit ? 'Simpan Perubahan' : 'Simpan Master Produk'}</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  header: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24, 
    paddingTop: Platform.OS === 'ios' ? 20 : 40, 
    paddingBottom: 22,
    backgroundColor: '#023c69',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
  },
  backBtn: {
    marginRight: 16,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  headerSubtitle: { fontSize: 13, color: '#BAC6D5', marginTop: 2 },
  
  // Section Cards
  sectionCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F4F8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#023c69',
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#F0F4F8',
    paddingBottom: 8,
  },

  // AREA GAMBAR
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePicker: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F4F7FC',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D2DBE7',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6EDF8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePlaceholderText: { fontSize: 15, fontWeight: '700', color: '#023c69' },
  imagePlaceholderSubText: { fontSize: 12, color: '#8899A6', marginTop: 4 },
  
  previewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  overlayActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#023c69',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteBtn: {
    backgroundColor: '#D32F2F',
  },
  overlayActionText: { color: '#FFF', fontSize: 13, fontWeight: '700', marginLeft: 6 },

  // AREA FORM
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', color: '#334D6E', marginBottom: 6 },
  required: { color: '#D32F2F' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FC',
    borderRadius: 12, borderWidth: 1, borderColor: '#D2DBE7',
    paddingHorizontal: 16, height: 50,
  },
  inputErrorBorder: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFEBEE',
  },
  inputIcon: { marginRight: 10 },
  currencyPrefix: { fontSize: 15, fontWeight: '700', color: '#555', marginRight: 4 },
  errorCurrency: { color: '#D32F2F' },
  input: { flex: 1, fontSize: 15, color: '#102A43', height: '100%', fontWeight: '500' },
  errorText: { color: '#D32F2F', fontSize: 12, fontWeight: '600', marginTop: 6, marginLeft: 4 },
  helperText: { color: '#038E5A', fontSize: 12, fontWeight: '600', marginTop: 6, marginLeft: 4 },

  // TOMBOL
  submitBtn: {
    flexDirection: 'row', backgroundColor: '#023c69',
    marginHorizontal: 24, marginTop: 10, height: 54,
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#023c69', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#A0B2C6',
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 8 },
});

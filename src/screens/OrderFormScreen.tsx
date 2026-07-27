import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Image, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { getProducts } from '../database/queries/productQueries';
import { insertOrder, updateOrder } from '../database/queries/orderQueries';
import { getMarketers } from '../database/queries/marketerQueries';
import { getExpeditions } from '../database/queries/expeditionQueries';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any, any>;
};

export default function OrderFormScreen({ navigation, route }: Props) {
  const existingOrder = route.params?.order;
  const isEdit = !!existingOrder;

  const [productList, setProductList] = useState<any[]>([]);
  const [marketerList, setMarketerList] = useState<any[]>([]);
  const [expeditionList, setExpeditionList] = useState<any[]>([]);

  const [selectedProductId, setSelectedProductId] = useState<number | null>(existingOrder?.produk_id || null);

  // Picker selections or manual modes
  const [selectedMarketerId, setSelectedMarketerId] = useState<string>('manual');
  const [selectedExpeditionId, setSelectedExpeditionId] = useState<string>('manual');

  // Form states
  const [gudangNama, setGudangNama] = useState(existingOrder?.gudang_nama || '');
  const [marketerNama, setMarketerNama] = useState(existingOrder?.marketer_cust_nama || '');
  const [produkNama, setProdukNama] = useState(existingOrder?.produk_nama || '');
  const [hargaProduk, setHargaProduk] = useState(existingOrder?.harga_produk ? existingOrder.harga_produk.toString() : '0');
  const [feeMarketer, setFeeMarketer] = useState(
    existingOrder?.fee_marketer
      ? existingOrder.fee_marketer.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      : ''
  );
  const [ekspedisi, setEkspedisi] = useState(existingOrder?.ekspedisi_pengirim || '');
  const [ongkir, setOngkir] = useState(
    existingOrder?.ongkir
      ? existingOrder.ongkir.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      : ''
  );
  const [previewFoto, setPreviewFoto] = useState<string | null>(existingOrder?.produk_foto_path || null);

  // UX & Validation states
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [errors, setErrors] = useState<{
    gudang?: string;
    marketer?: string;
    product?: string;
    fee?: string;
    ekspedisi?: string;
    ongkir?: string;
  }>({});

  // Fetch products, marketers, and expeditions from database
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [prods, mkts, exps] = await Promise.all([
          getProducts(),
          getMarketers(),
          getExpeditions()
        ]);
        setProductList(prods);
        setMarketerList(mkts);
        setExpeditionList(exps);

        // Pre-select pickers if editing
        if (isEdit) {
          const matchedMkt = mkts.find(m => m.nama_marketer === existingOrder.marketer_cust_nama);
          if (matchedMkt) {
            setSelectedMarketerId(matchedMkt.id.toString());
          } else {
            setSelectedMarketerId('manual');
          }

          const matchedExp = exps.find(e => e.nama_ekspedisi === existingOrder.ekspedisi_pengirim);
          if (matchedExp) {
            setSelectedExpeditionId(matchedExp.id.toString());
          } else {
            setSelectedExpeditionId('manual');
          }
        }
      } catch (err) {
        console.warn("Gagal mengambil metadata:", err);
      } finally {
        setIsLoadingMetadata(false);
      }
    }
    loadMetadata();
  }, [isEdit, existingOrder]);

  const handleProductSelect = (prodId: number | null) => {
    setSelectedProductId(prodId);
    if (errors.product) setErrors(prev => ({ ...prev, product: undefined }));

    if (prodId === null) {
      setProdukNama('');
      setHargaProduk('0');
      setPreviewFoto(null);
      return;
    }

    const selected = productList.find(p => p.id === prodId);
    if (selected) {
      setProdukNama(selected.nama_produk);
      setHargaProduk(selected.harga_dasar.toString());
      setPreviewFoto(selected.foto_path || null);
    }
  };

  const handleMarketerSelect = (val: string) => {
    setSelectedMarketerId(val);
    if (errors.marketer) setErrors(prev => ({ ...prev, marketer: undefined }));

    if (val === 'manual') {
      setMarketerNama('');
    } else {
      const selected = marketerList.find(m => m.id.toString() === val);
      if (selected) {
        setMarketerNama(selected.nama_marketer);
      }
    }
  };

  const handleExpeditionSelect = (val: string) => {
    setSelectedExpeditionId(val);
    if (errors.ekspedisi) setErrors(prev => ({ ...prev, ekspedisi: undefined }));

    if (val === 'manual') {
      setEkspedisi('');
    } else {
      const selected = expeditionList.find(e => e.id.toString() === val);
      if (selected) {
        setEkspedisi(selected.nama_ekspedisi);
      }
    }
  };

  const formatRupiah = (text: string) => {
    const angka = text.replace(/[^0-9]/g, '');
    return angka.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!gudangNama.trim()) {
      newErrors.gudang = "Nama gudang/toko harus diisi.";
    }
    if (!selectedProductId) {
      newErrors.product = "Silakan pilih produk dari master produk.";
    }

    const feeNum = parseFloat(feeMarketer.replace(/\./g, '')) || 0;
    if (feeMarketer.trim() && (isNaN(feeNum) || feeNum < 0)) {
      newErrors.fee = "Fee marketer harus bernilai 0 atau lebih.";
    }

    const ongkirNum = parseFloat(ongkir.replace(/\./g, '')) || 0;
    if (ongkir.trim() && (isNaN(ongkirNum) || ongkirNum < 0)) {
      newErrors.ongkir = "Ongkir harus bernilai 0 atau lebih.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    setIsSaving(true);
    try {
      const basePrice = parseFloat(hargaProduk) || 0;
      const feeNum = parseFloat(feeMarketer.replace(/\./g, '')) || 0;
      const ongkirNum = parseFloat(ongkir.replace(/\./g, '')) || 0;

      const orderPayload = {
        gudang_nama: gudangNama.trim(),
        marketer_cust_nama: marketerNama.trim() || '-',
        produk_id: selectedProductId,
        produk_nama: produkNama,
        produk_foto_path: previewFoto,
        harga_produk: basePrice,
        fee_marketer: feeNum,
        ekspedisi_pengirim: ekspedisi.trim() || '-',
        ongkir: ongkirNum,
      };

      if (isEdit) {
        await updateOrder(existingOrder.id, orderPayload);
      } else {
        await insertOrder(orderPayload);
      }

      Alert.alert(
        "Sukses!",
        `Pesanan berhasil ${isEdit ? 'diperbarui' : 'dicatat'} ke dalam database SQLite.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      console.error("Gagal menyimpan pesanan:", err);
      Alert.alert("Gagal Menyimpan", `Terjadi kesalahan saat menyimpan pesanan:\n${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculations
  const basePriceNum = parseFloat(hargaProduk) || 0;
  const feeMarketerNum = parseFloat(feeMarketer.replace(/\./g, '')) || 0;
  const ongkirNum = parseFloat(ongkir.replace(/\./g, '')) || 0;
  const totalHarga = basePriceNum + feeMarketerNum + ongkirNum;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Ionicons name={isEdit ? "create" : "clipboard"} size={26} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.headerTitle}>{isEdit ? 'Edit Pesanan' : 'Catat Pesanan'}</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {isEdit ? 'Perbarui informasi detail pesanan masuk' : 'Form pencatatan pesanan terotomatisasi'}
            </Text>
          </View>
        </View>

        {/* CARD INFORMASI UMUM */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Informasi Umum</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Gudang / Toko <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputWrapper, errors.gudang ? styles.inputErrorBorder : null]}>
              <Ionicons name="storefront-outline" size={20} color={errors.gudang ? "#D32F2F" : "#6A7B95"} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={gudangNama}
                onChangeText={(text) => {
                  setGudangNama(text);
                  if (errors.gudang) setErrors(prev => ({ ...prev, gudang: undefined }));
                }}
                placeholder="Misal: Gudang Utama Jakarta"
                placeholderTextColor="#999"
              />
            </View>
            {errors.gudang && <Text style={styles.errorText}>{errors.gudang}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pilih Marketer</Text>
            {isLoadingMetadata ? (
              <View style={styles.pickerLoading}>
                <ActivityIndicator size="small" color="#023c69" />
                <Text style={styles.pickerLoadingText}>Memuat daftar marketer...</Text>
              </View>
            ) : (
              <View style={[styles.pickerWrapper, errors.marketer ? styles.inputErrorBorder : null]}>
                <Ionicons name="people-outline" size={20} color={errors.marketer ? "#D32F2F" : "#6A7B95"} style={[styles.inputIcon, { marginLeft: 16 }]} />
                <Picker
                  selectedValue={selectedMarketerId}
                  onValueChange={(val) => handleMarketerSelect(val as string)}
                  style={styles.picker}
                  dropdownIconColor="#023c69"
                >
                  <Picker.Item label="Input Manual / Lainnya..." value="manual" />
                  {marketerList.map(m => (
                    <Picker.Item key={m.id} label={m.nama_marketer} value={m.id.toString()} />
                  ))}
                </Picker>
              </View>
            )}
          </View>

          {selectedMarketerId === 'manual' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nama Marketer / Pelanggan Baru</Text>
              <View style={[styles.inputWrapper, errors.marketer ? styles.inputErrorBorder : null]}>
                <Ionicons name="person-outline" size={20} color={errors.marketer ? "#D32F2F" : "#6A7B95"} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={marketerNama}
                  onChangeText={(text) => {
                    setMarketerNama(text);
                    if (errors.marketer) setErrors(prev => ({ ...prev, marketer: undefined }));
                  }}
                  placeholder="Misal: Budi Santoso"
                  placeholderTextColor="#999"
                />
              </View>
              {errors.marketer && <Text style={styles.errorText}>{errors.marketer}</Text>}
            </View>
          )}
        </View>

        {/* CARD DETAIL PRODUK */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Detail Produk & Pengiriman</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pilih Master Produk <Text style={styles.required}>*</Text></Text>
            {isLoadingMetadata ? (
              <View style={styles.pickerLoading}>
                <ActivityIndicator size="small" color="#023c69" />
                <Text style={styles.pickerLoadingText}>Memuat master produk...</Text>
              </View>
            ) : (
              <View style={[styles.pickerWrapper, errors.product ? styles.inputErrorBorder : null]}>
                <Ionicons name="cube-outline" size={20} color={errors.product ? "#D32F2F" : "#6A7B95"} style={[styles.inputIcon, { marginLeft: 16 }]} />
                <Picker
                  selectedValue={selectedProductId}
                  onValueChange={(val) => handleProductSelect(val as number)}
                  style={styles.picker}
                  dropdownIconColor="#023c69"
                >
                  <Picker.Item label="Pilih dari Master Produk..." value={null} color="#999" />
                  {productList.map(prod => (
                    <Picker.Item key={prod.id} label={`${prod.nama_produk} (Rp ${prod.harga_dasar.toLocaleString('id-ID')})`} value={prod.id} />
                  ))}
                </Picker>
              </View>
            )}
            {errors.product && <Text style={styles.errorText}>{errors.product}</Text>}
          </View>

          {previewFoto && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: previewFoto }} style={styles.previewImage} />
              <View style={styles.previewTextContainer}>
                <Text style={styles.previewName}>{produkNama}</Text>
                <Text style={styles.previewPrice}>Harga Modal: Rp {basePriceNum.toLocaleString('id-ID')}</Text>
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pilih Ekspedisi</Text>
            {isLoadingMetadata ? (
              <View style={styles.pickerLoading}>
                <ActivityIndicator size="small" color="#023c69" />
                <Text style={styles.pickerLoadingText}>Memuat daftar ekspedisi...</Text>
              </View>
            ) : (
              <View style={[styles.pickerWrapper, errors.ekspedisi ? styles.inputErrorBorder : null]}>
                <Ionicons name="bus-outline" size={20} color={errors.ekspedisi ? "#D32F2F" : "#6A7B95"} style={[styles.inputIcon, { marginLeft: 16 }]} />
                <Picker
                  selectedValue={selectedExpeditionId}
                  onValueChange={(val) => handleExpeditionSelect(val as string)}
                  style={styles.picker}
                  dropdownIconColor="#023c69"
                >
                  <Picker.Item label="Input Manual / Lainnya..." value="manual" />
                  {expeditionList.map(e => (
                    <Picker.Item key={e.id} label={e.nama_ekspedisi} value={e.id.toString()} />
                  ))}
                </Picker>
              </View>
            )}
          </View>

          {selectedExpeditionId === 'manual' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nama Ekspedisi Baru</Text>
              <View style={[styles.inputWrapper, errors.ekspedisi ? styles.inputErrorBorder : null]}>
                <Ionicons name="bus-outline" size={20} color={errors.ekspedisi ? "#D32F2F" : "#6A7B95"} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={ekspedisi}
                  onChangeText={(text) => {
                    setEkspedisi(text);
                    if (errors.ekspedisi) setErrors(prev => ({ ...prev, ekspedisi: undefined }));
                  }}
                  placeholder="Misal: JNE REG"
                  placeholderTextColor="#999"
                />
              </View>
              {errors.ekspedisi && <Text style={styles.errorText}>{errors.ekspedisi}</Text>}
            </View>
          )}

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.col]}>
              <Text style={styles.label}>Fee Marketer</Text>
              <View style={[styles.inputWrapper, errors.fee ? styles.inputErrorBorder : null]}>
                <Text style={[styles.currencyPrefix, errors.fee ? styles.errorCurrency : null]}>Rp</Text>
                <TextInput
                  style={[styles.input, { paddingLeft: 4 }]}
                  value={feeMarketer}
                  onChangeText={(text) => {
                    setFeeMarketer(formatRupiah(text));
                    if (errors.fee) setErrors(prev => ({ ...prev, fee: undefined }));
                  }}
                  keyboardType="numeric"
                  placeholder="25.000"
                  placeholderTextColor="#999"
                />
              </View>
              {errors.fee && <Text style={styles.errorText}>{errors.fee}</Text>}
            </View>

            <View style={[styles.inputGroup, styles.col]}>
              <Text style={styles.label}>Ongkos Kirim (Ongkir)</Text>
              <View style={[styles.inputWrapper, errors.ongkir ? styles.inputErrorBorder : null]}>
                <Text style={[styles.currencyPrefix, errors.ongkir ? styles.errorCurrency : null]}>Rp</Text>
                <TextInput
                  style={[styles.input, { paddingLeft: 4 }]}
                  value={ongkir}
                  onChangeText={(text) => {
                    setOngkir(formatRupiah(text));
                    if (errors.ongkir) setErrors(prev => ({ ...prev, ongkir: undefined }));
                  }}
                  keyboardType="numeric"
                  placeholder="15.000 (Opsional)"
                  placeholderTextColor="#999"
                />
              </View>
              {errors.ongkir && <Text style={styles.errorText}>{errors.ongkir}</Text>}
            </View>
          </View>
        </View>

        {/* REAKTIF KALKULATOR CARD */}
        <View style={styles.totalCard}>
          <View style={styles.totalLabelContainer}>
            <Ionicons name="calculator" size={22} color="#1B5E20" />
            <View style={styles.totalTextGroup}>
              <Text style={styles.totalLabel}>Total Tagihan Customer</Text>
              <Text style={styles.totalCalculation}>(Dasar + Fee + Ongkir)</Text>
            </View>
          </View>
          <Text style={styles.totalValue}>Rp {totalHarga.toLocaleString('id-ID')}</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, isSaving ? styles.submitBtnDisabled : null]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#FFF" />
              <Text style={styles.submitBtnText}>{isEdit ? 'Simpan Perubahan' : 'Simpan Pesanan'}</Text>
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

  // Input groups
  inputGroup: { marginBottom: 16 },
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
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { flex: 0.48, marginBottom: 0 },

  // Picker
  pickerWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FC',
    borderRadius: 12, borderWidth: 1, borderColor: '#D2DBE7',
    height: 50, overflow: 'hidden'
  },
  picker: { flex: 1, height: 50, color: '#102A43' },
  pickerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D2DBE7',
    paddingHorizontal: 16,
  },
  pickerLoadingText: {
    color: '#6A7B95',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },

  // Preview Card
  previewContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F7FC',
    padding: 12, borderRadius: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#E5E9F0'
  },
  previewImage: { width: 56, height: 56, borderRadius: 10, marginRight: 12, backgroundColor: '#E0E5EC' },
  previewTextContainer: { flex: 1 },
  previewName: { fontSize: 15, fontWeight: '700', color: '#102A43' },
  previewPrice: { fontSize: 13, color: '#038E5A', fontWeight: '700', marginTop: 4 },

  // Total Card
  totalCard: {
    backgroundColor: '#E8F5E9', marginHorizontal: 24, padding: 18,
    borderRadius: 16, borderWidth: 1, borderColor: '#C8E6C9',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#1B5E20', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  totalLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  totalTextGroup: {
    marginLeft: 10,
  },
  totalLabel: { fontSize: 14, fontWeight: '800', color: '#1B5E20' },
  totalCalculation: { fontSize: 11, color: '#2E7D32', marginTop: 2, fontWeight: '500' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#1B5E20', marginLeft: 10 },

  // Tombol
  submitBtn: {
    flexDirection: 'row', backgroundColor: '#023c69',
    marginHorizontal: 24, marginTop: 25, height: 54,
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#023c69', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#A0B2C6',
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 8 },
});

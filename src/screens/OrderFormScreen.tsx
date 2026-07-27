import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Image, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { getProducts } from '../database/queries/productQueries';
import { insertOrder, updateOrder } from '../database/queries/orderQueries';
import { getMarketers } from '../database/queries/marketerQueries';
import { getCustomers } from '../database/queries/customerQueries';
import { getExpeditions } from '../database/queries/expeditionQueries';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import DropdownPicker from '../components/DropdownPicker';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any, any>;
};

export default function OrderFormScreen({ navigation, route }: Props) {
  const existingOrder = route.params?.order;
  const isEdit = !!existingOrder;
  const isFocused = useIsFocused();

  const [productList, setProductList] = useState<any[]>([]);
  const [marketerList, setMarketerList] = useState<any[]>([]);
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [expeditionList, setExpeditionList] = useState<any[]>([]);

  const [selectedProductId, setSelectedProductId] = useState<number | null>(existingOrder?.produk_id || null);
  const [selectedMarketerId, setSelectedMarketerId] = useState<string | number | null>('manual');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | number | null>('manual');
  const [selectedExpeditionId, setSelectedExpeditionId] = useState<string | number | null>('manual');

  // Form text states
  const [gudangNama, setGudangNama] = useState(existingOrder?.gudang_nama || '');
  const [marketerNama, setMarketerNama] = useState(existingOrder?.marketer_nama || existingOrder?.marketer_cust_nama || '');
  const [customerNama, setCustomerNama] = useState(existingOrder?.customer_nama || '');
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
    customer?: string;
    product?: string;
    fee?: string;
    ekspedisi?: string;
    ongkir?: string;
  }>({});

  // Fetch or refresh products, marketers, customers, and expeditions whenever screen gains focus
  useEffect(() => {
    let isMounted = true;
    async function loadMetadata() {
      try {
        const [prods, mkts, custs, exps] = await Promise.all([
          getProducts(),
          getMarketers(),
          getCustomers(),
          getExpeditions()
        ]);

        if (!isMounted) return;

        setProductList(prods);
        setMarketerList(mkts);
        setCustomerList(custs);
        setExpeditionList(exps);

        // If editing and first load, match existing names with lists
        if (isEdit && isLoadingMetadata) {
          const matchedMkt = mkts.find(m => m.nama_marketer === existingOrder.marketer_nama || m.nama_marketer === existingOrder.marketer_cust_nama);
          if (matchedMkt) {
            setSelectedMarketerId(matchedMkt.id);
            setMarketerNama(matchedMkt.nama_marketer);
          } else {
            setSelectedMarketerId('manual');
          }

          const matchedCust = custs.find(c => c.nama_customer === existingOrder.customer_nama);
          if (matchedCust) {
            setSelectedCustomerId(matchedCust.id);
            setCustomerNama(matchedCust.nama_customer);
          } else {
            setSelectedCustomerId('manual');
          }

          const matchedExp = exps.find(e => e.nama_ekspedisi === existingOrder.ekspedisi_pengirim);
          if (matchedExp) {
            setSelectedExpeditionId(matchedExp.id);
            setEkspedisi(matchedExp.nama_ekspedisi);
          } else {
            setSelectedExpeditionId('manual');
          }
        }
      } catch (err) {
        console.warn("Gagal mengambil metadata:", err);
      } finally {
        if (isMounted) setIsLoadingMetadata(false);
      }
    }

    if (isFocused) {
      loadMetadata();
    }

    return () => {
      isMounted = false;
    };
  }, [isFocused, isEdit, existingOrder]);

  const handleProductSelect = (item: any) => {
    if (!item) {
      setSelectedProductId(null);
      setProdukNama('');
      setHargaProduk('0');
      setPreviewFoto(null);
      return;
    }

    setSelectedProductId(item.id);
    setProdukNama(item.label);
    setHargaProduk(item.harga_dasar.toString());
    setPreviewFoto(item.foto_path || null);
    if (errors.product) setErrors(prev => ({ ...prev, product: undefined }));
  };

  const handleMarketerSelect = (item: any) => {
    if (!item) {
      setSelectedMarketerId('manual');
      setMarketerNama('');
      return;
    }

    setSelectedMarketerId(item.id);
    if (item.id === 'manual') {
      setMarketerNama('');
    } else {
      setMarketerNama(item.label);
    }
    if (errors.marketer) setErrors(prev => ({ ...prev, marketer: undefined }));
  };

  const handleCustomerSelect = (item: any) => {
    if (!item) {
      setSelectedCustomerId('manual');
      setCustomerNama('');
      return;
    }

    setSelectedCustomerId(item.id);
    if (item.id === 'manual') {
      setCustomerNama('');
    } else {
      setCustomerNama(item.label);
    }
    if (errors.customer) setErrors(prev => ({ ...prev, customer: undefined }));
  };

  const handleExpeditionSelect = (item: any) => {
    if (!item) {
      setSelectedExpeditionId('manual');
      setEkspedisi('');
      return;
    }

    setSelectedExpeditionId(item.id);
    if (item.id === 'manual') {
      setEkspedisi('');
    } else {
      setEkspedisi(item.label);
    }
    if (errors.ekspedisi) setErrors(prev => ({ ...prev, ekspedisi: undefined }));
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

      const mktName = marketerNama.trim();
      const custName = customerNama.trim();

      const orderPayload = {
        gudang_nama: gudangNama.trim(),
        marketer_nama: mktName || null,
        customer_nama: custName || null,
        marketer_cust_nama: [mktName, custName].filter(Boolean).join(' - ') || '-',
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

  // Calculations: Fee Marketer MENGURANGI harga barang bagi seller/penjual
  const basePriceNum = parseFloat(hargaProduk) || 0;
  const feeMarketerNum = parseFloat(feeMarketer.replace(/\./g, '')) || 0;
  const ongkirNum = parseFloat(ongkir.replace(/\./g, '')) || 0;

  const totalTagihanCustomer = basePriceNum + ongkirNum;
  const penerimaanBersihSeller = basePriceNum - feeMarketerNum + ongkirNum;

  const formattedProducts = productList.map(p => ({
    id: p.id,
    label: p.nama_produk,
    subLabel: `Rp ${p.harga_dasar.toLocaleString('id-ID')}`,
    harga_dasar: p.harga_dasar,
    foto_path: p.foto_path,
  }));

  const formattedMarketers = marketerList.map(m => ({
    id: m.id,
    label: m.nama_marketer,
    subLabel: m.telepon || m.email || '',
  }));

  const formattedCustomers = customerList.map(c => ({
    id: c.id,
    label: c.nama_customer,
    subLabel: c.telepon || c.alamat || '',
  }));

  const formattedExpeditions = expeditionList.map(e => ({
    id: e.id,
    label: e.nama_ekspedisi,
    subLabel: e.kode_ekspedisi || '',
  }));

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
          <Text style={styles.sectionLabel}>Informasi Toko & Pihak Terkait</Text>

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

          {/* MARKETER DROPDOWN */}
          <DropdownPicker
            label="Pilih Marketer"
            iconName="people-outline"
            items={formattedMarketers}
            selectedValue={selectedMarketerId}
            onSelect={handleMarketerSelect}
            placeholder="Pilih Marketer..."
            isLoading={isLoadingMetadata}
            error={errors.marketer}
            allowManualInput={true}
            manualValue={marketerNama}
            onManualValueChange={(text) => {
              setMarketerNama(text);
              if (errors.marketer) setErrors(prev => ({ ...prev, marketer: undefined }));
            }}
            manualPlaceholder="Nama Marketer Baru..."
          />

          {/* CUSTOMER DROPDOWN */}
          <DropdownPicker
            label="Pilih Customer"
            iconName="person-outline"
            items={formattedCustomers}
            selectedValue={selectedCustomerId}
            onSelect={handleCustomerSelect}
            placeholder="Pilih Customer..."
            isLoading={isLoadingMetadata}
            error={errors.customer}
            allowManualInput={true}
            manualValue={customerNama}
            onManualValueChange={(text) => {
              setCustomerNama(text);
              if (errors.customer) setErrors(prev => ({ ...prev, customer: undefined }));
            }}
            manualPlaceholder="Nama Customer Baru..."
          />
        </View>

        {/* CARD DETAIL PRODUK */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Detail Produk & Pengiriman</Text>

          {/* PRODUCT DROPDOWN */}
          <DropdownPicker
            label="Pilih Master Produk"
            required={true}
            iconName="cube-outline"
            items={formattedProducts}
            selectedValue={selectedProductId}
            onSelect={handleProductSelect}
            placeholder="Pilih dari Master Produk..."
            isLoading={isLoadingMetadata}
            error={errors.product}
            allowManualInput={false}
          />

          {previewFoto && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: previewFoto }} style={styles.previewImage} />
              <View style={styles.previewTextContainer}>
                <Text style={styles.previewName}>{produkNama}</Text>
                <Text style={styles.previewPrice}>Harga Produk: Rp {basePriceNum.toLocaleString('id-ID')}</Text>
              </View>
            </View>
          )}

          {/* EXPEDITION DROPDOWN */}
          <DropdownPicker
            label="Pilih Ekspedisi"
            iconName="bus-outline"
            items={formattedExpeditions}
            selectedValue={selectedExpeditionId}
            onSelect={handleExpeditionSelect}
            placeholder="Pilih Ekspedisi..."
            isLoading={isLoadingMetadata}
            error={errors.ekspedisi}
            allowManualInput={true}
            manualValue={ekspedisi}
            onManualValueChange={(text) => {
              setEkspedisi(text);
              if (errors.ekspedisi) setErrors(prev => ({ ...prev, ekspedisi: undefined }));
            }}
            manualPlaceholder="Nama Ekspedisi Baru..."
          />

          <View style={styles.row}>
            {/* FEE MARKETER WITH HIGHLIGHTED COLOR */}
            <View style={[styles.inputGroup, styles.col]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="pricetag" size={14} color="#E65100" style={{ marginRight: 4 }} />
                <Text style={[styles.label, { color: '#E65100', marginBottom: 0 }]}>Fee Marketer</Text>
              </View>
              <View style={[styles.inputWrapper, styles.feeInputWrapper, errors.fee ? styles.inputErrorBorder : null]}>
                <Text style={[styles.currencyPrefix, { color: '#E65100' }]}>Rp</Text>
                <TextInput
                  style={[styles.input, { paddingLeft: 4, color: '#E65100', fontWeight: '700' }]}
                  value={feeMarketer}
                  onChangeText={(text) => {
                    setFeeMarketer(formatRupiah(text));
                    if (errors.fee) setErrors(prev => ({ ...prev, fee: undefined }));
                  }}
                  keyboardType="numeric"
                  placeholder="25.000"
                  placeholderTextColor="#FFB74D"
                />
              </View>
              <Text style={styles.feeHintText}>*Mengurangi harga bersih produk</Text>
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
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Harga Produk</Text>
            <Text style={styles.totalSubValue}>Rp {basePriceNum.toLocaleString('id-ID')}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: '#E65100' }]}>Fee Marketer (Dipotong)</Text>
            <Text style={[styles.totalSubValue, { color: '#E65100' }]}>- Rp {feeMarketerNum.toLocaleString('id-ID')}</Text>
          </View>
          {ongkirNum > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Ongkos Kirim</Text>
              <Text style={styles.totalSubValue}>+ Rp {ongkirNum.toLocaleString('id-ID')}</Text>
            </View>
          )}
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.totalMainLabel}>Penerimaan Bersih Seller</Text>
              <Text style={styles.totalCalculation}>(Produk - Fee Marketer + Ongkir)</Text>
            </View>
            <Text style={styles.totalValue}>Rp {penerimaanBersihSeller.toLocaleString('id-ID')}</Text>
          </View>
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
  feeInputWrapper: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFB74D',
    borderWidth: 1.5,
  },
  feeHintText: {
    fontSize: 10,
    color: '#E65100',
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 2,
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
    shadowColor: '#1B5E20', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  totalLabel: { fontSize: 13, fontWeight: '600', color: '#2E7D32' },
  totalSubValue: { fontSize: 13, fontWeight: '700', color: '#1B5E20' },
  totalDivider: {
    height: 1,
    backgroundColor: '#A5D6A7',
    marginVertical: 8,
  },
  totalMainLabel: { fontSize: 14, fontWeight: '800', color: '#1B5E20' },
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

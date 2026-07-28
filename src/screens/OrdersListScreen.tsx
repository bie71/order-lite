import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Platform, Modal, ScrollView, Alert, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { deleteOrder, deleteOrdersBulk, getOrdersPaginated } from '../database/queries/orderQueries';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import PinchableImage from '../components/PinchableImage';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const LIMIT = 15;

export default function OrdersListScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Bulk selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // UX states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  const isFocused = useIsFocused();
  const viewShotRef = useRef<any>(null);

  const fetchOrders = useCallback(async (query: string, currentOffset: number, append: boolean) => {
    try {
      const data = await getOrdersPaginated(query, LIMIT, currentOffset);
      if (append) {
        setOrders(prev => [...prev, ...data]);
      } else {
        setOrders(data);
      }
      setHasMore(data.length === LIMIT);
    } catch (e) {
      console.warn("Gagal memuat pesanan:", e);
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      setIsLoading(true);
      setOffset(0);
      setIsSelectionMode(false);
      setSelectedIds([]);
      fetchOrders(searchQuery, 0, false).finally(() => setIsLoading(false));
    }
  }, [isFocused, searchQuery, fetchOrders]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setOffset(0);
    setIsSelectionMode(false);
    setSelectedIds([]);
    await fetchOrders(searchQuery, 0, false);
    setIsRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextOffset = offset + LIMIT;
    setOffset(nextOffset);
    await fetchOrders(searchQuery, nextOffset, true);
    setIsLoadingMore(false);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(item => item !== id);
        if (next.length === 0) setIsSelectionMode(false);
        return next;
      } else {
        return [...prev, id];
      }
    });
  };

  const handleItemLongPress = (id: number) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds([id]);
    }
  };

  const handleItemPress = (item: any) => {
    if (isSelectionMode) {
      toggleSelect(item.id);
    } else {
      setSelectedOrder(item);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
      setIsSelectionMode(false);
    } else {
      setSelectedIds(orders.map(o => o.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      "Konfirmasi Hapus Beberapa",
      `Apakah Anda yakin ingin menghapus ${selectedIds.length} pesanan terpilih?\nTindakan ini tidak dapat dibatalkan.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteOrdersBulk(selectedIds);
              setIsSelectionMode(false);
              setSelectedIds([]);
              Alert.alert("Sukses", "Pesanan terpilih berhasil dihapus.");
              handleRefresh();
            } catch (err: any) {
              console.error(err);
              Alert.alert("Error", `Gagal menghapus pesanan: ${err.message || err}`);
            }
          }
        }
      ]
    );
  };

  const handleExportPNG = async () => {
    try {
      if (!viewShotRef.current) return;
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 0.9,
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Bagikan Resi Pesanan',
        UTI: 'public.png',
      });
    } catch (err: any) {
      console.error("Gagal ekspor gambar:", err);
      Alert.alert("Gagal Ekspor", "Terjadi kesalahan saat memproses gambar resi.");
    }
  };

  const handleDeleteOrder = (id: number, customer: string) => {
    Alert.alert(
      "Konfirmasi Hapus",
      `Apakah Anda yakin ingin menghapus pesanan untuk "${customer}"?\nTindakan ini tidak dapat dibatalkan.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteOrder(id);
              setSelectedOrder(null);
              Alert.alert("Sukses", "Pesanan berhasil dihapus.");
              handleRefresh();
            } catch (err: any) {
              console.error(err);
              Alert.alert("Error", `Gagal menghapus pesanan: ${err.message || err}`);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER SECTION */}
      <View style={styles.header}>
        {isSelectionMode ? (
          <View style={styles.selectionHeaderRow}>
            <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedIds([]); }} style={styles.headerIconBtn}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.selectionHeaderTitle}>{selectedIds.length} Terpilih</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={selectAll} style={styles.headerTextBtn}>
                <Text style={styles.headerTextBtnText}>
                  {selectedIds.length === orders.length ? "Batal Semua" : "Pilih Semua"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBulkDelete} style={[styles.headerIconBtn, { marginLeft: 12 }]}>
                <Ionicons name="trash" size={22} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.headerTitleRow}>
              <Ionicons name="receipt" size={26} color="#FFF" style={styles.headerIcon} />
              <Text style={styles.headerTitle}>Manajemen Pesanan</Text>
            </View>
            <Text style={styles.headerSubtitle}>Tekan lama pada item untuk memilih banyak</Text>

            <View style={styles.searchWrapper}>
              <Ionicons name="search-outline" size={18} color="#D2DBE7" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari produk, toko, atau marketer..."
                placeholderTextColor="#BAC6D5"
                value={searchQuery}
                onChangeText={(text) => setSearchQuery(text)}
                clearButtonMode="while-editing"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={18} color="#BAC6D5" />
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        )}
      </View>

      {/* LIST SECTION */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#023c69" />
          <Text style={styles.loadingText}>Memuat pesanan...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          renderItem={({ item }) => {
            const isSelected = selectedIds.includes(item.id);
            const penerimaanBersih = item.harga_produk - item.fee_marketer + (item.ongkir || 0);
            return (
              <TouchableOpacity
                style={[styles.card, isSelected && styles.selectedCard]}
                activeOpacity={0.75}
                onPress={() => handleItemPress(item)}
                onLongPress={() => handleItemLongPress(item.id)}
              >
                {/* Checkbox for Selection Mode */}
                {isSelectionMode && (
                  <View style={styles.checkboxWrapper}>
                    <Ionicons
                      name={isSelected ? "checkbox" : "square-outline"}
                      size={24}
                      color={isSelected ? "#023c69" : "#BAC6D5"}
                    />
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  {/* Warehouse & Date Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.warehouseGroup}>
                      <Ionicons name="storefront" size={16} color="#023c69" />
                      <Text style={styles.warehouseName} numberOfLines={1}>{item.gudang_nama}</Text>
                    </View>
                    <Text style={styles.orderDate}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: '2-digit'
                      }) : ''}
                    </Text>
                  </View>

                  {/* Customer & Marketer Info with Icons */}
                  <View style={styles.personContainer}>
                    {item.marketer_nama || item.marketer_cust_nama ? (
                      <View style={styles.personRowLine}>
                        <Ionicons name="people" size={15} color="#023c69" style={{ marginRight: 6 }} />
                        <Text style={styles.personRole}>Marketer:</Text>
                        <Text style={styles.personName} numberOfLines={1}>
                          {item.marketer_nama || item.marketer_cust_nama}
                        </Text>
                      </View>
                    ) : null}

                    {item.customer_nama ? (
                      <View style={styles.personRowLine}>
                        <Ionicons name="person" size={15} color="#038E5A" style={{ marginRight: 6 }} />
                        <Text style={[styles.personRole, { color: '#038E5A' }]}>Customer:</Text>
                        <Text style={styles.personName} numberOfLines={1}>
                          {item.customer_nama}
                        </Text>
                      </View>
                    ) : null}

                    {item.catatan ? (
                      <View style={[styles.personRowLine, { marginTop: 2 }]}>
                        <Ionicons name="document-text" size={14} color="#E65100" style={{ marginRight: 6 }} />
                        <Text style={[styles.personRole, { color: '#E65100' }]}>Catatan:</Text>
                        <Text style={[styles.personName, { color: '#D84315', fontStyle: 'italic' }]} numberOfLines={1}>
                          {item.catatan}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.divider} />

                  {/* Product Detail Group */}
                  <View style={styles.productRow}>
                    <View style={styles.productImageWrapper}>
                      {item.items && item.items[0]?.produk_foto_path ? (
                        <Image source={{ uri: item.items[0].produk_foto_path }} style={styles.productImage} />
                      ) : item.produk_foto_path ? (
                        <Image source={{ uri: item.produk_foto_path }} style={styles.productImage} />
                      ) : (
                        <View style={styles.productPlaceholder}>
                          <Ionicons name="cube-outline" size={20} color="#BAC6D5" />
                        </View>
                      )}
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={1}>{item.produk_nama}</Text>
                      {item.items && item.items.length > 1 && (
                        <Text style={{ fontSize: 11, color: '#023c69', fontWeight: '700', marginBottom: 2 }}>
                          {item.items.length} Macam Produk ({item.items.reduce((sum: number, it: any) => sum + (it.jumlah || 1), 0)} Total Item)
                        </Text>
                      )}
                      <Text style={styles.priceBreakdown}>
                        Harga: Rp {item.harga_produk.toLocaleString('id-ID')} | <Text style={{ color: '#E65100' }}>Fee: -Rp {item.fee_marketer.toLocaleString('id-ID')}</Text> {item.ongkir > 0 ? `| Ongkir: Rp ${item.ongkir.toLocaleString('id-ID')}` : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Bottom Row: Expedition & Total */}
                  <View style={styles.cardFooter}>
                    <View style={styles.expeditionBadge}>
                      <Ionicons name="bus-outline" size={13} color="#486581" style={{ marginRight: 4 }} />
                      <Text style={styles.expeditionText}>{item.ekspedisi_pengirim}</Text>
                    </View>
                    <View style={styles.totalGroup}>
                      <Text style={styles.totalLabel}>Penerimaan Bersih</Text>
                      <Text style={styles.totalValue}>Rp {penerimaanBersih.toLocaleString('id-ID')}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#023c69" />
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name={searchQuery ? "search-outline" : "receipt-outline"} size={48} color="#BAC6D5" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? "Tidak Menemukan Pesanan" : "Belum Ada Pesanan"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `Tidak ada pesanan yang cocok dengan pencarian "${searchQuery}".`
                  : "Ketuk tombol + di bawah untuk mencatat pesanan baru Anda."}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB BUTTON */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('OrderForm')}
      >
        <Ionicons name="add" color="#FFF" size={28} />
      </TouchableOpacity>

      {/* DETAIL MODAL (BOTTOM SHEET STYLE) */}
      <Modal
        visible={selectedOrder !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBgDismiss}
            activeOpacity={1}
            onPress={() => setSelectedOrder(null)}
          />
          <View style={styles.modalContent}>
            {/* Drag Handle Indicator */}
            <View style={styles.dragIndicator} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Pesanan</Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={22} color="#5E6E82" />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>

                {/* Wrap receipt details inside ViewShot for image capture */}
                <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }} style={{ backgroundColor: '#FFF', padding: 12, borderRadius: 16 }}>
                  {/* Gudang & Marketer Info Card */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>Informasi Umum</Text>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Gudang / Toko</Text>
                      <Text style={styles.detailValue}>{selectedOrder.gudang_nama}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Marketer</Text>
                      <Text style={styles.detailValue}>{selectedOrder.marketer_nama || selectedOrder.marketer_cust_nama || '-'}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Customer</Text>
                      <Text style={styles.detailValue}>{selectedOrder.customer_nama || '-'}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Ekspedisi Pengiriman</Text>
                      <Text style={styles.detailValue}>{selectedOrder.ekspedisi_pengirim}</Text>
                    </View>

                    {selectedOrder.created_at && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Tanggal Pesanan</Text>
                        <Text style={styles.detailValue}>
                          {new Date(selectedOrder.created_at).toLocaleString('id-ID', {
                            dateStyle: 'long',
                            timeStyle: 'short'
                          })}
                        </Text>
                      </View>
                    )}

                    {selectedOrder.catatan && (
                      <View style={[styles.detailRow, { flexDirection: 'column', alignItems: 'flex-start', marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F4F8' }]}>
                        <Text style={[styles.detailLabel, { color: '#E65100', fontWeight: '700', marginBottom: 2 }]}>Catatan Pesanan:</Text>
                        <Text style={[styles.detailValue, { color: '#D84315', fontWeight: '500', fontStyle: 'italic', textAlign: 'left' }]}>
                          {selectedOrder.catatan}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Product Detail Card (Multi-Product List) */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>
                      Daftar Produk Terpesan ({selectedOrder.items ? selectedOrder.items.length : 1})
                    </Text>
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((prod: any, idx: number) => (
                        <View key={idx} style={[styles.modalProductRow, idx > 0 && { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F4F8' }]}>
                          <View style={styles.modalProductImageWrapper}>
                            {prod.produk_foto_path ? (
                              <TouchableOpacity onPress={() => { setZoomScale(1); setZoomImage(prod.produk_foto_path); }} activeOpacity={0.9} style={{ width: '100%', height: '100%' }}>
                                <Image source={{ uri: prod.produk_foto_path }} style={styles.modalProductImage} />
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.modalProductPlaceholder}>
                                <Ionicons name="cube-outline" size={24} color="#BAC6D5" />
                              </View>
                            )}
                          </View>
                          <View style={styles.modalProductInfo}>
                            <Text style={styles.modalProductName}>{prod.produk_nama}</Text>
                            <Text style={styles.modalProductPrice}>
                              @ Rp {prod.harga_produk.toLocaleString('id-ID')} x {prod.jumlah || 1}
                            </Text>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#038E5A', marginTop: 2 }}>
                              Subtotal: Rp {(prod.subtotal || (prod.harga_produk * (prod.jumlah || 1))).toLocaleString('id-ID')}
                            </Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <View style={styles.modalProductRow}>
                        <View style={styles.modalProductImageWrapper}>
                          {selectedOrder.produk_foto_path ? (
                            <TouchableOpacity onPress={() => { setZoomScale(1); setZoomImage(selectedOrder.produk_foto_path); }} activeOpacity={0.9} style={{ width: '100%', height: '100%' }}>
                              <Image source={{ uri: selectedOrder.produk_foto_path }} style={styles.modalProductImage} />
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.modalProductPlaceholder}>
                              <Ionicons name="cube-outline" size={24} color="#BAC6D5" />
                            </View>
                          )}
                        </View>
                        <View style={styles.modalProductInfo}>
                          <Text style={styles.modalProductName}>{selectedOrder.produk_nama}</Text>
                          <Text style={styles.modalProductPrice}>Harga: Rp {selectedOrder.harga_produk.toLocaleString('id-ID')}</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Calculation Summary */}
                  <View style={[styles.modalSection, { backgroundColor: '#F0F9F4', borderColor: '#D0F0DB', borderWidth: 1 }]}>
                    <Text style={[styles.modalSectionLabel, { color: '#1B5E20' }]}>Rincian Tagihan Seller</Text>
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>Total Harga Produk</Text>
                      <Text style={styles.calcValue}>Rp {selectedOrder.harga_produk.toLocaleString('id-ID')}</Text>
                    </View>
                    <View style={styles.calcRow}>
                      <Text style={[styles.calcLabel, { color: '#E65100' }]}>Fee Marketer (Dipotong)</Text>
                      <Text style={[styles.calcValue, { color: '#E65100' }]}>- Rp {selectedOrder.fee_marketer.toLocaleString('id-ID')}</Text>
                    </View>
                    {selectedOrder.ongkir > 0 && (
                      <View style={styles.calcRow}>
                        <Text style={styles.calcLabel}>Ongkos Kirim (Ongkir)</Text>
                        <Text style={styles.calcValue}>+ Rp {selectedOrder.ongkir.toLocaleString('id-ID')}</Text>
                      </View>
                    )}
                    <View style={styles.calcDivider} />
                    <View style={styles.calcRow}>
                      <Text style={[styles.calcLabel, { fontWeight: '800', color: '#1B5E20' }]}>Penerimaan Bersih Seller</Text>
                      <Text style={[styles.calcValue, { fontWeight: '800', fontSize: 18, color: '#1B5E20' }]}>
                        Rp {(selectedOrder.harga_produk - selectedOrder.fee_marketer + (selectedOrder.ongkir || 0)).toLocaleString('id-ID')}
                      </Text>
                    </View>
                  </View>
                </ViewShot>

                {/* Export Button */}
                <TouchableOpacity
                  style={[styles.modalActionBtn, { backgroundColor: '#E65100', marginTop: 16, marginHorizontal: 6, marginBottom: 4 }]}
                  onPress={handleExportPNG}
                >
                  <Ionicons name="share-social" size={18} color="#FFF" />
                  <Text style={styles.modalActionText}>Ekspor Resi (PNG)</Text>
                </TouchableOpacity>

                {/* Action edit/delete buttons */}
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, styles.modalEditBtn]}
                    onPress={() => {
                      const ord = selectedOrder;
                      setSelectedOrder(null);
                      navigation.navigate('OrderForm', { order: ord });
                    }}
                  >
                    <Ionicons name="pencil" size={18} color="#FFF" />
                    <Text style={styles.modalActionText}>Edit Pesanan</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalActionBtn, styles.modalDeleteBtn]}
                    onPress={() => handleDeleteOrder(selectedOrder.id, selectedOrder.marketer_cust_nama)}
                  >
                    <Ionicons name="trash" size={18} color="#FFF" />
                    <Text style={styles.modalActionText}>Hapus</Text>
                  </TouchableOpacity>
                </View>

              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* IMAGE ZOOM MODAL */}
      <Modal
        visible={zoomImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setZoomImage(null)}
      >
        <View style={styles.zoomOverlay}>
          <TouchableOpacity style={styles.zoomCloseOverlay} activeOpacity={1} onPress={() => setZoomImage(null)} />
          
          <TouchableOpacity style={styles.zoomCloseBtn} onPress={() => setZoomImage(null)}>
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>

          {zoomImage && (
            <View style={{ width: '100%', height: '100%' }}>
              <PinchableImage uri={zoomImage} />
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
    position: "static",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 22,
    backgroundColor: '#023c69',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#BAC6D5',
    marginTop: 2,
    marginBottom: 16,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFF',
    height: '100%',
    fontWeight: '500',
  },
  clearBtn: {
    padding: 4,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6A7B95',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  selectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  selectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    flex: 1,
    marginLeft: 12,
  },
  headerIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTextBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTextBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0F4F8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedCard: {
    borderColor: '#023c69',
    borderWidth: 2,
    backgroundColor: '#F0F4F8',
  },
  checkboxWrapper: {
    marginRight: 12,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  warehouseGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  warehouseName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#023c69',
    marginLeft: 6,
  },
  orderDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8899A6',
  },
  personContainer: {
    marginBottom: 10,
    gap: 4,
  },
  personRowLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personRole: {
    fontSize: 13,
    fontWeight: '700',
    color: '#023c69',
    marginRight: 4,
  },
  personName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#102A43',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F4F8',
    marginBottom: 12,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productImageWrapper: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EAF0F6',
    marginRight: 12,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  productPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F4F7FC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#102A43',
    marginBottom: 2,
  },
  priceBreakdown: {
    fontSize: 12,
    color: '#6A7B95',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EAF0F6',
  },
  expeditionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E4EBF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  expeditionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334E68',
  },
  totalGroup: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8899A6',
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#038E5A',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6EDF8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#023c69',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6A7B95',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    backgroundColor: '#023c69',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#023c69',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(16, 42, 67, 0.4)',
  },
  modalBgDismiss: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '40%',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E9F0',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#F0F4F8',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#023c69',
  },
  closeModalBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F4F7FC',
  },
  modalScrollBody: {
    padding: 24,
  },
  modalSection: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#023c69',
    textTransform: 'uppercase',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
    paddingBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6A7B95',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#102A43',
  },
  modalProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalProductImageWrapper: {
    width: 50,
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EAF0F6',
    marginRight: 12,
  },
  modalProductImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalProductPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F4F7FC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalProductInfo: {
    flex: 1,
  },
  modalProductName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#102A43',
    marginBottom: 4,
  },
  modalProductPrice: {
    fontSize: 13,
    color: '#6A7B95',
    fontWeight: '600',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calcLabel: {
    fontSize: 13,
    color: '#486581',
    fontWeight: '500',
  },
  calcValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#102A43',
  },
  calcDivider: {
    height: 1,
    backgroundColor: '#C8E6C9',
    marginVertical: 10,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 6,
  },
  modalEditBtn: {
    backgroundColor: '#023c69',
  },
  modalDeleteBtn: {
    backgroundColor: '#D32F2F',
  },
  modalActionText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  zoomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomCloseOverlay: {
    ...StyleSheet.absoluteFill,
  },
  zoomCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  zoomScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomImage: {
    width: '100%',
    height: '100%',
    minWidth: 320,
    minHeight: 320,
    aspectRatio: 1,
  },
  zoomControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 30,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  zoomControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  zoomControlText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
});

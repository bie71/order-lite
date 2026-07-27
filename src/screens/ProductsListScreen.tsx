import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, ActivityIndicator, Modal, ScrollView, Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { getProductsPaginated, deleteProduct, deleteProductsBulk } from '../database/queries/productQueries';
import PinchableImage from '../components/PinchableImage';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const LIMIT = 15;

export default function ProductsListScreen({ navigation }: Props) {
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Bulk Selection states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Loading & UX states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  const isFocused = useIsFocused();

  // Load products helper
  const fetchProducts = useCallback(async (query: string, currentOffset: number, append: boolean) => {
    try {
      const data = await getProductsPaginated(query, LIMIT, currentOffset);

      if (append) {
        setProducts(prev => [...prev, ...data]);
      } else {
        setProducts(data);
      }

      setHasMore(data.length === LIMIT);
    } catch (e) {
      console.warn("Gagal memuat produk", e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (isFocused) {
      setIsLoading(true);
      setOffset(0);
      setIsSelectionMode(false);
      setSelectedIds([]);
      fetchProducts(searchQuery, 0, false).finally(() => setIsLoading(false));
    }
  }, [isFocused, searchQuery, fetchProducts]);

  // Handle pull to refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setOffset(0);
    setIsSelectionMode(false);
    setSelectedIds([]);
    await fetchProducts(searchQuery, 0, false);
    setIsRefreshing(false);
  };

  // Handle infinite scroll load more
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const nextOffset = offset + LIMIT;
    setOffset(nextOffset);
    await fetchProducts(searchQuery, nextOffset, true);
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
      setSelectedProduct(item);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
      setIsSelectionMode(false);
    } else {
      setSelectedIds(products.map(p => p.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      "Konfirmasi Hapus Beberapa",
      `Apakah Anda yakin ingin menghapus ${selectedIds.length} produk terpilih?\nTindakan ini tidak dapat dibatalkan.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProductsBulk(selectedIds);
              setIsSelectionMode(false);
              setSelectedIds([]);
              Alert.alert("Sukses", "Produk terpilih berhasil dihapus.");
              handleRefresh();
            } catch (err: any) {
              console.error(err);
              Alert.alert("Error", `Gagal menghapus produk: ${err.message || err}`);
            }
          }
        }
      ]
    );
  };

  const handleDelete = (id: number, nama: string) => {
    Alert.alert(
      "Konfirmasi Hapus",
      `Apakah Anda yakin ingin menghapus produk "${nama}"?\nTindakan ini tidak dapat dibatalkan.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProduct(id);
              setSelectedProduct(null);
              Alert.alert("Sukses", "Produk berhasil dihapus.");
              handleRefresh();
            } catch (err: any) {
              console.error(err);
              Alert.alert("Error", `Gagal menghapus produk: ${err.message || err}`);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* SEARCH BAR HEADER */}
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
                  {selectedIds.length === products.length ? "Batal Semua" : "Pilih Semua"}
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
              <Ionicons name="cube" size={26} color="#FFF" style={styles.headerIcon} />
              <Text style={styles.headerTitle}>Master Produk</Text>
            </View>
            <Text style={styles.headerSubtitle}>Tekan lama pada item untuk memilih banyak</Text>

            <View style={styles.searchWrapper}>
              <Ionicons name="search-outline" size={18} color="#D2DBE7" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari nama produk..."
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

      {/* PRODUCTS LIST */}
      {isLoading && products.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#023c69" />
          <Text style={styles.loadingText}>Memuat produk...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          renderItem={({ item }) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <TouchableOpacity
                style={[styles.card, isSelected && styles.selectedCard]}
                activeOpacity={0.7}
                onPress={() => handleItemPress(item)}
                onLongPress={() => handleItemLongPress(item.id)}
              >
                {isSelectionMode && (
                  <View style={styles.checkboxWrapper}>
                    <Ionicons
                      name={isSelected ? "checkbox" : "square-outline"}
                      size={24}
                      color={isSelected ? "#023c69" : "#BAC6D5"}
                    />
                  </View>
                )}

                <View style={styles.productImageContainer}>
                  {item.foto_path ? (
                    <Image source={{ uri: item.foto_path }} style={styles.productImage} />
                  ) : (
                    <View style={styles.productPlaceholder}>
                      <Ionicons name="image-outline" size={24} color="#8899A6" />
                    </View>
                  )}
                </View>
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={2}>{item.nama_produk}</Text>
                  <Text style={styles.price}>Rp {item.harga_dasar.toLocaleString('id-ID')}</Text>
                </View>
                {!isSelectionMode && <Ionicons name="chevron-forward" size={18} color="#BAC6D5" />}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={60} color="#BAC6D5" />
              <Text style={styles.emptyText}>
                {searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : "Belum ada produk terdaftar."}
              </Text>
            </View>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#023c69" />
              </View>
            ) : null
          }
        />
      )}

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AddProduct')}
      >
        <Ionicons name="add" color="#FFF" size={28} />
      </TouchableOpacity>

      {/* DETAIL MODAL (BOTTOM SHEET STYLE) */}
      <Modal
        visible={selectedProduct !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBgDismiss}
            activeOpacity={1}
            onPress={() => setSelectedProduct(null)}
          />
          <View style={styles.modalContent}>
            {/* Drag Handle Indicator */}
            <View style={styles.dragIndicator} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Produk</Text>
              <TouchableOpacity onPress={() => setSelectedProduct(null)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={22} color="#5E6E82" />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                <View style={styles.modalImageContainer}>
                  {selectedProduct.foto_path ? (
                    <TouchableOpacity onPress={() => { setZoomScale(1); setZoomImage(selectedProduct.foto_path); }} activeOpacity={0.9} style={{ width: '100%', height: '100%' }}>
                      <Image source={{ uri: selectedProduct.foto_path }} style={styles.modalImage} />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.modalImagePlaceholder}>
                      <Ionicons name="image-outline" size={64} color="#BAC6D5" />
                      <Text style={styles.placeholderText}>Tidak Ada Foto Produk</Text>
                    </View>
                  )}
                </View>

                <View style={styles.modalInfoContainer}>
                  <Text style={styles.modalNameLabel}>Nama Produk</Text>
                  <Text style={styles.modalName}>{selectedProduct.nama_produk}</Text>

                  <View style={styles.divider} />

                  <Text style={styles.modalPriceLabel}>Harga Modal / Dasar</Text>
                  <Text style={styles.modalPrice}>Rp {selectedProduct.harga_dasar.toLocaleString('id-ID')}</Text>

                  {selectedProduct.created_at && (
                    <>
                      <View style={styles.divider} />
                      <Text style={styles.modalMetaLabel}>Dibuat Pada</Text>
                      <Text style={styles.modalMetaValue}>
                        {new Date(selectedProduct.created_at).toLocaleString('id-ID', {
                          dateStyle: 'long',
                          timeStyle: 'short'
                        })}
                      </Text>
                    </>
                  )}

                  <View style={styles.divider} />

                  <View style={styles.modalActionsRow}>
                    <TouchableOpacity
                      style={[styles.modalActionBtn, styles.modalEditBtn]}
                      onPress={() => {
                        const prod = selectedProduct;
                        setSelectedProduct(null);
                        navigation.navigate('AddProduct', { product: prod });
                      }}
                    >
                      <Ionicons name="pencil" size={18} color="#FFF" />
                      <Text style={styles.modalActionText}>Edit Produk</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalActionBtn, styles.modalDeleteBtn]}
                      onPress={() => handleDelete(selectedProduct.id, selectedProduct.nama_produk)}
                    >
                      <Ionicons name="trash" size={18} color="#FFF" />
                      <Text style={styles.modalActionText}>Hapus</Text>
                    </TouchableOpacity>
                  </View>
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
    fontSize: 15,
    color: '#FFF',
    height: '100%',
    fontWeight: '500',
  },
  clearBtn: {
    padding: 4,
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
    backgroundColor: '#FFF',
    padding: 12,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0F4F8',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
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
  productImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#EAF0F6',
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
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#102A43',
    marginBottom: 4,
  },
  price: {
    fontSize: 14,
    color: '#038E5A',
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    color: '#8899A6',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 12,
    alignItems: 'center',
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

  // Modal Styles
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
  modalImageContainer: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EAF0F6',
  },
  modalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F4F7FC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    color: '#8899A6',
    fontSize: 13,
    fontWeight: '600',
  },
  modalInfoContainer: {
    width: '100%',
  },
  modalNameLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8899A6',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#102A43',
    lineHeight: 26,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F4F8',
    marginVertical: 16,
  },
  modalPriceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8899A6',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#038E5A',
  },
  modalMetaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8899A6',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalMetaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#486581',
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

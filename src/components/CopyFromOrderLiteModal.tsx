import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, FlatList, TouchableOpacity,
  Image, TextInput, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getProducts } from '../database/queries/productQueries';

type LocalProduct = {
  id: number;
  nama_produk: string;
  harga_dasar: number;
  foto_path: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (product: LocalProduct) => void;
};

export default function CopyFromOrderLiteModal({ visible, onClose, onSelect }: Props) {
  const [localProducts, setLocalProducts] = useState<LocalProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<LocalProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadLocalProducts();
    }
  }, [visible]);

  const loadLocalProducts = async () => {
    setIsLoading(true);
    try {
      const data = await getProducts();
      setLocalProducts(data);
      setFilteredProducts(data);
    } catch (e) {
      console.warn('Gagal memuat produk lokal:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredProducts(localProducts);
    } else {
      const lower = query.toLowerCase();
      setFilteredProducts(
        localProducts.filter(p => p.nama_produk.toLowerCase().includes(lower))
      );
    }
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + Math.round(val).toLocaleString('id-ID');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Salin dari Master Produk OrderLite</Text>
              <Text style={styles.subtitle}>Pilih produk yang ingin ditambahkan ke katalog web</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#999" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari nama produk di OrderLite..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* List Produk */}
          {isLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#023c69" />
              <Text style={{ marginTop: 8, color: '#666', fontSize: 13 }}>Memuat produk...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.centerBox}>
              <Ionicons name="cube-outline" size={48} color="#CCC" />
              <Text style={styles.emptyText}>Tidak ada produk ditemukan di OrderLite</Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.itemCard}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  {item.foto_path ? (
                    <Image source={{ uri: item.foto_path }} style={styles.itemThumb} />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Ionicons name="image-outline" size={22} color="#AAA" />
                    </View>
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.nama_produk}</Text>
                    <Text style={styles.itemPrice}>{formatRupiah(item.harga_dasar)}</Text>
                  </View>
                  <View style={styles.selectBtn}>
                    <Ionicons name="add-circle" size={26} color="#023c69" />
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#023c69',
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#333',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    color: '#888',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E8ECF0',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  itemThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  thumbPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#023c69',
  },
  selectBtn: {
    paddingLeft: 10,
  },
});

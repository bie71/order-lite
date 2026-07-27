import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Platform, Modal, ScrollView, Alert, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { getMarketersPaginated, deleteMarketer, deleteMarketersBulk } from '../database/queries/marketerQueries';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const LIMIT = 15;

export default function MarketersListScreen({ navigation }: Props) {
  const [marketers, setMarketers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Selection Mode states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // UX states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMarketer, setSelectedMarketer] = useState<any | null>(null);

  const isFocused = useIsFocused();

  const fetchMarketers = useCallback(async (query: string, currentOffset: number, append: boolean) => {
    try {
      const data = await getMarketersPaginated(query, LIMIT, currentOffset);
      if (append) {
        setMarketers(prev => [...prev, ...data]);
      } else {
        setMarketers(data);
      }
      setHasMore(data.length === LIMIT);
    } catch (e) {
      console.warn("Gagal memuat marketer:", e);
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      setIsLoading(true);
      setOffset(0);
      setIsSelectionMode(false);
      setSelectedIds([]);
      fetchMarketers(searchQuery, 0, false).finally(() => setIsLoading(false));
    }
  }, [isFocused, searchQuery, fetchMarketers]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setOffset(0);
    setIsSelectionMode(false);
    setSelectedIds([]);
    await fetchMarketers(searchQuery, 0, false);
    setIsRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextOffset = offset + LIMIT;
    setOffset(nextOffset);
    await fetchMarketers(searchQuery, nextOffset, true);
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
      setSelectedMarketer(item);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === marketers.length) {
      setSelectedIds([]);
      setIsSelectionMode(false);
    } else {
      setSelectedIds(marketers.map(m => m.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      "Konfirmasi Hapus Beberapa",
      `Apakah Anda yakin ingin menghapus ${selectedIds.length} marketer terpilih?\nTindakan ini tidak dapat dibatalkan.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMarketersBulk(selectedIds);
              setIsSelectionMode(false);
              setSelectedIds([]);
              Alert.alert("Sukses", "Marketer terpilih berhasil dihapus.");
              handleRefresh();
            } catch (err: any) {
              console.error(err);
              Alert.alert("Error", `Gagal menghapus marketer: ${err.message || err}`);
            }
          }
        }
      ]
    );
  };

  const handleDeleteMarketer = (id: number, name: string) => {
    Alert.alert(
      "Konfirmasi Hapus",
      `Apakah Anda yakin ingin menghapus marketer "${name}"?\nTindakan ini tidak dapat dibatalkan.`,
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Hapus", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteMarketer(id);
              setSelectedMarketer(null);
              Alert.alert("Sukses", "Marketer berhasil dihapus.");
              handleRefresh();
            } catch (err: any) {
              console.error(err);
              Alert.alert("Error", `Gagal menghapus marketer: ${err.message || err}`);
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
                  {selectedIds.length === marketers.length ? "Batal Semua" : "Pilih Semua"}
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
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#FFF" />
              </TouchableOpacity>
              <Ionicons name="people" size={26} color="#FFF" style={styles.headerIcon} />
              <Text style={styles.headerTitle}>Daftar Marketer</Text>
            </View>
            <Text style={styles.headerSubtitle}>Tekan lama pada item untuk memilih banyak</Text>

            <View style={styles.searchWrapper}>
              <Ionicons name="search-outline" size={18} color="#D2DBE7" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari nama, email, atau telepon..."
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
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      ) : (
        <FlatList
          data={marketers}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#023c69" />
            </View>
          ) : null}
          renderItem={({ item }) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <TouchableOpacity 
                style={[styles.card, isSelected && styles.selectedCard]}
                activeOpacity={0.75}
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

                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{item.nama_marketer.substring(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={styles.marketerInfo}>
                      <Text style={styles.marketerName} numberOfLines={1}>{item.nama_marketer}</Text>
                      <Text style={styles.marketerEmail} numberOfLines={1}>
                        {item.email || 'Email tidak tersedia'}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name={searchQuery ? "search-outline" : "people-outline"} size={48} color="#BAC6D5" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? "Tidak Menemukan Marketer" : "Belum Ada Marketer"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery 
                  ? `Tidak ada marketer yang cocok dengan "${searchQuery}".` 
                  : "Ketuk tombol + di bawah untuk menambahkan marketer baru."}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB BUTTON */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AddMarketer')}
      >
        <Ionicons name="add" color="#FFF" size={28} />
      </TouchableOpacity>

      {/* DETAIL MODAL (BOTTOM SHEET STYLE) */}
      <Modal
        visible={selectedMarketer !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedMarketer(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBgDismiss} 
            activeOpacity={1} 
            onPress={() => setSelectedMarketer(null)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.dragIndicator} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Marketer</Text>
              <TouchableOpacity onPress={() => setSelectedMarketer(null)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={22} color="#5E6E82" />
              </TouchableOpacity>
            </View>

            {selectedMarketer && (
              <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Informasi Kontak</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Nama Lengkap</Text>
                    <Text style={styles.detailValue}>{selectedMarketer.nama_marketer}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Alamat Email</Text>
                    <Text style={styles.detailValue}>{selectedMarketer.email || '-'}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>No. Telepon / WhatsApp</Text>
                    <Text style={styles.detailValue}>{selectedMarketer.telepon || '-'}</Text>
                  </View>
                </View>

                {/* Action buttons */}
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity 
                    style={[styles.modalActionBtn, styles.modalEditBtn]} 
                    onPress={() => {
                      const mkt = selectedMarketer;
                      setSelectedMarketer(null);
                      navigation.navigate('AddMarketer', { marketer: mkt });
                    }}
                  >
                    <Ionicons name="pencil" size={18} color="#FFF" />
                    <Text style={styles.modalActionText}>Edit Marketer</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalActionBtn, styles.modalDeleteBtn]} 
                    onPress={() => handleDeleteMarketer(selectedMarketer.id, selectedMarketer.nama_marketer)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
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
  backBtn: {
    marginRight: 12,
    padding: 4,
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F4F8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E6EDF8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#023c69',
  },
  marketerInfo: {
    flex: 1,
  },
  marketerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#102A43',
    marginBottom: 2,
  },
  marketerEmail: {
    fontSize: 12,
    color: '#6A7B95',
    fontWeight: '500',
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
});

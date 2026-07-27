import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Platform, Modal, ScrollView, Alert, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { getExpeditionsPaginated, deleteExpedition } from '../database/queries/expeditionQueries';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const LIMIT = 15;

export default function ExpeditionsListScreen({ navigation }: Props) {
  const [expeditions, setExpeditions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // UX states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedExpedition, setSelectedExpedition] = useState<any | null>(null);

  const isFocused = useIsFocused();

  const fetchExpeditions = useCallback(async (query: string, currentOffset: number, append: boolean) => {
    try {
      const data = await getExpeditionsPaginated(query, LIMIT, currentOffset);
      if (append) {
        setExpeditions(prev => [...prev, ...data]);
      } else {
        setExpeditions(data);
      }
      setHasMore(data.length === LIMIT);
    } catch (e) {
      console.warn("Gagal memuat ekspedisi:", e);
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      setIsLoading(true);
      setOffset(0);
      fetchExpeditions(searchQuery, 0, false).finally(() => setIsLoading(false));
    }
  }, [isFocused, searchQuery, fetchExpeditions]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setOffset(0);
    await fetchExpeditions(searchQuery, 0, false);
    setIsRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextOffset = offset + LIMIT;
    setOffset(nextOffset);
    await fetchExpeditions(searchQuery, nextOffset, true);
    setIsLoadingMore(false);
  };

  const handleDeleteExpedition = (id: number, name: string) => {
    Alert.alert(
      "Konfirmasi Hapus",
      `Apakah Anda yakin ingin menghapus ekspedisi "${name}"?\nTindakan ini tidak dapat dibatalkan.`,
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Hapus", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteExpedition(id);
              setSelectedExpedition(null);
              Alert.alert("Sukses", "Ekspedisi berhasil dihapus.");
              handleRefresh();
            } catch (err: any) {
              console.error(err);
              Alert.alert("Error", `Gagal menghapus ekspedisi: ${err.message || err}`);
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
        <View style={styles.headerTitleRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Ionicons name="bus" size={26} color="#FFF" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Daftar Ekspedisi</Text>
        </View>
        <Text style={styles.headerSubtitle}>Kelola opsi ekspedisi pengiriman pesanan</Text>

        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color="#D2DBE7" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama atau kode ekspedisi..."
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
      </View>

      {/* LIST SECTION */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#023c69" />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      ) : (
        <FlatList
          data={expeditions}
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
            return (
              <TouchableOpacity 
                style={styles.card}
                activeOpacity={0.75}
                onPress={() => setSelectedExpedition(item)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.avatarCircle}>
                    <Ionicons name="bus-outline" size={20} color="#023c69" />
                  </View>
                  <View style={styles.expeditionInfo}>
                    <Text style={styles.expeditionName} numberOfLines={1}>{item.nama_ekspedisi}</Text>
                    <Text style={styles.expeditionCode} numberOfLines={1}>
                      Kode: {item.kode_ekspedisi || 'Tidak ada kode'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#BAC6D5" />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name={searchQuery ? "search-outline" : "bus-outline"} size={48} color="#BAC6D5" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? "Tidak Menemukan Ekspedisi" : "Belum Ada Ekspedisi"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery 
                  ? `Tidak ada ekspedisi yang cocok dengan "${searchQuery}".` 
                  : "Ketuk tombol + di bawah untuk menambahkan ekspedisi baru."}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB BUTTON */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AddExpedition')}
      >
        <Ionicons name="add" color="#FFF" size={28} />
      </TouchableOpacity>

      {/* DETAIL MODAL (BOTTOM SHEET STYLE) */}
      <Modal
        visible={selectedExpedition !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedExpedition(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBgDismiss} 
            activeOpacity={1} 
            onPress={() => setSelectedExpedition(null)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.dragIndicator} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Ekspedisi</Text>
              <TouchableOpacity onPress={() => setSelectedExpedition(null)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={22} color="#5E6E82" />
              </TouchableOpacity>
            </View>

            {selectedExpedition && (
              <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>Informasi Ekspedisi</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Nama Ekspedisi</Text>
                    <Text style={styles.detailValue}>{selectedExpedition.nama_ekspedisi}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Kode Ekspedisi</Text>
                    <Text style={styles.detailValue}>{selectedExpedition.kode_ekspedisi || '-'}</Text>
                  </View>
                </View>

                {/* Action buttons */}
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity 
                    style={[styles.modalActionBtn, styles.modalEditBtn]} 
                    onPress={() => {
                      const exp = selectedExpedition;
                      setSelectedExpedition(null);
                      navigation.navigate('AddExpedition', { expedition: exp });
                    }}
                  >
                    <Ionicons name="pencil" size={18} color="#FFF" />
                    <Text style={styles.modalActionText}>Edit Ekspedisi</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalActionBtn, styles.modalDeleteBtn]} 
                    onPress={() => handleDeleteExpedition(selectedExpedition.id, selectedExpedition.nama_ekspedisi)}
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
  card: {
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
  expeditionInfo: {
    flex: 1,
  },
  expeditionName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#102A43',
    marginBottom: 2,
  },
  expeditionCode: {
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

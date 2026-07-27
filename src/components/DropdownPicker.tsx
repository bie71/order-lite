import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, FlatList,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type DropdownItem = {
  id: string | number;
  label: string;
  subLabel?: string;
  [key: string]: any;
};

type DropdownPickerProps = {
  label: string;
  required?: boolean;
  iconName: any;
  items: DropdownItem[];
  selectedValue: string | number | null;
  onSelect: (item: DropdownItem | null) => void;
  placeholder: string;
  isLoading?: boolean;
  error?: string;
  allowManualInput?: boolean;
  manualValue?: string;
  onManualValueChange?: (val: string) => void;
  manualPlaceholder?: string;
};

export default function DropdownPicker({
  label,
  required,
  iconName,
  items,
  selectedValue,
  onSelect,
  placeholder,
  isLoading,
  error,
  allowManualInput = true,
  manualValue = '',
  onManualValueChange,
  manualPlaceholder = 'Input Manual / Lainnya...',
}: DropdownPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedItem = items.find(i => i.id === selectedValue);

  let displayLabel = placeholder;
  if (selectedValue === 'manual') {
    displayLabel = 'Input Manual';
  } else if (selectedItem) {
    displayLabel = selectedItem.label;
  }

  const filteredItems = items.filter(i =>
    i.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.subLabel && i.subLabel.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>

      {isLoading ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="small" color="#023c69" />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.pickerTrigger, error ? styles.inputErrorBorder : null]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name={iconName} size={20} color={error ? "#D32F2F" : "#6A7B95"} style={styles.inputIcon} />
          <Text style={[styles.triggerText, !selectedItem && selectedValue !== 'manual' && styles.placeholderText]} numberOfLines={1}>
            {displayLabel}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#023c69" />
        </TouchableOpacity>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* MANUAL INPUT FIELD IF SELECTED */}
      {selectedValue === 'manual' && allowManualInput && onManualValueChange && (
        <View style={{ marginTop: 10 }}>
          <View style={[styles.manualInputWrapper, error ? styles.inputErrorBorder : null]}>
            <Ionicons name="pencil-outline" size={18} color="#6A7B95" style={styles.inputIcon} />
            <TextInput
              style={styles.manualInput}
              value={manualValue}
              onChangeText={onManualValueChange}
              placeholder={manualPlaceholder}
              placeholderTextColor="#999"
            />
          </View>
        </View>
      )}

      {/* SELECT MODAL */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.dismissOverlay} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.dragIndicator} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih {label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#5E6E82" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrapper}>
              <Ionicons name="search-outline" size={18} color="#999" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#999" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* List with max 5 items visible height before scrolling */}
            <View style={styles.listContainer}>
              <FlatList
                data={filteredItems}
                keyExtractor={(item) => item.id.toString()}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={allowManualInput ? (
                  <TouchableOpacity
                    style={[styles.listItem, selectedValue === 'manual' && styles.selectedListItem]}
                    onPress={() => {
                      onSelect({ id: 'manual', label: 'Input Manual' });
                      setModalVisible(false);
                      setSearchQuery('');
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color="#023c69" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listItemText, selectedValue === 'manual' && styles.selectedListItemText]}>
                        Input Manual / Lainnya...
                      </Text>
                    </View>
                    {selectedValue === 'manual' && <Ionicons name="checkmark-circle" size={20} color="#023c69" />}
                  </TouchableOpacity>
                ) : null}
                renderItem={({ item }) => {
                  const isSelected = item.id === selectedValue;
                  return (
                    <TouchableOpacity
                      style={[styles.listItem, isSelected && styles.selectedListItem]}
                      onPress={() => {
                        onSelect(item);
                        setModalVisible(false);
                        setSearchQuery('');
                      }}
                    >
                      <Ionicons name={iconName} size={20} color={isSelected ? "#023c69" : "#6A7B95"} style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.listItemText, isSelected && styles.selectedListItemText]} numberOfLines={1}>
                          {item.label}
                        </Text>
                        {item.subLabel ? (
                          <Text style={styles.listItemSubText} numberOfLines={1}>
                            {item.subLabel}
                          </Text>
                        ) : null}
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color="#023c69" />}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyItem}>
                    <Text style={styles.emptyText}>Tidak ada data yang cocok</Text>
                  </View>
                }
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const ITEM_HEIGHT = 56;
const MAX_VISIBLE_ITEMS = 5;

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#334D6E', marginBottom: 6 },
  required: { color: '#D32F2F' },
  loadingWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FC',
    borderRadius: 12, borderWidth: 1, borderColor: '#D2DBE7',
    paddingHorizontal: 16, height: 50,
  },
  loadingText: { color: '#6A7B95', fontSize: 14, fontWeight: '500', marginLeft: 10 },
  pickerTrigger: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FC',
    borderRadius: 12, borderWidth: 1, borderColor: '#D2DBE7',
    paddingHorizontal: 16, height: 50,
  },
  inputErrorBorder: { borderColor: '#D32F2F', backgroundColor: '#FFEBEE' },
  inputIcon: { marginRight: 10 },
  triggerText: { flex: 1, fontSize: 15, color: '#102A43', fontWeight: '500' },
  placeholderText: { color: '#999' },
  errorText: { color: '#D32F2F', fontSize: 12, fontWeight: '600', marginTop: 6, marginLeft: 4 },
  manualInputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FC',
    borderRadius: 12, borderWidth: 1, borderColor: '#D2DBE7',
    paddingHorizontal: 16, height: 50,
  },
  manualInput: { flex: 1, fontSize: 15, color: '#102A43', height: '100%', fontWeight: '500' },

  // Modal styles
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16, 42, 67, 0.4)' },
  dismissOverlay: { flex: 1 },
  modalContent: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 30, maxHeight: '80%', shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10,
  },
  dragIndicator: {
    width: 40, height: 5, backgroundColor: '#E5E9F0', borderRadius: 3,
    alignSelf: 'center', marginTop: 10,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderColor: '#F0F4F8',
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#023c69' },
  closeBtn: { padding: 6, borderRadius: 20, backgroundColor: '#F4F7FC' },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F7FC',
    marginHorizontal: 20, marginTop: 12, marginBottom: 12, borderRadius: 10,
    paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: '#E5E9F0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#102A43', height: '100%' },
  
  // List container limited to ~5 items height before scrolling
  listContainer: {
    maxHeight: ITEM_HEIGHT * MAX_VISIBLE_ITEMS,
    paddingHorizontal: 20,
  },
  listItem: {
    flexDirection: 'row', alignItems: 'center', height: ITEM_HEIGHT,
    paddingHorizontal: 12, borderRadius: 10, borderBottomWidth: 1, borderBottomColor: '#F8F9FC',
  },
  selectedListItem: { backgroundColor: '#E6EDF8' },
  listItemText: { fontSize: 14, fontWeight: '600', color: '#102A43' },
  selectedListItemText: { color: '#023c69', fontWeight: '800' },
  listItemSubText: { fontSize: 12, color: '#6A7B95', marginTop: 2 },
  emptyItem: { paddingVertical: 30, alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 14, fontWeight: '500' },
});

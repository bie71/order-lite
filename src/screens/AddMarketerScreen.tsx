import React, { useState } from 'react';
import { 
  View, Text, TextInput, StyleSheet, TouchableOpacity, 
  ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { insertMarketer, updateMarketer } from '../database/queries/marketerQueries';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any, any>;
};

export default function AddMarketerScreen({ navigation, route }: Props) {
  const existingMarketer = route.params?.marketer;
  const isEdit = !!existingMarketer;

  const [namaMarketer, setNamaMarketer] = useState(existingMarketer?.nama_marketer || '');
  const [email, setEmail] = useState(existingMarketer?.email || '');
  const [telepon, setTelepon] = useState(existingMarketer?.telepon || '');

  // Validation & Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
  }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!namaMarketer.trim()) {
      newErrors.name = "Nama marketer harus diisi.";
    }
    if (email.trim() && !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Format email tidak valid.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const payload = {
        nama_marketer: namaMarketer.trim(),
        email: email.trim() || null,
        telepon: telepon.trim() || null,
      };

      if (isEdit) {
        await updateMarketer(existingMarketer.id, payload);
      } else {
        await insertMarketer(payload);
      }

      Alert.alert(
        "Sukses", 
        `Marketer berhasil ${isEdit ? 'diperbarui' : 'ditambahkan'}.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      console.error(err);
      Alert.alert("Gagal Menyimpan", `Terjadi kesalahan:\n${err.message || err}`);
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
        
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Ionicons name={isEdit ? "create" : "add-circle"} size={26} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.headerTitle}>{isEdit ? 'Edit Marketer' : 'Tambah Marketer'}</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {isEdit ? 'Perbarui informasi detail marketer Anda' : 'Masukkan informasi marketer baru dengan benar'}
            </Text>
          </View>
        </View>

        {/* FORM CARD */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Data Marketer</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Lengkap <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputWrapper, errors.name ? styles.inputErrorBorder : null]}>
              <Ionicons name="person-outline" size={20} color={errors.name ? "#D32F2F" : "#6A7B95"} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={namaMarketer} 
                onChangeText={(text) => {
                  setNamaMarketer(text);
                  if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                }} 
                placeholder="Misal: Budi Handoko" 
                placeholderTextColor="#999"
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Alamat Email</Text>
            <View style={[styles.inputWrapper, errors.email ? styles.inputErrorBorder : null]}>
              <Ionicons name="mail-outline" size={20} color={errors.email ? "#D32F2F" : "#6A7B95"} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={email} 
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }} 
                placeholder="Misal: budi@gmail.com" 
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>No. Telepon / WA</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color="#6A7B95" style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={telepon} 
                onChangeText={(text) => setTelepon(text)} 
                placeholder="Misal: 081234567890" 
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* SUBMIT BUTTON */}
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
              <Text style={styles.submitBtnText}>
                {isEdit ? 'Simpan Perubahan' : 'Simpan Marketer'}
              </Text>
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
  input: { flex: 1, fontSize: 15, color: '#102A43', height: '100%', fontWeight: '500' },
  errorText: { color: '#D32F2F', fontSize: 12, fontWeight: '600', marginTop: 6, marginLeft: 4 },

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

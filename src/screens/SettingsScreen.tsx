import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ActivityIndicator, Alert, ScrollView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  configureGoogleSignIn, signInWithGoogle, signOutGoogle, 
  backupToGDrive, restoreFromGDrive 
} from '../utils/gdriveBackup';

export default function SettingsScreen({ navigation }: { navigation: any }) {
  // State untuk melacak status Login Google dan proses Loading
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState('Belum pernah dicadangkan');

  // Initialize Google SDK on component mount
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const res = await signInWithGoogle();
      setIsSignedIn(true);
      setUserEmail(res.email);
      setAccessToken(res.accessToken);
      Alert.alert("Login Sukses", "Berhasil terhubung dengan akun Google Drive Anda.");
    } catch (err: any) {
      console.error(err);
      Alert.alert("Gagal Login", `Terjadi kesalahan saat masuk dengan Google:\n${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOutGoogle();
      setIsSignedIn(false);
      setUserEmail('');
      setAccessToken('');
      Alert.alert("Keluar Sukses", "Sesi login akun Google Anda telah diakhiri.");
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackup = () => {
    if (!isSignedIn || !accessToken) {
      Alert.alert("Perhatian", "Anda harus masuk dengan akun Google terlebih dahulu.");
      return;
    }

    Alert.alert(
      "Konfirmasi Backup", 
      "File database SQLite pesanan dan master data akan ditimpa ke Google Drive Anda. Lanjutkan?",
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Ya, Backup Sekarang", 
          onPress: async () => {
            setIsLoading(true);
            try {
              const time = await backupToGDrive(accessToken);
              setLastBackup(time);
              Alert.alert("Sukses", "Data database SQLite berhasil diamankan ke Google Drive!");
            } catch (err: any) {
              console.error(err);
              Alert.alert("Gagal Backup", `Gagal mengunggah cadangan ke Google Drive:\n${err.message || err}`);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRestore = () => {
    if (!isSignedIn || !accessToken) {
      Alert.alert("Perhatian", "Anda harus masuk dengan akun Google terlebih dahulu.");
      return;
    }

    Alert.alert(
      "Peringatan Restore", 
      "Proses ini akan menimpa seluruh database lokal saat ini dengan database dari Google Drive. Lanjutkan?",
      [
        { text: "Batal", style: "cancel" },
        { 
          text: "Ya, Pulihkan Data", 
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            try {
              await restoreFromGDrive(accessToken);
              Alert.alert(
                "Sukses Pulihkan", 
                "Data database berhasil dipulihkan dari Google Drive. Silakan muat ulang aplikasi Anda agar database baru aktif.",
                [{ text: "OK" }]
              );
            } catch (err: any) {
              console.error(err);
              Alert.alert("Gagal Restore", `Gagal memulihkan cadangan dari Google Drive:\n${err.message || err}`);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Ionicons name="settings" size={26} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Pengaturan & Sinkronisasi</Text>
        </View>
        <Text style={styles.headerSubtitle}>Amankan data OrderLite Anda ke Cloud</Text>
      </View>

      {/* CARD AKUN GOOGLE */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="logo-google" size={24} color="#DB4437" />
          <Text style={styles.cardTitle}>Akun Google Drive</Text>
        </View>

        {isSignedIn ? (
          <View style={styles.accountInfo}>
            <Text style={styles.accountEmail}>{userEmail}</Text>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Keluar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.cardDescription}>
              Hubungkan akun Google Anda untuk mengaktifkan fitur Backup & Restore secara gratis.
            </Text>
            <TouchableOpacity style={styles.loginBtn} onPress={handleGoogleLogin} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.loginBtnText}>Masuk dengan Google</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* CARD SINKRONISASI (Tampil jika sudah login) */}
      <View style={[styles.card, !isSignedIn && styles.cardDisabled]}>
        <Text style={styles.cardTitle}>Manajemen Data Cloud</Text>
        <Text style={styles.lastBackupText}>Terakhir dicadangkan: {lastBackup}</Text>

        <TouchableOpacity 
          style={[styles.actionBtn, styles.backupBtn]} 
          onPress={handleBackup} 
          disabled={isLoading || !isSignedIn}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
          <Text style={styles.actionBtnText}>Backup Data Sekarang</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, styles.restoreBtn]} 
          onPress={handleRestore} 
          disabled={isLoading || !isSignedIn}
        >
          <Ionicons name="cloud-download-outline" size={20} color="#FFF" />
          <Text style={styles.actionBtnText}>Pulihkan Data (Restore)</Text>
        </TouchableOpacity>
        
        {!isSignedIn && (
          <View style={styles.overlay}>
             <Text style={styles.overlayText}>Silakan login terlebih dahulu</Text>
          </View>
        )}
      </View>

      {/* CARD MASTER DATA */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="grid-outline" size={24} color="#023c69" />
          <Text style={[styles.cardTitle, { color: '#023c69' }]}>Manajemen Master Data</Text>
        </View>
        <Text style={[styles.cardDescription, { marginBottom: 12 }]}>
          Kelola entitas pendukung untuk pemesanan seperti daftar marketer eksternal dan kurir ekspedisi.
        </Text>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#023c69' }]} 
          onPress={() => navigation.navigate('MarketersList')}
        >
          <Ionicons name="people-outline" size={20} color="#FFF" />
          <Text style={styles.actionBtnText}>Kelola Marketer</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#023c69', marginBottom: 0 }]} 
          onPress={() => navigation.navigate('ExpeditionsList')}
        >
          <Ionicons name="bus-outline" size={20} color="#FFF" />
          <Text style={styles.actionBtnText}>Kelola Ekspedisi</Text>
        </TouchableOpacity>
      </View>
      
      {/* Loading Overlay Global */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Mohon Tunggu...</Text>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 24, paddingTop: Platform.OS === 'ios' ? 24 : 40, paddingBottom: 22, backgroundColor: '#023c69', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  headerSubtitle: { fontSize: 13, color: '#BAC6D5', marginTop: 4 },
  
  card: {
    backgroundColor: '#FFF', marginHorizontal: 20, marginTop: 20,
    borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    overflow: 'hidden'
  },
  cardDisabled: { opacity: 0.7 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginLeft: 10 },
  cardDescription: { fontSize: 14, color: '#666', lineHeight: 22, marginBottom: 16 },
  
  loginBtn: { backgroundColor: '#4285F4', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  loginBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  
  accountInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  accountEmail: { fontSize: 16, fontWeight: '600', color: '#333' },
  logoutBtn: { backgroundColor: '#FFEBEE', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: '#D32F2F', fontWeight: 'bold' },

  lastBackupText: { fontSize: 13, color: '#888', marginBottom: 20, marginTop: 4 },
  
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, marginBottom: 12 },
  actionBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  backupBtn: { backgroundColor: '#34A853' },
  restoreBtn: { backgroundColor: '#FF9800' },

  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 10
  },
  overlayText: { fontWeight: 'bold', color: '#666' },

  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 999
  },
  loadingText: { marginTop: 12, fontSize: 16, fontWeight: 'bold', color: '#4285F4' }
});

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Linking, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { testGitHubConnection } from '../services/githubCatalogService';
import { getCatalogConfig, saveCatalogConfig } from '../database/queries/catalogQueries';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

export default function WebCatalogConfigModal({ visible, onClose, onSaved }: Props) {
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState('bie71/sahla-store');
  const [branch, setBranch] = useState('main');
  const [catalogUrl, setCatalogUrl] = useState('https://sahla-store.vercel.app');
  const [showToken, setShowToken] = useState(false);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      loadConfig();
    }
  }, [visible]);

  const loadConfig = async () => {
    try {
      const cfg = await getCatalogConfig();
      if (cfg) {
        setToken(cfg.github_token || '');
        setRepo(cfg.github_repo || 'bie71/sahla-store');
        setBranch(cfg.github_branch || 'main');
        setCatalogUrl(cfg.catalog_url || 'https://sahla-store.vercel.app');
      }
      setTestResult(null);
    } catch (e) {
      console.warn('Gagal memuat konfigurasi katalog:', e);
    }
  };

  const handleTestConnection = async () => {
    if (!token.trim()) {
      Alert.alert('Perhatian', 'Silakan masukkan GitHub Personal Access Token (PAT) terlebih dahulu.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testGitHubConnection(token, repo);
    setIsTesting(false);

    if (res.success) {
      setTestResult({
        success: true,
        message: `Terhubung sebagai @${res.username}. Repositori "${res.repoName}" siap ditulis!`
      });
    } else {
      setTestResult({
        success: false,
        message: res.error || 'Gagal terhubung ke repositori.'
      });
    }
  };

  const handleSave = async () => {
    if (!token.trim()) {
      Alert.alert('Perhatian', 'Token GitHub tidak boleh kosong.');
      return;
    }
    if (!repo.trim() || !repo.includes('/')) {
      Alert.alert('Perhatian', 'Format repositori harus username/nama-repo (contoh: bie71/sahla-store).');
      return;
    }

    try {
      await saveCatalogConfig(token, repo, branch, catalogUrl);
      Alert.alert('Sukses', 'Pengaturan GitHub PAT web katalog berhasil disimpan!');
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', `Gagal menyimpan pengaturan: ${err.message}`);
    }
  };

  const handleOpenGitHubTokens = () => {
    Linking.openURL('https://github.com/settings/tokens');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="logo-github" size={26} color="#023c69" style={{ marginRight: 10 }} />
              <Text style={styles.title}>Pengaturan GitHub PAT</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              Hubungkan OrderLite ke repositori web katalog Sahla Store agar perubahan produk & banner bisa langsung dipublikasikan ke Vercel via GitHub API.
            </Text>

            {/* Input Token PAT */}
            <View style={styles.formGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.label}>GitHub Personal Access Token (PAT) *</Text>
                <TouchableOpacity onPress={handleOpenGitHubTokens}>
                  <Text style={styles.linkText}>Buat Token Baru ↗</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputWithIcon}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  placeholderTextColor="#999"
                  value={token}
                  onChangeText={setToken}
                  secureTextEntry={!showToken}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => setShowToken(!showToken)}
                >
                  <Ionicons name={showToken ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
                </TouchableOpacity>
              </View>
              <Text style={styles.hintText}>
                Gunakan token klasik dengan centang hak akses <Text style={{ fontWeight: 'bold' }}>repo</Text> atau fine-grained dengan akses <Text style={{ fontWeight: 'bold' }}>Contents: Read and write</Text>.
              </Text>
            </View>

            {/* Input Repository */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nama Repositori GitHub *</Text>
              <TextInput
                style={styles.input}
                placeholder="bie71/sahla-store"
                placeholderTextColor="#999"
                value={repo}
                onChangeText={setRepo}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.hintText}>Format: username/nama-repo</Text>
            </View>

            {/* Input Branch */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nama Branch *</Text>
              <TextInput
                style={styles.input}
                placeholder="main"
                placeholderTextColor="#999"
                value={branch}
                onChangeText={setBranch}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Input URL Live Web */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>URL Web Katalog (Live di Vercel)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://sahla-store.vercel.app"
                placeholderTextColor="#999"
                value={catalogUrl}
                onChangeText={setCatalogUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Test Connection Button */}
            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTestConnection}
              disabled={isTesting}
            >
              {isTesting ? (
                <ActivityIndicator size="small" color="#023c69" />
              ) : (
                <>
                  <Ionicons name="flash-outline" size={18} color="#023c69" style={{ marginRight: 6 }} />
                  <Text style={styles.testBtnText}>Tes Koneksi & Cek Akses Repo</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Hasil Tes Koneksi */}
            {testResult && (
              <View
                style={[
                  styles.testResultBox,
                  testResult.success ? styles.testSuccess : styles.testFailed
                ]}
              >
                <Ionicons
                  name={testResult.success ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={testResult.success ? '#2e7d32' : '#c62828'}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.testResultText,
                    { color: testResult.success ? '#1b5e20' : '#b71c1c' }
                  ]}
                >
                  {testResult.message}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Simpan Pengaturan</Text>
            </TouchableOpacity>
          </View>
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
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#023c69',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  description: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  linkText: {
    fontSize: 12,
    color: '#023c69',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
    backgroundColor: '#FAFAFA',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
  },
  inputFlex: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
  },
  iconBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hintText: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#023c69',
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: '#F0F6FA',
  },
  testBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#023c69',
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  testSuccess: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  testFailed: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  testResultText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  saveBtn: {
    flex: 1.5,
    backgroundColor: '#023c69',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
});

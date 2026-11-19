import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, ActivityIndicator, Alert, ScrollView,
  Linking, Platform, Modal, Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import {
  WebProduct, StoreSettings, HeroCard, PromoBanner,
  testGitHubConnection, fetchCatalogFromGitHub,
  publishCatalogToGitHub, uploadProductImage,
  decodeWaNumber, encodeWaNumber
} from '../services/githubCatalogService';
import {
  getCatalogConfig, saveCatalogConfig,
  getCatalogCache, saveCatalogCache,
  updateCatalogSyncTimestamps, CatalogConfig
} from '../database/queries/catalogQueries';
import WebCatalogConfigModal from '../components/WebCatalogConfigModal';
import CopyFromOrderLiteModal from '../components/CopyFromOrderLiteModal';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

type TabType = 'dashboard' | 'products' | 'hero' | 'carousel' | 'publish';

export default function WebCatalogScreen({ navigation }: Props) {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const isFocused = useIsFocused();

  // Config & Modals
  const [config, setConfig] = useState<CatalogConfig | null>(null);
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [isCopyModalVisible, setIsCopyModalVisible] = useState(false);

  // Catalog Data
  const [products, setProducts] = useState<WebProduct[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({
    storeName: 'Sahla Store',
    logoImg: '',
    waNumberEnc: '',
    heroEyebrow: 'Ready stock • Update tiap hari',
    heroTitle: 'Cantik, nyaman, harga bersahabat.',
    heroLead: 'Gamis, daster, baju anak sampai HP & laptop — semua yang lagi ready ada di sini. Tinggal pilih, klik, chat.',
    heroTag: 'New Arrival',
    heroCards: [
      { img: 'img/h1.jpg', caption: 'Gamis Syari' },
      { img: 'img/h2.jpg', caption: 'Baju Anak' },
      { img: 'img/h3.jpg', caption: 'Laptop Second' }
    ],
    carouselEnabled: true,
    carouselEyebrow: 'Unggulan',
    carouselTitle: 'Paling banyak ditanya',
    carouselProductIds: [],
    promoBanners: [
      {
        bg: 'img/banner.jpg',
        eyebrow: 'Promo Jumat Berkah',
        title: 'Beli 2 daster, gratis 1 celamis.',
        msg: 'Halo kak, mau ikut promo Jumat Berkah (beli 2 daster gratis 1 celamis)',
        btnText: 'Ambil Promo'
      }
    ],
    marqueeItems: ['Gamis', 'Baju Dewasa', 'Baju Anak', 'Daster', 'Celamis', 'Tyso']
  });

  const [currentSha, setCurrentSha] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Filter & Search (Tab Produk)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');

  // Loading & Progress
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState<string>('');

  // Form States (Toko & Hero & Carousel)
  const [storeName, setStoreName] = useState('Sahla Store');
  const [logoImg, setLogoImg] = useState<string>('');
  const [waNumber, setWaNumber] = useState('');
  const [heroTag, setHeroTag] = useState('New Arrival');
  const [heroEyebrow, setHeroEyebrow] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroLead, setHeroLead] = useState('');
  const [heroCards, setHeroCards] = useState<HeroCard[]>([
    { img: 'img/h1.jpg', caption: 'Gamis Syari' },
    { img: 'img/h2.jpg', caption: 'Baju Anak' },
    { img: 'img/h3.jpg', caption: 'Laptop Second' }
  ]);
  const [promoBanners, setPromoBanners] = useState<PromoBanner[]>([]);
  const [carouselEnabled, setCarouselEnabled] = useState(true);
  const [carouselEyebrow, setCarouselEyebrow] = useState('Unggulan');
  const [carouselTitle, setCarouselTitle] = useState('Paling banyak ditanya');
  const [carouselProductIds, setCarouselProductIds] = useState<number[]>([]);
  const [marqueeItemsText, setMarqueeItemsText] = useState('Gamis, Baju Dewasa, Baju Anak, Daster, Celamis, Tyso');

  // Initial Load from SQLite Cache and Config
  useEffect(() => {
    if (isFocused) {
      loadInitialData();
    }
  }, [isFocused]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const cfg = await getCatalogConfig();
      setConfig(cfg);

      const cache = await getCatalogCache();
      if (cache && cache.products_json) {
        const cachedProducts: WebProduct[] = JSON.parse(cache.products_json);
        const cachedSettings: StoreSettings | null = cache.settings_json ? JSON.parse(cache.settings_json) : null;
        setProducts(cachedProducts);
        if (cachedSettings) {
          applySettingsToState(cachedSettings);
        }
        setCurrentSha(cache.sha || null);
      } else if (cfg.github_token) {
        await handlePullFromGitHub(cfg);
      }
    } catch (e) {
      console.warn('Gagal memuat data awal katalog:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const applySettingsToState = (s: StoreSettings) => {
    setSettings(s);
    setStoreName(s.storeName || 'Sahla Store');
    setLogoImg(s.logoImg || '');
    setWaNumber(decodeWaNumber(s.waNumberEnc));
    setHeroTag(s.heroTag !== undefined ? s.heroTag : 'New Arrival');
    setHeroEyebrow(s.heroEyebrow || '');
    setHeroTitle(s.heroTitle || '');
    setHeroLead(s.heroLead || '');

    const defaultCards: HeroCard[] = [
      { img: 'img/h1.jpg', caption: 'Gamis Syari' },
      { img: 'img/h2.jpg', caption: 'Baju Anak' },
      { img: 'img/h3.jpg', caption: 'Laptop Second' }
    ];
    setHeroCards(s.heroCards && s.heroCards.length >= 3 ? s.heroCards : defaultCards);

    setCarouselEnabled(s.carouselEnabled !== false);
    setCarouselEyebrow(s.carouselEyebrow || 'Unggulan');
    setCarouselTitle(s.carouselTitle || 'Paling banyak ditanya');
    setCarouselProductIds(s.carouselProductIds || []);

    if (s.promoBanners && s.promoBanners.length > 0) {
      setPromoBanners(s.promoBanners);
    } else if (s.bannerTitle || s.bannerBg) {
      setPromoBanners([
        {
          bg: s.bannerBg || 'img/banner.jpg',
          eyebrow: s.bannerEyebrow || 'Promo Jumat Berkah',
          title: s.bannerTitle || 'Beli 2 daster, gratis 1 celamis.',
          msg: s.bannerMsg || 'Halo kak, mau tanya promo toko.',
          btnText: 'Ambil Promo'
        }
      ]);
    } else {
      setPromoBanners([
        {
          bg: 'img/banner.jpg',
          eyebrow: 'Promo Jumat Berkah',
          title: 'Beli 2 daster, gratis 1 celamis.',
          msg: 'Halo kak, mau tanya promo toko.',
          btnText: 'Ambil Promo'
        }
      ]);
    }

    if (Array.isArray(s.marqueeItems) && s.marqueeItems.length > 0) {
      setMarqueeItemsText(s.marqueeItems.join(', '));
    }
  };

  // Pull fresh data from GitHub
  const handlePullFromGitHub = async (cfgOverride?: CatalogConfig) => {
    const activeCfg = cfgOverride || config;
    if (!activeCfg || !activeCfg.github_token) {
      Alert.alert(
        'Token Belum Dikonfigurasi',
        'Silakan masukkan GitHub Personal Access Token (PAT) terlebih dahulu.',
        [{ text: 'Pengaturan Token', onPress: () => setIsConfigModalVisible(true) }]
      );
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchCatalogFromGitHub(
        activeCfg.github_token,
        activeCfg.github_repo,
        activeCfg.github_branch
      );

      setProducts(data.products);
      applySettingsToState(data.settings);
      setCurrentSha(data.sha);
      setIsDirty(false);

      // Simpan ke SQLite Cache
      await saveCatalogCache(
        JSON.stringify(data.settings),
        JSON.stringify(data.products),
        data.sha
      );
      await updateCatalogSyncTimestamps('sync');

      Alert.alert('Sukses', `Berhasil menarik ${data.products.length} produk dan pengaturan web dari GitHub!`);
    } catch (err: any) {
      Alert.alert('Gagal Mengambil Data', `Terjadi kesalahan saat mengambil dari GitHub:\n${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper untuk Memilih & Mengompres Gambar
  const pickAndCompressImage = async (
    useCamera: boolean = false,
    aspect: [number, number] = [4, 5],
    maxW: number = 640
  ): Promise<string | null> => {
    try {
      const perm = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!perm.granted) {
        Alert.alert('Izin Ditolak', `Aplikasi butuh izin akses ${useCamera ? 'kamera' : 'galeri foto'}.`);
        return null;
      }

      const res = useCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect, quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect, quality: 1 });

      if (res.canceled || !res.assets || !res.assets[0]) return null;

      const compressed = await ImageManipulator.manipulateAsync(
        res.assets[0].uri,
        [{ resize: { width: maxW } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
      );

      const imagesDir = FileSystem.documentDirectory + 'images/';
      const dirInfo = await FileSystem.getInfoAsync(imagesDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(imagesDir, { intermediates: true });
      }

      const fileName = `webmedia_${Date.now()}.jpg`;
      const permUri = imagesDir + fileName;
      await FileSystem.copyAsync({ from: compressed.uri, to: permUri });
      return permUri;
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', `Gagal memproses gambar: ${err.message || err}`);
      return null;
    }
  };

  // Ganti Logo Toko
  const handleChangeLogo = async (useCamera: boolean) => {
    const uri = await pickAndCompressImage(useCamera, [1, 1], 300);
    if (uri) {
      setLogoImg(uri);
      setIsDirty(true);
    }
  };

  // Ganti Foto Kartu Hero 3D (Index 0, 1, 2)
  const handleChangeHeroCardImg = async (index: number, useCamera: boolean) => {
    const uri = await pickAndCompressImage(useCamera, [4, 5], 640);
    if (uri) {
      const nextCards = [...heroCards];
      nextCards[index] = { ...nextCards[index], img: uri };
      setHeroCards(nextCards);
      setIsDirty(true);
    }
  };

  // Ganti Foto Background Promo Banner
  const handleChangePromoBannerBg = async (index: number, useCamera: boolean) => {
    const uri = await pickAndCompressImage(useCamera, [16, 9], 1200);
    if (uri) {
      const nextBanners = [...promoBanners];
      nextBanners[index] = { ...nextBanners[index], bg: uri };
      setPromoBanners(nextBanners);
      setIsDirty(true);
    }
  };

  // Simpan Pengaturan Toko, Hero 3D, Banner, dan Carousel ke Draf SQLite
  const handleSaveAllVisualSettings = async () => {
    const marqueeArray = marqueeItemsText
      .split(',')
      .map(x => x.trim())
      .filter(Boolean);

    const updatedSettings: StoreSettings = {
      ...settings,
      storeName: storeName.trim(),
      logoImg: logoImg.trim(),
      waNumberEnc: encodeWaNumber(waNumber.trim()),
      heroTag: heroTag.trim(),
      heroEyebrow: heroEyebrow.trim(),
      heroTitle: heroTitle.trim(),
      heroLead: heroLead.trim(),
      heroCards: heroCards,
      promoBanners: promoBanners,
      bannerBg: promoBanners[0]?.bg || 'img/banner.jpg',
      bannerEyebrow: promoBanners[0]?.eyebrow || 'Promo Jumat Berkah',
      bannerTitle: promoBanners[0]?.title || '',
      bannerMsg: promoBanners[0]?.msg || '',
      carouselEnabled: carouselEnabled,
      carouselEyebrow: carouselEyebrow.trim(),
      carouselTitle: carouselTitle.trim(),
      carouselProductIds: carouselProductIds,
      marqueeItems: marqueeArray.length > 0 ? marqueeArray : ['Gamis', 'Daster', 'Baju Dewasa']
    };

    setSettings(updatedSettings);
    setIsDirty(true);

    await saveCatalogCache(
      JSON.stringify(updatedSettings),
      JSON.stringify(products),
      currentSha
    );

    Alert.alert('Tersimpan di Draf', 'Pengaturan tampilan web (Hero 3D, Banner, Carousel & Logo) berhasil disimpan ke draf lokal! Buka tab "Publikasi" untuk mengirim ke web online.');
  };

  // Toggle Produk Carousel
  const toggleCarouselProduct = (prodId: number) => {
    if (carouselProductIds.includes(prodId)) {
      setCarouselProductIds(carouselProductIds.filter(id => id !== prodId));
    } else {
      setCarouselProductIds([...carouselProductIds, prodId]);
    }
    setIsDirty(true);
  };

  // Tambah / Hapus Banner Promo
  const handleAddPromoBanner = () => {
    const newBanner: PromoBanner = {
      bg: 'img/banner.jpg',
      eyebrow: 'Promo Baru',
      title: 'Judul Promo Tambahan',
      msg: 'Halo kak, mau tanya promo ini',
      btnText: 'Ambil Promo'
    };
    setPromoBanners([...promoBanners, newBanner]);
    setIsDirty(true);
  };

  const handleDeletePromoBanner = (index: number) => {
    if (promoBanners.length <= 1) {
      Alert.alert('Perhatian', 'Minimal harus ada 1 banner promo.');
      return;
    }
    const nextBanners = promoBanners.filter((_, i) => i !== index);
    setPromoBanners(nextBanners);
    setIsDirty(true);
  };

  // Add / Edit Product
  const handleSaveProduct = async (product: WebProduct, isNewLocalImage: boolean) => {
    let nextProducts: WebProduct[];
    const existingIndex = products.findIndex(p => p.id === product.id);

    if (existingIndex >= 0) {
      nextProducts = [...products];
      nextProducts[existingIndex] = product;
    } else {
      nextProducts = [product, ...products];
    }

    setProducts(nextProducts);
    setIsDirty(true);

    await saveCatalogCache(
      JSON.stringify(settings),
      JSON.stringify(nextProducts),
      currentSha
    );
  };

  // Delete Product
  const handleDeleteProduct = (id: number, name: string) => {
    Alert.alert(
      'Hapus Produk Web',
      `Apakah Anda yakin ingin menghapus "${name}" dari katalog web?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Hapus',
          style: 'destructive',
          onPress: async () => {
            const nextProducts = products.filter(p => p.id !== id);
            setProducts(nextProducts);
            setCarouselProductIds(carouselProductIds.filter(pid => pid !== id));
            setIsDirty(true);
            await saveCatalogCache(
              JSON.stringify(settings),
              JSON.stringify(nextProducts),
              currentSha
            );
          }
        }
      ]
    );
  };

  // Import from OrderLite Master
  const handleSelectLocalProduct = (localProd: any) => {
    navigation.navigate('WebProductEditScreen', {
      product: {
        id: Date.now(),
        name: localProd.nama_produk,
        cat: 'Gamis',
        price: localProd.harga_dasar,
        img: localProd.foto_path || 'img/1.jpg',
        badge: '',
        sizes: ['All Size'],
        desc: ''
      },
      onSave: handleSaveProduct
    });
  };

  // 1-Click Publish to GitHub & Vercel
  const handlePublish = async () => {
    if (!config || !config.github_token) {
      Alert.alert(
        'Token Belum Ada',
        'Silakan masukkan GitHub Personal Access Token (PAT) terlebih dahulu.',
        [{ text: 'Input Token', onPress: () => setIsConfigModalVisible(true) }]
      );
      return;
    }

    const activeToken = config.github_token;
    const activeRepo = config.github_repo;
    const activeBranch = config.github_branch;

    Alert.alert(
      'Konfirmasi Publikasi Lengkap',
      `Seluruh data katalog (${products.length} produk, logo toko, Hero 3D, Banner Promo, dan pengaturan Carousel) akan di-commit ke repositori GitHub ${activeRepo}. Vercel akan otomatis mengupdate web live dalam ~30 detik. Lanjutkan?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: '🚀 Ya, Publikasikan Sekarang',
          onPress: async () => {
            setIsPublishing(true);
            try {
              // Langkah 1: Cek Koneksi & Token
              setPublishStep('[1/4] Memeriksa koneksi GitHub & token...');
              const conn = await testGitHubConnection(activeToken, activeRepo);
              if (!conn.success) {
                throw new Error(conn.error || 'Token tidak valid.');
              }

              // Siapkan copy settings dan products
              const finalSettings = { ...settings };
              const updatedProducts = [...products];

              // Langkah 2: Upload Logo, Hero Cards, dan Banner jika bertipe lokal
              setPublishStep('[2/4] Mengunggah aset tampilan (Logo, Hero 3D, Banner)...');

              // A. Logo
              if (logoImg && (logoImg.startsWith('file://') || logoImg.startsWith('/'))) {
                try {
                  const extFileName = `logo_${Date.now()}.jpg`;
                  const uploaded = await uploadProductImage(activeToken, activeRepo, activeBranch, logoImg, extFileName);
                  finalSettings.logoImg = uploaded;
                  setLogoImg(uploaded);
                } catch (e) {
                  console.warn('Gagal upload logo:', e);
                }
              }

              // B. Hero Cards 3D (3 kartu)
              const updatedCards = [...heroCards];
              for (let i = 0; i < updatedCards.length; i++) {
                if (updatedCards[i].img && (updatedCards[i].img.startsWith('file://') || updatedCards[i].img.startsWith('/'))) {
                  try {
                    const extFileName = `h${i + 1}_${Date.now()}.jpg`;
                    const uploaded = await uploadProductImage(activeToken, activeRepo, activeBranch, updatedCards[i].img, extFileName);
                    updatedCards[i].img = uploaded;
                  } catch (e) {
                    console.warn(`Gagal upload hero card ${i}:`, e);
                  }
                }
              }
              finalSettings.heroCards = updatedCards;
              setHeroCards(updatedCards);

              // C. Promo Banners
              const updatedBanners = [...promoBanners];
              for (let i = 0; i < updatedBanners.length; i++) {
                if (updatedBanners[i].bg && (updatedBanners[i].bg.startsWith('file://') || updatedBanners[i].bg.startsWith('/'))) {
                  try {
                    const extFileName = `banner_${i + 1}_${Date.now()}.jpg`;
                    const uploaded = await uploadProductImage(activeToken, activeRepo, activeBranch, updatedBanners[i].bg, extFileName);
                    updatedBanners[i].bg = uploaded;
                  } catch (e) {
                    console.warn(`Gagal upload banner ${i}:`, e);
                  }
                }
              }
              finalSettings.promoBanners = updatedBanners;
              if (updatedBanners.length > 0) {
                finalSettings.bannerBg = updatedBanners[0].bg;
                finalSettings.bannerEyebrow = updatedBanners[0].eyebrow;
                finalSettings.bannerTitle = updatedBanners[0].title;
                finalSettings.bannerMsg = updatedBanners[0].msg;
              }
              setPromoBanners(updatedBanners);

              // Langkah 3: Upload foto-foto produk lokal baru
              setPublishStep('[3/4] Mengunggah foto produk katalog...');
              for (let i = 0; i < updatedProducts.length; i++) {
                const p = updatedProducts[i];
                if (p.img && (p.img.startsWith('file://') || p.img.startsWith('/'))) {
                  try {
                    const extFileName = `prod_${p.id}.jpg`;
                    const uploadedPath = await uploadProductImage(activeToken, activeRepo, activeBranch, p.img, extFileName);
                    p.img = uploadedPath;
                  } catch (imgErr) {
                    console.warn(`Gagal upload gambar produk ${p.name}:`, imgErr);
                  }
                }
              }

              // Langkah 4: Commit products.js ke GitHub
              setPublishStep('[4/4] Melakukan commit products.js ke GitHub...');
              const result = await publishCatalogToGitHub(
                activeToken,
                activeRepo,
                activeBranch,
                finalSettings,
                updatedProducts,
                currentSha || undefined
              );

              setCurrentSha(result.newFileSha);
              setIsDirty(false);
              setSettings(finalSettings);
              setProducts(updatedProducts);

              await saveCatalogCache(
                JSON.stringify(finalSettings),
                JSON.stringify(updatedProducts),
                result.newFileSha
              );
              await updateCatalogSyncTimestamps('publish');

              Alert.alert(
                '🚀 Publikasi Sukses!',
                'Seluruh pembaruan (Produk, Logo, Hero 3D, Banner Promo & Carousel) berhasil di-commit ke GitHub! Vercel akan memperbarui web live dalam ~30 detik.',
                [
                  { text: 'Tutup' },
                  {
                    text: 'Buka Web Live',
                    onPress: () => Linking.openURL(config.catalog_url || 'https://sahla-store.vercel.app')
                  }
                ]
              );
            } catch (err: any) {
              console.error(err);
              Alert.alert('Gagal Publikasi', `Terjadi kesalahan saat mempublikasikan ke GitHub:\n${err.message}`);
            } finally {
              setIsPublishing(false);
              setPublishStep('');
            }
          }
        }
      ]
    );
  };

  // Helper resolusi URL gambar
  const resolveImageUri = (uri?: string, fallback: string = 'img/1.jpg') => {
    if (!uri) uri = fallback;
    if (uri.startsWith('http') || uri.startsWith('file:') || uri.startsWith('data:')) {
      return { uri };
    }
    return { uri: `https://sahla-store.vercel.app/${uri}` };
  };

  // Categories list for chips
  const categoriesList = ['Semua', ...Array.from(new Set(products.map(p => p.cat).filter(Boolean)))];

  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'Semua' || p.cat === selectedCategory;
    const matchSearch = !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.desc && p.desc.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  const formatRupiah = (val?: number) => {
    if (!val) return 'Rp 0';
    return 'Rp ' + Math.round(val).toLocaleString('id-ID');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.headerTitle}>{storeName || 'Katalog Web'}</Text>
            <Text style={styles.headerSubtitle}>
              {config?.github_repo || 'bie71/sahla-store'} • {products.length} Produk
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.openWebBtn}
          onPress={() => Linking.openURL(config?.catalog_url || 'https://sahla-store.vercel.app')}
        >
          <Ionicons name="globe-outline" size={16} color="#023c69" style={{ marginRight: 4 }} />
          <Text style={styles.openWebText}>Buka Web</Text>
        </TouchableOpacity>
      </View>

      {/* Dirty / Status Alert Banner */}
      <View style={styles.statusBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isDirty ? '#F59E0B' : config?.github_token ? '#10B981' : '#94A3B8' }
            ]}
          />
          <Text style={styles.statusText} numberOfLines={1}>
            {isDirty
              ? 'Ada perubahan draf belum dipublikasikan'
              : config?.github_token
              ? 'Tersinkron dengan GitHub'
              : 'Token GitHub belum diatur'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.configBtn}
          onPress={() => setIsConfigModalVisible(true)}
        >
          <Ionicons name="settings-outline" size={14} color="#023c69" style={{ marginRight: 4 }} />
          <Text style={styles.configBtnText}>PAT</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Tab Bar */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 6 }}>
          {/* TAB 1: DASHBOARD */}
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'dashboard' && styles.tabBtnActive]}
            onPress={() => setActiveTab('dashboard')}
          >
            <Ionicons
              name={activeTab === 'dashboard' ? 'grid' : 'grid-outline'}
              size={17}
              color={activeTab === 'dashboard' ? '#023c69' : '#64748B'}
            />
            <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>
              Dashboard
            </Text>
          </TouchableOpacity>

          {/* TAB 2: PRODUK WEB */}
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'products' && styles.tabBtnActive]}
            onPress={() => setActiveTab('products')}
          >
            <Ionicons
              name={activeTab === 'products' ? 'cube' : 'cube-outline'}
              size={17}
              color={activeTab === 'products' ? '#023c69' : '#64748B'}
            />
            <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>
              Produk ({products.length})
            </Text>
          </TouchableOpacity>

          {/* TAB 3: HERO 3D & BANNER */}
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'hero' && styles.tabBtnActive]}
            onPress={() => setActiveTab('hero')}
          >
            <Ionicons
              name={activeTab === 'hero' ? 'images' : 'images-outline'}
              size={17}
              color={activeTab === 'hero' ? '#023c69' : '#64748B'}
            />
            <Text style={[styles.tabText, activeTab === 'hero' && styles.tabTextActive]}>
              Hero 3D & Banner
            </Text>
          </TouchableOpacity>

          {/* TAB 4: CAROUSEL */}
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'carousel' && styles.tabBtnActive]}
            onPress={() => setActiveTab('carousel')}
          >
            <Ionicons
              name={activeTab === 'carousel' ? 'film' : 'film-outline'}
              size={17}
              color={activeTab === 'carousel' ? '#023c69' : '#64748B'}
            />
            <Text style={[styles.tabText, activeTab === 'carousel' && styles.tabTextActive]}>
              Carousel 3D
            </Text>
          </TouchableOpacity>

          {/* TAB 5: PUBLIKASI */}
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'publish' && styles.tabBtnActive]}
            onPress={() => setActiveTab('publish')}
          >
            <View style={{ position: 'relative' }}>
              <Ionicons
                name={activeTab === 'publish' ? 'cloud-upload' : 'cloud-upload-outline'}
                size={17}
                color={activeTab === 'publish' ? '#023c69' : '#64748B'}
              />
              {isDirty && <View style={styles.dirtyDot} />}
            </View>
            <Text style={[styles.tabText, activeTab === 'publish' && styles.tabTextActive]}>
              Publikasi
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* TAB CONTENT */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#023c69" />
          <Text style={{ marginTop: 12, color: '#64748B', fontSize: 13 }}>Memuat katalog web...</Text>
        </View>
      ) : activeTab === 'dashboard' ? (
        /* TAB 1: DASHBOARD MANAJEMEN */
        <ScrollView style={styles.tabScroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Header Card Toko & Logo */}
          <View style={styles.dashHeaderCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.dashLogoBox}>
                {logoImg ? (
                  <Image source={resolveImageUri(logoImg)} style={styles.dashLogoImg} />
                ) : (
                  <Text style={styles.dashLogoInitial}>{storeName.charAt(0) || 'S'}</Text>
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.dashStoreName}>{storeName}</Text>
                <Text style={styles.dashStoreWa}>WA: +{waNumber || '628...'}</Text>
                <Text style={styles.dashStoreUrl} numberOfLines={1}>
                  {config?.catalog_url || 'https://sahla-store.vercel.app'}
                </Text>
              </View>
            </View>

            <View style={styles.dashQuickActions}>
              <TouchableOpacity
                style={[styles.dashQuickBtn, { backgroundColor: '#023c69' }]}
                onPress={() => setActiveTab('publish')}
              >
                <Ionicons name="rocket-outline" size={16} color="#FFF" />
                <Text style={styles.dashQuickBtnText}>Publikasi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dashQuickBtn, { backgroundColor: '#0284C7' }]}
                onPress={() => Linking.openURL(config?.catalog_url || 'https://sahla-store.vercel.app')}
              >
                <Ionicons name="globe-outline" size={16} color="#FFF" />
                <Text style={styles.dashQuickBtnText}>Buka Web</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Grid Metrik Ringkasan */}
          <Text style={styles.dashSectionHeader}>Ringkasan Katalog Web</Text>
          <View style={styles.dashGrid}>
            <View style={styles.dashMetricCard}>
              <View style={[styles.dashIconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="cube-outline" size={20} color="#0284C7" />
              </View>
              <Text style={styles.dashMetricValue}>{products.length}</Text>
              <Text style={styles.dashMetricLabel}>Total Produk Web</Text>
            </View>

            <View style={styles.dashMetricCard}>
              <View style={[styles.dashIconCircle, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="pricetags-outline" size={20} color="#16A34A" />
              </View>
              <Text style={styles.dashMetricValue}>{categoriesList.length - 1}</Text>
              <Text style={styles.dashMetricLabel}>Kategori Produk</Text>
            </View>

            <View style={styles.dashMetricCard}>
              <View style={[styles.dashIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="megaphone-outline" size={20} color="#D97706" />
              </View>
              <Text style={styles.dashMetricValue}>{promoBanners.length}</Text>
              <Text style={styles.dashMetricLabel}>Banner Promo</Text>
            </View>

            <View style={styles.dashMetricCard}>
              <View style={[styles.dashIconCircle, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="film-outline" size={20} color="#9333EA" />
              </View>
              <Text style={styles.dashMetricValue}>
                {carouselEnabled ? `${carouselProductIds.length || products.length} Item` : 'Mati'}
              </Text>
              <Text style={styles.dashMetricLabel}>Carousel 3D</Text>
            </View>
          </View>

          {/* Menu Pintasan Cepat Dashboard */}
          <Text style={styles.dashSectionHeader}>Pusat Kontrol Visual</Text>
          <View style={styles.formCard}>
            <TouchableOpacity
              style={styles.dashMenuItem}
              onPress={() => setActiveTab('products')}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="cube-outline" size={20} color="#0284C7" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.actionRowTitle}>Kelola Produk Katalog</Text>
                <Text style={styles.actionRowSub}>Tambah, ubah harga, foto, badge diskon, & ukuran</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dashMenuItem}
              onPress={() => setActiveTab('hero')}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="images-outline" size={20} color="#16A34A" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.actionRowTitle}>Hero 3D, Badge & Banner Promo</Text>
                <Text style={styles.actionRowSub}>3 Kartu 3D, Badge "New Arrival", & Parallax Banner</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dashMenuItem}
              onPress={() => setActiveTab('carousel')}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="film-outline" size={20} color="#9333EA" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.actionRowTitle}>Pengaturan Carousel 3D Unggulan</Text>
                <Text style={styles.actionRowSub}>Aktif/nonaktifkan slider 3D & pilih produk unggulan</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dashMenuItem, { borderBottomWidth: 0 }]}
              onPress={() => setIsCopyModalVisible(true)}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="copy-outline" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.actionRowTitle}>Salin dari Master OrderLite</Text>
                <Text style={styles.actionRowSub}>Import barang dari pesanan/stok lokal ke web</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : activeTab === 'products' ? (
        /* TAB 2: PRODUK WEB */
        <View style={{ flex: 1 }}>
          {/* Action Toolbar */}
          <View style={styles.actionToolbar}>
            <TouchableOpacity
              style={[styles.toolBtn, { backgroundColor: '#023c69' }]}
              onPress={() =>
                navigation.navigate('WebProductEditScreen', {
                  onSave: handleSaveProduct
                })
              }
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.toolBtnText}>Tambah Baru</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolBtn, { backgroundColor: '#0369A1' }]}
              onPress={() => setIsCopyModalVisible(true)}
            >
              <Ionicons name="copy-outline" size={16} color="#FFF" />
              <Text style={styles.toolBtnText}>Salin dari OrderLite</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => handlePullFromGitHub()}
            >
              <Ionicons name="refresh-outline" size={18} color="#023c69" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari produk katalog web..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Category Chips */}
          <View style={{ height: 42, marginBottom: 4 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {categoriesList.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Products List */}
          {filteredProducts.length === 0 ? (
            <View style={styles.centerBox}>
              <Ionicons name="cube-outline" size={48} color="#CBD5E1" />
              <Text style={{ marginTop: 8, color: '#64748B', fontSize: 14, fontWeight: '500' }}>
                Tidak ada produk ditemukan
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>
                Coba ubah kata kunci atau tambah produk baru
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
              renderItem={({ item }) => {
                return (
                  <View style={styles.productCard}>
                    <Image source={resolveImageUri(item.img)} style={styles.productThumb} />

                    <View style={styles.productDetails}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <View style={styles.catBadge}>
                          <Text style={styles.catBadgeText}>{item.cat}</Text>
                        </View>
                        {item.badge ? (
                          <View style={styles.promoBadge}>
                            <Text style={styles.promoBadgeText}>{item.badge}</Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.productName} numberOfLines={2}>
                        {item.name}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                        <Text style={styles.productPrice}>{formatRupiah(item.price)}</Text>
                        {item.old ? (
                          <Text style={styles.productOldPrice}>{formatRupiah(item.old)}</Text>
                        ) : null}
                      </View>

                      {item.sizes && item.sizes.length > 0 ? (
                        <View style={styles.sizeList}>
                          {item.sizes.map((s, idx) => (
                            <Text key={idx} style={styles.sizeTag}>{s}</Text>
                          ))}
                        </View>
                      ) : null}
                    </View>

                    {/* Actions */}
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.cardEditBtn}
                        onPress={() =>
                          navigation.navigate('WebProductEditScreen', {
                            product: item,
                            onSave: handleSaveProduct
                          })
                        }
                      >
                        <Ionicons name="pencil-outline" size={16} color="#023c69" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.cardDeleteBtn}
                        onPress={() => handleDeleteProduct(item.id, item.name)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      ) : activeTab === 'hero' ? (
        /* TAB 3: HERO 3D, BADGE, BANNER PROMO & LOGO */
        <ScrollView style={styles.tabScroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* LOGO TOKO CARD */}
          <View style={styles.formCard}>
            <Text style={styles.formCardTitle}>Logo Toko & Identitas Brand</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={styles.logoPreviewBox}>
                {logoImg ? (
                  <Image source={resolveImageUri(logoImg)} style={styles.logoPreviewImg} />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#023c69' }}>
                      {storeName.charAt(0) || 'S'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1E293B' }}>Logo Toko di Web</Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2, marginBottom: 8 }}>
                  Tampil di pojok atas (header nav) dan footer web.
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.smallActionBtn}
                    onPress={() => handleChangeLogo(false)}
                  >
                    <Ionicons name="images-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.smallActionBtnText}>Galeri</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallActionBtn, { backgroundColor: '#2E7D32' }]}
                    onPress={() => handleChangeLogo(true)}
                  >
                    <Ionicons name="camera-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.smallActionBtnText}>Kamera</Text>
                  </TouchableOpacity>
                  {logoImg ? (
                    <TouchableOpacity
                      style={[styles.smallActionBtn, { backgroundColor: '#EF4444' }]}
                      onPress={() => {
                        setLogoImg('');
                        setIsDirty(true);
                      }}
                    >
                      <Ionicons name="trash-outline" size={14} color="#FFF" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nama Toko</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Sahla Store"
                placeholderTextColor="#94A3B8"
                value={storeName}
                onChangeText={setStoreName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nomor WhatsApp Pemesanan *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="6281234567890"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={waNumber}
                onChangeText={setWaNumber}
              />
              <Text style={styles.formHint}>Format internasional tanpa tanda plus, contoh: 6281234567890</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Running Text Kategori (Marquee Ticker)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Gamis, Baju Dewasa, Baju Anak, Daster, Celamis, Tyso"
                placeholderTextColor="#94A3B8"
                value={marqueeItemsText}
                onChangeText={setMarqueeItemsText}
              />
              <Text style={styles.formHint}>Pisahkan dengan koma untuk teks berjalan di bawah hero</Text>
            </View>
          </View>

          {/* BADGE HERO & TEKS HERO */}
          <View style={styles.formCard}>
            <Text style={styles.formCardTitle}>Teks & Badge Hero Halaman Depan</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Floating Badge Hero (Label Mengambang 3D)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="New Arrival"
                placeholderTextColor="#94A3B8"
                value={heroTag}
                onChangeText={setHeroTag}
              />
              <Text style={styles.formHint}>Contoh: "New Arrival" / "Promo Spesial" (kosongkan jika tidak ingin ditampilkan)</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Eyebrow (Teks Kecil di Atas)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ready stock • Update tiap hari"
                placeholderTextColor="#94A3B8"
                value={heroEyebrow}
                onChangeText={setHeroEyebrow}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Judul Utama Toko (Hero Title)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Cantik, nyaman, harga bersahabat."
                placeholderTextColor="#94A3B8"
                value={heroTitle}
                onChangeText={setHeroTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Deskripsi / Slogan (Lead)</Text>
              <TextInput
                style={[styles.formInput, { height: 75, textAlignVertical: 'top' }]}
                placeholder="Pilihan lengkap gamis, daster hingga elektronik..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={heroLead}
                onChangeText={setHeroLead}
              />
            </View>
          </View>

          {/* 3D HERO CARDS SECTION */}
          <View style={styles.formCard}>
            <Text style={styles.formCardTitle}>3 Kartu Hero 3D (3D Perspective Stack)</Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 14, lineHeight: 18 }}>
              Tiga kartu bergambar yang tampil dengan efek 3D tilt di panggung hero halaman depan web.
            </Text>

            {heroCards.map((card, idx) => {
              const cardTitleLabel = idx === 0
                ? 'Kartu 1 (Tengah / Posisi Depan)'
                : idx === 1
                ? 'Kartu 2 (Kiri / Posisi Belakang)'
                : 'Kartu 3 (Kanan / Posisi Belakang)';

              return (
                <View key={idx} style={styles.heroCardBox}>
                  <Text style={styles.heroCardBoxTitle}>{cardTitleLabel}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Image source={resolveImageUri(card.img, `img/h${idx + 1}.jpg`)} style={styles.heroCardThumb} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={styles.smallActionBtn}
                          onPress={() => handleChangeHeroCardImg(idx, false)}
                        >
                          <Ionicons name="images-outline" size={13} color="#FFF" style={{ marginRight: 4 }} />
                          <Text style={styles.smallActionBtnText}>Ganti Foto</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.smallActionBtn, { backgroundColor: '#2E7D32' }]}
                          onPress={() => handleChangeHeroCardImg(idx, true)}
                        >
                          <Ionicons name="camera-outline" size={13} color="#FFF" style={{ marginRight: 4 }} />
                          <Text style={styles.smallActionBtnText}>Kamera</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>Rasio portrait 4:5</Text>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Teks Caption Kartu {idx + 1}</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Caption produk..."
                      placeholderTextColor="#94A3B8"
                      value={card.caption}
                      onChangeText={val => {
                        const nextCards = [...heroCards];
                        nextCards[idx] = { ...nextCards[idx], caption: val };
                        setHeroCards(nextCards);
                        setIsDirty(true);
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          {/* PROMO BANNER PARALLAX SECTION */}
          <View style={styles.formCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.formCardTitle}>Background Parallax & Banner Promo</Text>
              <TouchableOpacity
                style={styles.addBannerBtn}
                onPress={handleAddPromoBanner}
              >
                <Ionicons name="add" size={16} color="#023c69" />
                <Text style={styles.addBannerBtnText}>+ Tambah Banner</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 14, lineHeight: 18 }}>
              Bagian banner promo dengan background gambar ber-efek parallax yang otomatis bergulir (*slider*).
            </Text>

            {promoBanners.map((banner, bIdx) => (
              <View key={bIdx} style={styles.bannerEditBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#023c69' }}>
                    Banner Promo #{bIdx + 1}
                  </Text>
                  {promoBanners.length > 1 && (
                    <TouchableOpacity onPress={() => handleDeletePromoBanner(bIdx)}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Background Image Preview */}
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.formLabel}>Background Gambar Parallax</Text>
                  <View style={{ position: 'relative', height: 110, borderRadius: 8, overflow: 'hidden', backgroundColor: '#F1F5F9', marginBottom: 8 }}>
                    <Image
                      source={resolveImageUri(banner.bg, 'img/banner.jpg')}
                      style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                    />
                    <View style={styles.bannerBgOverlay}>
                      <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>{banner.title || 'Judul Promo'}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={styles.smallActionBtn}
                      onPress={() => handleChangePromoBannerBg(bIdx, false)}
                    >
                      <Ionicons name="images-outline" size={13} color="#FFF" style={{ marginRight: 4 }} />
                      <Text style={styles.smallActionBtnText}>Ganti Background</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.smallActionBtn, { backgroundColor: '#2E7D32' }]}
                      onPress={() => handleChangePromoBannerBg(bIdx, true)}
                    >
                      <Ionicons name="camera-outline" size={13} color="#FFF" style={{ marginRight: 4 }} />
                      <Text style={styles.smallActionBtnText}>Kamera</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Eyebrow (Label Kecil)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Promo Jumat Berkah"
                    placeholderTextColor="#94A3B8"
                    value={banner.eyebrow}
                    onChangeText={val => {
                      const next = [...promoBanners];
                      next[bIdx] = { ...next[bIdx], eyebrow: val };
                      setPromoBanners(next);
                      setIsDirty(true);
                    }}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Judul Banner Promo</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Beli 2 daster, gratis 1 celamis."
                    placeholderTextColor="#94A3B8"
                    value={banner.title}
                    onChangeText={val => {
                      const next = [...promoBanners];
                      next[bIdx] = { ...next[bIdx], title: val };
                      setPromoBanners(next);
                      setIsDirty(true);
                    }}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Pesan WhatsApp Otomatis (Saat Tombol Diklik)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Halo kak, mau tanya promo..."
                    placeholderTextColor="#94A3B8"
                    value={banner.msg}
                    onChangeText={val => {
                      const next = [...promoBanners];
                      next[bIdx] = { ...next[bIdx], msg: val };
                      setPromoBanners(next);
                      setIsDirty(true);
                    }}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Teks Tombol CTA</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Ambil Promo"
                    placeholderTextColor="#94A3B8"
                    value={banner.btnText}
                    onChangeText={val => {
                      const next = [...promoBanners];
                      next[bIdx] = { ...next[bIdx], btnText: val };
                      setPromoBanners(next);
                      setIsDirty(true);
                    }}
                  />
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.saveSettingsBtn} onPress={handleSaveAllVisualSettings}>
            <Ionicons name="checkmark-done" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.saveSettingsText}>Simpan Semua Pengaturan Visual ke Draf</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : activeTab === 'carousel' ? (
        /* TAB 4: CAROUSEL 3D UNGGULAN */
        <ScrollView style={styles.tabScroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={styles.formCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.formCardTitle}>Tampilkan Carousel 3D di Web</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Aktifkan slider 3D "Paling Banyak Ditanya" di halaman depan web.
                </Text>
              </View>
              <Switch
                value={carouselEnabled}
                onValueChange={val => {
                  setCarouselEnabled(val);
                  setIsDirty(true);
                }}
                trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                thumbColor={carouselEnabled ? '#023c69' : '#F1F5F9'}
              />
            </View>

            {carouselEnabled && (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Eyebrow Carousel</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Unggulan"
                    placeholderTextColor="#94A3B8"
                    value={carouselEyebrow}
                    onChangeText={setCarouselEyebrow}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Judul Bagian Carousel</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Paling banyak ditanya"
                    placeholderTextColor="#94A3B8"
                    value={carouselTitle}
                    onChangeText={setCarouselTitle}
                  />
                </View>

                <Text style={[styles.formLabel, { marginTop: 12, marginBottom: 8 }]}>
                  Pilih Produk yang Masuk ke Carousel 3D ({carouselProductIds.length || products.length} terpilih):
                </Text>
                <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 10 }}>
                  Centang produk yang ingin ditampilkan. Jika tidak ada yang dicentang, web akan menampilkan seluruh produk secara otomatis.
                </Text>

                <View style={{ gap: 8 }}>
                  {products.map(prod => {
                    const isChecked = carouselProductIds.includes(prod.id);
                    return (
                      <TouchableOpacity
                        key={prod.id}
                        style={[
                          styles.carouselPickItem,
                          isChecked && styles.carouselPickItemActive
                        ]}
                        onPress={() => toggleCarouselProduct(prod.id)}
                      >
                        <Ionicons
                          name={isChecked ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={isChecked ? '#023c69' : '#94A3B8'}
                          style={{ marginRight: 10 }}
                        />
                        <Image source={resolveImageUri(prod.img)} style={styles.carouselPickThumb} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.carouselPickName} numberOfLines={1}>{prod.name}</Text>
                          <Text style={styles.carouselPickPrice}>{formatRupiah(prod.price)} • {prod.cat}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </View>

          <TouchableOpacity style={styles.saveSettingsBtn} onPress={handleSaveAllVisualSettings}>
            <Ionicons name="checkmark-done" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.saveSettingsText}>Simpan Pengaturan Carousel ke Draf</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        /* TAB 5: PUBLIKASI KE WEB */
        <ScrollView style={styles.tabScroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Status Sinkronisasi Card */}
          <View style={styles.publishCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons
                name={isDirty ? 'cloud-offline-outline' : 'cloud-done-outline'}
                size={32}
                color={isDirty ? '#F59E0B' : '#10B981'}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.publishStatusTitle}>
                  {isDirty ? 'Perubahan Belum Dipublikasikan' : 'Katalog Siap & Tersinkron'}
                </Text>
                <Text style={styles.publishStatusSub}>
                  {isDirty
                    ? 'Ada perubahan draf produk, logo, Hero 3D, atau banner promo yang belum dikirim ke web online.'
                    : 'Semua produk & visual lokal sama dengan yang aktif di web live Vercel.'}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Repositori GitHub:</Text>
              <Text style={styles.metaValue}>{config?.github_repo || 'bie71/sahla-store'} ({config?.github_branch || 'main'})</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Total Produk Web:</Text>
              <Text style={styles.metaValue}>{products.length} item</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Status Carousel 3D:</Text>
              <Text style={styles.metaValue}>{carouselEnabled ? 'Aktif' : 'Nonaktif'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Logo Toko:</Text>
              <Text style={styles.metaValue}>{logoImg ? 'Kustom' : 'Inisial Huruf'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Terakhir Sinkron:</Text>
              <Text style={styles.metaValue}>
                {config?.last_sync ? new Date(config.last_sync).toLocaleString('id-ID') : 'Belum pernah'}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Terakhir Publikasi:</Text>
              <Text style={styles.metaValue}>
                {config?.last_publish ? new Date(config.last_publish).toLocaleString('id-ID') : 'Belum pernah'}
              </Text>
            </View>

            {/* Tombol Publikasikan Sekarang */}
            <TouchableOpacity
              style={styles.publishBigBtn}
              onPress={handlePublish}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="rocket-outline" size={24} color="#FFF" style={{ marginRight: 10 }} />
                  <Text style={styles.publishBigBtnText}>🚀 Publikasikan Sekarang ke Web</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Links Card */}
          <View style={styles.formCard}>
            <Text style={styles.formCardTitle}>Aksi & Pintasan</Text>

            <TouchableOpacity
              style={styles.actionRowBtn}
              onPress={() => Linking.openURL(config?.catalog_url || 'https://sahla-store.vercel.app')}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="globe-outline" size={20} color="#0284C7" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.actionRowTitle}>Buka Web Katalog Online</Text>
                <Text style={styles.actionRowSub}>{config?.catalog_url || 'https://sahla-store.vercel.app'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRowBtn}
              onPress={() => handlePullFromGitHub()}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="cloud-download-outline" size={20} color="#16A34A" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.actionRowTitle}>Tarik Ulang dari GitHub (Pull)</Text>
                <Text style={styles.actionRowSub}>Segarkan data lokal sesuai yang ada di GitHub</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionRowBtn, { borderBottomWidth: 0 }]}
              onPress={() => setIsConfigModalVisible(true)}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="key-outline" size={20} color="#475569" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.actionRowTitle}>Pengaturan GitHub PAT</Text>
                <Text style={styles.actionRowSub}>Ubah token akses, nama repositori, atau branch</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Publishing Progress Overlay Modal */}
      {isPublishing && (
        <Modal transparent animationType="fade" visible={isPublishing}>
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#023c69" style={{ marginBottom: 14 }} />
              <Text style={styles.loadingTitle}>Mempublikasikan ke Web...</Text>
              <Text style={styles.loadingStep}>{publishStep}</Text>
              <Text style={styles.loadingNotice}>Mohon jangan tutup aplikasi selama proses berlangsung.</Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Modals */}
      <WebCatalogConfigModal
        visible={isConfigModalVisible}
        onClose={() => setIsConfigModalVisible(false)}
        onSaved={loadInitialData}
      />

      <CopyFromOrderLiteModal
        visible={isCopyModalVisible}
        onClose={() => setIsCopyModalVisible(false)}
        onSelect={handleSelectLocalProduct}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#023c69',
    paddingTop: Platform.OS === 'ios' ? 48 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#BAC6D5',
    marginTop: 2,
  },
  openWebBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  openWebText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#023c69',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1E40AF',
    flex: 1,
  },
  configBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#DBEAFE',
  },
  configBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#023c69',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#023c69',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#023c69',
    fontWeight: 'bold',
  },
  dirtyDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  actionToolbar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  toolBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  refreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#023c69',
    backgroundColor: '#F0F6FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
    height: 32,
    justifyContent: 'center',
  },
  catChipActive: {
    backgroundColor: '#023c69',
    borderColor: '#023c69',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  catChipTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  productThumb: {
    width: 70,
    height: 88,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    resizeMode: 'contain',
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  catBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  catBadgeText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  promoBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  promoBadgeText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: 'bold',
  },
  productName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  productPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#023c69',
  },
  productOldPrice: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  sizeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  sizeTag: {
    fontSize: 9,
    color: '#64748B',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  cardActions: {
    justifyContent: 'space-between',
    paddingLeft: 6,
  },
  cardEditBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F0F6FA',
  },
  cardDeleteBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  tabScroll: {
    flex: 1,
  },
  // Dashboard Styles
  dashHeaderCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  dashLogoBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F0F6FA',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  dashLogoImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  dashLogoInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#023c69',
  },
  dashStoreName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#023c69',
  },
  dashStoreWa: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 2,
  },
  dashStoreUrl: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  dashQuickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dashQuickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  dashQuickBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dashSectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 10,
    marginLeft: 2,
  },
  dashGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  dashMetricCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dashIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dashMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#023c69',
  },
  dashMetricLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  dashMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  // Form & Visual Cards
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#023c69',
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1E293B',
    backgroundColor: '#FAFAFA',
  },
  formHint: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 3,
  },
  logoPreviewBox: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPreviewImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  logoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#023c69',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  smallActionBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  heroCardBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  heroCardBoxTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#023c69',
    marginBottom: 8,
  },
  heroCardThumb: {
    width: 60,
    height: 75,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    resizeMode: 'cover',
  },
  addBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F6FA',
    borderWidth: 1,
    borderColor: '#023c69',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addBannerBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#023c69',
  },
  bannerEditBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  bannerBgOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  carouselPickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 8,
  },
  carouselPickItemActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0284C7',
  },
  carouselPickThumb: {
    width: 40,
    height: 50,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    resizeMode: 'cover',
  },
  carouselPickName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  carouselPickPrice: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  saveSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#023c69',
    paddingVertical: 13,
    borderRadius: 12,
  },
  saveSettingsText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  publishCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  publishStatusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  publishStatusSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  publishBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 18,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  publishBigBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  actionRowSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '85%',
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#023c69',
    marginBottom: 6,
  },
  loadingStep: {
    fontSize: 13,
    color: '#0284C7',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingNotice: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

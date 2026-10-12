import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { getAllGalleryItems, saveGalleryItem, deleteGalleryItem, syncCloudGalleryItems } from '../../services/galleryService';
import { getLocalUser, logoutUser } from '../../services/authService';
import { formatDate } from '../../utils/date';
import { COLORS } from '../../constants/colors';
import { useAlert } from '../../context/AlertContext';

const { width } = Dimensions.get('window');
const COLUMN_SIZE = (width - 48) / 2;

export const GalleryScreen = ({ onLockGallery }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [captionInput, setCaptionInput] = useState('');
  const [savingImage, setSavingImage] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const { showAlert } = useAlert();

  const loadGallery = useCallback(async () => {
    try {
      setLoading(true);
      const u = await getLocalUser();
      setUserProfile(u);
      await syncCloudGalleryItems();
      const data = await getAllGalleryItems();
      const sorted = [...data].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setItems(sorted);
    } catch (error) {
      console.error('Error loading gallery:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);
const handlePickFromGallery = async () => {
  setPickerModalVisible(false);
  try {
    const response = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
      includeBase64: true,
    });

    if (response.didCancel) return;

    if (response.errorCode) {
      showAlert({
        title: 'Image Error',
        message: response.errorMessage || 'Failed to pick image.',
        type: 'error',
      });
      return;
    }

    const asset = response.assets?.[0];

    if (!asset?.uri) {
      showAlert({
        title: 'Image Error',
        message: 'Selected image URI is missing.',
        type: 'error',
      });
      return;
    }

    console.log('Selected image URI:', asset.uri);
    console.log('Selected image type:', asset.type);
    console.log('Selected image size:', asset.fileSize);

    setPendingImage(asset);
    setCaptionInput('');
  } catch (error) {
    console.error('Image picker error:', error?.stack || error);

    showAlert({
      title: 'Image Error',
      message: error?.message || 'Failed to open image picker.',
      type: 'error',
    });
  }
};

  const handleTakePhoto = () => {
    setPickerModalVisible(false);
    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: true,
        includeBase64: true,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          showAlert({
            title: 'Camera Error',
            message: response.errorMessage || 'Failed to capture photo.',
            type: 'error',
          });
          return;
        }
        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          setPendingImage(asset);
          setCaptionInput('');
        }
      }
    );
  };

  const handleSavePickedPhoto = async () => {
    if (!pendingImage) return;
    try {
      setSavingImage(true);
      await saveGalleryItem({
        imageUri: pendingImage.uri || pendingImage,
        base64: pendingImage.base64,
        contentType: pendingImage.type,
        caption: captionInput.trim(),
      });
      setPendingImage(null);
      setCaptionInput('');
      await loadGallery();
      showAlert({
        title: 'Photo Saved',
        message: 'Your photo has been saved to your secure gallery.',
        type: 'success',
      });
    } catch (error) {
      console.error('Error saving image:', error?.message || error);
      showAlert({
        title: 'Save Failed',
        message: error?.message || 'Could not save the image to the gallery.',
        type: 'error',
      });
    } finally {
      setSavingImage(false);
    }
  };

  const handleDeletePhoto = (item) => {
    showAlert({
      title: 'Delete Photo',
      message: 'Are you sure you want to remove this photo from the gallery?',
      type: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteGalleryItem(item);
          if (selectedPhoto?.id === item.id) {
            setSelectedPhoto(null);
          }
          await loadGallery();
          showAlert({
            title: 'Deleted',
            message: 'Photo removed from gallery.',
            type: 'success',
          });
        } catch (error) {
          showAlert({
            title: 'Error',
            message: 'Failed to delete photo.',
            type: 'error',
          });
        }
      },
    });
  };

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.imageCard}
        activeOpacity={0.85}
        onPress={() => setSelectedPhoto(item)}
      >
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <Ionicons name="image-outline" size={36} color={COLORS.textSecondary} />
          </View>
        )}

        <View style={styles.cardInfo}>
          {item.caption ? (
            <Text style={styles.caption} numberOfLines={1}>
              {item.caption}
            </Text>
          ) : (
            <Text style={styles.noCaption}>No caption</Text>
          )}

          <View style={styles.cardFooter}>
            <Text style={styles.dateText}>
              {item.createdAt ? formatDate(new Date(item.createdAt).toISOString()) : ''}
            </Text>
            <TouchableOpacity
              onPress={() => handleDeletePhoto(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="images" size={22} color={COLORS.primary} style={{ marginRight: 8 }} />
          <View>
            <Text style={styles.headerTitle}>Run Gallery</Text>
            {userProfile?.email ? (
              <Text style={styles.userEmailText} numberOfLines={1}>
                {userProfile.email}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setPickerModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={COLORS.text} style={{ marginRight: 6 }} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>

          {onLockGallery ? (
            <TouchableOpacity
              style={styles.lockBtn}
              onPress={onLockGallery}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Ionicons name="lock-closed" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.lockBtn}
            onPress={() => {
              showAlert({
                title: 'Sign Out / Lock',
                message: 'Do you want to sign out from this device?',
                type: 'warning',
                confirmText: 'Sign Out',
                cancelText: 'Cancel',
                onConfirm: async () => {
                  await logoutUser();
                  if (onLockGallery) onLockGallery();
                },
              });
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Grid of Photos */}
      <FlatList
        data={items}
        keyExtractor={(item, index) => item.id || String(index)}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadGallery}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={54} color={COLORS.textSecondary} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Photos in Gallery</Text>
              <Text style={styles.emptySubtitle}>
                Tap 'Add Photo' to upload your workout selfies or route photos from your phone!
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => setPickerModalVisible(true)}
              >
                <Ionicons name="camera-outline" size={20} color={COLORS.text} style={{ marginRight: 8 }} />
                <Text style={styles.emptyAddBtnText}>Upload First Photo</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* Upload Source Picker Modal (Camera vs Gallery) */}
      <Modal visible={pickerModalVisible} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Add Photo to Gallery</Text>

            <TouchableOpacity style={styles.pickerOption} onPress={handlePickFromGallery}>
              <Ionicons name="image" size={24} color={COLORS.primary} style={{ marginRight: 14 }} />
              <Text style={styles.pickerOptionText}>Choose from Phone Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerOption} onPress={handleTakePhoto}>
              <Ionicons name="camera" size={24} color={COLORS.secondary} style={{ marginRight: 14 }} />
              <Text style={styles.pickerOptionText}>Take with Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerCancel}
              onPress={() => setPickerModalVisible(false)}
            >
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Caption & Save Modal */}
      <Modal visible={Boolean(pendingImage)} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.captionCard}>
            <Text style={styles.captionTitle}>Add Caption</Text>

            {pendingImage ? (
              <Image
                source={{ uri: pendingImage?.uri || pendingImage }}
                style={styles.pendingPreview}
                resizeMode="cover"
              />
            ) : null}

            <TextInput
              style={styles.captionInput}
              placeholder="e.g. Morning 5km run at the park..."
              placeholderTextColor={COLORS.textSecondary}
              value={captionInput}
              onChangeText={setCaptionInput}
              maxLength={60}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setPendingImage(null)}
                disabled={savingImage}
              >
                <Text style={styles.cancelBtnText}>Discard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSavePickedPhoto}
                disabled={savingImage}
              >
                {savingImage ? (
                  <ActivityIndicator color={COLORS.text} size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Photo</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Photo Preview Modal */}
      <Modal visible={Boolean(selectedPhoto)} transparent animationType="fade">
        <View style={styles.fullscreenOverlay}>
          <View style={styles.fullscreenHeader}>
            <TouchableOpacity
              style={styles.fullscreenClose}
              onPress={() => setSelectedPhoto(null)}
            >
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fullscreenDelete}
              onPress={() => selectedPhoto && handleDeletePhoto(selectedPhoto)}
            >
              <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
            </TouchableOpacity>
          </View>

          {selectedPhoto?.imageUri ? (
            <Image
              source={{ uri: selectedPhoto.imageUri }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          ) : null}

          {selectedPhoto ? (
            <View style={styles.fullscreenFooter}>
              {selectedPhoto.caption ? (
                <Text style={styles.fullscreenCaption}>{selectedPhoto.caption}</Text>
              ) : null}
              {selectedPhoto.createdAt ? (
                <Text style={styles.fullscreenDate}>
                  {formatDate(new Date(selectedPhoto.createdAt).toISOString())}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  userEmailText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    maxWidth: 160,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  addBtnText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  lockBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listContent: {
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  imageCard: {
    width: COLUMN_SIZE,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  image: {
    width: '100%',
    height: COLUMN_SIZE,
  },
  placeholderImage: {
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    padding: 8,
  },
  caption: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  noCaption: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  dateText: {
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: COLORS.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  pickerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerOptionText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
  pickerCancel: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  pickerCancelText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  captionCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 20,
    margin: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'center',
    width: width - 40,
  },
  captionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  pendingPreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 14,
  },
  captionInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveBtnText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    zIndex: 10,
  },
  fullscreenClose: {
    padding: 8,
  },
  fullscreenDelete: {
    padding: 8,
  },
  fullscreenImage: {
    width: width,
    height: width * 1.2,
    alignSelf: 'center',
  },
  fullscreenFooter: {
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  fullscreenCaption: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  fullscreenDate: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
  Modal,
  ActionSheetIOS,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { showToast } from '../utils/toast';
import API_BASE_URL from '../utils/api';

const { width, height } = Dimensions.get('window');

const getStatusBarHeight = () => {
  return Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;
};

const UserProfile = ({ navigation }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editFormData, setEditFormData] = useState({
    username: '',
    email: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        navigation.replace('Login');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || 'Profile fetch failed');
      }

      setProfileData(data.user);
      setEditFormData({
        username: data.user.username,
        email: data.user.email,
      });
      
    } catch (error) {
      console.error('Profile fetch error:', error);
      
      let errorMessage = 'Failed to load profile';
      if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'Network error - please check your connection';
      } else {
        errorMessage = error.message || 'Failed to load profile';
      }
      
      showToast('error', 'Profile Error', errorMessage);
      
      if (error.response?.status === 401 || errorMessage.includes('authentication') || errorMessage.includes('token')) {
        navigation.replace('Login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraRollStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (cameraRollStatus !== 'granted' || cameraStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Sorry, we need camera and photo library permissions to update your profile photo.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const showImagePicker = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library', 'Remove Photo'],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            openCamera();
          } else if (buttonIndex === 2) {
            openImageLibrary();
          } else if (buttonIndex === 3) {
            removeProfilePhoto();
          }
        }
      );
    } else {
      Alert.alert(
        'Select Photo',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: openCamera },
          { text: 'Choose from Library', onPress: openImageLibrary },
          { text: 'Remove Photo', style: 'destructive', onPress: removeProfilePhoto },
        ]
      );
    }
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
        uploadProfilePhoto(result.assets[0]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      showToast('error', 'Camera Error', 'Failed to open camera');
    }
  };

  const openImageLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
        uploadProfilePhoto(result.assets[0]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      showToast('error', 'Image Picker Error', 'Failed to open image library');
    }
  };

  const uploadProfilePhoto = async (imageAsset) => {
    try {
      setIsUploadingPhoto(true);
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      
      if (!token) {
        navigation.replace('Login');
        return;
      }

      if (!userId) {
        throw new Error('User ID not found');
      }

      // Create FormData for file upload
      const formData = new FormData();
      
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(imageAsset.uri);
      if (!fileInfo.exists) {
        throw new Error('Selected image file not found');
      }

      // Prepare file for upload
      const fileUri = imageAsset.uri;
      const fileName = fileUri.split('/').pop();
      const fileType = fileName.split('.').pop();
      
      // Add the profile photo file
      formData.append('profilePhoto', {
        uri: fileUri,
        name: fileName,
        type: `image/${fileType}`,
      });

      // Add existing user data to maintain current values
      if (profileData) {
        formData.append('username', profileData.username);
        formData.append('email', profileData.email);
        if (profileData.userType) {
          formData.append('userType', profileData.userType);
        }
      }

      const response = await axios.put(
        `${API_BASE_URL}/user/update/${userId}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const data = response.data;
      
      // Check the response format - your backend might return different structure
      if (data.message !== 'User updated successfully' && !data.success) {
        throw new Error(data.message || 'Photo upload failed');
      }

      // Update profile data with the updated user object
      // Your backend returns the user object directly in data.user
      setProfileData(data.user);
      
      showToast('success', 'Photo Updated', 'Your profile photo has been updated successfully');
      
    } catch (error) {
      console.error('Photo upload error:', error);
      
      let errorMessage = 'Failed to upload photo';
      if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'Network error - please check your connection';
      } else {
        errorMessage = error.message || 'Failed to upload photo';
      }
      
      showToast('error', 'Upload Failed', errorMessage);
      setSelectedImage(null);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const removeProfilePhoto = async () => {
    try {
      setIsUploadingPhoto(true);
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      
      if (!token) {
        navigation.replace('Login');
        return;
      }

      if (!userId) {
        throw new Error('User ID not found');
      }

      // Create FormData without profilePhoto to remove it
      const formData = new FormData();
      
      // Add existing user data to maintain current values
      if (profileData) {
        formData.append('username', profileData.username);
        formData.append('email', profileData.email);
        if (profileData.userType) {
          formData.append('userType', profileData.userType);
        }
      }
      // Note: Not including profilePhoto field should signal removal
      // You might need to add a specific flag for removal
      formData.append('removePhoto', 'true');

      const response = await axios.put(
        `${API_BASE_URL}/user/update/${userId}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const data = response.data;
      if (data.message !== 'User updated successfully' && !data.success) {
        throw new Error(data.message || 'Photo removal failed');
      }

      // Update profile data with the updated user object
      setProfileData(data.user);
      
      setSelectedImage(null);
      showToast('success', 'Photo Removed', 'Your profile photo has been removed');
      
    } catch (error) {
      console.error('Photo removal error:', error);
      
      let errorMessage = 'Failed to remove photo';
      if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'Network error - please check your connection';
      } else {
        errorMessage = error.message || 'Failed to remove photo';
      }
      
      showToast('error', 'Removal Failed', errorMessage);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const updateProfile = async () => {
    try {
      setIsUpdating(true);
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      
      if (!token) {
        navigation.replace('Login');
        return;
      }

      if (!userId) {
        throw new Error('User ID not found');
      }

      // Create FormData for consistency with your backend
      const formData = new FormData();
      formData.append('username', editFormData.username.trim());
      formData.append('email', editFormData.email.trim());
      
      // Include existing userType if available
      if (profileData?.userType) {
        formData.append('userType', profileData.userType);
      }

      const response = await axios.put(
        `${API_BASE_URL}/user/update/${userId}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const data = response.data;
      if (data.message !== 'User updated successfully' && !data.success) {
        throw new Error(data.message || 'Profile update failed');
      }

      setProfileData(data.user);
      setIsEditModalVisible(false);
      showToast('success', 'Profile Updated', 'Your profile has been updated successfully');
      
    } catch (error) {
      console.error('Profile update error:', error);
      
      let errorMessage = 'Failed to update profile';
      if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'Network error - please check your connection';
      } else {
        errorMessage = error.message || 'Failed to update profile';
      }
      
      showToast('error', 'Update Failed', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleEditProfile = () => {
    setEditFormData({
      username: profileData.username,
      email: profileData.email,
    });
    setIsEditModalVisible(true);
  };

  const validateForm = () => {
    if (!editFormData.username.trim()) {
      showToast('error', 'Validation Error', 'Username is required');
      return false;
    }
    if (!editFormData.email.trim()) {
      showToast('error', 'Validation Error', 'Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editFormData.email.trim())) {
      showToast('error', 'Validation Error', 'Please enter a valid email address');
      return false;
    }
    if (editFormData.username.trim().length < 3) {
      showToast('error', 'Validation Error', 'Username must be at least 3 characters long');
      return false;
    }
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(editFormData.username.trim())) {
      showToast('error', 'Validation Error', 'Username can only contain letters, numbers, and underscores');
      return false;
    }
    return true;
  };

  const handleUpdateProfile = () => {
    if (validateForm()) {
      updateProfile();
    }
  };

  const getUserTypeDisplay = (userType) => {
    switch (userType?.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return 'System Administrator';
      default:
        return 'Community Member';
    }
  };

  const getUserTypeColor = (userType) => {
    switch (userType?.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return '#8B4513';
      default:
        return '#8B7355';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
        <ActivityIndicator size="large" color="#8B4513" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </SafeAreaView>
    );
  }

  const user = profileData || {
    username: 'user',
    email: 'user@example.com',
    userType: 'user',
    profilePhoto: null
  };

  // Fixed: Properly handle profile photo URL
  // Your backend stores the full Cloudinary URL directly in user.profilePhoto
  const displayImage = selectedImage?.uri || user.profilePhoto;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
      {/* Header */}
      <LinearGradient colors={['#8B4513', '#654321']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF8DC" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B4513']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              <Image
                source={displayImage 
                  ? { uri: displayImage } 
                  : require('../assets/default-profile.png')}
                style={styles.profileImage}
              />
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={showImagePicker}
                activeOpacity={0.7}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>@{user.username}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
              <View style={[styles.userTypeBadge, { backgroundColor: getUserTypeColor(user.userType) }]}>
                <Text style={styles.userTypeText}>{getUserTypeDisplay(user.userType)}</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditProfile}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={20} color="#8B4513" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#8B4513" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.textInput}
                  value={editFormData.username}
                  onChangeText={(text) => setEditFormData(prev => ({ ...prev, username: text }))}
                  placeholder="Enter your username"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={editFormData.email}
                  onChangeText={(text) => setEditFormData(prev => ({ ...prev, email: text }))}
                  placeholder="Enter your email address"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.saveButton, isUpdating && styles.saveButtonDisabled]}
                onPress={handleUpdateProfile}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8B4513',
    fontWeight: '500',
  },
  header: {
    paddingTop: getStatusBarHeight(),
    paddingBottom: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 248, 220, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF8DC',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  profileCard: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
  },
  cameraButton: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C1810',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  userTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  userTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8DC',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  editButtonText: {
    color: '#8B4513',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#F8F8F8',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C1810',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    maxHeight: height * 0.5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C1810',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2C1810',
    backgroundColor: '#FAFAFA',
  },
  modalButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#F8F8F8',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#8B4513',
    marginLeft: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UserProfile;
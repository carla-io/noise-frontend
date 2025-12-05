import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Image, 
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { showToast } from '../../utils/toast';
import API_BASE_URL from '../../utils/api';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// Enhanced InputField component with focus styling and required indicator
const InputField = React.memo(({
  name,
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  isPassword = false,
  showPassword = false,
  onTogglePassword,
  required = false
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}>
      <Ionicons 
        name={icon} 
        size={20} 
        color={isFocused ? "#A67C52" : "#8B5A3C"} 
        style={styles.inputIcon} 
      />
      <TextInput
        style={[styles.input, isPassword && styles.passwordInput]}
        placeholder={`${placeholder}${required ? ' *' : ''}`}
        placeholderTextColor="#999999"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {isPassword && (
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={onTogglePassword}
        >
          <Ionicons 
            name={showPassword ? "eye-off-outline" : "eye-outline"} 
            size={20} 
            color={isFocused ? "#A67C52" : "#8B5A3C"} 
          />
        </TouchableOpacity>
      )}
    </View>
  );
});

const Register = ({ navigation }) => {
  // User Information - Changed from 'name' to 'username'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('error', 'Permission Denied', 'Sorry, we need camera roll permissions to select an image');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const manipulatedImage = await manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 500, height: 500 } }],
          { compress: 0.7, format: SaveFormat.JPEG }
        );
        setProfilePhoto(manipulatedImage);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      showToast('error', 'Image Error', 'Failed to select image. Please try again.');
    }
  };

  const validateForm = () => {
    // Check if profile photo is required and missing
    if (!profilePhoto) {
      showToast('error', 'Profile Photo Required', 'Please select a profile photo');
      return false;
    }

    if (!username.trim()) {
      showToast('error', 'Username Required', 'Please enter your username');
      return false;
    }

    if (username.trim().length < 2) {
      showToast('error', 'Invalid Username', 'Username must be at least 2 characters long');
      return false;
    }

    if (!email.trim()) {
      showToast('error', 'Email Required', 'Please enter your email address');
      return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showToast('error', 'Invalid Email', 'Please enter a valid email address');
      return false;
    }

    if (!password.trim()) {
      showToast('error', 'Password Required', 'Please enter a password');
      return false;
    }

    if (password.length < 6) {
      showToast('error', 'Password Too Short', 'Password must be at least 6 characters');
      return false;
    }

    if (!confirmPassword.trim()) {
      showToast('error', 'Confirm Password', 'Please confirm your password');
      return false;
    }

    if (password !== confirmPassword) {
      showToast('error', 'Password Mismatch', "Passwords don't match!");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const formData = new FormData();
      
      // Changed from 'name' to 'username' to match backend expectations
      formData.append('username', username.trim());
      formData.append('email', email.trim().toLowerCase());
      formData.append('password', password.trim());
      formData.append('userType', 'user'); // Default user type (no vet option)
      
      // Profile photo is now guaranteed to exist due to validation
      formData.append('profilePhoto', {
        uri: profilePhoto.uri,
        type: 'image/jpeg',
        name: 'profile.jpg'
      });

      const response = await axios.post(`${API_BASE_URL}/auth/register`, formData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout for file upload
      });

      const { data } = response;

      if (!data.user) {
        throw new Error('Invalid response format');
      }

      // Show verification email toast
      showToast('success', 'Check Your Email', data.message || 'Registration successful! Please check your email to verify your account.');
      
      // Navigate back to Login screen for user to verify email first
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000); // Give user time to read the toast

    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'An error occurred during registration';
      
      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Network error
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.code === 'ECONNABORTED') {
        // Timeout error
        errorMessage = 'Upload timeout. Please try again with a smaller image.';
      } else {
        // Other errors
        errorMessage = error.message || errorMessage;
      }

      showToast('error', 'Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Memoized toggle functions
  const toggleShowPassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const toggleShowConfirmPassword = useCallback(() => {
    setShowConfirmPassword(prev => !prev);
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={['#D4A574', '#A67C52']} // Warm beige to rich brown
        style={styles.gradientContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={pickImage} style={styles.profileImageContainer}>
              <Image 
                source={profilePhoto ? { uri: profilePhoto.uri } : require('../../assets/default-profile.png')}
                style={[
                  styles.profileImage,
                  !profilePhoto && styles.profileImageRequired
                ]}
              />
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
              <View style={styles.photoHint}>
                <Text style={styles.photoHintText}>
                  {profilePhoto ? 'Tap to change photo' : 'Tap to add photo *'}
                </Text>
              </View>
            </TouchableOpacity>
            
            <Text style={styles.welcomeText}>Create Account</Text>
            <Text style={styles.subtitle}>Join us and start your journey</Text>
          </View>
          
          {/* Form Section */}
          <View style={styles.formContainer}>
            {/* Personal Information */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeader}>
                <Ionicons name="person-outline" size={18} color="#A67C52" /> Personal Information
              </Text>
              
              {/* Changed from "Full Name" to "Username" */}
              <InputField
                name="username"
                icon="person-outline"
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                required={true}
              />
              
              <InputField
                name="email"
                icon="mail-outline"
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                required={true}
              />
              
              <InputField
                name="password"
                icon="lock-closed-outline"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                isPassword={true}
                secureTextEntry={!showPassword}
                showPassword={showPassword}
                onTogglePassword={toggleShowPassword}
                required={true}
              />
              
              <InputField
                name="confirmPassword"
                icon="checkmark-circle-outline"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                isPassword={true}
                secureTextEntry={!showConfirmPassword}
                showPassword={showConfirmPassword}
                onTogglePassword={toggleShowConfirmPassword}
                required={true}
              />
            </View>

            {/* Required Fields Notice */}
            <View style={styles.requiredNotice}>
              <Text style={styles.requiredNoticeText}>
                <Text style={styles.asterisk}>* </Text>All fields are required
              </Text>
            </View>

            {/* Terms and Privacy */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By creating an account, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.registerButton, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#A67C52', '#8B5A3C']} // Rich brown gradient
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.registerButtonText}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Social Registration Section */}
            <View style={styles.socialSection}>
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or sign up with</Text>
                <View style={styles.divider} />
              </View>
              
              <View style={styles.socialButtons}>
                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons name="logo-google" size={24} color="#db4437" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons name="logo-facebook" size={24} color="#4267B2" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons name="logo-apple" size={24} color="#000" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  profileImageRequired: {
    borderColor: '#ff6b6b',
    borderWidth: 2,
  },
  requiredNotice: {
    backgroundColor: 'rgba(166, 124, 82, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#A67C52',
  },
  requiredNoticeText: {
    fontSize: 14,
    color: '#8B5A3C',
    fontWeight: '500',
  },
  asterisk: {
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  gradientContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 30,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 25,
    alignItems: 'center',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#A67C52',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  photoHint: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  photoHintText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 30,
  },
  sectionContainer: {
    marginBottom: 25,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F1ED',
    borderRadius: 15,
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  inputWrapperFocused: {
    borderColor: '#A67C52',
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0.15,
  },
  inputIcon: {
    marginRight: 15,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#2D3748',
    fontSize: 16,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: 20,
    padding: 5,
  },
  termsContainer: {
    marginBottom: 25,
    paddingHorizontal: 5,
  },
  termsText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: '#A67C52',
    fontWeight: '500',
  },
  registerButton: {
    marginBottom: 25,
    borderRadius: 15,
    overflow: 'hidden',
    height: 56,
    shadowColor: '#A67C52',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  buttonIcon: {
    marginLeft: 5,
  },
  socialSection: {
    marginBottom: 25,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8DDD4',
  },
  dividerText: {
    marginHorizontal: 20,
    color: '#718096',
    fontSize: 14,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F1ED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8DDD4',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    color: '#718096',
    fontSize: 16,
  },
  loginText: {
    color: '#A67C52',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Register;
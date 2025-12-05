import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Image, 
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { showToast } from '../../utils/toast';
import API_BASE_URL from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const Login = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Refs for input focusing
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const validateForm = () => {
    if (!email.trim()) {
      showToast('error', 'Email Required', 'Please enter your email address');
      return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showToast('error', 'Invalid Email', 'Please enter a valid email address');
      return false;
    }

    if (!password.trim()) {
      showToast('error', 'Password Required', 'Please enter your password');
      return false;
    }

    if (password.length < 6) {
      showToast('error', 'Password Too Short', 'Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: email.trim().toLowerCase(),
        password: password.trim()
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      const { data } = response;

      if (!data.success) {
        throw new Error(data.message || 'Login failed');
      }

      if (!data.token || !data.user) {
        throw new Error('Invalid response format');
      }

      await AsyncStorage.multiSet([
        ['userToken', data.token],
        ['userData', JSON.stringify(data.user)],
        ['isAuthenticated', 'true'],
        ['userId', data.user.id.toString()],
        ['userType', data.user.userType || 'user'] // Store user type for future reference
      ]);

      showToast('success', 'Login Successful', `Welcome back, ${data.user.name || data.user.username || data.user.email}!`);
      
      // Check user type and redirect accordingly (removed vet navigation)
      if (data.user.userType === 'admin') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'AdminDashboard' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }

    } catch (error) {
      console.error('Login Error:', error);
      
      let errorMessage = 'An error occurred during login';
      
      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Network error
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.code === 'ECONNABORTED') {
        // Timeout error
        errorMessage = 'Request timeout. Please try again.';
      } else {
        // Other errors
        errorMessage = error.message || errorMessage;
      }

      showToast('error', 'Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#D4A574', '#A67C52']} // Warm beige to rich brown
        style={styles.gradientContainer}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your journey</Text>
          </View>
          
          {/* Form Section */}
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons 
                  name="mail-outline" 
                  size={20} 
                  color="#A67C52" 
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={emailInputRef}
                  style={styles.textInput}
                  placeholder="Enter your email"
                  placeholderTextColor="#999999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={20} 
                  color="#A67C52" 
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordInputRef}
                  style={[styles.textInput, styles.passwordInput]}
                  placeholder="Enter your password"
                  placeholderTextColor="#999999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!loading}
                />
                <TouchableOpacity 
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#A67C52"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgotPassword')}
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#A67C52', '#8B5A3C']} // Rich brown gradient
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                    <Ionicons 
                      name="arrow-forward" 
                      size={20} 
                      color="#fff" 
                      style={styles.buttonIcon}
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Social Login Section */}
            <View style={styles.socialSection}>
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.divider} />
              </View>
              
              <View style={styles.socialButtons}>
                <TouchableOpacity style={styles.socialButton} disabled={loading}>
                  <Ionicons name="logo-google" size={24} color="#db4437" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton} disabled={loading}>
                  <Ionicons name="logo-facebook" size={24} color="#4267B2" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton} disabled={loading}>
                  <Ionicons name="logo-apple" size={24} color="#000" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Register')}
                disabled={loading}
              >
                <Text style={styles.signUpText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#f0f0f0',
    textAlign: 'center',
    opacity: 0.9,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    minHeight: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#2D3748',
    paddingVertical: 0,
    height: 24,
  },
  passwordInput: {
    paddingRight: 10,
  },
  eyeButton: {
    padding: 8,
    marginLeft: 8,
    marginRight: -8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 30,
    paddingVertical: 5,
  },
  forgotPasswordText: {
    color: '#A67C52',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 30,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
  buttonIcon: {
    marginLeft: 5,
  },
  socialSection: {
    marginBottom: 30,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    color: '#666',
    fontSize: 14,
    paddingHorizontal: 20,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 16,
  },
  signUpText: {
    color: '#A67C52',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Login;
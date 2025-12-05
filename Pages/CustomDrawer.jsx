import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { showToast } from '../utils/toast';
import API_BASE_URL from '../utils/api';

const { height } = Dimensions.get('window');

const CustomDrawer = ({ navigation, onClose }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState('user'); // Default to regular user

  // Regular user menu items for noise monitoring
  const userMenuItems = [
    { id: '1', title: 'Dashboard', icon: 'home-outline', route: 'Home' },
    { id: '2', title: 'Noise Map', icon: 'map-outline', route: 'MapScreen' },
    { id: '3', title: 'Report Noise', icon: 'megaphone-outline', route: 'Record' },
    { id: '4', title: 'My History', icon: 'time-outline', route: 'ReportHistory' },
    { id: '5', title: 'Notifications', icon: 'notifications-outline', route: 'Notifications' },
    { id: '6', title: 'Analytics (Personal)', icon: 'analytics-outline', route: 'PersonalAnalytics' },
  ];

  // Admin menu items for noise monitoring
  const adminMenuItems = [
    { id: '1', title: 'Dashboard', icon: 'speedometer-outline', route: 'AdminDashboard' },
    { id: '2', title: 'Noise Reports', icon: 'document-text-outline', route: 'NoiseReports' },
    { id: '3', title: 'Heatmap & Analytics', icon: 'bar-chart-outline', route: 'HeatmapAnalytics' },
    { id: '4', title: 'Users & Contributors', icon: 'people-outline', route: 'UserManagement' },
    { id: '5', title: 'Export Reports', icon: 'download-outline', route: 'ExportReports' },
    { id: '6', title: 'Notifications & Alerts', icon: 'alert-circle-outline', route: 'AdminNotifications' },
  ];

  const bottomItems = [
    { id: '7', title: 'Settings', icon: 'settings-outline', route: 'Settings' },
    { id: '8', title: 'Help & About', icon: 'help-circle-outline', route: 'HelpAbout' },
  ];

  // Admin bottom items
  const adminBottomItems = [
    { id: '7', title: 'Settings', icon: 'settings-outline', route: 'AdminSettings' },
    { id: '8', title: 'Help & Documentation', icon: 'library-outline', route: 'AdminHelp' },
  ];

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await axios.get(`${API_BASE_URL}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Profile fetch failed');
      }

      setProfileData(response.data.user);
      
      // Set user type based on profile data
      setUserType(response.data.user.userType || response.data.user.role || 'user');
      
    } catch (error) {
      console.error('Profile fetch error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load profile';
      showToast('error', 'Profile Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleNavigation = (route) => {
    // Close drawer first
    if (onClose) {
      onClose();
    }
    
    // Small delay to ensure drawer closes before navigation
    setTimeout(() => {
      try {
        // Check if the route exists in your navigation stack
        const validRoutes = ['Home', 'MapScreen', 'UserProfile', 'AdminDashboard', 'UserManagement', 'Record', 'NoiseReports', 'ReportHistory'];
        
        if (validRoutes.includes(route)) {
          navigation.navigate(route);
        } else {
          // For routes that don't exist yet, show a toast
          showToast('info', 'Coming Soon', `${route} feature is under development`);
        }
      } catch (error) {
        console.error('Navigation error:', error);
        showToast('error', 'Navigation Error', 'Unable to navigate to the selected screen');
      }
    }, 300);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: performLogout,
        },
      ],
      { cancelable: true }
    );
  };

  const performLogout = async () => {
    try {
      // Clear all login-related data locally
      await AsyncStorage.multiRemove(['userToken', 'userData', 'isAuthenticated']);

      showToast('success', 'Logged Out', 'You have been successfully logged out');

      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      showToast('error', 'Logout Failed', 'Something went wrong. Please try again.');
    }
  };

  const renderMenuItem = (item, isBottom = false) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.menuItem, isBottom && styles.bottomMenuItem]}
      onPress={() => handleNavigation(item.route)}
      activeOpacity={0.7}
    >
      <Ionicons name={item.icon} size={24} color="#8B4513" />
      <Text style={styles.menuText}>{item.title}</Text>
      <Ionicons name="chevron-forward" size={20} color="#D4AC0D" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B4513" />
      </SafeAreaView>
    );
  }

  const user = profileData || {
    name: 'User',
    email: 'user@example.com',
    profilePhoto: null,
    address: null
  };

  // Determine which menu items to show based on user type
  const getMenuItems = () => {
    switch(userType.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return adminMenuItems;
      default:
        return userMenuItems;
    }
  };

  const getBottomItems = () => {
    switch(userType.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return adminBottomItems;
      default:
        return bottomItems;
    }
  };

  const getSectionTitle = () => {
    switch(userType.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return 'Admin Panel';
      default:
        return 'Noise Monitoring';
    }
  };

  const getGradientColors = () => {
    switch(userType.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return ['#8B4513', '#654321', '#4A2C17']; // Darker brown gradient for admin
      default:
        return ['#D4AC0D', '#B7950B', '#8B4513']; // Mustard to brown gradient for users
    }
  };

  const getStats = () => {
    switch(userType.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return [
          { number: '1,247', label: 'Reports' },
          { number: '89', label: 'Users' },
          { number: '23', label: 'Hotspots' }
        ];
      default:
        return [
          { number: '42', label: 'Reports' },
          { number: '158', label: 'Hours' },
          { number: '73', label: 'dB Avg' }
        ];
    }
  };

  const currentMenuItems = getMenuItems();
  const currentBottomItems = getBottomItems();
  const sectionTitle = getSectionTitle();
  const gradientColors = getGradientColors();
  const stats = getStats();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <LinearGradient
          colors={gradientColors}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color="#FFF8DC" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.profileSection}
            onPress={() => handleNavigation('UserProfile')}
            activeOpacity={0.7}
          >
            <Image
              source={user.profilePhoto 
                ? { uri: user.profilePhoto } 
                : require('../assets/default-profile.png')}
              style={styles.profileImage}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.username}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
              {(userType.toLowerCase() === 'admin' || userType.toLowerCase() === 'administrator') && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>System Administrator</Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFF8DC" style={styles.profileChevron} />
          </TouchableOpacity>

          {/* Stats Container */}
          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <React.Fragment key={index}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stat.number}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
                {index < stats.length - 1 && <View style={styles.statDivider} />}
              </React.Fragment>
            ))}
          </View>
        </LinearGradient>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{sectionTitle}</Text>
            {currentMenuItems.map(item => renderMenuItem(item))}
          </View>

          {/* Quick Actions for Users */}
          {userType.toLowerCase() === 'user' && (
            <View style={styles.quickActionsContainer}>
              <Text style={styles.quickActionsTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                <TouchableOpacity 
                  style={styles.quickActionButton}
                  onPress={() => handleNavigation('QuickRecord')}
                >
                  <Ionicons name="mic-circle" size={32} color="#8B4513" />
                  <Text style={styles.quickActionText}>Quick Record</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.quickActionButton, styles.emergencyButton]}
                  onPress={() => handleNavigation('EmergencyReport')}
                >
                  <Ionicons name="warning" size={32} color="#E74C3C" />
                  <Text style={styles.quickActionText}>Emergency</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickActionButton}
                  onPress={() => handleNavigation('NearbyReports')}
                >
                  <Ionicons name="location" size={32} color="#D4AC0D" />
                  <Text style={styles.quickActionText}>Nearby</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickActionButton}
                  onPress={() => handleNavigation('MyStats')}
                >
                  <Ionicons name="stats-chart" size={32} color="#8B7355" />
                  <Text style={styles.quickActionText}>My Stats</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Admin Quick Actions */}
          {(userType.toLowerCase() === 'admin' || userType.toLowerCase() === 'administrator') && (
            <View style={styles.quickActionsContainer}>
              <Text style={styles.quickActionsTitle}>Admin Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                <TouchableOpacity 
                  style={styles.quickActionButton}
                  onPress={() => handleNavigation('LiveMonitoring')}
                >
                  <Ionicons name="pulse" size={32} color="#8B4513" />
                  <Text style={styles.quickActionText}>Live Monitor</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.quickActionButton, styles.emergencyButton]}
                  onPress={() => handleNavigation('SystemAlerts')}
                >
                  <Ionicons name="alert-circle" size={32} color="#E74C3C" />
                  <Text style={styles.quickActionText}>System Alerts</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickActionButton}
                  onPress={() => handleNavigation('GenerateReport')}
                >
                  <Ionicons name="document-attach" size={32} color="#D4AC0D" />
                  <Text style={styles.quickActionText}>Generate Report</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickActionButton}
                  onPress={() => handleNavigation('ManageThresholds')}
                >
                  <Ionicons name="options" size={32} color="#8B7355" />
                  <Text style={styles.quickActionText}>Thresholds</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bottom Menu Items */}
          <View style={styles.bottomSection}>
            <View style={styles.divider} />
            {currentBottomItems.map(item => renderMenuItem(item, true))}
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={24} color="#E74C3C" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC', // Light cream background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8DC',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 5,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    backgroundColor: 'rgba(255, 248, 220, 0.1)',
    borderRadius: 15,
    padding: 15,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
    borderWidth: 3,
    borderColor: '#FFF8DC',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 14,
    color: '#FFF8DC',
    marginBottom: 8,
  },
  adminBadge: {
    backgroundColor: 'rgba(255, 248, 220, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFF8DC',
  },
  adminBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 248, 220, 0.2)',
    borderRadius: 15,
    paddingVertical: 15,
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#FFF8DC',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 248, 220, 0.4)',
  },
  menuContainer: {
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  menuSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 15,
    paddingLeft: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#8B4513',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#D4AC0D',
  },
  bottomMenuItem: {
    backgroundColor: '#FFFACD', // Very light mustard
    borderLeftColor: '#B7950B',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#8B4513',
    marginLeft: 15,
    fontWeight: '500',
  },
  quickActionsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#8B4513',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F5DEB3',
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 15,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: '#FFFACD',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F5DEB3',
    shadowColor: '#8B4513',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emergencyButton: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FFE4E1',
  },
  quickActionText: {
    fontSize: 12,
    color: '#8B4513',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  bottomSection: {
    marginTop: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#F5DEB3',
    marginVertical: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#FFE4E1',
    shadowColor: '#E74C3C',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  logoutText: {
    fontSize: 16,
    color: '#E74C3C',
    marginLeft: 10,
    fontWeight: '600',
  },
  profileChevron: {
    marginLeft: 10,
  },
});

export default CustomDrawer;
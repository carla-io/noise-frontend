import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Animated,
  StatusBar,
  Dimensions,
  Platform,
  Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../../utils/api';
import CustomDrawer from '../CustomDrawer';

const { width } = Dimensions.get('window');
const getStatusBarHeight = () => Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24;

const UserReportsScreen = ({ navigation, route }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [userId, setUserId] = useState(null);
  
  const slideAnim = React.useRef(new Animated.Value(-width * 0.8)).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchReports();
    }
  }, [userId]);

  const initializeUser = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      
      if (!storedUserId) {
        Alert.alert(
          'Authentication Required',
          'Please log in to view your reports.',
          [
            { 
              text: 'OK', 
              onPress: () => navigation.navigate('Login') // Adjust navigation route as needed
            }
          ]
        );
        setLoading(false);
        return;
      }
      
      setUserId(storedUserId);
    } catch (error) {
      console.error('Error getting userId from AsyncStorage:', error);
      Alert.alert('Error', 'Failed to retrieve user information.');
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    if (!userId) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/reports/get-user-report/${userId}`);
      
      if (response.data) {
        setReports(response.data.reports || []);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      
      let errorMessage = 'Failed to fetch reports. Please try again.';
      
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        useNativeDriver: true
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true
      }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -width * 0.8,
        duration: 300,
        easing: Easing.bezier(0.55, 0.06, 0.68, 0.19),
        useNativeDriver: true
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true
      }),
    ]).start(() => setDrawerVisible(false));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderReportItem = ({ item }) => (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={styles.reportTitleRow}>
          <Ionicons name="document-text" size={20} color="#D4AC0D" />
          <Text style={styles.reportTitle}>Noise Report</Text>
        </View>
        <Text style={styles.reportDate}>{formatDate(item.createdAt)}</Text>
      </View>
      
      <View style={styles.reportDetails}>
        {item.reason && (
          <View style={styles.detailRow}>
            <Ionicons name="alert-circle" size={16} color="#8B4513" />
            <Text style={styles.detailText}>{item.reason}</Text>
          </View>
        )}
        
        {item.location && (
          <View style={styles.detailRow}>
            <Ionicons name="location" size={16} color="#8B4513" />
            <Text style={styles.detailText}>
              {item.location.address?.street || 'Location captured'}
            </Text>
          </View>
        )}
        
        {item.mediaType && (
          <View style={styles.detailRow}>
            <Ionicons 
              name={item.mediaType === 'video' ? 'videocam' : 'mic'} 
              size={16} 
              color="#8B4513" 
            />
            <Text style={styles.detailText}>
              {item.mediaType === 'video' ? 'Video attached' : 'Audio recording'}
            </Text>
          </View>
        )}
        
        {item.comment && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionLabel}>Details:</Text>
            <Text style={styles.descriptionText}>{item.comment}</Text>
          </View>
        )}
      </View>

      <View style={styles.reportFooter}>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Submitted</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#8B4513', '#654321']} style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={openDrawer} style={styles.headerButton}>
                <Ionicons name="menu" size={28} color="#D4AC0D" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={28} color="#D4AC0D" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerTitle}>📋 My Reports</Text>
            <Text style={styles.headerSubtitle}>View your noise reports</Text>
          </View>
        </LinearGradient>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8B4513" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
      {/* Header */}
      <LinearGradient colors={['#8B4513', '#654321']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={openDrawer} style={styles.headerButton}>
              <Ionicons name="menu" size={28} color="#D4AC0D" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={28} color="#D4AC0D" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>📋 My Reports</Text>
          <Text style={styles.headerSubtitle}>
            {reports.length} {reports.length === 1 ? 'report' : 'reports'} submitted
          </Text>
        </View>
      </LinearGradient>

      {/* Reports List */}
      {reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="document-text-outline" size={80} color="#D4AC0D" />
          </View>
          <Text style={styles.emptyText}>No reports yet</Text>
          <Text style={styles.emptySubtext}>
            Create a new noise report to get started
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => navigation.navigate('AudioRecording')}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.emptyButtonText}>Create Report</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderReportItem}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#8B4513']}
              tintColor="#8B4513"
            />
          }
        />
      )}

      {/* Custom Drawer Modal */}
      <Modal 
        visible={drawerVisible} 
        transparent 
        animationType="none" 
        onRequestClose={closeDrawer}
      >
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
            <TouchableOpacity 
              style={{ flex: 1 }} 
              activeOpacity={1} 
              onPress={closeDrawer} 
            />
          </Animated.View>
          <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
            <CustomDrawer navigation={navigation} onClose={closeDrawer} />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    paddingTop: getStatusBarHeight(),
    paddingBottom: 20,
    paddingHorizontal: 20
  },
  headerContent: {
    marginTop: 10
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  headerButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#D4AC0D'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8B4513',
    fontWeight: '500'
  },
  listContent: {
    padding: 15,
    paddingBottom: 30
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3
  },
  reportHeader: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  reportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B4513'
  },
  reportDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2
  },
  reportDetails: {
    gap: 10,
    marginBottom: 12
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '500'
  },
  descriptionContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#D4AC0D'
  },
  descriptionLabel: {
    fontSize: 12,
    color: '#8B4513',
    fontWeight: 'bold',
    marginBottom: 4
  },
  descriptionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e8f5e9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50'
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#8B4513',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  modalContainer: {
    flex: 1
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: width * 0.8
  }
});

export default UserReportsScreen;
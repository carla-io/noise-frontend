import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  StatusBar,
  Dimensions,
  Platform,
  Easing,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CustomDrawer from './CustomDrawer';
import API_BASE_URL from '../utils/api';

const { width, height } = Dimensions.get('window');

const getStatusBarHeight = () => {
  return Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;
};

const Home = ({ navigation }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [userName] = useState('User');
  const [currentDb, setCurrentDb] = useState(42);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDb(Math.floor(Math.random() * (90 - 30) + 30));
    }, 2000);
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Fetch total users
    fetch(`${API_BASE_URL}/user/countUsersOnly`)
      .then(res => res.json())
      .then(data => setTotalUsers(data.totalUsers || 0))
      .catch(err => console.error('Error fetching users:', err));

    // Fetch total reports
    fetch(`${API_BASE_URL}/reports/total-reports`)
      .then(res => res.json())
      .then(data => setTotalReports(data.totalReports || 0))
      .catch(err => console.error('Error fetching reports:', err));
    
    return () => clearInterval(interval);
  }, []);

  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -width * 0.8, duration: 300, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setDrawerVisible(false));
  };

  const recentReports = [
    { id: 1, type: 'Construction', distance: '0.2 km', time: '2 mins ago', level: 78 },
    { id: 2, type: 'Traffic', distance: '0.5 km', time: '15 mins ago', level: 65 },
    { id: 3, type: 'Event', distance: '1.2 km', time: '1 hour ago', level: 82 },
  ];

  const noiseHotspots = [
    { x: 30, y: 40, intensity: 0.8 },
    { x: 60, y: 25, intensity: 0.6 },
    { x: 20, y: 70, intensity: 0.9 },
    { x: 80, y: 50, intensity: 0.4 },
  ];

  const getDbColor = (db) => {
    if (db < 50) return '#8B7355';
    if (db < 70) return '#D4AC0D';
    if (db < 85) return '#E67E22';
    return '#E74C3C';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
      <LinearGradient colors={['#8B4513', '#654321']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={openDrawer} style={styles.headerButton}>
              <Ionicons name="menu" size={28} color="#D4AC0D" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.headerButton}>
              <Ionicons name="settings" size={28} color="#D4AC0D" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>Welcome back, {userName}!</Text>
          <Text style={styles.headerSubtitle}>Monitor your noise environment</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* Welcome Card */}
        <Animated.View style={[styles.welcomeCard, { opacity: fadeAnim }]}>
          <View style={styles.welcomeIcon}>
            <Ionicons name="volume-high" size={40} color="#8B4513" />
          </View>
          <Text style={styles.welcomeTitle}>Welcome to NoiseWatch</Text>
          <Text style={styles.welcomeText}>
            Your personal noise monitoring companion. Track, report, and analyze noise pollution in your environment. Together, we create quieter, healthier communities.
          </Text>
          <View style={styles.welcomeStats}>
            <View style={styles.welcomeStat}>
              <Text style={styles.welcomeStatNum}>{totalUsers.toLocaleString()}</Text>
              <Text style={styles.welcomeStatLabel}>Active Users</Text>
            </View>
            <View style={styles.welcomeStat}>
              <Text style={styles.welcomeStatNum}>{totalReports.toLocaleString()}</Text>
              <Text style={styles.welcomeStatLabel}>Total Reports</Text>
            </View>
          </View>
        </Animated.View>

        {/* How It Works */}
        <View style={styles.howItWorksCard}>
          <Text style={styles.sectionTitle}>🎯 How It Works</Text>
          
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Monitor Noise</Text>
              <Text style={styles.stepText}>Real-time decibel readings from your environment</Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Report Issues</Text>
              <Text style={styles.stepText}>Share noise problems in your community</Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>View Hotspots</Text>
              <Text style={styles.stepText}>See noise pollution maps and trends</Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Make Impact</Text>
              <Text style={styles.stepText}>Help create quieter, healthier spaces</Text>
            </View>
          </View>
        </View>

        {/* Recent Reports Nearby */}
        <View style={styles.reportsSection}>
          <Text style={styles.sectionTitle}>📍 Recent Reports Nearby</Text>
          {recentReports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View style={styles.reportIcon}>
                  <Ionicons 
                    name={
                      report.type === 'Construction' ? 'construct' :
                      report.type === 'Traffic' ? 'car' : 'musical-notes'
                    } 
                    size={20} 
                    color="#8B4513" 
                  />
                </View>
                <View style={styles.reportInfo}>
                  <Text style={styles.reportType}>{report.type}</Text>
                  <Text style={styles.reportDistance}>{report.distance} • {report.time}</Text>
                </View>
                <View style={[styles.levelBadge, { backgroundColor: getDbColor(report.level) }]}>
                  <Text style={styles.levelText}>{report.level}dB</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Mini Map Preview */}
        <View style={styles.mapSection}>
          <Text style={styles.sectionTitle}>🗺️ Noise Hotspots</Text>
          <View style={styles.miniMap}>
            <View style={styles.mapGrid}>
              {noiseHotspots.map((hotspot, index) => (
                <View
                  key={index}
                  style={[
                    styles.hotspot,
                    {
                      left: `${hotspot.x}%`,
                      top: `${hotspot.y}%`,
                      backgroundColor: `rgba(212, 172, 13, ${hotspot.intensity})`,
                    }
                  ]}
                />
              ))}
              <View style={styles.yourLocation}>
                <Ionicons name="location" size={16} color="#8B4513" />
              </View>
            </View>
            <View style={styles.mapLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#D4AC0D' }]} />
                <Text style={styles.legendText}>High Noise</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#8B7355' }]} />
                <Text style={styles.legendText}>Moderate</Text>
              </View>
              <View style={styles.legendItem}>
                <Ionicons name="location" size={12} color="#8B4513" />
                <Text style={styles.legendText}>You</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Call to Action */}
        <View style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>Ready to Get Started?</Text>
          <Text style={styles.ctaText}>Begin monitoring noise levels and contribute to your community</Text>
          <TouchableOpacity style={styles.ctaButton} onPress={() => navigation.navigate('Record')}>
            <LinearGradient colors={['#D4AC0D', '#B8860B']} style={styles.ctaGradient}>
              <Ionicons name="mic" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.ctaButtonText}>Start Recording</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
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
  container: { flex: 1, backgroundColor: '#FFF8DC' },
  header: { paddingBottom: 30, paddingTop: getStatusBarHeight(), borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { paddingHorizontal: 20, paddingTop: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  headerButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(212, 172, 13, 0.2)' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  headerSubtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.8)' },
  scrollView: { flex: 1, paddingTop: 20 },
  
  welcomeCard: { backgroundColor: '#fff', margin: 15, borderRadius: 20, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  welcomeIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF8DC', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  welcomeTitle: { fontSize: 24, fontWeight: 'bold', color: '#8B4513', marginBottom: 12, textAlign: 'center' },
  welcomeText: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  welcomeStats: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  welcomeStat: { alignItems: 'center' },
  welcomeStatNum: { fontSize: 22, fontWeight: 'bold', color: '#D4AC0D' },
  welcomeStatLabel: { fontSize: 12, color: '#666', marginTop: 4 },

  howItWorksCard: { backgroundColor: '#fff', margin: 15, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#8B4513', marginBottom: 15 },
  stepItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  stepNumber: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#D4AC0D', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  stepNumberText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  stepContent: { flex: 1, paddingTop: 2 },
  stepTitle: { fontSize: 16, fontWeight: '600', color: '#8B4513', marginBottom: 4 },
  stepText: { fontSize: 13, color: '#666', lineHeight: 18 },

  reportsSection: { backgroundColor: '#fff', margin: 15, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  reportCard: { backgroundColor: '#FFF8DC', borderRadius: 12, padding: 15, marginBottom: 10 },
  reportHeader: { flexDirection: 'row', alignItems: 'center' },
  reportIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#D4AC0D', alignItems: 'center', justifyContent: 'center' },
  reportInfo: { flex: 1, marginLeft: 15 },
  reportType: { fontSize: 16, fontWeight: '600', color: '#8B4513' },
  reportDistance: { fontSize: 12, color: '#666', marginTop: 2 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  levelText: { color: '#fff', fontSize: 10, fontWeight: '600' },

  mapSection: { backgroundColor: '#fff', margin: 15, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  miniMap: { height: 150, backgroundColor: '#F5F5DC', borderRadius: 12, overflow: 'hidden' },
  mapGrid: { flex: 1, position: 'relative' },
  hotspot: { position: 'absolute', width: 20, height: 20, borderRadius: 10 },
  yourLocation: { position: 'absolute', top: '45%', left: '45%', width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  mapLegend: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, backgroundColor: '#fff' },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendColor: { width: 10, height: 10, borderRadius: 5, marginRight: 5 },
  legendText: { fontSize: 10, color: '#666' },

  ctaCard: { backgroundColor: '#fff', margin: 15, borderRadius: 20, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  ctaTitle: { fontSize: 20, fontWeight: 'bold', color: '#8B4513', marginBottom: 8, textAlign: 'center' },
  ctaText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  ctaButton: { width: '100%' },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12 },
  ctaButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  modalContainer: { flex: 1, flexDirection: 'row' },
  drawerContainer: { width: width * 0.8, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5, position: 'absolute', left: 0, top: 0, bottom: 0 },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
});

export default Home;
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

const { width, height } = Dimensions.get('window');

const getStatusBarHeight = () => {
  return Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;
};

const Home = ({ navigation }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [userName, setUserName] = useState('User');
  const [isRecording, setIsRecording] = useState(false);
  const [currentDb, setCurrentDb] = useState(42);
  const [healthAlert, setHealthAlert] = useState(false);
  const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const gaugeAnim = useRef(new Animated.Value(0)).current;

  // Mock data for recent reports
  const recentReports = [
    { id: 1, type: 'Construction', distance: '0.2 km', time: '2 mins ago', level: 78 },
    { id: 2, type: 'Traffic', distance: '0.5 km', time: '15 mins ago', level: 65 },
    { id: 3, type: 'Event', distance: '1.2 km', time: '1 hour ago', level: 82 },
  ];

  // Mock hotspots data
  const noiseHotspots = [
    { x: 30, y: 40, intensity: 0.8 },
    { x: 60, y: 25, intensity: 0.6 },
    { x: 20, y: 70, intensity: 0.9 },
    { x: 80, y: 50, intensity: 0.4 },
  ];

  useEffect(() => {
    // Simulate real-time dB reading
    const interval = setInterval(() => {
      const newDb = Math.floor(Math.random() * (90 - 30) + 30);
      setCurrentDb(newDb);
      setHealthAlert(newDb > 85);
      
      // Animate gauge
      Animated.timing(gaugeAnim, {
        toValue: newDb / 100,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Pulse animation for recording button
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const getDbColor = (db) => {
    if (db < 50) return '#8B7355'; // Safe - brown
    if (db < 70) return '#D4AC0D'; // Moderate - mustard
    if (db < 85) return '#E67E22'; // High - orange
    return '#E74C3C'; // Dangerous - red
  };

  const getDbLevel = (db) => {
    if (db < 50) return 'QUIET';
    if (db < 70) return 'MODERATE';
    if (db < 85) return 'LOUD';
    return 'DANGEROUS';
  };

  const toggleRecording = () => {
    const route = 'Record';
  navigation.navigate(route);
  };

  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -width * 0.8,
        duration: 300,
        easing: Easing.bezier(0.55, 0.06, 0.68, 0.19),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => setDrawerVisible(false));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
      {/* Header Section */}
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
          <Text style={styles.headerTitle}>
            Welcome back, {userName}!
          </Text>
          <Text style={styles.headerSubtitle}>Monitor your noise environment</Text>
        </View>
      </LinearGradient>

      {/* Health Alert Banner */}
      {healthAlert && (
        <View style={styles.healthAlert}>
          <Ionicons name="warning" size={20} color="#fff" />
          <Text style={styles.healthAlertText}>
            ⚠️ High noise exposure! Consider moving to a quieter area.
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Noise Meter */}
        <View style={styles.noiseMeterContainer}>
          <Text style={styles.sectionTitle}>🔊 Live Noise Meter</Text>
          <View style={styles.gaugeCenterContainer}>
            <View style={[styles.gauge, { borderColor: getDbColor(currentDb) }]}>
              <Animated.View 
                style={[
                  styles.gaugeIndicator, 
                  { 
                    backgroundColor: getDbColor(currentDb),
                    transform: [{
                      rotate: gaugeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['-90deg', '90deg']
                      })
                    }]
                  }
                ]} 
              />
              <View style={styles.gaugeCenter}>
                <Text style={[styles.dbReading, { color: getDbColor(currentDb) }]}>
                  {currentDb}
                </Text>
                <Text style={styles.dbUnit}>dB</Text>
                <Text style={[styles.dbLevel, { color: getDbColor(currentDb) }]}>
                  {getDbLevel(currentDb)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Record Button */}
        <View style={styles.recordSection}>
          <Text style={styles.sectionTitle}>🎙️ Quick Record</Text>
          <TouchableOpacity onPress={toggleRecording} style={styles.recordButtonContainer}>
            <Animated.View 
              style={[
                styles.recordButton, 
                { 
                  backgroundColor: isRecording ? '#E74C3C' : '#D4AC0D',
                  transform: [{ scale: pulseAnim }]
                }
              ]}
            >
              <Ionicons 
                name={isRecording ? "stop" : "mic"} 
                size={40} 
                color="#fff" 
              />
            </Animated.View>
          </TouchableOpacity>
          <Text style={styles.recordStatus}>
            {isRecording ? 'Recording... Tap to stop' : 'Tap to start recording'}
          </Text>
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
              {/* Your location */}
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
      </ScrollView>

      {/* Drawer Modal */}
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
  container: {
    flex: 1,
    backgroundColor: '#FFF8DC', // Light cream background
  },
  header: {
    paddingBottom: 30,
    paddingTop: getStatusBarHeight(),
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 172, 13, 0.2)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  healthAlert: {
    backgroundColor: '#E74C3C',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: -15,
    marginHorizontal: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  healthAlertText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingTop: 20,
  },
  noiseMeterContainer: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B4513',
    marginBottom: 15,
  },
  gaugeCenterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gauge: {
    width: 200,
    height: 100,
    borderWidth: 8,
    borderBottomColor: 'transparent',
    borderRadius: 100,
    position: 'relative',
    overflow: 'hidden',
  },
  gaugeIndicator: {
    position: 'absolute',
    top: 92,
    left: 96,
    width: 4,
    height: 60,
    transformOrigin: 'bottom center',
  },
  gaugeCenter: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dbReading: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  dbUnit: {
    fontSize: 14,
    color: '#666',
  },
  dbLevel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  recordSection: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  recordButtonContainer: {
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  recordStatus: {
    marginTop: 15,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  reportsSection: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  reportCard: {
    backgroundColor: '#FFF8DC',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D4AC0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportInfo: {
    flex: 1,
    marginLeft: 15,
  },
  reportType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
  },
  reportDistance: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  mapSection: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  miniMap: {
    height: 150,
    backgroundColor: '#F5F5DC',
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapGrid: {
    flex: 1,
    position: 'relative',
  },
  hotspot: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  yourLocation: {
    position: 'absolute',
    top: '45%',
    left: '45%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  mapLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  legendText: {
    fontSize: 10,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerContainer: {
    width: width * 0.8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});

export default Home;
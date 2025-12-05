import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Animated,
  StatusBar,
  Dimensions,
  Platform,
  Easing,
  Text,
  Alert,
} from "react-native";
import MapView, { Marker, Circle, Callout} from 'react-native-maps';
import * as Location from "expo-location";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CustomDrawer from '../CustomDrawer';
import API_BASE_URL from '../../utils/api';

const { width, height } = Dimensions.get('window');

const getStatusBarHeight = () => {
  return Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;
};

const MapScreen = ({ navigation }) => {
  const [region, setRegion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [reports, setReports] = useState([]);
  const mapRef = useRef(null);
  
  // Animation refs for drawer
  const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Fetch map data from backend
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/reports/map-data`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        console.log('Fetched reports:', data);
        setReports(data);
      } catch (err) {
        console.error("Error fetching map data:", err);
        Alert.alert("Error", "Could not load noise reports. Please check your connection.");
      }
    };
    fetchMapData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchMapData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setPermissionDenied(true);
          // Use default location (Manila, Philippines)
          setRegion({
            latitude: 14.5995,
            longitude: 120.9842,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
          setIsLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } catch (error) {
        console.error("Error getting location:", error);
        // Use default location on error
        setRegion({
          latitude: 14.5995,
          longitude: 120.9842,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

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
        toValue: 0.5,
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

  const handleRecenterMap = async () => {
    if (permissionDenied) {
      Alert.alert("Location Access", "Please enable location permissions to use this feature");
      return;
    }

    try {
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const newRegion = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      
      setRegion(newRegion);
      
      // Animate to new region
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      console.log('Could not get current location');
      Alert.alert("Location Error", "Unable to get current location");
    }
  };

  const handleNoiseReport = () => {
    console.log('Noise report button pressed - navigating to Report screen');
    try {
      if (navigation && navigation.navigate) {
        navigation.navigate('Report', { 
          currentLocation: region ? {
            latitude: region.latitude,
            longitude: region.longitude
          } : null
        });
      } else {
        console.warn('Navigation not available');
        Alert.alert("Navigation Error", "Report screen not available");
      }
    } catch (error) {
      console.error('Report navigation error:', error);
      Alert.alert("Navigation Error", "Could not open report screen");
    }
  };

  const handleSettingsPress = () => {
    console.log('Settings button pressed - navigating to Settings');
    try {
      if (navigation && navigation.navigate) {
        navigation.navigate('Settings');
      } else {
        console.warn('Navigation not available');
        Alert.alert("Navigation Error", "Settings screen not available");
      }
    } catch (error) {
      console.error('Settings navigation error:', error);
      Alert.alert("Navigation Error", "Could not open settings");
    }
  };

  // Get color and label based on report count
  const getMarkerStyle = (count) => {
    if (count >= 5) {
      return {
        color: '#B71C1C', // Dark Red - Critical
        label: 'Critical',
        radius: 150,
        opacity: 0.4
      };
    } else if (count >= 3) {
      return {
        color: '#D32F2F', // Red - High
        label: 'High',
        radius: 120,
        opacity: 0.35
      };
    } else if (count === 2) {
      return {
        color: '#FF9800', // Orange - Medium
        label: 'Medium',
        radius: 90,
        opacity: 0.3
      };
    } else {
      return {
        color: '#FFC107', // Yellow - Low
        label: 'Low',
        radius: 60,
        opacity: 0.25
      };
    }
  };

  if (isLoading || !region) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#8B4513" translucent={false} />
        <LinearGradient colors={["#8B4513", "#654321", "#D4AC0D"]} style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <View style={styles.loadingSpinner}>
              <ActivityIndicator size="large" color="#D4AC0D" />
            </View>
            <Text style={styles.loadingText}>Getting your location...</Text>
            <Text style={styles.loadingSubtext}>Preparing noise map data</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B4513" translucent={false} />
      
      {/* Header */}
      <LinearGradient colors={['#8B4513', '#654321']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="#D4AC0D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Noise Map</Text>
          <TouchableOpacity onPress={handleSettingsPress} style={styles.settingsButton}>
            <Ionicons name="settings" size={28} color="#D4AC0D" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          showsUserLocation={!permissionDenied}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
        >
          {reports && reports.length > 0 && reports.map((item, index) => {
            // Validate the data structure
            if (!item.coordinates || !Array.isArray(item.coordinates) || item.coordinates.length !== 2) {
              console.warn('Invalid report data:', item);
              return null;
            }

            // Backend returns: { _id, count, coordinates: [lon, lat] }
            const [lon, lat] = item.coordinates;
            const count = item.count || 1;

            // Validate coordinates
            if (typeof lat !== 'number' || typeof lon !== 'number' || 
                isNaN(lat) || isNaN(lon) ||
                lat < -90 || lat > 90 || lon < -180 || lon > 180) {
              console.warn('Invalid coordinates:', { lat, lon });
              return null;
            }

            const markerStyle = getMarkerStyle(count);

            return (
              <React.Fragment key={`marker-${index}-${lon}-${lat}`}>
                {/* Colored Circle to show intensity */}
                <Circle
                  center={{ latitude: lat, longitude: lon }}
                  radius={markerStyle.radius}
                  fillColor={markerStyle.color}
                  strokeColor={markerStyle.color}
                  strokeWidth={2}
                  fillOpacity={markerStyle.opacity}
                />
                
                {/* Pin Marker */}
                // In your Marker component, change this:
<Marker
  coordinate={{ latitude: lat, longitude: lon }}
  pinColor={markerStyle.color}
>
  <View style={styles.markerContainer}>
    <View style={[styles.markerCircle, { backgroundColor: markerStyle.color }]}>
      <Text style={styles.markerText}>{count}</Text>
    </View>
    <View style={[styles.markerTriangle, { borderTopColor: markerStyle.color }]} />
  </View>
  {/* FIXED: Changed from MapView.Callout to Callout */}
  <Callout>
    <View style={styles.calloutContainer}>
      <Text style={styles.calloutTitle}>{markerStyle.label} Noise Level</Text>
      <Text style={styles.calloutText}>{count} Report{count > 1 ? 's' : ''}</Text>
      <Text style={styles.calloutDescription}>
        This location has received {count} noise complaint{count > 1 ? 's' : ''}
      </Text>
    </View>
  </Callout>
</Marker>
              </React.Fragment>
            );
          })}
        </MapView>

        {/* Legend */}
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>Noise Levels</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FFC107' }]} />
            <Text style={styles.legendText}>Low (1)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.legendText}>Medium (2)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#D32F2F' }]} />
            <Text style={styles.legendText}>High (3-4)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#B71C1C' }]} />
            <Text style={styles.legendText}>Critical (5+)</Text>
          </View>
        </View>
      </View>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        <TouchableOpacity 
          style={[styles.fab, { marginBottom: 10, opacity: permissionDenied ? 0.5 : 1 }]} 
          onPress={handleRecenterMap}
          disabled={permissionDenied}
        >
          <Ionicons name="locate" size={24} color="#8B4513" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.fab} onPress={handleNoiseReport}>
          <Ionicons name="volume-high" size={24} color="#8B4513" />
        </TouchableOpacity>
      </View>

      {/* Drawer Modal */}
      <Modal 
        visible={drawerVisible} 
        transparent 
        animationType="none" 
        onRequestClose={closeDrawer}
        statusBarTranslucent
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
    backgroundColor: '#000',
  },
  header: {
    paddingTop: getStatusBarHeight(),
    paddingBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D4AC0D',
    flex: 1,
    textAlign: 'center',
  },
  settingsButton: {
    padding: 8,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
 markerContainer: {
    alignItems: 'center',
  },
  markerCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  markerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  markerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  calloutContainer: {
    padding: 10,
    minWidth: 200,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  calloutText: {
    fontSize: 14,
    marginBottom: 3,
  },
  calloutDescription: {
    fontSize: 12,
    color: '#666',
  },
  legendContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  legendText: {
    fontSize: 12,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingSpinner: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#D4AC0D',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.8,
  },
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D4AC0D',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  modalContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: width * 0.8,
  },
});

export default MapScreen
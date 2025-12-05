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
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio, Video } from 'expo-av';
import CustomDrawer from '../CustomDrawer';
import API_BASE_URL from '../../utils/api';

const { width, height } = Dimensions.get('window');

const getStatusBarHeight = () => {
  return Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;
};

export default function AdminNoiseReportsScreen({ navigation }) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedReport, setExpandedReport] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [playingAudio, setPlayingAudio] = useState(null);
  const [sound, setSound] = useState(null);

  const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchReports();
    
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/reports/get-report`);
      const data = await response.json();
      
      if (response.ok) {
        // Transform the data to match the expected structure
        const transformedReports = data.map(report => ({
          ...report,
          // Map mediaUrl to audioUri or videoUri based on mediaType
          audioUri: report.mediaType === 'audio' ? report.mediaUrl : null,
          videoUri: report.mediaType === 'video' ? report.mediaUrl : null,
        }));
        setReports(transformedReports);
      } else {
        Alert.alert('Error', 'Failed to fetch reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const playAudio = async (audioUri, reportId) => {
    try {
      // Stop any currently playing audio
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        if (playingAudio === reportId) {
          setPlayingAudio(null);
          return;
        }
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setPlayingAudio(reportId);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingAudio(null);
          newSound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Could not play audio');
    }
  };

  const getFilteredReports = () => {
    if (selectedFilter === 'All') return reports;
    return reports.filter(report => 
      report.reason?.includes(selectedFilter) || 
      report.reason === selectedFilter
    );
  };

  const getReasonIcon = (reason) => {
    if (!reason) return '📢';
    if (reason.includes('Music')) return '🔊';
    if (reason.includes('Vehicle')) return '🚗';
    if (reason.includes('Construction')) return '🔨';
    if (reason.includes('Party')) return '🎉';
    if (reason.includes('Animal')) return '🐕';
    if (reason.includes('Industrial')) return '🏭';
    if (reason.includes('Shouting')) return '🗣️';
    return '📢';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
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

  const filters = ['All', 'Music', 'Vehicle', 'Construction', 'Party', 'Animal'];
  const filteredReports = getFilteredReports();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
      <LinearGradient colors={['#8B4513', '#654321']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={openDrawer} style={styles.headerButton}>
              <Ionicons name="menu" size={28} color="#D4AC0D" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
              <Ionicons name="refresh" size={28} color="#D4AC0D" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>📊 Noise Reports</Text>
          <Text style={styles.headerSubtitle}>
            {filteredReports.length} {selectedFilter !== 'All' ? selectedFilter : ''} report{filteredReports.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </LinearGradient>

      {/* Filter Pills */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterPill,
              selectedFilter === filter && styles.filterPillActive
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[
              styles.filterPillText,
              selectedFilter === filter && styles.filterPillTextActive
            ]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Reports List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B4513" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      ) : filteredReports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={80} color="#CCC" />
          <Text style={styles.emptyText}>No reports found</Text>
          <Text style={styles.emptySubtext}>
            {selectedFilter !== 'All' 
              ? `No ${selectedFilter} reports available` 
              : 'Reports will appear here when submitted'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.reportsList}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#8B4513']}
              tintColor="#8B4513"
            />
          }
        >
          {filteredReports.map((report) => (
            <TouchableOpacity
              key={report._id}
              style={styles.reportCard}
              onPress={() => setExpandedReport(expandedReport === report._id ? null : report._id)}
              activeOpacity={0.7}
            >
              <View style={styles.reportHeader}>
                <View style={styles.reportHeaderLeft}>
                  <Text style={styles.reportIcon}>{getReasonIcon(report.reason)}</Text>
                  <View style={styles.reportHeaderText}>
                    <Text style={styles.reportReason}>{report.reason || 'Noise Report'}</Text>
                    <Text style={styles.reportDate}>{formatDate(report.createdAt)}</Text>
                  </View>
                </View>
                <Ionicons 
                  name={expandedReport === report._id ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color="#8B4513" 
                />
              </View>

              {expandedReport === report._id && (
                <View style={styles.reportDetails}>
                  {/* Comment */}
                  {report.comment && (
                    <View style={styles.detailSection}>
                      <View style={styles.detailHeader}>
                        <Ionicons name="chatbox-outline" size={18} color="#8B4513" />
                        <Text style={styles.detailLabel}>Details</Text>
                      </View>
                      <Text style={styles.detailText}>{report.comment}</Text>
                    </View>
                  )}

                  {/* Location */}
                  {report.location && (
                    <View style={styles.detailSection}>
                      <View style={styles.detailHeader}>
                        <Ionicons name="location" size={18} color="#8B4513" />
                        <Text style={styles.detailLabel}>Location</Text>
                      </View>
                      <Text style={styles.detailText}>
                        Lat: {report.location.latitude?.toFixed(6)}, Lon: {report.location.longitude?.toFixed(6)}
                      </Text>
                      {report.location.accuracy && (
                        <Text style={styles.accuracyText}>
                          Accuracy: ±{Math.round(report.location.accuracy)}m
                        </Text>
                      )}
                      <TouchableOpacity 
                        style={styles.mapButton}
                        onPress={() => {
                          const url = `https://www.google.com/maps?q=${report.location.latitude},${report.location.longitude}`;
                          Alert.alert('Open in Maps', 'Would you like to view this location in Google Maps?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open', onPress: () => console.log('Open maps:', url) }
                          ]);
                        }}
                      >
                        <Ionicons name="map" size={16} color="#FFF" />
                        <Text style={styles.mapButtonText}>View on Map</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Audio Recording */}
                  {report.audioUri && (
                    <View style={styles.detailSection}>
                      <View style={styles.detailHeader}>
                        <Ionicons name="musical-notes" size={18} color="#8B4513" />
                        <Text style={styles.detailLabel}>Audio Recording</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.audioButton}
                        onPress={() => playAudio(report.audioUri, report._id)}
                      >
                        <Ionicons 
                          name={playingAudio === report._id ? "pause-circle" : "play-circle"} 
                          size={40} 
                          color="#8B4513" 
                        />
                        <Text style={styles.audioButtonText}>
                          {playingAudio === report._id ? 'Pause Audio' : 'Play Audio'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Video */}
                  {report.videoUri && (
                    <View style={styles.detailSection}>
                      <View style={styles.detailHeader}>
                        <Ionicons name="videocam" size={18} color="#8B4513" />
                        <Text style={styles.detailLabel}>Video Recording</Text>
                      </View>
                      <View style={styles.videoContainer}>
                        <Video
                          source={{ uri: report.videoUri }}
                          style={styles.video}
                          useNativeControls
                          resizeMode="contain"
                        />
                      </View>
                    </View>
                  )}

                  {/* Timestamp */}
                  <View style={styles.detailSection}>
                    <View style={styles.detailHeader}>
                      <Ionicons name="time-outline" size={18} color="#8B4513" />
                      <Text style={styles.detailLabel}>Submitted</Text>
                    </View>
                    <Text style={styles.detailText}>
                      {new Date(report.createdAt).toLocaleString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.actionButtonResolve]}
                      onPress={() => Alert.alert('Mark as Resolved', 'This feature will be implemented soon')}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                      <Text style={styles.actionButtonText}>Resolve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.actionButtonDelete]}
                      onPress={() => {
                        Alert.alert(
                          'Delete Report',
                          'Are you sure you want to delete this report?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => {
                              // Implement delete functionality
                              Alert.alert('Deleted', 'Report deleted successfully');
                            }}
                          ]
                        );
                      }}
                    >
                      <Ionicons name="trash" size={20} color="#FFF" />
                      <Text style={styles.actionButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5E6D3',
  },
  header: {
    paddingTop: getStatusBarHeight(),
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#D4AC0D',
  },
  filterContainer: {
    maxHeight: 60,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
  },
  filterPill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5E6D3',
    borderWidth: 2,
    borderColor: '#D4AC0D',
  },
  filterPillActive: {
    backgroundColor: '#D4AC0D',
    borderColor: '#8B4513',
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
  },
  filterPillTextActive: {
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8,
    textAlign: 'center',
  },
  reportsList: {
    flex: 1,
    padding: 15,
  },
  reportCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  reportIcon: {
    fontSize: 32,
  },
  reportHeaderText: {
    flex: 1,
  },
  reportReason: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 12,
    color: '#999',
  },
  reportDetails: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  detailSection: {
    marginBottom: 15,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  accuracyText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B4513',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  mapButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5E6D3',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D4AC0D',
  },
  audioButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B4513',
  },
  videoContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionButtonResolve: {
    backgroundColor: '#27AE60',
  },
  actionButtonDelete: {
    backgroundColor: '#E74C3C',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: width * 0.8,
  },
});
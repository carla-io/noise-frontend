import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Alert, Modal, Animated, StatusBar, Dimensions, Platform, Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Video, Audio } from 'expo-av';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../../utils/api';
import CustomDrawer from '../CustomDrawer';

const { width } = Dimensions.get('window');
const getStatusBarHeight = () => Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24;

const UserReportsScreen = ({ navigation }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [userId, setUserId] = useState(null);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [playingAudio, setPlayingAudio] = useState({});
  const [audioStates, setAudioStates] = useState({});
  
  const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const audioRefs = useRef({});

  useEffect(() => {
    initializeUser();
    return () => {
      Object.values(audioRefs.current).forEach(async (sound) => {
        if (sound) {
          try { await sound.unloadAsync(); } catch (e) {}
        }
      });
    };
  }, []);

  useEffect(() => { if (userId) fetchReports(); }, [userId]);

  const initializeUser = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) {
        Alert.alert('Authentication Required', 'Please log in to view your reports.', [{ text: 'OK', onPress: () => navigation.navigate('Login') }]);
        setLoading(false);
        return;
      }
      setUserId(storedUserId);
    } catch (error) {
      Alert.alert('Error', 'Failed to retrieve user information.');
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    if (!userId) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/reports/get-user-report/${userId}`);
      if (response.data) setReports(response.data.reports || []);
    } catch (error) {
      let errorMessage = 'Failed to fetch reports. Please try again.';
      if (error.response) errorMessage = error.response.data?.message || errorMessage;
      else if (error.request) errorMessage = 'Network error. Please check your internet connection.';
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

  const toggleReportExpansion = (reportId) => {
    setExpandedReportId(expandedReportId === reportId ? null : reportId);
  };

  const playAudio = async (reportId, audioUrl) => {
    try {
      if (audioRefs.current[reportId]) {
        await audioRefs.current[reportId].unloadAsync();
        delete audioRefs.current[reportId];
      }
      for (const [id, sound] of Object.entries(audioRefs.current)) {
        if (id !== reportId) {
          await sound.stopAsync();
          setAudioStates(prev => ({...prev, [id]: { isPlaying: false, position: 0 }}));
        }
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: true }, (status) => onPlaybackStatusUpdate(reportId, status));
      audioRefs.current[reportId] = sound;
      setPlayingAudio(prev => ({...prev, [reportId]: true}));
    } catch (error) {
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const pauseAudio = async (reportId) => {
    try {
      const sound = audioRefs.current[reportId];
      if (sound) {
        await sound.pauseAsync();
        setPlayingAudio(prev => ({...prev, [reportId]: false}));
      }
    } catch (error) {}
  };

  const resumeAudio = async (reportId) => {
    try {
      const sound = audioRefs.current[reportId];
      if (sound) {
        await sound.playAsync();
        setPlayingAudio(prev => ({...prev, [reportId]: true}));
      }
    } catch (error) {}
  };

  const stopAudio = async (reportId) => {
    try {
      const sound = audioRefs.current[reportId];
      if (sound) {
        await sound.stopAsync();
        await sound.setPositionAsync(0);
        setPlayingAudio(prev => ({...prev, [reportId]: false}));
        setAudioStates(prev => ({...prev, [reportId]: { isPlaying: false, position: 0 }}));
      }
    } catch (error) {}
  };

  const onPlaybackStatusUpdate = (reportId, status) => {
    if (status.isLoaded) {
      setAudioStates(prev => ({ ...prev, [reportId]: { isPlaying: status.isPlaying, position: status.positionMillis, duration: status.durationMillis } }));
      if (status.didJustFinish) {
        setPlayingAudio(prev => ({...prev, [reportId]: false}));
        setAudioStates(prev => ({...prev, [reportId]: { isPlaying: false, position: 0 }}));
      }
    }
  };

  const formatDuration = (millis) => {
    if (!millis) return '0:00';
    const seconds = Math.floor(millis / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -width * 0.8, duration: 300, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setDrawerVisible(false));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status) => ({ pending: '#999', action_required: '#F44336', monitoring: '#FFC107', resolved: '#4CAF50' }[status] || '#999');
  const getStatusLabel = (status) => ({ pending: 'Pending', action_required: 'Action Required', monitoring: 'Monitoring', resolved: 'Resolved' }[status] || 'Pending');
  const getStatusBg = (status) => ({ pending: '#F5F5F5', action_required: '#FFEBEE', monitoring: '#FFF9C4', resolved: '#E8F5E9' }[status] || '#F5F5F5');

  const getAdminResponse = (report) => {
    const { noiseLevel, status, consecutiveDays } = report;
    if (!status || status === 'pending') return "Your report is being reviewed by the barangay.";
    
    if (noiseLevel === "red") {
      if (status === "resolved") return "Your noise complaint has been resolved. Appropriate action has been taken by the barangay.";
      if (status === "action_required" && consecutiveDays >= 3) return "The noise at this location has been reported for 3 consecutive days. A barangay officer has been assigned to take action. You will be updated once resolved.";
      return `We have received your report. The barangay is monitoring this location. Progress: Day ${consecutiveDays} of 3 consecutive reports for RED noise.`;
    }
    if (noiseLevel === "yellow") {
      if (status === "resolved") return "Your noise complaint has been resolved. The barangay has addressed the issue.";
      if (status === "action_required" && consecutiveDays >= 5) return "The noise has been reported for 5 consecutive days. A barangay officer will take action. You will be updated once resolved.";
      return `Your report has been recorded. The barangay will continue monitoring. Progress: Day ${consecutiveDays} of 5 consecutive reports for YELLOW noise.`;
    }
    if (noiseLevel === "green") {
      if (status === "resolved") return "Advice has been provided regarding your noise report. The matter is now closed.";
      return "Your report has been received. This minor noise is under observation. The barangay advises communicating with neighbors to resolve minor disturbances.";
    }
    return "Your report has been received and is being reviewed.";
  };

  const renderMediaPlayer = (item) => {
    const isExpanded = expandedReportId === item._id || expandedReportId === item.id;
    if (!isExpanded) return null;
    const reportId = item._id || item.id;
    const mediaUrl = item.mediaUrl || item.audioUrl || item.videoUrl;
    if (!mediaUrl) return <View style={styles.mediaContainer}><Text style={styles.noMediaText}>No media available</Text></View>;

    if (item.mediaType === 'video') {
      return (
        <View style={styles.mediaContainer}>
          <Video source={{ uri: mediaUrl }} style={styles.videoPlayer} useNativeControls resizeMode="contain" shouldPlay={false} />
        </View>
      );
    } else {
      const isPlaying = playingAudio[reportId];
      const audioState = audioStates[reportId] || { position: 0, duration: 0 };
      const progress = audioState.duration > 0 ? audioState.position / audioState.duration : 0;

      return (
        <View style={styles.mediaContainer}>
          <View style={styles.audioPlayer}>
            <View style={styles.audioControls}>
              <TouchableOpacity style={styles.playButton} onPress={() => {
                if (!audioRefs.current[reportId]) playAudio(reportId, mediaUrl);
                else if (isPlaying) pauseAudio(reportId);
                else resumeAudio(reportId);
              }}>
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#fff" />
              </TouchableOpacity>
              {audioRefs.current[reportId] && (
                <TouchableOpacity style={styles.stopButton} onPress={() => stopAudio(reportId)}>
                  <Ionicons name="stop" size={24} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{formatDuration(audioState.position)}</Text>
                <Text style={styles.timeText}>{formatDuration(audioState.duration)}</Text>
              </View>
            </View>
            <View style={styles.waveformContainer}>
              <Ionicons name="musical-notes" size={20} color="#D4AC0D" />
              <Text style={styles.audioLabel}>Audio Recording</Text>
            </View>
          </View>
        </View>
      );
    }
  };

  const renderReportItem = ({ item }) => {
    const reportId = item._id || item.id;
    const isExpanded = expandedReportId === reportId;
    const hasMedia = item.mediaUrl || item.audioUrl || item.videoUrl;
    const status = item.status || 'pending';
    const adminResponse = getAdminResponse(item);

    return (
      <View style={styles.reportCard}>
        <TouchableOpacity onPress={() => hasMedia && toggleReportExpansion(reportId)} activeOpacity={hasMedia ? 0.7 : 1}>
          <View style={styles.reportHeader}>
            <View style={styles.reportTitleRow}>
              <Ionicons name="document-text" size={20} color="#D4AC0D" />
              <Text style={styles.reportTitle}>Noise Report</Text>
              {hasMedia && <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#999" />}
            </View>
            <Text style={styles.reportDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </TouchableOpacity>
        
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
              <Text style={styles.detailText}>{item.location.address?.street || 'Location captured'}</Text>
            </View>
          )}
          
          {item.mediaType && (
            <TouchableOpacity style={styles.detailRow} onPress={() => hasMedia && toggleReportExpansion(reportId)}>
              <Ionicons name={item.mediaType === 'video' ? 'videocam' : 'mic'} size={16} color="#8B4513" />
              <Text style={[styles.detailText, hasMedia && styles.clickableText]}>
                {item.mediaType === 'video' ? 'Video attached' : 'Audio recording'}
                {hasMedia && ' - Tap to view'}
              </Text>
            </TouchableOpacity>
          )}
          
          {item.comment && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Details:</Text>
              <Text style={styles.descriptionText}>{item.comment}</Text>
            </View>
          )}

          {/* Admin Response Section */}
          <View style={[styles.adminResponseContainer, { backgroundColor: getStatusBg(status) }]}>
            <View style={styles.adminResponseHeader}>
              <Ionicons name="chatbubble-ellipses" size={18} color={getStatusColor(status)} />
              <Text style={[styles.adminResponseTitle, { color: getStatusColor(status) }]}>Barangay Response</Text>
            </View>
            <Text style={styles.adminResponseText}>{adminResponse}</Text>
          </View>
        </View>

        {renderMediaPlayer(item)}

        <View style={styles.reportFooter}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBg(status) }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(status) }]}>{getStatusLabel(status)}</Text>
          </View>
        </View>
      </View>
    );
  };

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

      {reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="document-text-outline" size={80} color="#D4AC0D" />
          </View>
          <Text style={styles.emptyText}>No reports yet</Text>
          <Text style={styles.emptySubtext}>Create a new noise report to get started</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('AudioRecording')}>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B4513']} tintColor="#8B4513" />}
        />
      )}

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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingTop: getStatusBarHeight(), paddingBottom: 20, paddingHorizontal: 20 },
  headerContent: { marginTop: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerButton: { padding: 8 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  headerSubtitle: { fontSize: 14, color: '#D4AC0D' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#8B4513', fontWeight: '500' },
  listContent: { padding: 15, paddingBottom: 30 },
  reportCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 15, elevation: 2 },
  reportHeader: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  reportTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  reportTitle: { fontSize: 18, fontWeight: 'bold', color: '#8B4513', flex: 1 },
  reportDate: { fontSize: 12, color: '#999', marginTop: 2 },
  reportDetails: { gap: 10, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailText: { fontSize: 14, color: '#333', flex: 1, fontWeight: '500' },
  clickableText: { color: '#8B4513' },
  descriptionContainer: { marginTop: 8, padding: 12, backgroundColor: '#f9f9f9', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#D4AC0D' },
  descriptionLabel: { fontSize: 12, color: '#8B4513', fontWeight: 'bold', marginBottom: 4 },
  descriptionText: { fontSize: 14, color: '#555', lineHeight: 20 },
  adminResponseContainer: { marginTop: 12, padding: 14, borderRadius: 10, borderLeftWidth: 4 },
  adminResponseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  adminResponseTitle: { fontSize: 14, fontWeight: 'bold' },
  adminResponseText: { fontSize: 14, color: '#333', lineHeight: 20 },
  mediaContainer: { marginTop: 12, marginBottom: 12, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f0f0f0' },
  videoPlayer: { width: '100%', height: 200, backgroundColor: '#000' },
  audioPlayer: { padding: 16, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#D4AC0D' },
  audioControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 16 },
  playButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#8B4513', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  stopButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#654321', justifyContent: 'center', alignItems: 'center' },
  progressContainer: { marginBottom: 12 },
  progressBar: { height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#D4AC0D', borderRadius: 2 },
  timeContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontSize: 12, color: '#666' },
  waveformContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  audioLabel: { fontSize: 14, color: '#8B4513', fontWeight: '600' },
  noMediaText: { textAlign: 'center', padding: 20, color: '#999', fontSize: 14 },
  reportFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 3 },
  emptyText: { fontSize: 24, fontWeight: 'bold', color: '#8B4513', marginBottom: 8 },
  emptySubtext: { fontSize: 16, color: '#999', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#8B4513', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 25, elevation: 2 },
  emptyButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalContainer: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  drawerContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8 }
});

export default UserReportsScreen;
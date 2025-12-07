import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Animated,
  StatusBar, Dimensions, Platform, ScrollView,
  RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio, Video } from 'expo-av';
import CustomDrawer from '../CustomDrawer';
import API_BASE_URL from '../../utils/api';

const { width, height } = Dimensions.get('window');
const getStatusBarHeight = () => Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

export default function AdminNoiseReportsScreen({ navigation }) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedReport, setExpandedReport] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [playingAudio, setPlayingAudio] = useState(null);
  const [sound, setSound] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchReports();
    return () => { if (sound) sound.unloadAsync(); };
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/reports/get-report`);
      const data = await response.json();
      if (response.ok) {
        const transformed = data.map(r => ({
          ...r,
          audioUri: r.mediaType === 'audio' ? r.mediaUrl : null,
          videoUri: r.mediaType === 'video' ? r.mediaUrl : null,
        }));
        setReports(transformed);
      } else {
        Alert.alert('Error', 'Failed to fetch reports');
      }
    } catch (error) {
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

  const updateReportStatus = async () => {
    if (!selectedReport || !selectedStatus) {
      Alert.alert('Error', 'Please select a response');
      return;
    }
    try {
      setUpdatingStatus(true);
      const response = await fetch(`${API_BASE_URL}/reports/update-status/${selectedReport._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus }),
      });
      if (response.ok) {
        Alert.alert('Success', 'Report status updated successfully');
        setStatusModalVisible(false);
        setSelectedReport(null);
        setSelectedStatus(null);
        await fetchReports();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to update status');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getAvailableResponses = (report) => {
    const { noiseLevel, consecutiveDays } = report;
    const responses = [];

    if (noiseLevel === "red") {
      responses.push({
        status: 'monitoring',
        text: `We have received your report. The barangay is monitoring this location. Progress: Day ${consecutiveDays} of 3 consecutive reports for RED noise.`,
        label: 'Monitoring',
        icon: 'eye'
      });
      if (consecutiveDays >= 3) {
        responses.push({
          status: 'action_required',
          text: "The noise at this location has been reported for 3 consecutive days. A barangay officer has been assigned to take action. You will be updated once resolved.",
          label: 'Action Required',
          icon: 'alert-circle'
        });
      }
      responses.push({
        status: 'resolved',
        text: "Your noise complaint has been resolved. Appropriate action has been taken by the barangay.",
        label: 'Resolved',
        icon: 'checkmark-circle'
      });
    } else if (noiseLevel === "yellow") {
      responses.push({
        status: 'monitoring',
        text: `Your report has been recorded. The barangay will continue monitoring. Progress: Day ${consecutiveDays} of 5 consecutive reports for YELLOW noise.`,
        label: 'Monitoring',
        icon: 'eye'
      });
      if (consecutiveDays >= 5) {
        responses.push({
          status: 'action_required',
          text: "The noise has been reported for 5 consecutive days. A barangay officer will take action. You will be updated once resolved.",
          label: 'Action Required',
          icon: 'alert-circle'
        });
      }
      responses.push({
        status: 'resolved',
        text: "Your noise complaint has been resolved. The barangay has addressed the issue.",
        label: 'Resolved',
        icon: 'checkmark-circle'
      });
    } else if (noiseLevel === "green") {
      responses.push({
        status: 'monitoring',
        text: "Your report has been received. This minor noise is under observation. The barangay advises communicating with neighbors to resolve minor disturbances.",
        label: 'Monitoring',
        icon: 'eye'
      });
      responses.push({
        status: 'resolved',
        text: "Advice has been provided regarding your noise report. The matter is now closed.",
        label: 'Resolved',
        icon: 'checkmark-circle'
      });
    }

    return responses;
  };

  const openStatusModal = (report) => {
    setSelectedReport(report);
    setSelectedStatus(report.status || null);
    setStatusModalVisible(true);
  };

  const getCurrentResponse = (report) => {
    if (!report.status || report.status === 'pending') {
      return "No response sent yet. Click to select a response.";
    }
    const responses = getAvailableResponses(report);
    const current = responses.find(r => r.status === report.status);
    return current ? current.text : "Response sent.";
  };

  const playAudio = async (audioUri, reportId) => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        if (playingAudio === reportId) {
          setPlayingAudio(null);
          return;
        }
      }
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUri }, { shouldPlay: true });
      setSound(newSound);
      setPlayingAudio(reportId);
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingAudio(null);
          newSound.unloadAsync();
        }
      });
    } catch (error) {
      Alert.alert('Error', 'Could not play audio');
    }
  };

  const getFilteredReports = () => {
    if (selectedFilter === 'All') return reports;
    return reports.filter(r => r.reason?.includes(selectedFilter) || r.reason === selectedFilter);
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

  const getNoiseLevelColor = (level) => ({ red: '#F44336', yellow: '#FFC107', green: '#4CAF50' }[level] || '#999');
  const getNoiseLevelBg = (level) => ({ red: '#FFEBEE', yellow: '#FFF9C4', green: '#E8F5E9' }[level] || '#F5F5F5');
  const getNoiseLevelLabel = (level) => ({ red: 'High', yellow: 'Medium', green: 'Low' }[level] || 'Unknown');
  const getStatusColor = (status) => ({ pending: '#999', action_required: '#F44336', monitoring: '#FFC107', resolved: '#4CAF50' }[status] || '#999');
  const getStatusLabel = (status) => ({ pending: 'Pending', action_required: 'Action Required', monitoring: 'Monitoring', resolved: 'Resolved' }[status] || 'Pending');

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer} contentContainerStyle={styles.filterContent}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterPill, selectedFilter === filter && styles.filterPillActive]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text style={[styles.filterPillText, selectedFilter === filter && styles.filterPillTextActive]}>{filter}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
            {selectedFilter !== 'All' ? `No ${selectedFilter} reports available` : 'Reports will appear here when submitted'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.reportsList}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B4513']} tintColor="#8B4513" />}
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
                <View style={styles.reportHeaderRight}>
                  {report.noiseLevel && (
                    <View style={[styles.noiseLevelBadge, { backgroundColor: getNoiseLevelBg(report.noiseLevel) }]}>
                      <View style={[styles.noiseLevelDot, { backgroundColor: getNoiseLevelColor(report.noiseLevel) }]} />
                      <Text style={[styles.noiseLevelText, { color: getNoiseLevelColor(report.noiseLevel) }]}>
                        {getNoiseLevelLabel(report.noiseLevel)}
                      </Text>
                    </View>
                  )}
                  <Ionicons name={expandedReport === report._id ? "chevron-up" : "chevron-down"} size={24} color="#8B4513" />
                </View>
              </View>

              {expandedReport === report._id && (
                <View style={styles.reportDetails}>
                  <View style={styles.statusSection}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status || 'pending') }]}>
                      <Ionicons name="flag" size={16} color="#FFF" />
                      <Text style={styles.statusText}>{getStatusLabel(report.status || 'pending')}</Text>
                    </View>
                    {report.consecutiveDays > 1 && (
                      <View style={styles.consecutiveDaysBadge}>
                        <Ionicons name="calendar" size={16} color="#F44336" />
                        <Text style={styles.consecutiveDaysText}>{report.consecutiveDays} consecutive days</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity 
                    style={[
                      styles.autoResponseSection,
                      (!report.status || report.status === 'pending') && styles.autoResponsePending
                    ]}
                    onPress={() => openStatusModal(report)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.autoResponseHeader}>
                      <Ionicons 
                        name={(!report.status || report.status === 'pending') ? "alert-circle" : "information-circle"} 
                        size={20} 
                        color={(!report.status || report.status === 'pending') ? "#F57C00" : "#1976D2"} 
                      />
                      <Text style={[
                        styles.autoResponseTitle,
                        (!report.status || report.status === 'pending') && styles.autoResponseTitlePending
                      ]}>
                        {(!report.status || report.status === 'pending') ? 'No Response Sent' : 'System Response'}
                      </Text>
                      <Ionicons name="create-outline" size={20} color={(!report.status || report.status === 'pending') ? "#F57C00" : "#1976D2"} style={{ marginLeft: 'auto' }} />
                    </View>
                    <View style={styles.autoResponseContent}>
                      <Text style={[
                        styles.autoResponseText,
                        (!report.status || report.status === 'pending') && styles.autoResponseTextPending
                      ]}>
                        {getCurrentResponse(report)}
                      </Text>
                    </View>
                    <View style={styles.tapHint}>
                      <Text style={[
                        styles.tapHintText,
                        (!report.status || report.status === 'pending') && styles.tapHintTextPending
                      ]}>
                        {(!report.status || report.status === 'pending') ? 'Tap to select and send response' : 'Tap to change response & status'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {report.comment && (
                    <View style={styles.detailSection}>
                      <View style={styles.detailHeader}>
                        <Ionicons name="chatbox-outline" size={18} color="#8B4513" />
                        <Text style={styles.detailLabel}>Details</Text>
                      </View>
                      <Text style={styles.detailText}>{report.comment}</Text>
                    </View>
                  )}

                  {report.location && (
                    <View style={styles.detailSection}>
                      <View style={styles.detailHeader}>
                        <Ionicons name="location" size={18} color="#8B4513" />
                        <Text style={styles.detailLabel}>Location</Text>
                      </View>
                      <Text style={styles.detailText}>
                        Lat: {report.location.latitude?.toFixed(6)}, Lon: {report.location.longitude?.toFixed(6)}
                      </Text>
                    </View>
                  )}

                  {report.audioUri && (
                    <View style={styles.detailSection}>
                      <TouchableOpacity style={styles.audioButton} onPress={() => playAudio(report.audioUri, report._id)}>
                        <Ionicons name={playingAudio === report._id ? "pause-circle" : "play-circle"} size={40} color="#8B4513" />
                        <Text style={styles.audioButtonText}>{playingAudio === report._id ? 'Pause' : 'Play'} Audio</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {report.videoUri && (
                    <View style={styles.videoContainer}>
                      <Video source={{ uri: report.videoUri }} style={styles.video} useNativeControls resizeMode="contain" />
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.timestampText}>
                      {new Date(report.createdAt).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={statusModalVisible} transparent animationType="fade" onRequestClose={() => setStatusModalVisible(false)}>
        <View style={styles.statusModalOverlay}>
          <View style={styles.statusModalContainer}>
            <View style={styles.statusModalHeader}>
              <Text style={styles.statusModalTitle}>Update Report Status</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.statusModalContent} showsVerticalScrollIndicator={false}>
              {selectedReport && getAvailableResponses(selectedReport).map((response) => (
                <TouchableOpacity
                  key={response.status}
                  style={[styles.statusOption, selectedStatus === response.status && styles.statusOptionSelected]}
                  onPress={() => setSelectedStatus(response.status)}
                  activeOpacity={0.7}
                >
                  <View style={styles.statusOptionHeader}>
                    <View style={styles.statusOptionLeft}>
                      <View style={[styles.statusOptionRadio, selectedStatus === response.status && styles.statusOptionRadioSelected]}>
                        {selectedStatus === response.status && <View style={styles.statusOptionRadioInner} />}
                      </View>
                      <Ionicons name={response.icon} size={24} color={getStatusColor(response.status)} />
                      <Text style={[styles.statusOptionLabel, { color: getStatusColor(response.status) }]}>
                        {response.label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statusOptionTextContainer}>
                    <Text style={styles.statusOptionText}>{response.text}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.statusModalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setStatusModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, updatingStatus && styles.saveButtonDisabled]}
                onPress={updateReportStatus}
                disabled={updatingStatus}
              >
                {updatingStatus ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#FFF" />
                    <Text style={styles.saveButtonText}>Save Status</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingTop: getStatusBarHeight(), paddingBottom: 20, paddingHorizontal: 20 },
  headerContent: { marginTop: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  headerButton: { padding: 8 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFF', marginBottom: 5 },
  headerSubtitle: { fontSize: 14, color: '#D4AC0D' },
  filterContainer: { backgroundColor: '#FFF', paddingVertical: 8, maxHeight: 48 },
  filterContent: { paddingHorizontal: 15, gap: 8 },
  filterPill: { paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#F0F0F0', borderRadius: 16 },
  filterPillActive: { backgroundColor: '#8B4513' },
  filterPillText: { fontSize: 13, color: '#333', fontWeight: '500' },
  filterPillTextActive: { color: '#FFF', fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#8B4513' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#999', marginTop: 15 },
  emptySubtext: { fontSize: 14, color: '#BBB', textAlign: 'center', marginTop: 8 },
  reportsList: { flex: 1 },
  reportCard: { backgroundColor: '#FFF', marginHorizontal: 15, marginTop: 15, borderRadius: 12, padding: 16, elevation: 2 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  reportHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportIcon: { fontSize: 32, marginRight: 12 },
  reportHeaderText: { flex: 1 },
  reportReason: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  reportDate: { fontSize: 12, color: '#999', marginTop: 2 },
  noiseLevelBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, gap: 4 },
  noiseLevelDot: { width: 8, height: 8, borderRadius: 4 },
  noiseLevelText: { fontSize: 11, fontWeight: 'bold' },
  reportDetails: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  statusSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, gap: 6 },
  statusText: { fontSize: 13, fontWeight: 'bold', color: '#FFF' },
  consecutiveDaysBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#FFEBEE', gap: 6 },
  consecutiveDaysText: { fontSize: 12, fontWeight: 'bold', color: '#F44336' },
  autoResponseSection: { backgroundColor: '#E3F2FD', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#2196F3', borderWidth: 2, borderColor: '#2196F3' },
  autoResponsePending: { backgroundColor: '#FFF3E0', borderLeftColor: '#F57C00', borderColor: '#F57C00' },
  autoResponseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  autoResponseTitle: { fontSize: 16, fontWeight: '700', color: '#1976D2', marginLeft: 8 },
  autoResponseTitlePending: { color: '#F57C00' },
  autoResponseContent: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 8 },
  autoResponseText: { fontSize: 14, color: '#333', lineHeight: 20 },
  autoResponseTextPending: { fontStyle: 'italic', color: '#666' },
  tapHint: { alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#BBDEFB' },
  tapHintText: { fontSize: 12, color: '#1976D2', fontWeight: '600', fontStyle: 'italic' },
  tapHintTextPending: { color: '#F57C00' },
  detailSection: { marginBottom: 12 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  detailLabel: { fontSize: 14, fontWeight: 'bold', color: '#8B4513' },
  detailText: { fontSize: 14, color: '#555', lineHeight: 20 },
  audioButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#F9F9F9', paddingVertical: 16, borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0' },
  audioButtonText: { fontSize: 16, fontWeight: '600', color: '#8B4513' },
  videoContainer: { borderRadius: 8, overflow: 'hidden', marginTop: 8 },
  video: { width: '100%', height: 200, backgroundColor: '#000' },
  timestampText: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 8 },
  statusModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  statusModalContainer: { backgroundColor: '#FFF', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '80%', elevation: 5 },
  statusModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  statusModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  statusModalContent: { padding: 20, maxHeight: 400 },
  statusOption: { backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#E0E0E0' },
  statusOptionSelected: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
  statusOptionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusOptionRadio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CCC', justifyContent: 'center', alignItems: 'center' },
  statusOptionRadioSelected: { borderColor: '#4CAF50' },
  statusOptionRadioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50' },
  statusOptionLabel: { fontSize: 16, fontWeight: 'bold' },
  statusOptionTextContainer: { backgroundColor: '#FFF', borderRadius: 8, padding: 12 },
  statusOptionText: { fontSize: 14, color: '#555', lineHeight: 20 },
  statusModalFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0', gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
  saveButton: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#8B4513', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  saveButtonDisabled: { backgroundColor: '#CCC' },
  saveButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  modalContainer: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawerContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8 },
});
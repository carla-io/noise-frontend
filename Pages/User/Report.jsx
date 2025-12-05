import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Animated, StatusBar,
  Dimensions, Platform, Easing, ScrollView, Alert, TextInput, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import axios from 'axios';
import API_BASE_URL from '../../utils/api';
import CustomDrawer from '../CustomDrawer';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const getStatusBarHeight = () => Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;

export default function AudioRecordingScreen({ navigation }) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [currentDb, setCurrentDb] = useState(35);
  const [recording, setRecording] = useState(null);
  const [sound, setSound] = useState(null);
  const [audioUri, setAudioUri] = useState(null);
  const [comment, setComment] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [videoUri, setVideoUri] = useState(null);
  const [attachmentType, setAttachmentType] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(0.5)).current;
  const waveAnim2 = useRef(new Animated.Value(0.8)).current;
  const waveAnim3 = useRef(new Animated.Value(0.3)).current;
  const recordingInterval = useRef(null);
  const videoRef = useRef(null);

  const noiseReasons = ['🔊 Loud Music', '🚗 Vehicle Noise', '🔨 Construction', '🎉 Party/Event', '🐕 Animal Noise', '🏭 Industrial', '🗣️ Shouting/Arguments', '📢 Other'];

  useEffect(() => {
    (async () => {
      await Audio.requestPermissionsAsync();
      await ImagePicker.requestCameraPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true, playsInSilentModeIOS: true, staysActiveInBackground: false,
        shouldDuckAndroid: true, playThroughEarpieceAndroid: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      });
    })();
    return () => {
      recording?.stopAndUnloadAsync();
      sound?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])).start();
      Animated.loop(Animated.stagger(200, [
        Animated.timing(waveAnim1, { toValue: Math.random(), duration: 500, useNativeDriver: false }),
        Animated.timing(waveAnim2, { toValue: Math.random(), duration: 500, useNativeDriver: false }),
        Animated.timing(waveAnim3, { toValue: Math.random(), duration: 500, useNativeDriver: false }),
      ])).start();
    } else pulseAnim.setValue(1);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const { recording: newRecording } = await Audio.Recording.createAsync({
        android: { extension: '.m4a', outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4, audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC, sampleRate: 44100, numberOfChannels: 2, bitRate: 320000 },
        ios: { extension: '.m4a', outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC, audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX, sampleRate: 44100, numberOfChannels: 2, bitRate: 320000, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
        web: { mimeType: 'audio/webm;codecs=opus', bitsPerSecond: 320000 },
      });
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      setAttachmentType('audio');
      recordingInterval.current = setInterval(() => {
        setRecordingDuration(p => p + 1);
        setCurrentDb(Math.floor(Math.random() * 45 + 40));
      }, 1000);
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording.');
    }
  };

  const stopRecording = async () => {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri);
      setIsRecording(false);
      setRecording(null);
      clearInterval(recordingInterval.current);
      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      const status = await newSound.getStatusAsync();
      setTotalDuration(Math.floor(status.durationMillis / 1000));
      setSound(newSound);
    } catch (err) {
      console.error(err);
    }
  };

  const pickVideo = () => {
    Alert.alert('Add Video', 'Choose an option', [
      { text: 'Record Video', onPress: async () => {
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, allowsEditing: true, aspect: [16, 9], quality: 1, videoMaxDuration: 60 });
        if (!result.canceled && result.assets[0]) {
          setVideoUri(result.assets[0].uri);
          setAttachmentType('video');
          sound?.unloadAsync();
          setAudioUri(null);
          setSound(null);
        }
      }},
      { text: 'Choose from Gallery', onPress: async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, allowsEditing: true, aspect: [16, 9], quality: 1 });
        if (!result.canceled && result.assets[0]) {
          setVideoUri(result.assets[0].uri);
          setAttachmentType('video');
          sound?.unloadAsync();
          setAudioUri(null);
          setSound(null);
        }
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const deleteVideo = () => {
    Alert.alert('Delete Video', 'Remove this video?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { setVideoUri(null); setAttachmentType(null); }},
    ]);
  };

  const getUserLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        Alert.alert('Permission Required', 'Please grant location access.');
        setLocationLoading(false);
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const address = await Location.reverseGeocodeAsync({ latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude });
      setLocation({ latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude, address: address[0] || null, timestamp: new Date().toISOString() });
      setLocationLoading(false);
      Alert.alert('✅ Location Added', `${address[0]?.street || ''} ${address[0]?.city || ''}\n${currentLocation.coords.latitude.toFixed(6)}, ${currentLocation.coords.longitude.toFixed(6)}`);
    } catch (error) {
      setLocationError('Failed to get location');
      setLocationLoading(false);
      Alert.alert('Error', 'Failed to get location.');
    }
  };

  const playPauseRecording = async () => {
    if (!sound) return;
    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        if (playbackPosition >= totalDuration) {
          await sound.setPositionAsync(0);
          setPlaybackPosition(0);
        }
        await sound.playAsync();
        setIsPlaying(true);
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setPlaybackPosition(Math.floor(status.positionMillis / 1000));
            if (status.didJustFinish) { setIsPlaying(false); setPlaybackPosition(0); }
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const restartRecording = async () => {
    if (!sound) return;
    try {
      await sound.setPositionAsync(0);
      setPlaybackPosition(0);
      await sound.playAsync();
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackPosition(Math.floor(status.positionMillis / 1000));
          if (status.didJustFinish) { setIsPlaying(false); setPlaybackPosition(0); }
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteRecording = () => {
    Alert.alert('Delete Recording', 'Delete this recording?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        sound?.unloadAsync();
        setSound(null);
        setAudioUri(null);
        setTotalDuration(0);
        setPlaybackPosition(0);
        setIsPlaying(false);
        setAttachmentType(null);
      }},
    ]);
  };

 const saveRecording = async () => {
  if (!audioUri && !videoUri) {
    Alert.alert('No Content', 'Please record audio or attach a video first.');
    return;
  }
  if (!selectedReason) {
    Alert.alert('Reason Required', 'Please select a reason for this noise report.');
    return;
  }

  setIsSubmitting(true);

  try {
    // ✅ Get userId from AsyncStorage
    const userId = await AsyncStorage.getItem('userId');
    
    if (!userId) {
      Alert.alert('Authentication Error', 'Please log in again.');
      setIsSubmitting(false);
      return;
    }

    // ✅ Prepare form data for multipart/form-data upload
    const formData = new FormData();
    
    // ✅ Add userId FIRST (required by backend)
    formData.append('userId', userId);
    
    // Add media file (audio or video)
    const mediaUri = videoUri || audioUri;
    const mediaType = videoUri ? 'video' : 'audio';
    const fileExtension = mediaUri.split('.').pop();
    const fileName = `noise_report_${Date.now()}.${fileExtension}`;
    
    formData.append('media', {
      uri: mediaUri,
      type: videoUri ? `video/${fileExtension}` : `audio/${fileExtension}`,
      name: fileName,
    });

    // Add other fields
    formData.append('reason', selectedReason);
    formData.append('mediaType', mediaType);
    
    if (comment) {
      formData.append('comment', comment);
    }
    
    if (location) {
      formData.append('location', JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        timestamp: location.timestamp,
      }));
    }

    // ✅ Send POST request to backend
    const response = await axios.post(`${API_BASE_URL}/reports/new-report`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds timeout for large files
    });

    setIsSubmitting(false);

    // ✅ Success - Show confirmation
    const attachmentInfo = videoUri 
      ? `Video: ${videoUri.split('/').pop()}`
      : `Audio: ${formatTime(totalDuration)}`;

    const locationInfo = location 
      ? `\nLocation: ${location.address?.street || ''} ${location.address?.city || ''}\nCoordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
      : '\nLocation: Not provided';

    const reportDetails = `Noise Report Submitted Successfully!\n\nReason: ${selectedReason}${comment ? `\nDetails: ${comment}` : ''}\n${attachmentInfo}${locationInfo}\nTimestamp: ${new Date().toLocaleString()}`;

    Alert.alert('✅ Report Submitted', reportDetails, [
      { 
        text: 'OK', 
        onPress: () => {
          // Reset form after successful submission
          setComment('');
          setSelectedReason('');
          sound?.unloadAsync();
          setSound(null);
          setAudioUri(null);
          setVideoUri(null);
          setAttachmentType(null);
          setLocation(null);
          setLocationError(null);
          setTotalDuration(0);
          setPlaybackPosition(0);
        }
      }
    ]);

  } catch (error) {
    setIsSubmitting(false);
    console.error('Error submitting report:', error);
    
    let errorMessage = 'Failed to submit noise report. Please try again.';
    
    if (error.response) {
      // Server responded with error
      errorMessage = error.response.data?.message || errorMessage;
    } else if (error.request) {
      // Request made but no response
      errorMessage = 'Network error. Please check your internet connection.';
    }
    
    Alert.alert('❌ Submission Failed', errorMessage, [{ text: 'OK' }]);
  }
};

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const getDbColor = (db) => db < 50 ? '#8B7355' : db < 70 ? '#D4AC0D' : db < 85 ? '#E67E22' : '#E74C3C';

  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 350, easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -width * 0.8, duration: 300, easing: Easing.bezier(0.55, 0.06, 0.68, 0.19), useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => setDrawerVisible(false));
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      <LinearGradient colors={['#8B4513', '#654321']} style={s.header}>
        <View style={s.headerContent}>
          <View style={s.headerTop}>
            <TouchableOpacity onPress={openDrawer} style={s.headerButton}><Ionicons name="menu" size={28} color="#D4AC0D" /></TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerButton}><Ionicons name="arrow-back" size={28} color="#D4AC0D" /></TouchableOpacity>
          </View>
          <Text style={s.headerTitle}>🎙️ Noise Report</Text>
          <Text style={s.headerSubtitle}>{isRecording ? 'Recording...' : videoUri ? 'Video attached' : audioUri ? 'Recording complete' : 'Record audio or attach video'}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={s.scrollView} contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        <View style={s.section}>
          <Text style={s.sectionTitle}>📋 Select Noise Type</Text>
          <Text style={s.sectionSubtitle}>Choose the type of noise disturbance</Text>
          <View style={s.reasonGrid}>
            {noiseReasons.map((r, i) => (
              <TouchableOpacity key={i} style={[s.chip, selectedReason === r && s.chipSelected]} onPress={() => setSelectedReason(r)}>
                <Text style={[s.chipText, selectedReason === r && s.chipTextSelected]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>💬 Additional Details</Text>
          <Text style={s.sectionSubtitle}>Describe the noise issue (optional)</Text>
          <View>
            <TextInput style={s.input} placeholder="e.g., Loud music from neighbor's apartment..." placeholderTextColor="#999" multiline numberOfLines={4} value={comment} onChangeText={setComment} maxLength={500} textAlignVertical="top" />
            <Text style={s.charCount}>{comment.length}/500</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>📍 Location</Text>
          <Text style={s.sectionSubtitle}>Add your current location</Text>
          {!location ? (
            <TouchableOpacity style={s.locationBtn} onPress={getUserLocation} disabled={locationLoading}>
              <Ionicons name={locationLoading ? "hourglass" : "location"} size={24} color="#fff" />
              <Text style={s.locationBtnText}>{locationLoading ? 'Getting...' : 'Add Current Location'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.locationDisplay}>
              <View style={s.locationInfo}>
                <Ionicons name="location-sharp" size={20} color="#8B4513" />
                <View style={{ flex: 1 }}>
                  <Text style={s.locationAddress}>{location.address?.street || 'Unknown'}, {location.address?.city || 'Unknown'}</Text>
                  <Text style={s.locationCoords}>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</Text>
                </View>
              </View>
              <View style={s.locationActions}>
                <TouchableOpacity style={s.refreshBtn} onPress={getUserLocation}><Ionicons name="refresh" size={20} color="#8B4513" /></TouchableOpacity>
                <TouchableOpacity style={s.removeBtn} onPress={() => setLocation(null)}><Ionicons name="close-circle" size={20} color="#E74C3C" /></TouchableOpacity>
              </View>
            </View>
          )}
          {locationError && <Text style={s.error}>{locationError}</Text>}
        </View>

        <View style={s.attachmentSelector}>
          <TouchableOpacity style={[s.attachBtn, attachmentType === 'audio' && s.attachBtnActive]} onPress={() => {
            if (attachmentType === 'video') Alert.alert('Switch to Audio', 'Remove video?', [{ text: 'Cancel', style: 'cancel' }, { text: 'OK', onPress: () => { setVideoUri(null); setAttachmentType('audio'); }}]);
          }}>
            <Ionicons name="mic" size={24} color={attachmentType === 'audio' ? '#fff' : '#8B4513'} />
            <Text style={[s.attachBtnText, attachmentType === 'audio' && s.attachBtnTextActive]}>Audio</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.attachBtn, attachmentType === 'video' && s.attachBtnActive]} onPress={pickVideo}>
            <Ionicons name="videocam" size={24} color={attachmentType === 'video' ? '#fff' : '#8B4513'} />
            <Text style={[s.attachBtnText, attachmentType === 'video' && s.attachBtnTextActive]}>Video</Text>
          </TouchableOpacity>
        </View>

        {videoUri && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>📹 Video Preview</Text>
            <View style={s.videoContainer}>
              <Video ref={videoRef} source={{ uri: videoUri }} style={s.video} useNativeControls resizeMode="contain" isLooping />
              <TouchableOpacity style={s.deleteVideoBtn} onPress={deleteVideo}><Ionicons name="close-circle" size={32} color="#E74C3C" /></TouchableOpacity>
            </View>
            <Text style={s.videoInfo}>Video: {videoUri.split('/').pop()}</Text>
          </View>
        )}

        {!videoUri && (
          <View style={s.section}>
            <View style={s.recordingContainer}>
              {isRecording && (
                <View style={s.waveformContainer}>
                  <Text style={[s.dbReading, { color: getDbColor(currentDb) }]}>{currentDb} dB</Text>
                  <View style={s.waveform}>
                    {[waveAnim1, waveAnim2, waveAnim3, waveAnim1, waveAnim2].map((anim, i) => (
                      <Animated.View key={i} style={[s.waveBar, { height: anim.interpolate({ inputRange: [0, 1], outputRange: [10, [60, 80, 50, 70, 40][i]] }), backgroundColor: getDbColor(currentDb) }]} />
                    ))}
                  </View>
                </View>
              )}
              <View style={s.timerContainer}>
                <Text style={s.timerText}>{formatTime(isRecording ? recordingDuration : totalDuration)}</Text>
                {isRecording && <View style={s.recordingDot}><View style={s.pulsingDot} /></View>}
              </View>
              <TouchableOpacity onPress={isRecording ? stopRecording : startRecording}>
                <Animated.View style={[s.recordButton, { backgroundColor: isRecording ? '#E74C3C' : '#D4AC0D', transform: [{ scale: isRecording ? pulseAnim : 1 }] }]}>
                  <Ionicons name={isRecording ? "stop" : "mic"} size={50} color="#fff" />
                </Animated.View>
              </TouchableOpacity>
              <Text style={s.recordStatus}>{isRecording ? 'Recording... Tap to stop' : audioUri ? 'Recording complete' : 'Tap to start'}</Text>
            </View>
          </View>
        )}

        {audioUri && !videoUri && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>🔊 Playback</Text>
            <View style={s.progressContainer}>
              <View style={s.progressBar}><View style={[s.progressFill, { width: `${totalDuration > 0 ? (playbackPosition / totalDuration) * 100 : 0}%` }]} /></View>
              <View style={s.timeLabels}>
                <Text style={s.timeText}>{formatTime(playbackPosition)}</Text>
                <Text style={s.timeText}>{formatTime(totalDuration)}</Text>
              </View>
            </View>
            <View style={s.playbackControls}>
              <TouchableOpacity onPress={restartRecording} style={s.restartBtn}><Ionicons name="play-skip-back" size={25} color="#8B4513" /></TouchableOpacity>
              <TouchableOpacity onPress={playPauseRecording} style={s.playBtn}><Ionicons name={isPlaying ? "pause" : "play"} size={30} color="#8B4513" /></TouchableOpacity>
              <TouchableOpacity onPress={deleteRecording} style={s.deleteBtn}><Ionicons name="trash" size={25} color="#E74C3C" /></TouchableOpacity>
            </View>
          </View>
        )}

        {(audioUri || videoUri) && (
          <TouchableOpacity onPress={saveRecording} style={[s.saveBtn, (!selectedReason || isSubmitting) && s.saveBtnDisabled]} disabled={!selectedReason || isSubmitting}>
            {isSubmitting ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={s.saveBtnText}>Submitting...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={28} color="#fff" />
                <Text style={s.saveBtnText}>Submit Noise Report</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
        <View style={s.modalContainer}>
          <Animated.View style={[s.overlay, { opacity: overlayOpacity }]}><TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} /></Animated.View>
          <Animated.View style={[s.drawerContainer, { transform: [{ translateX: slideAnim }] }]}><CustomDrawer navigation={navigation} onClose={closeDrawer} /></Animated.View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingTop: getStatusBarHeight(), paddingBottom: 20, paddingHorizontal: 20 },
  headerContent: { marginTop: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerButton: { padding: 8 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  headerSubtitle: { fontSize: 14, color: '#D4AC0D' },
  scrollView: { flex: 1 },
  section: { backgroundColor: '#fff', padding: 20, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#8B4513', marginBottom: 5 },
  sectionSubtitle: { fontSize: 14, color: '#666', marginBottom: 15 },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f0f0f0', borderWidth: 2, borderColor: '#e0e0e0' },
  chipSelected: { backgroundColor: '#8B4513', borderColor: '#654321' },
  chipText: { fontSize: 14, color: '#333', fontWeight: '500' },
  chipTextSelected: { color: '#fff' },
  input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 14, color: '#333', minHeight: 100 },
  charCount: { position: 'absolute', bottom: 8, right: 12, fontSize: 12, color: '#999' },
  locationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8B4513', padding: 15, borderRadius: 10, gap: 10 },
  locationBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  locationDisplay: { backgroundColor: '#f9f9f9', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: '#e0e0e0' },
  locationInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  locationAddress: { fontSize: 15, color: '#333', fontWeight: '600', marginBottom: 4 },
  locationCoords: { fontSize: 13, color: '#666' },
  locationActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 5 },
  refreshBtn: { padding: 8, backgroundColor: '#f0f0f0', borderRadius: 8 },
  removeBtn: { padding: 8, backgroundColor: '#ffe5e5', borderRadius: 8 },
  error: { color: '#E74C3C', fontSize: 13, marginTop: 10 },
  attachmentSelector: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 15 },
  attachBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 10, gap: 8, borderWidth: 2, borderColor: '#e0e0e0' },
  attachBtnActive: { backgroundColor: '#8B4513', borderColor: '#654321' },
  attachBtnText: { fontSize: 14, fontWeight: '600', color: '#8B4513' },
  attachBtnTextActive: { color: '#fff' },
  videoContainer: { position: 'relative', backgroundColor: '#000', borderRadius: 10, overflow: 'hidden', marginBottom: 10 },
  video: { width: '100%', height: 200 },
  deleteVideoBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  videoInfo: { fontSize: 12, color: '#666', fontStyle: 'italic' },
  recordingContainer: { alignItems: 'center' },
  waveformContainer: { alignItems: 'center', marginBottom: 20 },
  dbReading: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  waveform: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 100, gap: 8 },
  waveBar: { width: 6, borderRadius: 3 },
  timerContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 30 },
  timerText: { fontSize: 32, fontWeight: 'bold', color: '#8B4513' },
  recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E74C3C' },
  pulsingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E74C3C' },
  recordButton: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  recordStatus: { fontSize: 14, color: '#666', marginTop: 20 },
  progressContainer: { marginBottom: 20 },
  progressBar: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#8B4513' },
  timeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontSize: 12, color: '#666' },
  playbackControls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 30 },
  restartBtn: { padding: 15, backgroundColor: '#f0f0f0', borderRadius: 25 },
  playBtn: { padding: 20, backgroundColor: '#D4AC0D', borderRadius: 35 },
  deleteBtn: { padding: 15, backgroundColor: '#ffe5e5', borderRadius: 25 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#27AE60', marginHorizontal: 20, marginVertical: 20, padding: 18, borderRadius: 12, gap: 10, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  saveBtnDisabled: { backgroundColor: '#ccc' },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalContainer: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  drawerContainer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8 },
});
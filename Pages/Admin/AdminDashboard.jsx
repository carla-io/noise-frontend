import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Animated,
  Easing,
  Modal,
  Platform,
  Alert,
  RefreshControl,
  Share,
  PermissionsAndroid,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as DocumentPicker from 'expo-document-picker';
import * as IntentLauncher from 'expo-intent-launcher';
import CustomDrawer from '../CustomDrawer';
import API_BASE_URL from '../../utils/api';

const { width, height } = Dimensions.get('window');

const getStatusBarHeight = () => {
  return Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : StatusBar.currentHeight || 24;
};

const AdminDashboard = () => {
  const navigation = useNavigation();
  
  // Drawer state
  const [drawerVisible, setDrawerVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Data state
  const [data, setData] = useState({
    reportsToday: 0,
    flaggedAreas: 0,
    totalReports: 0,
    resolvedReports: 0,
    recentReports: [],
    noiseCategories: [
      { type: 'traffic', count: 45, color: '#D2B48C' },
      { type: 'music', count: 32, color: '#DAA520' },
      { type: 'construction', count: 28, color: '#B8860B' },
      { type: 'shouting', count: 15, color: '#8B7355' },
      { type: 'machinery', count: 12, color: '#CD853F' }
    ],
    topNoiseSources: [
      { location: 'Main Street & 5th Ave', reports: 18, level: 'high' },
      { location: 'Central Park Area', reports: 14, level: 'medium' },
      { location: 'Industrial Zone', reports: 12, level: 'high' },
      { location: 'University District', reports: 9, level: 'medium' },
      { location: 'Downtown Plaza', reports: 7, level: 'low' }
    ],
    alerts: [
      { id: 1, type: 'repeated', location: 'Main Street', message: '5 reports in 2 hours', severity: 'high' },
      { id: 2, type: 'threshold', location: 'Industrial Zone', message: 'Noise level above 85dB', severity: 'critical' },
      { id: 3, type: 'pattern', location: 'University District', message: 'Late night disturbances', severity: 'medium' }
    ]
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Mock data - replace with actual API calls
  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock recent reports data
      const mockRecentReports = [
        {
          id: 1,
          type: 'traffic',
          location: 'Main Street & 5th Ave',
          reporter: 'John Doe',
          time: '2 min ago',
          level: 'high',
          status: 'pending'
        },
        {
          id: 2,
          type: 'music',
          location: 'Central Park',
          reporter: 'Jane Smith',
          time: '5 min ago',
          level: 'medium',
          status: 'investigating'
        },
        {
          id: 3,
          type: 'construction',
          location: 'Industrial Zone',
          reporter: 'Mike Johnson',
          time: '8 min ago',
          level: 'high',
          status: 'resolved'
        },
        {
          id: 4,
          type: 'shouting',
          location: 'University District',
          reporter: 'Sarah Wilson',
          time: '12 min ago',
          level: 'low',
          status: 'pending'
        },
        {
          id: 5,
          type: 'machinery',
          location: 'Downtown Plaza',
          reporter: 'David Brown',
          time: '15 min ago',
          level: 'medium',
          status: 'resolved'
        }
      ];

      setData(prevData => ({
        ...prevData,
        reportsToday: 47,
        flaggedAreas: 3,
        totalReports: 132,
        resolvedReports: 85,
        recentReports: mockRecentReports
      }));
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Set up polling to refresh data every 30 seconds
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, []);

  // PDF Report Generation for noise monitoring
  const generateHTMLReport = () => {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    const totalCategoryReports = data.noiseCategories.reduce((sum, cat) => sum + cat.count, 0);

    const categoryListHTML = data.noiseCategories.map((category, index) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px; text-align: left;">${index + 1}</td>
        <td style="padding: 8px; text-align: left; text-transform: capitalize;">${category.type}</td>
        <td style="padding: 8px; text-align: center;">${category.count}</td>
        <td style="padding: 8px; text-align: center;">${((category.count / totalCategoryReports) * 100).toFixed(1)}%</td>
      </tr>
    `).join('');

    const recentReportsHTML = data.recentReports.slice(0, 10).map((report, index) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px; text-align: left;">${index + 1}</td>
        <td style="padding: 8px; text-align: left; text-transform: capitalize;">${report.type}</td>
        <td style="padding: 8px; text-align: left;">${report.location}</td>
        <td style="padding: 8px; text-align: left;">${report.reporter}</td>
        <td style="padding: 8px; text-align: left;">${report.time}</td>
        <td style="padding: 8px; text-align: center;">
          <span style="padding: 4px 8px; border-radius: 12px; font-size: 12px; color: white; background-color: ${
            report.status === 'resolved' ? '#8B7355' : report.status === 'investigating' ? '#DAA520' : '#B8860B'
          };">
            ${report.status}
          </span>
        </td>
      </tr>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Noise Monitoring System - Admin Dashboard Report</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #faf8f3;
          color: #3e2723;
        }
        .header {
          background: linear-gradient(135deg, #8B4513, #D2B48C);
          color: white;
          padding: 30px;
          border-radius: 10px;
          margin-bottom: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: bold;
        }
        .header p {
          margin: 10px 0 0 0;
          opacity: 0.9;
          font-size: 16px;
        }
        .report-info {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(139,69,19,0.1);
          margin-bottom: 30px;
        }
        .report-info h2 {
          margin-top: 0;
          color: #8B4513;
          font-size: 20px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }
        .stats-card {
          background: white;
          padding: 25px;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(139,69,19,0.1);
          border-left: 4px solid #DAA520;
        }
        .stats-card h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #8B7355;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .stats-card .value {
          font-size: 32px;
          font-weight: bold;
          color: #8B4513;
          margin: 0;
        }
        .section {
          background: white;
          padding: 25px;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(139,69,19,0.1);
          margin-bottom: 30px;
        }
        .section h2 {
          margin: 0 0 20px 0;
          color: #8B4513;
          font-size: 20px;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        .table th {
          background-color: #faf8f3;
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
          color: #5d4037;
          border-bottom: 2px solid #e8dcc6;
        }
        .table td {
          padding: 8px;
          border-bottom: 1px solid #e8dcc6;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding: 20px;
          color: #8B7355;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Noise Monitoring System</h1>
        <p>Admin Dashboard Report</p>
      </div>

      <div class="report-info">
        <h2>Report Information</h2>
        <p><strong>Generated on:</strong> ${currentDate} at ${currentTime}</p>
        <p><strong>Report Type:</strong> Complete Dashboard Overview</p>
        <p><strong>Data Source:</strong> Live Noise Monitoring System</p>
      </div>

      <div class="stats-grid">
        <div class="stats-card">
          <h3>Reports Today</h3>
          <div class="value">${data.reportsToday}</div>
        </div>
        <div class="stats-card">
          <h3>Flagged Areas</h3>
          <div class="value">${data.flaggedAreas}</div>
        </div>
        <div class="stats-card">
          <h3>Total Reports</h3>
          <div class="value">${data.totalReports}</div>
        </div>
        <div class="stats-card">
          <h3>Resolved Reports</h3>
          <div class="value">${data.resolvedReports}</div>
        </div>
      </div>

      <div class="section">
        <h2>Noise Categories Breakdown</h2>
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Category</th>
              <th>Reports</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${categoryListHTML}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Recent Reports</h2>
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>Location</th>
              <th>Reporter</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${recentReportsHTML}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <p>This report was automatically generated by the Noise Monitoring Admin System</p>
        <p>For questions or support, please contact the system administrator</p>
      </div>
    </body>
    </html>
    `;
  };

  const handleExportReport = async () => {
    try {
      setExportLoading(true);
      const htmlContent = generateHTMLReport();

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        width: 612,
        height: 792,
        margin: { left: 20, top: 20, right: 20, bottom: 20 },
      });

      const currentDate = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      const fileName = `Noise_Monitoring_Report_${currentDate}_${currentTime}.pdf`;

      const documentDirectory = FileSystem.documentDirectory;
      const fileUri = `${documentDirectory}${fileName}`;
      
      await FileSystem.moveAsync({
        from: uri,
        to: fileUri,
      });

      Alert.alert(
        'Report Generated Successfully! 📊',
        `Your PDF report "${fileName}" has been created.`,
        [
          {
            text: 'Share Report',
            onPress: async () => {
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                  mimeType: 'application/pdf',
                  dialogTitle: 'Share Noise Monitoring Report',
                });
              }
            },
          },
          { text: 'Close', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Export Error', 'Could not generate report.');
    } finally {
      setExportLoading(false);
    }
  };

  // Drawer animations
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
      })
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
      })
    ]).start(() => setDrawerVisible(false));
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              navigation.replace('Login');
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  // Render functions
  const renderSummaryCard = (title, value, icon, color, trend, loading) => (
    <View style={[styles.summaryCard, { borderLeftColor: color }]}>
      <View style={styles.summaryContent}>
        <View style={styles.summaryInfo}>
          <Text style={styles.summaryTitle}>{title}</Text>
          {loading ? (
            <ActivityIndicator size="small" color={color} />
          ) : (
            <View>
              <Text style={[styles.summaryValue, { color }]}>{value}</Text>
              {trend && <Text style={styles.summaryTrend}>↗ {trend}</Text>}
            </View>
          )}
        </View>
        <View style={[styles.summaryIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
      </View>
    </View>
  );

  const renderNoiseCategoryChart = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Top Noise Categories</Text>
      </View>
      <View style={styles.cardContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#DAA520" />
          </View>
        ) : (
          <View style={styles.chartContainer}>
            {data.noiseCategories.map((category, index) => {
              const total = data.noiseCategories.reduce((sum, cat) => sum + cat.count, 0);
              const percentage = ((category.count / total) * 100).toFixed(1);
              return (
                <View key={index} style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <View style={[styles.categoryColor, { backgroundColor: category.color }]} />
                    <Text style={styles.categoryName}>{category.type}</Text>
                  </View>
                  <View style={styles.categoryStats}>
                    <Text style={styles.categoryCount}>{category.count}</Text>
                    <Text style={styles.categoryPercent}>{percentage}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );

  const renderRecentReports = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Recent Reports</Text>
        <TouchableOpacity style={styles.viewAllBtn}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.cardContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#DAA520" />
          </View>
        ) : (
          <View style={styles.reportsList}>
            {data.recentReports.slice(0, 5).map((report, index) => (
              <View key={report.id} style={styles.reportItem}>
                <View style={styles.reportIcon}>
                  <Ionicons 
                    name={getNoiseIcon(report.type)} 
                    size={20} 
                    color={getReportLevelColor(report.level)} 
                  />
                </View>
                <View style={styles.reportInfo}>
                  <View style={styles.reportHeader}>
                    <Text style={styles.reportType}>{report.type.toUpperCase()}</Text>
                    <Text style={styles.reportTime}>{report.time}</Text>
                  </View>
                  <Text style={styles.reportLocation}>{report.location}</Text>
                  <Text style={styles.reportReporter}>Reported by {report.reporter}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(report.status) + '20' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: getStatusColor(report.status) }
                  ]}>
                    {report.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderAlertsAndFlags = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Alerts & Flags</Text>
        <View style={styles.alertCount}>
          <Text style={styles.alertCountText}>{data.alerts.length}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.alertsList}>
          {data.alerts.map((alert) => (
            <View key={alert.id} style={styles.alertItem}>
              <View style={[
                styles.alertIndicator,
                { backgroundColor: getAlertSeverityColor(alert.severity) }
              ]} />
              <View style={styles.alertContent}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertLocation}>{alert.location}</Text>
                  <Text style={[
                    styles.alertSeverity,
                    { color: getAlertSeverityColor(alert.severity) }
                  ]}>
                    {alert.severity.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.alertMessage}>{alert.message}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderTopNoiseSources = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Top Noise Sources</Text>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.sourcesList}>
          {data.topNoiseSources.map((source, index) => (
            <View key={index} style={styles.sourceItem}>
              <View style={styles.sourceRank}>
                <Text style={styles.sourceRankText}>{index + 1}</Text>
              </View>
              <View style={styles.sourceInfo}>
                <Text style={styles.sourceLocation}>{source.location}</Text>
                <Text style={styles.sourceReports}>{source.reports} reports</Text>
              </View>
              <View style={[
                styles.levelIndicator,
                { backgroundColor: getReportLevelColor(source.level) }
              ]}>
                <Text style={styles.levelText}>{source.level}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  // Helper functions
  const getNoiseIcon = (type) => {
    const icons = {
      traffic: 'car-outline',
      music: 'musical-notes-outline',
      construction: 'construct-outline',
      shouting: 'megaphone-outline',
      machinery: 'cog-outline'
    };
    return icons[type] || 'volume-high-outline';
  };

  const getReportLevelColor = (level) => {
    const colors = {
      high: '#8B4513',
      medium: '#DAA520',
      low: '#D2B48C'
    };
    return colors[level] || '#8B7355';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#B8860B',
      investigating: '#DAA520',
      resolved: '#8B7355'
    };
    return colors[status] || '#8B7355';
  };

  const getAlertSeverityColor = (severity) => {
    const colors = {
      critical: '#8B0000',
      high: '#B8860B',
      medium: '#DAA520'
    };
    return colors[severity] || '#8B7355';
  };

  const renderDashboard = () => (
    <View style={styles.dashboardContainer}>
      {/* Header Actions */}
      <View style={styles.pageHeader}>
        <Text style={styles.sectionTitle}>Noise Monitoring</Text>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, exportLoading && styles.btnDisabled]}
          onPress={handleExportReport}
          disabled={exportLoading || loading}
        >
          {exportLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="download-outline" size={16} color="white" />
          )}
          <Text style={styles.btnPrimaryText}>
            {exportLoading ? 'Generating...' : 'Export Report'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        {renderSummaryCard('Reports Today', data.reportsToday, 'today-outline', '#DAA520', '+15%', loading)}
        {renderSummaryCard('Flagged Areas', data.flaggedAreas, 'warning-outline', '#B8860B', null, loading)}
        {renderSummaryCard('Total Reports', data.totalReports, 'bar-chart-outline', '#8B4513', '+8%', loading)}
        {renderSummaryCard('Resolved', data.resolvedReports, 'checkmark-circle-outline', '#8B7355', '64%', loading)}
      </View>

      {/* Noise Categories Chart */}
      {renderNoiseCategoryChart()}

      {/* Recent Reports */}
      {renderRecentReports()}

      {/* Top Noise Sources */}
      {renderTopNoiseSources()}

      {/* Alerts & Flags */}
      {renderAlertsAndFlags()}
    </View>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={48} color="#B8860B" />
            <Text style={styles.errorTitle}>Unable to load dashboard</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchData()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B4513" />
      
      {/* Header */}
      <LinearGradient
        colors={['#8B4513', '#D2B48C']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={openDrawer} style={styles.headerButton}>
              <Ionicons name="menu" size={28} color="#F5DEB3" />
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.headerButton}>
                <Ionicons name="notifications-outline" size={28} color="#F5DEB3" />
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>3</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
                <Ionicons name="log-out-outline" size={28} color="#F5DEB3" />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.headerTitle}>Noise Monitor</Text>
          <Text style={styles.headerSubtitle}>Admin Dashboard</Text>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#8B4513']}
          />
        }
      >
        {renderDashboard()}
      </ScrollView>

      {/* Custom Drawer */}
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
    backgroundColor: '#faf8f3',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#faf8f3',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#8B7355',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3e2723',
    marginTop: 10,
    marginBottom: 5,
  },
  errorMessage: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  header: {
    paddingBottom: 30,
    paddingTop: getStatusBarHeight(),
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerButton: {
    padding: 8,
    position: 'relative',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#F5DEB3',
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#B8860B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  dashboardContainer: {
    padding: 20,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3e2723',
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  btnPrimary: {
    backgroundColor: '#8B4513',
  },
  btnPrimaryText: {
    color: 'white',
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    flex: 1,
    minWidth: '45%',
    borderLeftWidth: 4,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    color: '#8B7355',
    marginBottom: 8,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryTrend: {
    fontSize: 12,
    color: '#8B7355',
    fontWeight: '600',
  },
  summaryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0ede6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3e2723',
  },
  cardContent: {
    padding: 20,
  },
  viewAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0ede6',
    borderRadius: 6,
  },
  viewAllText: {
    color: '#8B4513',
    fontSize: 12,
    fontWeight: '600',
  },
  alertCount: {
    backgroundColor: '#B8860B',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Chart styles
  chartContainer: {
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    color: '#3e2723',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  categoryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
    minWidth: 30,
    textAlign: 'right',
  },
  categoryPercent: {
    fontSize: 14,
    color: '#8B7355',
    minWidth: 40,
    textAlign: 'right',
  },

  // Reports list styles
  reportsList: {
    gap: 16,
  },
  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0ede6',
  },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0ede6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportInfo: {
    flex: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reportType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  reportTime: {
    fontSize: 12,
    color: '#8B7355',
  },
  reportLocation: {
    fontSize: 14,
    color: '#3e2723',
    marginBottom: 2,
  },
  reportReporter: {
    fontSize: 12,
    color: '#8B7355',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Top noise sources styles
  sourcesList: {
    gap: 12,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  sourceRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0ede6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  sourceInfo: {
    flex: 1,
  },
  sourceLocation: {
    fontSize: 16,
    color: '#3e2723',
    marginBottom: 2,
  },
  sourceReports: {
    fontSize: 12,
    color: '#8B7355',
  },
  levelIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Alerts styles
  alertsList: {
    gap: 16,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  alertIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertLocation: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3e2723',
  },
  alertSeverity: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  alertMessage: {
    fontSize: 14,
    color: '#8B7355',
    lineHeight: 20,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(139, 69, 19, 0.5)',
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.8,
  },

  noData: {
    textAlign: 'center',
    color: '#8B7355',
    fontSize: 14,
    paddingVertical: 20,
  },
});

export default AdminDashboard;
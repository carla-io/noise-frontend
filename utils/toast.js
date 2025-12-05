import Toast from 'react-native-toast-message';
import { View, Text } from 'react-native';

export const showToast = (type, text1, text2) => {
  Toast.show({
    type: type,
    text1: text1,
    text2: text2,
    visibilityTime: 3000,
    autoHide: true,
  });
};

export const toastConfig = {
  success: ({ text1, text2 }) => (
    <View style={{ 
      width: '90%', 
      backgroundColor: '#4BB543', 
      padding: 15, 
      borderRadius: 10,
      marginBottom: 10,
    }}>
      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{text1}</Text>
      {text2 && <Text style={{ color: 'white', fontSize: 14 }}>{text2}</Text>}
    </View>
  ),
  error: ({ text1, text2 }) => (
    <View style={{ 
      width: '90%', 
      backgroundColor: '#FF3333', 
      padding: 15, 
      borderRadius: 10,
      marginBottom: 10,
    }}>
      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{text1}</Text>
      {text2 && <Text style={{ color: 'white', fontSize: 14 }}>{text2}</Text>}
    </View>
  ),
  info: ({ text1, text2 }) => (
    <View style={{ 
      width: '90%', 
      backgroundColor: '#0077CC', 
      padding: 15, 
      borderRadius: 10,
      marginBottom: 10,
    }}>
      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{text1}</Text>
      {text2 && <Text style={{ color: 'white', fontSize: 14 }}>{text2}</Text>}
    </View>
  ),
};
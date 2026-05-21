import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateWalletScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>CreateWalletScreen</Text>
        <Text style={styles.subtitle}>// TODO: implement screen</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title:     { fontSize: 20, fontWeight: '600', color: '#1A6B3C', marginBottom: 8 },
  subtitle:  { fontSize: 14, color: '#94A3B8' },
});

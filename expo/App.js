import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { tableUrl } from './src/tableUrl';

const FELT = '#0d2a28';
const GOLD = '#d4af37';

function nativeCss(insets) {
  return `
(function () {
  var root = document.documentElement;
  root.classList.add('is-native');
  root.style.setProperty('--native-sat', '${insets.top}px');
  root.style.setProperty('--native-sar', '${insets.right}px');
  root.style.setProperty('--native-sab', '${insets.bottom}px');
  root.style.setProperty('--native-sal', '${insets.left}px');
  if (document.body) document.body.classList.add('is-native');
  var tip = document.getElementById('landscape-tip');
  if (tip) {
    tip.hidden = true;
    tip.setAttribute('hidden', '');
    tip.style.display = 'none';
  }
  var style = document.getElementById('tot-native-css');
  if (!style) {
    style = document.createElement('style');
    style.id = 'tot-native-css';
    style.textContent = '.landscape-tip,.browser-tip{display:none!important}';
    (document.head || root).appendChild(style);
  }
})();
true;
`;
}

function TableShell() {
  const insets = useSafeAreaInsets();
  const webRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const uri = useMemo(() => tableUrl(), []);
  const injected = useMemo(() => nativeCss(insets), [insets]);

  const reload = useCallback(() => {
    setError(null);
    setLoading(true);
    webRef.current?.reload();
  }, []);

  return (
    <View style={styles.fill}>
      <StatusBar hidden style="light" />
      <WebView
        ref={webRef}
        source={{ uri }}
        style={styles.fill}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        bounces={false}
        overScrollMode="never"
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustsScrollIndicatorInsets={false}
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures={false}
        hideKeyboardAccessoryView
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        mixedContentMode="always"
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        injectedJavaScript={injected}
        injectedJavaScriptBeforeContentLoaded={injected}
        onLoadStart={() => {
          setLoading(true);
          setError(null);
        }}
        onLoadEnd={() => setLoading(false)}
        onError={(event) => {
          setLoading(false);
          setError(event.nativeEvent?.description || 'Could not load the table.');
        }}
        onHttpError={(event) => {
          const code = event.nativeEvent?.statusCode;
          if (code && code >= 400) {
            setLoading(false);
            setError(`Table HTTP ${code}`);
          }
        }}
      />
      {loading && !error ? (
        <View style={styles.cover} pointerEvents="none">
          <ActivityIndicator color={GOLD} size="large" />
          <Text style={styles.coverText}>Opening the table…</Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.cover}>
          <Text style={styles.errTitle}>Table unavailable</Text>
          <Text style={styles.errBody}>{error}</Text>
          <Text style={styles.errUrl} numberOfLines={3}>
            {uri}
          </Text>
          <Pressable onPress={reload} style={styles.retry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <View style={styles.fill}>
        <TableShell />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: FELT,
  },
  cover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: FELT,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  coverText: {
    marginTop: 14,
    color: '#f0d78a',
    letterSpacing: 0.6,
    fontSize: 14,
  },
  errTitle: {
    color: GOLD,
    fontSize: 20,
    marginBottom: 10,
  },
  errBody: {
    color: '#e8d9a8',
    textAlign: 'center',
    marginBottom: 10,
  },
  errUrl: {
    color: '#9bb8a8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 18,
  },
  retry: {
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  retryText: {
    color: GOLD,
    letterSpacing: 1,
  },
});

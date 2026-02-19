import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import ElevatedCard from './ElevatedCard';
import { motion, radius, spacing, typography } from '../../theme';
import useAppTheme from '../../theme/useAppTheme';

const weatherLabelByCode = {
  0: 'Clear Sky',
  1: 'Mostly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime Fog',
  51: 'Light Drizzle',
  53: 'Drizzle',
  55: 'Heavy Drizzle',
  61: 'Light Rain',
  63: 'Rain',
  65: 'Heavy Rain',
  71: 'Light Snow',
  73: 'Snow',
  75: 'Heavy Snow',
  80: 'Rain Showers',
  81: 'Rain Showers',
  82: 'Heavy Showers',
  95: 'Thunderstorm',
};

const weatherIconByCode = (code = 2) => {
  if (code === 0 || code === 1) return 'sunny-outline';
  if (code === 2 || code === 3) return 'partly-sunny-outline';
  if (code === 45 || code === 48) return 'cloud-outline';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy-outline';
  if (code >= 71 && code <= 77) return 'snow-outline';
  if (code >= 95) return 'thunderstorm-outline';
  return 'partly-sunny-outline';
};

export default function WeatherWidget() {
  const { palette } = useAppTheme();
  const shift = useRef(new Animated.Value(0)).current;
  const [weather, setWeather] = useState({
    temperature: '--',
    humidity: '--',
    condition: 'Fetching weather...',
    code: 2,
  });

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shift, { toValue: 1, duration: motion.gradientLoop, useNativeDriver: true }),
        Animated.timing(shift, { toValue: 0, duration: motion.gradientLoop, useNativeDriver: true }),
      ])
    ).start();
  }, [shift]);

  useEffect(() => {
    let mounted = true;

    const loadWeather = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          if (mounted) {
            setWeather((prev) => ({ ...prev, condition: 'Location permission denied' }));
          }
          return;
        }

        const position = await Location.getCurrentPositionAsync({});
        const latitude = position?.coords?.latitude;
        const longitude = position?.coords?.longitude;
        if (typeof latitude !== 'number' || typeof longitude !== 'number') return;

        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
          '&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto';

        const response = await fetch(url);
        const data = await response.json();
        const current = data?.current || {};
        const code = Number(current.weather_code ?? 2);
        const label = weatherLabelByCode[code] || 'Weather';

        if (mounted) {
          setWeather({
            temperature: Number.isFinite(current.temperature_2m) ? `${Math.round(current.temperature_2m)} C` : '--',
            humidity: Number.isFinite(current.relative_humidity_2m) ? `${Math.round(current.relative_humidity_2m)}%` : '--',
            condition: label,
            code,
          });
        }
      } catch (error) {
        if (mounted) {
          setWeather((prev) => ({ ...prev, condition: 'Weather unavailable' }));
        }
      }
    };

    loadWeather();
    const interval = setInterval(loadWeather, 10 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const translateX = useMemo(
    () =>
      shift.interpolate({
        inputRange: [0, 1],
        outputRange: [-18, 18],
      }),
    [shift]
  );

  return (
    <ElevatedCard style={styles.card} floating>
      <LinearGradient
        colors={[palette.weather.skyTop, palette.weather.skyBottom]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Animated.View
          style={[
            styles.cloud,
            { backgroundColor: palette.weather.cloud, transform: [{ translateX }] },
          ]}
        />
        <View style={styles.topRow}>
          <View>
            <Text style={[styles.temp, { color: palette.text.inverse }]}>{weather.temperature}</Text>
            <Text style={[styles.condition, { color: palette.text.inverse }]}>{weather.condition}</Text>
          </View>
          <Ionicons name={weatherIconByCode(weather.code)} size={30} color={palette.accent.action} />
        </View>
        <Text style={[styles.meta, { color: 'rgba(255,255,255,0.86)' }]}>Humidity {weather.humidity}</Text>
      </LinearGradient>
    </ElevatedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: radius.card,
    padding: spacing.md,
    minHeight: 126,
  },
  cloud: {
    position: 'absolute',
    width: 110,
    height: 56,
    borderRadius: 28,
    top: 20,
    right: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  temp: {
    ...typography.headline,
  },
  condition: {
    ...typography.bodyMedium,
    marginTop: spacing.xxs,
  },
  meta: {
    ...typography.caption,
    marginTop: spacing.lg,
  },
});

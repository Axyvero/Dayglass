
import {
  ActivityIndicator,
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import {
  getWeatherAdvice,
  isRainCondition,
  isSnowCondition,
} from '@/constants/weather';

import type {
  HourlyWeather,
  WeatherCondition,
  WeatherData,
} from '@/constants/weather';

import {
  getLiveWeather,
  getLocationName,
} from '@/constants/weatherApi';

import type {
  LiveWeather,
} from '@/constants/weatherApi';

/* ========================================================================= */
/* WEATHER ICON SYSTEM                                                        */
/* ========================================================================= */

type WeatherIconName =
  | 'weather-sunny'
  | 'weather-night'
  | 'weather-partly-cloudy'
  | 'weather-night-partly-cloudy'
  | 'weather-cloudy'
  | 'weather-fog'
  | 'weather-rainy'
  | 'weather-pouring'
  | 'weather-snowy'
  | 'weather-snowy-heavy';

function getWeatherIconName(
  condition: WeatherCondition,
  isDay = true
): WeatherIconName {
  switch (condition) {
    case 'Clear':
      return isDay
        ? 'weather-sunny'
        : 'weather-night';

    case 'Mostly Clear':
      return isDay
        ? 'weather-sunny'
        : 'weather-night';

    case 'Partly Cloudy':
      return isDay
        ? 'weather-partly-cloudy'
        : 'weather-night-partly-cloudy';

    case 'Cloudy':
      return 'weather-cloudy';

    case 'Mostly Cloudy':
      return 'weather-cloudy';

    case 'Fog':
      return 'weather-fog';

    case 'Light Rain':
      return 'weather-rainy';

    case 'Rain':
      return 'weather-rainy';

    case 'Heavy Rain':
      return 'weather-pouring';

    case 'Freezing Rain':
      return 'weather-rainy';

    case 'Light Snow':
      return 'weather-snowy';

    case 'Snow':
      return 'weather-snowy';

    case 'Heavy Snow':
      return 'weather-snowy-heavy';

    case 'Snow Grains':
      return 'weather-snowy';

    default:
      return isDay
        ? 'weather-cloudy'
        : 'weather-night';
  }
}

function WeatherIcon({
  condition,
  isDay = true,
  size = 150,
}: {
  condition: WeatherCondition;
  isDay?: boolean;
  size?: number;
}) {
  const color =
    getWeatherIconColor(
      condition
    );

  return (
    <View
      style={[
        styles.weatherIcon,
        {
          width: size,
          height: size,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={getWeatherIconName(
          condition,
          isDay
        )}
        size={size}
        color={color}
      />
    </View>
  );
}

function getWeatherIconColor(
  condition: WeatherCondition
): string {
  switch (condition) {
    case 'Clear':
      return '#F28A2E';

    case 'Mostly Clear':
      return '#E9A13A';

    case 'Partly Cloudy':
      return '#7595A4';

    case 'Cloudy':
      return '#8198A2';

    case 'Mostly Cloudy':
      return '#718892';

    case 'Fog':
      return '#95A7AD';

    case 'Light Rain':
      return '#5E9DB8';

    case 'Rain':
      return '#4F8FAA';

    case 'Heavy Rain':
      return '#3D7D98';

    case 'Freezing Rain':
      return '#638EA5';

    case 'Light Snow':
      return '#8FB7C8';

    case 'Snow':
      return '#7FAABD';

    case 'Heavy Snow':
      return '#7099AE';

    case 'Snow Grains':
      return '#A6C5D1';

    default:
      return '#8198A2';
  }
}

/* ========================================================================= */
/* HELPERS                                                                   */
/* ========================================================================= */

function formatHour(
  value: string
): string {
  const match =
    value.match(
      /T(\d{2}):(\d{2})/
    );

  if (!match) {
    return value;
  }

  let hour =
    Number(match[1]);

  const minute =
    match[2];

  hour %= 12;

  if (hour === 0) {
    hour = 12;
  }

  return `${hour}:${minute}`;
}

function getPeriod(
  value: string
): string {
  const match =
    value.match(
      /T(\d{2}):/
    );

  if (!match) {
    return '';
  }

  return Number(match[1]) >= 12
    ? 'PM'
    : 'AM';
}

function getDayName(
  date: string
): string {
  const parsed =
    new Date(
      `${date}T12:00:00`
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return date;
  }

  return parsed
    .toLocaleDateString(
      'en-US',
      {
        weekday: 'long',
      }
    )
    .toUpperCase();
}

function getShortDate(
  date: string
): string {
  const parsed =
    new Date(
      `${date}T12:00:00`
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return date;
  }

  return parsed.toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
    }
  );
}

function getGreeting(): string {
  const hour =
    new Date().getHours();

  if (hour < 12) {
    return 'GOOD MORNING';
  }

  if (hour < 17) {
    return 'GOOD AFTERNOON';
  }

  return 'GOOD EVENING';
}

function getAQIColor(
  aqi: number
): string {
  if (aqi <= 40) {
    return '#6DA786';
  }

  if (aqi <= 60) {
    return '#C7A44C';
  }

  if (aqi <= 80) {
    return '#D57D62';
  }

  return '#B95E52';
}

function isCurrentWet(
  weather: WeatherData
): boolean {
  return (
    weather.precipitation >= 0.1 ||
    weather.rain >= 0.1 ||
    weather.showers >= 0.1
  );
}

function getTheme(
  weather: WeatherData
) {
  if (
    weather.currentState ===
    'RAINING'
  ) {
    return {
      background: '#F1F6F8',
      panel: '#E5EFF2',
      accent: '#5797B3',
      glow: '#8BB9C9',
    };
  }

  if (
    weather.currentState ===
    'SNOWING'
  ) {
    return {
      background: '#F0F5F7',
      panel: '#E4EEF2',
      accent: '#7CA2B4',
      glow: '#A8C6D2',
    };
  }

  if (
    weather.currentState ===
    'FOGGY'
  ) {
    return {
      background: '#F2F5F6',
      panel: '#E8EEF0',
      accent: '#8C9FA6',
      glow: '#C0CDD1',
    };
  }

  if (!weather.isDay) {
    return {
      background: '#EDF2F7',
      panel: '#E4EAF1',
      accent: '#7386A2',
      glow: '#A6B4C8',
    };
  }

  if (
    weather.temperature >= 32 ||
    weather.feelsLike >= 35
  ) {
    return {
      background: '#F8F4F0',
      panel: '#F5ECE6',
      accent: '#D27C60',
      glow: '#E3A088',
    };
  }

  return {
    background: '#F5F7F5',
    panel: '#EAF1EF',
    accent:
      getWeatherIconColor(
        weather.condition
      ),
    glow: '#E4BD5D',
  };
}

function getHeroMessage(
  weather: WeatherData,
  condition: WeatherCondition
): string {
  if (
    weather.currentState ===
    'RAINING'
  ) {
    return isCurrentWet(weather)
      ? `${condition} is falling now. An umbrella is useful.`
      : `${condition} is nearby. An umbrella may be useful.`;
  }

  if (
    weather.currentState ===
    'SNOWING'
  ) {
    return `${condition} is affecting conditions around you.`;
  }

  if (
    weather.currentState ===
    'FOGGY'
  ) {
    return 'Foggy conditions right now. Visibility may be reduced.';
  }

  switch (condition) {
    case 'Clear':
      if (
        weather.rainChance >= 70
      ) {
        return 'Clear skies right now, but rain may arrive later.';
      }

      if (
        weather.rainChance >= 40
      ) {
        return 'Clear skies right now. Rain is possible later.';
      }

      return 'Clear skies right now.';

    case 'Mostly Clear':
      if (
        weather.rainChance >= 70
      ) {
        return 'Mostly clear right now, but rain may arrive later.';
      }

      if (
        weather.rainChance >= 40
      ) {
        return 'Mostly clear right now. Rain is possible later.';
      }

      return 'Mostly clear skies right now.';

    case 'Cloudy':
      if (
        weather.rainChance >= 70
      ) {
        return 'Cloudy right now, but rain may arrive later.';
      }

      if (
        weather.rainChance >= 40
      ) {
        return 'Cloudy right now. Rain is possible later.';
      }

      return 'Cloudy skies right now.';

    case 'Partly Cloudy':
      if (
        weather.rainChance >= 70
      ) {
        return 'Partly cloudy right now, but rain may arrive later.';
      }

      if (
        weather.rainChance >= 40
      ) {
        return 'Partly cloudy right now. Rain is possible later.';
      }

      return 'Partly cloudy right now.';

    case 'Mostly Cloudy':
      if (
        weather.rainChance >= 70
      ) {
        return 'Mostly cloudy right now, but rain may arrive later.';
      }

      if (
        weather.rainChance >= 40
      ) {
        return 'Mostly cloudy right now. Rain is possible later.';
      }

      return 'Mostly cloudy right now.';

    case 'Fog':
      return 'Foggy conditions right now. Visibility may be reduced.';

    case 'Light Rain':
    case 'Rain':
    case 'Heavy Rain':
    case 'Freezing Rain':
      return isCurrentWet(weather)
        ? `${condition} is falling now.`
        : `${condition} is expected nearby.`;

    case 'Light Snow':
    case 'Snow':
    case 'Heavy Snow':
    case 'Snow Grains':
      return `${condition} is expected around you.`;

    default:
      return 'Conditions look fairly calm right now.';
  }
}

/* ========================================================================= */
/* MAIN SCREEN                                                               */
/* ========================================================================= */

export default function HomeScreen() {
  const [
    locationName,
    setLocationName,
  ] = useState(
    'Detecting location...'
  );

  const [
    locationAccuracy,
    setLocationAccuracy,
  ] = useState<
    number | null
  >(null);

  const [
    liveWeather,
    setLiveWeather,
  ] = useState<
    LiveWeather | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    lastUpdated,
    setLastUpdated,
  ] = useState<
    Date | null
  >(null);

  const [
    expandedDay,
    setExpandedDay,
  ] = useState('');

  const loadWeather =
    useCallback(
      async (
        refresh = false
      ) => {
        try {
          if (refresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError(null);

          const permission =
            await Location.requestForegroundPermissionsAsync();

          if (
            permission.status !==
            'granted'
          ) {
            throw new Error(
              'Location permission is required to show local weather.'
            );
          }

          let position =
            await Location.getLastKnownPositionAsync(
              {
                maxAge: 120000,
                requiredAccuracy: 250,
              }
            );

          try {
            const fresh =
              await Location.getCurrentPositionAsync(
                {
                  accuracy:
                    Location.Accuracy.High,
                  mayShowUserSettingsDialog:
                    true,
                }
              );

            position =
              fresh;
          } catch (
            locationError
          ) {
            console.log(
              'Fresh location unavailable:',
              locationError
            );
          }

          if (!position) {
            throw new Error(
              'Could not determine your current location.'
            );
          }

          const latitude =
            position.coords.latitude;

          const longitude =
            position.coords.longitude;

          if (
            typeof position.coords
              .accuracy ===
            'number'
          ) {
            setLocationAccuracy(
              position.coords.accuracy
            );
          }

          const [
            weatherResult,
            locationResult,
          ] =
            await Promise.all([
              getLiveWeather(
                latitude,
                longitude
              ),

              getLocationName(
                latitude,
                longitude
              ).catch(
                () =>
                  'Current location'
              ),
            ]);

          setLiveWeather(
            weatherResult
          );

          setLocationName(
            locationResult
          );

          setExpandedDay(
            current =>
              current ||
              weatherResult
                .daily[0]
                ?.date ||
              ''
          );

          setLastUpdated(
            new Date()
          );
        } catch (
          caughtError
        ) {
          console.log(
            'Dayglass error:',
            caughtError
          );

          setError(
            caughtError instanceof
              Error
              ? caughtError.message
              : 'Unable to load live weather.'
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    loadWeather();

    const timer =
      setInterval(
        () => {
          loadWeather(true);
        },
        5 * 60 * 1000
      );

    const subscription =
      AppState.addEventListener(
        'change',
        nextState => {
          if (
            nextState ===
            'active'
          ) {
            loadWeather(true);
          }
        }
      );

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [
    loadWeather,
  ]);

  const weather =
    useMemo<
      WeatherData | null
    >(
      () => {
        if (!liveWeather) {
          return null;
        }

        return {
          ...liveWeather,
          location:
            locationName,
        };
      },
      [
        liveWeather,
        locationName,
      ]
    );

  const advice =
    useMemo(
      () =>
        weather
          ? getWeatherAdvice(
              weather
            )
          : null,
      [weather]
    );

  if (
    loading &&
    !weather
  ) {
    return (
      <SafeAreaView
        style={
          styles.loadingScreen
        }
      >
        <WeatherIcon
          condition="Cloudy"
          size={130}
        />

        <Text
          style={
            styles.loadingBrand
          }
        >
          DAYGLASS
        </Text>

        <ActivityIndicator
          size="small"
          color="#5D9FBE"
        />

        <Text
          style={
            styles.loadingLabel
          }
        >
          READING YOUR SKY
        </Text>

        <Text
          style={
            styles.loadingBody
          }
        >
          Finding your location
          and live conditions
        </Text>
      </SafeAreaView>
    );
  }

  if (
    !weather ||
    !advice
  ) {
    return (
      <SafeAreaView
        style={
          styles.errorScreen
        }
      >
        <Text
          style={
            styles.errorLabel
          }
        >
          WEATHER UNAVAILABLE
        </Text>

        <Text
          style={
            styles.errorTitle
          }
        >
          We couldn't read
          your sky.
        </Text>

        <Text
          style={
            styles.errorBody
          }
        >
          {error ??
            'Live weather is temporarily unavailable.'}
        </Text>

        <Pressable
          onPress={() =>
            loadWeather()
          }
          style={
            styles.retryButton
          }
        >
          <Text
            style={
              styles.retryText
            }
          >
            TRY AGAIN
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const theme =
    getTheme(
      weather
    );

  const currentCondition =
    weather.condition;

  const groupedHours =
    weather.hourly.reduce<
      Record<
        string,
        HourlyWeather[]
      >
    >(
      (
        result,
        hour
      ) => {
        const date =
          hour.time.slice(
            0,
            10
          );

        if (!result[date]) {
          result[date] = [];
        }

        result[date].push(
          hour
        );

        return result;
      },
      {}
    );

  const sunriseMs =
    new Date(
      weather.sunriseRaw
    ).getTime();

  const sunsetMs =
    new Date(
      weather.sunsetRaw
    ).getTime();

  const daylightMinutes =
    sunsetMs >
    sunriseMs
      ? Math.round(
          (
            sunsetMs -
            sunriseMs
          ) / 60000
        )
      : 0;

  const daylightHours =
    Math.floor(
      daylightMinutes /
        60
    );

  const remainingMinutes =
    daylightMinutes %
    60;

  const daylightProgress =
    sunsetMs >
    sunriseMs
      ? Math.min(
          1,
          Math.max(
            0,
            (
              Date.now() -
              sunriseMs
            ) /
              (
                sunsetMs -
                sunriseMs
              )
          )
        )
      : 0;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() =>
              loadWeather(
                true
              )
            }
            tintColor={
              theme.accent
            }
          />
        }
      >
        {/* HEADER */}

        <View
          style={
            styles.header
          }
        >
          <View>
            <Text
              style={
                styles.eyebrow
              }
            >
              {getGreeting()}
            </Text>

            <View
              style={
                styles.locationRow
              }
            >
              <View
                style={[
                  styles.liveDot,
                  {
                    backgroundColor:
                      theme.accent,
                  },
                ]}
              />

              <Text
                style={
                  styles.location
                }
              >
                {locationName}
              </Text>
            </View>

            <Text
              style={
                styles.locationMeta
              }
            >
              {locationAccuracy !==
              null
                ? `LIVE · GPS ±${Math.round(
                    locationAccuracy
                  )}m`
                : 'LIVE LOCAL WEATHER'}
            </Text>
          </View>

          <View
            style={
              styles.dateBox
            }
          >
            <Text
              style={
                styles.dateDay
              }
            >
              {new Date()
                .toLocaleDateString(
                  'en-US',
                  {
                    weekday:
                      'short',
                  }
                )
                .toUpperCase()}
            </Text>

            <Text
              style={
                styles.dateNumber
              }
            >
              {new Date().getDate()}
            </Text>
          </View>
        </View>

        {/* CURRENT WEATHER */}

        <View
          style={[
            styles.hero,
            {
              backgroundColor:
                theme.panel,
              borderColor:
                `${theme.accent}30`,
            },
          ]}
        >
          <View
            style={[
              styles.heroGlow,
              {
                backgroundColor:
                  theme.glow,
              },
            ]}
          />

          <View
            style={
              styles.heroTop
            }
          >
            <View
              style={
                styles.heroInfo
              }
            >
              <Text
                style={
                  styles.temperature
                }
              >
                {
                  weather.temperature
                }
                °
              </Text>

              <Text
                style={[
                  styles.condition,
                  {
                    color:
                      theme.accent,
                  },
                ]}
              >
                {
                  currentCondition
                }
              </Text>

              <Text
                style={
                  styles.feelsLike
                }
              >
                FEELS LIKE{' '}
                {
                  weather.feelsLike
                }
                °
              </Text>
            </View>

            <WeatherIcon
              condition={
                currentCondition
              }
              isDay={
                weather.isDay
              }
              size={165}
            />
          </View>

          <Text
            style={
              styles.heroMessage
            }
          >
            {getHeroMessage(
              weather,
              currentCondition
            )}
          </Text>

          <View
            style={
              styles.metrics
            }
          >
            <Metric
              label="HUMIDITY"
              value={`${weather.humidity}%`}
            />

            <Metric
              label="WIND"
              value={`${weather.windSpeed} km/h`}
            />

            <Metric
              label="UV"
              value={`${weather.uvIndex}`}
            />

            <Metric
              label="CLOUD"
              value={`${weather.cloudCover}%`}
            />
          </View>
        </View>

        {/* WEATHER NOTE */}

        <View
          style={
            styles.notice
          }
        >
          <View
            style={
              styles.noticeIcon
            }
          >
            <Text
              style={
                styles.noticeIconText
              }
            >
              i
            </Text>
          </View>

          <View
            style={
              styles.noticeCopy
            }
          >
            <Text
              style={
                styles.noticeTitle
              }
            >
              {
                advice.weatherNotice
                  .title
              }
            </Text>

            <Text
              style={
                styles.noticeDetail
              }
            >
              {
                advice.weatherNotice
                  .detail
              }
            </Text>
          </View>
        </View>

        {/* ASSISTANT */}

        <View
          style={
            styles.assistant
          }
        >
          <View
            style={
              styles.assistantHeader
            }
          >
            <View
              style={[
                styles.assistantIcon,
                {
                  backgroundColor:
                    theme.accent,
                },
              ]}
            >
              <View
                style={
                  styles.assistantCore
                }
              />
            </View>

            <View>
              <Text
                style={
                  styles.assistantLabel
                }
              >
                DAYGLASS ASSISTANT
              </Text>

              <Text
                style={
                  styles.assistantSub
                }
              >
                LIVE PERSONAL GUIDANCE
              </Text>
            </View>
          </View>

          <Text
            style={
              styles.assistantTitle
            }
          >
            {
              advice.assistantTitle
            }
          </Text>

          <Text
            style={
              styles.assistantMessage
            }
          >
            {
              advice.assistantMessage
            }
          </Text>

          <View
            style={
              styles.divider
            }
          />

          <Text
            style={
              styles.nextLabel
            }
          >
            NEXT CHANGE
          </Text>

          <Text
            style={
              styles.nextTitle
            }
          >
            {
              advice.nextChange
                .title
            }
          </Text>

          <Text
            style={
              styles.nextDetail
            }
          >
            {
              advice.nextChange
                .detail
            }
          </Text>
        </View>

        {/* DAYLIGHT */}

        <View
          style={
            styles.section
          }
        >
          <SectionHeader
            title="DAYLIGHT"
            subtitle={`${daylightHours}h ${remainingMinutes}m`}
          />

          <View
            style={
              styles.daylightTrack
            }
          >
            <View
              style={
                styles.daylightBase
              }
            />

            <View
              style={[
                styles.daylightFill,
                {
                  width:
                    `${daylightProgress * 100}%`,
                  backgroundColor:
                    theme.accent,
                },
              ]}
            />

            <View
              style={[
                styles.daylightMarker,
                {
                  left:
                    `${daylightProgress * 100}%`,
                },
              ]}
            />
          </View>

          <View
            style={
              styles.daylightLabels
            }
          >
            <Text
              style={
                styles.smallMuted
              }
            >
              {weather.sunrise}
            </Text>

            <Text
              style={
                styles.daylightState
              }
            >
              {weather.isDay
                ? 'DAYLIGHT NOW'
                : 'NIGHT'}
            </Text>

            <Text
              style={
                styles.smallMuted
              }
            >
              {weather.sunset}
            </Text>
          </View>
        </View>

        {/* BEFORE YOU GO */}

        <View
          style={
            styles.section
          }
        >
          <SectionHeader
            title="BEFORE YOU GO"
            subtitle="LIVE RECOMMENDATIONS"
          />

          <AdviceRow
            number="01"
            title="Water"
            detail={
              advice.water.detail
            }
            status={
              advice.water.status
            }
            color="#70A587"
          />

          <AdviceRow
            number="02"
            title="Umbrella"
            detail={
              advice.umbrella.detail
            }
            status={
              advice.umbrella.status
            }
            color="#5D9FBE"
          />

          <AdviceRow
            number="03"
            title="Sun protection"
            detail={
              advice.sunscreen.detail
            }
            status={
              advice.sunscreen.status
            }
            color="#DDAF47"
          />

          <AdviceRow
            number="04"
            title={
              advice.clothing.title
            }
            detail={
              advice.clothing.detail
            }
            status="READY"
            color="#D17B60"
          />

          <AdviceRow
            number="05"
            title={
              advice.air.title
            }
            detail={
              advice.air.detail
            }
            status={
              weather.airQuality
                ? 'READY'
                : 'SKIP'
            }
            color="#829DAA"
          />
        </View>

        {/* BEST WINDOW */}

        <View
          style={
            styles.section
          }
        >
          <SectionHeader
            title="BEST WINDOW"
            subtitle="SMART OUTDOOR RECOMMENDATION"
          />

          <View
            style={
              styles.bestWindow
            }
          >
            <View
              style={
                styles.bestTimes
              }
            >
              <Text
                style={
                  styles.bestTime
                }
              >
                {
                  advice.bestWindow
                    .start
                }
              </Text>

              <Text
                style={
                  styles.bestTo
                }
              >
                TO
              </Text>

              <Text
                style={
                  styles.bestTime
                }
              >
                {
                  advice.bestWindow
                    .end
                }
              </Text>
            </View>

            <View
              style={
                styles.bestCopy
              }
            >
              <Text
                style={
                  styles.recommendedText
                }
              >
                RECOMMENDED
              </Text>

              <Text
                style={
                  styles.bestTitle
                }
              >
                Best available outdoor
                window.
              </Text>

              <Text
                style={
                  styles.body
                }
              >
                {
                  advice.bestWindow
                    .reason
                }
              </Text>
            </View>
          </View>
        </View>

        {/* AIR QUALITY */}

        {weather.airQuality && (
          <View
            style={
              styles.section
            }
          >
            <SectionHeader
              title="AIR QUALITY"
              subtitle="CURRENT READING"
            />

            <View
              style={
                styles.airCard
              }
            >
              <View
                style={
                  styles.airTop
                }
              >
                <Text
                  style={
                    styles.airNumber
                  }
                >
                  {
                    weather.airQuality
                      .europeanAQI
                  }
                </Text>

                <View>
                  <Text
                    style={
                      styles.airSmall
                    }
                  >
                    EUROPEAN AQI
                  </Text>

                  <Text
                    style={[
                      styles.airCategory,
                      {
                        color:
                          getAQIColor(
                            weather.airQuality
                              .europeanAQI
                          ),
                      },
                    ]}
                  >
                    {
                      weather.airQuality
                        .category
                    }
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.pollutants
                }
              >
                <Pollutant
                  label="PM2.5"
                  value={
                    weather.airQuality
                      .pm25
                  }
                />

                <Pollutant
                  label="PM10"
                  value={
                    weather.airQuality
                      .pm10
                  }
                />

                <Pollutant
                  label="O₃"
                  value={
                    weather.airQuality
                      .ozone
                  }
                />
              </View>
            </View>
          </View>
        )}

        {/* WEEK AHEAD */}

        <View
          style={
            styles.section
          }
        >
          <SectionHeader
            title="WEEK AHEAD"
            subtitle="7 DAY OUTLOOK"
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.weekRow
            }
          >
            {weather.daily.map(
              (
                day,
                index
              ) => (
                <Pressable
                  key={
                    day.date
                  }
                  onPress={() =>
                    setExpandedDay(
                      day.date
                    )
                  }
                  style={[
                    styles.dayCard,
                    expandedDay ===
                      day.date &&
                      styles.dayCardActive,
                  ]}
                >
                  <Text
                    style={
                      styles.dayLabel
                    }
                  >
                    {index === 0
                      ? 'TODAY'
                      : getDayName(
                          day.date
                        )}
                  </Text>

                  <Text
                    style={
                      styles.dayDate
                    }
                  >
                    {getShortDate(
                      day.date
                    )}
                  </Text>

                  <WeatherIcon
                    condition={
                      day.condition
                    }
                    size={70}
                  />

                  <Text
                    style={
                      styles.dayCondition
                    }
                  >
                    {
                      day.condition
                    }
                  </Text>

                  <View
                    style={
                      styles.dayTempRow
                    }
                  >
                    <Text
                      style={
                        styles.dayHigh
                      }
                    >
                      {
                        day.temperatureMax
                      }
                      °
                    </Text>

                    <Text
                      style={
                        styles.dayLow
                      }
                    >
                      {
                        day.temperatureMin
                      }
                      °
                    </Text>
                  </View>
                </Pressable>
              )
            )}
          </ScrollView>
        </View>

        {/* HOURLY FORECAST */}

        <View
          style={
            styles.section
          }
        >
          <SectionHeader
            title="HOURLY FORECAST"
            subtitle="TODAY AND UPCOMING DAYS"
          />

          {Object.entries(
            groupedHours
          ).map(
            (
              [date, hours],
              dayIndex
            ) => {
              const open =
                expandedDay ===
                date;

              return (
                <View
                  key={
                    date
                  }
                  style={
                    styles.hourGroup
                  }
                >
                  <Pressable
                    onPress={() =>
                      setExpandedDay(
                        current =>
                          current ===
                          date
                            ? ''
                            : date
                      )
                    }
                    style={
                      styles.hourHeader
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.hourDay
                        }
                      >
                        {dayIndex ===
                        0
                          ? 'TODAY'
                          : getDayName(
                              date
                            )}
                      </Text>

                      <Text
                        style={
                          styles.hourDate
                        }
                      >
                        {getShortDate(
                          date
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.hourRight
                      }
                    >
                      <Text
                        style={
                          styles.hourCount
                        }
                      >
                        {
                          hours.length
                        }{' '}
                        HOURS
                      </Text>

                      <Text
                        style={
                          styles.expand
                        }
                      >
                        {open
                          ? '−'
                          : '+'}
                      </Text>
                    </View>
                  </Pressable>

                  {open &&
                    hours.map(
                      (
                        hour,
                        index
                      ) => (
                        <View
                          key={`${hour.time}-${index}`}
                          style={
                            styles.hourRow
                          }
                        >
                          <View
                            style={
                              styles.hourTime
                            }
                          >
                            <Text
                              style={
                                styles.hourNumber
                              }
                            >
                              {formatHour(
                                hour.time
                              )}
                            </Text>

                            <Text
                              style={
                                styles.hourPeriod
                              }
                            >
                              {getPeriod(
                                hour.time
                              )}
                            </Text>
                          </View>

                          <WeatherIcon
                            condition={
                              hour.condition
                            }
                            size={48}
                          />

                          <View
                            style={
                              styles.hourContent
                            }
                          >
                            <Text
                              style={[
                                styles.hourTitle,
                                {
                                  color:
                                    getWeatherIconColor(
                                      hour.condition
                                    ),
                                },
                              ]}
                            >
                              {
                                hour.condition
                              }
                            </Text>

                            <Text
                              style={
                                styles.hourDetail
                              }
                            >
                              {hour.temperature}
                              ° · feels{' '}
                              {
                                hour.feelsLike
                              }
                              ° ·{' '}
                              {
                                hour.humidity
                              }
                              % humidity ·{' '}
                              {
                                hour.windSpeed
                              }{' '}
                              km/h · UV{' '}
                              {
                                hour.uvIndex
                              }
                            </Text>
                          </View>
                        </View>
                      )
                    )}
                </View>
              );
            }
          )}
        </View>

        {/* FOOTER */}

        <View
          style={
            styles.footer
          }
        >
          <View
            style={
              styles.footerSpectrum
            }
          >
            <View
              style={[
                styles.footerColor,
                {
                  backgroundColor:
                    '#78B4C8',
                },
              ]}
            />

            <View
              style={[
                styles.footerColor,
                {
                  backgroundColor:
                    '#E2BA4E',
                },
              ]}
            />

            <View
              style={[
                styles.footerColor,
                {
                  backgroundColor:
                    '#E48A69',
                },
              ]}
            />

            <View
              style={[
                styles.footerColor,
                {
                  backgroundColor:
                    '#7187A4',
                },
              ]}
            />
          </View>

          <Text
            style={
              styles.footerTitle
            }
          >
            DAYGLASS
          </Text>

          <Text
            style={
              styles.footerSubtitle
            }
          >
            WEATHER THAT UNDERSTANDS
            YOUR DAY
          </Text>

          <Text
            style={
              styles.footerUpdated
            }
          >
            {lastUpdated
              ? `LIVE · UPDATED ${lastUpdated.toLocaleTimeString(
                  'en-US',
                  {
                    hour:
                      'numeric',
                    minute:
                      '2-digit',
                  }
                )}`
              : 'LIVE WEATHER'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ========================================================================= */
/* SMALL COMPONENTS                                                          */
/* ========================================================================= */

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View
      style={
        styles.sectionHeader
      }
    >
      <Text
        style={
          styles.sectionLabel
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.sectionSubtitle
        }
      >
        {subtitle}
      </Text>
    </View>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={
        styles.metric
      }
    >
      <Text
        style={
          styles.metricLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.metricValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

function Pollutant({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View
      style={
        styles.pollutant
      }
    >
      <Text
        style={
          styles.pollutantLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.pollutantValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.pollutantUnit
        }
      >
        μg/m³
      </Text>
    </View>
  );
}

function AdviceRow({
  number,
  title,
  detail,
  status,
  color,
}: {
  number: string;
  title: string;
  detail: string;
  status: 'READY' | 'SKIP';
  color: string;
}) {
  const active =
    status === 'READY';

  return (
    <View
      style={
        styles.adviceRow
      }
    >
      <View
        style={[
          styles.adviceBar,
          {
            backgroundColor:
              color,
          },
        ]}
      />

      <Text
        style={
          styles.adviceNumber
        }
      >
        {number}
      </Text>

      <View
        style={
          styles.adviceMain
        }
      >
        <Text
          style={
            styles.adviceTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.adviceDetail
          }
        >
          {detail}
        </Text>
      </View>

      <View
        style={[
          styles.status,
          active && {
            backgroundColor:
              `${color}18`,
            borderColor:
              `${color}55`,
          },
        ]}
      >
        <Text
          style={[
            styles.statusText,
            active && {
              color,
            },
          ]}
        >
          {status}
        </Text>
      </View>
    </View>
  );
}

/* ========================================================================= */
/* STYLES                                                                    */
/* ========================================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 90,
  },

  weatherIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7F5',
  },

  loadingBrand: {
    marginTop: 2,
    marginBottom: 18,
    fontSize: 10,
    letterSpacing: 4,
    fontWeight: '700',
    color: '#50656D',
  },

  loadingLabel: {
    marginTop: 14,
    fontSize: 8,
    letterSpacing: 1.8,
    fontWeight: '700',
    color: '#75858B',
  },

  loadingBody: {
    marginTop: 7,
    fontSize: 12,
    color: '#9BA7AA',
  },

  errorScreen: {
    flex: 1,
    justifyContent: 'center',
    padding: 34,
    backgroundColor: '#F5F7F5',
  },

  errorLabel: {
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: '700',
    color: '#D57961',
  },

  errorTitle: {
    marginTop: 14,
    fontSize: 40,
    lineHeight: 43,
    fontWeight: '300',
    letterSpacing: -1.5,
    color: '#17252B',
  },

  errorBody: {
    marginTop: 17,
    maxWidth: 560,
    fontSize: 14,
    lineHeight: 23,
    color: '#687A81',
  },

  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CAD5D6',
    borderRadius: 22,
  },

  retryText: {
    fontSize: 8,
    letterSpacing: 1.5,
    fontWeight: '700',
    color: '#52666E',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 17,
  },

  eyebrow: {
    marginBottom: 7,
    fontSize: 8,
    letterSpacing: 2.7,
    fontWeight: '700',
    color: '#74858B',
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  location: {
    fontSize: 29,
    lineHeight: 33,
    fontWeight: '500',
    letterSpacing: -0.8,
    color: '#17252B',
  },

  locationMeta: {
    marginTop: 5,
    fontSize: 6,
    letterSpacing: 1.3,
    fontWeight: '700',
    color: '#9AA6AA',
  },

  dateBox: {
    alignItems: 'flex-end',
  },

  dateDay: {
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: '700',
    color: '#89969B',
  },

  dateNumber: {
    marginTop: 2,
    fontSize: 22,
    fontWeight: '500',
    color: '#30424A',
  },

  hero: {
    minHeight: 420,
    padding: 23,
    borderRadius: 29,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },

  heroGlow: {
    position: 'absolute',
    right: -90,
    top: -90,
    width: 235,
    height: 235,
    borderRadius: 118,
    opacity: 0.14,
  },

  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  heroInfo: {
    flex: 1,
  },

  temperature: {
    fontSize: 128,
    lineHeight: 126,
    fontWeight: '300',
    letterSpacing: -8,
    color: '#17252B',
  },

  condition: {
    marginTop: -3,
    fontSize: 19,
    fontWeight: '500',
  },

  feelsLike: {
    marginTop: 5,
    fontSize: 8,
    letterSpacing: 1.3,
    fontWeight: '700',
    color: '#8C999E',
  },

  heroMessage: {
    maxWidth: 610,
    marginTop: 22,
    fontSize: 17,
    lineHeight: 27,
    color: '#64777E',
  },

  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 28,
  },

  metric: {
    minWidth: 84,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F3F7F5',
  },

  metricLabel: {
    fontSize: 6,
    letterSpacing: 1.1,
    fontWeight: '700',
    color: '#96A2A6',
  },

  metricValue: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: '#40545C',
  },

  notice: {
    marginTop: 15,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#EDF3F1',
    borderWidth: 1,
    borderColor: '#D8E2E0',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  noticeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D9E8E7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  noticeIconText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#587A82',
  },

  noticeCopy: {
    flex: 1,
    marginLeft: 11,
  },

  noticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#30434A',
  },

  noticeDetail: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#75858B',
  },

  assistant: {
    marginTop: 15,
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#20353D',
    borderWidth: 1,
    borderColor: '#3E565E',
  },

  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  assistantIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  assistantCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#20353D',
  },

  assistantLabel: {
    marginLeft: 11,
    fontSize: 8,
    letterSpacing: 1.7,
    fontWeight: '700',
    color: '#E4ECEB',
  },

  assistantSub: {
    marginLeft: 11,
    marginTop: 3,
    fontSize: 6,
    letterSpacing: 1.1,
    color: '#82979D',
  },

  assistantTitle: {
    marginTop: 19,
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '500',
    color: '#F0F5F4',
  },

  assistantMessage: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 23,
    color: '#CAD7D6',
  },

  divider: {
    height: 1,
    marginVertical: 18,
    backgroundColor: '#3A5158',
  },

  nextLabel: {
    fontSize: 7,
    letterSpacing: 1.5,
    fontWeight: '700',
    color: '#82969B',
  },

  nextTitle: {
    marginTop: 5,
    fontSize: 15,
    fontWeight: '500',
    color: '#E4ECEB',
  },

  nextDetail: {
    marginTop: 4,
    fontSize: 12,
    color: '#91A5AA',
  },

  section: {
    paddingTop: 40,
  },

  sectionHeader: {
    marginBottom: 15,
  },

  sectionLabel: {
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: '700',
    color: '#74858B',
  },

  sectionSubtitle: {
    marginTop: 5,
    fontSize: 6,
    letterSpacing: 1.2,
    color: '#A0ACAF',
  },

  daylightTrack: {
    height: 20,
    justifyContent: 'center',
    position: 'relative',
  },

  daylightBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#D3DCDD',
  },

  daylightFill: {
    position: 'absolute',
    left: 0,
    height: 5,
    borderRadius: 3,
  },

  daylightMarker: {
    position: 'absolute',
    top: 5,
    width: 11,
    height: 11,
    marginLeft: -5,
    borderRadius: 6,
    backgroundColor: '#263A41',
  },

  daylightLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },

  smallMuted: {
    fontSize: 8,
    color: '#8D9A9E',
  },

  daylightState: {
    fontSize: 6,
    letterSpacing: 1.1,
    fontWeight: '700',
    color: '#A0AAAD',
  },

  adviceRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#D8E1E0',
  },

  adviceBar: {
    width: 4,
    height: 30,
    marginRight: 13,
    borderRadius: 2,
  },

  adviceNumber: {
    width: 34,
    fontSize: 8,
    letterSpacing: 1,
    color: '#9BA6AA',
  },

  adviceMain: {
    flex: 1,
    paddingRight: 9,
  },

  adviceTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2E4047',
  },

  adviceDetail: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: '#7A8A90',
  },

  status: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D3DCDD',
  },

  statusText: {
    fontSize: 7,
    letterSpacing: 1.3,
    fontWeight: '700',
    color: '#8D999D',
  },

  bestWindow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 28,
  },

  bestTimes: {
    minWidth: 103,
  },

  bestTime: {
    fontSize: 36,
    lineHeight: 37,
    fontWeight: '300',
    letterSpacing: -1.2,
    color: '#17252B',
  },

  bestTo: {
    marginVertical: 3,
    fontSize: 7,
    letterSpacing: 1.8,
    fontWeight: '700',
    color: '#99A5A9',
  },

  bestCopy: {
    flex: 1,
  },

  recommendedText: {
    fontSize: 7,
    letterSpacing: 1.5,
    fontWeight: '700',
    color: '#74858A',
  },

  bestTitle: {
    marginTop: 10,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '500',
    color: '#2D3F46',
  },

  body: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 21,
    color: '#6A7B82',
  },

  airCard: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: '#EDF3F1',
  },

  airTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  airNumber: {
    fontSize: 46,
    lineHeight: 48,
    fontWeight: '300',
    letterSpacing: -2,
    color: '#263940',
  },

  airSmall: {
    fontSize: 7,
    letterSpacing: 1.35,
    fontWeight: '700',
    color: '#87959A',
  },

  airCategory: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: '600',
  },

  pollutants: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 19,
  },

  pollutant: {
    flex: 1,
    padding: 10,
    borderRadius: 13,
    backgroundColor: '#F8FAF9',
  },

  pollutantLabel: {
    fontSize: 7,
    fontWeight: '700',
    color: '#78888E',
  },

  pollutantValue: {
    marginTop: 5,
    fontSize: 16,
    color: '#40545C',
  },

  pollutantUnit: {
    marginTop: 1,
    fontSize: 6,
    color: '#A0AAAD',
  },

  weekRow: {
    gap: 9,
    paddingRight: 14,
  },

  dayCard: {
    width: 132,
    minHeight: 184,
    padding: 14,
    borderRadius: 19,
    backgroundColor: '#EDF3F1',
    borderWidth: 1,
    borderColor: 'transparent',
  },

  dayCardActive: {
    backgroundColor: '#F4F7F5',
    borderColor: '#CBD8D6',
  },

  dayLabel: {
    fontSize: 8,
    letterSpacing: 1.3,
    fontWeight: '700',
    color: '#65777E',
  },

  dayDate: {
    marginTop: 4,
    fontSize: 8,
    color: '#9AA6AA',
  },

  dayCondition: {
    marginTop: 1,
    minHeight: 28,
    fontSize: 10,
    lineHeight: 14,
    color: '#66777E',
  },

  dayTempRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
    marginTop: 5,
  },

  dayHigh: {
    fontSize: 25,
    fontWeight: '300',
    color: '#273B43',
  },

  dayLow: {
    fontSize: 12,
    color: '#9BA6AA',
  },

  hourGroup: {
    marginBottom: 12,
  },

  hourHeader: {
    minHeight: 63,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 15,
    backgroundColor: '#EDF2F1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  hourDay: {
    fontSize: 10,
    letterSpacing: 1.3,
    fontWeight: '700',
    color: '#52666E',
  },

  hourDate: {
    marginTop: 3,
    fontSize: 8,
    color: '#98A5A9',
  },

  hourRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  hourCount: {
    fontSize: 7,
    letterSpacing: 1.1,
    fontWeight: '700',
    color: '#97A4A8',
  },

  expand: {
    fontSize: 18,
    fontWeight: '300',
    color: '#73858B',
  },

  hourRow: {
    minHeight: 73,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#DDE4E3',
  },

  hourTime: {
    width: 61,
  },

  hourNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#40545C',
  },

  hourPeriod: {
    marginTop: 2,
    fontSize: 7,
    letterSpacing: 1,
    color: '#98A4A8',
  },

  hourContent: {
    flex: 1,
    paddingLeft: 9,
  },

  hourTitle: {
    fontSize: 14,
    fontWeight: '600',
  },

  hourDetail: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 16,
    color: '#7A898E',
  },

  footer: {
    alignItems: 'center',
    marginTop: 58,
  },

  footerSpectrum: {
    width: 75,
    height: 4,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 3,
  },

  footerColor: {
    flex: 1,
    borderRadius: 2,
  },

  footerTitle: {
    fontSize: 10,
    letterSpacing: 3.2,
    fontWeight: '700',
    color: '#52656D',
  },

  footerSubtitle: {
    marginTop: 6,
    fontSize: 7,
    letterSpacing: 1.5,
    color: '#9AA6AA',
  },

  footerUpdated: {
    marginTop: 11,
    fontSize: 6,
    letterSpacing: 1.2,
    color: '#AEB8BA',
  },
});

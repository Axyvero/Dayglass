
import type {
  AirQuality,
  DailyWeather,
  HourlyWeather,
  WeatherCondition,
  WeatherData,
} from './weather';

import {
  enrichWeather,
  getAirQualityLabel,
} from './weather';

/* -------------------------------------------------------------------------- */
/* API TYPES                                                                  */
/* -------------------------------------------------------------------------- */

export type LiveWeather = WeatherData;

type WeatherResponse = {
  current: {
    time: string;

    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;

    precipitation: number;
    rain: number;
    showers: number;

    cloud_cover: number;

    wind_speed_10m: number;
    wind_gusts_10m: number;

    weather_code: number;
    is_day: number;
  };

  hourly: {
    time: string[];

    temperature_2m: number[];
    apparent_temperature: number[];
    relative_humidity_2m: number[];

    precipitation: number[];
    precipitation_probability: number[];

    rain: number[];
    showers: number[];

    cloud_cover: number[];

    wind_speed_10m: number[];
    wind_gusts_10m: number[];

    uv_index: number[];
    visibility: number[];

    weather_code: number[];
  };

  daily: {
    time: string[];

    temperature_2m_max: number[];
    temperature_2m_min: number[];
    apparent_temperature_max: number[];

    precipitation_sum: number[];
    precipitation_probability_max: number[];

    weather_code: number[];

    sunrise: string[];
    sunset: string[];
  };
};

type AirQualityResponse = {
  hourly?: {
    time?: string[];

    european_aqi?: number[];

    pm2_5?: number[];
    pm10?: number[];
    ozone?: number[];
    nitrogen_dioxide?: number[];
  };
};

/* -------------------------------------------------------------------------- */
/* CONDITION MAPPING                                                          */
/* -------------------------------------------------------------------------- */

/*
 * User-facing Dayglass vocabulary.
 *
 * Drizzle is simplified into Rain.
 * Thunderstorm codes are simplified into Heavy Rain.
 */
function conditionFromCode(
  code: number
): WeatherCondition {
  switch (code) {
    case 0:
      return 'Clear';

    case 1:
      return 'Mostly Clear';

    case 2:
      return 'Partly Cloudy';

    case 3:
      return 'Cloudy';

    case 45:
    case 48:
      return 'Fog';

    case 51:
      return 'Light Rain';

    case 53:
      return 'Rain';

    case 55:
      return 'Heavy Rain';

    case 56:
    case 57:
      return 'Freezing Rain';

    case 61:
      return 'Light Rain';

    case 63:
      return 'Rain';

    case 65:
      return 'Heavy Rain';

    case 66:
    case 67:
      return 'Freezing Rain';

    case 71:
      return 'Light Snow';

    case 73:
      return 'Snow';

    case 75:
      return 'Heavy Snow';

    case 77:
      return 'Snow Grains';

    case 80:
      return 'Light Rain';

    case 81:
      return 'Rain';

    case 82:
      return 'Heavy Rain';

    case 85:
      return 'Light Snow';

    case 86:
      return 'Heavy Snow';

    /*
     * Dayglass does not expose thunderstorm terminology.
     */
    case 95:
    case 96:
    case 99:
      return 'Heavy Rain';

    default:
      return 'Cloudy';
  }
}

/* -------------------------------------------------------------------------- */
/* BASIC HELPERS                                                              */
/* -------------------------------------------------------------------------- */

function roundOne(
  value: number
): number {
  return Math.round(
    value * 10
  ) / 10;
}

function average(
  values: number[]
): number {
  if (
    values.length === 0
  ) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) /
    values.length
  );
}

function formatTime(
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

  const period =
    hour >= 12
      ? 'PM'
      : 'AM';

  hour %= 12;

  if (hour === 0) {
    hour = 12;
  }

  return `${hour}:${minute} ${period}`;
}

function findCurrentIndex(
  times: string[],
  currentTime: string
): number {
  const key =
    currentTime.slice(
      0,
      13
    );

  const index =
    times.findIndex(
      time =>
        time.slice(
          0,
          13
        ) === key
    );

  return index >= 0
    ? index
    : 0;
}

/* -------------------------------------------------------------------------- */
/* DAILY AVERAGE SKY CALCULATION                                              */
/* -------------------------------------------------------------------------- */

/*
 * This is intentionally different from the API's daily weather_code.
 *
 * Open-Meteo's daily weather code can represent the strongest condition
 * occurring during a day. Dayglass instead wants the weather that best
 * represents the overall day.
 *
 * Priority:
 *
 * 1. Snow when snow is a meaningful part of the day.
 * 2. Rain when precipitation occupies a meaningful portion of the day.
 * 3. Otherwise determine the sky from average cloud cover.
 */

function calculateAverageDailyCondition(
  cloudCoverValues: number[],
  precipitationValues: number[],
  rainValues: number[],
  showerValues: number[],
  weatherCodes: number[]
): WeatherCondition {
  if (cloudCoverValues.length === 0) {
    return 'Cloudy';
  }

  const totalHours =
    cloudCoverValues.length;

  /*
   * ------------------------------------------------------------------------
   * 1. Count the actual dominant weather category from hourly data.
   * ------------------------------------------------------------------------
   */

  let clearHours = 0;
  let mostlyClearHours = 0;
  let cloudyHours = 0;
  let partlyCloudyHours = 0;
  let mostlyCloudyHours = 0;

  let rainHours = 0;
  let snowHours = 0;

  weatherCodes.forEach(
    code => {
      if (code === 0) {
        clearHours++;
        return;
      }

      if (code === 1) {
        mostlyClearHours++;
        return;
      }

      if (code === 2) {
        partlyCloudyHours++;
        return;
      }

      if (code === 3) {
        cloudyHours++;
        return;
      }

      if (code === 45 || code === 48) {
        mostlyCloudyHours++;
        return;
      }

      /*
       * Rain / drizzle / showers.
       *
       * These are counted as rain events, but they will only
       * become the daily summary when they dominate the day.
       */
      if (
        code === 51 ||
        code === 53 ||
        code === 55 ||
        code === 56 ||
        code === 57 ||
        code === 61 ||
        code === 63 ||
        code === 65 ||
        code === 66 ||
        code === 67 ||
        code === 80 ||
        code === 81 ||
        code === 82
      ) {
        rainHours++;
        return;
      }

      /*
       * Snow.
       */
      if (
        code === 71 ||
        code === 73 ||
        code === 75 ||
        code === 77 ||
        code === 85 ||
        code === 86
      ) {
        snowHours++;
        return;
      }

      /*
       * Thunderstorm codes are intentionally treated as rain.
       */
      if (
        code === 95 ||
        code === 96 ||
        code === 99
      ) {
        rainHours++;
      }
    }
  );

  /*
   * ------------------------------------------------------------------------
   * 2. Snow only wins when it genuinely dominates the day.
   * ------------------------------------------------------------------------
   */

  const snowRatio =
    snowHours /
    totalHours;

  if (snowRatio >= 0.50) {
    return 'Snow';
  }

  if (snowRatio >= 0.25) {
    return 'Light Snow';
  }

  /*
   * ------------------------------------------------------------------------
   * 3. Rain only wins when it genuinely dominates the day.
   *
   * This is the important part.
   *
   * A day with 90% rain probability but only 2–4 actual rain hours
   * should remain Cloudy / Mostly Cloudy rather than becoming Rain.
   * ------------------------------------------------------------------------
   */

  const rainRatio =
    rainHours /
    totalHours;

  const totalActualPrecipitation =
    precipitationValues.reduce(
      (
        sum,
        value
      ) =>
        sum +
        Math.max(
          0,
          value
        ),
      0
    );

  const actualWetHours =
    precipitationValues.filter(
      value =>
        value >= 0.2
    ).length;

  const actualWetRatio =
    actualWetHours /
    totalHours;

  const averagePrecipitation =
    totalActualPrecipitation /
    totalHours;

  /*
   * Only use Rain as the daily summary when rain is
   * persistent enough to define the day.
   */
  if (
    rainRatio >= 0.55 &&
    actualWetRatio >= 0.40 &&
    averagePrecipitation >= 0.20
  ) {
    return 'Rain';
  }

  /*
   * Heavy Rain is intentionally difficult to trigger.
   * It should describe a genuinely rainy day, not a
   * high-probability forecast.
   */
  if (
    rainRatio >= 0.75 &&
    actualWetRatio >= 0.60 &&
    totalActualPrecipitation >= 8
  ) {
    return 'Heavy Rain';
  }

  /*
   * ------------------------------------------------------------------------
   * 4. Otherwise calculate the overall sky.
   *
   * Cloud cover is now the main signal.
   * ------------------------------------------------------------------------
   */

  const averageCloud =
    cloudCoverValues.reduce(
      (
        sum,
        value
      ) =>
        sum + value,
      0
    ) /
    totalHours;

  /*
   * If rain happened for a few hours but the sky was otherwise
   * cloudy, keep the visual summary as cloudy.
   */

  if (averageCloud < 15) {
    return 'Clear';
  }

  if (averageCloud < 35) {
    return 'Mostly Clear';
  }

  if (averageCloud < 55) {
    return 'Partly Cloudy';
  }

  if (averageCloud < 75) {
    return 'Cloudy';
  }

  return 'Mostly Cloudy';
}

/* -------------------------------------------------------------------------- */
/* AIR QUALITY                                                                */
/* -------------------------------------------------------------------------- */

async function getAirQuality(
  latitude: number,
  longitude: number,
  currentHourKey: string
): Promise<
  AirQuality | null
> {
  const url =
    'https://air-quality-api.open-meteo.com/v1/air-quality' +
    `?latitude=${encodeURIComponent(
      latitude
    )}` +
    `&longitude=${encodeURIComponent(
      longitude
    )}` +
    '&hourly=' +
    [
      'european_aqi',
      'pm2_5',
      'pm10',
      'ozone',
      'nitrogen_dioxide',
    ].join(',') +
    '&forecast_days=2' +
    '&timezone=auto';

  try {
    const response =
      await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data =
      (await response.json()) as AirQualityResponse;

    const times =
      data.hourly?.time ?? [];

    let index =
      times.findIndex(
        time =>
          time.slice(
            0,
            13
          ) === currentHourKey
      );

    if (index < 0) {
      index = 0;
    }

    const aqi =
      data.hourly
        ?.european_aqi?.[
        index
      ];

    if (
      typeof aqi !==
      'number'
    ) {
      return null;
    }

    return {
      europeanAQI:
        Math.round(aqi),

      pm25:
        Math.round(
          data.hourly
            ?.pm2_5?.[
            index
          ] ?? 0
        ),

      pm10:
        Math.round(
          data.hourly
            ?.pm10?.[
            index
          ] ?? 0
        ),

      ozone:
        Math.round(
          data.hourly
            ?.ozone?.[
            index
          ] ?? 0
        ),

      nitrogenDioxide:
        Math.round(
          data.hourly
            ?.nitrogen_dioxide?.[
            index
          ] ?? 0
        ),

      category:
        getAirQualityLabel(
          aqi
        ),
    };
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* LIVE WEATHER                                                               */
/* -------------------------------------------------------------------------- */

export async function getLiveWeather(
  latitude: number,
  longitude: number
): Promise<LiveWeather> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${encodeURIComponent(
      latitude
    )}` +
    `&longitude=${encodeURIComponent(
      longitude
    )}` +
    '&current=' +
    [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',

      'precipitation',
      'rain',
      'showers',

      'cloud_cover',

      'wind_speed_10m',
      'wind_gusts_10m',

      'weather_code',
      'is_day',
    ].join(',') +
    '&hourly=' +
    [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',

      'precipitation',
      'precipitation_probability',

      'rain',
      'showers',

      'cloud_cover',

      'wind_speed_10m',
      'wind_gusts_10m',

      'uv_index',
      'visibility',

      'weather_code',
    ].join(',') +
    '&daily=' +
    [
      'temperature_2m_max',
      'temperature_2m_min',
      'apparent_temperature_max',

      'precipitation_sum',
      'precipitation_probability_max',

      'weather_code',

      'sunrise',
      'sunset',
    ].join(',') +
    '&forecast_days=7' +
    '&timezone=auto';

  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Weather request failed (${response.status}).`
    );
  }

  const data =
    (await response.json()) as WeatherResponse;

  if (
    !data.current ||
    !data.hourly ||
    !data.daily
  ) {
    throw new Error(
      'The weather service returned incomplete data.'
    );
  }

  if (
    !data.current.time ||
    !data.daily.sunrise?.[0] ||
    !data.daily.sunset?.[0]
  ) {
    throw new Error(
      'The weather service returned invalid time data.'
    );
  }

  const currentIndex =
    findCurrentIndex(
      data.hourly.time,
      data.current.time
    );

  const currentHourKey =
    data.current.time.slice(
      0,
      13
    );

  /* ------------------------------------------------------------------------ */
  /* HOURLY DATA                                                              */
  /* ------------------------------------------------------------------------ */

  const hourly: HourlyWeather[] =
    data.hourly.time
      .slice(
        currentIndex
      )
      .map(
        (
          time,
          offset
        ) => {
          const index =
            currentIndex +
            offset;

          return {
            time,

            temperature:
              Math.round(
                data.hourly
                  .temperature_2m[
                  index
                ] ?? 0
              ),

            feelsLike:
              Math.round(
                data.hourly
                  .apparent_temperature[
                  index
                ] ?? 0
              ),

            humidity:
              Math.round(
                data.hourly
                  .relative_humidity_2m[
                  index
                ] ?? 0
              ),

            condition:
              conditionFromCode(
                data.hourly
                  .weather_code[
                  index
                ]
              ),

            rainChance:
              Math.round(
                data.hourly
                  .precipitation_probability[
                  index
                ] ?? 0
              ),

            precipitation:
              roundOne(
                data.hourly
                  .precipitation[
                  index
                ] ?? 0
              ),

            rain:
              roundOne(
                data.hourly
                  .rain[
                  index
                ] ?? 0
              ),

            showers:
              roundOne(
                data.hourly
                  .showers[
                  index
                ] ?? 0
              ),

            cloudCover:
              Math.round(
                data.hourly
                  .cloud_cover[
                  index
                ] ?? 0
              ),

            windSpeed:
              Math.round(
                data.hourly
                  .wind_speed_10m[
                  index
                ] ?? 0
              ),

            windGust:
              Math.round(
                data.hourly
                  .wind_gusts_10m[
                  index
                ] ?? 0
              ),

            uvIndex:
              roundOne(
                data.hourly
                  .uv_index[
                  index
                ] ?? 0
              ),

            visibility:
              Math.round(
                data.hourly
                  .visibility[
                  index
                ] ?? 0
              ),
          };
        }
      );

  /* ------------------------------------------------------------------------ */
  /* DAILY DATA                                                               */
  /* ------------------------------------------------------------------------ */

  const daily: DailyWeather[] =
    data.daily.time.map(
      (
        date,
        dayIndex
      ) => {
        const dayHours: number[] = [];
        const dayPrecipitation: number[] = [];
        const dayRain: number[] = [];
        const dayShowers: number[] = [];
        const dayCodes: number[] = [];

        for (
          let i = 0;
          i <
          data.hourly.time.length;
          i++
        ) {
          if (
            data.hourly.time[i].slice(
              0,
              10
            ) !== date
          ) {
            continue;
          }

          dayHours.push(
            data.hourly
              .cloud_cover[
              i
            ] ?? 0
          );

          dayPrecipitation.push(
            data.hourly
              .precipitation[
              i
            ] ?? 0
          );

          dayRain.push(
            data.hourly
              .rain[
              i
            ] ?? 0
          );

          dayShowers.push(
            data.hourly
              .showers[
              i
            ] ?? 0
          );

          dayCodes.push(
            data.hourly
              .weather_code[
              i
            ] ?? 0
          );
        }

        const averageCondition =
          calculateAverageDailyCondition(
            dayHours,
            dayPrecipitation,
            dayRain,
            dayShowers,
            dayCodes
          );

        return {
          date,

          temperatureMax:
            Math.round(
              data.daily
                .temperature_2m_max[
                dayIndex
              ] ?? 0
            ),

          temperatureMin:
            Math.round(
              data.daily
                .temperature_2m_min[
                dayIndex
              ] ?? 0
            ),

          feelsLikeMax:
            Math.round(
              data.daily
                .apparent_temperature_max[
                dayIndex
              ] ?? 0
            ),

          rainChance:
            Math.round(
              data.daily
                .precipitation_probability_max[
                dayIndex
              ] ?? 0
            ),

          precipitation:
            roundOne(
              data.daily
                .precipitation_sum[
                dayIndex
              ] ?? 0
            ),

          condition:
            averageCondition,

          sunrise:
            formatTime(
              data.daily
                .sunrise[
                dayIndex
              ]
            ),

          sunset:
            formatTime(
              data.daily
                .sunset[
                dayIndex
              ]
            ),
        };
      }
    );

  const sunriseRaw =
    data.daily.sunrise[0];

  const sunsetRaw =
    data.daily.sunset[0];

  const rainChance =
    Math.round(
      data.hourly
        .precipitation_probability[
        currentIndex
      ] ?? 0
    );

  const airQuality =
    await getAirQuality(
      latitude,
      longitude,
      currentHourKey
    );

  const baseWeather: Omit<
    WeatherData,
    'currentState'
  > = {
    location:
      'Current location',

    temperature:
      Math.round(
        data.current
          .temperature_2m
      ),

    feelsLike:
      Math.round(
        data.current
          .apparent_temperature
      ),

    humidity:
      Math.round(
        data.current
          .relative_humidity_2m
      ),

    /*
     * Used internally for assistant logic.
     * The UI doesn't display a percentage here.
     */
    rainChance,

    precipitation:
      roundOne(
        data.current
          .precipitation
      ),

    rain:
      roundOne(
        data.current
          .rain
      ),

    showers:
      roundOne(
        data.current
          .showers
      ),

    cloudCover:
      Math.round(
        data.current
          .cloud_cover
      ),

    windSpeed:
      Math.round(
        data.current
          .wind_speed_10m
      ),

    windGust:
      Math.round(
        data.current
          .wind_gusts_10m
      ),

    uvIndex:
      roundOne(
        data.hourly
          .uv_index[
          currentIndex
        ] ?? 0
      ),

    visibility:
      Math.round(
        data.hourly
          .visibility[
          currentIndex
        ] ?? 0
      ),

    condition:
      conditionFromCode(
        data.current
          .weather_code
      ),

    currentTime:
      data.current.time,

    isDay:
      data.current.is_day ===
      1,

    sunrise:
      formatTime(
        sunriseRaw
      ),

    sunset:
      formatTime(
        sunsetRaw
      ),

    sunriseRaw,
    sunsetRaw,

    hourly,
    daily,

    airQuality,
  };

  return enrichWeather(
    baseWeather
  );
}

/* -------------------------------------------------------------------------- */
/* LOCATION                                                                   */
/* -------------------------------------------------------------------------- */

export async function getLocationName(
  latitude: number,
  longitude: number
): Promise<string> {
  const url =
    'https://nominatim.openstreetmap.org/reverse' +
    '?format=jsonv2' +
    `&lat=${encodeURIComponent(
      latitude
    )}` +
    `&lon=${encodeURIComponent(
      longitude
    )}` +
    '&zoom=18' +
    '&addressdetails=1' +
    '&accept-language=en';

  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Location lookup failed (${response.status}).`
    );
  }

  const data =
    await response.json();

  const address =
    data?.address ?? {};

  const neighborhood =
    address.neighbourhood ||
    address.suburb ||
    address.quarter ||
    address.village;

  const city =
    address.city ||
    address.town ||
    address.municipality ||
    address.district;

  if (
    neighborhood &&
    city &&
    neighborhood !== city
  ) {
    return `${neighborhood}, ${city}`;
  }

  return (
    city ||
    neighborhood ||
    'Current location'
  );
}

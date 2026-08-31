
export type WeatherCondition =
  | 'Clear'
  | 'Mostly Clear'
  | 'Cloudy'
  | 'Partly Cloudy'
  | 'Mostly Cloudy'
  | 'Fog'
  | 'Light Rain'
  | 'Rain'
  | 'Heavy Rain'
  | 'Freezing Rain'
  | 'Light Snow'
  | 'Snow'
  | 'Heavy Snow'
  | 'Snow Grains';

export type CurrentWeatherState =
  | 'CLEAR'
  | 'CLOUDY'
  | 'RAINING'
  | 'SNOWING'
  | 'FOGGY';

export type HourlyWeather = {
  time: string;
  temperature: number;
  feelsLike: number;
  humidity: number;

  condition: WeatherCondition;

  rainChance: number;
  precipitation: number;
  rain: number;
  showers: number;
  cloudCover: number;

  windSpeed: number;
  windGust: number;

  uvIndex: number;
  visibility: number;
};

export type DailyWeather = {
  date: string;

  temperatureMax: number;
  temperatureMin: number;
  feelsLikeMax: number;

  rainChance: number;
  precipitation: number;

  condition: WeatherCondition;

  sunrise: string;
  sunset: string;
};

export type AirQuality = {
  europeanAQI: number;
  pm25: number;
  pm10: number;
  ozone: number;
  nitrogenDioxide: number;
  category: string;
};

export type WeatherData = {
  location: string;

  temperature: number;
  feelsLike: number;
  humidity: number;

  /*
   * Kept internally for guidance.
   * The UI does not display a rain percentage.
   */
  rainChance: number;

  precipitation: number;
  rain: number;
  showers: number;
  cloudCover: number;

  windSpeed: number;
  windGust: number;

  uvIndex: number;
  visibility: number;

  condition: WeatherCondition;
  currentState: CurrentWeatherState;

  currentTime: string;
  isDay: boolean;

  sunrise: string;
  sunset: string;

  sunriseRaw: string;
  sunsetRaw: string;

  hourly: HourlyWeather[];
  daily: DailyWeather[];

  airQuality: AirQuality | null;
};

export type WeatherAdvice = {
  assistantTitle: string;
  assistantMessage: string;

  nextChange: {
    title: string;
    detail: string;
  };

  weatherNotice: {
    title: string;
    detail: string;
  };

  water: {
    status: 'READY' | 'SKIP';
    detail: string;
  };

  umbrella: {
    status: 'READY' | 'SKIP';
    detail: string;
  };

  sunscreen: {
    status: 'READY' | 'SKIP';
    detail: string;
  };

  clothing: {
    title: string;
    detail: string;
  };

  air: {
    title: string;
    detail: string;
  };

  bestWindow: {
    start: string;
    end: string;
    score: number;
    reason: string;
  };
};

export function isRainCondition(
  condition: WeatherCondition
): boolean {
  return (
    condition === 'Light Rain' ||
    condition === 'Rain' ||
    condition === 'Heavy Rain' ||
    condition === 'Freezing Rain'
  );
}

export function isSnowCondition(
  condition: WeatherCondition
): boolean {
  return (
    condition === 'Light Snow' ||
    condition === 'Snow' ||
    condition === 'Heavy Snow' ||
    condition === 'Snow Grains'
  );
}

export function isCloudyCondition(
  condition: WeatherCondition
): boolean {
  return (
    condition === 'Cloudy' ||
    condition === 'Partly Cloudy' ||
    condition === 'Mostly Cloudy' ||
    condition === 'Fog'
  );
}

export function getAirQualityLabel(
  aqi: number
): string {
  if (aqi <= 20) {
    return 'Excellent';
  }

  if (aqi <= 40) {
    return 'Good';
  }

  if (aqi <= 60) {
    return 'Moderate';
  }

  if (aqi <= 80) {
    return 'Poor';
  }

  if (aqi <= 100) {
    return 'Very Poor';
  }

  return 'Extremely Poor';
}

function parseHour(
  value: string
): number {
  const match = value.match(
    /T(\d{2}):/
  );

  return match
    ? Number(match[1])
    : -1;
}

function formatTime(
  value: string
): string {
  const match = value.match(
    /T(\d{2}):(\d{2})/
  );

  if (!match) {
    return value;
  }

  let hour = Number(match[1]);
  const minute = match[2];

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

function isPrecipitationActive(
  weather: Omit<
    WeatherData,
    'currentState'
  >
): boolean {
  return (
    weather.precipitation >= 0.1 ||
    weather.rain >= 0.1 ||
    weather.showers >= 0.1
  );
}

function calculateCurrentState(
  weather: Omit<
    WeatherData,
    'currentState'
  >
): CurrentWeatherState {
  if (
    isSnowCondition(
      weather.condition
    )
  ) {
    return 'SNOWING';
  }

  if (
    weather.visibility > 0 &&
    weather.visibility < 1000
  ) {
    return 'FOGGY';
  }

  if (
    isPrecipitationActive(
      weather
    ) &&
    isRainCondition(
      weather.condition
    )
  ) {
    return 'RAINING';
  }

  if (
    isRainCondition(
      weather.condition
    )
  ) {
    return 'RAINING';
  }

  if (
    weather.cloudCover >= 55 ||
    isCloudyCondition(
      weather.condition
    )
  ) {
    return 'CLOUDY';
  }

  return 'CLEAR';
}

function waterAdvice(
  weather: WeatherData
): WeatherAdvice['water'] {
  const ready =
    weather.temperature >= 25 ||
    weather.feelsLike >= 28 ||
    weather.humidity >= 70 ||
    weather.uvIndex >= 5;

  return {
    status: ready
      ? 'READY'
      : 'SKIP',

    detail: ready
      ? weather.humidity >= 80
        ? 'Worth taking — warm and humid conditions.'
        : 'Worth taking with you.'
      : 'Not especially important right now.',
  };
}

function umbrellaAdvice(
  weather: WeatherData
): WeatherAdvice['umbrella'] {
  const active =
    isPrecipitationActive(
      weather
    );

  const likely =
    weather.rainChance >= 35;

  const ready =
    active ||
    likely ||
    isRainCondition(
      weather.condition
    );

  return {
    status: ready
      ? 'READY'
      : 'SKIP',

    detail: active
      ? 'Useful now — precipitation is being detected.'
      : likely
        ? 'Worth taking — rain may develop.'
        : 'Rain does not look likely right now.',
  };
}

function sunscreenAdvice(
  weather: WeatherData
): WeatherAdvice['sunscreen'] {
  const ready =
    weather.isDay &&
    weather.uvIndex >= 3;

  return {
    status: ready
      ? 'READY'
      : 'SKIP',

    detail: ready
      ? weather.uvIndex >= 8
        ? `Very high UV · index ${weather.uvIndex}`
        : `UV index ${weather.uvIndex}`
      : 'UV is currently low.',
  };
}

function clothingAdvice(
  weather: WeatherData
): WeatherAdvice['clothing'] {
  if (
    weather.temperature >= 32 ||
    weather.feelsLike >= 35
  ) {
    return {
      title: 'Stay cool',
      detail:
        'Light, breathable clothing will feel more comfortable.',
    };
  }

  if (
    weather.temperature <= 16
  ) {
    return {
      title: 'Add a layer',
      detail:
        'Cooler conditions make a warm layer useful.',
    };
  }

  if (
    isRainCondition(
      weather.condition
    )
  ) {
    return {
      title: 'Rain-ready',
      detail:
        'Practical clothing will be more comfortable if rain develops.',
    };
  }

  if (
    weather.humidity >= 80 &&
    weather.temperature >= 28
  ) {
    return {
      title: 'Keep it light',
      detail:
        'Warm, humid air may feel sticky outdoors.',
    };
  }

  return {
    title: 'Comfortable layers',
    detail:
      'Normal everyday clothing should work well.',
  };
}

function airAdvice(
  weather: WeatherData
): WeatherAdvice['air'] {
  if (
    !weather.airQuality
  ) {
    return {
      title: 'Air quality unavailable',
      detail:
        'The air-quality service did not return a current reading.',
    };
  }

  if (
    weather.airQuality.europeanAQI <= 40
  ) {
    return {
      title: 'Air looks good.',
      detail:
        'Current air conditions look comfortable for most outdoor activity.',
    };
  }

  if (
    weather.airQuality.europeanAQI <= 60
  ) {
    return {
      title: 'Air is moderate.',
      detail:
        'Most people can continue normal activity.',
    };
  }

  return {
    title:
      'Air quality needs attention.',
    detail:
      'Consider reducing prolonged outdoor exposure if conditions remain poor.',
  };
}

function assistantAdvice(
  weather: WeatherData
): {
  title: string;
  message: string;
} {
  if (
    weather.currentState ===
    'RAINING'
  ) {
    return {
      title:
        'Rain is falling now.',
      message:
        'Take an umbrella and give yourself extra time outside.',
    };
  }

  if (
    weather.currentState ===
    'SNOWING'
  ) {
    return {
      title:
        'Snow is affecting conditions.',
      message:
        'Allow extra travel time and dress for colder conditions.',
    };
  }

  if (
    weather.currentState ===
    'FOGGY'
  ) {
    return {
      title:
        'Visibility is reduced.',
      message:
        'Take extra care outdoors and allow more time for travel.',
    };
  }

  if (
    weather.feelsLike >= 35 ||
    weather.temperature >= 32
  ) {
    return {
      title:
        'It is hot right now.',
      message:
        'Drink some water, look for shade and use sun protection if you are outside.',
    };
  }

  if (
    weather.isDay &&
    weather.uvIndex >= 8
  ) {
    return {
      title:
        'UV is very high.',
      message:
        'Sun protection is a good idea before spending time outside.',
    };
  }

  if (
    weather.humidity >= 85 &&
    weather.temperature >= 28
  ) {
    return {
      title:
        'The air feels very humid.',
      message:
        'Drink water and expect it to feel warmer than the thermometer suggests.',
    };
  }

  if (
    weather.rainChance >= 70
  ) {
    return {
      title:
        'Rain may arrive later.',
      message:
        'It can stay dry right now even though rain is likely later. Keep an umbrella nearby.',
    };
  }

  if (
    weather.rainChance >= 40
  ) {
    return {
      title:
        'Rain is possible later.',
      message:
        'The sky may change, so an umbrella is a sensible backup.',
    };
  }

  if (
    weather.isDay &&
    weather.uvIndex >= 5
  ) {
    return {
      title:
        'Sun protection is useful.',
      message:
        'UV is elevated right now, so protect yourself if you will be outside.',
    };
  }

  if (
    weather.temperature >= 29
  ) {
    return {
      title:
        'The day is warming up.',
      message:
        'Earlier or later outdoor plans should feel more comfortable.',
    };
  }

  return {
    title:
      'Conditions look manageable.',
    message:
      'The weather is fairly comfortable right now for normal outdoor plans.',
  };
}

function weatherNotice(
  weather: WeatherData
): WeatherAdvice['weatherNotice'] {
  if (
    isPrecipitationActive(
      weather
    )
  ) {
    return {
      title:
        'Rain is happening now.',
      detail:
        'Precipitation is currently being detected at your location.',
    };
  }

  if (
    weather.rainChance >= 70
  ) {
    return {
      title:
        'It might rain later.',
      detail:
        'The current conditions can remain cloudy or dry even when rain is expected later.',
    };
  }

  if (
    weather.rainChance >= 40
  ) {
    return {
      title:
        'Rain is possible later.',
      detail:
        'Conditions may change, so an umbrella can be useful if you are heading out.',
    };
  }

  return {
    title:
      'No significant rain signal right now.',
    detail:
      'The current forecast does not strongly suggest rain nearby.',
  };
}

function nextChange(
  weather: WeatherData
): WeatherAdvice['nextChange'] {
  const first =
    weather.hourly[0];

  if (!first) {
    return {
      title:
        'No major change detected.',
      detail:
        'There is not enough hourly forecast data yet.',
    };
  }

  for (
    let i = 1;
    i <
    Math.min(
      weather.hourly.length,
      18
    );
    i++
  ) {
    const next =
      weather.hourly[i];

    const rainDifference =
      next.rainChance -
      first.rainChance;

    const temperatureDifference =
      next.temperature -
      first.temperature;

    const cloudDifference =
      next.cloudCover -
      first.cloudCover;

    if (
      Math.abs(
        rainDifference
      ) >= 30
    ) {
      return {
        title:
          rainDifference > 0
            ? 'Rain becomes more likely.'
            : 'Rain becomes less likely.',
        detail:
          `${formatTime(next.time)} · conditions may change`,
      };
    }

    if (
      Math.abs(
        temperatureDifference
      ) >= 4
    ) {
      return {
        title:
          temperatureDifference > 0
            ? 'The temperature is climbing.'
            : 'The temperature is easing.',
        detail:
          `${formatTime(next.time)} · ${next.temperature}°`,
      };
    }

    if (
      Math.abs(
        cloudDifference
      ) >= 35
    ) {
      return {
        title:
          cloudDifference > 0
            ? 'Cloud cover is increasing.'
            : 'The sky is clearing.',
        detail:
          `${formatTime(next.time)} · ${next.cloudCover}% cloud cover`,
      };
    }

    if (
      next.condition !==
      first.condition
    ) {
      return {
        title:
          `Conditions change around ${formatTime(next.time)}.`,
        detail:
          `${first.condition} → ${next.condition}`,
      };
    }
  }

  return {
    title:
      'No major change soon.',
    detail:
      'Conditions look relatively steady over the next few hours.',
  };
}

function comfortPenalty(
  feelsLike: number
): number {
  if (
    feelsLike >= 21 &&
    feelsLike <= 29
  ) {
    return 0;
  }

  if (
    feelsLike > 29
  ) {
    return (
      feelsLike - 29
    ) * 4;
  }

  return (
    21 - feelsLike
  ) * 2;
}

function calculateBestWindow(
  weather: WeatherData
): WeatherAdvice['bestWindow'] {
  const today =
    weather.currentTime.slice(
      0,
      10
    );

  const todayHours =
    weather.hourly.filter(
      item =>
        item.time.slice(
          0,
          10
        ) === today &&
        item.time >=
          weather.currentTime
    );

  let bestScore =
    Number.POSITIVE_INFINITY;

  let bestStart = '';
  let bestEnd = '';

  for (
    let i = 0;
    i <
    todayHours.length - 1;
    i++
  ) {
    const first =
      todayHours[i];

    const second =
      todayHours[i + 1];

    const startHour =
      parseHour(first.time);

    const endHour =
      parseHour(second.time);

    if (
      startHour < 7 ||
      endHour > 19
    ) {
      continue;
    }

    const temperature =
      (
        first.temperature +
        second.temperature
      ) / 2;

    const feelsLike =
      (
        first.feelsLike +
        second.feelsLike
      ) / 2;

    const rain =
      (
        first.rainChance +
        second.rainChance
      ) / 2;

    const precipitation =
      (
        first.precipitation +
        second.precipitation
      ) / 2;

    const humidity =
      (
        first.humidity +
        second.humidity
      ) / 2;

    const wind =
      (
        first.windSpeed +
        second.windSpeed
      ) / 2;

    const gust =
      (
        first.windGust +
        second.windGust
      ) / 2;

    const uv =
      (
        first.uvIndex +
        second.uvIndex
      ) / 2;

    const wet =
      isRainCondition(
        first.condition
      ) ||
      isRainCondition(
        second.condition
      );

    let score = 0;

    score += rain * 2.8;
    score += precipitation * 25;
    score += comfortPenalty(
      feelsLike
    );

    if (
      humidity > 80
    ) {
      score +=
        (
          humidity - 80
        ) * 0.8;
    }

    if (
      wind > 20
    ) {
      score +=
        (
          wind - 20
        ) * 2;
    }

    if (
      gust > 30
    ) {
      score +=
        (
          gust - 30
        ) * 2;
    }

    if (
      uv >= 8
    ) {
      score += 12;
    } else if (
      uv >= 6
    ) {
      score += 5;
    }

    if (
      wet
    ) {
      score += 40;
    }

    if (
      temperature >= 22 &&
      temperature <= 29 &&
      feelsLike >= 22 &&
      feelsLike <= 30
    ) {
      score -= 8;
    }

    if (
      score < bestScore
    ) {
      bestScore =
        score;

      bestStart =
        first.time;

      bestEnd =
        second.time;
    }
  }

  if (
    !bestStart ||
    !bestEnd
  ) {
    return {
      start:
        'No good',
      end:
        'window',
      score:
        Number.POSITIVE_INFINITY,
      reason:
        'There is no clearly comfortable daylight window remaining today.',
    };
  }

  let reason =
    'This is the best remaining daylight window based on temperature, rain, humidity, wind and UV.';

  if (
    weather.rainChance >= 60
  ) {
    reason =
      'Rain is a concern today, so this is the strongest remaining daylight window.';
  } else if (
    weather.feelsLike >= 32
  ) {
    reason =
      'This window avoids the strongest heat while keeping conditions more comfortable.';
  }

  return {
    start:
      formatTime(bestStart),
    end:
      formatTime(bestEnd),
    score:
      Math.round(
        bestScore * 10
      ) / 10,
    reason,
  };
}

export function enrichWeather(
  weather: Omit<
    WeatherData,
    'currentState'
  >
): WeatherData {
  return {
    ...weather,
    currentState:
      calculateCurrentState(
        weather
      ),
  };
}

export function getWeatherAdvice(
  weather: WeatherData
): WeatherAdvice {
  const assistant =
    assistantAdvice(
      weather
    );

  return {
    assistantTitle:
      assistant.title,

    assistantMessage:
      assistant.message,

    nextChange:
      nextChange(
        weather
      ),

    weatherNotice:
      weatherNotice(
        weather
      ),

    water:
      waterAdvice(
        weather
      ),

    umbrella:
      umbrellaAdvice(
        weather
      ),

    sunscreen:
      sunscreenAdvice(
        weather
      ),

    clothing:
      clothingAdvice(
        weather
      ),

    air:
      airAdvice(
        weather
      ),

    bestWindow:
      calculateBestWindow(
        weather
      ),
  };
}

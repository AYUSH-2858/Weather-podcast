const WEATHER_CODES = {
  0: { label: "Clear sky", icon: "☀️", theme: "clear" },
  1: { label: "Mainly clear", icon: "🌤️", theme: "clear" },
  2: { label: "Partly cloudy", icon: "⛅", theme: "clouds" },
  3: { label: "Overcast", icon: "☁️", theme: "clouds" },
  45: { label: "Fog", icon: "🌫️", theme: "clouds" },
  48: { label: "Rime fog", icon: "🌫️", theme: "clouds" },
  51: { label: "Light drizzle", icon: "🌦️", theme: "rain" },
  53: { label: "Drizzle", icon: "🌦️", theme: "rain" },
  55: { label: "Dense drizzle", icon: "🌧️", theme: "rain" },
  61: { label: "Light rain", icon: "🌦️", theme: "rain" },
  63: { label: "Rainy", icon: "🌧️", theme: "rain" },
  65: { label: "Heavy rain", icon: "🌧️", theme: "rain" },
  66: { label: "Freezing rain", icon: "🌨️", theme: "rain" },
  67: { label: "Heavy freezing rain", icon: "🌨️", theme: "rain" },
  71: { label: "Light snow", icon: "❄️", theme: "clouds" },
  73: { label: "Snow", icon: "❄️", theme: "clouds" },
  75: { label: "Heavy snow", icon: "❄️", theme: "clouds" },
  77: { label: "Snow grains", icon: "❄️", theme: "clouds" },
  80: { label: "Rain showers", icon: "🌦️", theme: "rain" },
  81: { label: "Rain showers", icon: "🌧️", theme: "rain" },
  82: { label: "Heavy showers", icon: "⛈️", theme: "rain" },
  85: { label: "Snow showers", icon: "🌨️", theme: "clouds" },
  86: { label: "Heavy snow showers", icon: "🌨️", theme: "clouds" },
  95: { label: "Thunderstorm", icon: "⛈️", theme: "rain" },
  96: { label: "Thunderstorm & hail", icon: "⛈️", theme: "rain" },
  99: { label: "Strong thunderstorm", icon: "⛈️", theme: "rain" },
};

const DEFAULT_CITY = {
  name: "New York",
  country: "USA",
  latitude: 40.7128,
  longitude: -74.006,
};

const state = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  theme: localStorage.getItem("weather-theme") || "light",
  favorites: JSON.parse(localStorage.getItem("weather-favorites") || "[]"),
  currentPlace: null,
  chartData: [],
  clockInterval: null,
};

const elements = {
  body: document.body,
  searchForm: document.getElementById("searchForm"),
  cityInput: document.getElementById("cityInput"),
  suggestions: document.getElementById("citySuggestions"),
  voiceBtn: document.getElementById("voiceBtn"),
  locateBtn: document.getElementById("locateBtn"),
  themeBtn: document.getElementById("themeBtn"),
  favoritesList: document.getElementById("favoritesList"),
  statusText: document.getElementById("statusText"),
  locationName: document.getElementById("locationName"),
  dateTime: document.getElementById("dateTime"),
  currentIcon: document.getElementById("currentIcon"),
  conditionText: document.getElementById("conditionText"),
  feelsLikeText: document.getElementById("feelsLikeText"),
  currentTemp: document.getElementById("currentTemp"),
  humidityValue: document.getElementById("humidityValue"),
  windValue: document.getElementById("windValue"),
  minMaxValue: document.getElementById("minMaxValue"),
  uvValue: document.getElementById("uvValue"),
  rainChanceValue: document.getElementById("rainChanceValue"),
  trendValue: document.getElementById("trendValue"),
  alertList: document.getElementById("alertList"),
  insightText: document.getElementById("insightText"),
  hourlyForecast: document.getElementById("hourlyForecast"),
  weeklyForecast: document.getElementById("weeklyForecast"),
  weatherMap: document.getElementById("weatherMap"),
  trendChart: document.getElementById("trendChart"),
  saveFavoriteBtn: document.getElementById("saveFavoriteBtn"),
};

init();

function init() {
  applyTheme();
  renderFavorites();
  attachEventListeners();
  startClock();
  loadStartupWeather();
}

function attachEventListeners() {
  elements.searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = elements.cityInput.value.trim();

    if (!query) {
      setStatus("Type a city name to search.", true);
      return;
    }
const cleanQuery = query.split(",")[0];  // 👈 fix
await searchCity(cleanQuery);
  });

  let suggestionTimer;
  elements.cityInput.addEventListener("input", () => {
    const query = elements.cityInput.value.trim();
    clearTimeout(suggestionTimer);

    suggestionTimer = setTimeout(() => {
      if (query.length >= 2) {
        fetchSuggestions(query);
      }
    }, 280);
  });

  elements.themeBtn.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("weather-theme", state.theme);
    applyTheme();
  });

  elements.locateBtn.addEventListener("click", async () => {
    await loadByGeolocation(false);
  });

  elements.voiceBtn.addEventListener("click", startVoiceSearch);
  elements.saveFavoriteBtn.addEventListener("click", toggleFavoriteCity);
  window.addEventListener("resize", () => drawTrendChart(state.chartData));
}

async function loadStartupWeather() {
  const loaded = await loadByGeolocation(true);

  if (!loaded) {
    await fetchWeatherForPlace(DEFAULT_CITY);
  }
}

async function loadByGeolocation(silent) {
  if (!navigator.geolocation) {
    if (!silent) {
      setStatus("Geolocation is not supported in this browser.", true);
    }
    return false;
  }

  setStatus("Getting your current location...");

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    });

    const { latitude, longitude } = position.coords;
    const place = await reverseGeocode(latitude, longitude);

    await fetchWeatherForPlace({
      name: place.name || "Current location",
      country: place.country || "",
      admin1: place.admin1 || "",
      latitude,
      longitude,
    });

    return true;
  } catch (error) {
    if (!silent) {
      setStatus("Location access was denied, so the default city was loaded.", true);
    }
    return false;
  }
}

async function searchCity(query) {
  setStatus(`Searching for ${query}...`);

  try {
    const data = await fetchJSON(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`
    );

    if (!data.results || !data.results.length) {
      throw new Error("City not found");
    }

    await fetchWeatherForPlace(data.results[0]);
  } catch (error) {
    setStatus(error.message || "Could not find that city.", true);
  }
}

async function fetchSuggestions(query) {
  try {
    const data = await fetchJSON(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
    );

    const options = (data.results || [])
      .map((place) => {
        const label = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
        return `<option value="${escapeHTML(label)}"></option>`;
      })
      .join("");

    elements.suggestions.innerHTML = options;
  } catch {
    elements.suggestions.innerHTML = "";
  }
}

async function reverseGeocode(latitude, longitude) {
  try {
    const data = await fetchJSON(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&format=json`
    );

    return data.results?.[0] || {};
  } catch {
    return {};
  }
}

async function fetchWeatherForPlace(place) {
  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);
  const label = [place.name, place.admin1, place.country].filter(Boolean).join(", ");

  state.currentPlace = {
    name: place.name || "Selected city",
    label: label || "Selected city",
    latitude,
    longitude,
    country: place.country || "",
    admin1: place.admin1 || "",
  };

  setStatus(`Loading weather for ${state.currentPlace.label}...`);

  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day",
      hourly: "temperature_2m,weather_code,precipitation_probability,uv_index",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: "auto",
      forecast_days: "7",
      temperature_unit: "celsius",
      wind_speed_unit: "kmh",
    });

    const data = await fetchJSON(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);

    state.timezone = data.timezone || state.timezone;
    renderWeatherDashboard(data, state.currentPlace);
    updateFavoriteButton();
    startClock();
    setStatus(`Updated ${state.currentPlace.label}. Live forecast is ready.`);
  } catch (error) {
    setStatus(error.message || "Unable to load weather data right now.", true);
  }
}

function renderWeatherDashboard(data, place) {
  const weatherInfo = getWeatherInfo(data.current.weather_code, data.current.is_day);
  const nextHours = getNext24Hours(data.hourly, data.current.time);
  const maxRain = Math.max(...nextHours.map((hour) => hour.rainChance), 0);
  const currentUv = getCurrentUv(data.hourly, data.current.time);
  const trend = computeTrend(nextHours);

  elements.locationName.textContent = place.label;
  elements.currentIcon.textContent = weatherInfo.icon;
  elements.conditionText.textContent = weatherInfo.label;
  elements.currentTemp.textContent = `${Math.round(data.current.temperature_2m)}°`;
  elements.feelsLikeText.textContent = `Feels like ${Math.round(data.current.apparent_temperature)}°`;
  elements.humidityValue.textContent = `${Math.round(data.current.relative_humidity_2m)}%`;
  elements.windValue.textContent = `${Math.round(data.current.wind_speed_10m)} km/h`;
  elements.minMaxValue.textContent = `${Math.round(data.daily.temperature_2m_min[0])}° / ${Math.round(data.daily.temperature_2m_max[0])}°`;
  elements.uvValue.textContent = formatUv(currentUv);
  elements.rainChanceValue.textContent = `${Math.round(maxRain)}%`;
  elements.trendValue.textContent = trend.label;
  elements.body.dataset.weather = weatherInfo.theme;

  renderHourly(nextHours);
  renderWeekly(data.daily);
  renderAlerts(data.current, nextHours, weatherInfo);
  renderInsight(data, nextHours, weatherInfo);
  renderMap(place.latitude, place.longitude);

  state.chartData = nextHours;
  drawTrendChart(nextHours);
}

function renderHourly(hours) {
  elements.hourlyForecast.innerHTML = hours
    .map((hour) => {
      const weatherInfo = getWeatherInfo(hour.code, 1);
      return `
        <article class="hour-card">
          <p>${formatHour(hour.time)}</p>
          <div class="hour-icon">${weatherInfo.icon}</div>
          <p><strong>${Math.round(hour.temp)}°</strong></p>
          <p>${Math.round(hour.rainChance)}% rain</p>
        </article>
      `;
    })
    .join("");
}

function renderWeekly(daily) {
  elements.weeklyForecast.innerHTML = daily.time
    .slice(0, 7)
    .map((date, index) => {
      const weatherInfo = getWeatherInfo(daily.weather_code[index], 1);
      return `
        <article class="week-row">
          <strong>${formatDay(date)}</strong>
          <span class="week-icon">${weatherInfo.icon}</span>
          <span>${Math.round(daily.temperature_2m_min[index])}° / ${Math.round(daily.temperature_2m_max[index])}°</span>
          <span class="week-rain">🌧️ ${Math.round(daily.precipitation_probability_max[index] || 0)}%</span>
        </article>
      `;
    })
    .join("");
}

function renderAlerts(current, nextHours, weatherInfo) {
  const alerts = [];
  const highRain = Math.max(...nextHours.map((hour) => hour.rainChance), 0);

  if (highRain >= 65) {
    alerts.push(`Rain alert: up to ${Math.round(highRain)}% chance of showers in the next 24 hours.`);
  }

  if (current.wind_speed_10m >= 30) {
    alerts.push(`Wind alert: breezy conditions near ${Math.round(current.wind_speed_10m)} km/h.`);
  }

  if ([95, 96, 99].includes(current.weather_code)) {
    alerts.push("Storm alert: thunderstorm conditions are active in this area.");
  }

  if (weatherInfo.theme === "clear" && current.is_day === 1) {
    alerts.push("Sun alert: bright conditions expected, so carry sunscreen and hydrate.");
  }

  if (!alerts.length) {
    alerts.push("Everything looks stable for now—no major weather concerns in the forecast.");
  }

  elements.alertList.innerHTML = alerts
    .map(
      (item) => `
        <article class="alert-item">${item}</article>
      `
    )
    .join("");
}

function renderInsight(data, nextHours, weatherInfo) {
  const trend = computeTrend(nextHours);
  const warmest = Math.max(...nextHours.map((hour) => hour.temp));
  const coolest = Math.min(...nextHours.map((hour) => hour.temp));
  const rainyHours = nextHours.filter((hour) => hour.rainChance >= 50).length;

  let message = `${weatherInfo.label} is currently dominating in ${state.currentPlace?.name || "your location"}. `;

  if (trend.direction === "up") {
    message += `Temperatures are trending upward and could reach about ${Math.round(warmest)}° later today. `;
  } else if (trend.direction === "down") {
    message += `A cooler swing is likely, dropping toward ${Math.round(coolest)}° through the coming hours. `;
  } else {
    message += `Temperatures should stay fairly steady through the day. `;
  }

  if (rainyHours >= 4) {
    message += `Expect several rainy time blocks, so keeping an umbrella nearby would be smart.`;
  } else {
    message += `Rain risk stays limited for most of the forecast window.`;
  }

  elements.insightText.textContent = message;
}

function renderMap(latitude, longitude) {
  const src = `https://embed.windy.com/embed2.html?lat=${latitude}&lon=${longitude}&zoom=5&level=surface&overlay=rain&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=true&type=map&location=coordinates&metricWind=km/h&metricTemp=%C2%B0C`;
  elements.weatherMap.src = src;
}

function drawTrendChart(hours) {
  if (!elements.trendChart || !hours?.length) {
    return;
  }

  const canvas = elements.trendChart;
  const ctx = canvas.getContext("2d");
  const width = canvas.clientWidth || 600;
  const height = 220;
  const ratio = window.devicePixelRatio || 1;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const temps = hours.map((item) => item.temp);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const padding = 26;

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;

  for (let i = 0; i < 4; i += 1) {
    const y = padding + ((height - padding * 2) / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  ctx.beginPath();
  hours.forEach((item, index) => {
    const x = padding + (index / Math.max(hours.length - 1, 1)) * (width - padding * 2);
    const y = padding + ((max - item.temp) / Math.max(max - min || 1, 1)) * (height - padding * 2);

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 3;
  ctx.stroke();

  hours.forEach((item, index) => {
    if (index % 4 !== 0 && index !== hours.length - 1) {
      return;
    }

    const x = padding + (index / Math.max(hours.length - 1, 1)) * (width - padding * 2);
    const y = padding + ((max - item.temp) / Math.max(max - min || 1, 1)) * (height - padding * 2);

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "12px Inter";
    ctx.fillText(`${Math.round(item.temp)}°`, x - 10, y - 10);
    ctx.fillText(formatHour(item.time), x - 14, height - 10);
  });
}

function toggleFavoriteCity() {
  if (!state.currentPlace) {
    return;
  }

  const existingIndex = state.favorites.findIndex(
    (city) => city.label === state.currentPlace.label
  );

  if (existingIndex >= 0) {
    state.favorites.splice(existingIndex, 1);
    setStatus(`${state.currentPlace.name} removed from favorites.`);
  } else {
    state.favorites.unshift(state.currentPlace);
    state.favorites = state.favorites.slice(0, 6);
    setStatus(`${state.currentPlace.name} saved to favorites.`);
  }

  localStorage.setItem("weather-favorites", JSON.stringify(state.favorites));
  renderFavorites();
  updateFavoriteButton();
}

function renderFavorites() {
  if (!state.favorites.length) {
    elements.favoritesList.innerHTML = '<span class="favorite-chip">No favorites yet</span>';
    return;
  }

  elements.favoritesList.innerHTML = state.favorites
    .map(
      (city) => `
        <button class="favorite-chip" type="button" data-lat="${city.latitude}" data-lon="${city.longitude}" data-name="${escapeHTML(city.name)}" data-label="${escapeHTML(city.label)}" data-country="${escapeHTML(city.country || "")}" data-admin="${escapeHTML(city.admin1 || "")}">
          ⭐ ${escapeHTML(city.name)}
        </button>
      `
    )
    .join("");

  elements.favoritesList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      fetchWeatherForPlace({
        name: button.dataset.name,
        label: button.dataset.label,
        country: button.dataset.country,
        admin1: button.dataset.admin,
        latitude: Number(button.dataset.lat),
        longitude: Number(button.dataset.lon),
      });
    });
  });
}

function updateFavoriteButton() {
  const isSaved = state.favorites.some((city) => city.label === state.currentPlace?.label);
  elements.saveFavoriteBtn.textContent = isSaved ? "✅ Saved" : "⭐ Save city";
}

function startVoiceSearch() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setStatus("Voice search is not supported in this browser.", true);
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.start();
  setStatus("Listening... say a city name.");

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    elements.cityInput.value = transcript;
    await searchCity(transcript);
  };

  recognition.onerror = () => {
    setStatus("Voice search could not capture a city this time.", true);
  };
}

function getNext24Hours(hourly, currentTime) {
  const startIndex = Math.max(hourly.time.indexOf(currentTime), 0);

  return hourly.time.slice(startIndex, startIndex + 24).map((time, index) => ({
    time,
    temp: hourly.temperature_2m[startIndex + index],
    code: hourly.weather_code[startIndex + index],
    rainChance: hourly.precipitation_probability[startIndex + index] || 0,
    uv: hourly.uv_index[startIndex + index] || 0,
  }));
}

function getCurrentUv(hourly, currentTime) {
  const index = Math.max(hourly.time.indexOf(currentTime), 0);
  return hourly.uv_index[index] || 0;
}

function getWeatherInfo(code, isDay) {
  const info = WEATHER_CODES[code] || { label: "Weather", icon: "🌤️", theme: "clouds" };

  if (isDay === 0 && info.theme === "clear") {
    return { ...info, icon: "🌙", theme: "night" };
  }

  return info;
}

function computeTrend(hours) {
  if (!hours.length) {
    return { label: "Stable", direction: "flat" };
  }

  const first = hours[0].temp;
  const last = hours[Math.min(hours.length - 1, 7)].temp;
  const diff = last - first;

  if (diff >= 2) {
    return { label: "Rising ↑", direction: "up" };
  }

  if (diff <= -2) {
    return { label: "Cooling ↓", direction: "down" };
  }

  return { label: "Stable →", direction: "flat" };
}

function formatUv(value) {
  const uv = Number(value || 0).toFixed(1);

  if (value >= 8) {
    return `${uv} High`;
  }

  if (value >= 4) {
    return `${uv} Moderate`;
  }

  return `${uv} Low`;
}

function applyTheme() {
  elements.body.dataset.mode = state.theme;
  elements.themeBtn.textContent = state.theme === "dark" ? "☀️" : "🌙";
}

function startClock() {
  clearInterval(state.clockInterval);
  updateClock();
  state.clockInterval = setInterval(updateClock, 60000);
}

function updateClock() {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: state.timezone,
    });

    elements.dateTime.textContent = formatter.format(new Date());
  } catch {
    elements.dateTime.textContent = new Date().toLocaleString();
  }
}

function formatHour(value) {
  const timePart = value.split("T")[1] || "00:00";
  const [hourString] = timePart.split(":");
  const hour = Number(hourString);
  const suffix = hour >= 12 ? "PM" : "AM";
  const standardHour = hour % 12 || 12;
  return `${standardHour} ${suffix}`;
}

function formatDay(value) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
    new Date(`${value}T12:00:00`)
  );
}

function setStatus(message, isError = false) {
  elements.statusText.textContent = message;
  elements.statusText.style.color = isError ? "#fecaca" : "var(--muted)";
}

async function fetchJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

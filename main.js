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
  71: { label: "Light snow", icon: "❄️", theme: "snow" },
  73: { label: "Snow", icon: "❄️", theme: "snow" },
  75: { label: "Heavy snow", icon: "❄️", theme: "snow" },
  77: { label: "Snow grains", icon: "❄️", theme: "snow" },
  80: { label: "Rain showers", icon: "🌦️", theme: "rain" },
  81: { label: "Rain showers", icon: "🌧️", theme: "rain" },
  82: { label: "Heavy showers", icon: "⛈️", theme: "rain" },
  85: { label: "Snow showers", icon: "🌨️", theme: "snow" },
  86: { label: "Heavy snow showers", icon: "🌨️", theme: "snow" },
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

const API_ORIGINS = buildApiOrigins();

const state = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  theme: localStorage.getItem("weather-theme") || "light",
  favorites: JSON.parse(localStorage.getItem("weather-favorites") || "[]"),
  recentSearches: JSON.parse(localStorage.getItem("weather-recent") || "[]"),
  currentPlace: null,
  chartData: [],
  lastWeatherData: null,
  clockInterval: null,
  mapZoom: 5,
  mapOverlay: "rain",
  suggestionResults: [],
  model: localStorage.getItem("weather-model") || "linear",
  lastAlertSignature: "",
  popupTimer: null,
  notificationPermissionRequested: false,
};

const elements = {
  body: document.body,
  searchForm: document.getElementById("searchForm"),
  searchPanel: document.querySelector(".search-panel"),
  cityInput: document.getElementById("cityInput"),
  suggestionsDropdown: document.getElementById("suggestionsDropdown"),
  didYouMean: document.getElementById("didYouMean"),
  recentSearches: document.getElementById("recentSearches"),
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
  predictionList: document.getElementById("predictionList"),
  modelSelect: document.getElementById("modelSelect"),
  hourlyForecast: document.getElementById("hourlyForecast"),
  weeklyForecast: document.getElementById("weeklyForecast"),
  weatherMap: document.getElementById("weatherMap"),
  trendChart: document.getElementById("trendChart"),
  humidityChart: document.getElementById("humidityChart"),
  rainChart: document.getElementById("rainChart"),
  zoomInBtn: document.getElementById("zoomInBtn"),
  zoomOutBtn: document.getElementById("zoomOutBtn"),
  rainLayerBtn: document.getElementById("rainLayerBtn"),
  windLayerBtn: document.getElementById("windLayerBtn"),
  mapZoomLabel: document.getElementById("mapZoomLabel"),
  saveFavoriteBtn: document.getElementById("saveFavoriteBtn"),
  notificationPopup: document.getElementById("notificationPopup"),
};

init();

function init() {
  applyTheme();
  if (elements.modelSelect) {
    elements.modelSelect.value = state.model;
  }
  renderFavorites();
  renderRecentSearches();
  attachEventListeners();
  startClock();
  loadStartupWeather();
}

function attachEventListeners() {
  elements.searchForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = elements.cityInput?.value.trim();

    if (!query) {
      setStatus("Type a city name to search.", true);
      return;
    }

    hideSuggestions();
    await searchCity(query);
  });

  let suggestionTimer;
  elements.cityInput?.addEventListener("input", () => {
    const query = elements.cityInput.value.trim();
    clearTimeout(suggestionTimer);

    suggestionTimer = setTimeout(() => {
      if (query.length >= 2) {
        fetchSuggestions(query);
      } else {
        showRecentSuggestions();
      }
    }, 220);
  });

  elements.cityInput?.addEventListener("focus", () => {
    const query = elements.cityInput.value.trim();
    if (query.length >= 2) {
      fetchSuggestions(query);
    } else {
      showRecentSuggestions();
    }
  });

  document.addEventListener("click", (event) => {
    if (!elements.searchPanel?.contains(event.target)) {
      hideSuggestions();
    }
  });

  elements.didYouMean?.addEventListener("click", async () => {
    const suggestion = elements.didYouMean.dataset.suggested;
    if (suggestion && elements.cityInput) {
      elements.cityInput.value = suggestion;
      await searchCity(suggestion);
    }
  });

  elements.themeBtn?.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("weather-theme", state.theme);
    applyTheme();
  });

  elements.locateBtn?.addEventListener("click", async () => {
    await loadByGeolocation(false);
  });

  elements.voiceBtn?.addEventListener("click", startVoiceSearch);
  elements.saveFavoriteBtn?.addEventListener("click", toggleFavoriteCity);

  elements.modelSelect?.addEventListener("change", () => {
    state.model = elements.modelSelect.value;
    localStorage.setItem("weather-model", state.model);

    if (state.lastWeatherData && state.currentPlace) {
      renderWeatherDashboard(state.lastWeatherData, state.currentPlace);
    }
  });

  elements.zoomInBtn?.addEventListener("click", () => updateMapZoom(1));
  elements.zoomOutBtn?.addEventListener("click", () => updateMapZoom(-1));
  elements.rainLayerBtn?.addEventListener("click", () => updateMapOverlay("rain"));
  elements.windLayerBtn?.addEventListener("click", () => updateMapOverlay("wind"));

  window.addEventListener("resize", () => drawAllCharts(state.chartData));
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

    await fetchWeatherForPlace(
      normalizePlace({
        name: place.name || "Current location",
        country: place.country || "",
        admin1: place.admin1 || "",
        latitude,
        longitude,
      })
    );

    return true;
  } catch {
    if (!silent) {
      setStatus("Location access was denied, so the default city was loaded.", true);
    }
    return false;
  }
}

async function searchCity(query) {
  const cleanQuery = query.split(",")[0].trim();
  setStatus(`Searching for ${cleanQuery}...`);

  try {
    const data = await fetchJSON(`/api/search/?q=${encodeURIComponent(cleanQuery)}`);

    const results = (data.results || []).map(normalizePlace);

    if (!results.length) {
      throw new Error("City not found");
    }

    renderSuggestionDropdown(results);
    showDidYouMean(cleanQuery, results[0]);
    await usePlace(results[0]);
  } catch (error) {
    setStatus(error.message || "Could not find that city.", true);
  }
}

async function fetchSuggestions(query) {
  try {
    const data = await fetchJSON(`/api/search/?q=${encodeURIComponent(query)}`);

    const results = (data.results || []).map(normalizePlace);
    renderSuggestionDropdown(results);
  } catch {
    hideSuggestions();
  }
}

function renderSuggestionDropdown(results) {
  state.suggestionResults = results;
  elements.searchPanel?.classList.add("has-open-dropdown");

  if (!results.length) {
    elements.suggestionsDropdown.innerHTML = '<div class="suggestion-item"><span>No matches found</span></div>';
    elements.suggestionsDropdown.classList.remove("hidden");
    return;
  }

  elements.suggestionsDropdown.innerHTML = results
    .map(
      (place, index) => `
        <button class="suggestion-item" type="button" data-index="${index}">
          <span>
            <strong>${escapeHTML(place.name)}</strong><br />
            <small>${escapeHTML([place.admin1, place.country].filter(Boolean).join(", "))}</small>
          </span>
          <span>📍</span>
        </button>
      `
    )
    .join("");

  elements.suggestionsDropdown.classList.remove("hidden");

  elements.suggestionsDropdown.querySelectorAll("button[data-index]").forEach((button) => {
    button.addEventListener("click", async () => {
      const selected = state.suggestionResults[Number(button.dataset.index)];
      await usePlace(selected);
    });
  });
}

function showRecentSuggestions() {
  if (!state.recentSearches.length) {
    hideSuggestions();
    return;
  }

  renderSuggestionDropdown(state.recentSearches.slice(0, 5));
}

function hideSuggestions() {
  elements.suggestionsDropdown.classList.add("hidden");
  elements.searchPanel?.classList.remove("has-open-dropdown");
}

function showDidYouMean(query, place) {
  if (!place) {
    elements.didYouMean.classList.add("hidden");
    return;
  }

  const suggestedLabel = place.label;
  const normalizedQuery = normalizeText(query);
  const normalizedName = normalizeText(place.name);

  if (!normalizedQuery || normalizedQuery === normalizedName || normalizedName.startsWith(normalizedQuery)) {
    elements.didYouMean.classList.add("hidden");
    return;
  }

  elements.didYouMean.textContent = `🌍 Did you mean: ${suggestedLabel}?`;
  elements.didYouMean.dataset.suggested = suggestedLabel;
  elements.didYouMean.classList.remove("hidden");
}

async function usePlace(place) {
  const normalizedPlace = normalizePlace(place);
  elements.cityInput.value = normalizedPlace.label;
  addRecentSearch(normalizedPlace);
  hideSuggestions();
  await fetchWeatherForPlace(normalizedPlace);
}

async function reverseGeocode(latitude, longitude) {
  try {
    const data = await fetchJSON(`/api/reverse/?latitude=${latitude}&longitude=${longitude}`);

    return data.results?.[0] || {};
  } catch {
    return {};
  }
}

async function fetchWeatherForPlace(place) {
  const normalizedPlace = normalizePlace(place);
  const latitude = Number(normalizedPlace.latitude);
  const longitude = Number(normalizedPlace.longitude);

  state.currentPlace = normalizedPlace;
  setStatus(`Loading weather for ${state.currentPlace.label}...`);

  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
    });

    const data = await fetchJSON(`/api/weather/?${params.toString()}`);

    state.timezone = data.timezone || state.timezone;
    state.lastWeatherData = data;
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
  const alerts = renderAlerts(data.current, nextHours, weatherInfo);
  const predictions = predictNextHours(nextHours, state.model);

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
  renderInsight(nextHours, weatherInfo, alerts, predictions);
  renderPredictionList(predictions);
  renderMap(place.latitude, place.longitude);

  state.chartData = nextHours;
  drawAllCharts(nextHours);
}

function renderHourly(hours) {
  elements.hourlyForecast.innerHTML = hours
    .slice(0, 24)
    .map((hour) => {
      const weatherInfo = getWeatherInfo(hour.code, 1);
      return `
        <article class="hour-card">
          <p>${formatHour(hour.time)}</p>
          <div class="hour-icon">${weatherInfo.icon}</div>
          <p><strong>${Math.round(hour.temp)}°</strong></p>
          <p class="hour-meta">💧 ${Math.round(hour.humidity)}%</p>
          <p class="hour-meta">🌧️ ${Math.round(hour.rainChance)}%</p>
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
  const rainSoon = Math.max(...nextHours.slice(0, 2).map((hour) => hour.rainChance), 0);
  const highRain = Math.max(...nextHours.map((hour) => hour.rainChance), 0);
  const hottest = Math.max(current.temperature_2m, ...nextHours.slice(0, 8).map((hour) => hour.temp));

  if (rainSoon >= 70) {
    alerts.push({ type: "rain", text: `Heavy rain in next 2 hours (${Math.round(rainSoon)}% probability).` });
  } else if (highRain >= 55) {
    alerts.push({ type: "rain", text: `Rain probability may climb to ${Math.round(highRain)}% later today.` });
  }

  if (hottest >= 36) {
    alerts.push({ type: "heat", text: `Heatwave warning: temperature may touch ${Math.round(hottest)}°.` });
  }

  if (current.wind_speed_10m >= 32) {
    alerts.push({ type: "wind", text: `Wind layer shows gusty conditions near ${Math.round(current.wind_speed_10m)} km/h.` });
  }

  if ([95, 96, 99].includes(current.weather_code)) {
    alerts.push({ type: "wind", text: "Thunderstorm risk is active nearby." });
  }

  if (!alerts.length) {
    const stableNote = weatherInfo.theme === "clear"
      ? "Forecast looks stable and bright for the next few hours."
      : "No major short-term warnings right now.";
    alerts.push({ type: "info", text: stableNote });
  }

  elements.alertList.innerHTML = alerts
    .map(
      (item) => `
        <article class="alert-item ${item.type}">${item.text}</article>
      `
    )
    .join("");

  const urgentAlert = alerts.find((item) => item.type !== "info");
  if (urgentAlert && urgentAlert.text !== state.lastAlertSignature) {
    state.lastAlertSignature = urgentAlert.text;
    showNotification(urgentAlert.text, urgentAlert.type);
  }

  return alerts;
}

function renderInsight(nextHours, weatherInfo, alerts, predictions) {
  const trend = computeTrend(nextHours);
  const modelLabel = state.model === "forest" ? "Random Forest" : "Linear Regression";
  const predictionAverage = Math.round(
    predictions.reduce((total, item) => total + item.temp, 0) / Math.max(predictions.length, 1)
  );
  const peakRain = Math.max(...predictions.map((item) => item.rain), 0);

  let message = `${weatherInfo.label} is active in ${state.currentPlace?.name || "your location"}. `;

  if (trend.direction === "up") {
    message += `Temperatures are rising, and the next 5 hours may average around ${predictionAverage}°. `;
  } else if (trend.direction === "down") {
    message += `A cooler slide is forming, with the next 5 hours hovering near ${predictionAverage}°. `;
  } else {
    message += `Conditions look steady, with the next 5 hours staying close to ${predictionAverage}°. `;
  }

  message += `${modelLabel} keeps rain risk near ${Math.round(peakRain)}% at peak. `;

  if (alerts[0]) {
    message += `Top alert: ${alerts[0].text}`;
  }

  elements.insightText.textContent = message;
}

function renderPredictionList(predictions) {
  const modelLabel = state.model === "forest" ? "Random Forest" : "Linear Regression";

  elements.predictionList.innerHTML = predictions
    .map(
      (item) => `
        <article class="prediction-card">
          <span class="section-tag">${item.label}</span>
          <strong>${Math.round(item.temp)}°</strong>
          <div class="prediction-meta">🌧️ ${Math.round(item.rain)}% • 💧 ${Math.round(item.humidity)}%</div>
          <div class="prediction-meta">${modelLabel}</div>
        </article>
      `
    )
    .join("");
}

function renderMap(latitude, longitude) {
  const overlay = state.mapOverlay === "wind" ? "wind" : "rain";
  const src = `https://embed.windy.com/embed2.html?lat=${latitude}&lon=${longitude}&zoom=${state.mapZoom}&level=surface&overlay=${overlay}&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=true&type=map&location=coordinates&metricWind=km/h&metricTemp=%C2%B0C`;
  elements.weatherMap.src = src;
  elements.mapZoomLabel.textContent = `Zoom ${state.mapZoom}`;
  elements.rainLayerBtn.classList.toggle("active", overlay === "rain");
  elements.windLayerBtn.classList.toggle("active", overlay === "wind");
}

function updateMapZoom(step) {
  state.mapZoom = clamp(state.mapZoom + step, 3, 11);
  if (state.currentPlace) {
    renderMap(state.currentPlace.latitude, state.currentPlace.longitude);
  }
}

function updateMapOverlay(overlay) {
  state.mapOverlay = overlay;
  if (state.currentPlace) {
    renderMap(state.currentPlace.latitude, state.currentPlace.longitude);
  }
}

function drawAllCharts(hours) {
  if (!hours?.length) {
    return;
  }

  const sample = hours.slice(0, 12);
  const labels = sample.map((item) => formatHour(item.time));

  drawLineChart(elements.trendChart, sample.map((item) => item.temp), labels, {
    color: "#facc15",
    fill: "rgba(250, 204, 21, 0.18)",
    unit: "°",
  });

  drawLineChart(elements.humidityChart, sample.map((item) => item.humidity), labels, {
    color: "#38bdf8",
    fill: "rgba(56, 189, 248, 0.18)",
    unit: "%",
    minValue: 0,
    maxValue: 100,
  });

  drawLineChart(elements.rainChart, sample.map((item) => item.rainChance), labels, {
    color: "#a78bfa",
    fill: "rgba(167, 139, 250, 0.18)",
    unit: "%",
    minValue: 0,
    maxValue: 100,
  });
}

function drawLineChart(canvas, values, labels, options) {
  if (!canvas || !values.length) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const width = canvas.clientWidth || 600;
  const height = 220;
  const ratio = window.devicePixelRatio || 1;
  const padding = 28;
  const minValue = Number.isFinite(options.minValue) ? options.minValue : Math.min(...values) - 2;
  const maxValue = Number.isFinite(options.maxValue) ? options.maxValue : Math.max(...values) + 2;
  const range = Math.max(maxValue - minValue, 1);

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = padding + ((height - padding * 2) / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
  gradient.addColorStop(0, options.fill);
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  ctx.beginPath();
  values.forEach((value, index) => {
    const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
    const y = padding + ((maxValue - value) / range) * (height - padding * 2);

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.strokeStyle = options.color;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.lineTo(width - padding, height - padding);
  ctx.lineTo(padding, height - padding);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  values.forEach((value, index) => {
    if (![0, 4, 8, values.length - 1].includes(index)) {
      return;
    }

    const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
    const y = padding + ((maxValue - value) / range) * (height - padding * 2);

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "12px Inter";
    ctx.fillText(`${Math.round(value)}${options.unit}`, x - 12, y - 10);
    ctx.fillText(labels[index], x - 14, height - 10);
  });
}

function predictNextHours(hours, model) {
  const source = hours.slice(0, Math.min(hours.length, 8));
  const predictionCount = 5;

  if (!source.length) {
    return [];
  }

  const temps = source.map((hour) => hour.temp);
  const humidity = source.map((hour) => hour.humidity);
  const rain = source.map((hour) => hour.rainChance);

  if (model === "forest") {
    return Array.from({ length: predictionCount }, (_, index) => {
      const lag = Math.max(source.length - 3, 0);
      const avgTemp = average(temps.slice(lag));
      const avgHumidity = average(humidity.slice(lag));
      const avgRain = average(rain.slice(lag));
      const trendBoost = (temps.at(-1) - temps[0]) * ((index + 1) / (source.length + 1));

      return {
        label: `+${index + 1}h`,
        temp: avgTemp * 0.65 + temps.at(-1) * 0.25 + trendBoost * 0.4,
        humidity: clamp(avgHumidity * 0.7 + humidity.at(-1) * 0.3, 0, 100),
        rain: clamp(avgRain * 0.6 + Math.max(...rain) * 0.25 + (rain[index] || 0) * 0.15, 0, 100),
      };
    });
  }

  const tempModel = buildLinearModel(temps);
  const humidityModel = buildLinearModel(humidity);
  const rainModel = buildLinearModel(rain);

  return Array.from({ length: predictionCount }, (_, index) => {
    const x = source.length + index;
    return {
      label: `+${index + 1}h`,
      temp: predictFromModel(tempModel, x),
      humidity: clamp(predictFromModel(humidityModel, x), 0, 100),
      rain: clamp(predictFromModel(rainModel, x), 0, 100),
    };
  });
}

function buildLinearModel(values) {
  const count = values.length;
  const xSum = values.reduce((sum, _, index) => sum + index, 0);
  const ySum = values.reduce((sum, value) => sum + value, 0);
  const xySum = values.reduce((sum, value, index) => sum + index * value, 0);
  const xxSum = values.reduce((sum, _, index) => sum + index * index, 0);
  const denominator = count * xxSum - xSum * xSum || 1;
  const slope = (count * xySum - xSum * ySum) / denominator;
  const intercept = (ySum - slope * xSum) / count;

  return { slope, intercept };
}

function predictFromModel(model, x) {
  return model.slope * x + model.intercept;
}

function toggleFavoriteCity() {
  if (!state.currentPlace) {
    return;
  }

  const existingIndex = state.favorites.findIndex((city) => city.label === state.currentPlace.label);

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
    elements.favoritesList.innerHTML = '<span class="favorite-chip empty">No favorites yet</span>';
    return;
  }

  elements.favoritesList.innerHTML = state.favorites
    .map(
      (city) => `
        <button class="favorite-chip" type="button" data-label="${escapeHTML(city.label)}">
          ⭐ ${escapeHTML(city.name)}
        </button>
      `
    )
    .join("");

  elements.favoritesList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", async () => {
      const selected = state.favorites.find((city) => city.label === button.dataset.label);
      if (selected) {
        await usePlace(selected);
      }
    });
  });
}

function renderRecentSearches() {
  if (!state.recentSearches.length) {
    elements.recentSearches.innerHTML = '<span class="recent-chip empty">No recent cities</span>';
    return;
  }

  elements.recentSearches.innerHTML = state.recentSearches
    .map(
      (city) => `
        <button class="recent-chip" type="button" data-label="${escapeHTML(city.label)}">
          ${escapeHTML(city.name)}
        </button>
      `
    )
    .join("");

  elements.recentSearches.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", async () => {
      const selected = state.recentSearches.find((city) => city.label === button.dataset.label);
      if (selected) {
        await usePlace(selected);
      }
    });
  });
}

function addRecentSearch(place) {
  state.recentSearches = [place, ...state.recentSearches.filter((item) => item.label !== place.label)].slice(0, 6);
  localStorage.setItem("weather-recent", JSON.stringify(state.recentSearches));
  renderRecentSearches();
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
    humidity: hourly.relative_humidity_2m[startIndex + index] || 0,
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
    return { label: "Stable →", direction: "flat" };
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
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(`${value}T12:00:00`));
}

function normalizePlace(place) {
  const normalized = {
    name: place.name || "Selected city",
    country: place.country || "",
    admin1: place.admin1 || "",
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
  };

  normalized.label = place.label || [normalized.name, normalized.admin1, normalized.country].filter(Boolean).join(", ");
  return normalized;
}

function buildApiOrigins() {
  const origins = [];

  if (window.location.protocol.startsWith("http")) {
    origins.push(window.location.origin);
  }

  origins.push("http://127.0.0.1:8000", "http://localhost:8000");
  return [...new Set(origins)];
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function average(values) {
  return values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function showNotification(message, type = "info") {
  clearTimeout(state.popupTimer);
  elements.notificationPopup.textContent = `📲 ${message}`;
  elements.notificationPopup.className = `notification-popup ${type}`;
  elements.notificationPopup.classList.remove("hidden");

  state.popupTimer = setTimeout(() => {
    elements.notificationPopup.classList.add("hidden");
  }, 3600);

  if (!("Notification" in window)) {
    return;
  }

  if (Notification.permission === "granted") {
    new Notification("Weather Pulse Alert", { body: message });
    return;
  }

  if (Notification.permission === "default" && !state.notificationPermissionRequested) {
    state.notificationPermissionRequested = true;
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification("Weather Pulse Alert", { body: message });
      }
    });
  }
}

function setStatus(message, isError = false) {
  elements.statusText.textContent = message;
  elements.statusText.style.color = isError ? "#fecaca" : "var(--muted)";
}

async function fetchJSON(urlOrPath) {
  const targets = /^https?:\/\//i.test(urlOrPath)
    ? [urlOrPath]
    : API_ORIGINS.map((origin) => `${origin}${urlOrPath}`);

  let lastError = new Error("Could not reach the weather service.");

  for (const target of targets) {
    try {
      const response = await fetch(target, {
        method: "GET",
        mode: "cors",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

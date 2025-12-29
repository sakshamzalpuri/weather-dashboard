const apiKey = "ebb10b3cc7df6c8fec67e4c8df355121";
const iconMap = { Clear: "icon-sunny.webp", Clouds: "icon-partly-cloudy.webp", Rain: "icon-rain.webp", Drizzle: "icon-rain.webp", Thunderstorm: "icon-rain.webp", Snow: "icon-snow.webp", Mist: "icon-fog.webp", Fog: "icon-fog.webp", Haze: "icon-fog.webp" };
const cityInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const unitsSelect = document.getElementById("units");
let forecastContainer = null;
let currentWeatherContainer = null;
let currentConditionsContainer = null;
let hourlySection = null;
let hourlyListEl = null;
const state = { city: "", units: "metric", forecastByDate: {}, timezone: 0 };
searchBtn.addEventListener("click", () => searchCity());
cityInput.addEventListener("keydown", e => { if (e.key === "Enter") searchCity(); });
unitsSelect.addEventListener("change", async () => { if (!unitsSelect.value) return; state.units = unitsSelect.value; if (state.city) await fetchAndRender(); });
initUnitsSelect();
function initUnitsSelect() { unitsSelect.innerHTML = `<option value="" disabled ${state.units ? "" : "selected"}>Units<\/option><option value="metric" ${state.units === "metric" ? "selected" : ""}>Metric (°C, km/h)<\/option><option value="imperial" ${state.units === "imperial" ? "selected" : ""}>Imperial (°F, mph)<\/option>`; }
function buildLayout() {
  const leftPanel = document.querySelector(".left_panel");
  const rightPanel = document.querySelector(".right_panel");
  leftPanel.innerHTML = `
    <section class="current">
      <div class="current_weather"></div>
    </section>
    <section class="current_conditions"></section>
  `;
  rightPanel.innerHTML = `
    <section class="hourly">
      <div class="hourly_top">
        <h2 class="hourly_title">Daily Forecast</h2>
      </div>
      <div class="hourly_hours"></div>
    </section>
  `;
  currentWeatherContainer = leftPanel.querySelector(".current_weather");
  currentConditionsContainer = leftPanel.querySelector(".current_conditions");
  hourlySection = rightPanel.querySelector(".hourly");
  hourlyListEl = hourlySection.querySelector(".hourly_hours");
}
async function searchCity() { const c = cityInput.value.trim(); if (!c) return; state.city = c; await fetchAndRender(); }
  async function fetchAndRender() { try { if (!currentWeatherContainer || !hourlyListEl) { buildLayout(); } const { lat, lon } = await getCoordinates(state.city); const weather = await getWeather(lat, lon, state.units); renderCurrentView(weather); const forecastData = await getForecast(lat, lon, state.units); state.timezone = forecastData.city.timezone; state.forecastByDate = groupForecastByDate(forecastData.list, state.timezone); renderRightDaily(state.forecastByDate, state.timezone, state.units); } catch (e) { console.error(e); } }
async function getCoordinates(city) { const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`); if (!res.ok) throw new Error("Geocoding failed"); const data = await res.json(); if (!data.length) throw new Error("City not found"); return { lat: data[0].lat, lon: data[0].lon }; }
async function getWeather(lat, lon, units = "metric") { const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${apiKey}`); if (!res.ok) throw new Error("Weather fetch failed"); const data = await res.json(); const main = data.weather && data.weather[0] && data.weather[0].main ? data.weather[0].main : "Clouds"; const wind = units === "metric" ? Math.round((data.wind && data.wind.speed ? data.wind.speed : 0) * 3.6) : Math.round(data.wind && data.wind.speed ? data.wind.speed : 0); return { city: data.name, dt: data.dt, timezone: data.timezone, temperature: data.main.temp, feelsLike: data.main.feels_like, humidity: data.main.humidity, windSpeed: wind, precipitationMm: data.rain && data.rain["1h"] ? data.rain["1h"] : (data.snow && data.snow["1h"] ? data.snow["1h"] : 0), iconFile: iconMap[main] || "icon-partly-cloudy.webp" }; }
async function getForecast(lat, lon, units = "metric") { const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${units}&appid=${apiKey}`); if (!res.ok) throw new Error("Forecast fetch failed"); const data = await res.json(); return data; }
function groupForecastByDate(list, tzOffsetSec) { const map = {}; list.forEach(it => { const d = new Date((it.dt + tzOffsetSec) * 1000); const y = d.getUTCFullYear(); const m = String(d.getUTCMonth() + 1).padStart(2, "0"); const day = String(d.getUTCDate()).padStart(2, "0"); const key = `${y}-${m}-${day}`; if (!map[key]) map[key] = []; map[key].push(it); }); return map; }
function dateFromUnixWithTz(dtSec, tzOffsetSec) { const ms = (dtSec + tzOffsetSec) * 1000; return new Date(ms); }
function formatCurrentDate(dtSec, tzOffsetSec) { const d = dateFromUnixWithTz(dtSec, tzOffsetSec); return d.toLocaleString("en-US", { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
function shortWeekday(dtSec, tzOffsetSec) { const d = dateFromUnixWithTz(dtSec, tzOffsetSec); return d.toLocaleDateString("en-US", { weekday: "short" }); }
function timeLabel(dtSec, tzOffsetSec) { const d = dateFromUnixWithTz(dtSec, tzOffsetSec); return d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }); }
function renderCurrentView(w) {
  const windUnit = state.units === "metric" ? "km/h" : "mph";
  const tUnit = "°";
  currentWeatherContainer.innerHTML = `
    <div class="current_location">
      <div class="current_city">${w.city || ""}</div>
      <div class="current_date">${formatCurrentDate(w.dt, w.timezone)}</div>
    </div>
    <div class="current_temp">
      <img id="current_weather_icon" class="current_weather_img" src="assets/images/${w.iconFile}" alt="Weather Icon">
      <span class="current_temp_deg">${Math.round(w.temperature)}${tUnit}</span>
    </div>
  `;
  currentConditionsContainer.innerHTML = `
    <div class="current_condition">
      <p class="current_condition_title">Feels Like</p>
      <p class="current_condition_temp">${Math.round(w.feelsLike)}${tUnit}</p>
    </div>
    <div class="current_condition">
      <p class="current_condition_title">Humidity</p>
      <p class="current_condition_temp">${w.humidity} %</p>
    </div>
    <div class="current_condition">
      <p class="current_condition_title">Wind</p>
      <p class="current_condition_temp">${w.windSpeed} ${windUnit}</p>
    </div>
    <div class="current_condition">
      <p class="current_condition_title">Precipitation</p>
      <p class="current_condition_temp">${w.precipitationMm} mm</p>
    </div>
  `;
}
function renderDaily(byDate, tz, units) { const tUnit = "°"; const dates = Object.keys(byDate).slice(1, 7); const daysHtml = dates.map(dateKey => { const items = byDate[dateKey]; if (!items || !items.length) return ""; const temps = items.map(i => i.main.temp); const high = Math.round(Math.max(...temps)); const low = Math.round(Math.min(...temps)); const mid = items[Math.floor(items.length / 2)]; const main = mid.weather && mid.weather[0] && mid.weather[0].main ? mid.weather[0].main : "Clouds"; const icon = iconMap[main] || "icon-partly-cloudy.webp"; const label = shortWeekday(mid.dt, tz); return `<div class="forecast_day" data-date="${dateKey}"><p class="day_name">${label}<\/p><img class="daily_forecast_icon" src="assets/images/${icon}" alt="Weather Icon"><div class="day_temps"><p class="day_high">${high}${tUnit}<\/p><p class="day_low">${low}${tUnit}<\/p><\/div><\/div>`; }).join(""); forecastContainer.innerHTML = `<h2 class="title_forecast">Daily Forecast<\/h2><div class="forecast_container">${daysHtml}<\/div>`; }

// New helpers for right panel daily list
function longWeekday(dtSec, tzOffsetSec) { const d = dateFromUnixWithTz(dtSec, tzOffsetSec); return d.toLocaleDateString("en-US", { weekday: "long" }); }
function keyToDate(key) { return new Date(`${key}T00:00:00Z`); }
function formatKey(d) { const y = d.getUTCFullYear(); const m = String(d.getUTCMonth() + 1).padStart(2, "0"); const day = String(d.getUTCDate()).padStart(2, "0"); return `${y}-${m}-${day}`; }
function mondayOfWeek(key) { const d = keyToDate(key); const dow = d.getUTCDay(); const delta = dow === 0 ? -6 : (1 - dow); d.setUTCDate(d.getUTCDate() + delta); return formatKey(d); }
function longWeekdayFromKey(key) { const d = keyToDate(key); return d.toLocaleDateString("en-US", { weekday: "long" }); }
function addDaysKey(key, days) { const d = keyToDate(key); d.setUTCDate(d.getUTCDate() + days); return formatKey(d); }
function renderRightDaily(byDate, tz, units) { const tUnit = "°"; const keys = Object.keys(byDate).sort(); if (!keys.length) { hourlyListEl.innerHTML = ""; return; } const weekStart = mondayOfWeek(keys[0]); const weekKeys = Array.from({ length: 7 }, (_, i) => addDaysKey(weekStart, i)); const rows = weekKeys.map(dateKey => { const items = byDate[dateKey]; if (!items || !items.length) { const label = longWeekdayFromKey(dateKey); return `<div class="hourly_hour"><div class="hourly_hour_icon_time"><img src="assets/images/icon-partly-cloudy.webp" alt="Weather Icon"><p class="hour_time">${label}<\/p><\/div><p class="hour_temp">—<\/p><\/div>`; } const temps = items.map(i => i.main.temp); const high = Math.round(Math.max(...temps)); const low = Math.round(Math.min(...temps)); const mid = items[Math.floor(items.length / 2)]; const main = mid.weather && mid.weather[0] && mid.weather[0].main ? mid.weather[0].main : "Clouds"; const icon = iconMap[main] || "icon-partly-cloudy.webp"; const label = longWeekdayFromKey(dateKey); return `<div class="hourly_hour"><div class="hourly_hour_icon_time"><img src="assets/images/${icon}" alt="Weather Icon"><p class="hour_time">${label}<\/p><\/div><p class="hour_temp">${high}${tUnit} / ${low}${tUnit}<\/p><\/div>`; }).join(""); hourlyListEl.innerHTML = rows; }

function formatCurrentDate(dtSec, tzOffsetSec) {
  const d = dateFromUnixWithTz(dtSec, tzOffsetSec);
  return d.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function shortWeekday(dtSec, tzOffsetSec) {
  const d = dateFromUnixWithTz(dtSec, tzOffsetSec);
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function timeLabel(dtSec, tzOffsetSec) {
  const d = dateFromUnixWithTz(dtSec, tzOffsetSec);
  return d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
}

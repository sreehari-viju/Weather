// Initialize Lucide icons
lucide.createIcons();

// DOM Elements
const locationBtn = document.getElementById('location-btn');
const loadingEl = document.getElementById('loading');
const contentEl = document.getElementById('weather-content');
const errorEl = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const retryBtn = document.getElementById('retry-btn');

// Default Kerala Coordinates (Trivandrum)
const DEFAULT_LAT = 8.5241;
const DEFAULT_LNG = 76.9366;
const DEFAULT_NAME = 'Kerala';

// State
let isUsingLocation = false;

// Format Date
const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
    }).format(date);
};

// Open-Meteo Weather Codes map to Lucide icons & background themes
const getWeatherMeta = (code, isDay = 1) => {
    const meta = {
        0: { desc: 'Clear sky', icon: 'sun', theme: 'sunny' },
        1: { desc: 'Mainly clear', icon: 'sun-dim', theme: 'sunny' },
        2: { desc: 'Partly cloudy', icon: 'cloud-sun', theme: 'cloudy' },
        3: { desc: 'Overcast', icon: 'cloud', theme: 'cloudy' },
        45: { desc: 'Fog', icon: 'cloud-fog', theme: 'cloudy' },
        48: { desc: 'Depositing rime fog', icon: 'cloud-fog', theme: 'cloudy' },
        51: { desc: 'Light drizzle', icon: 'cloud-drizzle', theme: 'rainy' },
        53: { desc: 'Moderate drizzle', icon: 'cloud-drizzle', theme: 'rainy' },
        55: { desc: 'Dense drizzle', icon: 'cloud-drizzle', theme: 'rainy' },
        61: { desc: 'Slight rain', icon: 'cloud-rain', theme: 'rainy' },
        63: { desc: 'Moderate rain', icon: 'cloud-rain', theme: 'rainy' },
        65: { desc: 'Heavy rain', icon: 'cloud-rain', theme: 'rainy' },
        71: { desc: 'Slight snow', icon: 'cloud-snow', theme: 'cloudy' },
        73: { desc: 'Moderate snow', icon: 'cloud-snow', theme: 'cloudy' },
        75: { desc: 'Heavy snow', icon: 'cloud-snow', theme: 'cloudy' },
        80: { desc: 'Slight rain showers', icon: 'cloud-rain', theme: 'rainy' },
        81: { desc: 'Moderate rain showers', icon: 'cloud-rain', theme: 'rainy' },
        82: { desc: 'Violent rain showers', icon: 'cloud-rain', theme: 'rainy' },
        95: { desc: 'Thunderstorm', icon: 'cloud-lightning', theme: 'cloudy' },
        96: { desc: 'Thunderstorm with hail', icon: 'cloud-lightning', theme: 'cloudy' },
        99: { desc: 'Thunderstorm with heavy hail', icon: 'cloud-lightning', theme: 'cloudy' },
    };

    const result = meta[code] || { desc: 'Unknown', icon: 'cloud', theme: 'cloudy' };
    
    // Switch to night theme if applicable and clear/partly cloudy
    if (isDay === 0) {
        if (['sun', 'sun-dim', 'cloud-sun'].includes(result.icon)) {
            result.icon = result.icon.replace('sun', 'moon');
        }
        if (result.theme === 'sunny') {
            result.theme = 'night';
        }
    }
    
    return result;
};

const updateUI = (data, locationName) => {
    // Current Weather
    const current = data.current;
    
    // Smooth transition
    contentEl.style.opacity = '0';
    
    setTimeout(() => {
        document.getElementById('city-name').textContent = locationName;
        document.getElementById('date-time').textContent = formatDate(new Date());
        
        document.getElementById('temperature').textContent = `${Math.round(current.temperature_2m)}°`;
        
        const meta = getWeatherMeta(current.weather_code, current.is_day);
        document.getElementById('condition').textContent = meta.desc;
        
        document.getElementById('wind-speed').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
        document.getElementById('humidity').textContent = `${Math.round(current.relative_humidity_2m)}%`;
        document.getElementById('feels-like').textContent = `${Math.round(current.apparent_temperature)}°`;

        // Main Icon setup
        const mainIconContainer = document.getElementById('main-icon');
        mainIconContainer.innerHTML = `<i data-lucide="${meta.icon}"></i>`;
        
        // Theme setup
        document.body.className = meta.theme;

        // Forecast
        const daily = data.daily;
        const forecastList = document.getElementById('forecast-list');
        forecastList.innerHTML = '';

        // Next 7 days
        for (let i = 1; i <= 7; i++) {
            const date = new Date(daily.time[i]);
            const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
            
            // Basic logic: use the max temp day weather code (assuming roughly correct for mostly daytime)
            const dayMeta = getWeatherMeta(daily.weather_code[i], 1); 
            const maxTemp = Math.round(daily.temperature_2m_max[i]);
            const minTemp = Math.round(daily.temperature_2m_min[i]);

            const item = document.createElement('div');
            item.className = 'forecast-item';
            item.innerHTML = `
                <span class="forecast-day">${i === 1 ? 'Tomorrow' : dayName}</span>
                <span class="forecast-icon"><i data-lucide="${dayMeta.icon}" style="width: 22px; height: 22px; color: var(--text-secondary);"></i></span>
                <span class="forecast-temp">${maxTemp}°<span style="font-size: 0.8em; color: var(--text-secondary); margin-left: 6px;">${minTemp}°</span></span>
            `;
            forecastList.appendChild(item);
        }

        // Re-initialize icons since we injected new ones
        lucide.createIcons();

        // Show content
        loadingEl.classList.add('hidden');
        errorEl.classList.add('hidden');
        contentEl.classList.remove('hidden');
        
        contentEl.style.opacity = '1';
    }, 150);
};

const fetchWeather = async (lat, lng, name) => {
    loadingEl.classList.remove('hidden');
    contentEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=8`;
        const res = await fetch(url);
        
        if (!res.ok) throw new Error('Failed to fetch weather data');
        
        const data = await res.json();
        updateUI(data, name);
    } catch (err) {
        console.error(err);
        showError('Could not load weather data. Please try again.');
    }
};

const reverseGeocode = async (lat, lng) => {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`;
        const res = await fetch(url, {
            headers: { 'Accept-Language': 'en' }
        });
        const data = await res.json();
        const city = data.address.city || data.address.town || data.address.village || data.address.state_district || data.address.state;
        return city || 'Your Location';
    } catch (err) {
        console.error('Geocoding failed', err);
        return 'Your Location';
    }
};

const showError = (msg) => {
    loadingEl.classList.add('hidden');
    contentEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
    errorText.textContent = msg;
};

const handleLocationSuccess = async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    isUsingLocation = true;
    
    // Update button visually
    locationBtn.innerHTML = `<i data-lucide="crosshair"></i> Locating...`;
    lucide.createIcons();
    
    const name = await reverseGeocode(lat, lng);
    
    locationBtn.innerHTML = `<i data-lucide="map-pin"></i> My Location`;
    lucide.createIcons();
    
    fetchWeather(lat, lng, name);
};

const handleLocationError = (err) => {
    console.warn('Location access denied or failed.', err);
    fetchWeather(DEFAULT_LAT, DEFAULT_LNG, DEFAULT_NAME);
    locationBtn.innerHTML = `<i data-lucide="map-pin-off"></i> Denied`;
    lucide.createIcons();
};

const requestLocation = () => {
    if (!navigator.geolocation) {
        handleLocationError({ message: 'Geolocation not supported' });
        return;
    }
    
    locationBtn.innerHTML = `<i data-lucide="loader-2" class="spinner" style="width: 18px; height: 18px;"></i> Accessing...`;
    lucide.createIcons();
    
    navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError, {
        timeout: 10000,
        enableHighAccuracy: true
    });
};

// Event Listeners
locationBtn.addEventListener('click', () => {
    if (!isUsingLocation) {
        requestLocation();
    }
});

retryBtn.addEventListener('click', () => {
    if (isUsingLocation) {
        requestLocation();
    } else {
        fetchWeather(DEFAULT_LAT, DEFAULT_LNG, DEFAULT_NAME);
    }
});

// Init - Start with Kerala Weather Default
fetchWeather(DEFAULT_LAT, DEFAULT_LNG, DEFAULT_NAME);

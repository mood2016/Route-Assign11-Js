const API_KEY = "0e5cd553f150433e860175539242212";
const DEBOUNCE_DELAY = 300;
const CACHE_DURATION = 3600000; // ONE HOUR IS = 60*1000 *60 = 3600000
const TIMEOUT_END = 5000;

const elements = {
    weatherDisplay: document.getElementById("weatherDisplay"),
    searchForm: document.getElementById("searchForm"),
    cityInput: document.getElementById("cityInput"),
    errorMessage: document.getElementById("errorMessage"),
    suggestions: document.getElementById("suggestions")
};

const weatherCache = new Map();

const cities = [
    { name: "London", country: "United Kingdom" },
    { name: "Paris", country: "France" },
    { name: "New York", country: "United States" },
    { name: "Tokyo", country: "Japan" },
    { name: "Sydney", country: "Australia" },
    { name: "cairo", country: "Egypt" },
    { name: "sanaa", country: "Yemen" },
];

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
    setTimeout(() => {
        elements.errorMessage.style.display = 'none';
    }, TIMEOUT_END);
}

function showLoading() {
    elements.weatherDisplay.innerHTML = `
        <div class="col-12 text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Fetching weather data...</p>
        </div>
    `;
}

async function fetchWeatherData(city) {
    const cacheKey = city.toLowerCase();
    const cachedData = weatherCache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
        return cachedData.data;
    }
    const response = await fetch( `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${city}&days=3&aqi=yes`);
    if (!response.ok) {
        throw new Error(
            response.status === 404 ? "City not found. Please check the spelling and try again." : "Failed to fetch weather data. Please try again later."
        );
    }
    const data = await response.json();
    weatherCache.set(cacheKey, {data, timestamp: Date.now() });
    return data;
}

function displayWeather(data) {
    const { location, forecast, current } = data;
    const currentWeather = `
        <div class="col-12 text-center mb-4 today-data">
            <h2 class="city-name">${location.name}</h2>
            <h4 class="region">${location.region}, ${location.country}</h4>
            <p class="text-muted">Last updated: ${new Date(location.localtime).toLocaleString()}</p>
            <div class="current-weather mt-4">
                <img src="https:${current.condition.icon}" alt="${current.condition.text}" class="weather-icon-large">
                <h1 class="current-temp">${current.temp_c}°C</h1>
                <p class="condition-text">${current.condition.text}</p>
                <div class="current-details mt-3">
                    <span><i class="material-icons">opacity</i> ${current.humidity}%</span>
                    <span><i class="material-icons">air</i> ${current.wind_kph} km/h</span>
                    <span><i class="material-icons">visibility</i> ${current.vis_km} km</span>
                </div>
            </div>
        </div>`;

    const forecastCards = forecast.forecastday.map((day) => `
        <div class="col-md-4">
            <div class="weather-card py-5">
                <div class="card-body text-center">
                    <h5 class="card-title">
                        ${new Date(day.date).toLocaleDateString("en-US", { weekday: "long" })}
                    </h5>
                    <h6 class="card-subtitle mb-2 text-muted">
                        ${new Date(day.date).toLocaleDateString("en-US", { 
                            month: "short", 
                            day: "numeric" 
                        })}
                    </h6>
                    <img src="https:${day.day.condition.icon}" 
                         alt="${day.day.condition.text}" 
                         class="weather-icon my-3">
                    <div class="temperature">
                        <h3>${day.day.avgtemp_c}°C</h3>
                        <p class="high-low">
                            H: ${day.day.maxtemp_c}°C L: ${day.day.mintemp_c}°C
                        </p>
                        <p class="condition">${day.day.condition.text}</p>
                    </div>
                    <div class="weather-details mt-3">
                        <p><i class="material-icons">opacity</i> Humidity: ${day.day.avghumidity}%</p>
                        <p><i class="material-icons">air</i> Wind: ${day.day.maxwind_kph} km/h</p>
                        <p><i class="material-icons">water_drop</i> Rain Chance: ${day.day.daily_chance_of_rain}%</p>
                    </div>
                </div>
            </div>
        </div>`).join("");
    elements.weatherDisplay.innerHTML = currentWeather + forecastCards;
}

const showSuggestions = debounce((input) => {
    const value = input.toLowerCase();
    if (value.length < 2) {
        elements.suggestions.style.display = 'none';
        return;
    }
    const matches = cities.filter(city => 
        city.name.toLowerCase().includes(value) ||
        city.country.toLowerCase().includes(value)
    ).slice(0, 5);

    if (matches.length > 0) {
        elements.suggestions.innerHTML = matches
            .map(city => `
                <div class="suggestion-item" data-city="${city.name}">
                    <i class="material-icons">location_city</i>
                    ${city.name}, ${city.country}
                </div>
            `).join('');
        elements.suggestions.style.display = 'block';
    } else {
        elements.suggestions.style.display = 'none';
    }
}, DEBOUNCE_DELAY);

// EVENTS 

elements.cityInput.addEventListener('input', (e) => showSuggestions(e.target.value));

elements.suggestions.addEventListener('click', (e) => {
    const suggestionItem = e.target.closest('.suggestion-item');
    if (suggestionItem) {
        elements.cityInput.value = suggestionItem.dataset.city;
        elements.suggestions.style.display = 'none';
    }
});

document.addEventListener('click', (e) => {
    if (!elements.suggestions.contains(e.target) && e.target !== elements.cityInput) {
        elements.suggestions.style.display = 'none';
    }
});

elements.searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const city = elements.cityInput.value.trim();
    
    if (!city) {
        showError("Please enter a city name");
        return;
    }
    elements.suggestions.style.display = 'none';
    elements.errorMessage.style.display = 'none';
    try {
        showLoading();
        const weatherData = await fetchWeatherData(city);
        displayWeather(weatherData);
    } catch (error) {
        showError(error.message);
        elements.weatherDisplay.innerHTML = ''; 
    }
});


document.addEventListener('DOMContentLoaded', () => {
    const lastCity = localStorage.getItem('lastCity');
    if (lastCity) {
        elements.cityInput.value = lastCity;
        elements.searchForm.dispatchEvent(new Event('submit'));
    }
});

window.addEventListener('beforeunload', () => {
    const city = elements.cityInput.value.trim();
    if (city) {
        localStorage.setItem('lastCity', city);
    }
});
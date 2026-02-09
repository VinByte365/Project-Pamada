/**
 * Aloe Vera Location Service
 * Maintains database of Aloe Vera farms and suitable growing regions
 * Can be replaced with actual database or API calls
 */

// Mock database of Aloe Vera farms and cultivation regions
const ALOE_FARM_DATABASE = [
  {
    id: 1,
    name: 'Texas Aloe Farm',
    region: 'South Texas, USA',
    country: 'USA',
    coordinates: { lat: 26.2034, lng: -97.1964 },
    description: 'Large-scale commercial Aloe Vera plantation specializing in gel extraction',
    capacity: '500+ acres',
    climate: 'Semi-arid, hot summers, mild winters',
    suitabilityScore: 0.95
  },
  {
    id: 2,
    name: 'Arizona Aloe Cooperative',
    region: 'Pinal County, Arizona, USA',
    country: 'USA',
    coordinates: { lat: 32.7555, lng: -111.4948 },
    description: 'Cooperative of smaller Aloe Vera farms focused on organic cultivation',
    capacity: '300+ acres',
    climate: 'Hot desert, low humidity, minimal rainfall',
    suitabilityScore: 0.92
  },
  {
    id: 3,
    name: 'Canary Islands Aloe Estate',
    region: 'Fuerteventura, Spain',
    country: 'Spain',
    coordinates: { lat: 28.3549, lng: -14.3315 },
    description: 'Historic Aloe Vera plantation with Mediterranean climate conditions',
    capacity: '400+ acres',
    climate: 'Subtropical, warm year-round, minimal rain',
    suitabilityScore: 0.93
  },
  {
    id: 4,
    name: 'Rajasthan Aloe Vera Farm',
    region: 'Jodhpur, Rajasthan, India',
    country: 'India',
    coordinates: { lat: 26.2389, lng: 69.3186 },
    description: 'Large aloe plantation in desert region with traditional and modern techniques',
    capacity: '600+ acres',
    climate: 'Hot desert, extreme heat, low rainfall',
    suitabilityScore: 0.90
  },
  {
    id: 5,
    name: 'Gujarat Aloe Complex',
    region: 'Banaskantha, Gujarat, India',
    country: 'India',
    coordinates: { lat: 23.9230, lng: 71.8936 },
    description: 'Government-supported Aloe Vera cultivation with research facility',
    capacity: '1000+ acres',
    climate: 'Arid, hot summers, cool winters',
    suitabilityScore: 0.89
  },
  {
    id: 6,
    name: 'Middle East Aloe Network',
    region: 'Dubai, UAE',
    country: 'UAE',
    coordinates: { lat: 25.2048, lng: 55.2708 },
    description: 'Modern greenhouse facility with advanced irrigation in desert climate',
    capacity: '200+ acres',
    climate: 'Hot desert, ultra-low humidity',
    suitabilityScore: 0.88
  },
  {
    id: 7,
    name: 'Egypt Aloe Vera Estate',
    region: 'Cairo Region, Egypt',
    country: 'Egypt',
    coordinates: { lat: 30.0444, lng: 31.2357 },
    description: 'Ancient tradition of Aloe cultivation with modern farming methods',
    capacity: '500+ acres',
    climate: 'Desert, hot and dry, Nile irrigation available',
    suitabilityScore: 0.91
  },
  {
    id: 8,
    name: 'Kenya Aloe Plantations',
    region: 'Rift Valley, Kenya',
    country: 'Kenya',
    coordinates: { lat: 0.3656, lng: 35.9197 },
    description: 'East African cultivation center for organic Aloe Vera',
    capacity: '450+ acres',
    climate: 'High altitude, tropical, seasonal rainfall',
    suitabilityScore: 0.85
  }
];

// Regional climate suitability for Aloe Vera
const CLIMATE_REQUIREMENTS = {
  temperature: {
    optimal: { min: 13, max: 27 }, // Celsius
    tolerable: { min: 5, max: 40 }
  },
  humidity: {
    optimal: { min: 30, max: 50 }, // Percentage
    tolerable: { min: 20, max: 70 }
  },
  rainfall: {
    optimal: 'Low (100-300mm annually)',
    tolerable: 'Up to 600mm annually'
  }
};

/**
 * Search farms by location name or region
 * @param {string} searchTerm - Location name, city, or country
 * @returns {array} Matching farms
 */
const searchFarmsByLocation = (searchTerm) => {
  if (!searchTerm) return [];

  const term = searchTerm.toLowerCase();
  return ALOE_FARM_DATABASE.filter(farm =>
    farm.name.toLowerCase().includes(term) ||
    farm.region.toLowerCase().includes(term) ||
    farm.country.toLowerCase().includes(term)
  );
};

/**
 * Get farms by country
 * @param {string} country - Country name
 * @returns {array} Farms in that country
 */
const getFarmsByCountry = (country) => {
  return ALOE_FARM_DATABASE.filter(farm =>
    farm.country.toLowerCase() === country.toLowerCase()
  );
};

/**
 * Get farms by region/climate type
 * @param {string} climateType - 'desert', 'subtropical', 'tropical', 'arid'
 * @returns {array} Suitable farms
 */
const getFarmsByClimate = (climateType) => {
  const term = climateType.toLowerCase();
  return ALOE_FARM_DATABASE.filter(farm =>
    farm.climate.toLowerCase().includes(term)
  );
};

/**
 * Get top suitable farms (by suitability score)
 * @param {number} limit - Number of farms to return
 * @returns {array} Top farms
 */
const getTopSuitableFarms = (limit = 5) => {
  return ALOE_FARM_DATABASE
    .sort((a, b) => b.suitabilityScore - a.suitabilityScore)
    .slice(0, limit);
};

/**
 * Get nearby farms (simple distance calculation)
 * @param {number} latitude - User latitude
 * @param {number} longitude - User longitude
 * @param {number} radiusKm - Search radius in kilometers
 * @returns {array} Farms within radius
 */
const getNearbyFarms = (latitude, longitude, radiusKm = 500) => {
  const toRad = deg => deg * (Math.PI / 180);
  const R = 6371; // Earth radius in km

  return ALOE_FARM_DATABASE.filter(farm => {
    const { lat, lng } = farm.coordinates;
    const dLat = toRad(lat - latitude);
    const dLng = toRad(lng - longitude);

    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(latitude)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(a));
    const distance = R * c;

    return distance <= radiusKm;
  });
};

/**
 * Get climate suitability assessment
 * @param {object} climateData - { temperature, humidity, rainfall }
 * @returns {object} Suitability assessment
 */
const assessClimateSuitability = (climateData) => {
  const assessment = {
    suitable: true,
    factors: [],
    recommendations: []
  };

  // Temperature check
  if (climateData.temperature !== undefined) {
    const temp = climateData.temperature;
    if (temp >= CLIMATE_REQUIREMENTS.temperature.optimal.min &&
        temp <= CLIMATE_REQUIREMENTS.temperature.optimal.max) {
      assessment.factors.push('Temperature: OPTIMAL');
    } else if (temp >= CLIMATE_REQUIREMENTS.temperature.tolerable.min &&
               temp <= CLIMATE_REQUIREMENTS.temperature.tolerable.max) {
      assessment.factors.push('Temperature: TOLERABLE');
    } else {
      assessment.suitable = false;
      assessment.factors.push('Temperature: NOT SUITABLE');
      assessment.recommendations.push('Consider greenhouse cultivation for temperature control');
    }
  }

  // Humidity check
  if (climateData.humidity !== undefined) {
    const humidity = climateData.humidity;
    if (humidity >= CLIMATE_REQUIREMENTS.humidity.optimal.min &&
        humidity <= CLIMATE_REQUIREMENTS.humidity.optimal.max) {
      assessment.factors.push('Humidity: OPTIMAL');
    } else if (humidity >= CLIMATE_REQUIREMENTS.humidity.tolerable.min &&
               humidity <= CLIMATE_REQUIREMENTS.humidity.tolerable.max) {
      assessment.factors.push('Humidity: TOLERABLE');
      assessment.recommendations.push('Monitor for fungal diseases due to higher humidity');
    } else if (humidity > CLIMATE_REQUIREMENTS.humidity.tolerable.max) {
      assessment.suitable = false;
      assessment.factors.push('Humidity: TOO HIGH');
      assessment.recommendations.push('Use raised beds and improve drainage to prevent rot');
    }
  }

  return assessment;
};

/**
 * Get farm information by ID
 * @param {number} farmId - Farm ID
 * @returns {object|null} Farm details
 */
const getFarmById = (farmId) => {
  return ALOE_FARM_DATABASE.find(farm => farm.id === farmId) || null;
};

/**
 * Get all farms
 * @returns {array} All farms
 */
const getAllFarms = () => {
  return ALOE_FARM_DATABASE;
};

/**
 * Format farm information for response
 * @param {object} farm - Farm object
 * @returns {string} Formatted farm info
 */
const formatFarmInfo = (farm) => {
  return `
**${farm.name}**
- Region: ${farm.region}
- Country: ${farm.country}
- Capacity: ${farm.capacity}
- Climate: ${farm.climate}
- Description: ${farm.description}
- Suitability Score: ${(farm.suitabilityScore * 100).toFixed(1)}%`;
};

module.exports = {
  searchFarmsByLocation,
  getFarmsByCountry,
  getFarmsByClimate,
  getTopSuitableFarms,
  getNearbyFarms,
  assessClimateSuitability,
  getFarmById,
  getAllFarms,
  formatFarmInfo,
  ALOE_FARM_DATABASE,
  CLIMATE_REQUIREMENTS
};

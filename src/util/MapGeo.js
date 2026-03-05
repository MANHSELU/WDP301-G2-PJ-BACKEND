const axios = require("axios");

async function geocodeVietnamese(placeName) {
  const encoded = encodeURIComponent(placeName);

  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=vn`;
  console.log("url là: ", url)

  const res = await axios.get(url, {
    headers: {
      "User-Agent": "bus-system-app"
    }
  });

  if (!res.data.length) {
    return null;
  }

  return {
    lat: parseFloat(res.data[0].lat),
    lng: parseFloat(res.data[0].lon)
  };
}

module.exports = { geocodeVietnamese };
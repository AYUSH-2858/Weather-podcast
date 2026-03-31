import json
from urllib.parse import urlencode
from urllib.request import urlopen

from django.http import JsonResponse
from django.shortcuts import render


def home(request):
    return render(request, "dashboard/index.html")


def cors_json(data, status=200):
    response = JsonResponse(data, status=status)
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type"
    return response


def _fetch_json(base_url, params):
    url = f"{base_url}?{urlencode(params)}"
    with urlopen(url, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


def api_search(request):
    query = request.GET.get("q", "").strip()
    if not query:
        return cors_json({"results": []})

    try:
        data = _fetch_json(
            "https://geocoding-api.open-meteo.com/v1/search",
            {
                "name": query,
                "count": 8,
                "language": "en",
                "format": "json",
            },
        )
        return cors_json(data)
    except Exception as error:
        return cors_json({"error": str(error), "results": []}, status=502)


def api_reverse(request):
    latitude = request.GET.get("latitude")
    longitude = request.GET.get("longitude")

    if not latitude or not longitude:
        return cors_json({"results": []}, status=400)

    try:
        data = _fetch_json(
            "https://geocoding-api.open-meteo.com/v1/reverse",
            {
                "latitude": latitude,
                "longitude": longitude,
                "language": "en",
                "format": "json",
            },
        )
        return cors_json(data)
    except Exception as error:
        return cors_json({"error": str(error), "results": []}, status=502)


def api_weather(request):
    latitude = request.GET.get("latitude")
    longitude = request.GET.get("longitude")

    if not latitude or not longitude:
        return cors_json({"error": "Missing coordinates"}, status=400)

    try:
        data = _fetch_json(
            "https://api.open-meteo.com/v1/forecast",
            {
                "latitude": latitude,
                "longitude": longitude,
                "current": "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day",
                "hourly": "temperature_2m,relative_humidity_2m,weather_code,precipitation_probability,uv_index",
                "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "timezone": "auto",
                "forecast_days": 7,
                "temperature_unit": "celsius",
                "wind_speed_unit": "kmh",
            },
        )
        return cors_json(data)
    except Exception as error:
        return cors_json({"error": str(error)}, status=502)


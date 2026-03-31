from django.urls import path

from .views import api_reverse, api_search, api_weather, home

urlpatterns = [
    path("", home, name="home"),
    path("api/search/", api_search, name="api-search"),
    path("api/reverse/", api_reverse, name="api-reverse"),
    path("api/weather/", api_weather, name="api-weather"),
]

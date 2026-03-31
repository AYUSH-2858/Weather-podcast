from django.contrib import admin
from django.contrib.staticfiles.storage import staticfiles_storage
from django.urls import include, path
from django.views.generic.base import RedirectView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("styles.css", RedirectView.as_view(url=staticfiles_storage.url("styles.css"), permanent=False)),
    path("main.js", RedirectView.as_view(url=staticfiles_storage.url("main.js"), permanent=False)),
    path("", include("dashboard.urls")),
]

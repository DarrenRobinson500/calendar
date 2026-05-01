from django.contrib import admin
from .models import Event, ToDo, PeopleGroup, Person, Story, Tracker, TrackerEntry

admin.site.register(Event)
admin.site.register(ToDo)
admin.site.register(PeopleGroup)
admin.site.register(Person)
admin.site.register(Story)
admin.site.register(Tracker)
admin.site.register(TrackerEntry)

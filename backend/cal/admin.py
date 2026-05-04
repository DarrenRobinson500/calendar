from django.contrib import admin
from .models import Event, ToDo, PeopleGroup, Person, Story, Tracker, TrackerEntry, Dog, DogVisit, DogStory, Shop, ShoppingItem

admin.site.register(Event)
admin.site.register(ToDo)
admin.site.register(PeopleGroup)
admin.site.register(Person)
admin.site.register(Story)
admin.site.register(Tracker)
admin.site.register(TrackerEntry)
admin.site.register(Dog)
admin.site.register(DogVisit)
admin.site.register(DogStory)
admin.site.register(Shop)
admin.site.register(ShoppingItem)

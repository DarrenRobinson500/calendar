from rest_framework import serializers
from .models import Event, ToDo, Project, Task, Bill, Gratitude, PeopleGroup, Person, Story, Tracker, TrackerEntry


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['id', 'title', 'date', 'description']


class ToDoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ToDo
        fields = ['id', 'name', 'description', 'frequency_days', 'next_due', 'order', 'one_off', 'night_time']


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'name', 'active', 'order']


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'project', 'name', 'description', 'start_date', 'end_date', 'order', 'depends_on', 'completed', 'is_heading']


class BillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bill
        fields = ['id', 'name', 'due_date', 'amount', 'frequency_days']


class GratitudeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gratitude
        fields = ['id', 'text', 'created_at', 'order']


class PeopleGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeopleGroup
        fields = ['id', 'name', 'order']


class PersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ['id', 'group', 'name', 'notes', 'birthday', 'order']


class StorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Story
        fields = ['id', 'person', 'heading', 'text', 'created_at']


class TrackerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tracker
        fields = ['id', 'name', 'unit', 'order', 'target_start_date', 'target_end_date', 'target_start_value', 'target_end_value']


class TrackerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TrackerEntry
        fields = ['id', 'tracker', 'date', 'value']

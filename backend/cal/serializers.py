from rest_framework import serializers
from .models import Event, ToDo, Project, Task, Birthday, Bill, Gratitude


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
        fields = ['id', 'project', 'name', 'description', 'start_date', 'end_date', 'order', 'depends_on', 'completed']


class BirthdaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Birthday
        fields = ['id', 'name', 'date']


class BillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bill
        fields = ['id', 'name', 'due_date', 'amount', 'frequency_days']


class GratitudeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gratitude
        fields = ['id', 'text', 'created_at', 'order']

from rest_framework import serializers
from .models import Event, ToDo, Project, Task, Bill, BillCategory, BillInstance, Quote, Gratitude, PeopleGroup, Person, Story, Tracker, TrackerEntry, Dog, DogVisit, DogStory, Shop, ShoppingItem


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['id', 'title', 'date', 'description']


class ToDoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ToDo
        fields = ['id', 'name', 'description', 'frequency_days', 'next_due', 'order', 'one_off', 'night_time', 'sticky']


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'name', 'active', 'order']


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'project', 'name', 'description', 'start_date', 'end_date', 'order', 'depends_on', 'completed', 'is_heading', 'night_time', 'snoozed_until']


class BillCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BillCategory
        fields = ['id', 'name', 'order']


class BillInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillInstance
        fields = ['id', 'bill', 'date', 'amount']


class BillSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True, default=None)
    instances_count = serializers.IntegerField(source='instances.count', read_only=True)

    class Meta:
        model = Bill
        fields = ['id', 'name', 'due_date', 'amount', 'frequency_days', 'category', 'category_name', 'instances_count']


class QuoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quote
        fields = ['id', 'text', 'author', 'created_at', 'order']


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
    people = serializers.PrimaryKeyRelatedField(many=True, queryset=Person.objects.all())

    class Meta:
        model = Story
        fields = ['id', 'people', 'heading', 'text', 'created_at']

    def create(self, validated_data):
        people = validated_data.pop('people', [])
        story = Story.objects.create(**validated_data)
        story.people.set(people)
        return story

    def update(self, instance, validated_data):
        people = validated_data.pop('people', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if people is not None:
            instance.people.set(people)
        return instance


class TrackerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tracker
        fields = ['id', 'name', 'unit', 'order', 'target_start_date', 'target_end_date', 'target_start_value', 'target_end_value']


class TrackerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TrackerEntry
        fields = ['id', 'tracker', 'date', 'value']


class DogSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dog
        fields = ['id', 'name', 'owner', 'phone', 'order']


class DogVisitSerializer(serializers.ModelSerializer):
    class Meta:
        model = DogVisit
        fields = ['id', 'dog', 'start_date', 'end_date']


class DogStorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DogStory
        fields = ['id', 'dog', 'heading', 'text', 'created_at']


class ShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = ['id', 'name', 'order']


class ShoppingItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShoppingItem
        fields = ['id', 'shop', 'name', 'checked', 'order']

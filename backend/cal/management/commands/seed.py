from datetime import date, timedelta
from django.core.management.base import BaseCommand
from cal.models import Event, ToDo


class Command(BaseCommand):
    help = 'Seed the database with sample events and todos'

    def handle(self, *args, **options):
        Event.objects.all().delete()
        ToDo.objects.all().delete()

        today = date.today()

        Event.objects.create(
            title='Team Standup',
            date=today,
            description='Daily sync with the engineering team.',
        )
        Event.objects.create(
            title='Doctor Appointment',
            date=today + timedelta(days=3),
            description='Annual check-up at 10:00 AM.',
        )
        Event.objects.create(
            title='Project Deadline',
            date=today + timedelta(days=7),
            description='Submit final deliverables for Q2 project.',
        )

        ToDo.objects.create(
            name='Water plants',
            frequency_days=3,
            next_due=today,
        )
        ToDo.objects.create(
            name='Take out trash',
            frequency_days=7,
            next_due=today + timedelta(days=2),
        )
        ToDo.objects.create(
            name='Clean bathroom',
            frequency_days=14,
            next_due=today + timedelta(days=5),
        )

        self.stdout.write(self.style.SUCCESS('Seeded 3 events and 3 todos.'))

from django.db import models


class Event(models.Model):
    title = models.CharField(max_length=255)
    date = models.DateField()
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.title} ({self.date})"


class ToDo(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    frequency_days = models.PositiveIntegerField(default=1)
    next_due = models.DateField()
    order = models.PositiveIntegerField(default=0)
    one_off = models.BooleanField(default=False)
    night_time = models.BooleanField(default=False)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.name} (due {self.next_due})"


class Project(models.Model):
    name = models.CharField(max_length=255)
    active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Birthday(models.Model):
    name = models.CharField(max_length=255)
    date = models.DateField()

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.date.strftime('%b %d')})"


class Bill(models.Model):
    name = models.CharField(max_length=255)
    due_date = models.DateField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    frequency_days = models.PositiveIntegerField()

    class Meta:
        ordering = ['due_date', 'name']

    def __str__(self):
        return f"{self.name} (${self.amount}, due {self.due_date})"


class Task(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    order = models.PositiveIntegerField(default=0)
    depends_on = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL, related_name='dependents'
    )
    completed = models.BooleanField(default=False)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.name} ({self.project.name})"

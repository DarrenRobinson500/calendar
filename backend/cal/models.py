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
    frequency_days = models.PositiveIntegerField()
    next_due = models.DateField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.name} (due {self.next_due})"


class Project(models.Model):
    name = models.CharField(max_length=255)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


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

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.name} ({self.project.name})"

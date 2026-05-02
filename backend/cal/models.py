from django.db import models


class Setting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()

    def __str__(self):
        return f"{self.key} = {self.value[:60]}"


class Gratitude(models.Model):
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return self.text[:60]


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
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    depends_on = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL, related_name='dependents'
    )
    completed = models.BooleanField(default=False)
    is_heading = models.BooleanField(default=False)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.name} ({self.project.name})"


class PeopleGroup(models.Model):
    name = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Person(models.Model):
    group = models.ForeignKey(PeopleGroup, on_delete=models.CASCADE, related_name='people')
    name = models.CharField(max_length=255)
    notes = models.TextField(blank=True)
    birthday = models.DateField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return f"{self.name} ({self.group.name})"


class Story(models.Model):
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name='stories')
    heading = models.CharField(max_length=255, blank=True)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.person.name}: {self.text[:60]}"


class Tracker(models.Model):
    name = models.CharField(max_length=255)
    unit = models.CharField(max_length=50, blank=True)
    order = models.PositiveIntegerField(default=0)
    target_start_date = models.DateField(null=True, blank=True)
    target_end_date = models.DateField(null=True, blank=True)
    target_start_value = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    target_end_value = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class TrackerEntry(models.Model):
    tracker = models.ForeignKey(Tracker, on_delete=models.CASCADE, related_name='entries')
    date = models.DateField()
    value = models.DecimalField(max_digits=12, decimal_places=4)

    class Meta:
        ordering = ['date']
        unique_together = [['tracker', 'date']]

    def __str__(self):
        return f"{self.tracker.name} {self.date}: {self.value}"

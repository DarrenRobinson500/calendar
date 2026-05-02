from datetime import date, timedelta
import calendar

from django.utils.timezone import now, localdate
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Event, ToDo, Project, Task, Bill, Gratitude, Setting, PeopleGroup, Person, Story, Tracker, TrackerEntry
from .serializers import EventSerializer, ToDoSerializer, ProjectSerializer, TaskSerializer, BillSerializer, GratitudeSerializer, PeopleGroupSerializer, PersonSerializer, StorySerializer, TrackerSerializer, TrackerEntrySerializer


@api_view(['GET'])
def calendar_view(request):
    month_param = request.query_params.get('month')
    today = localdate()

    if month_param:
        try:
            year, month = [int(x) for x in month_param.split('-')]
        except (ValueError, AttributeError):
            return Response({'error': 'Invalid month format. Use YYYY-MM.'}, status=400)
    else:
        year, month = today.year, today.month

    _, days_in_month = calendar.monthrange(year, month)
    first_day = date(year, month, 1)
    last_day = date(year, month, days_in_month)

    events = Event.objects.filter(date__year=year, date__month=month)
    todos = ToDo.objects.filter(next_due__lte=last_day).order_by('order', 'id')
    people_with_birthdays = Person.objects.filter(birthday__month=month)
    bills = Bill.objects.filter(due_date__lte=last_day)

    days: dict = {}

    def ensure_day(d: date):
        key = d.isoformat()
        if key not in days:
            days[key] = {'events': [], 'todos': [], 'night_todos': [], 'birthdays': [], 'bills': []}
        return key

    for person in people_with_birthdays:
        try:
            display_date = date(year, month, person.birthday.day)
        except ValueError:
            continue
        key = ensure_day(display_date)
        days[key]['birthdays'].append({
            'id': person.id,
            'name': person.name,
            'date': person.birthday.isoformat(),
        })

    for event in events:
        key = ensure_day(event.date)
        days[key]['events'].append({
            'id': event.id,
            'title': event.title,
            'description': event.description,
        })

    for todo in todos:
        overdue = todo.next_due < today
        display_date = today if overdue else todo.next_due
        if first_day <= display_date <= last_day:
            key = ensure_day(display_date)
            todo_data = {
                'id': todo.id,
                'name': todo.name,
                'description': todo.description,
                'frequency_days': todo.frequency_days,
                'next_due': todo.next_due.isoformat(),
                'overdue': overdue,
                'one_off': todo.one_off,
                'night_time': todo.night_time,
            }
            if todo.night_time:
                days[key]['night_todos'].append(todo_data)
            else:
                days[key]['todos'].append(todo_data)

    for bill in bills:
        overdue = bill.due_date < today
        display_date = today if overdue else bill.due_date
        if first_day <= display_date <= last_day:
            key = ensure_day(display_date)
            days[key]['bills'].append({
                'id': bill.id,
                'name': bill.name,
                'amount': str(bill.amount),
                'due_date': bill.due_date.isoformat(),
                'overdue': overdue,
            })

    project_tasks = Task.objects.filter(
        start_date__lte=last_day,
        end_date__gte=first_day,
        completed=False,
        is_heading=False,
        project__active=True,
    ).select_related('project').order_by('project__name', 'order', 'id')

    for task in project_tasks:
        day = max(task.start_date, first_day)
        end = min(task.end_date, last_day)
        while day <= end:
            key = ensure_day(day)
            if 'project_tasks' not in days[key]:
                days[key]['project_tasks'] = []
            days[key]['project_tasks'].append({
                'id': task.id,
                'name': task.name,
                'project_name': task.project.name,
                'project_id': task.project.id,
            })
            day += timedelta(days=1)

    return Response({
        'month': f'{year:04d}-{month:02d}',
        'days': days,
    })


@api_view(['GET', 'POST'])
def event_list(request):
    if request.method == 'GET':
        serializer = EventSerializer(Event.objects.all().order_by('date'), many=True)
        return Response(serializer.data)
    serializer = EventSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def event_detail(request, pk):
    try:
        event = Event.objects.get(pk=pk)
    except Event.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(EventSerializer(event).data)
    if request.method == 'PUT':
        serializer = EventSerializer(event, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    event.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
def todo_list(request):
    if request.method == 'GET':
        serializer = ToDoSerializer(ToDo.objects.all().order_by('order', 'id'), many=True)
        return Response(serializer.data)
    serializer = ToDoSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def todo_detail(request, pk):
    try:
        todo = ToDo.objects.get(pk=pk)
    except ToDo.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(ToDoSerializer(todo).data)
    if request.method == 'PUT':
        serializer = ToDoSerializer(todo, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    todo.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
def todo_done(request, pk):
    try:
        todo = ToDo.objects.get(pk=pk)
    except ToDo.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if todo.one_off:
        todo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    todo.next_due = localdate() + timedelta(days=todo.frequency_days)
    todo.save()
    return Response(ToDoSerializer(todo).data)


@api_view(['POST'])
def todo_reorder(request):
    # request.data is an ordered list of todo IDs
    for position, todo_id in enumerate(request.data):
        ToDo.objects.filter(pk=todo_id).update(order=position)
    return Response({'status': 'ok'})


@api_view(['GET'])
def data_export(request):
    events = Event.objects.all().order_by('date')
    todos = ToDo.objects.all().order_by('order', 'id')
    projects = Project.objects.all().order_by('name')

    projects_data = []
    for project in projects:
        task_list = list(project.tasks.order_by('order', 'id'))
        idx = {t.id: i for i, t in enumerate(task_list)}
        projects_data.append({
            'name': project.name,
            'tasks': [
                {
                    'name': t.name,
                    'description': t.description,
                    'start_date': t.start_date.isoformat(),
                    'end_date': t.end_date.isoformat(),
                    'order': t.order,
                    'depends_on': idx.get(t.depends_on_id) if t.depends_on_id else None,
                }
                for t in task_list
            ],
        })

    return Response({
        'events': [
            {'title': e.title, 'date': e.date.isoformat(), 'description': e.description}
            for e in events
        ],
        'todos': [
            {
                'name': t.name,
                'description': t.description,
                'frequency_days': t.frequency_days,
                'next_due': t.next_due.isoformat(),
                'order': t.order,
            }
            for t in todos
        ],
        'projects': projects_data,
    })


@api_view(['POST'])
def data_import(request):
    clear = request.query_params.get('clear', 'false').lower() == 'true'
    events_data = request.data.get('events', [])
    todos_data = request.data.get('todos', [])
    projects_data = request.data.get('projects', [])

    if clear:
        Event.objects.all().delete()
        ToDo.objects.all().delete()
        Project.objects.all().delete()

    for e in events_data:
        Event.objects.create(
            title=e['title'],
            date=e['date'],
            description=e.get('description', ''),
        )

    for t in todos_data:
        ToDo.objects.create(
            name=t['name'],
            description=t.get('description', ''),
            frequency_days=t['frequency_days'],
            next_due=t['next_due'],
            order=t.get('order', 0),
        )

    imported_tasks = 0
    for p in projects_data:
        project = Project.objects.create(name=p['name'])
        tasks_raw = p.get('tasks', [])
        created = []
        for t in tasks_raw:
            created.append(Task.objects.create(
                project=project,
                name=t['name'],
                description=t.get('description', ''),
                start_date=t['start_date'],
                end_date=t['end_date'],
                order=t.get('order', 0),
            ))
            imported_tasks += 1
        for i, t in enumerate(tasks_raw):
            dep = t.get('depends_on')
            if dep is not None and 0 <= dep < len(created):
                created[i].depends_on = created[dep]
                created[i].save(update_fields=['depends_on'])

    return Response({
        'imported_events': len(events_data),
        'imported_todos': len(todos_data),
        'imported_projects': len(projects_data),
        'imported_tasks': imported_tasks,
    })


# ── Projects ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
def project_list(request):
    if request.method == 'GET':
        return Response(ProjectSerializer(Project.objects.all().order_by('order', 'name'), many=True).data)
    s = ProjectSerializer(data=request.data)
    if s.is_valid():
        s.save()
        return Response(s.data, status=status.HTTP_201_CREATED)
    return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def project_reorder(request):
    for position, project_id in enumerate(request.data):
        Project.objects.filter(pk=project_id).update(order=position)
    return Response({'status': 'ok'})


@api_view(['GET', 'PUT', 'DELETE'])
def project_detail(request, pk):
    try:
        project = Project.objects.get(pk=pk)
    except Project.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(ProjectSerializer(project).data)
    if request.method == 'PUT':
        s = ProjectSerializer(project, data=request.data)
        if s.is_valid():
            s.save()
            return Response(s.data)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
    project.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Tasks ─────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
def task_list(request):
    if request.method == 'GET':
        project_id = request.query_params.get('project')
        qs = Task.objects.filter(project_id=project_id) if project_id else Task.objects.all()
        return Response(TaskSerializer(qs.order_by('order', 'id'), many=True).data)
    s = TaskSerializer(data=request.data)
    if s.is_valid():
        s.save()
        return Response(s.data, status=status.HTTP_201_CREATED)
    return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def task_detail(request, pk):
    try:
        task = Task.objects.get(pk=pk)
    except Task.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(TaskSerializer(task).data)
    if request.method == 'PUT':
        s = TaskSerializer(task, data=request.data)
        if s.is_valid():
            s.save()
            return Response(s.data)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
    task.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
def task_done(request, pk):
    try:
        task = Task.objects.get(pk=pk)
    except Task.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    task.completed = not task.completed
    task.save()
    return Response(TaskSerializer(task).data)


@api_view(['POST'])
def task_reorder(request):
    for position, task_id in enumerate(request.data):
        Task.objects.filter(pk=task_id).update(order=position)
    return Response({'status': 'ok'})


@api_view(['POST'])
def task_bulk_update(request):
    for item in request.data:
        Task.objects.filter(pk=item['id']).update(
            start_date=item['start_date'],
            end_date=item['end_date'],
        )
    return Response({'status': 'ok'})


# ── Bills ─────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
def bill_list(request):
    if request.method == 'GET':
        return Response(BillSerializer(Bill.objects.all(), many=True).data)
    s = BillSerializer(data=request.data)
    if s.is_valid():
        s.save()
        return Response(s.data, status=status.HTTP_201_CREATED)
    return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def bill_detail(request, pk):
    try:
        bill = Bill.objects.get(pk=pk)
    except Bill.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(BillSerializer(bill).data)
    if request.method == 'PUT':
        s = BillSerializer(bill, data=request.data)
        if s.is_valid():
            s.save()
            return Response(s.data)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
    bill.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
def bill_done(request, pk):
    try:
        bill = Bill.objects.get(pk=pk)
    except Bill.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    bill.due_date = localdate() + timedelta(days=bill.frequency_days)
    bill.save()
    return Response(BillSerializer(bill).data)


# ── Gratitude ─────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
def gratitude_list(request):
    if request.method == 'GET':
        return Response(GratitudeSerializer(Gratitude.objects.all(), many=True).data)
    s = GratitudeSerializer(data=request.data)
    if s.is_valid():
        s.save()
        return Response(s.data, status=status.HTTP_201_CREATED)
    return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def gratitude_reorder(request):
    for position, entry_id in enumerate(request.data):
        Gratitude.objects.filter(pk=entry_id).update(order=position)
    return Response({'status': 'ok'})


@api_view(['DELETE'])
def gratitude_detail(request, pk):
    try:
        entry = Gratitude.objects.get(pk=pk)
    except Gratitude.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    entry.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Settings ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
def settings_view(request):
    if request.method == 'GET':
        return Response({s.key: s.value for s in Setting.objects.all()})
    for key, value in request.data.items():
        Setting.objects.update_or_create(key=key, defaults={'value': value})
    return Response({'status': 'ok'})


# ── People Groups ─────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
def people_group_list(request):
    if request.method == 'GET':
        return Response(PeopleGroupSerializer(PeopleGroup.objects.all(), many=True).data)
    s = PeopleGroupSerializer(data=request.data)
    if s.is_valid():
        s.save()
        return Response(s.data, status=status.HTTP_201_CREATED)
    return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def people_group_detail(request, pk):
    try:
        group = PeopleGroup.objects.get(pk=pk)
    except PeopleGroup.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(PeopleGroupSerializer(group).data)
    if request.method == 'PUT':
        s = PeopleGroupSerializer(group, data=request.data)
        if s.is_valid():
            s.save()
            return Response(s.data)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
    group.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
def people_group_reorder(request):
    for position, group_id in enumerate(request.data):
        PeopleGroup.objects.filter(pk=group_id).update(order=position)
    return Response({'status': 'ok'})


# ── People ────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
def person_list(request):
    if request.method == 'GET':
        group_id = request.query_params.get('group')
        qs = Person.objects.filter(group_id=group_id) if group_id else Person.objects.all()
        return Response(PersonSerializer(qs, many=True).data)
    s = PersonSerializer(data=request.data)
    if s.is_valid():
        s.save()
        return Response(s.data, status=status.HTTP_201_CREATED)
    return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def person_detail(request, pk):
    try:
        person = Person.objects.get(pk=pk)
    except Person.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(PersonSerializer(person).data)
    if request.method == 'PUT':
        s = PersonSerializer(person, data=request.data)
        if s.is_valid():
            s.save()
            return Response(s.data)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
    person.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Stories ───────────────────────────────────────────────────────────────────

@api_view(['POST'])
def person_reorder(request):
    for position, person_id in enumerate(request.data):
        Person.objects.filter(pk=person_id).update(order=position)
    return Response({'status': 'ok'})


@api_view(['GET', 'POST'])
def story_list(request):
    if request.method == 'GET':
        person_id = request.query_params.get('person')
        qs = Story.objects.filter(person_id=person_id) if person_id else Story.objects.all()
        return Response(StorySerializer(qs, many=True).data)
    s = StorySerializer(data=request.data)
    if s.is_valid():
        s.save()
        return Response(s.data, status=status.HTTP_201_CREATED)
    return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'DELETE'])
def story_detail(request, pk):
    try:
        story = Story.objects.get(pk=pk)
    except Story.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'PUT':
        story.heading = request.data.get('heading', story.heading)
        story.text = request.data.get('text', story.text)
        story.save()
        return Response(StorySerializer(story).data)
    story.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Trackers ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
def tracker_list(request):
    if request.method == 'GET':
        return Response(TrackerSerializer(Tracker.objects.all(), many=True).data)
    s = TrackerSerializer(data=request.data)
    if s.is_valid():
        s.save()
        return Response(s.data, status=status.HTTP_201_CREATED)
    return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def tracker_detail(request, pk):
    try:
        tracker = Tracker.objects.get(pk=pk)
    except Tracker.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(TrackerSerializer(tracker).data)
    if request.method == 'PUT':
        s = TrackerSerializer(tracker, data=request.data)
        if s.is_valid():
            s.save()
            return Response(s.data)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
    tracker.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
def tracker_reorder(request):
    for position, tracker_id in enumerate(request.data):
        Tracker.objects.filter(pk=tracker_id).update(order=position)
    return Response({'status': 'ok'})


# ── Tracker Entries ───────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
def tracker_entry_list(request):
    if request.method == 'GET':
        tracker_id = request.query_params.get('tracker')
        qs = TrackerEntry.objects.filter(tracker_id=tracker_id) if tracker_id else TrackerEntry.objects.all()
        return Response(TrackerEntrySerializer(qs, many=True).data)
    tracker_id = request.data.get('tracker')
    date = request.data.get('date')
    value = request.data.get('value')
    if not tracker_id or not date or value is None:
        return Response({'error': 'tracker, date and value are required.'}, status=status.HTTP_400_BAD_REQUEST)
    entry, _ = TrackerEntry.objects.update_or_create(
        tracker_id=tracker_id,
        date=date,
        defaults={'value': value},
    )
    return Response(TrackerEntrySerializer(entry).data)


@api_view(['DELETE'])
def tracker_entry_detail(request, pk):
    try:
        entry = TrackerEntry.objects.get(pk=pk)
    except TrackerEntry.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    entry.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

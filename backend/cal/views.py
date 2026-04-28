from datetime import date, timedelta
import calendar

from django.utils.timezone import now, localdate
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Event, ToDo, Project, Task
from .serializers import EventSerializer, ToDoSerializer, ProjectSerializer, TaskSerializer


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

    days: dict = {}

    def ensure_day(d: date):
        key = d.isoformat()
        if key not in days:
            days[key] = {'events': [], 'todos': []}
        return key

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
            days[key]['todos'].append({
                'id': todo.id,
                'name': todo.name,
                'description': todo.description,
                'frequency_days': todo.frequency_days,
                'next_due': todo.next_due.isoformat(),
                'overdue': overdue,
            })

    project_tasks = Task.objects.filter(
        start_date__lte=last_day,
        end_date__gte=first_day,
        completed=False,
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

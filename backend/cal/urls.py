from django.urls import path
from . import views

urlpatterns = [
    path('calendar/', views.calendar_view),
    path('events/', views.event_list),
    path('events/<int:pk>/', views.event_detail),
    path('todos/', views.todo_list),
    path('todos/reorder/', views.todo_reorder),
    path('todos/<int:pk>/', views.todo_detail),
    path('todos/<int:pk>/done/', views.todo_done),
    path('data/export/', views.data_export),
    path('data/import/', views.data_import),
    path('projects/', views.project_list),
    path('projects/reorder/', views.project_reorder),
    path('projects/<int:pk>/', views.project_detail),
    path('tasks/', views.task_list),
    path('tasks/reorder/', views.task_reorder),
    path('tasks/<int:pk>/done/', views.task_done),
    path('tasks/bulk-update/', views.task_bulk_update),
    path('tasks/<int:pk>/', views.task_detail),
    path('birthdays/', views.birthday_list),
    path('birthdays/<int:pk>/', views.birthday_detail),
    path('bills/', views.bill_list),
    path('bills/<int:pk>/done/', views.bill_done),
    path('bills/<int:pk>/', views.bill_detail),
]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cal', '0005_task_completed'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='active',
            field=models.BooleanField(default=True),
        ),
    ]

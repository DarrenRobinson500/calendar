from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cal', '0006_project_active'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='order',
            field=models.PositiveIntegerField(default=0),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cal', '0020_quote'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='night_time',
            field=models.BooleanField(default=False),
        ),
    ]

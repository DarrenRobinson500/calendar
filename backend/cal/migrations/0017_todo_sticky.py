from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cal', '0016_person_birthday_delete_birthday'),
    ]

    operations = [
        migrations.AddField(
            model_name='todo',
            name='sticky',
            field=models.BooleanField(default=False),
        ),
    ]

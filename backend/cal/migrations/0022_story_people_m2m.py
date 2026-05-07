from django.db import migrations, models


def copy_person_to_people(apps, schema_editor):
    Story = apps.get_model('cal', 'Story')
    for story in Story.objects.all():
        if story.person_id:
            story.people_new.add(story.person_id)


class Migration(migrations.Migration):

    dependencies = [
        ('cal', '0021_task_night_time'),
    ]

    operations = [
        # Add M2M under a temporary related_name to avoid clash with existing FK
        migrations.AddField(
            model_name='story',
            name='people_new',
            field=models.ManyToManyField(blank=True, related_name='stories_new', to='cal.person'),
        ),
        # Copy FK data into the new M2M
        migrations.RunPython(copy_person_to_people, migrations.RunPython.noop),
        # Drop the old FK (this frees up related_name='stories')
        migrations.RemoveField(
            model_name='story',
            name='person',
        ),
        # Rename the column and related_name to their final values
        migrations.RenameField(
            model_name='story',
            old_name='people_new',
            new_name='people',
        ),
        migrations.AlterField(
            model_name='story',
            name='people',
            field=models.ManyToManyField(related_name='stories', to='cal.person'),
        ),
    ]

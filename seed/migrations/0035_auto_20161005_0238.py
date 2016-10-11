# -*- coding: utf-8 -*-
# Generated by Django 1.9.5 on 2016-10-05 09:38
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('seed', '0034_merge'),
    ]

    operations = [
        migrations.AddField(
            model_name='propertystate',
            name='normalized_address',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='taxlotstate',
            name='normalized_address',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]

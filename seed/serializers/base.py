# !/usr/bin/env python
# encoding: utf-8
"""
:copyright (c) 2014 - 2017, The Regents of the University of California,
through Lawrence Berkeley National Laboratory (subject to receipt of any
required approvals from the U.S. Department of Energy) and contributors.
All rights reserved.  # NOQA
:author Paul Munday <paul@paulmunday.net>
"""

from rest_framework import serializers


class ChoiceField(serializers.Field):
    def __init__(self, choices, **kwargs):
        self._choices = choices
        super(ChoiceField, self).__init__(**kwargs)

    def to_representation(self, obj):
        return self._choices[obj][1]

    def to_internal_value(self, data):
        return getattr(self._choices, data)

---
name: google-calendar-agenda
description: Read Google Calendar events, attendees, and availability.
---

# 日程查询

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/google` followed by a Google Calendar API path:

- `/calendar/v3/users/me/calendarList` to list calendars.
- `/calendar/v3/calendars/{calendarId}/events?timeMin=...&timeMax=...` to list events in a time range.

URL-encode calendar IDs and timestamps. Resolve the requested timezone, read matching events and attendees, and present overlaps or open time clearly.

Do not create, update, accept, decline, or delete events.

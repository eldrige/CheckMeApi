const DEFAULT_SCHEDULE = {
  daysOfWeek: {
    Monday: [
      {
        startTime: '09:00',
        endTime: '16:00',
      },
    ],
    Tuesday: [
      {
        startTime: '09:00',
        endTime: '16:00',
      },
    ],
    Wednesday: [
      {
        startTime: '09:00',
        endTime: '16:00',
      },
    ],
    Thursday: [
      {
        startTime: '09:00',
        endTime: '16:00',
      },
    ],
    Friday: [
      {
        startTime: '09:00',
        endTime: '16:00',
      },
    ],
    Saturday: [],
    Sunday: [],
  },
  timezone: 'Africa/Douala',
  appointmentTypes: ['Consultation', 'Follow-up'],
  notes: 'This is my default availability',
  location: 'Online',
  title: 'Working Hours',
};

module.exports = DEFAULT_SCHEDULE;

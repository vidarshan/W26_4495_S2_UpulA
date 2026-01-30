# User
## Attributes
  - userId: UUID
  - email: Email
  - passwordHash: string
  - phoneNumber: PhoneNumber
  - createdAt: DateTime

## Methods
  + authenticate(password: string): boolean
  + updateProfile(profileData: ProfileUpdate): void

# Client
## Attributes
- clientId: UUID (inherited)
- firstName: string
- lastName: string
- preferredContactMethod: ContactMethod
- addresses: Address[]

## Methods
+ createAppointment(serviceRequest: ServiceRequest): Appointment
+ getAppointmentHistory(): Appointment[]

# CleaningStaff
## Attributes
- staffId: UUID (inherited)
- employeeId: string
- skills: CleaningSkill[]
- availability: WeeklySchedule
- currentLocation: GeoLocation
- rating: double
## Methods
+ updateAvailability(schedule: WeeklySchedule): void
+ getAssignedAppointments(date: Date): Appointment[]

# Appointment
## Attributes
- appointmentId: UUID
- client: Client
- assignedStaff: CleaningStaff
- serviceAddress: Address
- scheduledTime: TimeSlot
- services: Service[]
- status: AppointmentStatus
- notes: AppointmentNote[]
## Methods
+ makeAppointment(): void
+ reschedule(newTimeSlot: TimeSlot): void
+ cancel(): void
+ addNote(note: AppointmentNote): void

# Shift
## Attributes
- startTime: DateTime
- duration: Duration
- endTime: DateTime
- signInLocaiton : Address
- signOutLocation : Address
## Methods
+ cancleShift: void


# AdminStaff
## Methods
+ downloadData
+ approveSchedule

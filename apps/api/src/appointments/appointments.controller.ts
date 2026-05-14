import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentClerkUser } from '../auth/current-clerk-user.decorator';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateAppointmentReviewDto } from './dto/create-appointment-review.dto';
import { PatchAppointmentDto } from './dto/patch-appointment.dto';

@ApiTags('Appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get('me')
  listMine(@CurrentClerkUser() clerk: { clerkUserId: string }) {
    return this.appointments.listMineConsumer(clerk.clerkUserId);
  }

  @Get('provider/me')
  listForProvider(@CurrentClerkUser() clerk: { clerkUserId: string }) {
    return this.appointments.listMineProvider(clerk.clerkUserId);
  }

  @Post()
  create(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointments.create(clerk.clerkUserId, dto);
  }

  @Post(':appointmentId/review')
  @HttpCode(200)
  submitReview(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('appointmentId') appointmentId: string,
    @Body() dto: CreateAppointmentReviewDto,
  ) {
    return this.appointments.submitReview(clerk.clerkUserId, appointmentId, dto);
  }

  @Post(':appointmentId/review-prompt-dismiss')
  @HttpCode(200)
  dismissReviewPrompt(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.appointments.dismissReviewPrompt(clerk.clerkUserId, appointmentId);
  }

  @Patch(':appointmentId')
  patch(
    @CurrentClerkUser() clerk: { clerkUserId: string },
    @Param('appointmentId') appointmentId: string,
    @Body() dto: PatchAppointmentDto,
  ) {
    return this.appointments.patch(clerk.clerkUserId, appointmentId, dto);
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';
import { ConsumerProfilesModule } from './consumer-profiles/consumer-profiles.module';
import { ChatModule } from './chat/chat.module';
import { DiscoverModule } from './discover/discover.module';
import { FeedbackModule } from './feedback/feedback.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';
import { PushModule } from './push/push.module';
import { ProviderProfilesModule } from './provider-profiles/provider-profiles.module';
import { ProvidersModule } from './providers/providers.module';
import { PaymentsModule } from './payments/payments.module';
import { PlannerModule } from './planner/planner.module';
import { StripeModule } from './stripe/stripe.module';
import { SupportModule } from './support/support.module';
import { UsersModule } from './users/users.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MailModule,
    PrismaModule,
    PushModule,
    AuthModule,
    HealthModule,
    DiscoverModule,
    FeedbackModule,
    UsersModule,
    ConsumerProfilesModule,
    ChatModule,
    ProviderProfilesModule,
    AvailabilityModule,
    AppointmentsModule,
    ProvidersModule,
    SupportModule,
    StripeModule,
    PaymentsModule,
    PlannerModule,
    WebhooksModule,
  ],
})
export class AppModule {}

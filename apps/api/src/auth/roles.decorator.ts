import { SetMetadata } from '@nestjs/common';

import { ROLES_KEY } from './auth.constants';

export type AppRole = 'ADMIN';

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

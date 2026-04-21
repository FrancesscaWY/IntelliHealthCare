import { Module } from "@nestjs/common";
import {
  AppFamilyController,
  AppHomeController,
  AppLocationController,
  AppSearchController,
  AppUsersController
} from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  controllers: [
    AppUsersController,
    AppFamilyController,
    AppHomeController,
    AppLocationController,
    AppSearchController
  ],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}

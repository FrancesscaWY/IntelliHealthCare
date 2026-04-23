import { Module } from "@nestjs/common";
import {
  AppHomeController,
  AppLocationController,
  AppSearchController,
  AppUsersController
} from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  controllers: [
    AppUsersController,
    AppHomeController,
    AppLocationController,
    AppSearchController
  ],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}

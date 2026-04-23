import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { AppFamilyController } from "./family.controller";
import { FamilyService } from "./family.service";

@Module({
  imports: [UsersModule],
  controllers: [AppFamilyController],
  providers: [FamilyService]
})
export class FamilyModule {}

import { Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import { UsersService } from "../users/users.service";

@Injectable()
export class FamilyService {
  constructor(private readonly usersService: UsersService) {}

  getFamilyBindings(user: AuthenticatedUser) {
    return this.usersService.getFamilyBindings(user);
  }

  getAddresses(user: AuthenticatedUser) {
    return this.usersService.getAddresses(user);
  }

  createAddress(
    user: AuthenticatedUser,
    payload: Parameters<UsersService["createAddress"]>[1]
  ) {
    return this.usersService.createAddress(user, payload);
  }

  updateAddress(
    user: AuthenticatedUser,
    addressId: string,
    payload: Parameters<UsersService["updateAddress"]>[2]
  ) {
    return this.usersService.updateAddress(user, addressId, payload);
  }
}

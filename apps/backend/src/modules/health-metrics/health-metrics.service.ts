import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  DeviceStatus,
  DeviceType,
  Prisma,
  MedicationDoseStatus,
  MetricType,
  UserType
} from "@prisma/client";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import {
  ensureArray,
  ensureRecord,
  getAge,
  paginate,
  toDateString,
  toDateTimeString,
  toNumber,
  toPrismaJson,
  toPrismaNullableJson
} from "../../common/utils/serializers";
import { PrismaService } from "../../infra/prisma/prisma.service";

const METRIC_KEY_TO_TYPE = {
  steps: MetricType.STEPS,
  heartRate: MetricType.HEART_RATE,
  sleep: MetricType.SLEEP,
  weight: MetricType.WEIGHT,
  bloodSugar: MetricType.BLOOD_GLUCOSE,
  bloodPressure: MetricType.BLOOD_PRESSURE,
  oxygen: MetricType.OXYGEN,
  stress: MetricType.STRESS
} as const;

type MetricKey = keyof typeof METRIC_KEY_TO_TYPE;

@Injectable()
export class HealthMetricsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getOverview(currentUser: AuthenticatedUser, elderId?: string) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const [user, devices, alerts, records] = await Promise.all([
      this.prismaService.user.findUnique({ where: { id: targetUserId } }),
      this.prismaService.device.findMany({
        where: { ownerId: targetUserId },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
      }),
      this.prismaService.healthAlert.findMany({
        where: { userId: targetUserId, status: "OPEN" },
        orderBy: [{ level: "desc" }, { triggeredAt: "desc" }],
        take: 5
      }),
      this.prismaService.healthMetricRecord.findMany({
        where: { userId: targetUserId },
        orderBy: { measuredAt: "desc" },
        take: 50
      })
    ]);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const latestByType = new Map<MetricType, (typeof records)[number]>();
    for (const record of records) {
      if (!latestByType.has(record.metricType)) {
        latestByType.set(record.metricType, record);
      }
    }

    const summaryCards = Object.entries(METRIC_KEY_TO_TYPE).map(([key, metricType]) => {
      const record = latestByType.get(metricType);
      return {
        key,
        label: this.getMetricLabel(key as MetricKey),
        value: this.formatMetricValue(record),
        unit: record?.unit ?? null,
        measuredAt: toDateTimeString(record?.measuredAt),
        abnormal: record?.abnormal ?? false
      };
    });

    const activeAlerts = alerts.length;
    const score = Math.max(55, 90 - activeAlerts * 6);

    return {
      score,
      scoreLabel: score >= 80 ? "状态良好" : score >= 65 ? "需要关注" : "重点关注",
      profileSummary: {
        name: user.realName ?? user.nickname ?? user.phone,
        age: getAge(user.birthday),
        height: toNumber(
          ensureRecord(
            (
              await this.prismaService.healthArchive.findUnique({
                where: { userId: targetUserId }
              })
            )?.baseProfile
          ).height
        ),
        weight: toNumber(
          ensureRecord(
            (
              await this.prismaService.healthArchive.findUnique({
                where: { userId: targetUserId }
              })
            )?.baseProfile
          ).weight
        ),
        deviceCount: devices.length
      },
      summaryCards,
      alerts: alerts.map((item) => ({
        alertId: item.id,
        title: item.title,
        level: item.level,
        summary: item.summary,
        triggeredAt: toDateTimeString(item.triggeredAt)
      })),
      linkedDevices: devices.slice(0, 4).map((item) => this.toDeviceCard(item))
    };
  }

  async getMetricTrend(
    currentUser: AuthenticatedUser,
    metricKey: MetricKey,
    elderId?: string
  ) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const metricType = METRIC_KEY_TO_TYPE[metricKey];
    const records = await this.prismaService.healthMetricRecord.findMany({
      where: {
        userId: targetUserId,
        metricType
      },
      orderBy: { measuredAt: "asc" },
      take: 30
    });

    return {
      metricKey,
      label: this.getMetricLabel(metricKey),
      points: records.map((item) => ({
        recordId: item.id,
        measuredAt: toDateTimeString(item.measuredAt),
        value: this.getMetricNumericValue(item),
        displayValue: this.formatMetricValue(item)
      }))
    };
  }

  async getMetricRecords(
    currentUser: AuthenticatedUser,
    metricKey: MetricKey,
    page: number,
    pageSize: number,
    elderId?: string
  ) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const metricType = METRIC_KEY_TO_TYPE[metricKey];
    const records = await this.prismaService.healthMetricRecord.findMany({
      where: {
        userId: targetUserId,
        metricType
      },
      orderBy: { measuredAt: "desc" }
    });

    return paginate(
      records.map((item) => this.toMetricRecord(metricKey, item)),
      page,
      pageSize
    );
  }

  async createMetricRecord(
    currentUser: AuthenticatedUser,
    metricKey: MetricKey,
    payload: {
      elderId?: string;
      deviceId?: string;
      value?: number;
      unit?: string;
      payload?: Record<string, unknown>;
      note?: string;
      measuredAt?: string;
    }
  ) {
    const targetUserId = await this.resolveTargetUserId(currentUser, payload.elderId);
    const metricType = METRIC_KEY_TO_TYPE[metricKey];
    const record = await this.prismaService.healthMetricRecord.create({
      data: {
        userId: targetUserId,
        deviceId: payload.deviceId,
        metricType,
        value: payload.value ?? null,
        unit: payload.unit ?? this.getMetricUnit(metricKey),
        payload: payload.payload ? toPrismaJson(payload.payload) : undefined,
        note: payload.note,
        source: "manual",
        abnormal: this.isAbnormal(metricKey, payload.value, payload.payload),
        measuredAt: payload.measuredAt ? new Date(payload.measuredAt) : new Date()
      }
    });

    return this.toMetricRecord(metricKey, record);
  }

  async updateMetricRecord(
    currentUser: AuthenticatedUser,
    metricKey: MetricKey,
    recordId: string,
    payload: {
      elderId?: string;
      value?: number;
      unit?: string;
      payload?: Record<string, unknown>;
      note?: string;
      measuredAt?: string;
    }
  ) {
    const targetUserId = await this.resolveTargetUserId(currentUser, payload.elderId);
    const existing = await this.prismaService.healthMetricRecord.findUnique({
      where: { id: recordId }
    });

    if (!existing || existing.userId !== targetUserId) {
      throw new NotFoundException("Metric record not found");
    }

    const record = await this.prismaService.healthMetricRecord.update({
      where: { id: recordId },
      data: {
        value: payload.value ?? existing.value,
        unit: payload.unit ?? existing.unit,
        payload: toPrismaNullableJson(payload.payload ?? existing.payload),
        note: payload.note ?? existing.note,
        abnormal: this.isAbnormal(metricKey, payload.value ?? toNumber(existing.value), payload.payload ?? ensureRecord(existing.payload)),
        measuredAt: payload.measuredAt ? new Date(payload.measuredAt) : existing.measuredAt
      }
    });

    return this.toMetricRecord(metricKey, record);
  }

  async deleteMetricRecord(currentUser: AuthenticatedUser, recordId: string, elderId?: string) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const record = await this.prismaService.healthMetricRecord.findUnique({
      where: { id: recordId }
    });

    if (!record || record.userId !== targetUserId) {
      throw new NotFoundException("Metric record not found");
    }

    await this.prismaService.healthMetricRecord.delete({
      where: { id: recordId }
    });

    return {
      deleted: true
    };
  }

  async getDevices(currentUser: AuthenticatedUser, elderId?: string) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const devices = await this.prismaService.device.findMany({
      where: { ownerId: targetUserId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
    });

    return devices.map((item) => this.toDeviceCard(item));
  }

  async getDeviceDetail(currentUser: AuthenticatedUser, deviceId: string, elderId?: string) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const device = await this.prismaService.device.findFirst({
      where: {
        id: deviceId,
        ownerId: targetUserId
      }
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    return {
      ...this.toDeviceCard(device),
      serialNo: device.serialNo,
      latestPayload: device.latestPayload,
      settings: device.settings,
      lastSyncedAt: toDateTimeString(device.lastSyncedAt)
    };
  }

  async bindDevice(
    currentUser: AuthenticatedUser,
    payload: {
      elderId?: string;
      serialNo: string;
      type: DeviceType;
      nickname?: string;
    }
  ) {
    const targetUserId = await this.resolveTargetUserId(currentUser, payload.elderId);
    const device = await this.prismaService.device.create({
      data: {
        serialNo: payload.serialNo,
        ownerId: targetUserId,
        type: payload.type,
        status: DeviceStatus.ONLINE,
        nickname: payload.nickname ?? payload.serialNo,
        batteryLevel: 100,
        settings: {}
      }
    });

    return this.toDeviceCard(device);
  }

  async unbindDevice(currentUser: AuthenticatedUser, deviceId: string, elderId?: string) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const device = await this.prismaService.device.findFirst({
      where: {
        id: deviceId,
        ownerId: targetUserId
      }
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    await this.prismaService.device.delete({
      where: { id: deviceId }
    });

    return {
      deleted: true
    };
  }

  async updateDeviceSettings(
    currentUser: AuthenticatedUser,
    deviceId: string,
    payload: Record<string, unknown>,
    elderId?: string
  ) {
    return this.patchDeviceSettings(currentUser, deviceId, payload, elderId);
  }

  async updateDevicePassword(
    currentUser: AuthenticatedUser,
    deviceId: string,
    password: string,
    elderId?: string
  ) {
    return this.patchDeviceSettings(
      currentUser,
      deviceId,
      { password },
      elderId
    );
  }

  async updateHeartRateSettings(
    currentUser: AuthenticatedUser,
    deviceId: string,
    payload: Record<string, unknown>,
    elderId?: string
  ) {
    return this.patchDeviceSettings(currentUser, deviceId, payload, elderId);
  }

  async getDeviceMeasurements(currentUser: AuthenticatedUser, deviceId: string, elderId?: string) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const device = await this.prismaService.device.findFirst({
      where: {
        id: deviceId,
        ownerId: targetUserId
      }
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    const records = await this.prismaService.healthMetricRecord.findMany({
      where: {
        deviceId
      },
      orderBy: { measuredAt: "desc" },
      take: 20
    });

    return records.map((item) =>
      this.toMetricRecord(
        this.getMetricKeyByType(item.metricType),
        item
      )
    );
  }

  async getTodayMedications(currentUser: AuthenticatedUser, elderId?: string) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const medications = await this.prismaService.medication.findMany({
      where: {
        userId: targetUserId,
        active: true
      },
      include: {
        logs: {
          where: {
            scheduledAt: {
              gte: this.getTodayRange().start,
              lte: this.getTodayRange().end
            }
          },
          orderBy: { scheduledAt: "asc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return {
      date: toDateString(new Date()),
      list: medications.map((item) => this.toMedication(item))
    };
  }

  async getMedications(currentUser: AuthenticatedUser, elderId?: string) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const medications = await this.prismaService.medication.findMany({
      where: {
        userId: targetUserId
      },
      include: {
        logs: {
          orderBy: { scheduledAt: "desc" },
          take: 5
        }
      },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }]
    });

    return medications.map((item) => this.toMedication(item));
  }

  async createMedication(
    currentUser: AuthenticatedUser,
    payload: {
      elderId?: string;
      name: string;
      dosage: string;
      frequency: string;
      mealTiming?: string;
      route?: string;
      indication?: string;
      scheduleTimes?: string[];
      startDate: string;
      endDate?: string;
    }
  ) {
    const targetUserId = await this.resolveTargetUserId(currentUser, payload.elderId);
    const medication = await this.prismaService.medication.create({
      data: {
        userId: targetUserId,
        name: payload.name,
        dosage: payload.dosage,
        frequency: payload.frequency,
        mealTiming: payload.mealTiming,
        route: payload.route,
        indication: payload.indication,
        scheduleTimes: toPrismaJson(payload.scheduleTimes ?? []),
        startDate: new Date(payload.startDate),
        endDate: payload.endDate ? new Date(payload.endDate) : null,
        active: true
      }
    });

    const withLogs = await this.prismaService.medication.findUniqueOrThrow({
      where: { id: medication.id },
      include: {
        logs: {
          orderBy: { scheduledAt: "desc" },
          take: 5
        }
      }
    });

    return this.toMedication(withLogs);
  }

  async updateMedication(
    currentUser: AuthenticatedUser,
    medicationId: string,
    payload: {
      elderId?: string;
      name?: string;
      dosage?: string;
      frequency?: string;
      mealTiming?: string;
      route?: string;
      indication?: string;
      scheduleTimes?: string[];
      startDate?: string;
      endDate?: string;
      active?: boolean;
    }
  ) {
    const targetUserId = await this.resolveTargetUserId(currentUser, payload.elderId);
    const existing = await this.prismaService.medication.findUnique({
      where: { id: medicationId }
    });

    if (!existing || existing.userId !== targetUserId) {
      throw new NotFoundException("Medication not found");
    }

    const medication = await this.prismaService.medication.update({
      where: { id: medicationId },
      data: {
        name: payload.name ?? existing.name,
        dosage: payload.dosage ?? existing.dosage,
        frequency: payload.frequency ?? existing.frequency,
        mealTiming: payload.mealTiming ?? existing.mealTiming,
        route: payload.route ?? existing.route,
        indication: payload.indication ?? existing.indication,
        scheduleTimes: toPrismaNullableJson(
          payload.scheduleTimes ?? existing.scheduleTimes
        ),
        startDate: payload.startDate ? new Date(payload.startDate) : existing.startDate,
        endDate: payload.endDate ? new Date(payload.endDate) : existing.endDate,
        active: payload.active ?? existing.active
      },
      include: {
        logs: {
          orderBy: { scheduledAt: "desc" },
          take: 5
        }
      }
    });

    return this.toMedication(medication);
  }

  async deleteMedication(currentUser: AuthenticatedUser, medicationId: string, elderId?: string) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const medication = await this.prismaService.medication.findUnique({
      where: { id: medicationId }
    });

    if (!medication || medication.userId !== targetUserId) {
      throw new NotFoundException("Medication not found");
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.medicationDoseLog.deleteMany({
        where: { medicationId }
      });

      await tx.medication.delete({
        where: { id: medicationId }
      });
    });

    return {
      deleted: true
    };
  }

  async takeMedication(
    currentUser: AuthenticatedUser,
    medicationId: string,
    payload: {
      elderId?: string;
      note?: string;
      scheduledAt?: string;
    }
  ) {
    const targetUserId = await this.resolveTargetUserId(currentUser, payload.elderId);
    const medication = await this.prismaService.medication.findUnique({
      where: { id: medicationId }
    });

    if (!medication || medication.userId !== targetUserId) {
      throw new NotFoundException("Medication not found");
    }

    const scheduledAt = payload.scheduledAt ? new Date(payload.scheduledAt) : new Date();
    const log = await this.prismaService.medicationDoseLog.create({
      data: {
        medicationId,
        userId: targetUserId,
        scheduledAt,
        takenAt: new Date(),
        status: MedicationDoseStatus.TAKEN,
        note: payload.note
      }
    });

    return {
      logId: log.id,
      status: log.status,
      takenAt: toDateTimeString(log.takenAt)
    };
  }

  private async patchDeviceSettings(
    currentUser: AuthenticatedUser,
    deviceId: string,
    patch: Record<string, unknown>,
    elderId?: string
  ) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const device = await this.prismaService.device.findFirst({
      where: {
        id: deviceId,
        ownerId: targetUserId
      }
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    const settings = {
      ...ensureRecord(device.settings),
      ...patch
    };

    const updated = await this.prismaService.device.update({
      where: { id: deviceId },
      data: {
        settings: toPrismaJson(settings)
      }
    });

    return {
      deviceId: updated.id,
      settings: updated.settings
    };
  }

  private toMetricRecord(metricKey: MetricKey, record: {
    id: string;
    metricType: MetricType;
    value: unknown;
    unit: string | null;
    payload: unknown;
    note: string | null;
    abnormal: boolean;
    measuredAt: Date;
    deviceId: string | null;
  }) {
    return {
      recordId: record.id,
      metricKey,
      label: this.getMetricLabel(metricKey),
      value: this.getMetricNumericValue(record),
      displayValue: this.formatMetricValue(record),
      unit: record.unit,
      payload: record.payload,
      note: record.note,
      abnormal: record.abnormal,
      deviceId: record.deviceId,
      measuredAt: toDateTimeString(record.measuredAt)
    };
  }

  private toDeviceCard(device: {
    id: string;
    type: DeviceType;
    nickname: string | null;
    status: DeviceStatus;
    batteryLevel: number | null;
    latestPayload: unknown;
    locationLabel: string | null;
    updatedAt: Date;
  }) {
    return {
      deviceId: device.id,
      type: device.type,
      name: device.nickname ?? device.type,
      status: device.status,
      batteryText:
        typeof device.batteryLevel === "number"
          ? `电量${device.batteryLevel}%`
          : "电量未知",
      latestPayload: device.latestPayload,
      locationLabel: device.locationLabel,
      updatedAt: toDateTimeString(device.updatedAt)
    };
  }

  private toMedication(item: {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    mealTiming: string | null;
    route: string | null;
    indication: string | null;
    scheduleTimes: unknown;
    startDate: Date;
    endDate: Date | null;
    active: boolean;
    logs: Array<{
      id: string;
      scheduledAt: Date;
      takenAt: Date | null;
      status: MedicationDoseStatus;
      note: string | null;
    }>;
  }) {
    return {
      medicationId: item.id,
      name: item.name,
      dosage: item.dosage,
      frequency: item.frequency,
      mealTiming: item.mealTiming,
      route: item.route,
      indication: item.indication,
      scheduleTimes: ensureArray<string>(item.scheduleTimes),
      startDate: toDateString(item.startDate),
      endDate: toDateString(item.endDate),
      active: item.active,
      logs: item.logs.map((log) => ({
        logId: log.id,
        scheduledAt: toDateTimeString(log.scheduledAt),
        takenAt: toDateTimeString(log.takenAt),
        status: log.status,
        note: log.note
      }))
    };
  }

  private getMetricKeyByType(metricType: MetricType) {
    return (
      Object.entries(METRIC_KEY_TO_TYPE).find(([, value]) => value === metricType)?.[0] ??
      "steps"
    ) as MetricKey;
  }

  private getMetricLabel(metricKey: MetricKey) {
    switch (metricKey) {
      case "steps":
        return "步数";
      case "heartRate":
        return "心率";
      case "sleep":
        return "睡眠";
      case "weight":
        return "体重";
      case "bloodSugar":
        return "血糖";
      case "bloodPressure":
        return "血压";
      case "oxygen":
        return "血氧";
      case "stress":
        return "压力";
    }
  }

  private getMetricUnit(metricKey: MetricKey) {
    switch (metricKey) {
      case "steps":
        return "steps";
      case "heartRate":
        return "bpm";
      case "sleep":
        return "hours";
      case "weight":
        return "kg";
      case "bloodSugar":
        return "mmol/L";
      case "bloodPressure":
        return "mmHg";
      case "oxygen":
        return "%";
      case "stress":
        return "score";
    }
  }

  private getMetricNumericValue(record: { value: unknown; payload: unknown; metricType: MetricType }) {
    if (record.metricType === MetricType.BLOOD_PRESSURE) {
      return toNumber(ensureRecord(record.payload).systolic) ?? toNumber(record.value);
    }

    return toNumber(record.value);
  }

  private formatMetricValue(
    record:
      | {
          metricType: MetricType;
          value: unknown;
          payload: unknown;
        }
      | undefined
  ) {
    if (!record) {
      return null;
    }

    if (record.metricType === MetricType.BLOOD_PRESSURE) {
      const payload = ensureRecord(record.payload);
      const systolic = payload.systolic ?? record.value;
      const diastolic = payload.diastolic ?? "-";
      return `${systolic}/${diastolic}`;
    }

    return toNumber(record.value);
  }

  private isAbnormal(metricKey: MetricKey, value?: number | null, payload?: Record<string, unknown>) {
    switch (metricKey) {
      case "bloodPressure":
        return (toNumber(payload?.systolic) ?? value ?? 0) >= 140 ||
          (toNumber(payload?.diastolic) ?? 0) >= 90;
      case "bloodSugar":
        return (value ?? 0) >= 7;
      case "heartRate":
        return (value ?? 0) > 100 || (value ?? 0) < 50;
      case "oxygen":
        return (value ?? 100) < 95;
      default:
        return false;
    }
  }

  private getTodayRange() {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    end.setUTCMilliseconds(-1);
    return { start, end };
  }

  private async resolveTargetUserId(currentUser: AuthenticatedUser, elderId?: string) {
    if (!elderId) {
      if (currentUser.type === UserType.ELDER) {
        return currentUser.id;
      }

      const binding = await this.prismaService.familyBinding.findFirst({
        where: { familyMemberId: currentUser.id },
        orderBy: { createdAt: "asc" }
      });

      return binding?.elderMemberId ?? currentUser.id;
    }

    if (elderId === currentUser.id) {
      return elderId;
    }

    if (
      ([UserType.ADMIN, UserType.ORG_MANAGER, UserType.STAFF] as UserType[]).includes(
        currentUser.type
      )
    ) {
      return elderId;
    }

    const binding = await this.prismaService.familyBinding.findFirst({
      where: {
        familyMemberId: currentUser.id,
        elderMemberId: elderId
      }
    });

    if (!binding) {
      throw new ForbiddenException("No permission to access elder health data");
    }

    return elderId;
  }
}

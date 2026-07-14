import type { VizAlarmEvaluation } from "@/lib/viz/project-contact-types";
import type { VizStoreLiveSnapshot } from "@/lib/viz/viz-telemetry-server";

export function flattenActiveAlarms(snapshots: VizStoreLiveSnapshot[]) {
  return snapshots.flatMap((snapshot) =>
    (snapshot.activeAlarms ?? []).map((alarm) => ({
      ...alarm,
      projectId: snapshot.projectId,
      storeName: snapshot.displayName ?? snapshot.projectName ?? snapshot.projectId,
      storeStatus: snapshot.status,
    })),
  );
}

export function countUnacknowledgedAlarms(snapshots: VizStoreLiveSnapshot[]) {
  return snapshots.reduce((count, snapshot) => {
    const activeAlarms = snapshot.activeAlarms ?? [];
    const unacknowledged = activeAlarms.filter((alarm) => !alarm.acknowledgement).length;
    const hasTelemetryAlarm =
      (snapshot.roles.active_alarm_count?.numericValue ?? 0) > 0 && activeAlarms.length === 0;
    return count + unacknowledged + (hasTelemetryAlarm ? 1 : 0);
  }, 0);
}

export type VizFlattenedActiveAlarm = VizAlarmEvaluation & {
  projectId: string;
  storeName: string;
  storeStatus: VizStoreLiveSnapshot["status"];
};

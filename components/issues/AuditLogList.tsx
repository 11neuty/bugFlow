import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { AuditLogRecord } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function toneForAction(action: AuditLogRecord["action"]) {
  switch (action) {
    case "ISSUE_CREATED":
      return "blue";
    case "STATUS_CHANGED":
      return "amber";
    case "ASSIGNMENT_CHANGED":
      return "green";
    default:
      return "red";
  }
}

export function AuditLogList({ logs }: { logs: AuditLogRecord[] }) {
  if (logs.length === 0) {
    return (
      <Card className="p-5">
        <p className="text-sm text-slate-500">No audit entries yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <Card key={log.id} className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Badge tone={toneForAction(log.action)}>{log.action}</Badge>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-950">
                  {log.user.name}
                </p>
                <p className="text-sm text-slate-500">{log.user.email}</p>
              </div>
              {log.metadata ? (
                <div className="rounded-[20px] bg-slate-50 p-3 text-sm text-slate-600">
                  {Object.entries(log.metadata).map(([key, value]) => (
                    <p key={key}>
                      <span className="font-medium text-slate-900">{key}:</span>{" "}
                      {String(value ?? "none")}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
            <p className="text-sm text-slate-400">{formatDate(log.createdAt)}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

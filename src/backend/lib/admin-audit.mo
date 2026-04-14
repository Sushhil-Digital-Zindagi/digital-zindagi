// lib/admin-audit.mo — Admin Audit Log domain logic
import Types   "../types/admin-audit";
import List    "mo:core/List";
import Time    "mo:core/Time";
import Int     "mo:core/Int";

module {

  public type AuditAction      = Types.AuditAction;
  public type AuditLogEntry    = Types.AuditLogEntry;
  public type UserSubscription = Types.UserSubscription;

  /// Append a new audit log entry and return its id.
  public func append(
    auditLog     : List.List<AuditLogEntry>,
    nextId       : Nat,
    adminEmail   : Text,
    targetUserId : Text,
    action       : AuditAction,
    amount       : ?Int,
    note         : Text,
  ) : Text {
    let id = "audit-" # nextId.toText();
    let entry : AuditLogEntry = {
      id;
      adminEmail;
      targetUserId;
      action;
      amount;
      note;
      timestamp = Time.now();
    };
    auditLog.add(entry);
    id;
  };

  /// Return the most recent `limit` entries (newest first).
  public func getRecent(
    auditLog : List.List<AuditLogEntry>,
    limit    : Nat,
  ) : [AuditLogEntry] {
    let total = auditLog.size();
    if (total == 0) { return [] };
    // Take the last `limit` entries then reverse for newest-first
    let start : Int = Int.fromNat(total) - Int.fromNat(limit);
    let fromIdx : Nat = if (start < 0) { 0 } else { Int.abs(start) };
    auditLog.sliceToArray(fromIdx, total).reverse();
  };

};

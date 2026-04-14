// types/admin-audit.mo — Admin Audit Log domain types
module {

  /// Discriminated union of every auditable admin action.
  public type AuditAction = {
    #WalletAdd;
    #WalletDeduct;
    #SubscriptionAssign;
    #SubscriptionRevoke;
    #ProviderApprove;
    #ProviderReject;
    #FeatureLock;
    #FeatureUnlock;
  };

  /// A single immutable audit log entry created by any admin action.
  public type AuditLogEntry = {
    id           : Text;
    adminEmail   : Text;
    targetUserId : Text;
    action       : AuditAction;
    amount       : ?Int;   // populated for wallet adjustments; null otherwise
    note         : Text;
    timestamp    : Int;    // Time.now() nanoseconds
  };

  /// Per-user subscription status, optionally assigned manually by admin.
  public type UserSubscription = {
    userId          : Text;
    status          : Text;   // "active" | "inactive" | "expired"
    startDate       : Int;
    endDate         : Int;
    assignedByAdmin : Bool;
  };

};

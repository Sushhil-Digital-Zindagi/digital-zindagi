// mixins/admin-audit-api.mo — Admin Audit Log & Subscription public API
import AuditTypes "../types/admin-audit";
import WRTypes    "../types/wallet-recharge";
import AuditLib   "../lib/admin-audit";
import List       "mo:core/List";
import Map        "mo:core/Map";
import Time       "mo:core/Time";
import Int        "mo:core/Int";
import Nat        "mo:core/Nat";

module {

  public type AuditLogEntry    = AuditTypes.AuditLogEntry;
  public type UserSubscription = AuditTypes.UserSubscription;

  /// Return the most recent `limit` audit log entries — admin only.
  public func getAdminAuditLog(
    auditLog : List.List<AuditLogEntry>,
    limit    : Nat,
  ) : [AuditLogEntry] {
    AuditLib.getRecent(auditLog, limit);
  };

  /// Adjust a user's wallet balance (add or deduct) and log the action — admin only.
  /// walletBalances key is Nat (userId); userId parameter is Text (for cross-domain compat).
  /// Returns the new balance as Int on success.
  public func adminAdjustWalletBalance(
    walletBalances : Map.Map<Nat, WRTypes.WalletBalance>,
    auditLog       : List.List<AuditLogEntry>,
    nextAuditId    : Nat,
    adminEmail     : Text,
    userId         : Text,
    amount         : Int,
    action         : Text,   // "add" | "deduct"
    note           : Text,
  ) : { #ok : Int; #err : Text } {
    if (action != "add" and action != "deduct") {
      return #err("Invalid action: must be 'add' or 'deduct'");
    };
    let userIdNat : Nat = switch (Nat.fromText(userId)) {
      case null { return #err("Invalid userId: " # userId) };
      case (?n) { n };
    };
    let absAmount = Int.abs(amount);
    let currentBalance : Float = switch (walletBalances.get(userIdNat)) {
      case null    { 0.0 };
      case (?wb)   { wb.balance };
    };
    let absAmountFloat : Float = absAmount.toFloat();
    let newBalance : Float = if (action == "add") {
      currentBalance + absAmountFloat;
    } else {
      // deduct: check sufficient funds
      if (currentBalance < absAmountFloat) {
        return #err("Insufficient balance");
      };
      currentBalance - absAmountFloat;
    };
    walletBalances.add(userIdNat, {
      userId      = userIdNat;
      balance     = newBalance;
      lastUpdated = Time.now();
    });
    let auditAction : AuditTypes.AuditAction = if (action == "add") { #WalletAdd } else { #WalletDeduct };
    ignore AuditLib.append(auditLog, nextAuditId, adminEmail, userId, auditAction, ?amount, note);
    // Convert Float balance to Int for return (truncate fractional part)
    let newBalanceInt : Int = newBalance.toInt();
    #ok(newBalanceInt);
  };

  /// Manually assign or revoke a subscription for a user — admin only.
  public func adminAssignSubscription(
    userSubscriptions : Map.Map<Text, UserSubscription>,
    auditLog          : List.List<AuditLogEntry>,
    nextAuditId       : Nat,
    adminEmail        : Text,
    userId            : Text,
    durationDays      : Nat,
    action            : Text,   // "assign" | "revoke"
  ) : { #ok; #err : Text } {
    if (action != "assign" and action != "revoke") {
      return #err("Invalid action: must be 'assign' or 'revoke'");
    };
    let now = Time.now();
    let sub : UserSubscription = if (action == "assign") {
      let durationNanos : Int = Int.fromNat(durationDays) * 86_400_000_000_000;
      {
        userId;
        status          = "active";
        startDate       = now;
        endDate         = now + durationNanos;
        assignedByAdmin = true;
      };
    } else {
      // revoke: preserve existing dates if present, otherwise use now
      let existing = userSubscriptions.get(userId);
      {
        userId;
        status          = "inactive";
        startDate       = switch (existing) { case (?e) { e.startDate }; case null { now } };
        endDate         = switch (existing) { case (?e) { e.endDate };   case null { now } };
        assignedByAdmin = true;
      };
    };
    userSubscriptions.add(userId, sub);
    let auditAction : AuditTypes.AuditAction = if (action == "assign") { #SubscriptionAssign } else { #SubscriptionRevoke };
    let actionNote = action # " subscription for " # userId # " (" # durationDays.toText() # " days)";
    ignore AuditLib.append(auditLog, nextAuditId, adminEmail, userId, auditAction, null, actionNote);
    #ok;
  };

  /// Get the current subscription status for a user.
  public func getUserSubscriptionStatus(
    userSubscriptions : Map.Map<Text, UserSubscription>,
    userId            : Text,
  ) : ?UserSubscription {
    userSubscriptions.get(userId);
  };

};
